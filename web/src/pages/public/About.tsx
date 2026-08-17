import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Workflow, HeartHandshake, ArrowRight } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/sections/Section";

const EASE = [0.16, 1, 0.3, 1] as const;

const VALUES = [
  {
    no: "01",
    icon: ShieldCheck,
    title: "The money must be handled correctly",
    body: "Every design decision defers to correctness. Server-authoritative state, idempotent webhooks, signature before charge. Trust is the product.",
  },
  {
    no: "02",
    icon: Workflow,
    title: "Collapse the workflow, not add to it",
    body: "We replace three tools with one link. If a feature adds a step instead of removing one, it doesn't ship.",
  },
  {
    no: "03",
    icon: HeartHandshake,
    title: "The client owes nothing to use it",
    body: "No account, no app, no friction. A stranger should be able to trust a PactLink page enough to sign and pay in minutes.",
  },
];

const MILESTONES: [string, string][] = [
  ["The brief", "Built from one of the most repeated freelance requests: quote → signature → deposit, in one flow."],
  ["The hard part", "Shipped the webhook-first state machine that ties signature to a conditional Stripe charge to a balance invoice."],
  ["The proof", "Instrumented a funnel — viewed vs approved vs deposit-paid — and an idempotent event log to prove correctness."],
  ["Early access", "Onboarding service businesses by invitation while the core stays small and sharp."],
];

export default function About() {
  const navigate = useNavigate();
  return (
    <>
      {/* ════════ HERO — editorial display headline + right-set body ════════ */}
      <section className="container-site pb-12 pt-20 lg:pb-16 lg:pt-28">
        <Reveal>
          <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
            About PactLink
          </p>
        </Reveal>
        <div className="mt-7 grid grid-cols-1 items-end gap-x-10 gap-y-7 lg:grid-cols-12">
          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
            className="font-headline font-bold leading-[1.0] tracking-[-0.035em] text-ink lg:col-span-8"
            style={{ fontSize: "clamp(2.2rem, 5.4vw, 4.3rem)" }}
          >
            We turn the gap between &ldquo;quote sent&rdquo; and
            <span className="text-ink-soft"> money in the account</span>
            <span className="text-glow">.</span>
          </motion.h1>
          <Reveal delay={0.18} className="lg:col-span-4">
            <p className="border-t border-line pt-5 font-sans text-base leading-relaxed text-ink-soft">
              Service businesses lose deals in the handoffs — document tool, then
              signature tool, then invoice tool. PactLink was built to delete those
              handoffs and prove, with an audit trail, that the deposit was handled
              right.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ════════ PRINCIPLES — three editorial cards on dim band ════════ */}
      <section className="bg-paper-dim">
        <div className="container-site py-20 lg:py-24">
          <Reveal>
            <SectionHeading eyebrow="What we believe" title="Three principles we don't bend" />
          </Reveal>
          <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-3">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08} className="h-full">
                <article
                  className="group flex h-full flex-col bg-paper p-7 transition-shadow lg:p-8"
                  style={{ boxShadow: "0 30px 60px -28px rgba(22,24,28,0.16)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                      {v.no}
                    </span>
                    <v.icon className="text-ink" size={22} strokeWidth={1.6} />
                  </div>
                  <h3 className="mt-7 font-grotesk text-lg font-semibold leading-snug text-ink">
                    {v.title}
                  </h3>
                  <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft">
                    {v.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ PATH — north-star panel + numbered timeline ════════ */}
      <section className="container-site py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <Reveal>
            <SectionHeading eyebrow="The path" title="How we got here" />
            {/* dark ink panel — the north-star metric */}
            <div className="relative mt-8 overflow-hidden bg-ink p-7 text-paper lg:p-8">
              <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
              <div className="relative">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper/45">
                  North star
                </p>
                <p className="mt-4 font-sans text-[15px] leading-relaxed text-paper/85">
                  The percentage of approved quotes where signature and deposit
                  complete in one client session, with{" "}
                  <span className="text-glow">zero manual follow-up</span>.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <ol className="relative space-y-10 border-l border-line pl-7">
              {MILESTONES.map(([title, body], i) => (
                <li key={title} className="relative">
                  <span className="absolute -left-[33px] top-1 flex h-3 w-3 items-center justify-center bg-paper">
                    <span className="h-3 w-3 border border-ink bg-paper" />
                  </span>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 font-grotesk text-lg font-semibold text-ink">
                    {title}
                  </h3>
                  <p className="mt-2 max-w-md font-sans text-sm leading-relaxed text-ink-soft">
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ════════ CTA — editorial closing band ════════ */}
      <section className="container-site pb-24">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-7 border-t border-line pt-12 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
                See it running
              </p>
              <h2 className="font-headline text-[2rem] font-bold leading-[1.02] tracking-[-0.025em] text-ink sm:text-[2.5rem]">
                The principles, in working code
              </h2>
              <p className="mt-4 font-sans text-base leading-relaxed text-ink-soft">
                The sandbox is the whole product, loaded with real example data.
              </p>
            </div>
            <div className="flex flex-col items-start gap-5 sm:items-end">
              <button
                onClick={() => navigate("/sandbox-login")}
                className="group btn btn-solid"
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
