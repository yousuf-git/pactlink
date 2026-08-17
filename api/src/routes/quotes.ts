import { Router } from 'express';
import {
  createQuote,
  deleteQuote,
  getQuote,
  getQuoteActivity,
  listQuotes,
  sendQuote,
  updateQuote,
} from '../controllers/quotes.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createQuoteSchema, updateQuoteSchema } from '../validation/quote.schema.js';

const router = Router();

router.use(requireAuth); // all owner quote routes require auth

router.get('/', listQuotes);
router.post('/', validate(createQuoteSchema), createQuote);
router.get('/:id', getQuote);
router.patch('/:id', validate(updateQuoteSchema), updateQuote);
router.delete('/:id', deleteQuote);
router.post('/:id/send', sendQuote);
router.get('/:id/activity', getQuoteActivity);

export default router;
