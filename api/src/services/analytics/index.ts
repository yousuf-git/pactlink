import { Types } from 'mongoose';
import { Quote, WebhookEvent } from '../../models/index.js';

/**
 * Analytics service (F-10 / F-11).
 *
 * Funnel: viewed → approved → deposit_paid counts + conversion %, plus median
 * time-to-approval (approvedAt − sentAt). All scoped to one owner via the
 * `quotes.ownerId` field. Webhook-events: scoped to the owner's quotes with a
 * redacted payload projection.
 */

export interface FunnelResult {
  counts: {
    sent: number;
    viewed: number;
    approved: number;
    deposit_paid: number;
  };
  conversion: {
    /** viewed / sent */
    sentToViewed: number;
    /** approved / viewed */
    viewedToApproved: number;
    /** deposit_paid / approved */
    approvedToDepositPaid: number;
    /** deposit_paid / sent (overall) */
    overall: number;
  };
  /** Median time-to-approval in milliseconds (approvedAt − sentAt). */
  medianTimeToApprovalMs: number | null;
}

function toId(ownerId: string | Types.ObjectId): Types.ObjectId {
  return typeof ownerId === 'string' ? new Types.ObjectId(ownerId) : ownerId;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10; // one decimal place
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2);
  }
  return sorted[mid] as number;
}

/**
 * Compute the conversion funnel + median time-to-approval for one owner.
 *
 * A quote "reached" a stage if its status is at or beyond it (status is
 * monotonic, F-07/E6) OR the corresponding stage timestamp is set. We count by
 * the stage timestamps to be robust: sentAt, viewedAt, approvedAt, depositPaidAt.
 */
export async function getFunnel(ownerId: string | Types.ObjectId): Promise<FunnelResult> {
  const owner = toId(ownerId);

  const [agg] = (await Quote.aggregate([
    { $match: { ownerId: owner } },
    {
      $group: {
        _id: null,
        sent: { $sum: { $cond: [{ $ne: ['$sentAt', null] }, 1, 0] } },
        viewed: { $sum: { $cond: [{ $ne: ['$viewedAt', null] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $ne: ['$approvedAt', null] }, 1, 0] } },
        deposit_paid: { $sum: { $cond: [{ $ne: ['$depositPaidAt', null] }, 1, 0] } },
        // collect time-to-approval samples (ms) where both timestamps exist
        ttas: {
          $push: {
            $cond: [
              { $and: [{ $ne: ['$sentAt', null] }, { $ne: ['$approvedAt', null] }] },
              { $subtract: ['$approvedAt', '$sentAt'] },
              '$$REMOVE',
            ],
          },
        },
      },
    },
  ]).exec()) as Array<{
    sent: number;
    viewed: number;
    approved: number;
    deposit_paid: number;
    ttas: number[];
  }>;

  const counts = {
    sent: agg?.sent ?? 0,
    viewed: agg?.viewed ?? 0,
    approved: agg?.approved ?? 0,
    deposit_paid: agg?.deposit_paid ?? 0,
  };

  return {
    counts,
    conversion: {
      sentToViewed: pct(counts.viewed, counts.sent),
      viewedToApproved: pct(counts.approved, counts.viewed),
      approvedToDepositPaid: pct(counts.deposit_paid, counts.approved),
      overall: pct(counts.deposit_paid, counts.sent),
    },
    medianTimeToApprovalMs: median(agg?.ttas ?? []),
  };
}

export interface WebhookEventRow {
  id: string;
  provider: string;
  eventId: string;
  type: string;
  processed: boolean;
  processedAt: Date | null;
  error: string | null;
  receivedAt: Date;
  /** Redacted: only a couple of safe summary keys, never the raw payload. */
  summary: { object?: string; amount?: number; currency?: string };
}

/**
 * Owner-facing webhook event log (F-11), scoped to the owner's quotes.
 *
 * We correlate events to the owner by extracting `metadata.quoteId` from the
 * Stripe payload and matching it against the owner's quote ids. Payload is
 * redacted to a small safe summary.
 */
export async function getWebhookEvents(
  ownerId: string | Types.ObjectId,
  opts: { limit?: number } = {},
): Promise<WebhookEventRow[]> {
  const owner = toId(ownerId);
  const limit = opts.limit ?? 100;

  // Owner's quote ids (as strings, since payload metadata stores them as strings).
  const ownerQuotes = (await Quote.find({ ownerId: owner }).select('_id').lean().exec()) as Array<{
    _id: Types.ObjectId;
  }>;
  const ownerQuoteIds = new Set(ownerQuotes.map((q) => String(q._id)));

  const events = (await WebhookEvent.find({})
    .sort({ createdAt: -1 })
    .limit(limit * 3) // over-fetch then filter by ownership
    .lean()
    .exec()) as Array<{
    _id: Types.ObjectId;
    provider: string;
    eventId: string;
    type: string;
    processed: boolean;
    processedAt?: Date | null;
    error?: string | null;
    receivedAt?: Date;
    createdAt: Date;
    payload?: Record<string, unknown>;
  }>;

  const rows: WebhookEventRow[] = [];
  for (const ev of events) {
    const obj = extractStripeObject(ev.payload);
    const quoteId = obj?.metadata?.quoteId as string | undefined;
    // Only surface events correlated to this owner's quotes.
    if (quoteId && !ownerQuoteIds.has(quoteId)) continue;
    if (!quoteId) continue;

    rows.push({
      id: String(ev._id),
      provider: ev.provider,
      eventId: ev.eventId,
      type: ev.type,
      processed: ev.processed,
      processedAt: ev.processedAt ?? null,
      error: ev.error ?? null,
      receivedAt: ev.receivedAt ?? ev.createdAt,
      summary: {
        object: obj?.object as string | undefined,
        amount: obj?.amount as number | undefined,
        currency: obj?.currency as string | undefined,
      },
    });
    if (rows.length >= limit) break;
  }
  return rows;
}

interface StripeObject {
  object?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

function extractStripeObject(payload: Record<string, unknown> | undefined): StripeObject | null {
  if (!payload) return null;
  const data = payload.data as { object?: StripeObject } | undefined;
  return data?.object ?? null;
}
