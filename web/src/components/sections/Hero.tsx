import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Lock,
  Check,
  Plus,
  PencilLine,
  Send,
  Eye,
  PenLine,
  BadgeCheck,
} from "lucide-react";
import { Mark } from "@/components/ui/Logo";
import { computeTotals, formatMoney, cn } from "@/lib/utils";
import type { LineItem } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// Monochrome editorial hero. A single status-pipeline drives everything: an
// amber dot steps slowly through draft → sent → viewed → approved →
// deposit_paid along an asymmetric inked curve (vertical on mobile), pausing
// at each node, finishing with a success tick. The invoice card on the left
// mirrors whatever stage the dot is resting on. Lone accent = the amber dot.
// ─────────────────────────────────────────────────────────────────────────

const INK = "#16181C";
const PAPER = "#F2F0EB";
const GLOW = "#C99A4B";
const EASE = [0.16, 1, 0.3, 1] as const;

const PIPELINE = ["draft", "sent", "viewed", "approved", "paid"] as const;
const FRACTIONS = [0, 0.26, 0.52, 0.76, 1];

// step timing (ms) — deliberately slow with a dwell at each stage
const MOVE_MS = 1200;
const DWELL_MS = 1500;
const TICK_DWELL_MS = 2600;
const RESET_MS = 700;

// software-service quote
const DEMO_ITEMS: LineItem[] = [
  { _id: "li_fe", label: "Frontend — React app", description: null, qty: 1, unitPrice: 480_000, taxRate: 0, type: "standard", selected: true, tierGroup: null },
  { _id: "li_be", label: "Backend API + database", description: null, qty: 1, unitPrice: 360_000, taxRate: 0, type: "standard", selected: true, tierGroup: null },
  { _id: "li_bill", label: "Stripe billing (optional)", description: "optional", qty: 1, unitPrice: 150_000, taxRate: 0, type: "optional", selected: false, tierGroup: null },
];

export function Hero() {
  const navigate = useNavigate();

  const [stage, setStage] = useState(0);
  const [showTick, setShowTick] = useState(false);

  // master stepper — slow, dwells per stage, tick at the end, then loops
  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      await sleep(900);
      while (!cancelled) {
        for (let i = 0; i < PIPELINE.length; i++) {
          if (cancelled) return;
          setStage(i);
          if (i === PIPELINE.length - 1) {
            await sleep(MOVE_MS);
            if (cancelled) return;
            setShowTick(true);
            await sleep(TICK_DWELL_MS);
          } else {
            await sleep(MOVE_MS + DWELL_MS);
          }
        }
        if (cancelled) return;
        setShowTick(false);
        setStage(0);
        await sleep(RESET_MS);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // subtle pointer parallax on the card
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 110, damping: 18 });
  const sy = useSpring(py, { stiffness: 110, damping: 18 });
  const rotX = useTransform(sy, [-0.5, 0.5], [6, -6]);
  const rotY = useTransform(sx, [-0.5, 0.5], [-7, 7]);
  const onMove = useCallback((e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }, [px, py]);
  const onLeave = useCallback(() => { px.set(0); py.set(0); }, [px, py]);

  return (
    <section
      className="relative isolate overflow-hidden pb-20 pt-8 lg:min-h-[calc(100vh-4rem)] lg:pb-16 lg:pt-10"
      style={{ backgroundColor: PAPER }}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(22,24,28,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(22,24,28,0.035) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
        }}
      />

      <div
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="container-site grid grid-cols-1 items-center gap-y-8 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-12 lg:gap-x-8 lg:gap-y-14"
      >
        {/* ════════ LEFT — invoice card mirroring the live stage ════════ */}
        <div className="order-2 flex flex-col items-center lg:order-1 lg:col-span-4 lg:col-start-1 lg:row-start-1 lg:items-start">
          <p className="mb-6 hidden font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#565A61] lg:block">
            Quote-to-Deposit System
          </p>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            className="relative w-full max-w-[348px]"
            style={{ perspective: 1300 }}
          >
            <div className="absolute inset-0 translate-x-3 translate-y-3 border" style={{ borderColor: "rgba(22,24,28,0.12)" }} />
            <motion.div style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }} className="relative">
              <InvoiceCard stage={stage} />
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-6 max-w-[348px] text-center font-sans text-[13px] leading-relaxed text-[#565A61] lg:text-left"
          >
            Line <span className="font-semibold text-[#16181C]">items</span>, a real{" "}
            <span className="font-semibold text-[#16181C]">e-signature</span>, and a{" "}
            <span className="font-semibold text-[#16181C]">Stripe deposit</span> in one shareable
            link — advanced by a server-authoritative state machine, not a redirect you trust.
          </motion.p>
        </div>

        {/* ════════ RIGHT — asymmetric timeline headline ════════ */}
        <div className="order-1 flex flex-col lg:order-2 lg:col-span-8 lg:col-start-5 lg:row-start-1">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: EASE }}
            className="self-center font-headline font-medium leading-[0.95] tracking-[-0.02em] text-[#16181C] lg:self-end lg:pr-[0.4em]"
            style={{ fontSize: "clamp(1.85rem, 7vw, 4rem)" }}
          >
            From estimate
          </motion.span>

          <Connector stage={stage} showTick={showTick} />

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease: EASE }}
            className="self-center font-headline font-bold leading-[0.86] tracking-[-0.04em] text-[#16181C] lg:self-start"
            style={{ fontSize: "clamp(2.5rem, 11.5vw, 7.6rem)" }}
          >
            to paid deposit<span style={{ color: GLOW }}>.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
            className="mt-7 flex flex-col items-center gap-4 sm:flex-row lg:mt-11 lg:items-center lg:justify-start lg:gap-5 lg:self-start"
          >
            <button
              onClick={() => navigate("/sandbox-login")}
              className="group inline-flex items-center gap-2.5 px-7 py-3.5 font-grotesk text-sm font-medium text-[#F2F0EB] transition-colors"
              style={{ backgroundColor: INK }}
            >
              Start your sandbox
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate("/how-it-works")}
              className="group inline-flex items-center gap-2 border-b border-[#16181C] pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#16181C] transition-colors hover:border-[#C99A4B] hover:text-[#565A61]"
            >
              Explore the flow
              <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Connector — measures its own path, samples the 5 stage nodes off it, then
