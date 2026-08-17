import crypto from 'node:crypto';

/**
 * Generate an unguessable public link token for a quote (F-03, A2).
 *
 * Uses 32 random bytes (256 bits) URL-safe base64 → high entropy so tokens
 * cannot be enumerated. Prefixed for easy identification in logs/URLs.
 */
export function generatePublicToken(): string {
  return `pl_${crypto.randomBytes(32).toString('base64url')}`;
}

/** Generate a generic idempotency key (e.g. for payment intent creation). */
export function generateIdempotencyKey(prefix = 'idem'): string {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}
