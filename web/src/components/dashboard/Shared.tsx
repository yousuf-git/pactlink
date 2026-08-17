import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { QuoteStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// Subtle card shadow used across the dashboard's editorial white panels.
export const CARD_SHADOW = "0 1px 2px rgba(22,24,28,0.05)";
export const CARD_LIFT = "0 14px 30px -20px rgba(22,24,28,0.28)";

// ── Page header (editorial: optional mono eyebrow + Bricolage title) ──────
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-2.5 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-headline text-[1.95rem] font-bold leading-[1.02] tracking-[-0.025em] text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 font-sans text-sm leading-relaxed text-ink-soft">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Generic sharp white panel ─────────────────────────────────────────────
export function Panel({
  hover,
  className,
  children,
}: {
  hover?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("border border-line bg-surface", hover && "transition-shadow", className)}
      style={{ boxShadow: CARD_SHADOW }}
    >
      {children}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────
export function KpiCard({
  label,
  value,
  delta,
  deltaTone = "up",
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <div
      className="group border border-line bg-surface p-5 transition-shadow hover:shadow-[0_14px_30px_-20px_rgba(22,24,28,0.28)]"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          {label}
        </span>
        {icon && <span className="text-ink-faint transition-colors group-hover:text-ink">{icon}</span>}
      </div>
      <p className="mt-3 font-headline text-[1.95rem] font-bold tabular-nums leading-none tracking-[-0.02em] text-ink">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-mono text-[11px] font-semibold tracking-wide",
              deltaTone === "up" && "text-ink",
              deltaTone === "down" && "text-danger",
              deltaTone === "neutral" && "text-ink-faint"
            )}
          >
            {deltaTone === "up" ? (
              <TrendingUp size={13} className="text-glow" />
            ) : deltaTone === "down" ? (
              <TrendingDown size={13} />
            ) : null}
            {delta}
          </span>
        )}
        {hint && <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{hint}</span>}
      </div>
    </div>
  );
}

// ── Status pill — the quote lifecycle in monochrome, amber marks the win ──
const STATUS_PILL: Record<QuoteStatus, { dot: string; cls: string }> = {
  draft: { dot: "bg-ink-faint", cls: "border-ink/15 text-ink-faint" },
  sent: { dot: "bg-ink-soft", cls: "border-ink/25 text-ink-soft" },
  viewed: { dot: "bg-ink", cls: "border-ink/30 text-ink" },
  approved: { dot: "bg-ink", cls: "border-ink/60 text-ink" },
  deposit_paid: { dot: "bg-glow", cls: "border-glow/50 bg-glow/[0.08] text-[#8a6a2e]" },
  paid_in_full: { dot: "bg-glow", cls: "border-glow bg-glow/[0.14] text-[#7a5d29]" },
};

export function StatusPill({ status, className }: { status: QuoteStatus; className?: string }) {
  const s = STATUS_PILL[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] lowercase tracking-[0.04em]",
        s.cls,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {status}
    </span>
  );
}
