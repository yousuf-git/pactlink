import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Send, ArrowRight, CheckCheck, FileText, Eye, PenLine, Banknote, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader, StatusPill, CARD_SHADOW, CARD_LIFT } from "@/components/dashboard/Shared";
import { Drawer } from "@/components/ui/Drawer";
import { Money, LoadingBlock } from "@/components/ui/Misc";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { QuoteStepper } from "@/components/ui/Stepper";
import { useAsync } from "@/hooks/useAsync";
import { listQuotes, listClients, listPayments, sendQuote, requestBalancePayment } from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import type { Quote, QuoteStatus, Payment } from "@/lib/types";

const COLUMNS: { status: QuoteStatus; label: string; Icon: LucideIcon }[] = [
  { status: "draft", label: "Draft", Icon: FileText },
  { status: "sent", label: "Sent", Icon: Send },
  { status: "viewed", label: "Viewed", Icon: Eye },
  { status: "approved", label: "Approved", Icon: PenLine },
  { status: "deposit_paid", label: "Deposit paid", Icon: Banknote },
  { status: "paid_in_full", label: "Paid in full", Icon: CheckCheck },
];

export default function Pipeline() {
  const { success } = useToast();
  const { data: quotes, loading, reload } = useAsync(listQuotes, []);
  const { data: clients } = useAsync(listClients, []);
  const { data: payments, reload: reloadPayments } = useAsync(listPayments, []);
  const [active, setActive] = useState<Quote | null>(null);

  const clientName = useMemo(() => {
    const m = new Map((clients ?? []).map((c) => [c._id, c.name]));
    return (id: string) => m.get(id) ?? "—";
  }, [clients]);

  // The pending balance payment (if any) the owner has already requested for a
  // quote — used to surface "requested" state in the drawer.
  const pendingFor = useMemo(() => {
    const m = new Map<string, Payment>();
    for (const p of payments ?? []) {
      if (p.status === "pending") m.set(p.quoteId, p);
    }
    return (quoteId: string) => m.get(quoteId) ?? null;
  }, [payments]);

  const byStatus = useMemo(() => {
    const map: Record<QuoteStatus, Quote[]> = {
      draft: [],
      sent: [],
      viewed: [],
      approved: [],
      deposit_paid: [],
      paid_in_full: [],
    };
    for (const q of quotes ?? []) map[q.status].push(q);
    return map;
  }, [quotes]);

  const advanceDraft = async (q: Quote) => {
    await sendQuote(q._id);
    success("Quote sent", `Card moved to “Sent”.`);
    reload();
  };

  // Re-fetch quotes + payments; the effect below re-syncs the open drawer's
  // quote once the fresh list arrives (status/amounts may have changed).
  const refresh = () => {
    reload();
    reloadPayments();
  };

  // Keep the drawer's quote object in sync with the latest fetched list.
  useEffect(() => {
    if (!active || !quotes) return;
    const updated = quotes.find((q) => q._id === active._id);
    if (updated && updated !== active) setActive(updated);
  }, [quotes, active]);

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        eyebrow="Pipeline"
        title="Every quote, by stage"
        subtitle="Cards advance automatically as clients open, approve, and pay."
      />

      <div className="grid gap-px border border-line bg-line lg:grid-cols-6">
        {COLUMNS.map((col) => {
          const items = byStatus[col.status];
          const isWin = col.status === "deposit_paid" || col.status === "paid_in_full";
          const isFull = col.status === "paid_in_full";
          const Icon = col.Icon;
          return (
            <div key={col.status} className="min-w-[220px] bg-paper">
              {/* thin top accent — neutral hairline, glow only for the win */}
              <div className={cn("h-px w-full", isWin ? "bg-glow" : "bg-line")} />

              {/* mono column head */}
              <div
                className={cn(
                  "flex items-center justify-between px-4 py-3.5",
                  isWin && (isFull ? "bg-glow/[0.1]" : "bg-glow/[0.06]")
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em]",
                    isWin ? "text-[#8a6a2e]" : "text-ink-soft"
                  )}
                >
                  <Icon size={12} className={isWin ? "text-glow" : "text-ink-faint"} />
                  {col.label}
                </span>
                <span
                  className={cn(
                    "font-mono text-[11px] font-semibold tabular-nums",
                    isWin ? "text-[#8a6a2e]" : "text-ink-faint"
                  )}
                >
                  {String(items.length).padStart(2, "0")}
                </span>
              </div>

              <div className="space-y-3 px-3 pb-4 pt-1">
                {items.length === 0 && (
                  <p className="border border-dashed border-line px-3 py-6 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    Nothing here
                  </p>
                )}
                {items.map((q) => {
                  const remaining = Math.max(0, q.total - q.amountPaid);
                  const pct = q.total > 0 ? Math.min(100, Math.round((q.amountPaid / q.total) * 100)) : 0;
                  return (
                  <motion.button
                    key={q._id}
                    layout
                    onClick={() => setActive(q)}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    whileHover={{ y: -2, boxShadow: CARD_LIFT }}
                    style={{ boxShadow: CARD_SHADOW }}
                    className="group block w-full border border-line bg-surface p-3.5 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-headline text-sm font-semibold leading-snug tracking-[-0.01em] text-ink">
                        {q.title}
                      </p>
                      <StatusPill status={q.status} className="mt-0.5 shrink-0" />
                    </div>
                    <p className="mt-1 font-sans text-xs text-ink-soft">{clientName(q.clientId)}</p>

                    <div className="mt-3 flex items-center justify-between">
                      <Money
                        minor={q.total}
                        currency={q.currency}
                        className="font-headline text-sm font-bold tabular-nums text-ink"
                      />
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                        {formatDate(q.updatedAt)}
                      </span>
                    </div>

                    {/* Paid progress — partial (deposit_paid) shows a filled bar
                        + remaining; paid_in_full shows a full glow bar. */}
                    {q.status === "deposit_paid" && (
                      <div className="mt-3 border-t border-line pt-2.5">
                        <div className="h-1 w-full bg-line">
                          <div className="h-full bg-glow" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1.5 font-mono text-[10px] tracking-[0.02em] text-ink-faint">
                          {formatMoney(q.amountPaid, q.currency)} of {formatMoney(q.total, q.currency)} paid
                          {" · "}
                          <span className="text-ink-soft">{formatMoney(remaining, q.currency)} left</span>
                        </p>
                      </div>
                    )}
                    {q.status === "paid_in_full" && (
                      <div className="mt-3 border-t border-line pt-2.5">
                        <div className="h-1 w-full bg-glow" />
                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[#8a6a2e]">
                          Paid in full
                        </p>
                      </div>
                    )}

                    {/* mini stage indicator — monochrome, glow marks the win step */}
                    <div className="mt-3 flex gap-1">
                      {COLUMNS.map((c, i) => {
                        const rank = COLUMNS.findIndex((x) => x.status === q.status);
                        const isWinStep = c.status === "deposit_paid" || c.status === "paid_in_full";
                        return (
                          <span
                            key={c.status}
                            className={cn(
                              "h-0.5 flex-1",
                              i < rank
                                ? "bg-ink"
                                : i === rank
                                ? isWinStep
                                  ? "bg-glow"
                                  : "bg-ink"
                                : "bg-line"
                            )}
                          />
                        );
                      })}
                    </div>

                    {q.status === "draft" && (
                      <button
                        className="btn btn-outline btn-sm mt-3.5 w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          advanceDraft(q);
                        }}
                      >
                        <Send size={13} /> Send
                      </button>
                    )}
                  </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail drawer with stepper */}
      <Drawer open={!!active} onClose={() => setActive(null)} title={active?.title}>
        {active && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-5">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                  Client
                </p>
                <p className="mt-1 font-sans font-medium text-ink">{clientName(active.clientId)}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                  Status
                </p>
                <StatusPill status={active.status} className="mt-1" />
              </div>
            </div>

            <div className="border border-line bg-paper p-4" style={{ boxShadow: CARD_SHADOW }}>
              <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                Lifecycle
              </p>
              <QuoteStepper quote={active} />
            </div>

            {/* Payment breakdown */}
            <PaymentBlock quote={active} pending={pendingFor(active._id)} onReload={refresh} />

            <div className="grid grid-cols-2 gap-px border border-line bg-line">
              <Stat label="Deposit" value={<Money minor={active.depositAmount} currency={active.currency} />} />
              <Stat label="Balance" value={<Money minor={active.balanceAmount} currency={active.currency} />} />
              <Stat label="Sent" value={formatDate(active.sentAt)} />
              <Stat label="Approved" value={formatDate(active.approvedAt)} />
            </div>

            <a
              href={`/q/${active.publicToken}`}
              target="_blank"
              rel="noreferrer"
              className="group btn btn-solid w-full"
            >
              Open client view
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        )}
      </Drawer>
    </>
  );
}

// Payment breakdown + "Request payment" control. The owner can request the
// remaining balance as a percentage of the total or a fixed amount; the mock
// API clamps it to the remaining and creates a pending Payment the client pays.
function PaymentBlock({
  quote,
  pending,
  onReload,
}: {
  quote: Quote;
  pending: Payment | null;
  onReload: () => void;
}) {
  const { success, error: toastError } = useToast();
  const remaining = Math.max(0, quote.total - quote.amountPaid);
  const canRequest = quote.status === "deposit_paid" && remaining > 0;

  const [mode, setMode] = useState<"percent" | "fixed">("percent");
  const [raw, setRaw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Value in the API's expected units: percent → a percentage; fixed → minor units.
  const value = mode === "percent" ? Number(raw) : Math.round(Number(raw) * 100);
  const requestedMinor =
    mode === "percent" ? Math.round((quote.total * (Number(raw) || 0)) / 100) : Math.round((Number(raw) || 0) * 100);

  const submit = async () => {
    setErr(null);
    if (!raw.trim() || Number.isNaN(value) || value <= 0) {
      setErr("Enter an amount greater than zero.");
      return;
    }
    if (requestedMinor > remaining) {
      setErr(`Cannot exceed the ${formatMoney(remaining, quote.currency)} remaining.`);
      return;
    }
    setBusy(true);
    try {
      await requestBalancePayment(quote._id, mode, value);
      success("Payment requested", "The client can now pay this balance.");
      setRaw("");
      onReload();
    } catch (e) {
      toastError("Could not request payment", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-line bg-paper p-4" style={{ boxShadow: CARD_SHADOW }}>
      <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        Payments
      </p>

      <dl className="grid grid-cols-3 gap-px border border-line bg-line">
        <Stat label="Total" value={<Money minor={quote.total} currency={quote.currency} />} />
        <Stat label="Paid to date" value={<Money minor={quote.amountPaid} currency={quote.currency} />} />
        <Stat label="Remaining" value={<Money minor={remaining} currency={quote.currency} />} />
      </dl>

      {/* Pending request the owner has already raised. */}
      {pending && (
        <div className="mt-3 flex items-center gap-2 border border-glow/50 bg-glow/[0.06] px-3 py-2.5">
          <Clock size={13} className="shrink-0 text-glow" />
          <p className="font-mono text-[11px] tracking-[0.02em] text-[#8a6a2e]">
            {formatMoney(pending.amount, quote.currency)} requested · awaiting payment
          </p>
        </div>
      )}

      {/* Request form — only when a deposit is in and a balance remains. */}
      {canRequest && !pending && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            Request payment
          </p>
          <div className="flex items-stretch gap-2">
            <SelectMenu
              value={mode === "percent" ? "Percent" : "Fixed"}
              onChange={(v) => {
                setMode(v === "Percent" ? "percent" : "fixed");
                setErr(null);
              }}
              options={["Percent", "Fixed"]}
              className="w-32 shrink-0"
            />
            <div className="relative flex-1">
              {mode === "fixed" && (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-faint">
                  $
                </span>
              )}
              <input
                inputMode="decimal"
                value={raw}
                onChange={(e) => {
                  setRaw(e.target.value);
                  setErr(null);
                }}
                placeholder={mode === "percent" ? "50" : "0.00"}
                aria-invalid={!!err}
                className={cn(
                  "h-full w-full rounded-none border bg-paper px-3 text-right font-mono text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1",
                  mode === "fixed" && "pl-7",
                  err
                    ? "border-danger focus:border-danger focus:ring-danger"
                    : "border-ink/20 focus:border-ink focus:ring-ink"
                )}
              />
              {mode === "percent" && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-faint">
                  %
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-solid btn-sm shrink-0"
              disabled={busy}
              onClick={submit}
            >
              {busy ? "…" : "Request"}
            </button>
          </div>
          {err ? (
            <p className="mt-1.5 font-mono text-xs text-danger">{err}</p>
          ) : raw.trim() && requestedMinor > 0 ? (
            <p className="mt-1.5 font-mono text-[11px] text-ink-faint">
              Requests {formatMoney(requestedMinor, quote.currency)} of {formatMoney(remaining, quote.currency)} remaining
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-surface p-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-medium tabular-nums text-ink">{value}</p>
    </div>
  );
}
