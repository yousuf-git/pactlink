import type { Request, Response } from 'express';
import { Signature, ActivityEvent, Notification, User, Client } from '../models/index.js';
import { recordSignature } from '../services/esign/index.js';
import { recomputeTotals, tierGroupsMissingSelection } from '../utils/money.js';
import { dispatchQueuedNotifications } from '../services/email/index.js';
import { logger } from '../config/logger.js';

/**
 * Public e-sign controller (UC-C03 / F-04 / F-07).
 * POST /api/v1/public/quotes/:token/sign — gated by `linkToken` (sets req.quote).
 *
 * Responds with the standard envelope `{ error: { message, code, fields? } }` on
 * failure and `{ data }` on success. Status values are the DBD string literals.
 */

interface LineItemShape {
  type?: string;
  selected?: boolean;
  tierGroup?: string | null;
  qty: number;
  unitPrice: number;
  taxRate: number;
}

interface QuoteShape {
  _id: unknown;
  ownerId: unknown;
  clientId: unknown;
  status: string;
  lineItems: LineItemShape[];
  depositType: 'fixed' | 'percent';
  depositValue: number;
  subtotal: number;
  taxTotal: number;
  total: number;
  depositAmount: number;
  balanceAmount: number;
  approvedAt?: Date | null;
  currency: string;
  save: () => Promise<unknown>;
}

function err(res: Response, status: number, code: string, message: string, fields?: unknown): void {
  res.status(status).json({ error: { message, code, ...(fields ? { fields } : {}) } });
}

export async function signQuote(req: Request, res: Response): Promise<void> {
  const quote = (req as Request & { quote?: QuoteShape }).quote;
  if (!quote) {
    err(res, 404, 'NOT_FOUND', 'Quote not found');
    return;
  }

  // Idempotent: if already approved (or beyond), return the existing signature
  // and do NOT create a second record (UC-C03 alt path).
  if (quote.status === 'approved' || quote.status === 'deposit_paid') {
    const existing = (await Signature.findOne({ quoteId: quote._id }).lean().exec()) as
      | { _id: unknown; signedAt?: Date }
      | null;
    res.status(200).json({
      data: {
        quoteId: String(quote._id),
        status: quote.status,
        signature: existing ? { id: String(existing._id), signedAt: existing.signedAt } : null,
        idempotent: true,
      },
    });
    return;
  }

  // Must be in `viewed` to sign (status is monotonic; signing advances to approved).
  if (quote.status !== 'viewed') {
    err(res, 409, 'INVALID_STATE', `Cannot sign a quote in status "${quote.status}"`);
    return;
  }

  // E12: every tiered group must have a selection before signing.
  const unselected = tierGroupsMissingSelection(quote.lineItems);
  if (unselected.length > 0) {
    err(res, 422, 'TIER_SELECTION_REQUIRED', 'Choose one option for each tiered group', {
      tierGroups: unselected,
    });
    return;
  }

  const body = req.body as { signerName: string; method: 'typed' | 'drawn'; signatureData: string };
  const fwd = req.headers['x-forwarded-for'];
  const ip =
    (typeof fwd === 'string' ? fwd.split(',')[0]?.trim() : undefined) ??
    req.ip ??
    req.socket.remoteAddress ??
    'unknown';
  const ua = req.headers['user-agent'];
  const userAgent = typeof ua === 'string' ? ua : null;

  // Snapshot authoritative totals on the persisted selection (never trust client).
  try {
    const totals = recomputeTotals({
      lineItems: quote.lineItems,
      depositType: quote.depositType,
      depositValue: quote.depositValue,
    });
    quote.subtotal = totals.subtotal;
    quote.taxTotal = totals.taxTotal;
    quote.total = totals.total;
    quote.depositAmount = totals.depositAmount;
    quote.balanceAmount = totals.balanceAmount;
  } catch (e) {
    logger.warn('recomputeTotals failed on sign — proceeding with stored totals', {
      err: e instanceof Error ? e.message : String(e),
    });
  }

  // Persist the signature (evidence: timestamp + IP + UA).
  const signature = await recordSignature({
    quoteId: quote._id,
    signerName: body.signerName,
    method: body.method,
    signatureData: body.signatureData,
    ip,
    userAgent,
  });

  // Advance viewed → approved, set approvedAt (lock selection).
  quote.status = 'approved';
  quote.approvedAt = new Date();
  await quote.save();

  // Activity: signed + approved (stops time-to-approval clock).
  await ActivityEvent.create([
    { quoteId: quote._id, type: 'signed', actor: 'client', meta: { ip, method: body.method } },
    { quoteId: quote._id, type: 'approved', actor: 'client', meta: {} },
  ]);

  // Enqueue owner + client notifications (quote_approved), then best-effort send.
  await enqueueApprovalNotifications(quote);
  await dispatchQueuedNotifications().catch((e) =>
    logger.warn('notification dispatch failed', { err: e instanceof Error ? e.message : String(e) }),
  );

  res.status(201).json({
    data: {
      quoteId: String(quote._id),
      status: quote.status,
      approvedAt: quote.approvedAt,
      signature: { id: String(signature._id) },
    },
  });
}

async function enqueueApprovalNotifications(quote: QuoteShape): Promise<void> {
  const [owner, client] = await Promise.all([
    User.findById(quote.ownerId).lean().exec() as Promise<{ email?: string } | null>,
    Client.findById(quote.clientId).lean().exec() as Promise<{ email?: string } | null>,
  ]);

  const targets: Array<{ recipientType: 'owner' | 'client'; to?: string }> = [
    { recipientType: 'owner', to: owner?.email },
    { recipientType: 'client', to: client?.email },
  ];
  for (const t of targets) {
    if (!t.to) continue;
    const exists = await Notification.findOne({
      quoteId: quote._id,
      recipientType: t.recipientType,
      template: 'quote_approved',
    }).exec();
    if (exists) continue;
    await Notification.create({
      quoteId: quote._id,
      channel: 'email',
      recipientType: t.recipientType,
      template: 'quote_approved',
      to: t.to,
      status: 'queued',
    });
  }
}
