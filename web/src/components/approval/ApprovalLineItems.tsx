import { useMemo } from "react";
import { Check } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import type { PublicQuote, LineItem } from "@/lib/types";

interface Props {
  quote: PublicQuote;
  locked: boolean;
  onToggle: (item: LineItem) => void;
  onSelectTier: (tierGroup: string, id: string) => void;
}

// The quote "paper" — read-only except optional/tiered toggles. Money columns
// are mono, right-aligned. Deselected rows dim + strike-through. Totals use the
// FED 150ms count-up. Optional items toggle on/off; tiered items render as
// visually-separated "pick one" groups (mutually exclusive), mirroring the
// owner builder's live preview.
export function ApprovalLineItems({ quote, locked, onToggle, onSelectTier }: Props) {
  // Group tiered items by tierGroup so they render as radio-style selectors.
  const { standalone, tierGroups } = useMemo(() => {
    const groups = new Map<string, LineItem[]>();
    const rest: LineItem[] = [];
    for (const li of quote.lineItems) {
      if (li.type === "tiered" && li.tierGroup) {
        const arr = groups.get(li.tierGroup) ?? [];
        arr.push(li);
        groups.set(li.tierGroup, arr);
      } else {
        rest.push(li);
      }
    }
    return { standalone: rest, tierGroups: groups };
  }, [quote.lineItems]);

  const animSubtotal = useCountUp(quote.subtotal);
  const animTax = useCountUp(quote.taxTotal);
  const animTotal = useCountUp(quote.total);
  const animDeposit = useCountUp(quote.depositAmount);

  return (
    <div>
      <div className="divide-y divide-line">
        {standalone.map((li) => (
          <StandaloneRow
            key={li._id}
            item={li}
            currency={quote.currency}
            locked={locked}
            onToggle={() => onToggle(li)}
          />
        ))}
      </div>

      {/* Tiered "pick one" groups — visually separated mutually-exclusive blocks */}
      {[...tierGroups.entries()].map(([group, items]) => (
        <div key={group} className="mt-4 border border-line bg-paper-dim/50 p-4">
          <p className="mb-2.5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Pick one
            <span className="inline-flex items-center border border-glow/50 bg-glow/[0.06] px-1.5 font-mono text-[9px] lowercase tracking-[0.04em] text-[#8a6a2e]">
              {group}
            </span>
          </p>
          <div className="space-y-2">
            {items.map((li) => {
              const lineTotal = li.qty * li.unitPrice;
              return (
                <button
                  key={li._id}
                  disabled={locked}
                  onClick={() => onSelectTier(group, li._id)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 border px-3 py-2.5 text-left transition-colors",
                    li.selected
                      ? "border-ink bg-paper"
                      : "border-line bg-paper/60 hover:border-ink/40",
                    locked && "cursor-default"
                  )}
                >
                  <span className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                        li.selected ? "border-ink" : "border-line"
                      )}
                    >
                      {li.selected && <span className="h-1.5 w-1.5 rounded-full bg-ink" />}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm font-medium",
                          li.selected ? "text-ink" : "text-ink-soft"
                        )}
                      >
                        {li.label}
                      </span>
                      {li.description && (
                        <span className="mt-0.5 block font-sans text-xs leading-relaxed text-ink-soft">
                          {li.description}
                        </span>
                      )}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-sm tabular-nums",
                      li.selected ? "text-ink" : "text-ink-soft"
                    )}
                  >
                    {formatMoney(lineTotal, quote.currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Totals */}
      <div className="mt-4 space-y-2 border-t border-line pt-4">
        <TotalRow label="Subtotal" value={formatMoney(animSubtotal, quote.currency)} muted />
        <TotalRow label="Tax" value={formatMoney(animTax, quote.currency)} muted />
        <TotalRow label="Total" value={formatMoney(animTotal, quote.currency)} big />
      </div>

      {/* Deposit highlight — the single permitted glow accent */}
      <div className="mt-4 border border-glow/40 bg-glow/[0.06] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6a2e]">
            Deposit due today (
            {quote.depositType === "percent" ? `${quote.depositValue}%` : "fixed"})
          </span>
          <span className="font-headline text-2xl font-bold tabular-nums text-ink">
            {formatMoney(animDeposit, quote.currency)}
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          Balance {formatMoney(quote.balanceAmount, quote.currency)} invoiced after
          deposit is confirmed.
        </p>
      </div>
    </div>
  );
}

function StandaloneRow({
  item,
  currency,
  locked,
  onToggle,
}: {
  item: LineItem;
  currency: string;
  locked: boolean;
  onToggle: () => void;
}) {
  const lineTotal = item.qty * item.unitPrice;
  const optional = item.type === "optional";
  const on = item.selected;

  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="flex items-start gap-3">
        {optional ? (
          <button
            disabled={locked}
            onClick={onToggle}
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border transition-colors",
              on ? "border-ink bg-ink text-paper" : "border-line bg-surface text-transparent",
              locked && "cursor-default opacity-80"
            )}
            aria-label={on ? "Remove item" : "Add item"}
          >
            {on && <Check size={12} strokeWidth={3} />}
          </button>
        ) : (
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-ink bg-ink text-paper">
            <Check size={12} strokeWidth={3} />
          </span>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "text-sm font-medium",
                on ? "text-ink" : "text-ink-faint line-through"
              )}
            >
              {item.label}
            </p>
            {optional && (
              <span className="inline-flex items-center border border-glow/50 bg-glow/[0.06] px-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#8a6a2e]">
                Optional
              </span>
            )}
          </div>
          {item.description && (
            <p className={cn("mt-0.5 font-sans text-xs leading-relaxed", on ? "text-ink-soft" : "text-ink-faint")}>
              {item.description}
            </p>
          )}
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-faint">
            {item.qty} × {formatMoney(item.unitPrice, currency)}
            {item.taxRate > 0 && ` · ${item.taxRate}% tax`}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 font-mono text-sm tabular-nums",
          on ? "text-ink" : "text-ink-faint line-through"
        )}
      >
        {formatMoney(lineTotal, currency)}
      </span>
    </div>
  );
}

function TotalRow({
  label,
  value,
  muted,
  big,
}: {
  label: string;
  value: string;
  muted?: boolean;
  big?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={cn(
          big ? "font-headline text-lg font-semibold tracking-[-0.01em] text-ink" : "text-sm",
          muted && "text-ink-soft"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums",
          big ? "text-lg font-semibold text-ink" : "text-sm",
          muted && "text-ink-soft"
        )}
      >
        {value}
      </span>
    </div>
  );
}
