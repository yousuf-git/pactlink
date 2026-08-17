import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/sections/Section";

const UPDATED = "June 18, 2026";

type Block = { n: string; title: string; body: (string | string[])[] };

const SECTIONS: Block[] = [
  {
    n: "01",
    title: "Agreement to these terms",
    body: [
      "These Terms of Service (“Terms”) govern your use of PactLink — our website, owner dashboard, and the hosted client approval pages. By creating an account, launching the sandbox, or using the service, you agree to these Terms. If you're using PactLink for an organization, you confirm you're authorized to bind it.",
    ],
  },
  {
    n: "02",
    title: "What PactLink is",
    body: [
      "PactLink turns an estimate into a signed agreement and a paid deposit through one shareable link: a quote builder, a hosted approval page, an e-signature, and a Stripe deposit, tied together by a server-authoritative state machine.",
      "PactLink is currently in early access. Features may change, and access is granted by invitation. We may modify or discontinue parts of the service during this period.",
    ],
  },
  {
    n: "03",
    title: "Accounts & eligibility",
    body: [
      "You must provide accurate information and keep your credentials secure; you're responsible for activity under your account. You must be at least 18 and able to form a binding contract. Notify us promptly of any unauthorized use.",
    ],
  },
  {
    n: "04",
    title: "Acceptable use",
    body: [
      "Don't use PactLink to:",
      [
        "break the law, or send quotes for illegal goods or services;",
        "misrepresent who you are, or impersonate another business;",
        "upload malware, probe or disrupt the service, or bypass its limits;",
        "collect deposits you don't intend to honor, or defraud your clients.",
      ],
      "We may suspend accounts that put the platform, payments, or other users at risk.",
    ],
  },
  {
    n: "05",
    title: "Your content & your clients' data",
    body: [
      "You own the quotes, line items, branding, and client information you put into PactLink (“Your Content”). You grant us a limited license to host and process it solely to operate the service for you.",
      "You're responsible for the accuracy of your quotes and for having the right to contact the clients you add. You're the controller of your clients' data; we process it on your behalf as described in the Privacy Policy.",
    ],
  },
  {
    n: "06",
    title: "Payments, deposits & invoices",
    body: [
      "Payments are processed by Stripe under its own terms; you'll connect or use a Stripe account to collect deposits. PactLink facilitates the charge and generates the balance invoice — it is not a party to the agreement between you and your client, nor a payment institution.",
      "Deposit amounts, refunds, taxes, and the underlying work are between you and your client. Any PactLink subscription fees (once introduced) will be disclosed before they apply.",
    ],
  },
  {
    n: "07",
    title: "E-signatures",
    body: [
      "Signatures are captured through DocuSeal with a timestamp and IP for an audit trail. While electronic signatures are broadly enforceable, you are responsible for ensuring a given agreement is valid for your jurisdiction and use case. PactLink does not provide legal advice.",
    ],
  },
  {
    n: "08",
    title: "Early access / beta",
    body: [
      "The service is provided during early access on an “as available” basis. It may contain bugs, change without notice, or experience downtime. Don't rely on it as your sole record; keep your own copies of critical agreements.",
    ],
  },
  {
    n: "09",
    title: "Intellectual property",
    body: [
      "PactLink, its software, design, and marks are owned by us and protected by law. These Terms grant you a limited, non-exclusive, non-transferable right to use the service. We may use aggregated, de-identified usage data to improve the product.",
    ],
  },
  {
    n: "10",
    title: "Disclaimers & limitation of liability",
    body: [
      "To the maximum extent permitted by law, the service is provided “as is” without warranties of any kind. We are not liable for indirect, incidental, or consequential damages, or for lost profits, data, or business; our aggregate liability is limited to the greater of the fees you paid us in the prior three months or USD 100.",
      "Nothing here limits liability that cannot be limited by law.",
    ],
  },
  {
    n: "11",
    title: "Indemnification, termination & governing law",
    body: [
      "You'll defend and indemnify us against claims arising from Your Content or your misuse of the service. Either party may terminate at any time; on termination your right to use the service ends, though clauses meant to survive will. These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law rules.",
    ],
  },
  {
    n: "12",
    title: "Changes & contact",
    body: [
      "We may update these Terms; we'll revise the date above and, for material changes, give notice. Continued use means you accept the new Terms. Questions? Reach out any time.",
    ],
  },
];

export default function Terms() {
  return (
    <>
      <section className="container-site pb-12 pt-20 lg:pt-28">
        <Reveal>
          <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
            Legal · Terms
          </p>
          <h1
            className="mt-6 font-headline font-bold leading-[0.95] tracking-[-0.035em] text-ink"
            style={{ fontSize: "clamp(2.6rem, 7vw, 5rem)" }}
          >
            Terms of Service<span className="text-glow">.</span>
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            <span>Last updated · {UPDATED}</span>
            <span className="hidden h-3 w-px bg-line sm:block" />
            <span>Plain-language template, not legal advice</span>
          </div>
          <p className="mt-7 max-w-2xl font-sans text-lg leading-relaxed text-ink-soft">
            The rules for using PactLink while it's in early access — what we
            provide, what you're responsible for, and how payments and
            signatures fit together.
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
              Need something clarified before you sign up?
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
