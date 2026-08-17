import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { ClientModel } from '../models/index.js';
import { signToken } from '../middleware/auth.js';
import { startMemoryDb, stopMemoryDb, clearDb, createTestOwner } from './support/setup.js';

let app: Express;
let token: string;
let clientId: string;

beforeAll(async () => {
  await startMemoryDb();
  app = await createApp();
});
afterAll(async () => {
  await stopMemoryDb();
});
beforeEach(async () => {
  await clearDb();
  const { owner } = await createTestOwner();
  token = signToken({ sub: String(owner._id), email: owner.email, role: 'demo' });
  const client = await ClientModel.create({
    ownerId: owner._id,
    name: 'Jordan Avery',
    email: 'jordan@brightway.co',
  });
  clientId = String(client._id);
});

function auth(req: request.Test): request.Test {
  return req.set('Authorization', `Bearer ${token}`);
}

const validQuoteBody = () => ({
  clientId,
  title: 'Kitchen Remodel',
  lineItems: [
    { label: 'Design', qty: 1, unitPrice: 100000, taxRate: 10 },
    { label: 'Rush', qty: 1, unitPrice: 50000, type: 'optional', selected: false },
  ],
  depositType: 'percent',
  depositValue: 30,
});

describe('POST /api/v1/quotes', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/api/v1/quotes').send(validQuoteBody());
    expect(res.status).toBe(401);
  });

  it('creates a draft quote with server-recomputed totals (ignores client totals)', async () => {
    const res = await auth(request(app).post('/api/v1/quotes')).send(validQuoteBody());
    expect(res.status).toBe(201);
    const q = res.body.data;
    expect(q.status).toBe('draft');
    // Optional "Rush" deselected → only Design (100000 + 10% tax) counts.
    expect(q.subtotal).toBe(100000);
    expect(q.taxTotal).toBe(10000);
    expect(q.total).toBe(110000);
    expect(q.depositAmount).toBe(33000); // 30%
    expect(q.balanceAmount).toBe(77000);
    expect(q.publicToken).toBeTypeOf('string');
  });

  it('returns 422 for a negative quantity', async () => {
    const body = validQuoteBody();
    body.lineItems[0]!.qty = -1;
    const res = await auth(request(app).post('/api/v1/quotes')).send(body);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for a tax rate above 100%', async () => {
    const body = validQuoteBody();
    body.lineItems[0]!.taxRate = 150;
    const res = await auth(request(app).post('/api/v1/quotes')).send(body);
    expect(res.status).toBe(422);
  });

  it('falls back to owner default deposit when omitted', async () => {
    const body: Record<string, unknown> = validQuoteBody();
    delete body.depositType;
    delete body.depositValue;
    const res = await auth(request(app).post('/api/v1/quotes')).send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.depositType).toBe('percent');
    expect(res.body.data.depositValue).toBe(30);
  });
});

describe('POST /api/v1/quotes/:id/send', () => {
  it('transitions draft → sent and stamps sentAt', async () => {
    const created = await auth(request(app).post('/api/v1/quotes')).send(validQuoteBody());
    const id = created.body.data.id ?? created.body.data._id;
    const res = await auth(request(app).post(`/api/v1/quotes/${id}/send`));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('sent');
    expect(res.body.data.sentAt).toBeTruthy();
  });
});
