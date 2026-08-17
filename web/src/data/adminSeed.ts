// Platform-admin dummy dataset. This is the multi-tenant, god-view counterpart
// to seedData.ts (which is a single owner's data). Everything here is computed
// or joined server-side from the real collections (users, clients, quotes,
// payments, webhookEvents, activityEvents) plus a billing source for plan/mrr;
// the shapes mirror lib/types.ts so the real /admin/* endpoints can return them
// unchanged. Money is integer minor units (cents).
//
// DETERMINISM: no Math.random at module load. All values are fixed literals or
// index-based formulas so the dataset is identical across reloads.

import type {
  User,
  GrowthPoint,
  AuditLogEntry,
  PlatformPlan,
  AccountStatus,
} from "@/lib/types";

// Anchored "now". Dates are computed as offsets so the timeline stays plausible
// without drifting between runs within a session, but still ends "today".
const DAY = 86_400_000;
const HOUR = 3_600_000;
const NOW = Date.now();
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

// Monthly recurring revenue per plan (minor units). This is the billing source
// of truth — trial accounts pay nothing. starter≈$49, growth≈$149, scale≈$399.
export const PLAN_MRR: Record<PlatformPlan, number> = {
  trial: 0,
  starter: 4900,
  growth: 14900,
  scale: 39900,
};

// Per-status quote counts for a tenant. The funnel is monotonic non-increasing:
// draft + sent counts are the "ever reached sent" base; sent ≥ viewed ≥
// approved ≥ deposit_paid is enforced by construction below.
export interface QuoteBreakdown {
  draft: number;
  sent: number; // currently sitting in "sent" (not yet viewed)
  viewed: number; // currently sitting in "viewed" (not yet approved)
  approved: number; // currently sitting in "approved" (not yet paid)
  depositPaid: number; // reached deposit_paid
}

// One tenant row. Holds the raw fields the admin aggregation views are derived
// from. `clientCount`, `quoteCount`, `depositVolume`, `conversionPct` and the
// funnel are aggregations over that tenant's collections; `plan`, `status` and
// `mrr` come from billing.
export interface AdminTenant {
  id: string;
  name: string;
  email: string;
  businessName: string;
  plan: PlatformPlan;
  status: AccountStatus;
  createdAt: string; // signup
  lastActiveAt: string;
  clientCount: number; // Σ clients for this owner
  quoteCount: number; // Σ quotes for this owner
  depositVolume: number; // minor — Σ succeeded deposit payments (lifetime)
  mrr: number; // minor — billing (derived from plan)
  conversionPct: number; // sent → deposit_paid for this tenant
  quotes: QuoteBreakdown;
}

// ── Platform admin user (the god-view operator) ────────────────────────────

export const platformAdmin: User = {
  _id: "u_admin_priya",
  email: "admin@pactlink.app",
  name: "Priya Nathan",
  role: "admin",
  brand: {
    businessName: "PactLink",
    logoUrl: null,
    primaryColor: "#1B4965",
  },
  defaultCurrency: "USD",
  defaultDepositType: "percent",
  defaultDepositValue: 30,
  stripeAccountId: null,
  createdAt: iso(900 * DAY),
  updatedAt: iso(1 * DAY),
};

// ── Tenant roster (~16 service businesses) ─────────────────────────────────
// Spread: a couple churned/suspended, several trials, growth/scale on the
// bigger studios, a couple of power users. depositVolume correlates with plan
// and account age. "Mara Voss / Northwind Studio" is included so this matches
// the single-owner dashboard seed.

function totalQuotes(b: QuoteBreakdown): number {
  return b.draft + b.sent + b.viewed + b.approved + b.depositPaid;
}

// conversion = depositPaid / (everything that was ever sent). draft never went
// out, so it is excluded from the denominator.
function conversion(b: QuoteBreakdown): number {
  const sentBase = b.sent + b.viewed + b.approved + b.depositPaid;
  return sentBase === 0 ? 0 : Math.round((b.depositPaid / sentBase) * 100);
}

