// Service layer. Every data access goes through here so the USE_API toggle is
// the single switch between offline seed data and the real backend.
//
//   USE_API=false → operate on an in-memory DataSet (default seed clone, or a
//                   sandbox-provided clone) with simulated latency.
//   USE_API=true  → call the Express backend at API_BASE with a JWT bearer.
//
// The mock branch IS the authoritative totals engine (computeTotals), exactly
// as the server would be, so the public approval flow behaves identically.

import { USE_API, API_BASE, MOCK_LATENCY } from "@/config/env";
import { db as defaultDb, type DataSet } from "./mockDb";
import { computeTotals, genId, genToken } from "@/lib/utils";
import type {
  User,
  Client,
  Quote,
  Signature,
  Payment,
  Invoice,
  WebhookEvent,
  Notification,
  ActivityEvent,
  PublicQuote,
  FunnelData,
  QuoteStatus,
  LineItem,
} from "@/lib/types";
import type {
  QuoteBuilderInput,
  ClientInput,
  SignatureInput,
} from "@/lib/schemas";

// ── Active dataset (swapped to a sandbox clone when in sandbox mode) ───────

let activeDb: DataSet = defaultDb;
// Not a React hook — a plain service setter that points the mock data layer at
// the active dataset (a sandbox clone or the shared default).
export function setActiveDataSet(ds: DataSet | null) {
  activeDb = ds ?? defaultDb;
}

// ── Helpers ────────────────────────────────────────────────────────────────

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

