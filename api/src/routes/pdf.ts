import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { getQuotePdf } from '../controllers/pdf.controller.js';

/**
 * PDF router. Mounted at `/api/v1/quotes` (owner, requireAuth).
 *
 *   GET /api/v1/quotes/:id/pdf   (F-02)
 */
const router = Router();

router.get('/:id/pdf', requireAuth, asyncHandler(getQuotePdf));

export default router;
