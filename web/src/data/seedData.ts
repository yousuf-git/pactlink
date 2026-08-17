// Realistic seed data covering every DBD collection. Narrative: "Northwind
// Studio" (the demo owner, a design+build creative studio) plus a roster of
// real-sounding service businesses as clients. ~12 quotes spread across every
// QuoteStatus so the funnel, pipeline, event log and analytics render richly
// offline (USE_API=false). Money is integer minor units (cents).
//
// This mirrors the DBD seed section. Totals are precomputed with the same
// engine the UI uses (computeTotals) at module load so seed numbers are
// internally consistent.

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
  LineItem,
} from "@/lib/types";
import { computeTotals } from "@/lib/utils";

// Anchor "now" relative dates so the timeline stays plausible across runs.
const DAY = 86_400_000;
const HOUR = 3_600_000;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

// ── Users (the demo owner) ─────────────────────────────────────────────────

export const seedUser: User = {
  _id: "u_northwind",
  email: "demo@pactlink.app",
  name: "Mara Voss",
  role: "demo",
  brand: {
    businessName: "Northwind Studio",
    logoUrl: null,
    primaryColor: "#1B4965",
  },
  defaultCurrency: "USD",
  defaultDepositType: "percent",
  defaultDepositValue: 30,
  stripeAccountId: "acct_northwind_demo",
  createdAt: iso(420 * DAY),
  updatedAt: iso(2 * DAY),
};

// ── Clients ────────────────────────────────────────────────────────────────

export const seedClients: Client[] = [
  {
    _id: "c_harborview",
    ownerId: seedUser._id,
    name: "Daniel Okonkwo",
    email: "daniel@harborviewcafe.com",
    company: "Harborview Café",
    phone: "+1 (206) 555-0142",
    createdAt: iso(120 * DAY),
    updatedAt: iso(120 * DAY),
  },
  {
    _id: "c_brightpath",
    ownerId: seedUser._id,
    name: "Priya Nadkarni",
    email: "priya@brightpathdental.com",
    company: "Brightpath Dental Group",
    phone: "+1 (415) 555-0198",
    createdAt: iso(96 * DAY),
    updatedAt: iso(96 * DAY),
  },
  {
    _id: "c_ironwood",
    ownerId: seedUser._id,
    name: "Travis Buchanan",
    email: "travis@ironwoodbrewing.co",
    company: "Ironwood Brewing Co.",
    phone: "+1 (503) 555-0177",
    createdAt: iso(70 * DAY),
    updatedAt: iso(70 * DAY),
  },
  {
    _id: "c_lumen",
    ownerId: seedUser._id,
    name: "Sofia Reyes",
    email: "sofia@lumenwellness.com",
    company: "Lumen Wellness Spa",
    phone: "+1 (305) 555-0123",
    createdAt: iso(54 * DAY),
    updatedAt: iso(54 * DAY),
  },
  {
    _id: "c_meridian",
    ownerId: seedUser._id,
    name: "Greg Halloran",
    email: "greg.halloran@meridianlaw.com",
    company: "Meridian Law Partners",
    phone: null,
    createdAt: iso(40 * DAY),
    updatedAt: iso(40 * DAY),
  },
  {
    _id: "c_fielding",
    ownerId: seedUser._id,
    name: "Amelia Fielding",
    email: "amelia.fielding@gmail.com",
    company: null,
    phone: "+1 (617) 555-0166",
    createdAt: iso(18 * DAY),
    updatedAt: iso(18 * DAY),
  },
];

// ── Line-item builders ─────────────────────────────────────────────────────

let liSeq = 0;
function li(p: Partial<LineItem> & { label: string; unitPrice: number }): LineItem {
  liSeq += 1;
  return {
    _id: `li_${liSeq}`,
    label: p.label,
    description: p.description ?? null,
    qty: p.qty ?? 1,
    unitPrice: p.unitPrice,
    taxRate: p.taxRate ?? 0,
    type: p.type ?? "standard",
    selected: p.selected ?? true,
    tierGroup: p.tierGroup ?? null,
  };
}

// ── Quote factory (computes totals to stay consistent) ─────────────────────