// Raw definitions — keep funnel breakdowns monotonic by construction. Ordered
// roughly by tenure so signups spread across ~2024–2026.
const tenantDefs: Array<
  Omit<AdminTenant, "mrr" | "quoteCount" | "conversionPct"> & {
    quotes: QuoteBreakdown;
  }
> = [
  // Power user — long-tenured scale studio, high volume.
  {
    id: "u_brightforge",
    name: "Dominic Hale",
    email: "dom@brightforge.studio",
    businessName: "Brightforge Studio",
    plan: "scale",
    status: "active",
    createdAt: iso(640 * DAY), // ~2024
    lastActiveAt: iso(3 * HOUR),
    clientCount: 58,
    depositVolume: 3_840_000,
    quotes: { draft: 9, sent: 6, viewed: 7, approved: 5, depositPaid: 41 },
  },
  // Power user — agency, scale.
  {
    id: "u_meridianworks",
    name: "Carla Ndiaye",
    email: "carla@meridianworks.co",
    businessName: "Meridian Works",
    plan: "scale",
    status: "active",
    createdAt: iso(610 * DAY),
    lastActiveAt: iso(9 * HOUR),
    clientCount: 47,
    depositVolume: 3_120_000,
    quotes: { draft: 7, sent: 5, viewed: 6, approved: 4, depositPaid: 33 },
  },
  // The demo owner — matches seedData (Mara Voss / Northwind Studio).
  {
    id: "u_northwind",
    name: "Mara Voss",
    email: "demo@pactlink.app",
    businessName: "Northwind Studio",
    plan: "growth",
    status: "active",
    createdAt: iso(420 * DAY),
    lastActiveAt: iso(2 * DAY),
    clientCount: 6,
    depositVolume: 1_186_000,
    quotes: { draft: 1, sent: 3, viewed: 3, approved: 2, depositPaid: 3 },
  },
  {
    id: "u_oakline",
    name: "Devon Park",
    email: "devon@oaklinebuild.com",
    businessName: "Oakline Contracting",
    plan: "growth",
    status: "active",
    createdAt: iso(500 * DAY),
    lastActiveAt: iso(1 * DAY),
    clientCount: 31,
    depositVolume: 2_240_000,
    quotes: { draft: 5, sent: 4, viewed: 5, approved: 3, depositPaid: 22 },
  },
  {
    id: "u_lantern",
    name: "Yara Suleiman",
    email: "yara@lanternphoto.com",
    businessName: "Lantern Photography",
    plan: "growth",
    status: "active",
    createdAt: iso(360 * DAY),
    lastActiveAt: iso(6 * HOUR),
    clientCount: 24,
    depositVolume: 1_460_000,
    quotes: { draft: 3, sent: 4, viewed: 4, approved: 3, depositPaid: 16 },
  },
  {
    id: "u_ironwood_consult",
    name: "Travis Buchanan",
    email: "travis@ironwoodconsulting.co",
    businessName: "Ironwood Consulting",
    plan: "growth",
    status: "active",
    createdAt: iso(330 * DAY),
    lastActiveAt: iso(11 * HOUR),
    clientCount: 19,
    depositVolume: 1_050_000,
    quotes: { draft: 2, sent: 3, viewed: 3, approved: 2, depositPaid: 12 },
  },
  {
    id: "u_meridian_law",
    name: "Greg Halloran",
    email: "greg@meridianlaw.com",
    businessName: "Meridian Law Partners",
    plan: "starter",
    status: "active",
    createdAt: iso(280 * DAY),
    lastActiveAt: iso(2 * DAY),
    clientCount: 12,
    depositVolume: 620_000,
    quotes: { draft: 2, sent: 2, viewed: 2, approved: 1, depositPaid: 7 },
  },
  {
    id: "u_brightpath_dental",
    name: "Priya Nadkarni",
    email: "priya@brightpathdental.com",
    businessName: "Brightpath Dental Group",
    plan: "starter",
    status: "active",
    createdAt: iso(240 * DAY),
    lastActiveAt: iso(4 * DAY),
    clientCount: 9,
    depositVolume: 410_000,
    quotes: { draft: 1, sent: 2, viewed: 2, approved: 1, depositPaid: 5 },
  },
  {
    id: "u_harborview",
    name: "Daniel Okonkwo",
    email: "daniel@harborviewcafe.com",
    businessName: "Harborview Café Group",
    plan: "starter",
    status: "active",
    createdAt: iso(200 * DAY),
    lastActiveAt: iso(3 * DAY),
    clientCount: 7,
    depositVolume: 285_000,
    quotes: { draft: 1, sent: 2, viewed: 1, approved: 1, depositPaid: 4 },
  },
  // Trials — recent signups, no paid deposits yet (or minimal).
  {
    id: "u_lumen_wellness",
    name: "Sofia Reyes",
    email: "sofia@lumenwellness.com",
    businessName: "Lumen Wellness Spa",
    plan: "trial",
    status: "trial",
    createdAt: iso(11 * DAY),
    lastActiveAt: iso(1 * DAY),
    clientCount: 3,
    depositVolume: 0,
    quotes: { draft: 2, sent: 2, viewed: 1, approved: 0, depositPaid: 0 },
  },
  {
    id: "u_cedarbarrel",
    name: "Nina Kowalski",
    email: "nina@cedarbarrelbrewing.com",
    businessName: "Cedar Barrel Brewing",
    plan: "trial",
    status: "trial",
    createdAt: iso(8 * DAY),
    lastActiveAt: iso(2 * DAY),
    clientCount: 2,
    depositVolume: 0,
    quotes: { draft: 1, sent: 1, viewed: 1, approved: 0, depositPaid: 0 },
  },
  {
    id: "u_atelier_mar",
    name: "Lucia Ferreira",
    email: "lucia@ateliermar.design",
    businessName: "Atelier Mar",
    plan: "trial",
    status: "trial",
    createdAt: iso(5 * DAY),
    lastActiveAt: iso(6 * HOUR),
    clientCount: 1,
    depositVolume: 0,
    quotes: { draft: 1, sent: 1, viewed: 0, approved: 0, depositPaid: 0 },
  },
  {
    id: "u_summit_pt",
    name: "Marcus Webb",
    email: "marcus@summitphysio.com",
    businessName: "Summit Physiotherapy",
    plan: "trial",
    status: "trial",
    createdAt: iso(3 * DAY),
    lastActiveAt: iso(20 * HOUR),
    clientCount: 1,
    depositVolume: 0,
    quotes: { draft: 1, sent: 0, viewed: 0, approved: 0, depositPaid: 0 },
  },
  // Suspended — billing issue, locked out but data retained.
  {
    id: "u_graystone",
    name: "Holt Beckett",
    email: "holt@graystoneagency.com",
    businessName: "Graystone Agency",
    plan: "growth",
    status: "suspended",
    createdAt: iso(390 * DAY),
    lastActiveAt: iso(34 * DAY),
    clientCount: 14,
    depositVolume: 740_000,
    quotes: { draft: 3, sent: 2, viewed: 2, approved: 1, depositPaid: 9 },
  },
  // Churned — canceled; mrr drops to 0, depositVolume frozen at last value.
  {
    id: "u_pinewood",
    name: "Elaine Cho",
    email: "elaine@pinewoodinteriors.com",
    businessName: "Pinewood Interiors",
    plan: "starter",
    status: "churned",
    createdAt: iso(450 * DAY),
    lastActiveAt: iso(96 * DAY),
    clientCount: 8,
    depositVolume: 318_000,
    quotes: { draft: 2, sent: 1, viewed: 1, approved: 0, depositPaid: 4 },
  },
  {
    id: "u_verde_events",
    name: "Tomás Herrera",
    email: "tomas@verdeevents.co",
    businessName: "Verde Events",
    plan: "starter",
    status: "churned",
    createdAt: iso(540 * DAY),
    lastActiveAt: iso(140 * DAY),
    clientCount: 6,
    depositVolume: 226_000,
    quotes: { draft: 1, sent: 1, viewed: 0, approved: 0, depositPaid: 3 },
  },
];

