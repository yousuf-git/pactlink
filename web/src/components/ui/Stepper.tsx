import { Check } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Quote, QuoteStatus } from "@/lib/types";

// Per-quote 5-step horizontal stepper (F-07). Monochrome editorial: completed =
// ink, current = ink with glow marker, future = ink-faint, deposit_paid = glow.
// Connectors are hairlines. Each step shows its timestamp in mono.
const STEPS: { status: QuoteStatus; label: string; tsKey: keyof Quote }[] = [
  { status: "draft", label: "Draft", tsKey: "createdAt" },
  { status: "sent", label: "Sent", tsKey: "sentAt" },
  { status: "viewed", label: "Viewed", tsKey: "viewedAt" },
  { status: "approved", label: "Approved", tsKey: "approvedAt" },
  { status: "deposit_paid", label: "Deposit paid", tsKey: "depositPaidAt" },
  { status: "paid_in_full", label: "Paid in full", tsKey: "paidInFullAt" },
];

const RANK: Record<QuoteStatus, number> = {
  draft: 0,
  sent: 1,
  viewed: 2,
  approved: 3,
  deposit_paid: 4,
  paid_in_full: 5,
};

export function QuoteStepper({ quote }: { quote: Quote }) {
  const current = RANK[quote.status];
  return (
    <ol className="flex items-start">
      {STEPS.map((step, i) => {
        const done = i < current;
        const isCurrent = i === current;
        const isDeposit = step.status === "deposit_paid" || step.status === "paid_in_full";
        const ts = quote[step.tsKey] as string | null;
        return (
          <li key={step.status} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "h-px flex-1",
                  i === 0 ? "opacity-0" : done || isCurrent ? "bg-ink" : "bg-line"
                )}
              />
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-none border text-xs font-semibold font-mono transition-colors",
                  done && isDeposit && "border-glow bg-glow text-paper",
                  done && !isDeposit && "border-ink bg-ink text-paper",
                  isCurrent && "border-ink bg-surface text-ink ring-1 ring-glow",
                  !done && !isCurrent && "border-line bg-surface text-ink-faint"
                )}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span
                className={cn(
                  "h-px flex-1",
                  i === STEPS.length - 1 ? "opacity-0" : done ? "bg-ink" : "bg-line"
                )}
              />
            </div>
            <p
              className={cn(
                "mt-2 text-center font-mono text-[11px] uppercase tracking-[0.12em]",
                done && isDeposit ? "text-glow" : isCurrent || done ? "text-ink" : "text-ink-faint"
              )}
            >
              {step.label}
            </p>
            <p className="font-mono text-[10px] text-ink-faint">
              {ts ? formatDate(ts) : "—"}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
