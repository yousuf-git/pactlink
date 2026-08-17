import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Payment, Signature, Quote } from '../models/index.js';
import { createDepositIntent } from '../services/stripe/index.js';
import { isStripeConfigured } from '../config/stripe.js';
import { logger } from '../config/logger.js';

/**
 * Payments controller.
 *  - Public: POST /api/v1/public/quotes/:token/deposit-intent (UC-C04 / F-05).
 *  - Owner : GET  /api/v1/payments (owner reads).
 *
 * The deposit-intent route REFUSES without a signature (E4 → 409) and never
 * advances the quote — the webhook is authoritative. Status values are the DBD
 * string literals.
 */

interface QuoteShape {
  _id: unknown;
  ownerId: unknown;
  clientId: unknown;
  title: string;
  status: string;
  currency: string;
  depositAmount: number;
  balanceAmount: number;
}

interface PaymentShape {
  stripePaymentIntentId?: string | null;
  status?: string;
  amount?: number;
  save: () => Promise<unknown>;
}

function err(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { message, code } });
}

export async function createDeposit(req: Request, res: Response): Promise<void> {
  const quote = (req as Request & { quote?: QuoteShape }).quote;
  if (!quote) {
    err(res, 404, 'NOT_FOUND', 'Quote not found');
    return;
  }

  // Signature gates the charge (E4): no signature → 409.
  const signature = await Signature.findOne({ quoteId: quote._id }).lean().exec();
  if (!signature) {
    err(res, 409, 'SIGNATURE_REQUIRED', 'Sign the quote before paying the deposit');
    return;
  }

  if (quote.status === 'deposit_paid') {
    err(res, 409, 'ALREADY_PAID', 'Deposit already paid for this quote');
    return;
  }
  if (quote.status !== 'approved') {
    err(res, 409, 'INVALID_STATE', `Cannot create a deposit intent in status "${quote.status}"`);
    return;
  }

  if (quote.depositAmount <= 0) {
    err(res, 422, 'NO_DEPOSIT_DUE', 'This quote has no deposit due');
    return;
  }

  if (!isStripeConfigured()) {
    err(res, 503, 'STRIPE_NOT_CONFIGURED', 'Payments are not configured');
    return;
  }

  // Idempotent: one deposit payment per quote. Reuse the existing record/intent.
  const idempotencyKey = `deposit:${String(quote._id)}`;
  let payment = (await Payment.findOne({
    quoteId: quote._id,
    type: 'deposit',
  }).exec()) as unknown as PaymentShape | null;

  let clientSecret: string | null = null;
  try {
    const intent = await createDepositIntent(quote, { idempotencyKey });
    clientSecret = intent.client_secret ?? null;

    if (payment) {
      payment.stripePaymentIntentId = intent.id;
      if (payment.status === 'failed') payment.status = 'pending';
      await payment.save();
    } else {
      payment = (await Payment.create({
        quoteId: quote._id,
        type: 'deposit',
        stripePaymentIntentId: intent.id,
        amount: quote.depositAmount,
        currency: quote.currency,
        status: 'pending',
        idempotencyKey,
      })) as unknown as PaymentShape;
    }
  } catch (e) {
    logger.error('Failed to create deposit intent', {
      err: e instanceof Error ? e.message : String(e),
      quoteId: String(quote._id),
    });
    err(res, 502, 'STRIPE_ERROR', 'Could not create the deposit payment');
    return;
  }

  res.status(201).json({
    data: {
      clientSecret,
      amount: quote.depositAmount,
      currency: quote.currency,
      // Authoritative confirmation comes via webhook — client result is advisory.
      status: 'pending',
    },
  });
}

/**
 * Owner: list payments scoped to the owner's quotes.
 * GET /api/v1/payments?quoteId=&status=
 */
export async function listPayments(req: Request, res: Response): Promise<void> {
  const ownerId = (req as Request & { user?: { sub?: string } }).user?.sub;
  if (!ownerId) {
    err(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  const ownerQuotes = (await Quote.find({ ownerId: new Types.ObjectId(ownerId) })
    .select('_id')
    .lean()
    .exec()) as Array<{ _id: Types.ObjectId }>;
  const quoteIds = ownerQuotes.map((q) => q._id);

  const filter: Record<string, unknown> = { quoteId: { $in: quoteIds } };
  if (typeof req.query.quoteId === 'string' && Types.ObjectId.isValid(req.query.quoteId)) {
    filter.quoteId = new Types.ObjectId(req.query.quoteId);
  }
  if (typeof req.query.status === 'string') {
    filter.status = req.query.status;
  }

  const payments = await Payment.find(filter).sort({ createdAt: -1 }).limit(200).lean().exec();
  res.status(200).json({ data: payments });
}
