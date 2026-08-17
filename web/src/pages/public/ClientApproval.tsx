import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Clock,
  AlertTriangle,
  FileWarning,
  CheckCircle2,
  ReceiptText,
  ArrowRight,
  Download,
} from "lucide-react";
import { Mark } from "@/components/ui/Logo";
import { Money, LoadingBlock } from "@/components/ui/Misc";
import { ApprovalLineItems } from "@/components/approval/ApprovalLineItems";
import { SignaturePadCard } from "@/components/approval/SignaturePadCard";
import { DepositStep } from "@/components/approval/DepositStep";
import {
  getPublicQuote,
  updatePublicSelection,
  signPublicQuote,
  ApiError,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { formatMoney } from "@/lib/utils";
import { openQuotePrintView } from "@/lib/printQuote";
import type { PublicQuote, LineItem, SignatureMethod } from "@/lib/types";

type Stage = "review" | "sign" | "pay" | "done";

// Decide the entry stage from the quote's partial-payment state. paid_in_full
// → confirmation. A pending amountDue (deposit, or an owner-requested balance
// installment) after signing → pay. A signed/paid quote with nothing left to
// collect → confirmation. Otherwise start at review.
function initialStage(q: PublicQuote): Stage {
  if (q.paidInFull) return "done";
  if (q.signed && q.amountDue > 0) return "pay";
  if (q.paid && q.remaining <= 0) return "done";
  if (q.signed) return q.amountDue > 0 ? "pay" : "done";
  return "review";
}

export default function ClientApproval() {
  const { token = "" } = useParams();
  const { error: toastError } = useToast();

  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null);
  const [stage, setStage] = useState<Stage>("review");
  const [signerName, setSignerName] = useState("");
  const [signing, setSigning] = useState(false);

  // Load the public quote (records "viewed" server-side on first open).
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPublicQuote(token)
      .then((q) => {
        if (!alive) return;
        setQuote(q);
        setSignerName(q.clientName);
        setStage(initialStage(q));
      })
      .catch((e) => {
        if (!alive) return;
        const status = e instanceof ApiError ? e.status : 500;
        const message = e instanceof Error ? e.message : "Something went wrong.";
        setLoadError({ status, message });
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  const locked = useMemo(
    () => !quote || quote.status === "approved" || quote.status === "deposit_paid",
    [quote]
  );

  const selectedIds = useCallback(
    (items: LineItem[]) => items.filter((li) => li.selected).map((li) => li._id),
    []
  );

  const handleToggle = useCallback(
    async (item: LineItem) => {
      if (!quote || locked) return;
      const next = quote.lineItems.map((li) =>
        li._id === item._id ? { ...li, selected: !li.selected } : li
      );
      try {
        const updated = await updatePublicSelection(token, selectedIds(next));
        setQuote(updated);
      } catch (e) {
        toastError("Couldn't update", e instanceof Error ? e.message : "");
      }
    },
    [quote, locked, token, selectedIds, toastError]
  );

  const handleSelectTier = useCallback(
    async (group: string, id: string) => {
      if (!quote || locked) return;
      const next = quote.lineItems.map((li) =>
        li.tierGroup === group ? { ...li, selected: li._id === id } : li
      );
      try {
        const updated = await updatePublicSelection(token, selectedIds(next));
        setQuote(updated);
      } catch (e) {
        toastError("Couldn't update", e instanceof Error ? e.message : "");
      }
    },
    [quote, locked, token, selectedIds, toastError]
  );

  const handleSign = useCallback(
    async (data: { method: SignatureMethod; signatureData: string }) => {
      if (!quote) return;
      setSigning(true);
      try {
        const updated = await signPublicQuote(token, {
          signerName: signerName.trim(),
          method: data.method,
          signatureData: data.signatureData,
        });
        setQuote(updated);
        setStage("pay");
      } catch (e) {
        toastError("Couldn't sign", e instanceof Error ? e.message : "");
      } finally {
        setSigning(false);
      }
    },
    [quote, token, signerName, toastError]
  );

  const handlePaid = useCallback((q: PublicQuote) => {
    setQuote(q);
    // If the owner has another installment pending, keep the client on the pay
    // step; otherwise show the confirmation/receipt panel.
    setStage(q.amountDue > 0 && !q.paidInFull ? "pay" : "done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleDownload = useCallback(() => {
    if (!quote) return;
    openQuotePrintView({
      title: quote.title,
      businessName: quote.businessName,
      clientName: quote.clientName,
      currency: quote.currency,
      lineItems: quote.lineItems,
      subtotal: quote.subtotal,
      taxTotal: quote.taxTotal,
      total: quote.total,
      depositAmount: quote.depositAmount,
      balanceAmount: quote.balanceAmount,
      amountPaid: quote.amountPaid,
    });
  }, [quote]);

  // ── Error / loading states ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <LoadingBlock label="Opening your quote…" />
      </div>
    );
  }

  if (loadError) {
    const expired = loadError.status === 410;
    return (
      <CenteredNotice
        icon={expired ? <Clock size={30} /> : <FileWarning size={30} />}
        title={expired ? "This link has expired" : "This link isn't valid"}
        message={
          expired
            ? "For your security, approval links expire. Please contact the sender for a fresh link."
            : "We couldn't find a quote for this link. Double-check the URL or contact the sender."
        }
        tone={expired ? "warning" : "error"}
      />
    );
  }

  if (!quote) return null;

  return (
    <div className="min-h-screen bg-paper pb-28 lg:pb-12">
      {/* Editorial ink-slab header (owner logo + faint blueprint grid) */}
      <header className="relative isolate overflow-hidden bg-ink px-4 py-7 text-paper">
        <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
        <div className="relative mx-auto flex max-w-approval items-center gap-3">
          {quote.logoUrl ? (
            <img src={quote.logoUrl} alt={quote.businessName} className="h-9 w-9 object-cover" />
          ) : (
            <Mark size={36} tone="paper" />
          )}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55">Quote from</p>
            <p className="font-headline text-lg font-semibold leading-tight text-paper">{quote.businessName}</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 border border-paper/25 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-paper/70">
            <ShieldCheck size={12} /> Secure approval
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-approval px-4 pt-6">
        {stage === "done" ? (
          <SuccessPanel quote={quote} onDownload={handleDownload} />
        ) : (
          <>
            {/* The quote "paper" card */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="border border-line bg-paper p-6 sm:p-8"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
                    Prepared for {quote.clientName}
                  </p>
                  <h1 className="mt-1.5 font-headline text-2xl font-semibold tracking-[-0.02em] text-ink">
                    {quote.title}
                  </h1>
                </div>
                <StageHint stage={stage} locked={locked} />
              </div>

              <ApprovalLineItems
                quote={quote}
                locked={locked}
                onToggle={handleToggle}
                onSelectTier={handleSelectTier}
              />

              {stage === "review" && (
                <button
                  className="group btn btn-solid mt-6 w-full"
                  onClick={() => setStage("sign")}
                >
                  Looks good — sign to approve
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </button>
              )}

              <button
                className="group btn btn-outline btn-sm mt-3 w-full"
                onClick={handleDownload}
              >
                <Download size={15} /> Download / Save as PDF
              </button>

              <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                <Lock size={11} /> Totals recomputed and verified on the server.
              </p>
            </motion.section>

            {stage === "sign" && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mt-5"
              >
                <SignaturePadCard
                  signerName={signerName}
                  onNameChange={setSignerName}
                  onSign={handleSign}
                  signing={signing}
                />
              </motion.section>
            )}

            {stage === "pay" && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mt-5"
              >
                <div className="mb-3 flex items-center gap-2 border border-line bg-paper-dim px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink">
                  <CheckCircle2 size={15} className="text-glow" />{" "}
                  {quote.amountPaid > 0
                    ? "Deposit received · balance installment requested"
                    : "Signed and approved · one step left"}
                </div>
                <DepositStep quote={quote} token={token} onPaid={handlePaid} />
              </motion.section>
            )}
          </>
        )}

        <footer className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          Powered by PactLink · signature, deposit and balance in one flow
        </footer>
      </main>

      {/* Sticky mobile summary bar */}
      {stage !== "done" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-approval items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                {quote.amountPaid > 0 ? "Due now" : "Deposit due today"}
              </p>
              <p className="font-mono text-lg font-bold tabular-nums text-ink">
                <Money
                  minor={quote.amountDue > 0 ? quote.amountDue : quote.depositAmount}
                  currency={quote.currency}
                />
              </p>
            </div>
            <button
              className="btn btn-sm btn-outline"
              onClick={() =>
                setStage((s) => (s === "review" ? "sign" : s))
              }
              disabled={stage === "pay"}
            >
              {stage === "review" ? "Sign to approve" : stage === "sign" ? "Sign above" : "Pay above"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StageHint({ stage, locked }: { stage: Stage; locked: boolean }) {
  const steps = ["Review", "Sign", "Pay"];
  const idx = stage === "review" ? 0 : stage === "sign" ? 1 : 2;
  return (
    <div className="hidden items-center gap-2 sm:flex">
      {steps.map((s, i) => (
        <span
          key={s}
          className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
            i <= idx ? "text-ink" : "text-ink-faint"
          }`}
        >
          <span
            className={`flex h-5 w-5 items-center justify-center border text-[10px] tabular-nums ${
              i < idx || locked
                ? "border-ink bg-ink text-paper"
                : i === idx
                ? "border-ink text-ink"
                : "border-line text-ink-faint"
            }`}
          >
            {i + 1}
          </span>
          {s}
          {i < steps.length - 1 && <span className="text-line">·</span>}
        </span>
      ))}
    </div>
  );
}

function SuccessPanel({
  quote,
  onDownload,
}: {
  quote: PublicQuote;
  onDownload: () => void;
}) {
  const paidInFull = quote.paidInFull;
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative isolate overflow-hidden border border-ink bg-ink p-8 text-center text-paper"
    >
      <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
      <div className="relative">
        <div className="mx-auto flex h-16 w-16 animate-settle-check items-center justify-center bg-glow text-ink">
          <CheckCircle2 size={34} />
        </div>
        <h1 className="mt-5 font-headline text-3xl font-bold tracking-[-0.02em] text-paper">
          {paidInFull ? "Paid in full" : "You're all set"}
        </h1>
        <p className="mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-paper/70">
          {paidInFull ? (
            <>
              The full{" "}
              <span className="font-mono font-semibold tabular-nums text-paper">
                {formatMoney(quote.amountPaid, quote.currency)}
              </span>{" "}
              is settled and {quote.businessName} has been notified. A receipt is on
              its way to your email.
            </>
          ) : (
            <>
              Your deposit of{" "}
              <span className="font-mono font-semibold tabular-nums text-paper">
                {formatMoney(quote.amountPaid, quote.currency)}
              </span>{" "}
              is confirmed and {quote.businessName} has been notified.{" "}
              <span className="text-paper">
                {formatMoney(quote.remaining, quote.currency)} remaining
              </span>{" "}
              — the rest will be requested by the sender.
            </>
          )}
        </p>

        <div className="mx-auto mt-7 max-w-sm space-y-2 border border-paper/15 p-5 text-left">
          <Row label="Total agreed" value={formatMoney(quote.total, quote.currency)} />
          <Row label="Paid to date" value={formatMoney(quote.amountPaid, quote.currency)} accent />
          <div className="my-1 border-t border-paper/15" />
          <Row
            label={paidInFull ? "Remaining" : "Remaining (to be invoiced)"}
            value={formatMoney(quote.remaining, quote.currency)}
            muted
          />
        </div>

        <div className="mt-6 inline-flex items-center gap-2 border border-paper/25 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/70">
          <ReceiptText size={12} />{" "}
          {paidInFull
            ? "Receipt issued automatically"
            : "Balance invoice generated automatically"}
        </div>

        <div className="mt-5">
          <button className="group btn btn-outline-on-ink btn-sm" onClick={onDownload}>
            <Download size={15} /> Download / Save as PDF
          </button>
        </div>
      </div>
    </motion.section>
  );
}

function Row({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`font-mono text-[11px] uppercase tracking-[0.12em] ${muted ? "text-paper/45" : "text-paper/75"}`}>
        {label}
      </span>
      <span
        className={`font-mono text-sm font-semibold tabular-nums ${accent ? "text-glow" : "text-paper"}`}
      >
        {value}
      </span>
    </div>
  );
}

function CenteredNotice({
  icon,
  title,
  message,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  tone: "warning" | "error";
}) {
  const iconClass = tone === "warning" ? "text-glow" : "text-ink";
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="max-w-md text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center border border-line bg-paper-dim ${iconClass}`}>
          {icon}
        </div>
        <h1 className="mt-5 font-headline text-3xl font-bold tracking-[-0.02em] text-ink">
          {title}
        </h1>
        <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">{message}</p>
        <div className="mt-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          <AlertTriangle size={12} /> No quote data is exposed on an invalid link.
        </div>
      </div>
    </div>
  );
}
