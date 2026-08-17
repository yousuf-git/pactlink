// Platform-admin aggregation service. Same architecture as services/api.ts:
// the USE_API toggle is the single switch between offline derivation (mock) and
// the real backend. Migration is just enabling USE_API — every function has a
// matching http<T>("/admin/...") branch.
//
//   USE_API=false → derive the admin views from data/adminSeed.ts (the mock IS
//                   the aggregation engine, exactly as the server would be).
//   USE_API=true  → call the backend's /admin/* aggregation endpoints.
//
// All money is integer minor units (cents). Per-tenant aggregates sum to the
// platform totals by construction (Σ clientCount = totalClients, etc.).

import { USE_API, API_BASE, MOCK_LATENCY } from "@/config/env";
import { computeTotals } from "@/lib/utils";
import {
  tenants as seedTenants,
  growthSeries,
  auditLogs,
  PLAN_MRR,
  type AdminTenant,
  type QuoteBreakdown,
} from "@/data/adminSeed";
import type {
  Client,
  Quote,
  QuoteStatus,
  LineItem,
  ActivityEvent,
  PlatformUser,
  PlatformUserDetail,
  PlatformStats,
  GrowthPoint,
  AdminFunnel,
  PlanBreakdown,
  AuditLogEntry,
  AdminQuoteRow,
  AccountStatus,
  PlatformPlan,
} from "@/lib/types";

// ── Shared helpers (mirrors services/api.ts patterns) ──────────────────────