function delay() {
  const { min, max } = MOCK_LATENCY;
  return new Promise<void>((r) =>
    setTimeout(r, min + Math.random() * (max - min))
  );
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.message || body.error || msg;
    } catch {
      /* noop */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const nowIso = () => new Date().toISOString();

function pushActivity(
  ds: DataSet,
  quoteId: string,
  type: ActivityEvent["type"],
  actor: ActivityEvent["actor"],
  meta: Record<string, unknown> | null = null
) {
  ds.activityEvents.push({
    _id: genId("ae"),
    quoteId,
    type,
    actor,
    meta,
    createdAt: nowIso(),
  });
}

function toPublic(ds: DataSet, q: Quote): PublicQuote {
  const client = ds.clients.find((c) => c._id === q.clientId);
  const t = computeTotals(q.lineItems, q.depositType, q.depositValue);
  // amountPaid = sum of succeeded payments; amountDue = the oldest pending
  // payment request (deposit or balance) the client can pay right now.
  const amountPaid = ds.payments
    .filter((p) => p.quoteId === q._id && p.status === "succeeded")
    .reduce((s, p) => s + p.amount, 0);
  const pending = ds.payments.find((p) => p.quoteId === q._id && p.status === "pending");
  const remaining = Math.max(0, t.total - amountPaid);
  return {
    _id: q._id,
    title: q.title,
    status: q.status,
    currency: q.currency,
    businessName: ds.user.brand.businessName,
    brandPrimaryColor: ds.user.brand.primaryColor,
    logoUrl: ds.user.brand.logoUrl,
    clientName: client?.name ?? "Client",
    lineItems: q.lineItems,
    ...t,
    depositType: q.depositType,
    depositValue: q.depositValue,
    amountPaid,
    remaining,
    amountDue: pending ? pending.amount : amountPaid > 0 ? 0 : t.depositAmount,
    expiresAt: q.expiresAt,
    signed: ds.signatures.some((s) => s.quoteId === q._id),
    paid: q.status === "deposit_paid" || q.status === "paid_in_full",
    paidInFull: q.status === "paid_in_full" || remaining <= 0,
  };
}

// ── Auth ───────────────────────────────────────────────────────────────────

export interface AuthResult {
  token: string;
  user: User;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResult> {
  if (USE_API) {
    return http<AuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }
  await delay();
  // Accept the seeded demo account (generic error otherwise — no enumeration).
  if (
    email.trim().toLowerCase() === defaultDb.user.email &&
    password.length > 0
  ) {
    const token = `mock.jwt.${genToken()}`;
    return { token, user: defaultDb.user };
  }
  throw new ApiError(401, "Invalid email or password.");
}

// ── Quotes (owner) ─────────────────────────────────────────────────────────

export async function listQuotes(): Promise<Quote[]> {
  if (USE_API) return http<Quote[]>("/quotes");
  await delay();
  return [...activeDb.quotes].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
}

export async function getQuote(id: string): Promise<Quote> {
  if (USE_API) return http<Quote>(`/quotes/${id}`);
  await delay();
  const q = activeDb.quotes.find((x) => x._id === id);
  if (!q) throw new ApiError(404, "Quote not found.");
  return q;
}

export async function createQuote(input: QuoteBuilderInput): Promise<Quote> {
  if (USE_API) {
    return http<Quote>("/quotes", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  await delay();
  const lineItems: LineItem[] = input.lineItems.map((li) => ({
    ...li,
    _id: li._id || genId("li"),
    description: li.description ?? null,
    tierGroup: li.tierGroup ?? null,
  }));
  const t = computeTotals(lineItems, input.depositType, input.depositValue);
  const q: Quote = {
    _id: genId("q"),
    ownerId: activeDb.user._id,
    clientId: input.clientId,
    title: input.title,
    status: "draft",
    currency: input.currency,
    lineItems,
    ...t,
    depositType: input.depositType,
    depositValue: input.depositValue,
    amountPaid: 0,
    publicToken: `tok_${genToken()}`,
    expiresAt: null,
    pdfUrl: null,
    sentAt: null,
    viewedAt: null,
    approvedAt: null,
    depositPaidAt: null,
    paidInFullAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  activeDb.quotes.push(q);
  pushActivity(activeDb, q._id, "created", "owner");
  return q;
}

export async function updateQuote(
  id: string,
  input: QuoteBuilderInput
): Promise<Quote> {
  if (USE_API) {
    return http<Quote>(`/quotes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }
  await delay();
  const q = activeDb.quotes.find((x) => x._id === id);
  if (!q) throw new ApiError(404, "Quote not found.");
  // E10: editing a deposit_paid quote is blocked; locked once >= approved.
  if (q.status === "approved" || q.status === "deposit_paid") {
    throw new ApiError(409, "This quote is locked — it has been approved.");
  }
  const lineItems: LineItem[] = input.lineItems.map((li) => ({
    ...li,
    _id: li._id || genId("li"),
    description: li.description ?? null,
    tierGroup: li.tierGroup ?? null,
  }));
  const t = computeTotals(lineItems, input.depositType, input.depositValue);
  Object.assign(q, {
    title: input.title,
    clientId: input.clientId,
    currency: input.currency,
    lineItems,
    depositType: input.depositType,
    depositValue: input.depositValue,
    ...t,
    updatedAt: nowIso(),
  });
  return q;
}

export async function sendQuote(id: string): Promise<Quote> {
  if (USE_API) {
    return http<Quote>(`/quotes/${id}/send`, { method: "POST" });
  }
  await delay();
  const q = activeDb.quotes.find((x) => x._id === id);
  if (!q) throw new ApiError(404, "Quote not found.");
  if (q.status === "draft") {
    q.status = "sent";
    q.sentAt = nowIso();
    q.expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
    q.pdfUrl = `https://cdn.pactlink.app/pdf/${q._id}.pdf`;
    pushActivity(activeDb, q._id, "sent", "owner");
    const client = activeDb.clients.find((c) => c._id === q.clientId);
    activeDb.notifications.push({
      _id: genId("nt"),
      quoteId: q._id,
      channel: "email",
      recipientType: "client",
      template: "quote_sent",
      to: client?.email ?? "client@example.com",
      status: "sent",
      error: null,
      sentAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
  q.updatedAt = nowIso();
  return q;
}

export async function getQuotePdfUrl(id: string): Promise<string> {
  if (USE_API) {
    const r = await http<{ url: string }>(`/quotes/${id}/pdf`);
    return r.url;
  }
  await delay();
  const q = activeDb.quotes.find((x) => x._id === id);
  if (!q) throw new ApiError(404, "Quote not found.");
  // Always "regenerated" on demand so it matches current selection (E3).
  return `https://cdn.pactlink.app/pdf/${q._id}.pdf?v=${Date.now()}`;
}

export async function deleteQuote(id: string): Promise<void> {
  if (USE_API) {
    await http<void>(`/quotes/${id}`, { method: "DELETE" });
    return;
  }
  await delay();
  activeDb.quotes = activeDb.quotes.filter((q) => q._id !== id);
}

// ── Clients ────────────────────────────────────────────────────────────────

export async function listClients(): Promise<Client[]> {
  if (USE_API) return http<Client[]>("/clients");
  await delay();
  return [...activeDb.clients];
}

export async function createClient(input: ClientInput): Promise<Client> {
  if (USE_API) {
    return http<Client>("/clients", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  await delay();
  const c: Client = {
    _id: genId("c"),
    ownerId: activeDb.user._id,
    name: input.name,
    email: input.email,
    company: input.company ?? null,
    phone: input.phone ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  activeDb.clients.push(c);
  return c;
}

export async function updateClient(
  id: string,
  input: ClientInput
): Promise<Client> {
  if (USE_API) {
    return http<Client>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }
  await delay();
  const c = activeDb.clients.find((x) => x._id === id);
  if (!c) throw new ApiError(404, "Client not found.");
  Object.assign(c, {
    name: input.name,
    email: input.email,
    company: input.company ?? null,
    phone: input.phone ?? null,
    updatedAt: nowIso(),
  });
  return c;
}

export async function deleteClient(id: string): Promise<void> {
  if (USE_API) {
    await http<void>(`/clients/${id}`, { method: "DELETE" });
    return;
  }
  await delay();
  activeDb.clients = activeDb.clients.filter((c) => c._id !== id);
}

// ── Supporting records (owner views) ───────────────────────────────────────

export async function listInvoices(): Promise<Invoice[]> {
  if (USE_API) return http<Invoice[]>("/invoices");
  await delay();
  return [...activeDb.invoices];
}

export async function listPayments(): Promise<Payment[]> {
  if (USE_API) return http<Payment[]>("/payments");
  await delay();
  return [...activeDb.payments];
}

export async function listActivity(): Promise<ActivityEvent[]> {
  if (USE_API) return http<ActivityEvent[]>("/analytics/activity");
  await delay();
  return [...activeDb.activityEvents].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
}

export async function listNotifications(): Promise<Notification[]> {
  if (USE_API) return http<Notification[]>("/notifications");
  await delay();
  return [...activeDb.notifications].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
}

export async function listWebhookEvents(): Promise<WebhookEvent[]> {
  if (USE_API) return http<WebhookEvent[]>("/analytics/webhook-events");
  await delay();
  return [...activeDb.webhookEvents].sort(
    (a, b) => +new Date(b.receivedAt) - +new Date(a.receivedAt)
  );
}

export async function listSignatures(): Promise<Signature[]> {
  if (USE_API) return http<Signature[]>("/signatures");
  await delay();
  return [...activeDb.signatures];
}

// ── Analytics funnel (F-10) ────────────────────────────────────────────────

const STATUS_RANK: Record<QuoteStatus, number> = {
  draft: 0,
  sent: 1,
  viewed: 2,
  approved: 3,
  deposit_paid: 4,
  paid_in_full: 5,
};

export async function getFunnel(): Promise<FunnelData> {
  if (USE_API) return http<FunnelData>("/analytics/funnel");
  await delay();
  return computeFunnel(activeDb.quotes);
}

export function computeFunnel(quotes: Quote[]): FunnelData {
  // A quote that reached a later stage counts in all earlier stages (monotonic
  // funnel). We use stage rank + timestamps.
  const reached = (q: Quote, r: number) => STATUS_RANK[q.status] >= r;
  const sent = quotes.filter((q) => reached(q, 1)).length;
  const viewed = quotes.filter((q) => reached(q, 2)).length;
  const approved = quotes.filter((q) => reached(q, 3)).length;
  const depositPaid = quotes.filter((q) => reached(q, 4)).length;

  const ttaHours = quotes
    .filter((q) => q.sentAt && q.approvedAt)
    .map(
      (q) =>
        (new Date(q.approvedAt!).getTime() - new Date(q.sentAt!).getTime()) /
        3_600_000
    )
    .sort((a, b) => a - b);
  const median =
    ttaHours.length === 0
      ? 0
      : ttaHours.length % 2 === 1
      ? ttaHours[(ttaHours.length - 1) / 2]
      : (ttaHours[ttaHours.length / 2 - 1] + ttaHours[ttaHours.length / 2]) / 2;

  const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));
  return {
    sent,
    viewed,
    approved,
    depositPaid,
    viewToApprovePct: pct(approved, viewed),
    approveToDepositPct: pct(depositPaid, approved),
    sentToDepositPct: pct(depositPaid, sent),
    medianTimeToApprovalHours: median,
  };
}

// ── Public client approval flow (UNAUTHENTICATED, by token) ────────────────

export async function getPublicQuote(token: string): Promise<PublicQuote> {
  if (USE_API) return http<PublicQuote>(`/public/quotes/${token}`);
  await delay();
  const q = activeDb.quotes.find((x) => x.publicToken === token);
  if (!q) throw new ApiError(404, "This link is invalid.");
  // E5: expired link → 410.
  if (q.expiresAt && new Date(q.expiresAt).getTime() < Date.now()) {
    throw new ApiError(410, "This link has expired. Please contact the sender.");
  }
  // E1/E6: first view advances sent → viewed (monotonic).
  if (q.status === "sent") {
    q.status = "viewed";
    q.viewedAt = nowIso();
    pushActivity(activeDb, q._id, "viewed", "client");
    activeDb.notifications.push({
      _id: genId("nt"),
      quoteId: q._id,
      channel: "email",
      recipientType: "owner",
      template: "quote_viewed",
      to: activeDb.user.email,
      status: "sent",
      error: null,
      sentAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
  return toPublic(activeDb, q);
}

/** UC-C02: toggle optional/tiered selection; server recomputes totals. */
export async function updatePublicSelection(
  token: string,
  selectedIds: string[]
): Promise<PublicQuote> {
  if (USE_API) {
    return http<PublicQuote>(`/public/quotes/${token}/selection`, {
      method: "PATCH",
      body: JSON.stringify({ selectedIds }),
    });
  }
  await delay();
  const q = activeDb.quotes.find((x) => x.publicToken === token);
  if (!q) throw new ApiError(404, "This link is invalid.");
  // E2: selection locks at approval.
  if (STATUS_RANK[q.status] >= STATUS_RANK.approved) {
    throw new ApiError(409, "Selection is locked — this quote was approved.");
  }
  const sel = new Set(selectedIds);
  q.lineItems = q.lineItems.map((li) => {
    if (li.type === "standard") return { ...li, selected: true };
    return { ...li, selected: sel.has(li._id) };
  });
  const t = computeTotals(q.lineItems, q.depositType, q.depositValue);
  Object.assign(q, t, { updatedAt: nowIso() });
  pushActivity(activeDb, q._id, "selection_changed", "client");
  return toPublic(activeDb, q);
}

/** UC-C03 / F-04: sign → advances viewed → approved (signature gates charge). */
export async function signPublicQuote(
  token: string,
  input: SignatureInput
): Promise<PublicQuote> {
  if (USE_API) {
    return http<PublicQuote>(`/public/quotes/${token}/sign`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  await delay();
  const q = activeDb.quotes.find((x) => x.publicToken === token);
  if (!q) throw new ApiError(404, "This link is invalid.");
  // E12: required tiered group must have a selection.
  const tierGroups = new Set(
    q.lineItems.filter((li) => li.type === "tiered" && li.tierGroup).map((li) => li.tierGroup!)
  );
  for (const g of tierGroups) {
    const groupItems = q.lineItems.filter((li) => li.tierGroup === g);
    if (!groupItems.some((li) => li.selected)) {
      throw new ApiError(422, "Please choose one option in each tiered group.");
    }
  }
  // Idempotent: already signed → return existing.
  if (!activeDb.signatures.some((s) => s.quoteId === q._id)) {
    activeDb.signatures.push({
      _id: genId("sig"),
      quoteId: q._id,
      signerName: input.signerName,
      method: input.method,
      signatureData: input.signatureData,
      provider: "internal",
      providerEnvelopeId: null,
      ipAddress: "203.0.113." + Math.floor(Math.random() * 250),
      userAgent: navigator.userAgent,
      signedAt: nowIso(),
      createdAt: nowIso(),
    });
    pushActivity(activeDb, q._id, "signed", "client", { name: input.signerName });
  }
  if (STATUS_RANK[q.status] < STATUS_RANK.approved) {
    q.status = "approved";
    q.approvedAt = nowIso();
    pushActivity(activeDb, q._id, "approved", "client", {
      fromStatus: "viewed",
      toStatus: "approved",
    });
  }
  q.updatedAt = nowIso();
  return toPublic(activeDb, q);
}

export interface DepositIntent {
  clientSecret: string;
  amount: number;
  currency: string;
  paymentIntentId: string;
}

/** UC-C04 / F-05: create the deposit PaymentIntent (signature gates it, E4). */
export async function createDepositIntent(
  token: string
): Promise<DepositIntent> {
  if (USE_API) {
    return http<DepositIntent>(`/public/quotes/${token}/deposit-intent`, {
      method: "POST",
    });
  }
  await delay();
  const q = activeDb.quotes.find((x) => x.publicToken === token);
  if (!q) throw new ApiError(404, "This link is invalid.");
  // E4: signature gates the charge.
  if (!activeDb.signatures.some((s) => s.quoteId === q._id)) {
    throw new ApiError(409, "Please sign before paying.");
  }
  // If a payment is already pending (deposit OR an owner-requested balance
  // installment), return an intent for it.
  const pending = activeDb.payments.find((p) => p.quoteId === q._id && p.status === "pending");
  if (pending) {
    const pi = pending.stripePaymentIntentId ?? `pi_mock_${genToken()}`;
    pending.stripePaymentIntentId = pi;
    return { clientSecret: `${pi}_secret_mock`, amount: pending.amount, currency: q.currency, paymentIntentId: pi };
  }
  if (q.status === "paid_in_full") throw new ApiError(422, "This quote is fully paid.");
  if (q.status !== "approved" && q.status !== "deposit_paid") {
    throw new ApiError(409, "This quote is not ready for payment.");
  }
  const paid = activeDb.payments
    .filter((p) => p.quoteId === q._id && p.status === "succeeded")
    .reduce((s, p) => s + p.amount, 0);
  if (paid > 0) throw new ApiError(422, "No payment is currently due.");
  // First payment = the deposit.
  const pi = `pi_mock_${genToken()}`;
  activeDb.payments.push({
    _id: genId("pay"),
    quoteId: q._id,
    type: "deposit",
    stripePaymentIntentId: pi,
    stripeChargeId: null,
    amount: q.depositAmount,
    currency: q.currency,
    status: "pending",
    idempotencyKey: genId("idem"),
    failureReason: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  return { clientSecret: `${pi}_secret_mock`, amount: q.depositAmount, currency: q.currency, paymentIntentId: pi };
}

/**
 * Owner requests a further payment against a quote (after the deposit), as a
 * percentage of the total or a fixed amount, clamped to the remaining balance.
 * Creates a pending balance Payment the client can then pay via their link.
 */
export async function requestBalancePayment(
  quoteId: string,
  mode: "percent" | "fixed",
  value: number
): Promise<Payment> {
  if (USE_API) {
    return http<Payment>(`/quotes/${quoteId}/request-payment`, {
      method: "POST",
      body: JSON.stringify({ mode, value }),
    });
  }
  await delay();
  const q = activeDb.quotes.find((x) => x._id === quoteId);
  if (!q) throw new ApiError(404, "Quote not found.");
  const paid = activeDb.payments
    .filter((p) => p.quoteId === q._id && p.status === "succeeded")
    .reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, q.total - paid);
  if (remaining <= 0) throw new ApiError(422, "This quote is already fully paid.");
  if (activeDb.payments.some((p) => p.quoteId === q._id && p.status === "pending"))
    throw new ApiError(409, "A payment request is already pending on this quote.");
  const requested = mode === "percent" ? Math.round((q.total * value) / 100) : value;
  const amount = Math.min(Math.max(0, requested), remaining);
  if (amount <= 0) throw new ApiError(422, "Enter an amount greater than zero.");
  const payment: Payment = {
    _id: genId("pay"),
    quoteId: q._id,
    type: "balance",
    stripePaymentIntentId: null,
    stripeChargeId: null,
    amount,
    currency: q.currency,
    status: "pending",
    idempotencyKey: genId("idem"),
    failureReason: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  activeDb.payments.push(payment);
  q.updatedAt = nowIso();
  return payment;
}

/**
 * Mock-only: simulate the authoritative Stripe webhook confirming the deposit.
 * In real mode the backend webhook does this; the client never flips status.
 * `fail` simulates payment_intent.payment_failed (E7).
 */
export async function mockConfirmDeposit(
  token: string,
  fail = false
): Promise<PublicQuote> {
  await delay();
  const q = activeDb.quotes.find((x) => x.publicToken === token);
  if (!q) throw new ApiError(404, "This link is invalid.");
  const payment = activeDb.payments.find(
    (p) => p.quoteId === q._id && p.status === "pending"
  );

  if (fail) {
    if (payment) {
      payment.status = "failed";
      payment.failureReason = "Your card was declined. Please try another card.";
      payment.updatedAt = nowIso();
    }
    activeDb.webhookEvents.unshift({
      _id: genId("we"),
      provider: "stripe",
      eventId: `evt_${genToken()}`,
      type: "payment_intent.payment_failed",
      payload: { type: "payment_intent.payment_failed", quoteId: q._id },
      processed: true,
      processedAt: nowIso(),
      error: null,
      quoteId: q._id,
      receivedAt: nowIso(),
      createdAt: nowIso(),
    });
    pushActivity(activeDb, q._id, "payment_failed", "system");
    throw new ApiError(402, "Your card was declined. Please try another card.");
  }

  // Success path (the webhook-driven state machine, F-09). Generalised for
  // partial payments: a quote becomes paid_in_full once cumulative succeeded
  // payments reach the total, otherwise deposit_paid.
  if (payment) {
    payment.status = "succeeded";
    payment.stripeChargeId = `ch_${genToken()}`;
    payment.updatedAt = nowIso();
  }
  const paidNow = activeDb.payments
    .filter((p) => p.quoteId === q._id && p.status === "succeeded")
    .reduce((s, p) => s + p.amount, 0);
  q.amountPaid = paidNow;
  if (!q.depositPaidAt) q.depositPaidAt = nowIso();
  if (paidNow >= q.total) {
    q.status = "paid_in_full";
    q.paidInFullAt = nowIso();
  } else {
    q.status = "deposit_paid";
  }
  q.updatedAt = nowIso();

  // Balance invoice (F-06).
  if (q.balanceAmount > 0 && !activeDb.invoices.some((i) => i.quoteId === q._id)) {
    const count = activeDb.invoices.length + 7;
    activeDb.invoices.push({
      _id: genId("inv"),
      quoteId: q._id,
      type: "balance",
      number: `INV-2026-${String(count).padStart(4, "0")}`,
      amount: q.balanceAmount,
      currency: q.currency,
      status: "sent",
      stripeInvoiceId: `in_${genToken()}`,
      issuedAt: nowIso(),
      dueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      paidAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  // Webhook event log row (F-11) + dedupe note simulation kept simple.
  activeDb.webhookEvents.unshift({
    _id: genId("we"),
    provider: "stripe",
    eventId: `evt_${genToken()}`,
    type: "payment_intent.succeeded",
    payload: {
      type: "payment_intent.succeeded",
      data: { object: { id: payment?.stripePaymentIntentId, amount: q.depositAmount } },
      quoteId: q._id,
    },
    processed: true,
    processedAt: nowIso(),
    error: null,
    quoteId: q._id,
    receivedAt: nowIso(),
    createdAt: nowIso(),
  });

  pushActivity(activeDb, q._id, "deposit_paid", "system", { amount: q.depositAmount });
  return toPublic(activeDb, q);
}
