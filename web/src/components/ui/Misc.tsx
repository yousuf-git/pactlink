import { useState, type ReactNode } from "react";
import { Loader2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin text-ink", className)} size={20} />;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-soft">
      <Spinner />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-none border border-line bg-paper px-6 py-14 text-center">
      {icon && (
        <div className="mb-2 flex h-12 w-12 items-center justify-center border border-line text-ink-soft">
          {icon}
        </div>
      )}
      <h3 className="font-headline text-lg font-semibold text-ink">
        {title}
      </h3>
      {description && (
        <p className="max-w-sm text-sm text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// Mono id with copy-to-clipboard (used in the webhook event log).
export function CopyMono({ value, display }: { value: string; display: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="group inline-flex items-center gap-1.5 rounded-none border border-line bg-surface px-2 py-1 font-mono text-xs text-ink-soft hover:border-ink hover:text-ink"
      title={value}
    >
      {display}
      {copied ? (
        <Check size={12} className="text-glow" />
      ) : (
        <Copy size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

export function Money({
  minor,
  currency = "USD",
  className,
}: {
  minor: number;
  currency?: string;
  className?: string;
}) {
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(minor / 100)}
    </span>
  );
}
