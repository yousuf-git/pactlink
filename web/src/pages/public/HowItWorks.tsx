import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PencilRuler,
  Send,
  Eye,
  FileSignature,
  CreditCard,
  Webhook,
  ArrowRight,
  Repeat,
  Clock,
  Lock,
  ListChecks,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/sections/Section";

const EASE = [0.16, 1, 0.3, 1] as const;

const STAGES = [
  {
    icon: PencilRuler,
    actor: "Owner",
    state: "draft",
    title: "Build the quote",
    body: "Add line items with per-line tax. Mark add-ons optional, or group choices as tiered. Set a fixed or percentage deposit. Save → status draft.",
  },
  {
    icon: Send,
    actor: "Owner",
    state: "sent",
    title: "Send one link",
    body: "PactLink renders a branded PDF and a hosted approval link, then emails the client. Status → sent, and the time-to-approval clock starts.",
  },
  {
    icon: Eye,
    actor: "Client",
    state: "viewed",
    title: "Open & adjust",
    body: "First open records a viewed event and notifies you. The client toggles optional/tiered items; totals and the deposit recompute server-side on every change.",
  },
  {
    icon: FileSignature,
    actor: "Client",
    state: "approved",
    title: "E-sign",
    body: "Typed or drawn signature, timestamp and IP captured. Status → approved, the selection locks, and the signature gates everything that follows.",
  },
  {
    icon: CreditCard,
    actor: "Client",
    state: "confirming",
    title: "Pay the deposit",
    body: "Stripe Elements collects the card. The browser shows ‘confirming payment…’ — it never flips the status itself.",
  },
  {
    icon: Webhook,
    actor: "System",
    state: "deposit_paid",
    title: "Webhook settles it",
    body: "A verified payment_intent.succeeded advances the quote to deposit_paid, generates the balance invoice, and emails both parties. Idempotently.",
  },
];

const EDGE_CASES = [
  { icon: Webhook, title: "Client closes the tab after paying", body: "The webhook still completes the transition and generates the balance invoice server-side." },
  { icon: Repeat, title: "Stripe retries a delivery", body: "A unique index on the event id makes the duplicate a no-op — no double charge, no duplicate invoice." },
  { icon: CreditCard, title: "Payment fails", body: "The deposit is marked failed, the quote stays approved, the client can retry, and the owner is notified." },
  { icon: Clock, title: "Link expired", body: "The page returns a clear ‘link expired, contact sender’ instead of leaking quote data." },
  { icon: Lock, title: "Payment attempted before signing", body: "Refused with ‘sign before paying.’ The state machine won't advance without a signature." },
  { icon: ListChecks, title: "Tiered group left unselected", body: "Signing is blocked until one option per group is chosen." },
];

