# PactLink — Technical Requirements

## Tech Stack

### Frontend
- **Framework:** React 18 + Vite — fast HMR dev loop and lean production bundles; SPA fits both the authenticated owner dashboard and the public client approval page.
- **Styling:** Tailwind CSS — utility-first styling keeps the branded PDF preview and dashboard consistent without bespoke CSS.
- **Components:** shadcn/ui — accessible, unstyled-by-default primitives (dialogs, tables, forms) that adapt to per-business branding.
- **State Management:** Zustand — minimal store for quote-builder draft state and toggled optional items without Redux overhead.
- **Forms:** React Hook Form + Zod — performant controlled forms with the same Zod schemas the API uses, so client validation matches server validation.
- **Signature widget:** signature_pad (canvas) for drawn signatures + a typed-signature input — feeds the e-sign capture (F-04); rendered signing flow embeds the DocuSeal/Documenso signing UI where used.
- **Payments client:** Stripe.js + Stripe Elements — PCI-compliant card entry on the client approval page (F-05); the browser never sees raw card data and never authoritatively confirms payment.

### Backend
- **Runtime:** Node.js 22 LTS — single language across `api/` and `web/`; long-term-support stability for a payments service.
- **Framework:** Express.js — minimal, explicit middleware pipeline; raw-body access on the Stripe webhook route is straightforward (critical for signature verification).
- **Validation:** Zod (shared with frontend) — one source of truth for request/response and embedded-document shapes (line items, taxes); reused in Mongoose pre-validate hooks.
- **Auth:** Custom JWT (access token, short-lived) — no public signup; seeded/sandbox users authenticate with email+password (bcrypt) and receive a signed JWT. Stateless, simple to verify per request.
- **PDF generation:** Puppeteer (headless Chromium) — renders the branded HTML quote template to pixel-faithful PDF (F-02); reuses the same React/HTML layout the hosted link shows. (pdfkit is the lighter fallback if Chromium footprint is a concern.)
- **Email:** Nodemailer + a transactional provider (Postmark or Resend) — provider-agnostic transport for webhook-driven notifications (F-08); Postmark/Resend give deliverability + delivery webhooks.

### Database
- **Primary:** MongoDB (Atlas) — flexible document model fits quotes with **embedded `lineItems`** (optional/tiered/toggleable + per-line taxes) read and written as one document; no join overhead for the common quote-render path.
- **ODM/Driver:** Mongoose — schema enforcement, middleware (pre-save validation, post-save event emission), and population for `quotes → clients/users` references over the native driver.
- **Cache:** none for v1 — analytics funnel (F-10) is computed with MongoDB aggregation; webhook idempotency uses a unique index in the `webhookEvents` collection, not a cache. Introduce Redis only if aggregation latency becomes an issue.

### External Services
- **Payments:** Stripe — deposit charge (fixed or %), balance invoice, and the authoritative webhook event stream that drives the state machine (F-05, F-06, F-09, F-11). PaymentIntents for deposits; Stripe Invoices for the balance.
- **E-signature infra:** DocuSeal (self-hosted, open source) — real signing infrastructure for F-04, producing an auditable signed document; Documenso is the interchangeable alternative. Signature timestamp + IP are also captured server-side at our boundary. If self-host is deferred, the canvas/typed signature is persisted to the `signatures` collection with the same audit fields.
- **Object storage:** S3-compatible store (AWS S3 / Cloudflare R2) — stores generated PDFs (F-02) and signed documents; quote/invoice documents reference object keys, not blobs in Mongo.

### Infrastructure
- **Hosting:** Railway or Render — container-friendly PaaS for the `api/` Node service; `web/` static build served via the platform or a CDN (Vercel/Netlify).
- **Containerization:** Docker + Docker Compose — reproducible local stack (api, web, MongoDB, self-hosted DocuSeal) and parity with deploy.
- **CI/CD:** GitHub Actions — lint + typecheck + test on PR; build and deploy on merge to main.
- **Monorepo:** single repo, npm workspaces — `api/` and `web/` share the Zod schema package without a heavyweight monorepo tool for v1.

