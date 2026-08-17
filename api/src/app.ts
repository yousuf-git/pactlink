/*! PactLink API — built by Muhammad Yousuf · https://github.com/yousuf-git · https://yousuf-dev.com */
import express, { type Express, type Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { pingDb } from './config/db.js';
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/error.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';

// Core routers — always present, imported statically.
import authRouter from './routes/auth.js';
import quotesRouter from './routes/quotes.js';
import clientsRouter from './routes/clients.js';
import publicRouter from './routes/public.js';

const API = '/api/v1';

/**
 * Load an optional router by path, returning null instead of throwing when the
 * module is absent. This keeps partial checkouts and isolated test runs booting
 * with a reduced surface; in a complete build every import resolves.
 */
async function loadRouter(path: string, exportName = 'default'): Promise<Router | null> {
  try {
    const mod = (await import(path)) as Record<string, Router>;
    return mod[exportName] ?? mod.default ?? null;
  } catch (err) {
    logger.warn(`Optional router not mounted: ${path}`, {
      reason: (err as Error)?.message,
    });
    return null;
  }
}

/**
 * Build the Express app (no listen — importable by Supertest).
 *
 * CRITICAL ordering: the Stripe webhook router is mounted with
 * express.raw() BEFORE express.json() so HMAC signature verification sees the
 * raw bytes. Everything else is mounted after express.json().
 */
export async function createApp(): Promise<Express> {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true); // capture real client IP behind proxies (F-04 evidence)
  app.use(helmet());

  // ── 1. Stripe webhook FIRST, with raw body (signature verification) ──
  const webhookRouter = await loadRouter('./routes/webhooks.js');
  if (webhookRouter) {
    app.use(
      `${API}/webhooks/stripe`,
      express.raw({ type: 'application/json' }),
      webhookRouter,
    );
  }

  // ── 2. Body parsers (after webhook raw mount) ──
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ── 3. CORS ──
  app.use(
    cors({
      origin: env.allowedOrigins,
      credentials: true,
    }),
  );

  // ── 4. Health checks ──
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get(
    '/ready',
    asyncHandler(async (_req, res) => {
      await pingDb();
      res.json({ status: 'ready' });
    }),
  );

  // ── 5. Owner + public routers ──
  // Broad rate limit across the whole API surface (webhook is mounted above
  // this line, so Stripe deliveries are never throttled).
  app.use(API, apiLimiter);
  // Stricter brute-force limit on credential login.
  app.use(`${API}/auth`, authLimiter, authRouter);
  app.use(`${API}/quotes`, quotesRouter);
  app.use(`${API}/clients`, clientsRouter);
  app.use(`${API}/public/quotes`, publicRouter);

  // ── 6. Business-logic routers ──
  // The `signatures.ts` and `payments.ts` default exports are the PUBLIC sign /
  // deposit routers (each applies the linkToken middleware internally). They
  // share the /public/quotes base path — Express allows multiple routers on one
  // mount path and tries each in order.
  const [signRouter, payRouter, analyticsRouter, pdfRouter] = await Promise.all([
    loadRouter('./routes/signatures.js'),
    loadRouter('./routes/payments.js'),
    loadRouter('./routes/analytics.js'),
    loadRouter('./routes/pdf.js'),
  ]);

  // Public client subroutes: /public/quotes/:token/sign and …/deposit-intent.
  if (signRouter) app.use(`${API}/public/quotes`, signRouter);
  if (payRouter) app.use(`${API}/public/quotes`, payRouter);

  // Owner-facing mounts for the same router groups.
  if (payRouter) app.use(`${API}/payments`, payRouter);
  if (signRouter) app.use(`${API}/signatures`, signRouter);
  if (analyticsRouter) app.use(`${API}/analytics`, analyticsRouter);
  if (pdfRouter) app.use(`${API}/quotes`, pdfRouter); // /quotes/:id/pdf

  // ── 7. 404 + error handler (LAST) ──
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
