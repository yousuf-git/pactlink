/**
 * Vitest global setup — populate required env vars BEFORE any module
 * (notably config/env.ts) is imported, so boot-time validation passes.
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/pactlink-test';
process.env.JWT_SECRET ??= 'test-jwt-secret-that-is-at-least-32-chars-long';
process.env.JWT_EXPIRES_IN ??= '1h';
process.env.PUBLIC_APP_URL ??= 'http://localhost:5173';
process.env.SEED_DEMO_PASSWORD ??= 'demo1234';