// Materialize tenants with derived billing/aggregation fields. churned/suspended
// billing handled here: churned accounts no longer pay (mrr = 0); suspended
// accounts still carry their plan's mrr (frozen, recoverable).
export const tenants: AdminTenant[] = tenantDefs.map((t) => ({
  ...t,
  mrr: t.status === "churned" ? 0 : PLAN_MRR[t.plan],
  quoteCount: totalQuotes(t.quotes),
  conversionPct: conversion(t.quotes),
}));

// ── 12-month growth series (ending current month) ──────────────────────────
// newUsers per month sums to the current tenant count (16). totalUsers is the
// running cumulative. revenue is deposits captured in that month (minor).
// Fixed literals — no randomness. Labels are short month names ending "now".

const MONTHS_BACK = 12;
function monthLabel(monthsAgo: number): string {
  const d = new Date(NOW);
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toLocaleDateString("en-US", { month: "short" });
}

// Per-month: [newUsers, revenueMinor, quotesCreated]. Sum(newUsers) = 16.
const growthRaw: Array<[number, number, number]> = [
  [1, 240_000, 9], // oldest of the window
  [1, 310_000, 11],
  [0, 280_000, 8],
  [1, 420_000, 14],
  [1, 510_000, 17],
  [1, 470_000, 15],
  [2, 690_000, 22],
  [1, 720_000, 24],
  [2, 880_000, 29],
  [2, 1_010_000, 33],
  [1, 940_000, 31],
  [3, 1_180_000, 38], // current month
];

