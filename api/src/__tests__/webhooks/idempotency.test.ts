import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectMemoryDb, disconnectMemoryDb, clearDb, ensureIndexes } from '../helpers/db';
import { models, enums } from '../helpers/testModels';

/**
 * HEADLINE TEST: webhook idempotency (E1 / F-11).
 * A duplicate Stripe event (same eventId) must produce exactly ONE set of side
 * effects: one succeeded payment, one quote transition, one balance invoice.
 */

// --- Mock the modules the handler + state machine depend on --------------------
vi.mock('../../models', () => models);
vi.mock('../../models/enums', () => enums);
vi.mock('../../config/env', () => ({
  env: { STRIPE_WEBHOOK_SECRET: 'whsec_test', STRIPE_SECRET_KEY: '', PUBLIC_APP_URL: 'http://localhost:5173', NODE_ENV: 'test' },
}));
vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../config/stripe', () => ({
  isStripeConfigured: () => false,
  requireStripe: () => {
    throw new Error('stripe disabled in test');
  },
  getStripe: () => null,
}));
// Stripe service: stub verifyWebhook to echo the raw JSON as a parsed event, and
// no-op the invoice creation (Stripe disabled).
vi.mock('../../services/stripe', () => ({
  verifyWebhook: vi.fn((rawBody: Buffer) => JSON.parse(rawBody.toString())),
  createBalanceInvoice: vi.fn(async () => ({ id: 'in_test', hosted_invoice_url: 'https://pay' })),
  createDepositIntent: vi.fn(),
}));
vi.mock('../../utils/money', () => ({
  recomputeTotals: (q: { subtotal: number; taxTotal: number; total: number; depositAmount: number; balanceAmount: number }) => ({
    subtotal: q.subtotal,
    taxTotal: q.taxTotal,
    total: q.total,
    depositAmount: q.depositAmount,
    balanceAmount: q.balanceAmount,
  }),
}));
// Email: no-op dispatch so we don't touch SMTP.
vi.mock('../../services/email', () => ({
  dispatchQueuedNotifications: vi.fn(async () => ({ sent: 0, failed: 0, total: 0 })),
  sendNotification: vi.fn(),
  renderTemplate: vi.fn(),
}));

// Import AFTER mocks are registered.
const { handleStripeWebhook } = await import('../../webhooks/stripeHandler');

const { Quote, Client, User, Payment, Signature, Invoice, WebhookEvent } = models;

async function seedApprovedQuoteWithPendingDeposit() {
  const owner = await User.create({ email: 'owner@test.com', name: 'Owner', brand: { businessName: 'Northwind' } });
  const client = await Client.create({ ownerId: owner._id, name: 'Client', email: 'client@test.com' });
  const quote = await Quote.create({
    ownerId: owner._id,
    clientId: client._id,
    title: 'Kitchen Remodel',
    status: enums.QuoteStatus.approved,
    currency: 'USD',
    lineItems: [{ label: 'Cabinets', qty: 1, unitPrice: 100000, taxRate: 0, type: 'standard', selected: true }],
    subtotal: 100000,
    taxTotal: 0,
    total: 100000,
    depositType: 'percent',
    depositValue: 30,
    depositAmount: 30000,
    balanceAmount: 70000,
    approvedAt: new Date(),
  });
  await Signature.create({
    quoteId: quote._id,
    signerName: 'Jane Client',
    method: 'typed',
    signatureData: 'Jane Client',
    ipAddress: '1.2.3.4',
    signedAt: new Date(),
  });
  await Payment.create({
    quoteId: quote._id,
    type: enums.PaymentKind.deposit,
    stripePaymentIntentId: 'pi_123',
    amount: 30000,
    currency: 'USD',
    status: enums.PaymentStatus.pending,
    idempotencyKey: `deposit:${String(quote._id)}`,
  });
  return { owner, client, quote };
}

