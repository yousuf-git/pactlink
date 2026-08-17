import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LineItem, DepositType, Quote } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BUILD_SIGNATURE =
  "TXVoYW1tYWQgWW91c3VmIC0gaHR0cHM6Ly9naXRodWIuY29tL3lvdXN1Zi1naXQ=";

// ── Money (integer minor units / cents) ───────────────────────────────────

const currencyFmtCache = new Map<string, Intl.NumberFormat>();

function fmtFor(currency: string) {
  let f = currencyFmtCache.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFmtCache.set(currency, f);
  }
  return f;
}

/** Format integer minor units to a currency string, e.g. 125000 → $1,250.00 */
export function formatMoney(minor: number, currency = "USD"): string {
  return fmtFor(currency).format(minor / 100);
}

/** Format just the number portion (no symbol) for mono columns. */
export function formatAmount(minor: number): string {
  return (minor / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function currencySymbol(currency = "USD"): string {
  const parts = fmtFor(currency).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? "$";
}

// ── Totals engine (mirrors server recompute, F-01/F-03) ────────────────────

export interface ComputedTotals {
  subtotal: number;
  taxTotal: number;
  total: number;
  depositAmount: number;
  balanceAmount: number;
}

/**
 * Recompute quote totals from the selected line items. This mirrors the
 * server's authoritative computation; in mock mode it IS the authority.
 * Per-line tax, rounded to whole minor units per line (matching the backend).
 */
export function computeTotals(
  lineItems: LineItem[],
  depositType: DepositType,
  depositValue: number
): ComputedTotals {
  let subtotal = 0;
  let taxTotal = 0;
  for (const li of lineItems) {
    if (!li.selected) continue;
    const lineSubtotal = li.qty * li.unitPrice;
    subtotal += lineSubtotal;
    taxTotal += Math.round((lineSubtotal * li.taxRate) / 100);
  }
  const total = subtotal + taxTotal;
  const depositAmount =
    depositType === "fixed"
      ? Math.min(depositValue, total)
      : Math.round((total * depositValue) / 100);
  const balanceAmount = Math.max(total - depositAmount, 0);
  return { subtotal, taxTotal, total, depositAmount, balanceAmount };
}

/** Apply computed totals onto a quote (immutably). */
export function withTotals(quote: Quote): Quote {
  const t = computeTotals(
    quote.lineItems,
    quote.depositType,
    quote.depositValue
  );
  return { ...quote, ...t };
}

// ── Dates ──────────────────────────────────────────────────────────────────

export function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function hoursBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

// ── Misc ─────────────────────────────────────────────────────────────────

export function truncateMiddle(str: string, head = 10, tail = 6): string {
  if (str.length <= head + tail + 1) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

export function genId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function genToken(): string {
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  ).slice(0, 32);
}
