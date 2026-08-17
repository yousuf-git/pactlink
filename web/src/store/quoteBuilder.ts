import { create } from "zustand";
import { computeTotals, genId, type ComputedTotals } from "@/lib/utils";
import type { LineItem, LineItemType, DepositType, Quote } from "@/lib/types";

// Zustand store for the quote-builder draft (F-01). Holds the editable line
// items + deposit config and derives totals the same way the server does, so
// the live preview matches the eventual persisted quote. Kept off React state
// so rapid edits in the builder don't churn the whole form tree.

export interface BuilderState {
  quoteId: string | null;
  title: string;
  clientId: string;
  currency: string;
  depositType: DepositType;
  depositValue: number;
  lineItems: LineItem[];

  // actions
  reset: () => void;
  loadFromQuote: (q: Quote) => void;
  setField: (
    field: "title" | "clientId" | "currency",
    value: string
  ) => void;
  setDeposit: (type: DepositType, value: number) => void;
  addLineItem: (type?: LineItemType) => void;
  updateLineItem: (id: string, patch: Partial<LineItem>) => void;
  removeLineItem: (id: string) => void;
  setLineItems: (items: LineItem[]) => void;
  toggleSelected: (id: string) => void;
  selectTier: (tierGroup: string, id: string) => void;
}

function blankLine(type: LineItemType = "standard"): LineItem {
  return {
    _id: genId("li"),
    label: "",
    description: null,
    qty: 1,
    unitPrice: 0,
    taxRate: 0,
    type,
    selected: type !== "optional",
    tierGroup: type === "tiered" ? "tier" : null,
  };
}

const initial = () => ({
  quoteId: null as string | null,
  title: "",
  clientId: "",
  currency: "USD",
  depositType: "percent" as DepositType,
  depositValue: 30,
  lineItems: [
    {
      _id: genId("li"),
      label: "",
      description: null,
      qty: 1,
      unitPrice: 0,
      taxRate: 0,
      type: "standard" as LineItemType,
      selected: true,
      tierGroup: null,
    },
  ],
});

export const useQuoteBuilder = create<BuilderState>((set) => ({
  ...initial(),

  reset: () => set(initial()),

  loadFromQuote: (q) =>
    set({
      quoteId: q._id,
      title: q.title,
      clientId: q.clientId,
      currency: q.currency,
      depositType: q.depositType,
      depositValue: q.depositValue,
      lineItems: q.lineItems.map((li) => ({ ...li })),
    }),

  setField: (field, value) => set({ [field]: value } as Partial<BuilderState>),

  setDeposit: (depositType, depositValue) => set({ depositType, depositValue }),

  addLineItem: (type = "standard") =>
    set((s) => ({ lineItems: [...s.lineItems, blankLine(type)] })),

  updateLineItem: (id, patch) =>
    set((s) => ({
      lineItems: s.lineItems.map((li) =>
        li._id === id ? { ...li, ...patch } : li
      ),
    })),

  removeLineItem: (id) =>
    set((s) => ({ lineItems: s.lineItems.filter((li) => li._id !== id) })),

  // Persist a reordered line-item list (drag-reorder). Order flows into the
  // saved quote payload and the live preview, which both read s.lineItems.
  setLineItems: (items) => set({ lineItems: items }),

  toggleSelected: (id) =>
    set((s) => ({
      lineItems: s.lineItems.map((li) =>
        li._id === id ? { ...li, selected: !li.selected } : li
      ),
    })),

  selectTier: (tierGroup, id) =>
    set((s) => ({
      lineItems: s.lineItems.map((li) =>
        li.tierGroup === tierGroup
          ? { ...li, selected: li._id === id }
          : li
      ),
    })),
}));

/** Derive totals from the current builder state (memoize at call sites). */
export function selectTotals(s: BuilderState): ComputedTotals {
  return computeTotals(s.lineItems, s.depositType, s.depositValue);
}