interface QuoteSeed {
  _id: string;
  clientId: string;
  title: string;
  status: Quote["status"];
  lineItems: LineItem[];
  depositType: Quote["depositType"];
  depositValue: number;
  publicToken: string;
  createdAtAgo: number;
  sentAgo?: number;
  viewedAgo?: number;
  approvedAgo?: number;
  depositPaidAgo?: number;
  paidInFullAgo?: number;
  expiresAgoNeg?: number; // negative = future expiry
}

function buildQuote(s: QuoteSeed): Quote {
  const t = computeTotals(s.lineItems, s.depositType, s.depositValue);
  return {
    _id: s._id,
    ownerId: seedUser._id,
    clientId: s.clientId,
    title: s.title,
    status: s.status,
    currency: "USD",
    lineItems: s.lineItems,
    ...t,
    depositType: s.depositType,
    depositValue: s.depositValue,
    amountPaid:
      s.status === "paid_in_full" ? t.total : s.status === "deposit_paid" ? t.depositAmount : 0,
    publicToken: s.publicToken,
    expiresAt:
      s.expiresAgoNeg != null ? new Date(now + s.expiresAgoNeg).toISOString() : null,
    pdfUrl: s.status !== "draft" ? `https://cdn.pactlink.app/pdf/${s._id}.pdf` : null,
    sentAt: s.sentAgo != null ? iso(s.sentAgo) : null,
    viewedAt: s.viewedAgo != null ? iso(s.viewedAgo) : null,
    approvedAt: s.approvedAgo != null ? iso(s.approvedAgo) : null,
    depositPaidAt: s.depositPaidAgo != null ? iso(s.depositPaidAgo) : null,
    paidInFullAt: s.paidInFullAgo != null ? iso(s.paidInFullAgo) : null,
    createdAt: iso(s.createdAtAgo),
    updatedAt: iso(Math.min(s.createdAtAgo, s.depositPaidAgo ?? s.approvedAgo ?? s.viewedAgo ?? s.sentAgo ?? s.createdAtAgo)),
  };
}

