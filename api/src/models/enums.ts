/**
 * Canonical enums / constants from the DBD "Enums / Constants" table.
 *
 * Each enum is declared `as const` so it doubles as a TS literal-union type
 * and a runtime `[...]` array usable directly in Mongoose `enum:` validators.
 */

// ── Quote pipeline (F-07) ─────────────────────────────────────────
export const QuoteStatus = ['draft', 'sent', 'viewed', 'approved', 'deposit_paid'] as const;
export type QuoteStatus = (typeof QuoteStatus)[number];

/** Monotonic ordering of pipeline stages — used to forbid status regression (E6). */
export const QUOTE_STATUS_ORDER: Record<QuoteStatus, number> = {
  draft: 0,
  sent: 1,
  viewed: 2,
  approved: 3,
  deposit_paid: 4,
};

// ── Users ─────────────────────────────────────────────────────────
export const UserRole = ['owner', 'demo'] as const;
export type UserRole = (typeof UserRole)[number];

// ── Deposit config (F-05) ─────────────────────────────────────────
export const DepositType = ['fixed', 'percent'] as const;
export type DepositType = (typeof DepositType)[number];

// ── Line items (F-01) ─────────────────────────────────────────────
export const LineItemType = ['standard', 'optional', 'tiered'] as const;
export type LineItemType = (typeof LineItemType)[number];

// ── Signatures (F-04) ─────────────────────────────────────────────
export const SignatureMethod = ['typed', 'drawn'] as const;
export type SignatureMethod = (typeof SignatureMethod)[number];

export const SignatureProvider = ['internal', 'docuseal', 'documenso'] as const;
export type SignatureProvider = (typeof SignatureProvider)[number];

// ── Payments (F-05) ───────────────────────────────────────────────
export const PaymentKind = ['deposit', 'balance'] as const;
export type PaymentKind = (typeof PaymentKind)[number];

export const PaymentStatus = ['pending', 'succeeded', 'failed'] as const;
export type PaymentStatus = (typeof PaymentStatus)[number];

// ── Invoices (F-06) ───────────────────────────────────────────────
export const InvoiceKind = ['balance'] as const;
export type InvoiceKind = (typeof InvoiceKind)[number];

export const InvoiceStatus = ['draft', 'sent', 'paid'] as const;
export type InvoiceStatus = (typeof InvoiceStatus)[number];

// ── Webhook events (F-11) ─────────────────────────────────────────
export const WebhookProvider = ['stripe', 'docuseal', 'documenso'] as const;
export type WebhookProvider = (typeof WebhookProvider)[number];

// ── Notifications (F-08) ──────────────────────────────────────────
export const NotificationChannel = ['email'] as const;
export type NotificationChannel = (typeof NotificationChannel)[number];

export const RecipientType = ['owner', 'client'] as const;
export type RecipientType = (typeof RecipientType)[number];

export const NotificationStatus = ['queued', 'sent', 'failed'] as const;
export type NotificationStatus = (typeof NotificationStatus)[number];

export const NotificationTemplate = [
  'quote_sent',
  'quote_viewed',
  'quote_approved',
  'deposit_paid',
  'balance_invoice',
  'payment_failed',
] as const;
export type NotificationTemplate = (typeof NotificationTemplate)[number];

// ── Activity timeline (F-07 / F-10) ───────────────────────────────
export const ActivityType = [
  'created',
  'sent',
  'viewed',
  'selection_changed',
  'signed',
  'approved',
  'deposit_paid',
  'payment_failed',
] as const;
export type ActivityType = (typeof ActivityType)[number];

export const ActorType = ['owner', 'client', 'system'] as const;
export type ActorType = (typeof ActorType)[number];

// ── Currency (ISO-4217 subset used by the app) ────────────────────
export const Currency = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const;
export type Currency = (typeof Currency)[number];
