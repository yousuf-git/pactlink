import type Stripe from 'stripe';
import { WebhookEvent, Invoice } from '../models/index.js';
import { verifyWebhook } from '../services/stripe/index.js';
import { handleDepositSucceeded, handleDepositFailed } from '../services/stateMachine/index.js';
import { logger } from '../config/logger.js';

/**
 * Stripe webhook handler (F-09 / F-11 / E1).
 *
 * Flow (UC-S01):
 *  1. Verify the Stripe signature against the RAW body (raw mount in index.ts).
 *  2. Atomically INSERT a webhookEvents doc keyed by eventId (UNIQUE). A
 *     duplicate-key error => already processed => 200 no-op (idempotency, E1).
 *  3. Dispatch the event to the state machine.
 *  4. Mark the event processed; ALWAYS 200 to Stripe after logging.
 */

const DUPLICATE_KEY = 11000;

export interface StripeHandlerResult {
  status: number;
  body: { received: boolean; deduped?: boolean; error?: string };
}

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string | undefined,
): Promise<StripeHandlerResult> {
  // 1. Verify signature against the raw body.
  let event: Stripe.Event;
  try {
    if (!signature) throw new Error('Missing stripe-signature header');
    event = verifyWebhook(rawBody, signature);
  } catch (err) {
    // Bad signature → 400 so Stripe knows verification failed; do NOT record.
    logger.warn('Stripe webhook signature verification failed', {
      err: err instanceof Error ? err.message : String(err),
    });
    return { status: 400, body: { received: false, error: 'invalid_signature' } };
  }

  // 2. Idempotent insert keyed by eventId (UNIQUE). Duplicate => no-op (E1).
  let createdEvent: { _id: unknown } | null = null;
  try {
    createdEvent = (await WebhookEvent.create({
      provider: 'stripe',
      eventId: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
      processed: false,
      receivedAt: new Date(),
    })) as unknown as { _id: unknown };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      logger.info('Duplicate webhook delivery — idempotent no-op (E1)', {
        eventId: event.id,
        type: event.type,
      });
      return { status: 200, body: { received: true, deduped: true } };
    }
    logger.error('Failed to record webhook event', {
      err: err instanceof Error ? err.message : String(err),
      eventId: event.id,
    });
    // Return 500 so Stripe retries and we eventually persist + process.
    return { status: 500, body: { received: false, error: 'persist_failed' } };
  }

  // 3. Dispatch to business logic. Errors here are logged but we still ACK 200
  //    (the event is recorded; a retry/replay can reprocess if `processed` stays
  //    false — but we mark processed on success only).
  let processingError: string | undefined;
  try {
    await dispatchEvent(event);
    await WebhookEvent.updateOne(
      { _id: createdEvent._id },
      { $set: { processed: true, processedAt: new Date(), error: null } },
    ).exec();
  } catch (err) {
    processingError = err instanceof Error ? err.message : String(err);
    logger.error('Webhook processing error', { err: processingError, eventId: event.id, type: event.type });
    await WebhookEvent.updateOne(
      { _id: createdEvent._id },
      { $set: { processed: false, error: processingError } },
    ).exec();
  }

  // Always 200 to Stripe after logging.
  return { status: 200, body: { received: true } };
}

async function dispatchEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      // Only handle deposit intents (metadata.kind === 'deposit') — balance is
      // collected via Stripe Invoice (invoice.paid), not a PaymentIntent.
      if (pi.metadata?.kind && pi.metadata.kind !== 'deposit') return;
      const chargeId =
        typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
      await handleDepositSucceeded(pi.id, { chargeId });
      return;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.kind && pi.metadata.kind !== 'deposit') return;
      const reason = pi.last_payment_error?.message ?? 'Payment failed';
      await handleDepositFailed(pi.id, reason);
      return;
    }
    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice;
      if (inv.id) await markInvoicePaid(inv.id);
      return;
    }
    default:
      logger.debug('Unhandled Stripe event type', { type: event.type });
  }
}

async function markInvoicePaid(stripeInvoiceId: string): Promise<void> {
  const result = await Invoice.updateOne(
    { stripeInvoiceId, status: { $ne: 'paid' } },
    { $set: { status: 'paid', paidAt: new Date() } },
  ).exec();
  if (result.matchedCount > 0) {
    logger.info('Marked balance invoice paid', { stripeInvoiceId });
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === DUPLICATE_KEY
  );
}