const quoteSeeds: QuoteSeed[] = [
  // 1 DRAFT
  {
    _id: "q_fielding_branding",
    clientId: "c_fielding",
    title: "Personal Brand Identity & Site",
    status: "draft",
    depositType: "percent",
    depositValue: 30,
    publicToken: "tok_draft_fielding_001",
    createdAtAgo: 1 * DAY,
    lineItems: [
      // 1 standard
      li({ label: "Brand strategy workshop", description: "Half-day discovery + positioning session", unitPrice: 95000, taxRate: 0 }),
      // tier group A — Identity package (pick one)
      li({ label: "Identity — Essential", description: "Logo, color, type, 1 round", type: "tiered", tierGroup: "Identity package", selected: true, unitPrice: 180000, taxRate: 0 }),
      li({ label: "Identity — Signature", description: "Full system, brand guide, 3 rounds", type: "tiered", tierGroup: "Identity package", selected: false, unitPrice: 320000, taxRate: 0 }),
      // tier group B — Website (pick one)
      li({ label: "Website — One-page", description: "Single landing page, copy-ready", type: "tiered", tierGroup: "Website", selected: true, unitPrice: 180000, taxRate: 8.25 }),
      li({ label: "Website — Multi-page + CMS", description: "5 pages, editable CMS", type: "tiered", tierGroup: "Website", selected: false, unitPrice: 360000, taxRate: 8.25 }),
      // 1 optional add-on
      li({ label: "Business card + stationery set", description: "Print-ready, 2 concepts", type: "optional", selected: false, unitPrice: 65000, taxRate: 8.25 }),
    ],
  },
  // 3 SENT
  {
    _id: "q_harborview_signage",
    clientId: "c_harborview",
    title: "Café Signage & Window Graphics",
    status: "sent",
    depositType: "percent",
    depositValue: 25,
    publicToken: "tok_harborview_sign_demo",
    createdAtAgo: 5 * DAY,
    sentAgo: 4 * DAY,
    expiresAgoNeg: 18 * DAY,
    lineItems: [
      li({ label: "Exterior blade sign", description: "Powder-coated steel, double-sided", unitPrice: 320000, taxRate: 8.25 }),
      li({ label: "Window vinyl set", qty: 4, unitPrice: 28000, taxRate: 8.25 }),
      li({ label: "Menu board (chalk-style print)", type: "optional", selected: true, unitPrice: 54000, taxRate: 8.25 }),
      li({ label: "Install & permitting", unitPrice: 88000, taxRate: 0 }),
    ],
  },
  {
    _id: "q_meridian_report",
    clientId: "c_meridian",
    title: "Annual Report Design (Print + Digital)",
    status: "sent",
    depositType: "fixed",
    depositValue: 150000,
    publicToken: "tok_meridian_report_demo",
    createdAtAgo: 8 * DAY,
    sentAgo: 7 * DAY,
    lineItems: [
      li({ label: "Editorial layout (48 pp)", unitPrice: 420000, taxRate: 0 }),
      li({ label: "Data visualization suite", qty: 12, unitPrice: 18000, taxRate: 0 }),
      li({ label: "Print management & proofing", unitPrice: 95000, taxRate: 0 }),
      li({ label: "Interactive PDF version", type: "optional", selected: false, unitPrice: 120000, taxRate: 0 }),
    ],
  },
  {
    _id: "q_ironwood_taproom",
    clientId: "c_ironwood",
    title: "Taproom Rebrand & Can Series",
    status: "sent",
    depositType: "percent",
    depositValue: 35,
    publicToken: "tok_ironwood_taproom_demo",
    createdAtAgo: 6 * DAY,
    sentAgo: 5 * DAY,
    lineItems: [
      li({ label: "Brand refresh", unitPrice: 280000, taxRate: 0 }),
      // tiered: choose a can-series tier
      li({ label: "Can series — Core (4 SKUs)", type: "tiered", tierGroup: "cans", selected: true, unitPrice: 220000, taxRate: 8.25 }),
      li({ label: "Can series — Seasonal (8 SKUs)", type: "tiered", tierGroup: "cans", selected: false, unitPrice: 360000, taxRate: 8.25 }),
      li({ label: "Tap handle design", type: "optional", selected: false, unitPrice: 72000, taxRate: 8.25 }),
    ],
  },
  // 3 VIEWED
  {
    _id: "q_lumen_launch",
    clientId: "c_lumen",
    title: "Spa Launch Campaign",
    status: "viewed",
    depositType: "percent",
    depositValue: 30,
    publicToken: "tok_lumen_launch_demo",
    createdAtAgo: 11 * DAY,
    sentAgo: 10 * DAY,
    viewedAgo: 9 * DAY + 4 * HOUR,
    lineItems: [
      li({ label: "Campaign concept & art direction", unitPrice: 310000, taxRate: 0 }),
      li({ label: "Social content pack (30 posts)", unitPrice: 180000, taxRate: 0 }),
      li({ label: "Launch landing page", type: "optional", selected: true, unitPrice: 145000, taxRate: 8.25 }),
      li({ label: "Photography day", type: "optional", selected: false, unitPrice: 160000, taxRate: 0 }),
    ],
  },
  {
    _id: "q_brightpath_web",
    clientId: "c_brightpath",
    title: "Dental Group Website Redesign",
    status: "viewed",
    depositType: "percent",
    depositValue: 40,
    publicToken: "tok_brightpath_web_demo",
    createdAtAgo: 9 * DAY,
    sentAgo: 8 * DAY,
    viewedAgo: 7 * DAY + 2 * HOUR,
    lineItems: [
      li({ label: "UX & sitemap", unitPrice: 220000, taxRate: 0 }),
      li({ label: "Visual design (8 templates)", unitPrice: 340000, taxRate: 0 }),
      // tiered build scope
      li({ label: "Build — Standard CMS", type: "tiered", tierGroup: "build", selected: true, unitPrice: 480000, taxRate: 8.25 }),
      li({ label: "Build — Custom + booking integration", type: "tiered", tierGroup: "build", selected: false, unitPrice: 720000, taxRate: 8.25 }),
      li({ label: "Copywriting", type: "optional", selected: true, unitPrice: 120000, taxRate: 0 }),
    ],
  },
  {
    _id: "q_harborview_menu",
    clientId: "c_harborview",
    title: "Seasonal Menu System",
    status: "viewed",
    depositType: "fixed",
    depositValue: 50000,
    publicToken: "tok_harborview_menu_demo",
    createdAtAgo: 7 * DAY,
    sentAgo: 6 * DAY,
    viewedAgo: 5 * DAY + 6 * HOUR,
    lineItems: [
      li({ label: "Menu template system", unitPrice: 165000, taxRate: 8.25 }),
      li({ label: "Seasonal illustration set", qty: 6, unitPrice: 14000, taxRate: 0 }),
      li({ label: "Print-ready exports", type: "optional", selected: true, unitPrice: 42000, taxRate: 8.25 }),
    ],
  },
  // 2 APPROVED (signature, awaiting/at deposit)
  {
    _id: "q_ironwood_patio",
    clientId: "c_ironwood",
    title: "Patio Expansion Branding",
    status: "approved",
    depositType: "percent",
    depositValue: 30,
    publicToken: "tok_ironwood_patio_demo",
    createdAtAgo: 16 * DAY,
    sentAgo: 15 * DAY,
    viewedAgo: 14 * DAY + 3 * HOUR,
    approvedAgo: 13 * DAY,
    lineItems: [
      li({ label: "Patio identity & wayfinding", unitPrice: 260000, taxRate: 8.25 }),
      li({ label: "Outdoor menu boards", qty: 2, unitPrice: 58000, taxRate: 8.25 }),
      li({ label: "String-light signage", type: "optional", selected: true, unitPrice: 38000, taxRate: 8.25 }),
    ],
  },
  {
    _id: "q_meridian_microsite",
    clientId: "c_meridian",
    title: "Practice Area Microsite",
    status: "approved",
    depositType: "percent",
    depositValue: 35,
    publicToken: "tok_meridian_microsite_demo",
    createdAtAgo: 13 * DAY,
    sentAgo: 12 * DAY,
    viewedAgo: 11 * DAY + 5 * HOUR,
    approvedAgo: 10 * DAY + 2 * HOUR,
    lineItems: [
      li({ label: "Microsite design + build", unitPrice: 540000, taxRate: 0 }),
      li({ label: "Attorney bio photography", type: "optional", selected: false, unitPrice: 180000, taxRate: 0 }),
      li({ label: "SEO foundation", type: "optional", selected: true, unitPrice: 95000, taxRate: 0 }),
    ],
  },
  // 3 DEPOSIT_PAID (full funnel bottom)
  {
    _id: "q_lumen_rebrand",
    clientId: "c_lumen",
    title: "Full Spa Rebrand",
    status: "deposit_paid",
    depositType: "percent",
    depositValue: 30,
    publicToken: "tok_lumen_rebrand_demo",
    createdAtAgo: 30 * DAY,
    sentAgo: 29 * DAY,
    viewedAgo: 28 * DAY + 2 * HOUR,
    approvedAgo: 27 * DAY,
    depositPaidAgo: 27 * DAY - 1 * HOUR,
    lineItems: [
      li({ label: "Brand strategy & naming", unitPrice: 420000, taxRate: 0 }),
      li({ label: "Identity system", unitPrice: 380000, taxRate: 0 }),
      li({ label: "Signage & print collateral", type: "optional", selected: true, unitPrice: 240000, taxRate: 8.25 }),
      li({ label: "Brand guidelines book", unitPrice: 160000, taxRate: 0 }),
    ],
  },
  {
    _id: "q_brightpath_signage",
    clientId: "c_brightpath",
    title: "Clinic Environmental Graphics",
    status: "deposit_paid",
    depositType: "fixed",
    depositValue: 200000,
    publicToken: "tok_brightpath_signage_demo",
    createdAtAgo: 24 * DAY,
    sentAgo: 23 * DAY,
    viewedAgo: 22 * DAY + 1 * HOUR,
    approvedAgo: 21 * DAY + 6 * HOUR,
    depositPaidAgo: 21 * DAY + 5 * HOUR,
    lineItems: [
      li({ label: "Wayfinding system", unitPrice: 290000, taxRate: 8.25 }),
      li({ label: "Reception feature wall", unitPrice: 175000, taxRate: 8.25 }),
      li({ label: "Treatment-room door graphics", qty: 8, unitPrice: 12000, taxRate: 8.25 }),
    ],
  },
  {
    _id: "q_harborview_loyalty",
    clientId: "c_harborview",
    title: "Loyalty Program & App Skin",
    status: "deposit_paid",
    depositType: "percent",
    depositValue: 25,
    publicToken: "tok_harborview_loyalty_demo",
    createdAtAgo: 20 * DAY,
    sentAgo: 19 * DAY,
    viewedAgo: 18 * DAY + 8 * HOUR,
    approvedAgo: 17 * DAY,
    depositPaidAgo: 17 * DAY - 2 * HOUR,
    lineItems: [
      li({ label: "Loyalty program design", unitPrice: 210000, taxRate: 0 }),
      li({ label: "App theme & assets", unitPrice: 260000, taxRate: 0 }),
      li({ label: "Punch-card print run", type: "optional", selected: false, unitPrice: 48000, taxRate: 8.25 }),
    ],
  },
];

