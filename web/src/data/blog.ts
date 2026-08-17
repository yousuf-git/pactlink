import type { LucideIcon } from "lucide-react";
import {
  Webhook,
  FileSignature,
  ListChecks,
  Layers,
  Repeat,
  Timer,
  Percent,
  Link2,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readMins: number;
  author: string;
  // No stock photos: each post gets an editorial icon used over a textured
  // ink "cover" tile (see BlogCover). Relevant glyph, never a generic image.
  coverIcon: LucideIcon;
  body: string[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: "webhook-first-payments",
    title: "Why we confirm deposits with webhooks, not redirects",
    excerpt:
      "The success redirect is the most-trusted, least-trustworthy signal in a payments build. Here's the failure mode it hides and how a server state machine fixes it.",
    category: "Engineering",
    date: "2026-05-28",
    readMins: 7,
    author: "Mara Voss",
    coverIcon: Webhook,
    body: [
      "When a client pays a deposit, Stripe redirects their browser back to a success URL. It is tempting to flip the quote to deposit_paid right there. Don't.",
      "That redirect is advisory. The tab can close before it fires. The network can drop. A motivated user can hit the success URL directly without paying. None of those should move money in your database.",
      "PactLink treats the redirect as a hint that shows a 'confirming payment…' state. The authoritative transition happens only when Stripe POSTs payment_intent.succeeded to our webhook endpoint, verified against the raw request body.",
      "Stripe retries deliveries and occasionally double-sends. We insert every event into a webhookEvents collection keyed by a unique index on the Stripe event id. A duplicate insert fails fast, and we treat that as 'already processed' — no double charge, no duplicate balance invoice.",
      "The payoff: a deposit confirmation that survives closed tabs, flaky networks, and provider retries, with an audit log that proves every transition.",
    ],
  },
  {
    slug: "signature-gates-the-charge",
    title: "Why the PaymentIntent doesn't exist until the signature does",
    excerpt:
      "A small ordering rule with big legal weight — why the deposit intent refuses to exist until a signature does.",
    category: "Product",
    date: "2026-05-12",
    readMins: 7,
    author: "Mara Voss",
    coverIcon: FileSignature,
    body: [
      "A deposit is a client putting money behind an agreement. That ordering is not incidental — it is load-bearing. The agreement has to exist first, and the money follows it. If you let a client pay before they have signed, you have charged them against scope that was never formally accepted. When a dispute arises, you are arguing from a payment record, not a signed contract. That is a weak position.",
      "PactLink enforces the ordering at the state machine level, not in application logic. When a client reaches the payment step, the server checks for a signatures record on that quote before it creates a Stripe PaymentIntent. No signature row: no PaymentIntent. The API route returns a clear error, and the client sees a 'please sign before paying' message. There is no path — no URL to hit directly, no client-side bypass — that skips this check, because the check lives on the server and the PaymentIntent ID is what the payment form needs to proceed.",
      "The signature itself is captured through DocuSeal, not a checkbox. DocuSeal records the client's drawn or typed signature, a UTC timestamp, and the IP address of the signing request. That record is as legally defensible as any consumer e-signature — the ESIGN Act and the Uniform Electronic Transactions Act (UETA) both treat a demonstrable intent to sign, combined with a record of the act, as binding. A timestamp-plus-IP record from dedicated signing infrastructure satisfies that standard; a checkbox does not.",
      "When the client signs, two things happen atomically. First, the signatures row is written. Second, the quote's line item selection is snapshotted and locked. Whatever optional add-ons the client toggled, whatever tier they selected — those choices are frozen at the moment of signing. The client cannot change the scope after signing, and neither can the service provider alter the quote the deposit is charged against. The thing they agreed to in writing is exactly the thing that determines the deposit amount and, later, the balance invoice.",
      "The snapshot lock matters more than it might seem. Without it, a service provider could edit a quote after signing to inflate the total, or a client could argue they signed a different scope than what was charged. Neither is possible when the signed state is immutable. The selection snapshot is what lets the auto-generated balance invoice reference the agreed scope with confidence — it reads from the locked snapshot, not from a quote that may have been edited post-signing.",
      "The practical effect for the client: the approval page presents the quote summary, then the signature step, then the payment step — in that order, each gated on the previous. There is no confusion about what they are agreeing to or what they are paying. The legal record and the financial record are the same document, created in the only order that makes them defensible.",
    ],
  },
  {
    slug: "optional-and-tiered-line-items",
    title: "Let the client right-size the quote — and close it themselves",
    excerpt:
      "How toggleable line items turn a single quote into a negotiation that closes itself.",
    category: "Product",
    date: "2026-04-30",
    readMins: 8,
    author: "Mara Voss",
    coverIcon: ListChecks,
    body: [
      "Most quotes are a take-it-or-leave-it proposition. The service provider builds a scope, assigns a number, and sends it. The client either accepts or disappears. The clients who disappear are often not objecting to the work — they are objecting to one line item they did not expect, or a total that is just above what they had mentally budgeted. They do not email back to negotiate. They go quiet, and two weeks later you are chasing them.",
      "PactLink quotes can carry two types of client-adjustable items: optional add-ons and tiered groups. An optional add-on is a line item the client can toggle off — rush delivery, a second revision round, extended licensing. A tiered group presents two or three mutually exclusive levels — Basic, Standard, Premium — and the client selects one. Both types are defined by the service provider when building the quote; the client adjusts within the options offered, not invent new scope.",
      "Every toggle or tier selection triggers a server-side recompute. The total and the deposit amount update immediately, and the client sees the new numbers before they make any commitment. The recompute runs on the server rather than in the browser because the deposit is a financial figure that must be authoritative — a client-side calculation can be manipulated, and a miscalculated deposit that gets charged is a billing problem. The server owns the numbers; the browser displays them.",
      "The pricing psychology here is not accidental. Letting a client remove a line item to reach their budget is not discounting — it is scoping. They are not asking you to do the same work for less money; they are explicitly agreeing to a smaller scope at a proportionally smaller price. That is a clean transaction. More importantly, it happens inside the quote link, not over email. The client lands on a number they can commit to, and the signature and deposit steps are right there. The friction between 'I like this price' and 'I have signed and paid' is near zero.",
      "Service providers sometimes worry that offering optional items will cause clients to strip quotes to nothing. In practice the opposite tends to happen. When clients can see exactly what each add-on costs, they frequently add items they would have hesitated to request explicitly — because requesting feels like negotiating, but clicking a toggle feels like shopping. The optional structure makes upsells visible without requiring the client to ask.",
      "When the client finishes selecting and moves to sign, the selection is locked. The signature is taken against the exact configuration the client assembled — those specific line items, that total, that deposit. The snapshot written at signing is what drives the balance invoice later. The client can return to the quote link and see what they agreed to, but the toggles are no longer interactive. Scope is frozen at the moment of legal commitment, which is the only moment it should be.",
    ],
  },
  {
    slug: "the-three-tool-tax",
    title: "The three-tool tax: how Docs, DocuSign, and Stripe invoices kill deals between them",
    excerpt:
      "Docs for the quote, DocuSign for the signature, Stripe for the invoice. Three tools, three places a deal stalls.",
    category: "Workflow",
    date: "2026-04-15",
    readMins: 7,
    author: "Travis Buchanan",
    coverIcon: Layers,
    body: [
      "The standard workflow for sending a quote in a service business has not changed much in a decade. Build the quote in Google Docs or a spreadsheet. Export a PDF. Email it with a note saying 'let me know if you have questions.' Wait. Send a DocuSign when they say they are ready. Wait for that to come back signed. Then create a Stripe invoice or send a bank-transfer request for the deposit. Chase it. Somewhere in that sequence, deals die — not because the client did not want the work, but because each gap gave them time to reconsider, get distracted, or start a conversation with someone else.",
      "The problem is not any single tool. Google Docs is fine for writing. DocuSign is a legitimate e-signature platform. Stripe invoices work. The problem is the transitions between them. Each handoff requires a manual action: export the PDF, open DocuSign, create the payment request. Each handoff introduces latency. And latency in a sales process is not neutral — it is actively harmful. A client who was ready to commit on Tuesday afternoon is in a different mental state by Thursday morning. The deal has had time to cool.",
      "There is also a consistency problem the handoff model obscures. The scope in the PDF is not always identical to the scope in the DocuSign. A verbal change discussed on a call gets into the new PDF but the DocuSign references the old one. The deposit invoice is a round number someone typed rather than a computed percentage of the actual agreed total. These small inconsistencies do not kill deals on their own, but they create friction — the client notices the numbers do not quite match and emails to ask — and they create liability if the project goes sideways and the documents need to tell a coherent story.",
      "PactLink collapses the three into one pipeline. The service provider builds the quote, sets a deposit percentage, and sends a link. The client gets one URL that shows the quote, lets them adjust optional items, captures their signature via DocuSeal, and charges the deposit via Stripe — all in sequence, all in the same browser session. There is no PDF to export, no DocuSign to create separately, no payment link to send after the fact. The provider's action is 'send the link.' Everything after that is automatic.",
      "The pipeline view shows exactly where every quote stands: draft, sent, viewed, approved, deposit paid. Those states are driven by verified events — a viewed timestamp written when the link is first opened, a signature record when DocuSeal confirms signing, a deposit_paid transition when the Stripe webhook confirms payment. None of those transitions depend on the provider doing anything. A quote can go from sent to deposit_paid without them touching it again.",
      "The deal-velocity improvement comes entirely from removing waiting. When the gap between 'client reviews the quote' and 'client can sign and pay' is measured in clicks rather than hours, clients convert while they are still in buying mode. The research on online funnels is consistent: every additional step costs conversions, and steps that require leaving one context and entering another cost the most. A client who would have signed the DocuSign and then forgotten to pay the invoice for three days will pay the deposit in the same session as signing, because there is no context switch between them.",
    ],
  },
  {
    slug: "idempotent-webhook-events",
    title: "One unique index that makes your payment pipeline bulletproof",
    excerpt:
      "Stripe retries. Networks drop. A single unique constraint on the event ID is all that stands between an honest retry and a duplicate deposit charge.",
    category: "Engineering",
    date: "2026-03-18",
    readMins: 6,
    author: "Mara Voss",
    coverIcon: Repeat,
    body: [
      "Stripe guarantees delivery of every webhook event — eventually. What it does not guarantee is exactly-once delivery. Under normal conditions an event arrives once. Under load, retries, or provider hiccups it can arrive two or three times with the same event ID. If your handler charges the client or creates a balance invoice on each call, you have a billing bug that is nearly impossible to reproduce in staging.",
      "The fix is not clever conditional logic. It is a unique index on your webhookEvents collection keyed by the Stripe event ID. The first delivery inserts a row and executes the handler. The second delivery hits the unique constraint, throws a duplicate-key error, and you catch that specific error code and return HTTP 200 immediately — nothing else executes. Stripe considers the event acknowledged and stops retrying.",
      "PactLink applies this at every significant event: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded. None of those handlers touch quote state, invoice state, or email dispatch unless the insert succeeds. The state machine only advances on a clean write.",
      "One subtlety worth noting: you must verify the webhook signature against the raw request body before you do anything, including the insert. If you deserialize the body first and then re-serialize for verification, HMAC can mismatch on innocuous whitespace differences. Buffer the raw bytes, verify, then parse.",
      "The result is a pipeline where retrying a webhook is exactly as safe as never sending it twice — because the database enforces that invariant, not your application logic. That property is load-bearing: it is what lets you deploy a new version mid-flight, restart the server, or replay a failed event batch without auditing every quote by hand.",
    ],
  },
  {
    slug: "time-to-approval-the-metric-that-matters",
    title: "The number you should be watching instead of conversion rate",
    excerpt:
      "Conversion rate tells you what happened. Time-to-approval tells you where the deal stalled — and which part of your funnel to fix first.",
    category: "Workflow",
    date: "2026-02-24",
    readMins: 5,
    author: "Travis Buchanan",
    coverIcon: Timer,
    body: [
      "Most service businesses track whether a quote converts. Few track when. The gap between 'sent' and 'deposit paid' is where revenue lives in limbo — the client is weighing you against a competitor, getting distracted by their own deadlines, or waiting for a question you did not anticipate. Every hour in that gap is risk.",
      "PactLink surfaces three timestamps per quote: viewed, approved (signed), and deposit_paid. The delta between sent and viewed tells you whether your subject line or client-facing link is working. The delta between viewed and approved tells you whether the quote itself is stalling the decision — scope confusion, price surprise, or too much friction to sign. The delta between approved and deposit_paid is almost always zero when the charge happens automatically on approval, so any gap there signals a payment method failure worth investigating.",
      "In practice, the viewed-to-approved window is where most service businesses lose deals they should close. A client who views a quote within two hours of receiving it is far more likely to convert than one who opens it two days later — they were already in buying mode. Shortening that window means removing every step between 'I've reviewed this' and 'I've committed to it.' A clean approval page with the scope clearly summarized, a single click to sign, and an immediate deposit charge removes all of those steps.",
      "The pipeline view in PactLink makes time-to-approval visible at a glance, not buried in a spreadsheet. When a quote has sat in 'viewed' for 48 hours without moving, that is the moment to send a short, direct follow-up — not after a week. The data tells you exactly when to act.",
    ],
  },
  {
    slug: "deposit-amount-that-closes-deals",
    title: "How to set a deposit percentage that protects you without losing the job",
    excerpt:
      "Too low and a deposit barely filters tire-kickers. Too high and a client ghosts you before signing. The right number depends on your project type, not a rule of thumb.",
    category: "Product",
    date: "2026-01-30",
    readMins: 5,
    author: "Travis Buchanan",
    coverIcon: Percent,
    body: [
      "The default advice is 50% deposit, always. That advice was written for a world where collecting any deposit required chasing a check. When the deposit charges automatically on approval, the calculus changes — a client sees the deposit amount before they sign, so it is part of the decision, not an afterthought.",
      "For short, high-frequency work — a one-day shoot, a single-page design, a two-week development sprint — a 50% deposit is reasonable. The full project fits within the client's planning horizon, and a 50% hold signals mutual commitment without creating sticker shock. For large engagements priced above five figures, a 30% to 40% deposit often converts better because the total dollar amount of the deposit is already substantial. Asking for $12,000 upfront on a $30,000 project is a different psychological ask than 40% of a $1,000 job.",
      "Project risk should also factor in. Work that involves significant materials, travel, or subcontractor commitments on your side before delivery warrants a higher deposit — you are covering real exposure. Work that is purely labor with no upfront cost to you can afford a lower deposit if it closes deals that would otherwise stall.",
      "PactLink lets you set the deposit as a percentage of the total that recomputes as the client toggles optional line items. If a client switches off the rush-delivery add-on and drops the total, the deposit drops proportionally. That live recomputation is done server-side — the client sees the updated deposit before they reach the signature step, so there are no surprises at checkout. The number they sign on is the number they pay.",
      "The strongest signal that your deposit is calibrated correctly: clients do not ask to negotiate it. They might push back on line items or scope, but the deposit feels like a natural conclusion of the agreement rather than a separate obstacle. If you are regularly fielding deposit objections, that is usually a sign the quote itself lacks clarity, not that the percentage is wrong.",
    ],
  },
  {
    slug: "no-client-account-required",
    title: "Why your client should never have to create an account to approve a quote",
    excerpt:
      "Account creation is a conversion killer dressed up as a security feature. A signed, timestamped, IP-logged token link is both more secure and more respectful of your client's time.",
    category: "Product",
    date: "2025-12-15",
    readMins: 4,
    author: "Greg Halloran",
    coverIcon: Link2,
    body: [
      "Every step between 'I received a quote' and 'I approved and paid it' is a place the deal can stall. Account creation is one of the worst because it is both unexpected and friction-heavy. Your client did not come to your approval link to make an account on a platform they may never use again. They came to review your proposal and decide.",
      "PactLink uses a tokenized link — a cryptographically random, quote-specific URL generated at send time and stored server-side. The token proves identity in the only sense that matters for a quote approval: you have the link your service provider sent you. There is no password to forget, no verification email to find in spam, no account dashboard to navigate. The client clicks, reviews, signs, and pays.",
      "The trust signals are built into the page, not into an account system. The service provider's name, logo, and brand colors appear immediately. The quote line items are summarized clearly so the client can verify they are looking at the right proposal. The DocuSeal signature capture shows a timestamp and records the client's IP address — that record is at least as legally defensible as a username-and-password login, and it is immediate.",
      "When the token is consumed — meaning the client has approved and paid — it remains valid for viewing but the approval and payment actions are no longer available, because the state machine has moved past them. The client can return to the link to reference the agreed scope or download a copy of the signed document. That is the entire account experience they need.",
    ],
  },
  {
    slug: "auto-balance-invoice-reconciliation",
    title: "The balance invoice that writes itself when the deposit clears",
    excerpt:
      "A deposit-paid event should trigger a balance invoice automatically — here is how PactLink generates it, what goes on it, and why reconciliation becomes trivial.",
    category: "Workflow",
    date: "2025-11-20",
    readMins: 7,
    author: "Greg Halloran",
    coverIcon: ReceiptText,
    body: [
      "When a client pays a deposit, two accounting facts are now true simultaneously: they owe you a specific total, and they have already paid a specific portion of it. The balance invoice — total minus deposit — should exist the moment the deposit clears, not when you remember to create it. If you generate it manually, it will sometimes be wrong, sometimes be late, and occasionally not match the signed quote because scope discussions happened over email in the meantime.",
      "In PactLink, the deposit_paid webhook handler does three things in the same transaction: it advances the quote to deposit_paid, it writes the webhookEvent row (which provides idempotency), and it generates a balance invoice record. The balance is computed from the server-side quote snapshot — the exact line items and totals that were locked at signing. There is no path where the balance invoice references a different scope than the signed document.",
      "The invoice record includes the quote ID, the line items that were agreed to, the deposit amount that was charged (pulled from the Stripe PaymentIntent rather than a field you maintain separately), the balance due, and a due date based on your configured payment terms. Those fields are enough to push the invoice to any accounting tool — QuickBooks, Xero, Wave — via a webhook or a nightly export, with no manual data entry.",
      "Reconciliation is where automatic generation pays off. At the end of the month you have a complete ledger: every deposit linked to its PaymentIntent ID, every balance invoice linked to its deposit, every balance linked to the signed quote snapshot. If a client disputes a charge, you have the Stripe receipt, the quote snapshot, the signature record with timestamp and IP, and the balance invoice all under one quote ID. That audit trail closes disputes faster than any email thread.",
      "One operational note: if you refund a deposit — say the project falls through — you should also void the auto-generated balance invoice at the same time, or your accounts receivable will show an outstanding balance on a dead project. PactLink handles this by treating a charge.refunded webhook event as a trigger to mark the quote cancelled and the balance invoice void in the same transaction, for the same idempotency reason: one event, one state change, no manual cleanup.",
    ],
  },
  {
    slug: "verifying-stripe-webhook-signatures",
    title: "Verifying Stripe webhook signatures: what goes wrong if you skip it",
    excerpt:
      "Signature verification is four lines of code that prevent an attacker from advancing your quote state machine with a crafted POST request. Here is exactly how it works.",
    category: "Engineering",
    date: "2025-11-05",
    readMins: 6,
    author: "Mara Voss",
    coverIcon: ShieldCheck,
    body: [
      "Every Stripe webhook endpoint is publicly reachable by design — Stripe needs to POST to it. That means anyone who knows the URL can POST to it. Without signature verification, a crafted request body that looks like a payment_intent.succeeded event would advance a quote to deposit_paid, trigger a balance invoice, and send a confirmation email, all without money changing hands.",
      "Stripe signs each delivery with an HMAC-SHA256 computed over a payload that includes the raw request body and a timestamp. Your webhook secret — different per endpoint, rotatable without downtime — is the HMAC key. Stripe puts the signature in the Stripe-Signature header. Verification is: reconstruct the signed payload using the raw bytes and the timestamp from the header, compute the HMAC with your secret, and compare. If it matches, the request came from Stripe. If it does not, reject it with 400 before touching your database.",
      "The raw bytes requirement is the part that trips up the most implementations. Express, Next.js API routes, and similar frameworks parse the request body before your handler runs. Once parsed, the body has been deserialized and re-serialized — JSON key ordering may shift, whitespace may normalize, and the HMAC will fail on a perfectly valid delivery. You must register the webhook route before body-parsing middleware, or use a rawBody option your framework provides, and pass the unconverted buffer to Stripe's constructEvent.",
      "Stripe also includes a tolerance check: by default, constructEvent rejects events with a timestamp more than 300 seconds in the past. This defends against replay attacks where an attacker captures a legitimate delivery and replays it later. Combined with the unique-event-ID index, you get two independent defenses against replays — one time-based, one identity-based.",
      "The operational concern people raise is: what if Stripe's signature library has a bug? The answer is that you are not trusting the library blindly — you can read the thirty lines of source, it is not complex cryptography. More importantly, the alternative is trusting that no one discovers your webhook URL and understands your event schema, which is not a security property at all. Verify the signature. It is four lines of code and the foundation the rest of the state machine sits on.",
    ],
  },
];

export const blogCategories = [
  "All",
  ...Array.from(new Set(blogPosts.map((p) => p.category))),
];
