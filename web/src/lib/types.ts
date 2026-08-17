// Domain types mirroring DBD.md collections. Money is stored as integer
// minor units (cents) everywhere to avoid float drift, exactly as the backend.

export type QuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "approved"
  | "deposit_paid"
  | "paid_in_full";

export type UserRole = "owner" | "demo" | "admin";
export type DepositType = "fixed" | "percent";
export type LineItemType = "standard" | "optional" | "tiered";
export type SignatureMethod = "typed" | "drawn";
export type SignatureProvider = "internal" | "docuseal" | "documenso";
export type PaymentKind = "deposit" | "balance";
export type PaymentStatus = "pending" | "succeeded" | "failed";
export type InvoiceKind = "balance";
export type InvoiceStatus = "draft" | "sent" | "paid";
export type WebhookProvider = "stripe" | "docuseal" | "documenso";
export type RecipientType = "owner" | "client";
export type NotificationStatus = "queued" | "sent" | "failed";
export type NotificationTemplate =
  | "quote_sent"
  | "quote_viewed"
  | "quote_approved"
  | "deposit_paid"
  | "balance_invoice"
  | "payment_failed";
export type ActivityType =
  | "created"
  | "sent"
  | "viewed"
  | "selection_changed"
  | "signed"
  | "approved"
  | "deposit_paid"
  | "payment_failed";
export type ActorType = "owner" | "client" | "system";

export interface Brand {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  brand: Brand;
  defaultCurrency: string;
  defaultDepositType: DepositType;
  defaultDepositValue: number;
  stripeAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  _id: string;
  ownerId: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  _id: string;
  label: string;
  description: string | null;
  qty: number;
  unitPrice: number; // minor units
  taxRate: number; // percent e.g. 8.25
  type: LineItemType;
  selected: boolean;
  tierGroup: string | null;
}

export interface Quote {
  _id: string;
  ownerId: string;
  clientId: string;
  title: string;
  status: QuoteStatus;
  currency: string;
  lineItems: LineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  depositType: DepositType;
  depositValue: number;
  depositAmount: number;
  balanceAmount: number;
  // Partial payments: amountPaid is the sum of succeeded payments (deposit +
  // any balance installments). remaining = max(0, total - amountPaid). A quote
  // is paid_in_full when amountPaid >= total. (Derivable from the Payment
  // collection server-side; stored here for convenience.)
  amountPaid: number;
  publicToken: string;
  expiresAt: string | null;
  pdfUrl: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  approvedAt: string | null;
  depositPaidAt: string | null;
  paidInFullAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Signature {
  _id: string;
  quoteId: string;
  signerName: string;
  method: SignatureMethod;
  signatureData: string;
  provider: SignatureProvider;
  providerEnvelopeId: string | null;
  ipAddress: string;
  userAgent: string | null;
  signedAt: string;
  createdAt: string;
}

export interface Payment {
  _id: string;
  quoteId: string;
  type: PaymentKind;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey: string;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  _id: string;
  quoteId: string;
  type: InvoiceKind;
  number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  stripeInvoiceId: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  _id: string;
  provider: WebhookProvider;
  eventId: string;
  type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processedAt: string | null;
  error: string | null;
  deduped?: boolean; // UI-only flag: idempotent skip
  quoteId?: string | null;
  receivedAt: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  quoteId: string;
  channel: "email";
  recipientType: RecipientType;
  template: NotificationTemplate;
  to: string;
  status: NotificationStatus;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  _id: string;
  quoteId: string;
  type: ActivityType;
  actor: ActorType;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

// Public (client-facing) projection of a quote — what the unauthenticated
// approval page receives. No ownerId, no internal references.
export interface PublicQuote {
  _id: string;
  title: string;
  status: QuoteStatus;
  currency: string;
  businessName: string;
  brandPrimaryColor: string;
  logoUrl: string | null;
  clientName: string;
  lineItems: LineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  depositType: DepositType;
  depositValue: number;
  depositAmount: number;
  balanceAmount: number;
  amountPaid: number;
  remaining: number;
  // A pending payment the owner has requested (deposit or a balance
  // installment) that the client can pay now. null when nothing is due.
  amountDue: number;
  expiresAt: string | null;
  signed: boolean;
  paid: boolean;
  paidInFull: boolean;
}

export interface FunnelData {
  sent: number;
  viewed: number;
  approved: number;
  depositPaid: number;
  viewToApprovePct: number;
  approveToDepositPct: number;
  sentToDepositPct: number;
  medianTimeToApprovalHours: number;
}

// ── Platform-admin aggregation views ───────────────────────────────────────
// These are computed/joined server-side from the existing collections (users,
// clients, quotes, payments, webhookEvents, activityEvents). The dummy data
// mirrors these exact shapes so the real backend can return them unchanged
// (via /admin/* endpoints + aggregation). plan/status/mrr come from a billing
// source; everything else is derivable from the schema above.

export type PlatformPlan = "trial" | "starter" | "growth" | "scale";
export type AccountStatus = "active" | "trial" | "suspended" | "churned";

export interface PlatformUser {
  _id: string;
  name: string;
  email: string;
  businessName: string;
  plan: PlatformPlan;
  status: AccountStatus;
  clientCount: number;
  quoteCount: number;
  depositVolume: number; // minor units — lifetime deposits paid
  mrr: number; // minor units — billing
  conversionPct: number; // sent → deposit_paid for this tenant
  createdAt: string; // signup
  lastActiveAt: string;
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  totalClients: number;
  totalQuotes: number;
  depositPaidCount: number;
  depositVolume: number; // minor
  mrr: number; // minor
  platformConversionPct: number;
  medianTimeToApprovalHours: number;
}

export interface GrowthPoint {
  period: string; // "Jul" / "2025-07"
  newUsers: number;
  totalUsers: number; // cumulative
  revenue: number; // minor — deposits in that period
  quotes: number;
}

export interface AdminFunnel {
  sent: number;
  viewed: number;
  approved: number;
  depositPaid: number;
  sentToViewedPct: number;
  viewedToApprovedPct: number;
  approvedToDepositPct: number;
  sentToDepositPct: number;
}

export interface PlanBreakdown {
  plan: PlatformPlan;
  users: number;
  mrr: number; // minor
}

export type AuditSeverity = "info" | "warning" | "error";
export type AuditCategory = "auth" | "quote" | "payment" | "webhook" | "account" | "admin";

export interface AuditLogEntry {
  _id: string;
  ts: string;
  category: AuditCategory;
  severity: AuditSeverity;
  actor: string; // email or "system"
  action: string;
  target: string | null;
  meta: string | null;
}

export interface AdminQuoteRow {
  _id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  clientName: string;
  status: QuoteStatus;
  total: number;
  depositAmount: number;
  currency: string;
  updatedAt: string;
}

export interface PlatformUserDetail {
  user: PlatformUser;
  clients: Client[];
  quotes: Quote[];
  activity: ActivityEvent[];
}
