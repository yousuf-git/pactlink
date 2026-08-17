import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { stripeWebhook } from '../controllers/webhooks.controller.js';

/**
 * Webhooks router.
 * Mounted at `/api/v1/webhooks` with `express.raw({type:'application/json'})`
 * already applied (raw body required for Stripe signature verification).
 *
 *   POST /api/v1/webhooks/stripe
 */
const router = Router();

router.post('/stripe', asyncHandler(stripeWebhook));

export default router;
