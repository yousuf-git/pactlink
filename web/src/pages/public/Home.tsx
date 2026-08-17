import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileSignature,
  CreditCard,
  GitBranch,
  Webhook,
  ListChecks,
  ReceiptText,
  Plus,
  Minus,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { Hero } from "@/components/sections/Hero";
import { Reveal, SectionHeading } from "@/components/sections/Section";
import { cn } from "@/lib/utils";

const LIFT_SHADOW = "0 30px 60px -28px rgba(22,24,28,0.16)";
const INK_SHADOW = "0 34px 70px -28px rgba(22,24,28,0.55)";

const FEATURES = [
  {
    icon: ListChecks,
    tag: "Builder",
    title: "Toggleable quote builder",
    body: "Line items, per-line and global tax, plus optional and tiered items the client can switch. Totals recompute on the server — never trusting the browser.",
    span: "lg:col-span-2",
  },
  {
    icon: FileSignature,
    tag: "Signature",
    title: "Real e-signature",
    body: "Typed or drawn, with timestamp and IP captured. Backed by DocuSeal — not a canvas blob pretending to be legal.",
  },
  {
    icon: CreditCard,
    tag: "Payments",
    title: "Stripe deposit",
    body: "Charge a fixed or % deposit on approval. Balance invoice generated automatically once the webhook confirms.",
  },
  {
    icon: Webhook,
    tag: "Webhooks",
    title: "Webhook-first money",
    body: "The browser's success redirect is advisory. Only a verified Stripe event advances a quote to deposit_paid — surviving closed tabs and retries.",
    span: "lg:col-span-2",
  },
];

const STEPS = [
  { n: "01", title: "Build the quote", body: "Add line items and mark some optional or tiered. Set a fixed or % deposit." },
  { n: "02", title: "Send one link", body: "A branded PDF and a hosted approval link go out. Status flips to sent." },
  { n: "03", title: "Client decides", body: "They toggle options, e-sign, and pay the deposit — on any device, no account." },
  { n: "04", title: "Server settles", body: "A Stripe webhook confirms, the balance invoice generates, both sides get emailed." },
];

const TESTIMONIALS = [
  {
    quote:
      "Cut our 'estimate to deposit in the bank' from nine days to about forty minutes. The client toggled down to the package they could afford and paid on the spot.",
    name: "Mara Voss",
    role: "Founder, Northwind Studio",
  },
  {
    quote:
      "I used to send a PDF, then a DocuSign, then a Stripe invoice. Three tools, three places to lose the thread. Now it's one link and the pipeline tells me exactly where every deal is.",
    name: "Travis Buchanan",
    role: "Owner, Ironwood Brewing Co.",
  },
  {
    quote:
      "The webhook event log sold my dev team. They could see every payment confirmation was idempotent — no double charges even when Stripe retried.",
    name: "Greg Halloran",
    role: "Ops, Meridian Law Partners",
  },
];

const FAQS = [
  {
    q: "Do my clients need an account?",
    a: "No. The client opens an unguessable tokenized link, toggles options, signs and pays. There is no signup on the client side, ever.",
  },
  {
    q: "Why webhook-first? Isn't the success redirect enough?",
    a: "A redirect can be spoofed or never arrive (closed tab, flaky network). PactLink only marks a deposit paid when Stripe POSTs a signature-verified event to our endpoint, and we dedupe it with a unique index so retries are no-ops.",
  },
  {
    q: "What happens to the remaining balance?",
    a: "Once the deposit is confirmed, the balance invoice is generated automatically (total minus deposit) as a Stripe invoice and emailed to the client.",
  },
  {
    q: "Can the client change the quote after agreeing?",
    a: "Optional and tiered selections lock at signature. Before that, every toggle re-computes the totals and deposit server-side.",
  },
  {
    q: "Is there a free plan?",
    a: "PactLink is in early access — no self-serve signup yet. Request access on the pricing page, or explore the full product right now in the no-signup sandbox.",
  },
];

const PROOF = [
  { id: "01", big: "3 tools → 1 link", small: "Docs + DocuSign + Stripe invoice, collapsed" },
  { id: "02", big: "100% traceable", small: "every deposit_paid maps to a logged Stripe event" },
  { id: "03", big: "0 double charges", small: "idempotent webhook log by design" },
];