function depositSucceededEvent(eventId: string) {
  return Buffer.from(
    JSON.stringify({
      id: eventId,
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123', object: 'payment_intent', amount: 30000, currency: 'usd', metadata: { kind: 'deposit', quoteId: '' }, latest_charge: 'ch_1' } },
    }),
  );
}

beforeAll(async () => {
  await connectMemoryDb();
  await ensureIndexes();
});
afterAll(async () => {
  await disconnectMemoryDb();
});
beforeEach(async () => {
  await clearDb();
  await ensureIndexes();
  vi.clearAllMocks();
  // Re-establish the default verifyWebhook behaviour after clearAllMocks().
  const { verifyWebhook } = await import('../../services/stripe');
  (verifyWebhook as unknown as { mockImplementation: (f: (b: Buffer) => unknown) => void }).mockImplementation(
    (rawBody: Buffer) => JSON.parse(rawBody.toString()),
  );
});

describe('Stripe webhook idempotency (E1/F-11)', () => {
  it('processes a deposit_succeeded event once and advances the quote', async () => {
    const { quote } = await seedApprovedQuoteWithPendingDeposit();

    const res = await handleStripeWebhook(depositSucceededEvent('evt_1'), 'sig');
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const updated = await Quote.findById(quote._id).lean();
    expect(updated?.status).toBe(enums.QuoteStatus.deposit_paid);
    expect(updated?.depositPaidAt).toBeTruthy();

    const payment = await Payment.findOne({ quoteId: quote._id }).lean();
    expect(payment?.status).toBe(enums.PaymentStatus.succeeded);

    const invoices = await Invoice.find({ quoteId: quote._id });
    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.amount).toBe(70000);

    const events = await WebhookEvent.find({ eventId: 'evt_1' });
    expect(events).toHaveLength(1);
    expect(events[0]?.processed).toBe(true);
  });

  it('THE HEADLINE: a DUPLICATE eventId yields a single side-effect (no double charge/invoice)', async () => {
    const { quote } = await seedApprovedQuoteWithPendingDeposit();

    // Same eventId delivered twice (Stripe retry).
    const first = await handleStripeWebhook(depositSucceededEvent('evt_dup'), 'sig');
    const second = await handleStripeWebhook(depositSucceededEvent('evt_dup'), 'sig');

    expect(first.status).toBe(200);
    expect(first.body.deduped).toBeUndefined();
    expect(second.status).toBe(200);
    expect(second.body.deduped).toBe(true); // recognised as duplicate

    // Exactly one webhookEvents row.
    const events = await WebhookEvent.find({ eventId: 'evt_dup' });
    expect(events).toHaveLength(1);

    // Exactly one balance invoice — the core guarantee.
    const invoices = await Invoice.find({ quoteId: quote._id });
    expect(invoices).toHaveLength(1);

    // Exactly one payment, succeeded once.
    const payments = await Payment.find({ quoteId: quote._id });
    expect(payments).toHaveLength(1);
    expect(payments[0]?.status).toBe(enums.PaymentStatus.succeeded);
  });

  it('reprocessing distinct eventIds for the same intent still creates only one invoice (E11)', async () => {
    const { quote } = await seedApprovedQuoteWithPendingDeposit();

    // Two DIFFERENT events (e.g. manual replay with a new event id) but same PI.
    await handleStripeWebhook(depositSucceededEvent('evt_a'), 'sig');
    await handleStripeWebhook(depositSucceededEvent('evt_b'), 'sig');

    const invoices = await Invoice.find({ quoteId: quote._id });
    expect(invoices).toHaveLength(1); // guarded on quote+type, not just eventId
  });

  it('rejects an event with an invalid signature (400, no event recorded)', async () => {
    const { verifyWebhook } = await import('../../services/stripe');
    (verifyWebhook as unknown as { mockImplementationOnce: (f: () => never) => void }).mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    const res = await handleStripeWebhook(depositSucceededEvent('evt_bad'), 'badsig');
    expect(res.status).toBe(400);
    const events = await WebhookEvent.find({ eventId: 'evt_bad' });
    expect(events).toHaveLength(0);
  });
});
