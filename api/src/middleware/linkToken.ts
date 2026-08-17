import type { RequestHandler } from 'express';
import { QuoteModel } from '../models/index.js';
import { asyncHandler, GoneError, NotFoundError } from './error.js';

/**
 * Resolve a quote by its `publicToken` route param (F-03) and attach it as
 * `req.quote` for downstream public-route handlers.
 *
 *  - Unknown / invalid token        → 404 (generic, no enumeration; UC-C01 alt)
 *  - Expired token (`expiresAt` past)→ 410 Gone (E5)
 *
 * Used by the public view/selection routes AND the sign / deposit routes — it
 * is the single trust gate for the unauthenticated client surface.
 */
export const linkToken: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = req.params.token;
  if (!token) {
    next(new NotFoundError('Quote'));
    return;
  }

  const quote = await QuoteModel.findOne({ publicToken: token });
  if (!quote) {
    next(new NotFoundError('Quote'));
    return;
  }

  if (quote.expiresAt && quote.expiresAt.getTime() < Date.now()) {
    next(new GoneError('This link has expired. Please contact the sender.'));
    return;
  }

  req.quote = quote;
  next();
});
