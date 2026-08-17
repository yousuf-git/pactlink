import { Router } from 'express';
import { updateSelection, viewPublicQuote } from '../controllers/public.controller.js';
import { linkToken } from '../middleware/linkToken.js';
import { validate } from '../middleware/validate.js';
import { selectionSchema } from '../validation/public.schema.js';

/**
 * Public (unauthenticated) client surface — gated only by the link token.
 *
 * This router serves:
 *   GET   /:token            → view quote (sent → viewed transition)
 *   PATCH /:token/selection  → toggle optional/tiered items (server recompute)
 *
 * The sign and deposit-intent routers mount on the SAME base path
 * (/api/v1/public/quotes) — see app.ts.
 */
const router = Router();

router.get('/:token', linkToken, viewPublicQuote);
router.patch('/:token/selection', linkToken, validate(selectionSchema), updateSelection);

export default router;