let cumulativeUsers = 0;
export const growthSeries: GrowthPoint[] = growthRaw.map((row, i) => {
  const [newUsers, revenue, quotes] = row;
  cumulativeUsers += newUsers;
  return {
    period: monthLabel(MONTHS_BACK - 1 - i),
    newUsers,
    totalUsers: cumulativeUsers,
    revenue,
    quotes,
  };
});

// ── Audit log (~45 entries, newest-first sortable) ─────────────────────────
// Mix of categories + severities (mostly info, some warning, few error) with
// realistic actors. Authored as fixed offsets (hours/days ago).

interface AuditSeed {
  ago: number; // ms ago
  category: AuditLogEntry["category"];
  severity: AuditLogEntry["severity"];
  actor: string;
  action: string;
  target: string | null;
  meta: string | null;
}

const auditSeeds: AuditSeed[] = [
  { ago: 0.2 * HOUR, category: "auth", severity: "info", actor: "dom@brightforge.studio", action: "Owner logged in", target: "u_brightforge", meta: "ip=73.31.101.12" },
  { ago: 0.6 * HOUR, category: "payment", severity: "info", actor: "system", action: "Deposit captured", target: "q_brightforge_4188", meta: "amount=$1,152.00" },
  { ago: 0.9 * HOUR, category: "webhook", severity: "info", actor: "system", action: "Webhook payment_intent.succeeded verified", target: "evt_1Qbf88succ", meta: "provider=stripe" },
  { ago: 1.4 * HOUR, category: "quote", severity: "info", actor: "carla@meridianworks.co", action: "Quote sent", target: "q_meridian_3302", meta: "to=client@acme.co" },
  { ago: 2.1 * HOUR, category: "quote", severity: "info", actor: "system", action: "Signature recorded", target: "q_meridian_3302", meta: "method=typed" },
  { ago: 3.0 * HOUR, category: "account", severity: "info", actor: "sofia@lumenwellness.com", action: "Trial account created", target: "u_lumen_wellness", meta: "plan=trial" },
  { ago: 3.8 * HOUR, category: "webhook", severity: "warning", actor: "system", action: "Webhook delivery failed — retried", target: "evt_1Qoakline_inv", meta: "attempt=2; provider=stripe" },
  { ago: 4.5 * HOUR, category: "auth", severity: "info", actor: "yara@lanternphoto.com", action: "Owner logged in", target: "u_lantern", meta: "ip=73.36.105.18" },
  { ago: 5.2 * HOUR, category: "payment", severity: "info", actor: "system", action: "Deposit captured", target: "q_lantern_7741", meta: "amount=$438.00" },
  { ago: 6.0 * HOUR, category: "admin", severity: "info", actor: "admin@pactlink.app", action: "Viewed platform analytics", target: null, meta: "view=funnel" },
  { ago: 7.5 * HOUR, category: "webhook", severity: "info", actor: "system", action: "Webhook payment_intent.succeeded verified", target: "evt_1Qlantern_succ", meta: "provider=stripe" },
  { ago: 9.0 * HOUR, category: "payment", severity: "error", actor: "system", action: "Payment failed — card declined", target: "q_graystone_5510", meta: "reason=insufficient_funds" },
  { ago: 10.0 * HOUR, category: "quote", severity: "info", actor: "devon@oaklinebuild.com", action: "Quote approved by client", target: "q_oakline_6620", meta: "fromStatus=viewed" },
  { ago: 11.0 * HOUR, category: "auth", severity: "warning", actor: "unknown@pinewoodinteriors.com", action: "Failed login attempt", target: "u_pinewood", meta: "reason=invalid_password" },
  { ago: 0.5 * DAY, category: "account", severity: "info", actor: "nina@cedarbarrelbrewing.com", action: "Trial account created", target: "u_cedarbarrel", meta: "plan=trial" },
  { ago: 0.6 * DAY, category: "quote", severity: "info", actor: "demo@pactlink.app", action: "Quote created", target: "q_northwind_draft", meta: "status=draft" },
  { ago: 0.7 * DAY, category: "payment", severity: "info", actor: "system", action: "Balance invoice issued", target: "INV-2026-0042", meta: "amount=$2,765.00" },
  { ago: 0.9 * DAY, category: "webhook", severity: "info", actor: "system", action: "Webhook invoice.finalized verified", target: "evt_1Qnorth_invfin", meta: "provider=stripe" },
  { ago: 1.0 * DAY, category: "auth", severity: "info", actor: "marcus@summitphysio.com", action: "Owner logged in", target: "u_summit_pt", meta: "ip=73.40.110.7" },
  { ago: 1.2 * DAY, category: "admin", severity: "warning", actor: "admin@pactlink.app", action: "Account suspended", target: "u_graystone", meta: "reason=payment_overdue" },
  { ago: 1.4 * DAY, category: "quote", severity: "info", actor: "greg@meridianlaw.com", action: "Quote viewed by client", target: "q_meridianlaw_2201", meta: null },
  { ago: 1.6 * DAY, category: "payment", severity: "info", actor: "system", action: "Deposit captured", target: "q_oakline_6620", meta: "amount=$960.00" },
  { ago: 1.9 * DAY, category: "webhook", severity: "error", actor: "system", action: "Webhook signature verification failed", target: "evt_1Qbad_sig", meta: "provider=stripe; rejected" },
  { ago: 2.0 * DAY, category: "account", severity: "info", actor: "carla@meridianworks.co", action: "Plan upgraded to scale", target: "u_meridianworks", meta: "from=growth" },
  { ago: 2.3 * DAY, category: "auth", severity: "info", actor: "priya@brightpathdental.com", action: "Owner logged in", target: "u_brightpath_dental", meta: "ip=73.22.099.4" },
  { ago: 2.5 * DAY, category: "quote", severity: "info", actor: "system", action: "Signature recorded", target: "q_brightpath_4410", meta: "method=drawn" },
  { ago: 2.8 * DAY, category: "webhook", severity: "warning", actor: "system", action: "Webhook delivery failed — retried", target: "evt_1Qbright_retry", meta: "attempt=3; provider=stripe" },
  { ago: 3.0 * DAY, category: "payment", severity: "info", actor: "system", action: "Deposit captured", target: "q_harborview_8810", meta: "amount=$285.00" },
  { ago: 3.4 * DAY, category: "account", severity: "info", actor: "devon@oaklinebuild.com", action: "Plan upgraded to growth", target: "u_oakline", meta: "from=starter" },
  { ago: 3.9 * DAY, category: "admin", severity: "info", actor: "admin@pactlink.app", action: "Exported tenant report", target: null, meta: "format=csv" },
  { ago: 4.2 * DAY, category: "auth", severity: "info", actor: "daniel@harborviewcafe.com", action: "Owner logged in", target: "u_harborview", meta: "ip=73.18.097.21" },
  { ago: 4.8 * DAY, category: "quote", severity: "info", actor: "lucia@ateliermar.design", action: "Quote created", target: "q_ateliermar_0091", meta: "status=draft" },
  { ago: 5.0 * DAY, category: "payment", severity: "error", actor: "system", action: "Payment failed — processing error", target: "q_pinewood_3300", meta: "reason=processing_error" },
  { ago: 5.5 * DAY, category: "webhook", severity: "info", actor: "system", action: "Webhook submission.completed verified", target: "ds_evt_8842a", meta: "provider=docuseal" },
  { ago: 6.0 * DAY, category: "auth", severity: "info", actor: "tomas@verdeevents.co", action: "Owner logged in", target: "u_verde_events", meta: "ip=73.44.112.9" },
  { ago: 6.6 * DAY, category: "account", severity: "warning", actor: "admin@pactlink.app", action: "Account churned", target: "u_pinewood", meta: "reason=voluntary_cancel" },
  { ago: 7.0 * DAY, category: "quote", severity: "info", actor: "travis@ironwoodconsulting.co", action: "Quote sent", target: "q_ironwood_5520", meta: "to=ops@client.io" },
  { ago: 7.8 * DAY, category: "payment", severity: "info", actor: "system", action: "Deposit captured", target: "q_ironwood_5520", meta: "amount=$510.00" },
  { ago: 8.3 * DAY, category: "webhook", severity: "info", actor: "system", action: "Webhook payment_intent.succeeded verified", target: "evt_1Qiron_succ", meta: "deduped=false" },
  { ago: 8.9 * DAY, category: "auth", severity: "warning", actor: "system", action: "Multiple failed logins — rate limited", target: "u_graystone", meta: "attempts=6" },
  { ago: 9.5 * DAY, category: "admin", severity: "info", actor: "admin@pactlink.app", action: "Reset owner password", target: "u_brightpath_dental", meta: "channel=email" },
  { ago: 10.0 * DAY, category: "quote", severity: "info", actor: "system", action: "Signature recorded", target: "q_meridianworks_3302", meta: "method=typed" },
  { ago: 11.0 * DAY, category: "account", severity: "info", actor: "sofia@lumenwellness.com", action: "Trial extended", target: "u_lumen_wellness", meta: "days=7" },
  { ago: 12.0 * DAY, category: "payment", severity: "info", actor: "system", action: "Balance invoice paid", target: "INV-2026-0031", meta: "amount=$3,140.00" },
  { ago: 13.0 * DAY, category: "webhook", severity: "info", actor: "system", action: "Webhook payment_intent.succeeded verified", target: "evt_1Qmw_succ", meta: "provider=stripe" },
];

let auditSeq = 5000;
export const auditLogs: AuditLogEntry[] = auditSeeds.map((a) => {
  auditSeq += 1;
  return {
    _id: `audit_${auditSeq}`,
    ts: iso(a.ago),
    category: a.category,
    severity: a.severity,
    actor: a.actor,
    action: a.action,
    target: a.target,
    meta: a.meta,
  };
});
