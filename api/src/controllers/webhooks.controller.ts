import type { Request, Response } from 'express';
import { handleStripeWebhook } from '../webhooks/stripeHandler.js';

/**
 * Thin Stripe webhook controller (UC-S01 / F-11).
 * The raw body is applied upstream in index.ts (express.raw on this route), so
 * `req.body` is a Buffer here — required for signature verification.
 */
export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature'] as string | undefined;
  const rawBody = req.body as Buffer;
  const result = await handleStripeWebhook(rawBody, signature);
  res.status(result.status).json(result.body);
}
