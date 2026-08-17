import Stripe from 'stripe';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Stripe SDK client — lazily resolved.
 *
 * Stripe is an OPTIONAL service (graceful degradation): the app boots without
 * STRIPE_SECRET_KEY, and only the code paths that actually move money throw a
 * clear 503 when it is unconfigured. Tests mock this module entirely.
 */
let client: Stripe | null = null;
let warned = false;

export function getStripe(): Stripe | null {
  if (client) return client;
  if (!env.STRIPE_SECRET_KEY) {
    if (!warned) {
      logger.warn('STRIPE_SECRET_KEY not set — Stripe features (deposit intent, balance invoice) disabled');
      warned = true;
    }
    return null;
  }
  client = new Stripe(env.STRIPE_SECRET_KEY, {
    // Pin a known-stable API version; Stripe types accept the literal.
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    typescript: true,
    appInfo: { name: 'PactLink', version: '1.0.0' },
  });
  return client;
}

/**
 * Returns the configured Stripe client or throws a typed 503-style error.
 * Use at the call site of any money-moving operation.
 */
export function requireStripe(): Stripe {
  const s = getStripe();
  if (!s) {
    const err = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.') as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 503;
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }
  return s;
}

export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}
