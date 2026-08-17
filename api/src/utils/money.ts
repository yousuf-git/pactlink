import type { DepositType, LineItem } from '../models/index.js';

/**
 * Money utilities. All amounts are INTEGER MINOR UNITS (cents) — never floats.
 *
 * `recomputeTotals` is the single server-authoritative pricing function
 * (PRD A4). It is imported by the request controllers AND the payment /
 * state-machine code, so its semantics are a shared contract:
 *
 *  - Only `selected` line items contribute to totals.
 *  - `optional` items count only when selected.
 *  - `tiered` items are mutually exclusive within a `tierGroup`: exactly ONE
 *    selected option per group contributes; if more than one is flagged
 *    selected (bad client state) we defensively keep only the FIRST.
 *  - Per-line subtotal = qty * unitPrice (integer cents).
 *  - Per-line tax = round(lineSubtotal * taxRate / 100). taxRate is a percent
 *    (e.g. 8.25), stored on each line.
 *  - Deposit: `percent` → round(total * depositValue / 100); `fixed` →
 *    depositValue clamped to [0, total].
 *  - balanceAmount = total - depositAmount (never negative).
 */

export interface Totals {
  subtotal: number;
  taxTotal: number;
  total: number;
  depositAmount: number;
  balanceAmount: number;
}

export interface RecomputeInput {
  lineItems: ReadonlyArray<Pick<LineItem, 'qty' | 'unitPrice' | 'taxRate' | 'type' | 'selected' | 'tierGroup'>>;
  depositType: DepositType;
  depositValue: number;
}

/** Banker-free half-up rounding to an integer (cents). */
function roundCents(value: number): number {
  return Math.round(value);
}

/**
 * Determine the effective set of contributing line items, enforcing tiered
 * mutual exclusivity (one selected per `tierGroup`).
 */
function effectiveSelection<T extends RecomputeInput['lineItems'][number]>(
  lineItems: ReadonlyArray<T>,
): T[] {
  const seenTierGroups = new Set<string>();
  const result: T[] = [];

  for (const item of lineItems) {
    if (!item.selected) continue;

    if (item.type === 'tiered' && item.tierGroup) {
      // Keep only the first selected option per tier group.
      if (seenTierGroups.has(item.tierGroup)) continue;
      seenTierGroups.add(item.tierGroup);
    }

    result.push(item);
  }

  return result;
}

/**
 * Recompute all monetary totals + deposit/balance for a quote from its line
 * items and deposit config. Pure function — does not mutate input.
 */
export function recomputeTotals(input: RecomputeInput): Totals {
  const selected = effectiveSelection(input.lineItems);

  let subtotal = 0;
  let taxTotal = 0;

  for (const item of selected) {
    const lineSubtotal = roundCents(item.qty * item.unitPrice);
    const lineTax = roundCents((lineSubtotal * (item.taxRate ?? 0)) / 100);
    subtotal += lineSubtotal;
    taxTotal += lineTax;
  }

  const total = subtotal + taxTotal;

  let depositAmount: number;
  if (input.depositType === 'percent') {
    depositAmount = roundCents((total * input.depositValue) / 100);
  } else {
    depositAmount = roundCents(input.depositValue);
  }

  // Clamp deposit into [0, total]; balance is the remainder.
  depositAmount = Math.max(0, Math.min(depositAmount, total));
  const balanceAmount = Math.max(0, total - depositAmount);

  return { subtotal, taxTotal, total, depositAmount, balanceAmount };
}

/**
 * Validate that every `tiered` group has exactly one selected option.
 * Used at sign time (E12): returns the list of groups with no selection.
 */
export function tierGroupsMissingSelection(
  lineItems: ReadonlyArray<Pick<LineItem, 'type' | 'selected' | 'tierGroup'>>,
): string[] {
  const groups = new Map<string, boolean>(); // group -> hasSelection
  for (const item of lineItems) {
    if (item.type !== 'tiered' || !item.tierGroup) continue;
    const had = groups.get(item.tierGroup) ?? false;
    groups.set(item.tierGroup, had || Boolean(item.selected));
  }
  return [...groups.entries()].filter(([, hasSel]) => !hasSel).map(([group]) => group);
}