const PIPELINE = ["draft", "sent", "viewed", "approved", "deposit_paid"] as const;

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <>
      {/* ════════ HEADER ════════ */}
      <section className="container-site pb-14 pt-16 lg:pb-20 lg:pt-24">
        <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-8">
            <Reveal>
              <p className="mb-5 flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
                How it works
              </p>
              <h1 className="max-w-4xl font-headline text-[2.4rem] font-bold leading-[0.95] tracking-[-0.035em] text-ink sm:text-[3.4rem] lg:text-[4.2rem]">
                From a blank quote to a confirmed deposit<span className="text-glow">.</span>
              </h1>
              <p className="mt-6 max-w-2xl font-sans text-lg leading-relaxed text-ink-soft">
                Three actors, one link: the owner builds and sends, the client
                decides and pays, and the system — driven by Stripe webhooks — moves
                the money and the paperwork.
              </p>
            </Reveal>
          </div>

          {/* actor legend */}
          <div className="lg:col-span-4 lg:pt-12">
            <Reveal delay={0.12}>
              <div className="border-t border-line pt-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                  Cast
                </p>
                <ul className="mt-4 space-y-3">
                  {[
                    ["01", "Owner", "builds & sends"],
                    ["02", "Client", "decides & pays"],
                    ["03", "System", "settles the money"],
                  ].map(([id, role, what]) => (
                    <li key={id} className="flex items-baseline gap-3">
                      <span className="font-mono text-[11px] tracking-[0.16em] text-ink-faint">
                        {id}
                      </span>
                      <span className="font-grotesk text-sm font-medium text-ink">
                        {role}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                        {what}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════ NUMBERED STEPS ════════ */}
      <section className="bg-paper-dim">
        <div className="container-site py-16 lg:py-24">
          <Reveal>
            <p className="mb-12 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
              The flow · six moves, one link
            </p>
          </Reveal>

          <div className="divide-y divide-line border-y border-line">
            {STAGES.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.05}>
                <article className="group grid grid-cols-1 items-start gap-x-8 gap-y-5 py-9 md:grid-cols-12">
                  {/* step index */}
                  <div className="flex items-baseline gap-4 md:col-span-3">
                    <span className="font-headline text-5xl font-bold leading-none tracking-[-0.03em] text-ink/15 transition-colors group-hover:text-ink/30">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                      {s.actor}
                    </span>
                  </div>

                  {/* title + icon */}
                  <div className="md:col-span-4">
                    <s.icon className="mb-3 text-ink" size={22} strokeWidth={1.6} />
                    <h3 className="font-headline text-xl font-bold leading-tight tracking-[-0.02em] text-ink">
                      {s.title}
                    </h3>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                      status → {s.state}
                    </p>
                  </div>

                  {/* body */}
                  <div className="md:col-span-5">
                    <p className="font-sans text-[15px] leading-relaxed text-ink-soft">
                      {s.body}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ DARK INK PANEL — state machine / webhook emphasis ════════ */}
      <section className="container-site py-16 lg:py-24">
        <Reveal>
          <div
            className="relative isolate overflow-hidden bg-ink p-7 text-paper sm:p-10 lg:p-14"
            style={{ boxShadow: "0 34px 70px -28px rgba(22,24,28,0.55)" }}
          >
            <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />

            <div className="relative grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-12">
              <div className="lg:col-span-5">
                <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/55">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
                  Server-authoritative
                </p>
                <h2 className="mt-5 font-headline text-[1.9rem] font-bold leading-[1.02] tracking-[-0.025em] text-paper sm:text-[2.4rem]">
                  The status is a state machine, not a redirect you trust.
                </h2>
                <p className="mt-5 max-w-md font-sans text-[15px] leading-relaxed text-paper/65">
                  Each transition is gated and recorded on the server. The browser
                  can show progress, but only a verified Stripe webhook moves a quote
                  to <span className="font-mono text-[13px] text-glow">deposit_paid</span>.
                </p>
              </div>

              {/* state-machine log */}
              <div className="lg:col-span-7">
                <div className="flex items-center justify-between border-b border-paper/15 pb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">
                    state machine
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/35">
                    transitions.log
                  </span>
                </div>

                {/* pipeline */}
                <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3">
                  {PIPELINE.map((state, i) => (
                    <span key={state} className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[11px] tracking-[0.06em]"
                        style={{
                          borderColor: i === PIPELINE.length - 1 ? "#C99A4B" : "rgba(242,240,235,0.5)",
                          color: i === PIPELINE.length - 1 ? "#C99A4B" : "rgba(242,240,235,0.95)",
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: i === PIPELINE.length - 1 ? "#C99A4B" : "rgba(242,240,235,0.75)" }}
                        />
                        {state}
                      </span>
                      {i < PIPELINE.length - 1 && (
                        <ArrowRight size={13} className="text-paper/35" />
                      )}
                    </span>
                  ))}
                </div>

                {/* webhook log lines */}
                <div className="mt-8 space-y-2 border-t border-paper/15 pt-6">
                  {[
                    ["POST", "/webhooks/stripe", "payment_intent.succeeded · verified"],
                    ["TXN", "approved → deposit_paid", "balance invoice generated"],
                    ["IDEMPOTENT", "duplicate event id", "no-op · 200"],
                  ].map(([tag, path, note], i) => (
                    <motion.div
                      key={path}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.45, ease: EASE, delay: i * 0.12 }}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] leading-relaxed"
                    >
                      <span className="border border-paper/25 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-paper/55">
                        {tag}
                      </span>
                      <span className="text-paper/85">{path}</span>
                      <span className="text-paper/45">{note}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════ EDGE CASES ════════ */}
      <section className="container-site pb-16 lg:pb-24">
        <Reveal>
          <SectionHeading
            eyebrow="The details that matter"
            title="The cases tutorial builds skip"
          />
        </Reveal>
        <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2">
          {EDGE_CASES.map((e, i) => (
            <Reveal key={e.title} delay={(i % 2) * 0.06}>
              <div className="group flex h-full items-start gap-4 bg-paper p-7 transition-colors hover:bg-paper-dim">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-line text-ink transition-colors group-hover:border-ink">
                  <e.icon size={19} strokeWidth={1.7} />
                </span>
                <div>
                  <h3 className="font-headline text-lg font-bold leading-tight tracking-[-0.01em] text-ink">
                    {e.title}
                  </h3>
                  <p className="mt-2 font-sans text-[14px] leading-relaxed text-ink-soft">{e.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ════════ CTA — dark ink slab ════════ */}
      <section className="container-site pb-24">
        <Reveal>
          <div
            className="relative isolate overflow-hidden bg-ink px-7 py-12 text-paper sm:px-12 sm:py-14"
            style={{ boxShadow: "0 34px 70px -28px rgba(22,24,28,0.55)" }}
          >
            <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-xl">
                <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/50">
                  Run it yourself
                </p>
                <h2 className="font-headline text-[2rem] font-bold leading-[1.02] tracking-[-0.025em] text-paper sm:text-[2.6rem]">
                  Try the whole flow.
                </h2>
                <p className="mt-4 max-w-md font-sans text-[15px] leading-relaxed text-paper/65">
                  Build a quote and approve it as the client — end to end, offline.
                </p>
              </div>
              <button
                onClick={() => navigate("/sandbox-login")}
                className="group btn btn-on-ink shrink-0"
              >
                Open the sandbox
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