export const seedQuotes: Quote[] = quoteSeeds.map(buildQuote);

const clientById = new Map(seedClients.map((c) => [c._id, c]));
function clientEmail(quoteId: string): string {
  const q = seedQuotes.find((qq) => qq._id === quoteId)!;
  return clientById.get(q.clientId)?.email ?? "client@example.com";
}

// ── Signatures (approved + paid quotes) ────────────────────────────────────

const signedQuoteIds = [
  "q_ironwood_patio",
  "q_meridian_microsite",
  "q_lumen_rebrand",
  "q_brightpath_signage",
  "q_harborview_loyalty",
];

export const seedSignatures: Signature[] = signedQuoteIds.map((qid, i) => {
  const q = seedQuotes.find((qq) => qq._id === qid)!;
  const c = clientById.get(q.clientId)!;
  const drawn = i % 2 === 1;
  return {
    _id: `sig_${qid}`,
    quoteId: qid,
    signerName: c.name,
    method: drawn ? "drawn" : "typed",
    signatureData: drawn
      ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
      : c.name,
    provider: i === 2 ? "docuseal" : "internal",
    providerEnvelopeId: i === 2 ? "ds_env_8842a" : null,
    ipAddress: `73.${30 + i}.${100 + i}.${12 + i}`,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    signedAt: q.approvedAt!,
    createdAt: q.approvedAt!,
  };
});

