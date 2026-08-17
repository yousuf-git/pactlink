import { useState } from "react";
import { Lock, CreditCard, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Money } from "@/components/ui/Misc";
import { USE_API } from "@/config/env";
import { createDepositIntent, mockConfirmDeposit, ApiError } from "@/services/api";
import type { PublicQuote } from "@/lib/types";

type Phase = "card" | "confirming" | "succeeded" | "failed";

interface Props {
  quote: PublicQuote;
  token: string;
  onPaid: (q: PublicQuote) => void;
}

// F-05/F-09 deposit step. Stripe Elements styled to FED in API mode; a faithful
// mock card form offline. Webhook-first UX: after "pay" we show a
// "Confirming payment…" state (client result is advisory) and only surface
// success once the (mock) webhook confirms. Charges whatever is currently due
// (amountDue) — the deposit first, or an owner-requested balance installment.
export function DepositStep({ quote, token, onPaid }: Props) {
  const [phase, setPhase] = useState<Phase>("card");
  const [error, setError] = useState<string | null>(null);
  const [forceFail, setForceFail] = useState(false);
  const [card, setCard] = useState({ number: "4242 4242 4242 4242", exp: "12 / 28", cvc: "123", zip: "98101" });

  // The amount the client is paying right now (deposit or a balance
  // installment the owner has requested). Falls back to the deposit.
  const dueNow = quote.amountDue > 0 ? quote.amountDue : quote.depositAmount;
  const isFirstPayment = quote.amountPaid <= 0;

  const pay = async () => {
    setError(null);
    try {
      // 1. Create the deposit intent (signature gates this — E4).
      await createDepositIntent(token);

      // 2. "Stripe processes the charge" — client result is advisory only.
      setPhase("confirming");

      if (USE_API) {
        // In real mode the backend webhook flips the status; we poll/await the
        // public quote until it reads deposit_paid. Kept simple here.
        await new Promise((r) => setTimeout(r, 1500));
        const { getPublicQuote } = await import("@/services/api");
        const fresh = await getPublicQuote(token);
        if (fresh.paid) {
          setPhase("succeeded");
          setTimeout(() => onPaid(fresh), 400);
        } else {
          setPhase("confirming"); // keep showing confirming; webhook pending
        }
        return;
      }

      // 3. Mock: simulate the authoritative Stripe webhook (success or E7 fail).
      await new Promise((r) => setTimeout(r, 1400));
      const updated = await mockConfirmDeposit(token, forceFail);
      setPhase("succeeded");
      // 450ms confirmation reveal before advancing.
      setTimeout(() => onPaid(updated), 450);
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Payment could not be completed.";
      setError(msg);
      setPhase("failed");
    }
  };

  if (phase === "succeeded") {
    return (
      <div className="relative isolate flex flex-col items-center justify-center overflow-hidden border border-ink bg-ink p-8 text-center text-paper">
        <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
        <div className="relative flex flex-col items-center">
          <div className="flex h-14 w-14 animate-settle-check items-center justify-center bg-glow text-ink">
            <CheckCircle2 size={30} />
          </div>
          <p className="mt-4 font-headline text-xl font-semibold tracking-[-0.01em] text-paper">
            Payment confirmed
          </p>
          <p className="mt-1 max-w-xs font-sans text-sm leading-relaxed text-paper/70">
            Verified by the webhook. Finalizing your agreement…
          </p>
        </div>
      </div>
    );
  }

  if (phase === "confirming") {
    return (
      <div className="flex flex-col items-center justify-center border border-line bg-paper p-8 text-center">
        <Loader2 size={28} className="animate-spin text-ink" />
        <p className="mt-4 font-headline text-lg font-semibold tracking-[-0.01em] text-ink">
          Confirming payment…
        </p>
        <p className="mt-1 max-w-xs font-sans text-sm leading-relaxed text-ink-soft">
          We're waiting for Stripe to confirm. This is authoritative — your
          payment isn't marked received until the webhook lands, even if you
          close this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-line bg-paper p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <CreditCard size={17} className="text-ink" />
        <h3 className="font-headline text-lg font-semibold tracking-[-0.01em] text-ink">
          {isFirstPayment ? "Pay the deposit" : "Pay the requested balance"}
        </h3>
      </div>

      {/* Total / Paid to date / Remaining ledger */}
      <div className="mt-4 border border-line bg-paper-dim/60 p-4">
        <LedgerRow label="Total agreed" value={<Money minor={quote.total} currency={quote.currency} />} />
        <LedgerRow
          label="Paid to date"
          value={<Money minor={quote.amountPaid} currency={quote.currency} />}
          muted
        />
        <div className="my-2 border-t border-line" />
        <LedgerRow
          label="Remaining"
          value={<Money minor={quote.remaining} currency={quote.currency} />}
          muted
        />
      </div>

      {/* Due-now highlight — the single permitted glow accent */}
      <div className="mt-3 border border-glow/40 bg-glow/[0.06] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6a2e]">
            {isFirstPayment ? "Deposit due today" : "Installment due now"}
          </span>
          <span className="font-headline text-2xl font-bold tabular-nums text-ink">
            <Money minor={dueNow} currency={quote.currency} />
          </span>
        </div>
        {isFirstPayment && quote.remaining - dueNow > 0 && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            Balance <Money minor={quote.remaining - dueNow} currency={quote.currency} className="text-ink-faint" /> invoiced after.
          </p>
        )}
      </div>

      {error && phase === "failed" && (
        <div className="mt-4 flex items-start gap-2 border border-danger/40 bg-danger/[0.06] px-4 py-3 text-sm text-danger">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="font-sans">{error}</span>
        </div>
      )}

      {/* Mocked Stripe Elements card field, styled to FED. */}
      <div className="mt-4 space-y-3">
        <CardField
          label="Card number"
          value={card.number}
          onChange={(v) => setCard((c) => ({ ...c, number: v }))}
        />
        <div className="grid grid-cols-3 gap-3">
          <CardField
            label="Expiry"
            value={card.exp}
            onChange={(v) => setCard((c) => ({ ...c, exp: v }))}
          />
          <CardField
            label="CVC"
            value={card.cvc}
            onChange={(v) => setCard((c) => ({ ...c, cvc: v }))}
          />
          <CardField
            label="ZIP"
            value={card.zip}
            onChange={(v) => setCard((c) => ({ ...c, zip: v }))}
          />
        </div>
      </div>

      {!USE_API && (
        <label className="mt-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.02em] text-ink-soft">
          <input
            type="checkbox"
            checked={forceFail}
            onChange={(e) => setForceFail(e.target.checked)}
            className="h-3.5 w-3.5 rounded-none border-ink/30 text-ink focus:ring-ink"
          />
          Simulate a declined card (test the retry path)
        </label>
      )}

      <button className="group btn btn-solid mt-4 w-full" onClick={pay}>
        <Lock size={15} /> Pay <Money minor={dueNow} currency={quote.currency} />
      </button>

      <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        <Lock size={11} /> Secured by Stripe · your card never touches our servers
      </p>
    </div>
  );
}

function LedgerRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span
        className={`font-mono text-[11px] uppercase tracking-[0.12em] ${
          muted ? "text-ink-faint" : "text-ink-soft"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-sm font-semibold tabular-nums ${
          muted ? "text-ink-soft" : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CardField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full border border-ink/20 bg-surface px-3 font-mono text-sm tabular-nums text-ink transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
      />
    </label>
  );
}