Each layer lists every technology with a one-line reason. No tech choice is left unexplained.

## Architecture

PactLink is a two-surface MERN app in one repo: a React/Vite SPA (`web/`) and an Express/Node REST API (`api/`) over MongoDB/Mongoose. The SPA serves two audiences from one build — the authenticated **owner dashboard** (quote builder, pipeline, analytics) and the **public client approval page** reached by an unauthenticated, tokenized link. The owner builds a quote (F-01); the API persists it as a `quotes` document with embedded `lineItems`, renders a branded PDF via Puppeteer (F-02) to S3, and exposes a hosted link (F-03). The client opens the link, which emits an `activityEvents` "viewed" record (advancing F-07), toggles optional items (server recomputes totals), signs (F-04 → `signatures`), and submits payment via Stripe Elements, creating a Stripe PaymentIntent for the deposit (F-05).

The system is **webhook-first**: the browser's Stripe redirect/success callback is treated as advisory only. The authoritative transition to `deposit_paid` happens when Stripe POSTs `payment_intent.succeeded` to our webhook endpoint. The webhook handler verifies the Stripe signature against the raw request body, then writes the event to `webhookEvents` guarded by a **unique index on the Stripe event id** — duplicate/retried deliveries are rejected idempotently. On first-time processing, the **state machine (F-09)** runs server-side: it confirms a valid `signatures` record exists (signature gates the charge), marks the `payments` record succeeded, transitions the `quotes` status to `deposit_paid` (F-07), generates the **balance invoice** (F-06) as an `invoices` document + Stripe Invoice, and enqueues `notifications` that Nodemailer dispatches to both parties (F-08). Every step appends to `activityEvents` for the analytics funnel (F-10), and `webhookEvents` remains the audit trail (F-11).

Components: React SPA (owner + client views) · Express API (REST + webhook router) · Mongoose models · State-machine service · Stripe SDK + webhook verifier · PDF renderer (Puppeteer) · E-sign integration (DocuSeal/Documenso) · Email dispatcher (Nodemailer) · S3 storage · MongoDB Atlas.

## Project Structure

```
pactlink/
├── api/                      # Express + Node.js backend
│   ├── src/
│   │   ├── index.ts          # app bootstrap, raw-body mount for /webhooks/stripe
│   │   ├── config/           # env, db connect (Mongoose), stripe, s3, mailer clients
│   │   ├── models/           # Mongoose schemas: user, client, quote (embedded lineItems),
│   │   │                     #   signature, payment, invoice, webhookEvent, notification, activityEvent
│   │   ├── routes/           # auth, quotes, public-link, signatures, payments, webhooks, analytics
│   │   ├── controllers/      # request handlers per route group
│   │   ├── services/
│   │   │   ├── stateMachine/ # F-09: signature → charge → balance invoice transitions
│   │   │   ├── pdf/          # F-02 Puppeteer rendering
│   │   │   ├── esign/        # F-04 DocuSeal/Documenso adapter
│   │   │   ├── stripe/       # F-05/F-06 PaymentIntents + Invoices
│   │   │   └── email/        # F-08 Nodemailer dispatch from notifications
│   │   ├── middleware/       # JWT auth guard, link-token verify, Zod validate, error handler
│   │   ├── webhooks/         # F-11 Stripe event verify + idempotent log + dispatch to stateMachine
│   │   └── seed/             # F-12 seeded users + sandbox/demo quotes, clients, events
│   └── package.json
├── web/                      # React + Vite frontend
│   ├── src/
│   │   ├── main.tsx
│   │   ├── pages/
│   │   │   ├── dashboard/     # owner: quote list, pipeline, analytics funnel (F-10)
│   │   │   ├── builder/       # F-01 quote builder
│   │   │   └── public/        # F-03 unauthenticated client approval page (view/toggle/sign/pay)
│   │   ├── components/        # shadcn/ui, signature pad, Stripe Elements wrapper, PDF preview
│   │   ├── store/             # Zustand quote-draft + toggled-items state
│   │   └── lib/               # api client, auth, zod schemas (shared)
│   └── package.json
├── packages/
│   └── schemas/              # shared Zod schemas (line items, taxes, quote payloads)
├── docs/                     # PRD.md, TRD.md, UCD.md, DBD.md, FED.md
├── docker-compose.yml        # api + web + mongo + docuseal for local parity
└── package.json              # npm workspaces root
```

