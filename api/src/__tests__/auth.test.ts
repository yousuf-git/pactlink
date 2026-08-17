import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
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

describe('POST /api/v1/auth/login', () => {
  it('returns 401 for bad credentials (generic, no enumeration)', async () => {
    await createTestOwner('demo1234');
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'demo@pactlink.app', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for an unknown email (same generic message)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@pactlink.app', password: 'demo1234' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/invalid email or password/i);
  });

  it('returns a token + user on valid credentials', async () => {
    await createTestOwner('demo1234');
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'demo@pactlink.app', password: 'demo1234' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTypeOf('string');
    expect(res.body.data.user.email).toBe('demo@pactlink.app');
    // passwordHash must never be returned.
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('422 when body fails Zod validation', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/auth/demo', () => {
  it('logs into the seeded demo account without a password', async () => {
    await createTestOwner('demo1234');
    const res = await request(app).post('/api/v1/auth/demo');
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('demo');
    expect(res.body.data.token).toBeTypeOf('string');
  });

  it('401 when no demo account is seeded', async () => {
    const res = await request(app).post('/api/v1/auth/demo');
    expect(res.status).toBe(401);
  });
});
