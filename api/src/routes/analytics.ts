import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { funnel, webhookEvents } from '../controllers/analytics.controller.js';

/**
 * Analytics router. Mounted at `/api/v1/analytics` (owner, requireAuth).
 *
 *   GET /api/v1/analytics/funnel          (F-10)
 *   GET /api/v1/analytics/webhook-events  (F-11)
 */
const router = Router();

router.get('/funnel', requireAuth, asyncHandler(funnel));
router.get('/webhook-events', requireAuth, asyncHandler(webhookEvents));

export default router;
