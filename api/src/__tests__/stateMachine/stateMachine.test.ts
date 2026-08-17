import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectMemoryDb, disconnectMemoryDb, clearDb, ensureIndexes } from '../helpers/db';
import { models, enums } from '../helpers/testModels';

/**
 * State machine tests (F-09):
 *  - signature gates the charge (E4): no signature → no advance
 *  - exactly one balance invoice (E11)
 *  - payment_failed leaves the quote `approved` (E7)
 */

vi.mock('../../models', () => models);
vi.mock('../../models/enums', () => enums);
vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../config/stripe', () => ({ isStripeConfigured: () => false }));
vi.mock('../../services/stripe', () => ({
  createBalanceInvoice: vi.fn(async () => ({ id: 'in_x', hosted_invoice_url: 'https://pay' })),
}));
vi.mock('../../utils/money', () => ({
  recomputeTotals: (q: Record<string, number>) => q,
}));
vi.mock('../../services/email', () => ({
  dispatchQueuedNotifications: vi.fn(async () => ({ sent: 0, failed: 0, total: 0 })),
}));

const { handleDepositSucceeded, handleDepositFailed } = await import('../../services/stateMachine');
const { Quote, Client, User, Payment, Signature, Invoice } = models;

async function seed({ withSignature = true, balance = 70000 }: { withSignature?: boolean; balance?: number } = {}) {
  const owner = await User.create({ email: 'o@t.com', name: 'O', brand: { businessName: 'N' } });
  const client = await Client.create({ ownerId: owner._id, name: 'C', email: 'c@t.com' });
  const quote = await Quote.create({
    ownerId: owner._id,
    clientId: client._id,
    title: 'T',
    status: enums.QuoteStatus.approved,
    currency: 'USD',
    lineItems: [{ label: 'X', qty: 1, unitPrice: 100000, taxRate: 0, type: 'standard', selected: true }],
    subtotal: 100000,
    taxTotal: 0,
    total: 100000,
    depositType: 'percent',
    depositValue: 30,
    depositAmount: 30000,
    balanceAmount: balance,
    approvedAt: new Date(),
  });
  if (withSignature) {
    await Signature.create({
      quoteId: quote._id,
      signerName: 'J',
      method: 'typed',
      signatureData: 'J',
      ipAddress: '1.1.1.1',
      signedAt: new Date(),
    });
  }
  await Payment.create({
    quoteId: quote._id,
    type: enums.PaymentKind.deposit,
    stripePaymentIntentId: 'pi_1',
    amount: 30000,
    currency: 'USD',
    status: enums.PaymentStatus.pending,
    idempotencyKey: `deposit:${String(quote._id)}`,
  });
  return { owner, client, quote };
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
});

describe('state machine — signature gate (E4)', () => {
  it('does NOT advance to deposit_paid when no signature exists', async () => {
    const { quote } = await seed({ withSignature: false });
    const result = await handleDepositSucceeded('pi_1', { chargeId: 'ch_1' });

    expect(result.advanced).toBe(false);
    expect(result.reason).toBe('no_signature');

    const after = await Quote.findById(quote._id).lean();
    expect(after?.status).toBe(enums.QuoteStatus.approved); // unchanged
    const payment = await Payment.findOne({ quoteId: quote._id }).lean();
    expect(payment?.status).toBe(enums.PaymentStatus.pending); // not marked succeeded
    const invoices = await Invoice.find({ quoteId: quote._id });
    expect(invoices).toHaveLength(0);
  });
});

describe('state machine — balance invoice (E11)', () => {
  it('creates exactly one balance invoice on success', async () => {
    const { quote } = await seed();
    await handleDepositSucceeded('pi_1', { chargeId: 'ch_1' });
    const invoices = await Invoice.find({ quoteId: quote._id });
    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.amount).toBe(70000);
    expect(invoices[0]?.type).toBe('balance');
  });

  it('does not create a balance invoice when balance is 0', async () => {
    const { quote } = await seed({ balance: 0 });
    await handleDepositSucceeded('pi_1', { chargeId: 'ch_1' });
    const invoices = await Invoice.find({ quoteId: quote._id });
    expect(invoices).toHaveLength(0);
  });

  it('is idempotent across repeated calls (one invoice, succeeded once)', async () => {
    const { quote } = await seed();
    await handleDepositSucceeded('pi_1');
    await handleDepositSucceeded('pi_1');
    await handleDepositSucceeded('pi_1');
    const invoices = await Invoice.find({ quoteId: quote._id });
    expect(invoices).toHaveLength(1);
  });
});

describe('state machine — payment failure (E7)', () => {
  it('marks payment failed and leaves the quote approved (no invoice)', async () => {
    const { quote } = await seed();
    const result = await handleDepositFailed('pi_1', 'card_declined');

    expect(result.failed).toBe(true);

    const after = await Quote.findById(quote._id).lean();
    expect(after?.status).toBe(enums.QuoteStatus.approved); // stays approved
    expect(after?.depositPaidAt).toBeNull();

    const payment = await Payment.findOne({ quoteId: quote._id }).lean();
    expect(payment?.status).toBe(enums.PaymentStatus.failed);
    expect(payment?.failureReason).toBe('card_declined');

    const invoices = await Invoice.find({ quoteId: quote._id });
    expect(invoices).toHaveLength(0); // no balance invoice on failure
  });
});
