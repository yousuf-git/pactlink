# PactLink — Frontend Design

## Design Philosophy

**Confident fintech trust, two surfaces, one feeling: "your money is handled correctly."** PactLink moves real deposits, so the UI must read as deliberate and auditable — not a playful SaaS toy, not a cold enterprise console. Stack: **React 18 + Vite + Tailwind CSS** (per TRD). Two distinct surfaces share one design language:

- **(A) Owner Dashboard** — data-dense: quote builder, pipeline kanban, funnel analytics, webhook event log. Tone: instrument panel. Compact, legible, quiet chrome, numbers in mono so columns align. Information density over whitespace.
- **(B) Client Approval Page** — unauthenticated, conversion-critical. Tone: calm, generous, premium. A stranger lands here and must trust it enough to sign and pay. Roomy spacing, branded header (owner's logo + color), one obvious path: review → toggle → sign → pay. Zero dashboard clutter.

Shared anchors keep them coherent: the same deep teal-navy primary (institutional trust), the same money-green success, the same type system. The dashboard turns the density up; the approval page turns the warmth up.

## Color System

### Primary Palette
- **Primary:** `#1B4965` — deep teal-navy. Primary CTAs ("Send quote", "Approve & sign"), active nav, links, focus rings. Institutional, trustworthy, not generic SaaS-blue. Default owner `brand.primaryColor`.
- **Secondary:** `#5FA8D3` — bright sky accent. Secondary buttons, info chips, selected toggle borders, chart secondary series, hover lift on primary surfaces.
- **Accent:** `#F4A259` — warm amber. Sparing highlight: "optional item" toggle badges, "viewed" pipeline stage dot, attention nudges on the approval page. The single warm hue that softens the cool palette.

### Neutral Palette
- **Background:** `#F7F9FB` — app canvas behind cards (dashboard) and approval page body. Cool near-white, lower glare than pure white for long dashboard sessions.
- **Surface:** `#FFFFFF` — cards, modals, tables, the approval document. Pure white = "this is the paper / the record".
- **Surface Alt:** `#EEF3F7` — zebra table rows, kanban column backs, hovered list rows, inactive tabs.
- **Border:** `#D7E0E8` — 1px hairlines on cards, table cell dividers, input outlines. Cool gray-blue, never pure gray.
- **Text Primary:** `#0F2330` — headings, table values, money figures. Near-black with a navy bias to match primary.
- **Text Secondary:** `#5A6B78` — captions, labels, helper text, muted timestamps, table column headers.

### Semantic Colors
- **Success:** `#2E9E6B` — money-green. `deposit_paid` / `approved` states, "Paid" badges, succeeded payments, the deposit-paid stage of the funnel. The reward color — appears at the bottom of every successful flow.
- **Warning:** `#E0A11A` — amber-gold. `failed`/retry notification status, expiring links, deposit-pending. Distinct enough from accent `#F4A259` to avoid confusion (warning is more saturated/gold).
- **Error:** `#D14545` — payment failed, validation errors, webhook processing error rows. Used only for genuine failure, never decoration.
- **Info:** `#3E7CB1` — neutral system notices, `viewed` activity, idempotent-skip notes in the event log.

### Gradients
- **Trust header:** `linear-gradient(135deg, #1B4965 0%, #2C5F7E 100%)` — approval-page branded header band and dashboard top auth/login panel. Subtle depth, never on body content.
- **Funnel fill:** `linear-gradient(180deg, #5FA8D3 0%, #2E9E6B 100%)` — funnel chart bars transition sky→green from "viewed" down to "deposit_paid", visually encoding progress toward money (F-10).

## Typography

### Fonts
- **Display / Headings:** **Fraunces** (variable serif) — used for page titles, the approval-page quote title, and key money totals. A modern high-contrast serif signals "agreement / document / legal weight" — the thing a contract should feel like — without looking dusty. This is the deliberate non-default choice: it distinguishes PactLink from every Inter-flat SaaS and reinforces the "signed agreement" nature. Used sparingly (titles + hero totals only).
- **Body / UI:** **Inter** — all interface text, tables, forms, buttons, labels. Justified: Inter's high x-height and tabular-figure support make dense financial tables and form-heavy quote builders maximally legible at small sizes; pairing a characterful serif display with a neutral workhorse body is the trust-doc convention (think modern bank statements). Inter carries the UI so Fraunces can carry the character.
- **Mono:** **JetBrains Mono** — money amounts in tables/totals (tabular alignment of currency columns), webhook event ids, `eventId`/`paymentIntentId`, timestamps, and the event-log payload viewer. Ensures financial columns and identifiers align and read as "system data".

### Scale
| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-xs` | 12px | 400 | table column headers, captions, timestamp meta, badge text |
| `text-sm` | 14px | 400 | body small, helper text, table cell values, form labels |
| `text-base` | 16px | 400 | default body, approval-page line-item text |
| `text-lg` | 18px | 500 | emphasized body, card titles, line-item labels |
| `text-xl` | 20px | 600 | section headings, modal titles |
| `text-2xl` | 24px | 700 (Fraunces) | page headings, quote title on approval page |
| `text-4xl` | 36px | 700 (Fraunces) | hero total / deposit-due amount on approval page |

## Spacing & Layout
- **Base unit:** 4px (Tailwind default scale).
- **Content max-width:** Dashboard `1280px` (with persistent sidebar); Approval page `720px` (centered single column — focused, document-like).
- **Layout pattern:**
  - **Dashboard (A):** persistent left sidebar (icon + label nav: Quotes, Pipeline, Analytics, Webhooks, Clients) + main content area. Quote builder = two-pane (form left, live preview/PDF + totals right). Pipeline = horizontal kanban columns.
  - **Approval page (B):** centered single column, branded gradient header, then the quote "paper" card, sticky bottom summary bar (running total + deposit due + primary CTA) on mobile.
- **Border radius:** `8px` cards/inputs/buttons (moderate — approachable but not bubbly); `6px` table containers; `9999px` (pill) for status badges and stage tags; `12px` for the approval-page document card and modals (slightly softer to feel premium).

## Motion & Interaction
- **Principle:** Functional and reassuring — motion confirms state and money changes, never decorates. The approval page may breathe slightly more (trust = calm), the dashboard stays crisp.
- **Duration:** 150ms micro (hover, toggle, focus), 250ms transitions (modals, drawer, kanban card move), 400ms for the approval/payment success reveal.
- **Easing:** `ease-out` for entrances and value updates; `ease-in` for dismissals.
- **Key interactions:**
  - **Live total recalculation (F-01/F-03):** toggling an optional/tiered line item animates the subtotal/tax/total/deposit with a 150ms count-up tween and a brief secondary-color flash on the changed figure — the user *sees* the number move, building confidence the math is live and correct.
  - **Pipeline (F-07):** kanban cards slide 250ms between columns on status change; stage dots fill in sequence.
  - **Payment success (F-09):** deposit-paid confirmation fades in (400ms) with the money-green success state and a settle-in checkmark — calm, not confetti.
  - **Webhook log:** new rows fade-in at top; processing state pulses subtly until `processed:true`.

## Component Tone

- **Buttons:** Primary = solid `#1B4965`, white text, 8px radius, 150ms `ease-out` slight lift + darken on hover. Secondary = `#5FA8D3` outline/ghost. Destructive = `#D14545` outline. The approval-page primary CTA ("Approve & Pay Deposit") is full-width, larger, sticky on mobile — the single unmissable action.
- **Cards:** Flat `#FFFFFF` on `#F7F9FB`, 1px `#D7E0E8` border, 8–12px radius. No heavy shadows; subtle `0 1px 2px rgba(15,35,48,.06)` on hover for dashboard cards. The approval-page quote card reads as a sheet of paper.
- **Forms (quote builder):** Bordered inputs (not underline — financial entry needs clear, tappable targets), `#D7E0E8` border, `#1B4965` 2px focus ring. Labels `text-sm` `#5A6B78` above field. Money inputs right-aligned, mono, with currency prefix. Inline validation in `#D14545` below field.
- **Line-item table with toggles (F-01/F-03):** Compact rows, zebra `#EEF3F7`. `optional` items show an amber pill badge ("Optional") + a switch; toggling instantly recalculates totals (see Motion). `tiered` items within a `tierGroup` render as radio-style mutually-exclusive selectors. Deselected rows dim to `#5A6B78` text with strike-through price. Money columns mono, right-aligned. On the approval page the same table is read-only except the toggles — clean, no dashboard chrome.
- **Signature pad (F-04):** Bordered `12px` card, two tabs: **Type** (large Fraunces-rendered name input previewing the signature) and **Draw** (canvas with clear/undo). Below: small `text-xs` `#5A6B78` legal line showing captured timestamp + IP ("Signed by {name} · {date} · IP {ip}"). Subtle, lawful, never gimmicky.
- **Stripe payment step (F-05/F-09):** Stripe Elements styled to match — `#D7E0E8` borders, `#1B4965` focus, Inter. A summary line above: "Deposit due today: **{amount}**" (Fraunces total, mono amount) and "Balance {amount} invoiced after". Locked-feel: small lock glyph + "Secured by Stripe" in `#5A6B78`. Button: full-width primary. Success → 400ms money-green confirmation.
- **Status pipeline visualization (F-07):** Two forms. (1) Per-quote: horizontal 5-step stepper draft→sent→viewed→approved→deposit_paid, completed steps `#2E9E6B`, current `#5FA8D3`, future `#D7E0E8`; each step shows its timestamp (mono, `text-xs`). (2) Board: kanban with one column per status, count chips per column, draggable/auto-moving cards.
- **Analytics funnel (F-10):** Vertical funnel — Viewed → Approved → Deposit-Paid — bars using the **Funnel fill** gradient (sky→green), each with count + conversion % vs prior stage. Beside it, a "Median time-to-approval" stat card (`approvedAt − sentAt`) in large Fraunces. Quiet grid, no chart-junk; `#5A6B78` axis labels.
- **Webhook event log table (F-11):** Dense, mono-leaning audit table. Columns: time (mono), provider badge (`stripe`/`docuseal`), `type`, `eventId` (mono, truncate-with-copy), processed status pill (green `processed` / amber `pending` / red `error`). Row click → side drawer showing the raw `payload` JSON in JetBrains Mono with syntax tint. Duplicate/idempotent-skipped events tagged with an `Info` `#3E7CB1` "deduped" chip — visibly proving F-11 correctness. Sticky header, zebra rows, compact density.
- **Navigation:** Persistent left sidebar (dashboard only), icon + label, active item = `#1B4965` filled background + white icon. Approval page has no app nav — only the branded owner header, reinforcing it's the client's space.
- **Badges / status pills:** Pill (9999px), `text-xs`, semantic-tinted backgrounds at ~12% opacity with solid-color text (e.g. `deposit_paid` = green bg/green text, `failed` = red, `viewed` = amber accent, `sent` = info blue).

## Dark / Light Mode

**Light only (v1).** Reason: the product nature is financial documents and an unauthenticated client-facing approval/payment page where universal trust and print-parity (the "paper" metaphor, branded PDF match) matter more than dark-mode polish. A dark dashboard adds surface area and trust-erosion risk on the client page for no v1 user value. Palette is structured (token-based) so dark mode can be added later without rework.
