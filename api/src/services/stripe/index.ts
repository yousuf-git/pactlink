import type Stripe from 'stripe';
import { requireStripe } from '../../config/stripe.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

/**
 * Stripe service (F-05 / F-06 / F-09).
 *
 * Thin, idempotent wrappers around the Stripe SDK. All money is integer minor
 * units (cents); we pass `quote.depositAmount` / `quote.balanceAmount` straight
 * through since Stripe also expects integer minor units.
 */

interface QuoteLike {
  _id: unknown;
  id?: string;
  title: string;
  currency: string;
  depositAmount: number;
  balanceAmount: number;
  clientId?: unknown;
}

function quoteIdStr(quote: QuoteLike): string {
  return String(quote.id ?? quote._id);
}

/**
 * Create (or idempotently re-create) a PaymentIntent for the quote deposit.
 * The idempotency key is derived from the quote id so retried requests return
 * the SAME PaymentIntent rather than charging twice (F-05/F-11).
 */
export async function createDepositIntent(
  quote: QuoteLike,
  opts: { idempotencyKey?: string } = {},
): Promise<Stripe.PaymentIntent> {
  const stripe = requireStripe();
  const qid = quoteIdStr(quote);
  const idempotencyKey = opts.idempotencyKey ?? `deposit:${qid}`;

  const intent = await stripe.paymentIntents.create(
    {
      amount: quote.depositAmount,
      currency: quote.currency.toLowerCase(),
      // Tie the intent back to our quote so the webhook can correlate it.
      metadata: { quoteId: qid, kind: 'deposit' },
      automatic_payment_methods: { enabled: true },
      description: `Deposit — ${quote.title}`,
    },
    { idempotencyKey },
  );

  logger.info('Created deposit PaymentIntent', { quoteId: qid, paymentIntentId: intent.id });
  return intent;
}

/**
 * Create + finalize a Stripe Invoice for the quote balance (F-06).
 * Requires a Stripe customer; we create/look one up by quote metadata email if
 * provided. Returns the finalized invoice. Idempotency is enforced upstream by
 * the state machine (one invoices doc per quote), so this is only ever called
 * once per quote.
 */
export async function createBalanceInvoice(
  quote: QuoteLike,
  opts: { customerEmail?: string; customerName?: string; daysUntilDue?: number } = {},
): Promise<Stripe.Invoice> {
  const stripe = requireStripe();
  const qid = quoteIdStr(quote);

  // A customer is required for Stripe Invoices.
  const customer = await stripe.customers.create({
    email: opts.customerEmail,
    name: opts.customerName,
    metadata: { quoteId: qid },
  });

  // Attach the balance as a one-off invoice item, then create the invoice.
  await stripe.invoiceItems.create({
    customer: customer.id,
    amount: quote.balanceAmount,
    currency: quote.currency.toLowerCase(),
    description: `Balance — ${quote.title}`,
    metadata: { quoteId: qid, kind: 'balance' },
  });

  const invoice = await stripe.invoices.create(
    {
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: opts.daysUntilDue ?? 14,
      auto_advance: true,
      metadata: { quoteId: qid, kind: 'balance' },
    },
    { idempotencyKey: `balance-invoice:${qid}` },
  );

  // Finalize so it gets a hosted invoice URL the client can pay.
  const finalized = invoice.id
    ? await stripe.invoices.finalizeInvoice(invoice.id)
    : invoice;

  logger.info('Created balance Stripe Invoice', { quoteId: qid, stripeInvoiceId: finalized.id });
  return finalized;
}

/**
 * Verify a Stripe webhook against the RAW request body and signature header.
 * Throws if the signature is invalid (handler maps to 400).
 */
export function verifyWebhook(rawBody: Buffer | string, signature: string): Stripe.Event {
  const stripe = requireStripe();
  if (!env.STRIPE_WEBHOOK_SECRET) {
    const err = new Error('STRIPE_WEBHOOK_SECRET not configured') as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 503;
    err.code = 'STRIPE_WEBHOOK_NOT_CONFIGURED';
    throw err;
  }
  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}
