# PactLink — Use Cases

## Roles

| Role | Description | Key Permissions |
|------|-------------|----------------|
| Business owner (`O`) | Authenticated seeded/sandbox user (login-only, no public signup, F-12). Builds quotes, sends links, monitors the pipeline and analytics. | Create/edit/send quotes (F-01), generate PDFs (F-02), create share links (F-03), view all own `quotes`/`clients`/`payments`/`invoices`/`activityEvents`, view analytics (F-10) and `webhookEvents` log (F-11). Cannot sign or pay on behalf of a client. |
| Client / recipient (`C`) | Unauthenticated link recipient (no account). Accesses a single quote via its tokenized hosted link (F-03). | View one quote, toggle optional/tiered `lineItems`, e-sign (F-04), pay deposit via Stripe (F-05). No dashboard, no access to other quotes. |
| System / Stripe webhook (`S`) | Automated actor. Verified Stripe webhook deliveries drive the server-authoritative state machine (F-09). | Verify + log `webhookEvents` (F-11), advance `quotes` status (F-07), mark `payments`, generate balance `invoices` (F-06), enqueue `notifications` (F-08). No human UI. |

## Use Cases

### Business owner (O) Use Cases

#### UC-O01: Log in (F-12)

**Description:** Owner authenticates with a seeded or sandbox account; no public signup exists.

**Preconditions:**
- A `users` document exists (seeded or sandbox/demo).

**Flow:**
1. Owner submits email + password to `POST /api/v1/auth/login`.
2. API validates with Zod, verifies bcrypt hash against `users`.
3. On success API returns a short-lived JWT; SPA stores it and loads the dashboard.

**Postconditions:**
- Owner holds a valid JWT; subsequent owner routes are authorized.

**Alt Paths:**
- Bad credentials → 401, generic error (no user enumeration).
- Sandbox/demo button → logs into the pre-seeded demo `users` account with example data.

#### UC-O02: Build a quote (F-01)

**Description:** Owner composes a quote with line items, taxes, and optional/tiered items the client may toggle.

**Preconditions:**
- Owner authenticated (UC-O01). A `clients` document exists or is created inline.

**Flow:**
1. Owner opens the builder; Zustand holds draft state.
2. Owner adds `lineItems` (name, qty, unit price), marks some `optional` or part of a `tiered` group, sets `taxes` (per-line or global).
3. Owner sets deposit rule on the `quotes` doc: fixed amount or percent (F-05 config).
4. Owner saves → `POST /api/v1/quotes`; API Zod-validates, recomputes totals server-side, persists `quotes` with embedded `lineItems`, status `draft`.

**Postconditions:**
- A `quotes` document exists in status `draft` (F-07) with a server-computed total and deposit rule.

**Alt Paths:**
- Validation fails (negative qty, tax > 100%) → 422 with field errors.
- Edit later while `draft`/`sent` → `PATCH /api/v1/quotes/:id` recomputes totals; editing a `deposit_paid` quote is blocked (see E10).

#### UC-O03: Generate branded PDF (F-02)

**Description:** Owner generates a branded PDF reflecting current selected line items and totals.

**Preconditions:**
- A `quotes` document exists.

**Flow:**
1. Owner requests `GET /api/v1/quotes/:id/pdf`.
2. API renders the branded HTML template via Puppeteer using the quote's current selected `lineItems` + totals.
3. PDF is stored to S3; the object key is referenced on the `quotes` document; a download/preview URL is returned.

**Postconditions:**
- A branded PDF exists in storage matching the quote's current selection.

**Alt Paths:**
- Render failure → 500, no key written; owner may retry.
- Quote totals later changed by client toggle → PDF is regenerated on demand to stay consistent (see E03).

#### UC-O04: Send quote / create share link (F-03, F-07, F-08)

**Description:** Owner sends the quote to the client via an unauthenticated hosted approval link.

**Preconditions:**
- A `quotes` document exists; a recipient `clients` record with email is set.

**Flow:**
1. Owner clicks Send → `POST /api/v1/quotes/:id/send`.
2. API mints an unguessable link token on the `quotes` doc, transitions status `draft → sent` (F-07), appends an `activityEvents` "sent" record.
3. API enqueues a `notifications` record; Nodemailer emails the client the hosted link `…/public/quotes/:token` (F-08).

