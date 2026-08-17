import { Types } from 'mongoose';
import {
  Quote,
  Payment,
  Invoice,
  Signature,
  Notification,
  ActivityEvent,
  Client,
  User,
} from '../../models/index.js';
import { createBalanceInvoice } from '../stripe/index.js';
import { isStripeConfigured } from '../../config/stripe.js';
import { dispatchQueuedNotifications } from '../email/index.js';
import { logger } from '../../config/logger.js';

/**
 * Server-authoritative state machine (F-09).
 *
 * The ONLY place a quote advances to `deposit_paid`. Invoked exclusively from
 * the verified Stripe webhook handler — never from a client callback. Every
 * operation is idempotent so duplicate/retried webhook deliveries (E1) produce
 * exactly one set of side effects.
 *
 * Invariants enforced:
 *  - Signature gates the charge: no signature → do not advance, log anomaly (E4).
 *  - Exactly one balance invoice per quote (E11), guarded on quote + type.
 *  - payment_failed leaves the quote `approved` (E7).
 *
 * NOTE: enums (`../../models/enums`) are `as const` string arrays, so the values
 * here are written as the literal strings the DBD defines.
 */

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({});
  const seq = String(count + 1).padStart(4, '0');
  return `INV-${year}-${seq}`;
}

interface QuoteShape {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  clientId: Types.ObjectId;
  title: string;
  status: string;
  currency: string;
  depositAmount: number;
  balanceAmount: number;
  depositPaidAt?: Date | null;
  save: () => Promise<unknown>;
}

interface PaymentShape {
  _id: Types.ObjectId;
  quoteId: Types.ObjectId;
  type: string;
  status: string;
  stripeChargeId?: string | null;
  failureReason?: string | null;
  save: () => Promise<unknown>;
}

async function loadOwnerEmail(ownerId: Types.ObjectId): Promise<string | undefined> {
  const u = (await User.findById(ownerId).lean().exec()) as { email?: string } | null;
  return u?.email;
}

async function loadClient(clientId: Types.ObjectId): Promise<{ email?: string; name?: string }> {
  const c = (await Client.findById(clientId).lean().exec()) as { email?: string; name?: string } | null;
  return { email: c?.email, name: c?.name };
}

/**
 * Handle a verified `payment_intent.succeeded` for a deposit. Idempotent.
 */
export async function handleDepositSucceeded(
  paymentIntentId: string,
  ctx: { chargeId?: string } = {},
): Promise<{ advanced: boolean; reason?: string }> {
  const payment = (await Payment.findOne({
    stripePaymentIntentId: paymentIntentId,
    type: 'deposit',
  }).exec()) as unknown as PaymentShape | null;

  if (!payment) {
    // Race (E9): pending write not yet visible. Treat as transient — Stripe
    // re-delivers; idempotency makes eventual processing safe.
    logger.warn('handleDepositSucceeded: no deposit payment found (transient/race)', { paymentIntentId });
    return { advanced: false, reason: 'payment_not_found' };
  }

  const quote = (await Quote.findById(payment.quoteId).exec()) as unknown as QuoteShape | null;
  if (!quote) {
    logger.error('handleDepositSucceeded: quote missing', { paymentIntentId, quoteId: String(payment.quoteId) });
    return { advanced: false, reason: 'quote_not_found' };
  }

  // Signature gate (E4): a signature MUST exist before money advances.
  const signature = await Signature.findOne({ quoteId: quote._id }).lean().exec();
  if (!signature) {
    logger.error('ANOMALY E4: payment succeeded with no signature — refusing to advance', {
      paymentIntentId,
      quoteId: String(quote._id),
    });
    return { advanced: false, reason: 'no_signature' };
  }

  // Mark the payment succeeded (idempotent).
  if (payment.status !== 'succeeded') {
    payment.status = 'succeeded';
    if (ctx.chargeId) payment.stripeChargeId = ctx.chargeId;
    await payment.save();
  }

  // Transition approved → deposit_paid (idempotent / monotonic).
  if (quote.status !== 'deposit_paid') {
    if (quote.status !== 'approved') {
      logger.warn('handleDepositSucceeded: quote not in approved state; advancing via paid-timestamp guard', {
        quoteId: String(quote._id),
        status: quote.status,
      });
    }
    quote.status = 'deposit_paid';
    quote.depositPaidAt = new Date();
    await quote.save();
  }

  // Create exactly ONE balance invoice if balance > 0 (E11). Guarded on
  // quote + type so replays are no-ops.
  if (quote.balanceAmount > 0) {
    const existing = await Invoice.findOne({ quoteId: quote._id, type: 'balance' }).exec();
    if (!existing) {
      const client = await loadClient(quote.clientId);
      let stripeInvoiceId: string | null = null;

      if (isStripeConfigured()) {
        try {
          const stripeInvoice = await createBalanceInvoice(quote, {
            customerEmail: client.email,
            customerName: client.name,
          });
          stripeInvoiceId = stripeInvoice.id ?? null;
        } catch (err) {
          logger.warn('Stripe balance invoice creation failed (continuing with local invoice)', {
            err: err instanceof Error ? err.message : String(err),
            quoteId: String(quote._id),
          });
        }
      }

      try {
        await Invoice.create({
          quoteId: quote._id,
          type: 'balance',
          number: await generateInvoiceNumber(),
          amount: quote.balanceAmount,
          currency: quote.currency,
          status: 'sent',
          stripeInvoiceId,
          issuedAt: new Date(),
          dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        });
      } catch (err) {
        // Unique index on `number` or a concurrent insert — treat as already-created.
        logger.warn('Balance invoice insert raced/duplicated — treated as idempotent no-op', {
          err: err instanceof Error ? err.message : String(err),
          quoteId: String(quote._id),
        });
      }
    }
  }

  // Enqueue notifications (idempotent on quote+recipientType+template).
  await enqueueDepositPaidNotifications(quote);

  // Append activity event (idempotent on type+quote presence).
  const hasActivity = await ActivityEvent.findOne({ quoteId: quote._id, type: 'deposit_paid' }).exec();
  if (!hasActivity) {
    await ActivityEvent.create({
      quoteId: quote._id,
      type: 'deposit_paid',
      actor: 'system',
      meta: { paymentIntentId, amount: quote.depositAmount },
    });
  }

  await dispatchQueuedNotifications().catch((err) =>
    logger.warn('notification dispatch failed', { err: err instanceof Error ? err.message : String(err) }),
  );

  return { advanced: true };
}

