# PactLink — Product Requirements

## Problem
Service businesses — contractors, agencies, photographers, event/AV companies, consultants — build quotes in Word/Google Docs, export a PDF, and email it. Approval and deposit collection then happen as two more disconnected, manual steps: the client must reply to approve, and a separate invoice must be sent and chased for the deposit. Each handoff adds latency and drop-off. Deals stall in the gap between "quote sent" and "money received." Existing tools either only generate documents (no payment), only collect payments (no quoting/e-sign), or bundle everything into heavy CRMs that are overkill and slow to adopt. None tie signature → conditional deposit charge → balance invoice into one authoritative server-driven flow.

## Solution
PactLink turns an estimate into a signed agreement and a paid deposit through a single shareable link. The business builds a quote with line items, taxes, and optional/tiered items the client can toggle; PactLink generates a branded PDF and a hosted approval link. The unauthenticated client views the quote, adjusts optional items, e-signs (timestamp + IP captured), and pays a Stripe deposit. A webhook-first state machine — Stripe webhooks as the source of truth, not client redirects — advances the quote through draft → sent → viewed → approved → deposit_paid, auto-generates the balance invoice, and emails both parties.

## Target Users

| Role | Need |
|------|------|
| Business owner (contractor / agency / photographer / event-AV / consultant) | Build and send a quote, get it approved and partially paid in one link, see which quotes convert and how fast — without chasing clients or reconciling separate invoices |
| Client / recipient | Understand a quote, tweak optional items to fit budget, approve and pay a deposit in minutes from any device, with no account or signup |
| System / Stripe webhook (automated actor) | Authoritatively confirm payment, advance quote state, generate the balance invoice, and trigger notifications — idempotently, surviving retries and duplicate events |

## Core Features

### Quoting & Documents

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-01 | Quote builder | Compose quotes with line items, per-line and global taxes, and optional/tiered items the client can toggle; totals recompute server-side | must |
| F-02 | Branded PDF generation | Render a branded PDF of the quote (business logo, colors) reflecting the current selected line items and totals | must |
| F-03 | Hosted shareable approval link | Unauthenticated, tokenized hosted page where the client views the quote without an account | must |

### Agreement & Payment

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-04 | E-signature capture | Typed or drawn signature with server-recorded timestamp and client IP; backed by real signing infra (DocuSeal/Documenso) | must |
| F-05 | Stripe deposit charge | Charge a deposit (fixed amount or % of total) via Stripe on approval | must |
| F-06 | Automatic balance invoice | After deposit is confirmed, auto-generate the remaining-balance invoice | must |

### State, Events & Notifications

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-07 | Status pipeline | Quote lifecycle: draft → sent → viewed → approved → deposit_paid, persisted and surfaced to the owner | must |
| F-08 | Webhook-driven email notifications | Email both business and client on key transitions (viewed, approved, deposit_paid), driven by server events | must |
| F-09 | Signature → charge → invoice state machine | Server-authoritative, webhook-first state machine: signature gates a conditional Stripe charge, confirmed payment gates the balance invoice | must |
| F-11 | Webhook event log | Persisted, idempotent log of every inbound Stripe event for proof of correctness and replay safety | must |

### Account & Analytics

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-10 | Analytics funnel dashboard | Funnel of quotes viewed vs approved vs deposit-paid, plus time-to-approval instrumentation | should |
| F-12 | Login + sandbox/demo account | Login only (no public signup); seeded users plus a sandbox/demo account with example data | must |

## Success Metrics
- **Time-to-approval (median):** elapsed time from `sent` to `approved`, instrumented per quote (F-10); target trend downward vs the email-PDF baseline.
- **Quote-to-deposit conversion rate:** `deposit_paid` ÷ `sent`, segmented by `viewed` and `approved` stages (F-10 funnel).
- **View-to-approval rate:** `approved` ÷ `viewed` — isolates link/quote clarity from delivery.
- **Webhook correctness:** 100% of `deposit_paid` transitions traceable to a logged, idempotently-handled Stripe event (F-11); zero double-charges, zero duplicate balance invoices.
- **Single-link completion:** % of approved quotes where signature + deposit complete in one client session without manual follow-up.

## Out of Scope (v1)
- Public self-serve signup and in-app billing tiers for PactLink itself — access is login-only + sandbox; monetization is a "request early access / contact" gate (no self-serve billing UI).
- Client accounts — clients are always unauthenticated link recipients.
- Recurring/subscription billing, milestone/progress billing beyond a single deposit + balance invoice.
- Multi-currency tax compliance engines, full accounting/GL integration, payouts reconciliation UI.
- Native mobile apps; collaborative multi-user editing of a single quote; offline mode.
- Payment providers other than Stripe; e-sign legal certification beyond what DocuSeal/Documenso provides.