**Postconditions:**
- `quotes` status = `sent`; client has a working link; `activityEvents` records send time (time-to-approval clock starts).

**Alt Paths:**
- Email send fails → notification marked failed and retried; owner sees a resend control.
- Re-send → reuses the same token (does not reset status if already past `sent`).

#### UC-O05: View pipeline & analytics funnel (F-07, F-10)

**Description:** Owner monitors quote statuses and the viewed → approved → deposit-paid funnel with time-to-approval.

**Preconditions:**
- Owner authenticated; one or more `quotes` exist (seed data populates the demo).

**Flow:**
1. SPA calls `GET /api/v1/quotes` (pipeline) and `GET /api/v1/analytics/funnel`.
2. API aggregates `quotes` by status (F-07) and computes funnel counts (viewed vs approved vs deposit_paid) and median time-to-approval from `activityEvents` timestamps.
3. Dashboard renders the pipeline and funnel.

**Postconditions:**
- Owner sees current conversion metrics; no state change.

**Alt Paths:**
- No data → empty-state funnel with zeros.

#### UC-O06: Inspect webhook event log (F-11)

**Description:** Owner reviews the inbound Stripe event log as proof of correctness.

**Preconditions:**
- Owner authenticated; `webhookEvents` exist (seeded or live).

**Flow:**
1. SPA calls `GET /api/v1/analytics/webhook-events` (scoped to owner's quotes).
2. API returns `webhookEvents` with `eventId`, type, processed flag, and linked `quotes`/`payments`.

**Postconditions:**
- Owner can trace every `deposit_paid` transition to a logged, idempotently-handled event. No state change.

**Alt Paths:**
- Duplicate deliveries appear once as processed; subsequent duplicates are visible as ignored (idempotent), see E01.

### Client / recipient (C) Use Cases

#### UC-C01: Open hosted quote link (F-03, F-07, F-08)

**Description:** Unauthenticated client opens the quote; the open is recorded and advances status to `viewed`.

**Preconditions:**
- A valid, unexpired link token on a `quotes` doc in status `sent` (or later).

**Flow:**
1. Client opens `…/public/quotes/:token`; SPA calls `GET /api/v1/public/quotes/:token`.
2. API verifies the link token, returns the quote with current `lineItems`/totals.
3. On first view, API transitions `sent → viewed` (F-07), appends an `activityEvents` "viewed" record, and enqueues a `notifications` email to the owner (F-08).

**Postconditions:**
- `quotes` status = `viewed` (first time); owner notified; view timestamp recorded.

**Alt Paths:**
- Invalid/unknown token → 404 generic page.
- Expired token → 410 with "link expired, contact sender" (see E05).
- Re-opening an already-`viewed`/`approved` quote does not regress status (see E06).

#### UC-C02: Toggle optional/tiered items (F-01)

**Description:** Client adjusts optional or tiered `lineItems`; the server recomputes totals and the deposit.

**Preconditions:**
- Quote viewable (UC-C01); status not yet `approved` (selection locks at approval).

**Flow:**
1. Client toggles an optional item or switches a tiered selection in the hosted view.
2. SPA sends the selection to `PATCH /api/v1/public/quotes/:token/selection`.
3. API Zod-validates, recomputes line totals, taxes, grand total, and the deposit amount (fixed or %) **server-side**, persists the selection on `quotes`, appends an `activityEvents` "selection_changed" record.

**Postconditions:**
- `quotes` reflects the new selection and recomputed totals/deposit; PDF (F-02) regenerates on next request.

**Alt Paths:**
- Toggling after `approved` → 409 "selection locked" (see E02).
- Tiered group with no selection at sign time → 422 "choose one option."

#### UC-C03: E-sign the quote (F-04, F-07, F-08)

**Description:** Client signs (typed or drawn); timestamp + IP are captured; status advances to `approved`. Signature precedes payment.

**Preconditions:**
- Quote viewed; a valid tiered/optional selection exists (UC-C02). Status `viewed`.

**Flow:**
1. Client signs via the signature widget (or embedded DocuSeal/Documenso flow).
2. SPA submits to `POST /api/v1/public/quotes/:token/sign`.
3. API persists a `signatures` document (method typed/drawn, signer name, **timestamp**, **IP**, quote ref, signed-selection snapshot), advances `viewed → approved` (F-07), appends `activityEvents` "approved" (stops time-to-approval clock), enqueues owner + client `notifications` (F-08).

**Postconditions:**
- A `signatures` record exists; `quotes` status = `approved`; selection is now locked.

**Alt Paths:**
- Empty/blank signature → 422.
- Already approved → idempotent: returns existing `signatures`, no second record.
- Signature must exist **before** any charge — the payment route refuses without it (see E04, UC-C04).

#### UC-C04: Pay deposit (F-05, F-09)

**Description:** Client pays the Stripe deposit (fixed or %). The client-side result is advisory; confirmation is authoritative via webhook.

**Preconditions:**
- `quotes` status = `approved`; a `signatures` record exists (signature gates the charge).

**Flow:**
1. SPA requests `POST /api/v1/public/quotes/:token/deposit-intent`; API verifies signature exists, creates a Stripe PaymentIntent for the computed deposit, writes a `payments` document (status `pending`, links PaymentIntent id), returns the client secret.
2. Client completes card entry via Stripe Elements; Stripe processes the charge.
3. Client browser may receive a success result — **treated as advisory only**; the SPA shows "confirming payment…" and does not itself flip status.
4. Authoritative confirmation arrives via the Stripe webhook (UC-S01), which transitions the quote to `deposit_paid`.

**Postconditions:**
- A `payments` document exists (`pending` until webhook). Quote remains `approved` until the webhook confirms.

**Alt Paths:**
- No signature → 409 "sign before paying" (E04).
- Card declined / `payment_intent.payment_failed` webhook → `payments` marked failed, quote stays `approved`, client may retry; owner notified (E07).
- Client closes tab after paying → webhook still completes the transition server-side (E08).

### System / Stripe webhook (S) Use Cases

#### UC-S01: Process Stripe webhook — confirm deposit & drive state machine (F-09, F-11, F-06, F-07, F-08)

**Description:** Verified Stripe events drive the server-authoritative state machine: confirm payment, advance status, generate the balance invoice, notify both sides — idempotently.

**Preconditions:**
- A registered Stripe webhook endpoint; a `payments` record pending for the PaymentIntent.

**Flow:**
1. Stripe POSTs to `/api/v1/webhooks/stripe`. Handler verifies the Stripe signature against the **raw request body**.
2. Handler attempts to insert a `webhookEvents` document keyed by `eventId` (unique index). If insert fails (duplicate) → acknowledged as already processed, no side effects (idempotency, F-11).
3. On first processing of `payment_intent.succeeded`: state machine confirms a `signatures` record exists (signature → charge gate), marks the linked `payments` `succeeded`, transitions `quotes` `approved → deposit_paid` (F-07).
4. State machine generates the **balance invoice**: creates an `invoices` document for (total − deposit) and a Stripe Invoice (F-06).
5. Handler enqueues `notifications` (deposit paid + balance invoice) to owner and client; Nodemailer dispatches (F-08); appends `activityEvents` "deposit_paid".

**Postconditions:**
- `quotes` status = `deposit_paid`; `payments` succeeded; one `invoices` balance record; `webhookEvents` marked processed; both parties emailed.

**Alt Paths:**
- Duplicate/retried delivery → no-op via unique index (E01), prevents double charge & duplicate invoice.
- `payment_intent.payment_failed` → mark `payments` failed, no status advance, notify owner (E07).
- Signature missing at confirmation time (anomaly) → do not advance; log to `webhookEvents` for owner inspection (E04).
- Webhook arrives before the `payments` "pending" write is visible (race) → handler retries lookup / Stripe re-delivers; idempotency makes eventual processing safe (E09).

---

## Assumptions

### A1: Login-only access, no public signup
Only seeded `users` and a sandbox/demo account exist (F-12). If self-serve onboarding is ever required, an entire registration/verification flow and tenant isolation review must be added — out of scope for v1.

### A2: Clients never authenticate
Client trust derives entirely from possession of the unguessable link token (F-03). If tokens are guessable or leaked, an attacker could view/sign/pay a quote — so tokens must be high-entropy and optionally expiring (E05). No client identity is verified beyond the signed name + captured IP.

### A3: Stripe webhooks are the single source of truth for money
The browser's payment success callback is advisory; only verified webhook events (UC-S01) advance to `deposit_paid` (F-09). If webhook delivery is misconfigured, deposits will be charged but quotes will not advance — webhook health is operationally critical.

### A4: Embedded line items in one quote document
`lineItems` (optional/tiered/toggleable + taxes) live embedded in the `quotes` document and are recomputed server-side. Client-sent totals are never trusted; the server is authoritative on price and deposit.

### A5: Signature precedes payment, always
The state machine refuses to create a deposit intent or mark `deposit_paid` without a `signatures` record (F-04 → F-05/F-09). If this ordering ever changes, the "agreement before money" guarantee and the audit trail break.

### A6: One deposit + one balance invoice per quote
v1 models exactly one deposit charge and one auto-generated balance `invoices` document per quote (F-06). Milestones/partial payments beyond this are out of scope.

## Edge Cases

### E1: Duplicate / retried webhook delivery (idempotency)
**If** Stripe re-delivers the same event (same `eventId`), **then** the unique index on `webhookEvents.eventId` makes the insert fail and the handler returns 200 with no side effects — no double charge, no duplicate balance invoice. Affects UC-S01, F-09, F-11.

### E2: Client toggles optional items changing totals
**If** the client changes the optional/tiered selection (UC-C02) while status is `viewed`, **then** the server recomputes totals and deposit and persists the new selection; **if** they attempt to toggle after `approved`, the API returns 409 (selection locked at signing). Affects F-01, UC-C02, UC-C03.

### E3: PDF stale after toggle
**If** totals change via toggle after a PDF was generated, **then** the stored PDF is regenerated on the next `GET …/pdf` so the document always matches the current selection. Affects F-02, UC-C02, UC-O03.

### E4: Payment attempted before signature
**If** a deposit-intent or confirmation is requested without a `signatures` record, **then** the API returns 409 ("sign before paying") and the state machine refuses to advance. Affects F-04, F-05, F-09, UC-C04, UC-S01.

### E5: Expired or revoked link
**If** the link token is expired or revoked, **then** `GET /api/v1/public/quotes/:token` returns 410 with a "contact sender" message and no quote data; signing/paying routes also reject. Affects F-03, UC-C01.

### E6: Viewing without approving / status regression
**If** a client repeatedly opens an already-`viewed`/`approved`/`deposit_paid` quote, **then** the first open sets `viewed`; later opens append view `activityEvents` but never regress status (status is monotonic in F-07). Affects UC-C01, F-07, F-10.

### E7: Deposit payment failure
**If** Stripe sends `payment_intent.payment_failed`, **then** the `payments` record is marked failed, the quote stays `approved`, the client may retry, and the owner is notified — no balance invoice is generated. Affects F-05, F-08, UC-C04, UC-S01.

### E8: Client closes tab after paying
**If** the client closes the browser after Stripe processes the charge but before any client-side confirmation, **then** the webhook (UC-S01) still completes the transition to `deposit_paid` and generates the balance invoice server-side. Affects F-09, UC-S01.

### E9: Webhook arrives before pending payment write (race / ordering)
**If** `payment_intent.succeeded` arrives before the `payments` "pending" document is visible, **then** the handler treats the lookup miss as transient and relies on Stripe re-delivery; idempotency (E1) guarantees exactly-once effect when it eventually processes. Affects F-09, F-11, UC-S01.

### E10: Concurrency — owner edits while client acts
**If** the owner edits a quote at the same time a client toggles/signs/pays, **then** edits are blocked once status ≥ `approved` (409), and any in-flight client action validates against the persisted server-side selection (last-write-wins on `draft`/`sent`; locked thereafter), preventing total/deposit mismatch. Affects F-01, F-07, UC-O02, UC-C02, UC-C03.

### E11: Duplicate balance invoice prevention
**If** UC-S01 runs twice for the same quote (e.g., manual replay), **then** balance-invoice creation is guarded so only one `invoices` document and one Stripe Invoice exist per quote (idempotency keyed on quote + invoice type). Affects F-06, F-09, F-11.

### E12: Tiered group with no selection at sign time
**If** the client attempts to sign while a required tiered group has no chosen option, **then** signing returns 422 ("select one option") and status stays `viewed`. Affects F-01, F-04, UC-C02, UC-C03.
