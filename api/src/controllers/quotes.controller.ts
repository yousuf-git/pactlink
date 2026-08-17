import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  ActivityEventModel,
  ClientModel,
  NotificationModel,
  QuoteModel,
  UserModel,
} from '../models/index.js';
import { asyncHandler, ConflictError, NotFoundError } from '../middleware/error.js';
import { recomputeTotals } from '../utils/money.js';
import { generatePublicToken } from '../utils/token.js';
import type { CreateQuoteInput, UpdateQuoteInput, LineItemInput } from '../validation/quote.schema.js';

function oid(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

/** Normalize a validated line-item input into the embedded-doc shape. */
function toLineItems(items: LineItemInput[]) {
  return items.map((i) => ({
    label: i.label,
    description: i.description ?? null,
    qty: i.qty,
    unitPrice: i.unitPrice,
    taxRate: i.taxRate ?? 0,
    type: i.type ?? 'standard',
    selected: i.selected ?? true,
    tierGroup: i.tierGroup ?? null,
  }));
}

/** GET /api/v1/quotes — owner pipeline list, optional ?status= filter. */
export const listQuotes = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = oid(req.user!.sub);
  const filter: Record<string, unknown> = { ownerId };
  const status = req.query.status;
  if (typeof status === 'string' && status) filter.status = status;

  const quotes = await QuoteModel.find(filter)
    .sort({ createdAt: -1 })
    .populate('clientId', 'name email company');
  res.json({ data: quotes });
});

/** GET /api/v1/quotes/:id */
export const getQuote = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = oid(req.user!.sub);
  const quote = await QuoteModel.findOne({ _id: req.params.id, ownerId }).populate(
    'clientId',
    'name email company phone',
  );
  if (!quote) throw new NotFoundError('Quote');
  res.json({ data: quote });
});

/** POST /api/v1/quotes — create a draft quote with server-computed totals. */
export const createQuote = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = oid(req.user!.sub);
  const body = req.body as CreateQuoteInput;

  const [owner, client] = await Promise.all([
    UserModel.findById(ownerId),
    ClientModel.findOne({ _id: body.clientId, ownerId }),
  ]);
  if (!owner) throw new NotFoundError('Owner');
  if (!client) throw new NotFoundError('Client');

  const depositType = body.depositType ?? owner.defaultDepositType;
  const depositValue = body.depositValue ?? owner.defaultDepositValue;
  const currency = body.currency ?? owner.defaultCurrency;
  const lineItems = toLineItems(body.lineItems);

  const totals = recomputeTotals({ lineItems, depositType, depositValue });

  const quote = await QuoteModel.create({
    ownerId,
    clientId: client._id,
    title: body.title,
    status: 'draft',
    currency,
    lineItems,
    depositType,
    depositValue,
    ...totals,
    publicToken: generatePublicToken(),
    expiresAt: body.expiresAt ?? null,
  });

  await ActivityEventModel.create({ quoteId: quote._id, type: 'created', actor: 'owner' });

  res.status(201).json({ data: quote });
});

/**
 * PATCH /api/v1/quotes/:id — edit a quote (draft/sent only) and recompute totals.
 * Editing is blocked once status >= approved (E10).
 */
export const updateQuote = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = oid(req.user!.sub);
  const body = req.body as UpdateQuoteInput;

  const quote = await QuoteModel.findOne({ _id: req.params.id, ownerId });
  if (!quote) throw new NotFoundError('Quote');

  if (quote.status === 'approved' || quote.status === 'deposit_paid') {
    throw new ConflictError('This quote is locked and can no longer be edited.', 'QUOTE_LOCKED');
  }

  if (body.clientId) {
    const client = await ClientModel.findOne({ _id: body.clientId, ownerId });
    if (!client) throw new NotFoundError('Client');
    quote.clientId = client._id;
  }
  if (body.title !== undefined) quote.title = body.title;
  if (body.currency !== undefined) quote.currency = body.currency;
  if (body.lineItems !== undefined) quote.lineItems = toLineItems(body.lineItems) as never;
  if (body.depositType !== undefined) quote.depositType = body.depositType;
  if (body.depositValue !== undefined) quote.depositValue = body.depositValue;
  if (body.expiresAt !== undefined) quote.expiresAt = body.expiresAt ?? null;

  const totals = recomputeTotals({
    lineItems: quote.lineItems,
    depositType: quote.depositType,
    depositValue: quote.depositValue,
  });
  quote.set(totals);

  await quote.save();
  res.json({ data: quote });
});

/** DELETE /api/v1/quotes/:id — only draft quotes may be deleted. */
export const deleteQuote = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = oid(req.user!.sub);
  const quote = await QuoteModel.findOne({ _id: req.params.id, ownerId });
  if (!quote) throw new NotFoundError('Quote');
  if (quote.status !== 'draft') {
    throw new ConflictError('Only draft quotes can be deleted.', 'QUOTE_NOT_DRAFT');
  }
  await quote.deleteOne();
  res.status(204).send();
});

/**
 * POST /api/v1/quotes/:id/send — transition draft → sent (F-07, UC-O04).
 * Mints/keeps the public token, stamps sentAt (time-to-approval clock),
 * logs an activity event, and ENQUEUES a client notification (the email
 * service drains the queue — we never send mail here).
 */
export const sendQuote = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = oid(req.user!.sub);
  const quote = await QuoteModel.findOne({ _id: req.params.id, ownerId }).populate(
    'clientId',
    'name email',
  );
  if (!quote) throw new NotFoundError('Quote');

  if (quote.status === 'draft') {
    quote.status = 'sent';
    quote.sentAt = new Date();
    if (!quote.publicToken) quote.publicToken = generatePublicToken();
    await quote.save();

    await ActivityEventModel.create({ quoteId: quote._id, type: 'sent', actor: 'owner' });

    const client = quote.clientId as unknown as { email?: string } | null;
    if (client?.email) {
      await NotificationModel.create({
        quoteId: quote._id,
        recipientType: 'client',
        template: 'quote_sent',
        to: client.email,
        status: 'queued',
      });
    }
  }
  // Re-send on an already-sent (or later) quote reuses the token, no regression.

  res.json({ data: quote });
});

/** GET /api/v1/quotes/:id/activity — chronological timeline for a quote. */
export const getQuoteActivity = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = oid(req.user!.sub);
  const quote = await QuoteModel.findOne({ _id: req.params.id, ownerId }).select('_id');
  if (!quote) throw new NotFoundError('Quote');
  const events = await ActivityEventModel.find({ quoteId: quote._id }).sort({ createdAt: 1 });
  res.json({ data: events });
});
