import type { Request, Response } from 'express';
import {
  ActivityEventModel,
  ClientModel,
  NotificationModel,
  UserModel,
} from '../models/index.js';
import type { QuoteDoc } from '../models/quote.model.js';
import { asyncHandler, ConflictError } from '../middleware/error.js';
import { recomputeTotals } from '../utils/money.js';
import type { SelectionInput } from '../validation/public.schema.js';

/**
 * Whitelisted projection of a quote for the unauthenticated client surface.
 * Never leaks ownerId or other internal owner data — only what the approval
 * page renders (DBD: public routes expose a whitelisted projection).
 */
async function publicProjection(quote: QuoteDoc) {
  const [owner, client] = await Promise.all([
    UserModel.findById(quote.ownerId).select('brand'),
    ClientModel.findById(quote.clientId).select('name company'),
  ]);

  return {
    id: String(quote._id),
    title: quote.title,
    status: quote.status,
    currency: quote.currency,
    lineItems: quote.lineItems.map((li) => ({
      id: String(li._id),
      label: li.label,
      description: li.description,
      qty: li.qty,
      unitPrice: li.unitPrice,
      taxRate: li.taxRate,
      type: li.type,
      selected: li.selected,
      tierGroup: li.tierGroup,
    })),
    subtotal: quote.subtotal,
    taxTotal: quote.taxTotal,
    total: quote.total,
    depositType: quote.depositType,
    depositValue: quote.depositValue,
    depositAmount: quote.depositAmount,
    balanceAmount: quote.balanceAmount,
    expiresAt: quote.expiresAt,
    sentAt: quote.sentAt,
    viewedAt: quote.viewedAt,
    approvedAt: quote.approvedAt,
    depositPaidAt: quote.depositPaidAt,
    brand: owner?.brand ?? null,
    recipient: client ? { name: client.name, company: client.company } : null,
  };
}

/**
 * GET /api/v1/public/quotes/:token — client opens the hosted quote (UC-C01).
 * On first view: sent → viewed (monotonic, E6), stamps viewedAt, logs activity,
 * and ENQUEUES an owner notification (the email service sends it).
 */
export const viewPublicQuote = asyncHandler(async (req: Request, res: Response) => {
  const quote = req.quote!; // attached by linkToken middleware

  if (quote.status === 'sent') {
    quote.status = 'viewed';
    quote.viewedAt = new Date();
    await quote.save();

    await ActivityEventModel.create({
      quoteId: quote._id,
      type: 'viewed',
      actor: 'client',
      meta: { ip: req.ip, userAgent: req.headers['user-agent'] ?? null },
    });

    // Enqueue owner notification (queued → drained by the email service).
    const owner = await UserModel.findById(quote.ownerId).select('email');
    if (owner?.email) {
      await NotificationModel.create({
        quoteId: quote._id,
        recipientType: 'owner',
        template: 'quote_viewed',
        to: owner.email,
        status: 'queued',
      });
    }
  } else if (quote.status === 'viewed' || quote.status === 'approved' || quote.status === 'deposit_paid') {
    // Re-open: append a view activity event but never regress status (E6).
    await ActivityEventModel.create({
      quoteId: quote._id,
      type: 'viewed',
      actor: 'client',
      meta: { ip: req.ip, reopen: true },
    });
  }

  res.json({ data: await publicProjection(quote) });
});

/**
 * PATCH /api/v1/public/quotes/:token/selection — toggle optional/tiered items
 * (UC-C02). Server recomputes totals + deposit (A4). Locked at approval (E2).
 */
export const updateSelection = asyncHandler(async (req: Request, res: Response) => {
  const quote = req.quote!;
  const { selections } = req.body as SelectionInput;

  if (quote.status === 'approved' || quote.status === 'deposit_paid') {
    throw new ConflictError('Selection is locked — this quote has been approved.', 'SELECTION_LOCKED');
  }

  const byId = new Map(selections.map((s) => [s.lineItemId, s.selected]));

  for (const li of quote.lineItems) {
    const next = byId.get(String(li._id));
    if (next === undefined) continue;
    // Only optional/tiered items are client-toggleable; standard stays selected.
    if (li.type === 'standard') continue;
    li.selected = next;
  }

  const totals = recomputeTotals({
    lineItems: quote.lineItems,
    depositType: quote.depositType,
    depositValue: quote.depositValue,
  });
  quote.set(totals);
  await quote.save();

  await ActivityEventModel.create({
    quoteId: quote._id,
    type: 'selection_changed',
    actor: 'client',
    meta: { total: quote.total, depositAmount: quote.depositAmount },
  });

  res.json({ data: await publicProjection(quote) });
});