export default function Home() {
  const navigate = useNavigate();
  return (
    <>
      <Hero />

      {/* ── Proof strip — real metrics, not a fake logo wall ── */}
      <section className="border-y border-line bg-paper-dim">
        <div className="container-site grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {PROOF.map((p, i) => (
            <Reveal key={p.big} delay={i * 0.06}>
              <div className="px-1 py-9 text-center sm:px-7 sm:text-left">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                  {p.id}
                </span>
                <p className="mt-3 font-headline text-2xl font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[1.7rem]">
                  {p.big}
                </p>
                <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">{p.small}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Features bento ── */}
      <section className="container-site py-24">
        <Reveal>
          <SectionHeading
            eyebrow="What it does"
            title="A quote that can take the money"
            subtitle="Not a document generator. Not a payment link. The whole agreement-to-deposit flow, wired together correctly."
          />
        </Reveal>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06} className={f.span}>
              <article
                className="group flex h-full flex-col border border-line bg-paper p-7 transition-shadow"
                style={{ boxShadow: LIFT_SHADOW }}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center border border-line text-ink transition-colors group-hover:border-ink">
                    <f.icon size={20} />
                  </span>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                    {f.tag}
                  </span>
                </div>
                <h3 className="mt-6 font-headline text-xl font-bold tracking-[-0.02em] text-ink">
                  {f.title}
                </h3>
                <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-paper-dim py-24">
        <div className="container-site">
          <Reveal>
            <SectionHeading
              eyebrow="The flow"
              title="Four steps. One of them is automatic."
              align="center"
            />
          </Reveal>
          <div className="mt-14 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="relative">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                    {s.n}
                  </span>
                  <div className="relative mt-3 h-px w-full bg-line">
                    <div className="absolute left-0 top-0 h-px w-10 bg-ink" />
                  </div>
                  <h3 className="mt-5 font-headline text-lg font-bold tracking-[-0.02em] text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">{s.body}</p>
                  {i === 3 && (
                    <span className="mt-4 inline-flex items-center gap-1.5 border border-line px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink">
                      <Webhook size={11} className="text-glow" /> No human needed
                    </span>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Differentiator: the state machine + dark ink log panel ── */}
      <section className="container-site py-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              eyebrow="The hard part, done right"
              title={<>Signature → conditional charge → balance invoice</>}
              subtitle="Most tutorial builds trust the redirect. PactLink runs a server-authoritative state machine driven by Stripe webhooks — the thing that separates a real payments build from a copy-paste."
            />
            <ul className="mt-7 space-y-3.5">
              {[
                "Signature must exist before any charge is created",
                "Only a verified webhook advances the status to deposit_paid",
                "Unique index on the event id makes retries idempotent",
                "Balance invoice is generated exactly once",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 font-sans text-sm leading-relaxed text-ink">
                  <GitBranch size={16} className="mt-0.5 shrink-0 text-ink-faint" />
                  {t}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate("/how-it-works")}
              className="group mt-8 inline-flex items-center gap-2 border-b border-ink pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:border-glow hover:text-ink-soft"
            >
              Walk through the machine
              <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </Reveal>

          <Reveal delay={0.12}>
            <div
              className="relative overflow-hidden bg-ink text-paper"
              style={{ boxShadow: INK_SHADOW }}
            >
              <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
              <div className="relative">
                <div className="flex items-center justify-between border-b border-paper/12 px-5 py-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/50">
                    state-machine.log
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-glow" /> live
                  </span>
                </div>
                <pre className="overflow-x-auto px-5 py-5 font-mono text-[11.5px] leading-relaxed text-paper/65">
{`client.sign            → signatures{...}
  quote.status         : viewed → approved
  payments{deposit}    : created (pending)
  stripe.PaymentIntent : created

`}<span className="text-paper">{`webhook payment_intent.succeeded
  webhookEvents{eventId} : insert (UNIQUE)
  payments{deposit}      : pending → succeeded
  quote.status           : approved → `}<span className="text-glow">deposit_paid</span>{`
  invoices{balance}      : created (once)
  notify owner + client  : queued`}</span>{`

`}<span className="text-paper/55">{`webhook (duplicate delivery)
  webhookEvents{eventId} : insert FAILS → deduped
  side effects           : none  ✓ idempotent`}</span>
                </pre>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-paper-dim py-24">
        <div className="container-site">
          <Reveal>
            <SectionHeading eyebrow="From the field" title="Built from a real, repeated brief" />
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <figure
                  className="flex h-full flex-col border border-line bg-paper p-7"
                  style={{ boxShadow: LIFT_SHADOW }}
                >
                  <span className="font-headline text-4xl font-bold leading-none text-ink-faint" aria-hidden>
                    &ldquo;
                  </span>
                  <blockquote className="mt-3 flex-1 font-sans text-sm leading-relaxed text-ink">
                    {t.quote}
                  </blockquote>
                  <figcaption className="mt-6 border-t border-line pt-4">
                    <p className="font-grotesk text-sm font-medium text-ink">{t.name}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                      {t.role}
                    </p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="container-site py-24">
        <Reveal>
          <SectionHeading eyebrow="Questions" title="The things people ask first" align="center" />
        </Reveal>
        <div className="mx-auto mt-12 max-w-2xl border-t border-line">
          {FAQS.map((f, i) => (
            <FaqItem key={i} {...f} />
          ))}
        </div>
      </section>

      {/* ── Final CTA — dark ink panel ── */}
      <section className="container-site pb-28">
        <Reveal>
          <div
            className="relative isolate overflow-hidden bg-ink px-8 py-16 text-center text-paper sm:px-16 sm:py-20"
            style={{ boxShadow: INK_SHADOW }}
          >
            <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-[140px]"
              style={{ backgroundColor: "rgba(201,154,65,0.16)" }}
            />
            <div className="relative">
              <p className="flex items-center justify-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/55">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
                Open access
              </p>
              <h2 className="mx-auto mt-6 max-w-2xl font-headline text-[2.1rem] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[3rem]">
                Send a quote that can take the deposit<span className="text-glow">.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg font-sans text-base leading-relaxed text-paper/70">
                Explore the full owner dashboard and client approval flow in a loaded sandbox.
                No card, no signup.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row">
                <button
                  onClick={() => navigate("/sandbox-login")}
                  className="group btn btn-on-ink"
                >
                  <ReceiptText size={17} />
                  Open the sandbox
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => navigate("/pricing")}
                  className="group inline-flex items-center gap-2 border-b border-paper pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-paper transition-colors hover:border-glow hover:text-paper/70"
                >
                  Request early access
                  <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="font-grotesk text-base font-medium text-ink transition-colors group-hover:text-ink-soft sm:text-lg">{q}</span>
        <span className="shrink-0 text-ink transition-colors group-hover:text-glow">
          {open ? <Minus size={18} /> : <Plus size={18} />}
        </span>
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <p className="overflow-hidden font-sans text-sm leading-relaxed text-ink-soft">{a}</p>
      </div>
    </div>
  );
}
