import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { PenLine, Type, Undo2, Eraser, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn, formatDate } from "@/lib/utils";
import type { SignatureMethod } from "@/lib/types";

interface Props {
  signerName: string;
  onNameChange: (name: string) => void;
  onSign: (data: { method: SignatureMethod; signatureData: string }) => void;
  signing: boolean;
}

// F-04 signature pad: Type tab (Fraunces preview) + Draw tab (signature_pad
// canvas with clear/undo). Legal line shows captured timestamp + IP.
export function SignaturePadCard({
  signerName,
  onNameChange,
  onSign,
  signing,
}: Props) {
  const [tab, setTab] = useState<SignatureMethod>("typed");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [hasDrawing, setHasDrawing] = useState(false);

  // Initialize the canvas pad when the Draw tab is active.
  useEffect(() => {
    if (tab !== "drawn" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    // Handle device pixel ratio for crisp strokes.
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    ctx?.scale(ratio, ratio);

    const pad = new SignaturePad(canvas, {
      penColor: "#16181C",
      backgroundColor: "rgba(255,255,255,0)",
      minWidth: 0.8,
      maxWidth: 2.2,
    });
    pad.addEventListener("endStroke", () => setHasDrawing(!pad.isEmpty()));
    padRef.current = pad;
    return () => {
      pad.off();
      padRef.current = null;
    };
  }, [tab]);

  const clear = () => {
    padRef.current?.clear();
    setHasDrawing(false);
  };

  const undo = () => {
    const pad = padRef.current;
    if (!pad) return;
    const data = pad.toData();
    if (data.length) {
      data.pop();
      pad.fromData(data);
      setHasDrawing(!pad.isEmpty());
    }
  };

  const submit = () => {
    if (tab === "typed") {
      if (signerName.trim().length < 2) return;
      onSign({ method: "typed", signatureData: signerName.trim() });
    } else {
      const pad = padRef.current;
      if (!pad || pad.isEmpty()) return;
      onSign({ method: "drawn", signatureData: pad.toDataURL("image/png") });
    }
  };

  const canSubmit =
    tab === "typed" ? signerName.trim().length >= 2 : hasDrawing;

  return (
    <div className="border border-line bg-paper p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <PenLine size={17} className="text-ink" />
        <h3 className="font-headline text-lg font-semibold tracking-[-0.01em] text-ink">
          Sign to approve
        </h3>
      </div>

      <Input
        label="Full legal name"
        placeholder="Type your name"
        value={signerName}
        onChange={(e) => onNameChange(e.target.value)}
        className="mt-4"
      />

      {/* Tabs */}
      <div className="mt-4 inline-flex border border-line bg-paper-dim/60 p-1">
        {(["typed", "drawn"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
              tab === t ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            )}
          >
            {t === "typed" ? <Type size={13} /> : <PenLine size={13} />}
            {t === "typed" ? "Type" : "Draw"}
          </button>
        ))}
      </div>

      {tab === "typed" ? (
        <div className="mt-3 flex h-28 items-center justify-center border border-line bg-surface px-4">
          <span
            className={cn(
              "font-display text-3xl italic",
              signerName ? "text-ink" : "text-ink-faint"
            )}
          >
            {signerName || "Your signature"}
          </span>
        </div>
      ) : (
        <div className="mt-3">
          <div className="relative h-28 overflow-hidden border border-line bg-surface">
            <canvas ref={canvasRef} className="h-full w-full touch-none" />
            {!hasDrawing && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-sans text-sm text-ink-faint">
                Draw your signature here
              </span>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={undo}
              disabled={!hasDrawing}
              className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Undo2 size={13} /> Undo
            </button>
            <button
              onClick={clear}
              disabled={!hasDrawing}
              className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eraser size={13} /> Clear
            </button>
          </div>
        </div>
      )}

      <p className="mt-3 font-sans text-xs leading-relaxed text-ink-soft">
        By signing you agree to this quote and authorize the deposit charge.
        Signed by{" "}
        <span className="font-medium text-ink">{signerName || "—"}</span>{" "}
        · {formatDate(new Date().toISOString(), true)} · IP captured at signing.
      </p>

      <button
        className="group btn btn-solid mt-4 w-full"
        onClick={submit}
        disabled={!canSubmit || signing}
      >
        {signing && <Loader2 size={16} className="animate-spin" />}
        Sign &amp; continue to payment
      </button>
    </div>
  );
}
