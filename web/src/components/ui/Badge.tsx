import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { QuoteStatus } from "@/lib/types";

type Tone = "neutral" | "info" | "success" | "warning" | "error" | "accent" | "secondary";

// Editorial monochrome chips: hairline-bordered, mono lowercase. info/secondary
// read as ink, success leans glow, warning glow, error danger, neutral faint.
const TONES: Record<Tone, string> = {
  neutral: "border-line text-ink-faint",
  info: "border-ink text-ink",
  success: "border-glow text-glow",
  warning: "border-glow/60 text-glow",
  error: "border-danger text-danger",
  accent: "border-glow text-glow",
  secondary: "border-ink text-ink",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-none border bg-surface px-2 py-0.5 font-mono text-[11px] lowercase tracking-[0.04em]",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// Editorial status chip: draft=ink-faint, sent=ink-soft, viewed/approved=ink,
// deposit_paid=glow. Small mono lowercase, hairline border, sharp.
const STATUS_CHIP: Record<QuoteStatus, string> = {
  draft: "border-line text-ink-faint",
  sent: "border-line text-ink-soft",
  viewed: "border-ink text-ink",
  approved: "border-ink text-ink",
  deposit_paid: "border-glow text-glow",
  paid_in_full: "border-glow bg-glow/[0.12] text-glow",
};
const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  approved: "Approved",
  deposit_paid: "Deposit paid",
  paid_in_full: "Paid in full",
};

export function StatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-none border bg-surface px-2 py-0.5 font-mono text-[11px] lowercase tracking-[0.04em]",
        STATUS_CHIP[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