// animates the amber dot to whichever node `stage` points at (instant rewind
// on reset). Renders horizontally on desktop, vertically on mobile so the
// stage labels stay readable on small screens.
// ─────────────────────────────────────────────────────────────────────────
function useIsDesktop() {
  const [d, setD] = useState(true);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const on = () => setD(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return d;
}

const PATH_DESKTOP = "M740 26 C 648 70, 612 20, 478 56 C 372 84, 338 36, 214 66 C 132 86, 92 98, 20 98";
const PATH_MOBILE = "M344 54 C 280 92, 248 34, 184 68 C 128 98, 100 50, 16 82";

function Connector({ stage, showTick }: { stage: number; showTick: boolean }) {
  const desktop = useIsDesktop();
  const pathRef = useRef<SVGPathElement>(null);
  const [pts, setPts] = useState<{ x: number; y: number }[]>([]);
  const lensRef = useRef<number[]>([]);
  const totalRef = useRef(0);
  const prevStage = useRef(0);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const len = useMotionValue(0);
  const cx = useMotionValue(0);
  const cy = useMotionValue(0);
  // visible trail = how far the dot has travelled (0 at draft → 1 at paid)
  const progress = useTransform(len, (l) => (totalRef.current ? Math.min(1, l / totalRef.current) : 0));

  const view = desktop ? { w: 760, h: 120 } : { w: 360, h: 122 };

  // measure path → node points + lengths
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    totalRef.current = total;
    const lens = FRACTIONS.map((f) => f * total);
    const points = lens.map((l) => {
      const p = path.getPointAtLength(l);
      return { x: p.x, y: p.y };
    });
    lensRef.current = lens;
    setPts(points);
    const i = stageRef.current;
    len.set(lens[i]);
    cx.set(points[i].x);
    cy.set(points[i].y);
    const unsub = len.on("change", (l) => {
      const p2 = path.getPointAtLength(l);
      cx.set(p2.x);
      cy.set(p2.y);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop]);

  // drive the dot to the active stage node
  useEffect(() => {
    const lens = lensRef.current;
    if (!lens.length) return;
    const target = lens[stage];
    const prev = prevStage.current;
    prevStage.current = stage;
    if (stage < prev) {
      len.set(target); // instant rewind on loop reset
      return;
    }
    const controls = animate(len, target, { duration: MOVE_MS / 1000, ease: EASE });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, pts]);

  const last = PIPELINE.length - 1;
  const ready = pts.length > 0;

  const containerStyle = desktop
    ? { aspectRatio: "760 / 120", width: "100%" }
    : { aspectRatio: "360 / 122", width: "100%" };

  return (
    <div className="relative my-1 lg:my-3" style={containerStyle}>
      <svg viewBox={`0 0 ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full overflow-visible" fill="none">
        <defs>
          <filter id="pl-glow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="4.5" />
          </filter>
        </defs>

        {/* inked trail — grows with the dot, complete only at deposit_paid */}
        <motion.path
          ref={pathRef}
          d={desktop ? PATH_DESKTOP : PATH_MOBILE}
          stroke={INK}
          strokeWidth={desktop ? 1.4 : 1.6}
          strokeLinecap="round"
          style={{ pathLength: progress }}
        />

        {ready && pts.map((p, i) => {
          const active = i === stage;
          const done = i < stage;
          // label placement — above on desktop; alternating above/below on
          // mobile so dense horizontal labels never collide
          type Anchor = "start" | "middle" | "end";
            const lbl = desktop
            ? { x: p.x, y: p.y - 15, anchor: (p.x > 600 ? "end" : p.x < 160 ? "start" : "middle") as Anchor }
            : { x: p.x, y: i % 2 === 0 ? p.y + 25 : p.y - 11, anchor: (p.x > 300 ? "end" : p.x < 70 ? "start" : "middle") as Anchor };
          return (
            <g key={PIPELINE[i]}>
              {/* node tick */}
              <circle
                cx={p.x}
                cy={p.y}
                r={i === last ? 3.4 : 2.4}
                fill={done || active ? INK : "#A7A39B"}
              />
              {/* label */}
              <text
                x={lbl.x}
                y={lbl.y}
                textAnchor={lbl.anchor}
                fill={active ? INK : done ? "#565A61" : "#9A968E"}
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: desktop ? 12 : 9.5,
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  transition: "fill 0.4s ease",
                }}
              >
                {PIPELINE[i]}
              </text>
            </g>
          );
        })}

        {/* destination glow */}
        {ready && (
          <circle cx={pts[last].x} cy={pts[last].y} r="6" fill={GLOW} filter="url(#pl-glow)" opacity={showTick ? 0.6 : 0.25}>
            <animate attributeName="opacity" values="0.2;0.55;0.2" dur="2.2s" repeatCount="indefinite" />
          </circle>
        )}

        {/* moving dot (hidden once the success tick is shown) */}
        {ready && (
          <g style={{ opacity: showTick ? 0 : 1, transition: "opacity 0.3s ease" }}>
            <motion.circle cx={cx} cy={cy} r="8" fill={GLOW} opacity="0.4" filter="url(#pl-glow)" />
            <motion.circle cx={cx} cy={cy} r="3.6" fill={GLOW} />
          </g>
        )}

        {/* success tick at the final node */}
        {ready && (
          <AnimatePresenceTick show={showTick} cx={pts[last].x} cy={pts[last].y} />
        )}
      </svg>
    </div>
  );
}

function AnimatePresenceTick({ show, cx, cy }: { show: boolean; cx: number; cy: number }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.g
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <circle cx={cx} cy={cy} r="9" fill={GLOW} />
          <motion.path
            d={`M ${cx - 4.2} ${cy + 0.2} l 2.8 3 l 5.2 -6`}
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          />
        </motion.g>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Invoice card — a software-service quote that morphs through the pipeline.
// Quote body is stable; the status pill + the bottom "state zone" change to
// reflect the stage the dot is resting on.
// ─────────────────────────────────────────────────────────────────────────
function InvoiceCard({ stage }: { stage: number }) {
  const hair = "rgba(242,240,235,0.12)";
  // client marks the optional add-on at the "viewed" stage → totals recompute
  const optionalOn = stage >= 2;
  const items = DEMO_ITEMS.map((li) => (li.type === "optional" ? { ...li, selected: optionalOn } : li));
  const totals = computeTotals(items, "percent", 30);

  return (
    <div className="relative overflow-hidden p-5" style={{ backgroundColor: INK, color: PAPER, boxShadow: "0 34px 70px -28px rgba(22,24,28,0.6)" }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(242,240,235,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(242,240,235,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative">
        {/* header */}
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: hair }}>
          <span className="flex items-center gap-2">
            <Mark size={20} tone="paper" />
            <span className="font-grotesk text-[13px] font-medium">Northwind Labs</span>
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F2F0EB]/55">
            <Lock size={9} /> secure
          </span>
        </div>

        {/* title + live status pill */}
        <div className="mt-4 flex items-center justify-between">
          <h3 className="font-grotesk text-base font-semibold leading-none">Web app · MVP build</h3>
          <AnimatePresence mode="wait">
            <motion.span
              key={PIPELINE[stage]}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
              className="inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[9px] lowercase tracking-wide"
              style={{ borderColor: stage === 4 ? GLOW : "rgba(242,240,235,0.25)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage === 4 ? GLOW : "rgba(242,240,235,0.5)" }} />
              {PIPELINE[stage]}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* line items */}
        <div className="mt-4 space-y-2.5">
          {items.map((li) => {
            const optional = li.type === "optional";
            const on = li.selected;
            return (
              <div key={li._id} className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-2.5">
                  <span
                    className="flex h-3.5 w-3.5 items-center justify-center overflow-hidden border"
                    style={{
                      borderColor: on ? PAPER : "rgba(242,240,235,0.4)",
                      backgroundColor: on ? PAPER : "transparent",
                      color: on ? INK : "rgba(242,240,235,0.7)",
                      transition: "background-color 0.4s ease, border-color 0.4s ease, color 0.4s ease",
                    }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={on ? "on" : "off"}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex"
                      >
                        {on ? <Check size={9} strokeWidth={3} /> : <Plus size={9} />}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span
                    className="text-[#F2F0EB]/85"
                    style={{ opacity: optional && !on ? 0.55 : 1, transition: "opacity 0.4s ease" }}
                  >
                    {li.label}
                  </span>
                </span>
                {optional ? (
                  <OptionalPrice on={on} value={li.unitPrice} />
                ) : (
                  <span className="font-mono text-[#F2F0EB]/65">{formatMoney(li.unitPrice)}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* totals — figures roll when the optional add-on is marked */}
        <div className="mt-4 space-y-1.5 border-t pt-3 font-mono text-[12px]" style={{ borderColor: hair }}>
          <div className="flex items-center justify-between text-[#F2F0EB]/55">
            <span>Subtotal</span>
            <Money value={totals.subtotal} />
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="font-grotesk text-[13px] font-medium text-[#F2F0EB]">Deposit due (30%)</span>
            <Money value={totals.depositAmount} className="text-lg font-bold text-[#F2F0EB]" />
          </div>
        </div>

        {/* state zone — swaps with the dot's stage */}
        <div className="mt-4 h-[52px] border-t pt-3" style={{ borderColor: hair }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={PIPELINE[stage]}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <StateZone stage={stage} deposit={totals.depositAmount} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// premium rolling figure — old value slides up + blurs out, new slides in
function Money({ value, className }: { value: number; className?: string }) {
  return (
    <span className="relative inline-block overflow-hidden align-bottom leading-none">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "85%", opacity: 0, filter: "blur(3px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-85%", opacity: 0, filter: "blur(3px)" }}
          transition={{ duration: 0.5, ease: EASE }}
          className={cn("block whitespace-nowrap tabular-nums", className)}
        >
          {formatMoney(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// optional line price: two states — "+ $x" (add hint) before, "$x" after
function OptionalPrice({ on, value }: { on: boolean; value: number }) {
  return (
    <span className="relative inline-block overflow-hidden align-bottom font-mono text-[12.5px] leading-none">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={on ? "on" : "off"}
          initial={{ y: "90%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-90%", opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="block whitespace-nowrap tabular-nums"
          style={{ color: on ? "rgba(242,240,235,0.65)" : "rgba(242,240,235,0.4)" }}
        >
          {on ? formatMoney(value) : `+ ${formatMoney(value)}`}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function StateZone({ stage, deposit }: { stage: number; deposit: number }) {
  const wrap = "flex items-center gap-3";
  const ic = "flex h-7 w-7 shrink-0 items-center justify-center border";
  const icStyle = { borderColor: "rgba(242,240,235,0.25)" } as const;
  const title = "font-grotesk text-[12.5px] font-medium text-[#F2F0EB]";
  const sub = "font-mono text-[9px] uppercase tracking-[0.12em] text-[#F2F0EB]/45";

  if (stage === 0)
    return (
      <div className={wrap}>
        <span className={ic} style={icStyle}><PencilLine size={13} /></span>
        <span><span className={title + " block"}>Drafting quote</span><span className={sub}>not sent yet</span></span>
      </div>
    );
  if (stage === 1)
    return (
      <div className={wrap}>
        <span className={ic} style={icStyle}><Send size={13} /></span>
        <span><span className={title + " block"}>Approval link sent</span><span className={sub}>awaiting client</span></span>
      </div>
    );
  if (stage === 2)
    return (
      <div className={wrap}>
        <span className={ic} style={icStyle}><Eye size={13} /></span>
        <span><span className={title + " block"}>Client opened the link</span><span className={sub}>reviewing options</span></span>
      </div>
    );
  if (stage === 3)
    return (
      <div className={wrap}>
        <span className={ic} style={icStyle}><PenLine size={13} /></span>
        <span className="flex-1">
          <svg className="h-5 w-24" viewBox="0 0 120 26" fill="none" preserveAspectRatio="xMidYMid meet">
            <motion.path
              d="M6,18 C16,2 24,2 28,15 C31,24 38,5 48,12 C54,16 52,22 62,18 C72,14 78,5 92,12 C104,17 104,22 116,15"
              stroke={PAPER} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </svg>
          <span className={sub}>signed · IP + timestamp</span>
        </span>
      </div>
    );
  return (
    <div className={wrap}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center" style={{ backgroundColor: GLOW, color: INK }}>
        <BadgeCheck size={15} />
      </span>
      <span><span className={title + " block"}>Deposit captured · {formatMoney(deposit)}</span><span className={sub}>balance invoice generated</span></span>
    </div>
  );
}
