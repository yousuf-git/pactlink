import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { ClientModel, QuoteModel } from '../models/index.js';
import { recomputeTotals } from '../utils/money.js';
import { generatePublicToken } from '../utils/token.js';
import { startMemoryDb, stopMemoryDb, clearDb, createTestOwner } from './support/setup.js';

let app: Express;

beforeAll(async () => {
  await startMemoryDb();
  app = await createApp();
});
afterAll(async () => {
  await stopMemoryDb();
});
beforeEach(async () => {
  await clearDb();
});

async function seedSentQuote(over: Record<string, unknown> = {}) {
  const { owner } = await createTestOwner();
  const client = await ClientModel.create({ ownerId: owner._id, name: 'Jordan', email: 'j@x.co' });
  const lineItems = [
    { label: 'Design', qty: 1, unitPrice: 100000, taxRate: 0, type: 'standard', selected: true, tierGroup: null },
    { label: 'Rush', qty: 1, unitPrice: 50000, taxRate: 0, type: 'optional', selected: false, tierGroup: null },
  ];
  const totals = recomputeTotals({ lineItems, depositType: 'percent', depositValue: 30 });
  const quote = await QuoteModel.create({
    ownerId: owner._id,
    clientId: client._id,
    title: 'Kitchen Remodel',
    status: 'sent',
    currency: 'USD',
    lineItems,
    ...totals,
    depositType: 'percent',
    depositValue: 30,
    publicToken: generatePublicToken(),
    sentAt: new Date(),
    ...over,
  });
  return quote;
}

describe('GET /api/v1/public/quotes/:token', () => {
  it('404 for an unknown token (no enumeration)', async () => {
    const res = await request(app).get('/api/v1/public/quotes/pl_does_not_exist');
    expect(res.status).toBe(404);
  });

  it('410 for an expired link', async () => {
    const quote = await seedSentQuote({ expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).get(`/api/v1/public/quotes/${quote.publicToken}`);
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('GONE');
  });

  it('transitions sent → viewed on first view and stamps viewedAt', async () => {
    const quote = await seedSentQuote();
    const res = await request(app).get(`/api/v1/public/quotes/${quote.publicToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('viewed');

    const reloaded = await QuoteModel.findById(quote._id);
    expect(reloaded?.status).toBe('viewed');
    expect(reloaded?.viewedAt).toBeTruthy();
    // public projection never leaks ownerId.
    expect(res.body.data.ownerId).toBeUndefined();
  });

  it('does not regress status when re-opened (monotonic)', async () => {
    const quote = await seedSentQuote({ status: 'approved', approvedAt: new Date() });
    const res = await request(app).get(`/api/v1/public/quotes/${quote.publicToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved'); // stays approved, not regressed to viewed
  });
});

describe('PATCH /api/v1/public/quotes/:token/selection', () => {
  it('recomputes totals when an optional item is toggled on', async () => {
    const quote = await seedSentQuote();
    const optional = quote.lineItems.find((li) => li.type === 'optional')!;
    const res = await request(app)
      .patch(`/api/v1/public/quotes/${quote.publicToken}/selection`)
      .send({ selections: [{ lineItemId: String(optional._id), selected: true }] });
    expect(res.status).toBe(200);
    expect(res.body.data.subtotal).toBe(150000); // 100000 + 50000
    expect(res.body.data.depositAmount).toBe(45000); // 30%
  });

  it('locks selection at approval (409)', async () => {
    const quote = await seedSentQuote({ status: 'approved', approvedAt: new Date() });
    const optional = quote.lineItems.find((li) => li.type === 'optional')!;
    const res = await request(app)
      .patch(`/api/v1/public/quotes/${quote.publicToken}/selection`)
      .send({ selections: [{ lineItemId: String(optional._id), selected: true }] });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SELECTION_LOCKED');
  });
});
