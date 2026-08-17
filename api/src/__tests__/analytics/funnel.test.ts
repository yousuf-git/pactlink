import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { connectMemoryDb, disconnectMemoryDb, clearDb, ensureIndexes } from '../helpers/db';
import { models, enums } from '../helpers/testModels';

/**
 * Funnel aggregation math (F-10): counts by stage timestamp, conversion %, and
 * median time-to-approval (approvedAt − sentAt).
 */

vi.mock('../../models', () => models);
vi.mock('../../models/enums', () => enums);

const { getFunnel } = await import('../../services/analytics');
const { Quote, Client, User } = models;

const DAY = 24 * 60 * 60 * 1000;

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

async function makeQuote(owner: Types.ObjectId, client: Types.ObjectId, stamps: Partial<{ sentAt: Date; viewedAt: Date; approvedAt: Date; depositPaidAt: Date }>) {
  return Quote.create({
    ownerId: owner,
    clientId: client,
    title: 'Q',
    status: 'sent',
    currency: 'USD',
    lineItems: [],
    subtotal: 0,
    taxTotal: 0,
    total: 0,
    depositType: 'percent',
    depositValue: 30,
    depositAmount: 0,
    balanceAmount: 0,
    ...stamps,
  });
}

describe('funnel aggregation (F-10)', () => {
  it('computes counts, conversion %, and median time-to-approval', async () => {
    const owner = await User.create({ email: 'o@t.com', name: 'O', brand: { businessName: 'N' } });
    const client = await Client.create({ ownerId: owner._id, name: 'C', email: 'c@t.com' });
    const o = owner._id as Types.ObjectId;
    const c = client._id as Types.ObjectId;
    const base = new Date('2026-01-01T00:00:00Z').getTime();

    // 4 sent, 3 viewed, 2 approved, 1 deposit_paid (monotonic stamps).
    // Approval times: 2 days and 4 days → median = 3 days.
    await makeQuote(o, c, { sentAt: new Date(base) }); // sent only
    await makeQuote(o, c, { sentAt: new Date(base), viewedAt: new Date(base + DAY) }); // viewed
    await makeQuote(o, c, {
      sentAt: new Date(base),
      viewedAt: new Date(base + DAY),
      approvedAt: new Date(base + 2 * DAY), // ttApproval = 2 days
    });
    await makeQuote(o, c, {
      sentAt: new Date(base),
      viewedAt: new Date(base + DAY),
      approvedAt: new Date(base + 4 * DAY), // ttApproval = 4 days
      depositPaidAt: new Date(base + 5 * DAY),
    });

    const funnel = await getFunnel(o);

    expect(funnel.counts).toEqual({ sent: 4, viewed: 3, approved: 2, deposit_paid: 1 });

    // conversion: viewed/sent = 75, approved/viewed = 66.7, paid/approved = 50, overall paid/sent = 25
    expect(funnel.conversion.sentToViewed).toBe(75);
    expect(funnel.conversion.viewedToApproved).toBe(66.7);
    expect(funnel.conversion.approvedToDepositPaid).toBe(50);
    expect(funnel.conversion.overall).toBe(25);

    // median time-to-approval = average of 2d and 4d = 3 days in ms.
    expect(funnel.medianTimeToApprovalMs).toBe(3 * DAY);
  });

  it('returns zeros and null median for an owner with no quotes', async () => {
    const lonely = new Types.ObjectId();
    const funnel = await getFunnel(lonely);
    expect(funnel.counts).toEqual({ sent: 0, viewed: 0, approved: 0, deposit_paid: 0 });
    expect(funnel.conversion.overall).toBe(0);
    expect(funnel.medianTimeToApprovalMs).toBeNull();
  });

  it('scopes strictly to the owner', async () => {
    const owner = await User.create({ email: 'o@t.com', name: 'O', brand: { businessName: 'N' } });
    const other = await User.create({ email: 'x@t.com', name: 'X', brand: { businessName: 'X' } });
    const client = await Client.create({ ownerId: owner._id, name: 'C', email: 'c@t.com' });
    await makeQuote(owner._id as Types.ObjectId, client._id as Types.ObjectId, { sentAt: new Date() });
    await makeQuote(other._id as Types.ObjectId, client._id as Types.ObjectId, { sentAt: new Date() });

    const funnel = await getFunnel(owner._id as Types.ObjectId);
    expect(funnel.counts.sent).toBe(1);
  });
});
