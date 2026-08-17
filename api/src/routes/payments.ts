import { Router, type RequestHandler } from 'express';
import { linkToken } from '../middleware/linkToken.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error.js';
import { depositIntentSchema } from '../validation/deposit.schema.js';
import { createDeposit, listPayments } from '../controllers/payments.controller.js';

/**
 * Payments router. Serves:
 *   POST /api/v1/public/quotes/:token/deposit-intent  (public, linkToken)
 *   GET  /api/v1/payments                              (owner, requireAuth)
 *
 * Full + leaf paths are declared so the router is mount-prefix agnostic.
 */
const router = Router({ mergeParams: true });

const depositHandlers: RequestHandler[] = [
  linkToken,
  validate(depositIntentSchema),
  asyncHandler(createDeposit),
];

router.post('/public/quotes/:token/deposit-intent', ...depositHandlers);
router.post('/deposit-intent', ...depositHandlers);

router.get('/payments', requireAuth, asyncHandler(listPayments));
router.get('/', requireAuth, asyncHandler(listPayments));

export default router;