let authToken: string | null = null;
export function setAdminAuthToken(token: string | null) {
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

const DAY = 86_400_000;
const HOUR = 3_600_000;
const NOW = Date.now();
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

// ── Mutable tenant store (so setUserStatus/Plan reflect in the UI) ──────────
// A module-level mutable copy of the seed tenants. Mutations here mirror what a
// PATCH /admin/users/:id would persist server-side.
const mutableTenants: AdminTenant[] = seedTenants.map((t) => ({
  ...t,
  quotes: { ...t.quotes },
}));

function findTenant(id: string): AdminTenant | undefined {
  return mutableTenants.find((t) => t.id === id);
}

// ── Mapping: AdminTenant → PlatformUser ─────────────────────────────────────

function toPlatformUser(t: AdminTenant): PlatformUser {
  return {
    _id: t.id,
    name: t.name,
    email: t.email,
    businessName: t.businessName,
    plan: t.plan,
    status: t.status,
    clientCount: t.clientCount, // aggregation: Σ clients for owner
    quoteCount: t.quoteCount, // aggregation: Σ quotes for owner
    depositVolume: t.depositVolume, // aggregation: Σ succeeded deposits
    mrr: t.mrr, // billing
    conversionPct: t.conversionPct, // aggregation: sent → deposit_paid
    createdAt: t.createdAt,
    lastActiveAt: t.lastActiveAt,
  };
}

// ── Deterministic per-tenant detail generation ─────────────────────────────
// Used by getPlatformUser to materialize schema-valid Clients/Quotes/Activity
// from a tenant's aggregate counts, with no randomness (index-based formulas).

const FIRST_NAMES = [
  "Avery", "Jordan", "Riley", "Morgan", "Quinn", "Sasha", "Noah", "Maya",
];
const LAST_NAMES = [
  "Bennett", "Castillo", "Dawson", "Ellison", "Forsythe", "Greer",
];
const COMPANIES = [
  "Riverside Co.", "Alpine Group", "Quarterly Media", "Hollowood LLC",
  "Beacon Partners", "Tidewater Inc.",
];
const QUOTE_TITLES = [
  "Brand Identity System",
  "Website Redesign",
  "Launch Campaign",
  "Signage & Environmental Graphics",
  "Annual Report Design",
  "Product Photography Day",
  "Packaging Refresh",
  "Marketing Retainer — Q1",
];

function genClients(t: AdminTenant): Client[] {
  // 3–6 clients regardless of clientCount (sample of the tenant's roster).
  const count = 3 + (Math.abs(hash(t.id)) % 4); // 3..6, deterministic
  const out: Client[] = [];
  for (let i = 0; i < count; i++) {
    const fn = FIRST_NAMES[(hash(t.id) + i) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(hash(t.id) + i * 3) % LAST_NAMES.length];
    const hasCompany = (i + hash(t.id)) % 3 !== 0;
    out.push({
      _id: `c_${t.id}_${i}`,
      ownerId: t.id,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      company: hasCompany ? COMPANIES[(hash(t.id) + i) % COMPANIES.length] : null,
      phone: i % 2 === 0 ? `+1 (415) 555-0${100 + i}` : null,
      createdAt: iso((180 - i * 12) * DAY),
      updatedAt: iso((180 - i * 12) * DAY),
    });
  }
  return out;
}

// Deterministic small string hash → non-negative-ish int.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

// Build a single schema-valid quote at a given status with realistic line items
// and totals computed by the same engine the UI uses.
function buildQuote(
  t: AdminTenant,
  clientId: string,
  seq: number,
  status: QuoteStatus,
  createdAgoDays: number
): Quote {
  const titleIdx = (hash(t.id) + seq) % QUOTE_TITLES.length;
  const base = 80_000 + ((hash(t.id) + seq * 7) % 8) * 45_000;
  const lineItems: LineItem[] = [
    {
      _id: `li_${t.id}_${seq}_1`,
      label: "Discovery & strategy",
      description: "Kickoff workshop and scoping",
      qty: 1,
      unitPrice: base,
      taxRate: 0,
      type: "standard",
      selected: true,
      tierGroup: null,
    },
    {
      _id: `li_${t.id}_${seq}_2`,
      label: "Design & production",
      description: null,
      qty: 1,
      unitPrice: base * 2 + 60_000,
      taxRate: 8.25,
      type: "standard",
      selected: true,
      tierGroup: null,
    },
    {
      _id: `li_${t.id}_${seq}_3`,
      label: "Add-on: extended revisions",
      description: null,
      qty: 1,
      unitPrice: 45_000,
      taxRate: 8.25,
      type: "optional",
      selected: seq % 2 === 0,
      tierGroup: null,
    },
  ];
  const depositType = seq % 3 === 0 ? "fixed" : "percent";
  const depositValue = depositType === "fixed" ? 100_000 : 30;
  const totals = computeTotals(lineItems, depositType, depositValue);

  const rank: Record<QuoteStatus, number> = {
    draft: 0,
    sent: 1,
    viewed: 2,
    approved: 3,
    deposit_paid: 4,
    paid_in_full: 5,
  };
  const r = rank[status];
  const createdAgo = createdAgoDays * DAY;
  const sentAgo = createdAgo - 1 * DAY;
  const viewedAgo = sentAgo - 6 * HOUR;
  const approvedAgo = viewedAgo - 18 * HOUR;
  const paidAgo = approvedAgo - 2 * HOUR;

  // amountPaid follows the lifecycle: deposit captured at deposit_paid, full
  // total at paid_in_full. paidInFullAt only set once fully settled.
  const amountPaid =
    r >= 5 ? totals.total : r >= 4 ? totals.depositAmount : 0;

  return {
    _id: `q_${t.id}_${seq}`,
    ownerId: t.id,
    clientId,
    title: QUOTE_TITLES[titleIdx],
    status,
    currency: "USD",
    lineItems,
    ...totals,
    amountPaid,
    depositType,
    depositValue,
    publicToken: `tok_${t.id}_${seq}`,
    expiresAt: r >= 1 ? iso(-(20 * DAY)) : null, // future expiry for sent+
    pdfUrl: r >= 1 ? `https://cdn.pactlink.app/pdf/q_${t.id}_${seq}.pdf` : null,
    sentAt: r >= 1 ? iso(sentAgo) : null,
    viewedAt: r >= 2 ? iso(viewedAgo) : null,
    approvedAt: r >= 3 ? iso(approvedAgo) : null,
    depositPaidAt: r >= 4 ? iso(paidAgo) : null,
    paidInFullAt: r >= 5 ? iso(paidAgo) : null,
    createdAt: iso(createdAgo),
    updatedAt: iso(r >= 4 ? paidAgo : r >= 3 ? approvedAgo : r >= 2 ? viewedAgo : r >= 1 ? sentAgo : createdAgo),
  };
}

// Materialize a tenant's quotes matching its per-status breakdown counts.
function genQuotes(t: AdminTenant, clients: Client[]): Quote[] {
  const out: Quote[] = [];
  let seq = 0;
  const pick = (i: number) => clients[i % clients.length]._id;
  const emit = (status: QuoteStatus, n: number) => {
    for (let i = 0; i < n; i++) {
      seq += 1;
      // Spread createdAt: paid quotes are oldest, drafts newest.
      const ageBase =
        status === "deposit_paid" ? 60 : status === "approved" ? 40 :
        status === "viewed" ? 25 : status === "sent" ? 12 : 3;
      out.push(buildQuote(t, pick(seq), seq, status, ageBase - i));
    }
  };
  const b: QuoteBreakdown = t.quotes;
  emit("deposit_paid", b.depositPaid);
  emit("approved", b.approved);
  emit("viewed", b.viewed);
  emit("sent", b.sent);
  emit("draft", b.draft);
  return out;
}

// Recent activity timeline for a tenant, derived from its quotes' timestamps.
function genActivity(quotes: Quote[]): ActivityEvent[] {
  const rank: Record<QuoteStatus, number> = {
    draft: 0, sent: 1, viewed: 2, approved: 3, deposit_paid: 4, paid_in_full: 5,
  };
  let aeSeq = 0;
  const ae = (
    quoteId: string,
    type: ActivityEvent["type"],
    actor: ActivityEvent["actor"],
    createdAt: string,
    meta: Record<string, unknown> | null = null
  ): ActivityEvent => {
    aeSeq += 1;
    return { _id: `ae_admin_${quoteId}_${aeSeq}`, quoteId, type, actor, meta, createdAt };
  };
  const out: ActivityEvent[] = [];
  for (const q of quotes) {
    const r = rank[q.status];
    out.push(ae(q._id, "created", "owner", q.createdAt));
    if (r >= 1 && q.sentAt) out.push(ae(q._id, "sent", "owner", q.sentAt));
    if (r >= 2 && q.viewedAt) out.push(ae(q._id, "viewed", "client", q.viewedAt));
    if (r >= 3 && q.approvedAt) {
      out.push(ae(q._id, "signed", "client", q.approvedAt));
      out.push(ae(q._id, "approved", "client", q.approvedAt, { toStatus: "approved" }));
    }
    if (r >= 4 && q.depositPaidAt)
      out.push(ae(q._id, "deposit_paid", "system", q.depositPaidAt, { amount: q.depositAmount }));
  }
  return out.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

// Funnel rank used for monotonic counting (mirrors services/api.ts).
const STATUS_RANK: Record<QuoteStatus, number> = {
  draft: 0,
  sent: 1,
  viewed: 2,
  approved: 3,
  deposit_paid: 4,
  paid_in_full: 5,
};

// ── Public admin API ────────────────────────────────────────────────────────

export async function listPlatformUsers(): Promise<PlatformUser[]> {
  if (USE_API) return http<PlatformUser[]>("/admin/users");
  await delay();
  return mutableTenants.map(toPlatformUser);
}

export async function getPlatformUser(id: string): Promise<PlatformUserDetail> {
  if (USE_API) return http<PlatformUserDetail>(`/admin/users/${id}`);
  await delay();
  const t = findTenant(id);
  if (!t) throw new ApiError(404, "User not found.");
  const clients = genClients(t);
  const quotes = genQuotes(t, clients);
  const activity = genActivity(quotes);
  return { user: toPlatformUser(t), clients, quotes, activity };
}

export async function getPlatformStats(): Promise<PlatformStats> {
  if (USE_API) return http<PlatformStats>("/admin/stats");
  await delay();
  // Aggregations across all tenants. Σ per-tenant = platform totals.
  const totalUsers = mutableTenants.length;
  const activeUsers = mutableTenants.filter(
    (t) => t.status === "active" || t.status === "trial"
  ).length;

  // newUsersThisMonth: signups in the current calendar month.
  const monthStart = new Date(NOW);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newUsersThisMonth = mutableTenants.filter(
    (t) => new Date(t.createdAt).getTime() >= monthStart.getTime()
  ).length;

  const totalClients = mutableTenants.reduce((s, t) => s + t.clientCount, 0);
  const totalQuotes = mutableTenants.reduce((s, t) => s + t.quoteCount, 0);
  const depositPaidCount = mutableTenants.reduce((s, t) => s + t.quotes.depositPaid, 0);
  const depositVolume = mutableTenants.reduce((s, t) => s + t.depositVolume, 0);
  const mrr = mutableTenants.reduce((s, t) => s + t.mrr, 0);

  // platform conversion: Σ depositPaid / Σ ever-sent.
  const everSent = mutableTenants.reduce(
    (s, t) => s + t.quotes.sent + t.quotes.viewed + t.quotes.approved + t.quotes.depositPaid,
    0
  );
  const platformConversionPct =
    everSent === 0 ? 0 : Math.round((depositPaidCount / everSent) * 100);

  return {
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    totalClients,
    totalQuotes,
    depositPaidCount,
    depositVolume,
    mrr,
    platformConversionPct,
    medianTimeToApprovalHours: 19, // aggregate median (sent→approved) across tenants
  };
}

export async function getPlatformGrowth(): Promise<GrowthPoint[]> {
  if (USE_API) return http<GrowthPoint[]>("/admin/growth");
  await delay();
  return [...growthSeries];
}

export async function getPlatformFunnel(): Promise<AdminFunnel> {
  if (USE_API) return http<AdminFunnel>("/admin/funnel");
  await delay();
  // Sum per-status breakdowns across tenants into a monotonic funnel: a quote
  // that reached a later stage counts in all earlier stages.
  let sent = 0;
  let viewed = 0;
  let approved = 0;
  let depositPaid = 0;
  for (const t of mutableTenants) {
    const b = t.quotes;
    depositPaid += b.depositPaid;
    approved += b.depositPaid + b.approved;
    viewed += b.depositPaid + b.approved + b.viewed;
    sent += b.depositPaid + b.approved + b.viewed + b.sent;
  }
  const pct = (a: number, base: number) => (base === 0 ? 0 : Math.round((a / base) * 100));
  return {
    sent,
    viewed,
    approved,
    depositPaid,
    sentToViewedPct: pct(viewed, sent),
    viewedToApprovedPct: pct(approved, viewed),
    approvedToDepositPct: pct(depositPaid, approved),
    sentToDepositPct: pct(depositPaid, sent),
  };
}

export async function getPlanBreakdown(): Promise<PlanBreakdown[]> {
  if (USE_API) return http<PlanBreakdown[]>("/admin/plans");
  await delay();
  const plans: PlatformPlan[] = ["trial", "starter", "growth", "scale"];
  return plans.map((plan) => {
    const rows = mutableTenants.filter((t) => t.plan === plan);
    return {
      plan,
      users: rows.length, // aggregation: tenants on this plan
      mrr: rows.reduce((s, t) => s + t.mrr, 0), // billing: Σ mrr
    };
  });
}

export async function getTopUsers(limit = 8): Promise<PlatformUser[]> {
  if (USE_API) return http<PlatformUser[]>(`/admin/top-users?limit=${limit}`);
  await delay();
  return [...mutableTenants]
    .sort((a, b) => b.depositVolume - a.depositVolume)
    .slice(0, limit)
    .map(toPlatformUser);
}

export async function listAllQuotes(): Promise<AdminQuoteRow[]> {
  if (USE_API) return http<AdminQuoteRow[]>("/admin/quotes");
  await delay();
  // Cross-tenant quote rows joined with owner + client names. Materialize each
  // tenant's quotes (same engine as getPlatformUser) and flatten.
  const rows: AdminQuoteRow[] = [];
  for (const t of mutableTenants) {
    const clients = genClients(t);
    const clientById = new Map(clients.map((c) => [c._id, c]));
    for (const q of genQuotes(t, clients)) {
      rows.push({
        _id: q._id,
        title: q.title,
        ownerId: t.id,
        ownerName: t.businessName,
        clientName: clientById.get(q.clientId)?.name ?? "Client",
        status: q.status,
        total: q.total,
        depositAmount: q.depositAmount,
        currency: q.currency,
        updatedAt: q.updatedAt,
      });
    }
  }
  return rows.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

// Cross-tenant client row: a Client joined with its owning tenant's identity
// plus a per-client quote count. The shape the AdminClients page renders.
export type CrossTenantClient = Client & {
  ownerId: string;
  ownerName: string;
  quoteCount: number;
};

export async function listAllClients(): Promise<CrossTenantClient[]> {
  if (USE_API) return http<CrossTenantClient[]>("/admin/clients");
  await delay();
  // Materialize each tenant's clients + quotes (same engine as getPlatformUser),
  // then join every client with its owner identity and its own quote count.
  const rows: CrossTenantClient[] = [];
  for (const t of mutableTenants) {
    const clients = genClients(t);
    const quotes = genQuotes(t, clients);
    const countByClient = new Map<string, number>();
    for (const q of quotes) {
      countByClient.set(q.clientId, (countByClient.get(q.clientId) ?? 0) + 1);
    }
    for (const c of clients) {
      rows.push({
        ...c,
        ownerId: t.id,
        ownerName: t.businessName,
        quoteCount: countByClient.get(c._id) ?? 0,
      });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

// listAuditLogs accepts an optional filter so a page can scope to one tenant.
// `userId` matches the entry's target; `actor` matches the entry's actor email
// (the tenant's owner). Either narrows the result; client-side filtering by
// actor email is also supported by the page using the unfiltered list.
export async function listAuditLogs(filter?: {
  userId?: string;
  actor?: string;
}): Promise<AuditLogEntry[]> {
  if (USE_API) {
    const params = new URLSearchParams();
    if (filter?.userId) params.set("userId", filter.userId);
    if (filter?.actor) params.set("actor", filter.actor);
    const qs = params.toString();
    return http<AuditLogEntry[]>(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
  }
  await delay();
  let rows = [...auditLogs];
  if (filter?.userId) rows = rows.filter((e) => e.target === filter.userId);
  if (filter?.actor) rows = rows.filter((e) => e.actor === filter.actor);
  return rows.sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
}

export async function setUserStatus(
  id: string,
  status: AccountStatus
): Promise<PlatformUser> {
  if (USE_API) {
    return http<PlatformUser>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }
  await delay();
  const t = findTenant(id);
  if (!t) throw new ApiError(404, "User not found.");
  t.status = status;
  // Billing side-effect: churned accounts stop paying (mrr → 0); reactivating
  // restores the plan's mrr.
  t.mrr = status === "churned" ? 0 : PLAN_MRR[t.plan];
  t.lastActiveAt = iso(0);
  return toPlatformUser(t);
}

export async function setUserPlan(
  id: string,
  plan: PlatformPlan
): Promise<PlatformUser> {
  if (USE_API) {
    return http<PlatformUser>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ plan }),
    });
  }
  await delay();
  const t = findTenant(id);
  if (!t) throw new ApiError(404, "User not found.");
  t.plan = plan;
  // billing: mrr follows the plan unless churned.
  t.mrr = t.status === "churned" ? 0 : PLAN_MRR[plan];
  t.lastActiveAt = iso(0);
  return toPlatformUser(t);
}

export interface CreatePlatformUserInput {
  name: string;
  email: string;
  businessName: string;
  plan: PlatformPlan;
}

// Provision a new tenant. A trial plan signs up as "trial"; any paid plan is
// "active" immediately. New tenants start with zero aggregates and an mrr
// derived from the plan (mirrors a POST /admin/users + billing subscription).
export async function createPlatformUser(
  input: CreatePlatformUserInput
): Promise<PlatformUser> {
  if (USE_API) {
    return http<PlatformUser>("/admin/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  await delay();
  const status: AccountStatus = input.plan === "trial" ? "trial" : "active";
  const tenant: AdminTenant = {
    id: `u_${hash(input.email + NOW).toString(36).replace("-", "x")}`,
    name: input.name,
    email: input.email,
    businessName: input.businessName,
    plan: input.plan,
    status,
    createdAt: iso(0),
    lastActiveAt: iso(0),
    clientCount: 0,
    quoteCount: 0,
    depositVolume: 0,
    mrr: PLAN_MRR[input.plan],
    conversionPct: 0,
    quotes: { draft: 0, sent: 0, viewed: 0, approved: 0, depositPaid: 0 },
  };
  mutableTenants.unshift(tenant);
  return toPlatformUser(tenant);
}

// Reset a tenant owner's password. Mock no-op (the real endpoint dispatches a
// reset email); returns once the simulated request settles.
export async function resetUserPassword(id: string): Promise<{ ok: true }> {
  if (USE_API) {
    return http<{ ok: true }>(`/admin/users/${id}/reset-password`, {
      method: "POST",
    });
  }
  await delay();
  const t = findTenant(id);
  if (!t) throw new ApiError(404, "User not found.");
  return { ok: true };
}

// STATUS_RANK is exported for parity with the owner funnel engine; keeps the
// monotonic-stage contract documented in one place.
export { STATUS_RANK };