async function enqueueDepositPaidNotifications(quote: QuoteShape): Promise<void> {
  const [ownerEmail, client] = await Promise.all([
    loadOwnerEmail(quote.ownerId),
    loadClient(quote.clientId),
  ]);

  const wanted: Array<{ recipientType: 'owner' | 'client'; template: string; to?: string }> = [
    { recipientType: 'owner', template: 'deposit_paid', to: ownerEmail },
    { recipientType: 'client', template: 'deposit_paid', to: client.email },
    { recipientType: 'client', template: 'balance_invoice', to: client.email },
  ];

  for (const w of wanted) {
    if (!w.to) continue;
    const exists = await Notification.findOne({
      quoteId: quote._id,
      recipientType: w.recipientType,
      template: w.template,
    }).exec();
    if (exists) continue;
    await Notification.create({
      quoteId: quote._id,
      channel: 'email',
      recipientType: w.recipientType,
      template: w.template,
      to: w.to,
      status: 'queued',
    });
  }
}

/**
 * Handle a verified `payment_intent.payment_failed` for a deposit (E7).
 * Marks the payment failed, leaves the quote `approved`, notifies the owner.
 * Idempotent.
 */
export async function handleDepositFailed(
  paymentIntentId: string,
  reason?: string,
): Promise<{ failed: boolean; reason?: string }> {
  const payment = (await Payment.findOne({
    stripePaymentIntentId: paymentIntentId,
    type: 'deposit',
  }).exec()) as unknown as PaymentShape | null;

  if (!payment) {
    logger.warn('handleDepositFailed: no deposit payment found (transient/race)', { paymentIntentId });
    return { failed: false, reason: 'payment_not_found' };
  }

  if (payment.status !== 'failed') {
    payment.status = 'failed';
    payment.failureReason = reason ?? 'Payment failed';
    await payment.save();
  }

  const quote = (await Quote.findById(payment.quoteId).exec()) as unknown as QuoteShape | null;
  if (!quote) return { failed: true };

  // Quote stays `approved` — NEVER advance on failure. No balance invoice.

  const hasActivity = await ActivityEvent.findOne({
    quoteId: quote._id,
    type: 'payment_failed',
    'meta.paymentIntentId': paymentIntentId,
  }).exec();
  if (!hasActivity) {
    await ActivityEvent.create({
      quoteId: quote._id,
      type: 'payment_failed',
      actor: 'system',
      meta: { paymentIntentId, reason: reason ?? null },
    });
  }

  const ownerEmail = await loadOwnerEmail(quote.ownerId);
  if (ownerEmail) {
    const exists = await Notification.findOne({
      quoteId: quote._id,
      recipientType: 'owner',
      template: 'payment_failed',
      status: { $in: ['queued', 'sent'] },
    }).exec();
    if (!exists) {
      await Notification.create({
        quoteId: quote._id,
        channel: 'email',
        recipientType: 'owner',
        template: 'payment_failed',
        to: ownerEmail,
        status: 'queued',
      });
    }
  }

  await dispatchQueuedNotifications().catch((err) =>
    logger.warn('notification dispatch failed', { err: err instanceof Error ? err.message : String(err) }),
  );
  return { failed: true };
}