// ── Payments ───────────────────────────────────────────────────────────────

const paidQuoteIds = [
  "q_lumen_rebrand",
  "q_brightpath_signage",
  "q_harborview_loyalty",
];

export const seedPayments: Payment[] = [
  ...paidQuoteIds.map((qid, i) => {
    const q = seedQuotes.find((qq) => qq._id === qid)!;
    return {
      _id: `pay_dep_${qid}`,
      quoteId: qid,
      type: "deposit" as const,
      stripePaymentIntentId: `pi_3Q${qid.slice(-6)}${i}xK`,
      stripeChargeId: `ch_3Q${qid.slice(-6)}${i}cH`,
      amount: q.depositAmount,
      currency: "USD",
      status: "succeeded" as const,
      idempotencyKey: `idem_dep_${qid}`,
      failureReason: null,
      createdAt: q.depositPaidAt!,
      updatedAt: q.depositPaidAt!,
    };
  }),
  // One sample FAILED deposit on an approved (unpaid) quote — exercises E7.
  {
    _id: "pay_dep_ironwood_patio_failed",
    quoteId: "q_ironwood_patio",
    type: "deposit",
    stripePaymentIntentId: "pi_3QironwoodFAIL0",
    stripeChargeId: null,
    amount: seedQuotes.find((q) => q._id === "q_ironwood_patio")!.depositAmount,
    currency: "USD",
    status: "failed",
    idempotencyKey: "idem_dep_ironwood_patio_1",
    failureReason: "Your card was declined (insufficient_funds).",
    createdAt: iso(12 * DAY),
    updatedAt: iso(12 * DAY),
  },
];

// ── Invoices (balance, for paid quotes) ────────────────────────────────────

export const seedInvoices: Invoice[] = paidQuoteIds.map((qid, i) => {
  const q = seedQuotes.find((qq) => qq._id === qid)!;
  return {
    _id: `inv_${qid}`,
    quoteId: qid,
    type: "balance",
    number: `INV-2026-${String(7 + i).padStart(4, "0")}`,
    amount: q.balanceAmount,
    currency: "USD",
    status: i === 0 ? "sent" : i === 1 ? "paid" : "draft",
    stripeInvoiceId: `in_1Q${qid.slice(-5)}${i}`,
    issuedAt: q.depositPaidAt,
    dueAt: new Date(new Date(q.depositPaidAt!).getTime() + 30 * DAY).toISOString(),
    paidAt: i === 1 ? iso(2 * DAY) : null,
    createdAt: q.depositPaidAt!,
    updatedAt: q.depositPaidAt!,
  };
});

