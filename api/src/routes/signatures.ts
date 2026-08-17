import { Router, type RequestHandler } from 'express';
import { linkToken } from '../middleware/linkToken.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error.js';
import { signQuoteSchema } from '../validation/signature.schema.js';
import { signQuote } from '../controllers/signatures.controller.js';

/**
 * Signatures router. Serves the public sign endpoint:
 *   POST /api/v1/public/quotes/:token/sign   (linkToken → req.quote)
 *
 * Both the full path (mount at `/api/v1`) and the leaf path (mount at
 * `/api/v1/public/quotes/:token`) are registered so the route resolves under
 * either mount prefix.
 */
const router = Router({ mergeParams: true });

const handlers: RequestHandler[] = [linkToken, validate(signQuoteSchema), asyncHandler(signQuote)];

router.post('/public/quotes/:token/sign', ...handlers);
router.post('/sign', ...handlers);

export default router;