## API Strategy
- **Style:** REST over HTTP/JSON. Resource groups: `/auth`, `/quotes`, `/quotes/:id/pdf`, `/public/quotes/:token` (unauthenticated), `/signatures`, `/payments`, `/webhooks/stripe`, `/analytics`.
- **Auth mechanism:** custom JWT bearer token for owner routes (verified by middleware); public client routes are gated by an unguessable, single-quote **link token** (no JWT, no account). The Stripe webhook route is unauthenticated but verified via Stripe signature against the raw body.
- **Validation:** Zod schemas validate every request body and the public toggle payload before controllers run; shared with the frontend.
- **Webhook-first guarantee:** state transitions that involve money (`deposit_paid`, balance invoice) are **only** triggered by verified Stripe webhook events, never by a client-side success redirect. Idempotency enforced by a unique index on `webhookEvents.eventId` (the provider event id; for Stripe this is the Stripe event id).
- **Versioning:** path-prefixed `/api/v1`.

## Environment & Deployment
- **Environments:** `dev` (Docker Compose: api, web, MongoDB, DocuSeal), `staging`, `prod`.
- **Hosting:** `api/` as a container on Railway/Render; `web/` static build on Vercel/Netlify/CDN; MongoDB Atlas; S3/R2 for documents.
- **Secrets:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`, `MONGODB_URI`, mail provider key, DocuSeal/Documenso URL+token, S3 creds — injected via platform env, never committed.
- **Stripe webhooks:** registered endpoint `/api/v1/webhooks/stripe`; local dev uses the Stripe CLI to forward events. Subscribed events include `payment_intent.succeeded`, `payment_intent.payment_failed`, `invoice.finalized`, `invoice.paid`.
- **CI/CD:** GitHub Actions runs lint, typecheck, and tests on PR; deploys api + web on merge to main.
- **Seed/demo:** a seed script provisions login-only users and a sandbox/demo account (F-12) with example quotes, clients, signatures, payments, invoices, and an `activityEvents`/`webhookEvents` history so the analytics funnel and event-log proofs render immediately.

## Key Technical Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | MERN with MongoDB + Mongoose | Quotes are naturally a document with embedded `lineItems` (optional/tiered/toggleable + taxes); read/written atomically without joins; one JS language across stack. |
| 2 | Webhook-first, server-authoritative state machine (F-09) | Money transitions must survive a client closing the tab or a spoofed success redirect; Stripe webhooks are the only trusted confirmation of payment. |
| 3 | Idempotent webhook log via unique index on `webhookEvents.eventId` (F-11) | Stripe retries deliveries and may send duplicates; the unique index makes reprocessing a no-op, preventing double charges and duplicate balance invoices. |
| 4 | Signature gates the charge (F-04 → F-05) | The state machine refuses to mark a quote `deposit_paid` without a persisted `signatures` record, enforcing "agreement before money." |
| 5 | DocuSeal/Documenso for e-sign | Real, open-source signing infrastructure with audit trail beats a homemade canvas blob; timestamp + IP captured at our boundary regardless. |
| 6 | Unauthenticated tokenized link for clients (F-03) | No public signup means clients must transact without accounts; an unguessable per-quote link token authorizes view/toggle/sign/pay. |
| 7 | Puppeteer for PDF (F-02) | Reuses the same branded HTML the hosted link renders, guaranteeing the PDF matches the live quote after optional-item toggles. |
| 8 | Login-only + sandbox seed (F-12) | v1 has no self-serve monetization UI; seeded users plus a demo account showcase the full funnel and webhook event-log proofs without onboarding. |
| 9 | No cache layer in v1 | Funnel analytics via MongoDB aggregation and idempotency via unique index remove the need for Redis; avoids premature infrastructure. |