// ── Webhook events (mirror payments/signatures; processed + deduped) ───────

let weSeq = 1000;
function we(p: Omit<WebhookEvent, "_id" | "createdAt" | "receivedAt"> & { ago: number }): WebhookEvent {
  weSeq += 1;
  return {
    _id: `we_${weSeq}`,
    provider: p.provider,
    eventId: p.eventId,
    type: p.type,
    payload: p.payload,
    processed: p.processed,
    processedAt: p.processedAt,
    error: p.error,
    deduped: p.deduped,
    quoteId: p.quoteId,
    receivedAt: iso(p.ago),
    createdAt: iso(p.ago),
  };
}

export const seedWebhookEvents: WebhookEvent[] = [
  ...paidQuoteIds.flatMap((qid, i) => {
    const q = seedQuotes.find((qq) => qq._id === qid)!;
    const pay = seedPayments.find((pp) => pp.quoteId === qid && pp.type === "deposit")!;
    const ago = (Date.now() - new Date(q.depositPaidAt!).getTime()) / 1;
    const base = we({
      provider: "stripe",
      eventId: `evt_1Q${qid.slice(-6)}succ${i}`,
      type: "payment_intent.succeeded",
      payload: {
        id: `evt_1Q${qid.slice(-6)}succ${i}`,
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: pay.stripePaymentIntentId,
            amount: pay.amount,
            currency: "usd",
            status: "succeeded",
            metadata: { quoteId: qid },
          },
        },
      },
      processed: true,
      processedAt: q.depositPaidAt,
      error: null,
      quoteId: qid,
      ago,
    });
    // First paid quote also has a deduped retry (idempotency proof, F-11).
    if (i === 0) {
      const dup = we({
        provider: "stripe",
        eventId: `evt_1Q${qid.slice(-6)}succ${i}`,
        type: "payment_intent.succeeded",
        payload: { id: `evt_1Q${qid.slice(-6)}succ${i}`, note: "duplicate delivery" },
        processed: true,
        processedAt: q.depositPaidAt,
        error: null,
        deduped: true,
        quoteId: qid,
        ago: ago - 0.5 * HOUR,
      });
      const invFinal = we({
        provider: "stripe",
        eventId: `evt_1Q${qid.slice(-6)}invfin${i}`,
        type: "invoice.finalized",
        payload: { id: `evt_1Q${qid.slice(-6)}invfin${i}`, type: "invoice.finalized" },
        processed: true,
        processedAt: q.depositPaidAt,
        error: null,
        quoteId: qid,
        ago: ago - 0.4 * HOUR,
      });
      return [base, dup, invFinal];
    }
    return [base];
  }),
  // Failed payment event (E7).
  we({
    provider: "stripe",
    eventId: "evt_1QironwoodFAIL0",
    type: "payment_intent.payment_failed",
    payload: {
      id: "evt_1QironwoodFAIL0",
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_3QironwoodFAIL0",
          last_payment_error: { message: "Your card was declined (insufficient_funds)." },
          metadata: { quoteId: "q_ironwood_patio" },
        },
      },
    },
    processed: true,
    processedAt: iso(12 * DAY),
    error: null,
    quoteId: "q_ironwood_patio",
    ago: 12 * DAY,
  }),
  // DocuSeal signature completion event.
  we({
    provider: "docuseal",
    eventId: "ds_evt_8842a_completed",
    type: "submission.completed",
    payload: {
      id: "ds_evt_8842a_completed",
      event_type: "submission.completed",
      submission_id: "ds_env_8842a",
      quoteId: "q_lumen_rebrand",
    },
    processed: true,
    processedAt: seedQuotes.find((q) => q._id === "q_lumen_rebrand")!.approvedAt,
    error: null,
    quoteId: "q_lumen_rebrand",
    ago: 27 * DAY,
  }),
  // An error row (processing failure that was retried) — shows red pill.
  we({
    provider: "stripe",
    eventId: "evt_1Qbrightpath_invpaid_retry",
    type: "invoice.paid",
    payload: { id: "evt_1Qbrightpath_invpaid_retry", type: "invoice.paid" },
    processed: false,
    processedAt: null,
    error: "Temporary DB timeout — will retry on next delivery.",
    quoteId: "q_brightpath_signage",
    ago: 2 * DAY,
  }),
];

