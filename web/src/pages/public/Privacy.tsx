import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/sections/Section";

const UPDATED = "June 18, 2026";

type Block = { n: string; title: string; body: (string | string[])[] };

const SECTIONS: Block[] = [
  {
    n: "01",
    title: "Who this covers",
    body: [
      "PactLink (“PactLink,” “we,” “us”) provides a quote-to-deposit tool for service businesses. This policy explains what we collect, why, and the choices you have. It applies to our marketing site, the owner dashboard, and the hosted client approval pages.",
      "PactLink is in early access. Where a practice is still evolving, we describe our current intent; material changes are published here with a new “last updated” date.",
    ],
  },
  {
    n: "02",
    title: "Information we collect",
    body: [
      "We collect three categories of data:",
      [
        "Account data — your name, email, business name, and login credentials (stored hashed).",
        "Business content you enter — quotes, line items, client names and contact details, and the brand settings you configure. You control this data; your clients are your contacts, not ours to market to.",
        "Transaction & signature metadata — deposit amounts, quote status transitions, and, for e-signatures, the signer name, timestamp, and IP address captured at signing.",
        "Usage data — standard server logs, device/browser information, and product analytics used to keep the service reliable.",
      ],
      "We do not store full card numbers. Payment details are entered directly into Stripe (see “Processors” below).",
    ],
  },
  {
    n: "03",
    title: "How we use it",
    body: [
      "To operate the product: render quotes, send approval links, advance the draft → sent → viewed → approved → deposit_paid state machine, generate balance invoices, and email both sides at the right moments.",
      "To keep it correct and secure: verify webhooks, dedupe events, prevent fraud and abuse, and debug issues.",
      "To communicate: respond to your messages, send transactional notices, and — only if you ask — product and early-access updates. We never sell your data.",
    ],
  },
  {
    n: "04",
    title: "Processors & sub-processors",
    body: [
      "We rely on a small set of vetted providers that process data on our behalf under their own security commitments:",
      [
        "Stripe — payment processing. Card data is collected and stored by Stripe, not PactLink.",
        "DocuSeal — e-signature infrastructure for legally meaningful signing with audit metadata.",
        "Cloud hosting, email delivery, and error/analytics providers used to run and monitor the service.",
      ],
      "We share only what each provider needs to perform its function.",
    ],
  },
  {
    n: "05",
    title: "Data retention",
    body: [
      "We keep account and business content for as long as your account is active, then for a limited period afterward to meet legal, tax, and audit obligations — the webhook and signature logs that prove a deposit was handled correctly.",
      "You can request export or deletion of your data at any time; some records may be retained where the law requires it.",
    ],
  },
  {
    n: "06",
    title: "Security",
    body: [
      "Data is encrypted in transit. Access is restricted on a need-to-know basis, credentials are hashed, and payment data is isolated within Stripe. No system is perfectly secure, but correctness and auditability are core design goals, not afterthoughts.",
    ],
  },
  {
    n: "07",
    title: "Your rights & choices",
    body: [
      "Depending on where you live, you may have the right to access, correct, export, or delete your personal data, and to object to certain processing. Email us and we'll act on verified requests within a reasonable timeframe.",
      "You can opt out of non-essential email at any time using the unsubscribe link or by contacting us.",
    ],
  },
  {
    n: "08",
    title: "Cookies",
    body: [
      "We use a minimal set of cookies and similar technologies for authentication, security, and basic analytics. We do not use third-party advertising trackers.",
    ],
  },
  {
    n: "09",
    title: "International transfers & children",
    body: [
      "Your data may be processed in countries other than your own, under appropriate safeguards. PactLink is a business tool and is not directed to children under 16; we do not knowingly collect their data.",
    ],
  },
  {
    n: "10",
    title: "Changes to this policy",
    body: [
      "We'll post updates here and revise the date above. Significant changes will be highlighted. Continued use after an update means you accept the revised policy.",
    ],
  },
];

export default function Privacy() {
  return (
    <>
      <section className="container-site pb-12 pt-20 lg:pt-28">
        <Reveal>
          <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
            Legal · Privacy
          </p>
          <h1
            className="mt-6 font-headline font-bold leading-[0.95] tracking-[-0.035em] text-ink"
            style={{ fontSize: "clamp(2.6rem, 7vw, 5rem)" }}
          >
            Privacy Policy<span className="text-glow">.</span>
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            <span>Last updated · {UPDATED}</span>
            <span className="hidden h-3 w-px bg-line sm:block" />
            <span>Plain-language summary, not legal advice</span>
          </div>
          <p className="mt-7 max-w-2xl font-sans text-lg leading-relaxed text-ink-soft">
            We collect the minimum needed to turn an estimate into a signed,
            paid agreement — and we keep the audit trail that proves it was done
            right. Here is exactly what that means.
          </p>
        </Reveal>
      </section>

      <section className="container-site pb-24">
        <div className="border-t border-line">
          {SECTIONS.map((s) => (
            <Reveal key={s.n}>
              <article className="grid grid-cols-1 gap-x-8 gap-y-4 border-b border-line py-10 md:grid-cols-12">
                <div className="md:col-span-3">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                    {s.n}
                  </span>
                  <h2 className="mt-2 font-headline text-xl font-bold leading-tight tracking-[-0.02em] text-ink">
                    {s.title}
                  </h2>
                </div>
                <div className="space-y-4 md:col-span-9">
                  {s.body.map((blk, i) =>
                    Array.isArray(blk) ? (
                      <ul key={i} className="space-y-2.5">
                        {blk.map((li) => (
                          <li key={li} className="flex gap-3 font-sans text-[15px] leading-relaxed text-ink-soft">
                            <span className="mt-2 h-1 w-1 shrink-0 bg-glow" />
                            {li}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p key={i} className="font-sans text-[15px] leading-relaxed text-ink-soft">
                        {blk}
                      </p>
                    )
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-12 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <p className="font-sans text-[15px] leading-relaxed text-ink-soft">
              Questions about your data? We answer every one.
            </p>
            <Link
              to="/contact"
              className="group inline-flex items-center gap-2 border-b border-ink pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:border-glow hover:text-ink-soft"
            >
              Contact us
              <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
