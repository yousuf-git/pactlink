import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectMemoryDb, disconnectMemoryDb, clearDb, ensureIndexes } from '../helpers/db';
import { models, enums } from '../helpers/testModels';

/**
 * Signature-gates-charge (E4): the deposit-intent controller must refuse with
 * 409 when no signature exists, and never create a Payment / never advance.
 */

vi.mock('../../models', () => models);
vi.mock('../../models/enums', () => enums);
vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
// Stripe configured=true so we reach the signature check, but createDepositIntent
// is stubbed (only called when a signature exists).
vi.mock('../../config/stripe', () => ({ isStripeConfigured: () => true }));
vi.mock('../../services/stripe', () => ({
  createDepositIntent: vi.fn(async () => ({ id: 'pi_new', client_secret: 'cs_test' })),
}));

const { createDeposit } = await import('../../controllers/payments.controller');
const { Quote, Client, User, Payment, Signature } = models;

function mockRes() {
  const res: { statusCode?: number; payload?: unknown; status: (c: number) => typeof res; json: (b: unknown) => typeof res } = {
    status(c: number) {
      this.statusCode = c;
      return this;
    },
    json(b: unknown) {
      this.payload = b;
      return this;
    },
  };
  return res;
}

async function seed({ withSignature }: { withSignature: boolean }) {
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
    balanceAmount: 70000,
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
  return { quote };
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

describe('deposit-intent signature gate (E4)', () => {
  it('returns 409 and creates no payment when there is no signature', async () => {
    const { quote } = await seed({ withSignature: false });
    const req = { quote, body: {}, headers: {}, ip: '1.1.1.1' } as never;
    const res = mockRes();

    await createDeposit(req, res as never);

    expect(res.statusCode).toBe(409);
    expect((res.payload as { error: { code: string } }).error.code).toBe('SIGNATURE_REQUIRED');

    const payments = await Payment.find({ quoteId: quote._id });
    expect(payments).toHaveLength(0);

    const { createDepositIntent } = await import('../../services/stripe');
    expect(createDepositIntent).not.toHaveBeenCalled();
  });

  it('creates a pending deposit payment when a signature exists', async () => {
    const { quote } = await seed({ withSignature: true });
    const req = { quote, body: {}, headers: {}, ip: '1.1.1.1' } as never;
    const res = mockRes();

    await createDeposit(req, res as never);

    expect(res.statusCode).toBe(201);
    const payments = await Payment.find({ quoteId: quote._id });
    expect(payments).toHaveLength(1);
    expect(payments[0]?.status).toBe(enums.PaymentStatus.pending);
    expect(payments[0]?.stripePaymentIntentId).toBe('pi_new');
  });
});