// ── Notifications ──────────────────────────────────────────────────────────

let ntSeq = 0;
function nt(
  quoteId: string,
  recipientType: Notification["recipientType"],
  template: Notification["template"],
  ago: number,
  status: Notification["status"] = "sent"
): Notification {
  ntSeq += 1;
  const to = recipientType === "owner" ? seedUser.email : clientEmail(quoteId);
  return {
    _id: `nt_${ntSeq}`,
    quoteId,
    channel: "email",
    recipientType,
    template,
    to,
    status,
    error: status === "failed" ? "SMTP 550: mailbox unavailable" : null,
    sentAt: status === "sent" ? iso(ago) : null,
    createdAt: iso(ago),
    updatedAt: iso(ago),
  };
}

export const seedNotifications: Notification[] = [
  nt("q_lumen_rebrand", "client", "quote_sent", 29 * DAY),
  nt("q_lumen_rebrand", "owner", "quote_viewed", 28 * DAY),
  nt("q_lumen_rebrand", "owner", "quote_approved", 27 * DAY),
  nt("q_lumen_rebrand", "owner", "deposit_paid", 27 * DAY - HOUR),
  nt("q_lumen_rebrand", "client", "balance_invoice", 27 * DAY - HOUR),
  nt("q_brightpath_signage", "client", "quote_sent", 23 * DAY),
  nt("q_brightpath_signage", "owner", "deposit_paid", 21 * DAY + 5 * HOUR),
  nt("q_harborview_loyalty", "owner", "deposit_paid", 17 * DAY - 2 * HOUR),
  nt("q_ironwood_patio", "owner", "payment_failed", 12 * DAY),
  nt("q_lumen_launch", "client", "quote_sent", 10 * DAY),
  nt("q_lumen_launch", "owner", "quote_viewed", 9 * DAY),
  nt("q_harborview_menu", "client", "quote_sent", 6 * DAY, "failed"),
];

// ── Activity events (full timeline per quote → pipeline + funnel) ──────────

let aeSeq = 0;
function ae(
  quoteId: string,
  type: ActivityEvent["type"],
  actor: ActivityEvent["actor"],
  ago: number,
  meta: Record<string, unknown> | null = null
): ActivityEvent {
  aeSeq += 1;
  return {
    _id: `ae_${aeSeq}`,
    quoteId,
    type,
    actor,
    meta,
    createdAt: iso(ago),
  };
}

function timeline(q: Quote): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  const a = (iso8601: string | null) =>
    iso8601 ? (Date.now() - new Date(iso8601).getTime()) : null;
  out.push(ae(q._id, "created", "owner", a(q.createdAt)!));
  if (q.sentAt) out.push(ae(q._id, "sent", "owner", a(q.sentAt)!, { to: clientEmail(q._id) }));
  if (q.viewedAt) out.push(ae(q._id, "viewed", "client", a(q.viewedAt)!));
  if (q.approvedAt) {
    out.push(ae(q._id, "signed", "client", a(q.approvedAt)! + 60000));
    out.push(ae(q._id, "approved", "client", a(q.approvedAt)!, { fromStatus: "viewed", toStatus: "approved" }));
  }
  if (q.depositPaidAt)
    out.push(ae(q._id, "deposit_paid", "system", a(q.depositPaidAt)!, { amount: q.depositAmount }));
  return out;
}

export const seedActivityEvents: ActivityEvent[] = [
  ...seedQuotes.flatMap(timeline),
  // failed payment activity (E7)
  ae("q_ironwood_patio", "payment_failed", "system", 12 * DAY, {
    reason: "insufficient_funds",
  }),
  // a selection_changed example to show toggle activity
  ae("q_brightpath_web", "selection_changed", "client", 7 * DAY, {
    item: "Build — Standard CMS",
  }),
];

// ── Sandbox credentials hint (shown on login pages) ────────────────────────

export const DEMO_CREDENTIALS = {
  email: "demo@pactlink.app",
  password: "northwind-demo",
};
