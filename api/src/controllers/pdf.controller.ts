import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Quote, Client, User } from '../models/index.js';
import { generateQuotePdf } from '../services/pdf/index.js';
import { logger } from '../config/logger.js';

/**
 * Owner PDF controller (UC-O03 / F-02 / E3).
 * GET /api/v1/quotes/:id/pdf — owner-scoped (mounted under requireAuth).
 *
 * Always regenerates on demand so the PDF matches the current selection (E3),
 * stores via s3 config (or local), updates `quotes.pdfUrl`, returns the URL.
 */

function ownerIdOf(req: Request): string | undefined {
  return (req as Request & { user?: { sub?: string } }).user?.sub;
}

function err(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { message, code } });
}

interface QuoteShape {
  _id: unknown;
  ownerId: unknown;
  clientId: unknown;
  title: string;
  currency: string;
  lineItems: unknown[];
  subtotal: number;
  taxTotal: number;
  total: number;
  depositAmount: number;
  balanceAmount: number;
  pdfUrl?: string | null;
  save: () => Promise<unknown>;
}

export async function getQuotePdf(req: Request, res: Response): Promise<void> {
  const ownerId = ownerIdOf(req);
  if (!ownerId) {
    err(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }
  const id = req.params.id;
  if (!id || !Types.ObjectId.isValid(id)) {
    err(res, 400, 'INVALID_ID', 'Invalid quote id');
    return;
  }

  const quote = (await Quote.findOne({
    _id: new Types.ObjectId(id),
    ownerId: new Types.ObjectId(ownerId),
  }).exec()) as unknown as QuoteShape | null;

  if (!quote) {
    err(res, 404, 'NOT_FOUND', 'Quote not found');
    return;
  }

  const [owner, client] = await Promise.all([
    User.findById(quote.ownerId).lean().exec() as Promise<{
      brand?: { businessName?: string; logoUrl?: string | null; primaryColor?: string };
    } | null>,
    Client.findById(quote.clientId).lean().exec() as Promise<{ name?: string } | null>,
  ]);

  try {
    const result = await generateQuotePdf({
      quoteId: quote._id,
      title: quote.title,
      currency: quote.currency,
      lineItems: quote.lineItems as Parameters<typeof generateQuotePdf>[0]['lineItems'],
      subtotal: quote.subtotal,
      taxTotal: quote.taxTotal,
      total: quote.total,
      depositAmount: quote.depositAmount,
      balanceAmount: quote.balanceAmount,
      brand: owner?.brand,
      clientName: client?.name,
    });

    quote.pdfUrl = result.url;
    await quote.save();

    res.status(200).json({
      data: { url: result.url, key: result.key, contentType: result.contentType, fallback: result.fallback },
    });
  } catch (e) {
    logger.error('PDF generation failed', { err: e instanceof Error ? e.message : String(e), quoteId: id });
    err(res, 500, 'PDF_FAILED', 'Could not generate the PDF');
  }
}
