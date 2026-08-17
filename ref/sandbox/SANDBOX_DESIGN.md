# Backend-Connected Sandbox — Generic Design

A reusable design for a **try-before-signup sandbox**: a real, backend-connected demo where any visitor gets an isolated, fully-mutable copy of seed data, can perform real CRUD against the actual API surface, and whose data self-destructs after a short window. No signup, no pollution of the production database, and a token that cannot be tampered with to extend access.

This document describes the **pattern only** — it is intentionally entity-agnostic. Substitute your own resources, fields, and reference relationships.

---

## 1. Goals & constraints

| Goal | Mechanism |
|---|---|
| No signup to try the product | Anonymous session-start endpoint issues a token |
| Real backend behavior, not mocked client data | Sandbox calls hit a real API + real database |
| One visitor cannot see/affect another's data | Per-session ownership tag on every document |
| Production data stays pristine | Sandbox lives in its own database / namespace |
| Demo data resets and never accumulates | Per-session expiry + scheduled purge |
| Token cannot be edited to extend access | Signed token **and** server-authoritative expiry check |
| Minimal code to maintain | One generic CRUD layer, not per-entity controllers |

**Non-goal:** the sandbox is not a security boundary for sensitive data — it holds only seed-derived demo data. Its isolation guarantees are about *correctness and cleanliness*, not confidentiality of real customer data.

---

## 2. Core concepts

Three layers of data live side by side, distinguished only by metadata fields:

1. **Canonical seed** — one curated, realistic dataset. Marked `isSeed = true`, `expiresAt = null` (never expires, never purged). It is *read-only at runtime* — never mutated, never served directly to a session. It is the template.
2. **Session copies** — when a visitor starts a session, the entire seed is **cloned** into a fresh, fully-mutable copy tagged with that `sessionId` and an `expiresAt`. This is what the visitor reads and writes.
3. **Session registry** — one record per session (`sessionId`, optional profile, `expiresAt`). This is the **authoritative source of truth for expiry**.

Every sandbox document carries three meta fields:

```
sessionId   // owning session; null = canonical seed
isSeed      // true only for the canonical template rows
expiresAt   // when this row dies; null = seed (immortal)
```

---

## 3. Isolation strategy

Pick the strongest isolation your infra allows. In order of preference:

- **Separate database, same cluster** (recommended default) — sandbox gets its own DB (e.g. `app_sandbox`). Production schema/queries are physically unable to see it. Cheap on a shared cluster.
- **Prefixed collections/tables** in the same DB — e.g. `sb_<resource>`. Weaker; relies on every query remembering the prefix.
- **Row-level tag only** — sandbox rows interleaved with real rows, separated by a `sandbox=true` flag. Avoid: one missing filter leaks demo data into production views.

Within the sandbox store, schemas are **flexible/loose** (`strict: false` or schemaless) so any entity shape is stored without duplicating production schemas. One generic model factory maps a `resourceKey` → a sandbox collection (`resource` → `sb_resource`), caching the model.

---

## 4. Session lifecycle

```
START                     USE                          END
  │                        │                            │
  ▼                        ▼                            ▼
POST /session/start    every request carries      token expires (signature)
  → create session     the token; gate verifies     +
    registry record     signature + DB expiry,       session registry expiresAt passes
  → clone seed →         scopes all I/O to            +
    session copies       sessionId                    scheduled purge deletes
  → sign token (TTL)                                  expired copies + registry rows
  → return token
    + expiresAt
```

### 4.1 Start (anonymous, public)

```
POST /sandbox/session/start   { optional profile: name, email, role, company }

1. sessionId   = random UUID
2. expiresAt   = now + TTL          (e.g. 6 hours)
3. insert session-registry record { sessionId, profile, expiresAt }
4. cloneSeedIntoSession(sessionId, expiresAt)   // see §5
5. token = sign({ sessionId }, SANDBOX_SECRET, expiresIn: TTL)
6. return { token, expiresAt, profile }
```

The profile is cosmetic (used to greet the visitor / fill a fake "current user"). It carries no privilege.

### 4.2 Continue an existing session

The client stores `{ token, expiresAt, profile }` (e.g. in `localStorage`) so the session survives reloads. On return:

- **Client fast-check:** if `now < expiresAt`, offer "continue previous session".
- **Server confirm:** call a lightweight `GET /session/me` (token in header). Server re-validates against the DB registry and returns the profile + expiry, or `401`.

The client check is only an optimization; **the server is authoritative on every request**.

### 4.3 End

No explicit logout needed. The session dies when the signed token expires *and* is reaped by the purge job (§7). A client "exit" just discards the stored token.

---

## 5. Seed cloning with reference remapping

The hard part: the seed has internal relationships (foreign keys / object references). When cloning, every copied document needs a **new id**, and every reference pointing at a seed id must be rewritten to point at the corresponding **new** id — otherwise relations break or, worse, a session's records reference another plane's rows.

Two metadata structures drive this generically:

- **`REFERENCE_GRAPH`** — per resource, a list of `{ field, target, array? }` describing which fields hold references and what resource they point to.
- **`RESOURCE_ORDER`** — all resources sorted **independent → dependent**, so inserts happen in dependency order.

```
cloneSeedIntoSession(sessionId, expiresAt):

  # Pass 1 — load + allocate new ids (build the remap table)
  idMap = {}                                  # oldId(str) -> newId
  loaded = {}
  for resource in RESOURCE_ORDER:
      docs = find({ isSeed: true }) in resource
      for doc in docs:
          newId = generateId()
          idMap[str(doc.id)] = newId
          loaded[resource].push({ doc, newId })

  # Pass 2 — rewrite references + meta, then insert
  for resource in RESOURCE_ORDER:
      for { doc, newId } in loaded[resource]:
          clone = copy(doc)
          strip(clone, [version, createdAt, updatedAt])   # let store regenerate
          clone.id        = newId
          clone.sessionId = sessionId
          clone.isSeed    = false
          clone.expiresAt = expiresAt
          for ref in REFERENCE_GRAPH[resource]:
              clone[ref.field] = ref.array
                  ? listOf(clone[ref.field]).map(v => idMap[str(v)] ?? v)
                  : (idMap[str(clone[ref.field])] ?? clone[ref.field])
          insert clone into resource
```

Notes:
- **Two passes** are required: every id must exist in `idMap` before any reference is rewritten (handles cycles and forward references).
- Remap is a safe lookup: a value with no entry in `idMap` is left untouched (e.g. an enum id or an intentionally external ref).
- Insert unordered/batched per resource for speed; dependency order across resources keeps referential integrity if the store enforces it.

---

## 6. Request gate (the security core)

A single middleware guards **every** sandbox route except `session/start`.

```
requireSandbox(req):
  token = req.header("x-sandbox-token") OR bearer
  if !token: 401

  try: decoded = verify(token, SANDBOX_SECRET)     # HMAC — payload cannot be edited
  catch: 401  "invalid or expired token"

  session = registry.findOne({ sessionId: decoded.sessionId })
  if !session: 401  "session not found"
  if session.expiresAt <= now: 401  "session expired"   # DB-authoritative

  req.session = session
  runWithSandbox({ sessionId }, next)               # bind ambient context
```

### Why this is tamper-proof

The threat: a visitor edits their token to push `expiresAt` far into the future to keep the demo forever (or to guess another `sessionId`).

Two independent defenses:

1. **Signed token (HMAC).** The token is signed with a server-only secret. Any edit to the payload (including its own `exp`) invalidates the signature → `verify` throws → `401`. The client cannot forge a valid token without the secret.
2. **Server-authoritative expiry.** Even if token verification alone were trusted, the gate **re-reads `expiresAt` from the session registry in the database** and rejects if past. Expiry lives server-side; the token's self-described expiry is never the sole authority. Editing the token cannot move the DB record.

Additional hardening:
- **Separate secret** from the real auth system (`SANDBOX_SECRET` ≠ production JWT secret), so sandbox tokens can never be confused with privileged auth tokens.
- `sessionId` is a random UUID — not enumerable/guessable in practice.
- The gate scopes I/O to `sessionId` (§6.1), so even a valid token only ever touches its own copy.

### 6.1 Ambient session scoping

After the gate passes, bind the `sessionId` into a request-scoped ambient context (e.g. `AsyncLocalStorage`, thread-local, or explicit param). The generic CRUD layer reads it and **adds `sessionId` to every query filter and every write**, so cross-session access is structurally impossible — no handler can forget to scope.

---

## 7. Expiry & purge

- **TTL** (e.g. 6h) is fixed at start and stamped onto: the token (`exp`), the session registry record (`expiresAt`), and every cloned document (`expiresAt`).
- **Scheduled purge** runs on an interval (e.g. every 2h via cron):

```
purgeExpired():
  for resource in all sandbox resources:
      deleteMany({ expiresAt != null AND expiresAt <= now })   # never deletes seed (expiresAt null)
  registry.deleteMany({ expiresAt <= now })
  log counts
```

The `expiresAt != null` guard is what protects the canonical seed: seed rows have `expiresAt = null` and are never matched. Sessions are reaped lazily — an expired session is *unusable* the instant its token/DB-expiry passes (the gate `401`s), and *removed* at the next purge tick. The exact purge cadence only affects storage cleanliness, not access.

---

## 8. Generic CRUD layer

One set of handlers serves **all** resources via a `:resource` path param → model factory. No per-entity controllers.

| Route | Action |
|---|---|
| `POST /session/start` | public — create session + clone seed + return token |
| `GET  /session/me` | gated — validate token, return profile + expiry |
| `GET  /:resource` | list, filtered to `sessionId` |
| `GET  /:resource/:id` | read one (scoped) |
| `POST /:resource` | create (stamps `sessionId`, `isSeed=false`, `expiresAt`) |
| `PUT  /:resource/:id` | update (scoped; strips meta fields from body) |
| `PUT  /:resource/:id/:action` | sub-actions: `toggle` / `soft-delete` / `restore` |
| `DELETE /:resource/:id` | delete (scoped) |

Implementation notes:
- **Always inject the session filter.** Every read uses `{ sessionId }`; every write stamps `sessionId` + `expiresAt`. Never trust an `id` alone.
- **Strip meta on write.** Drop `id`/`sessionId`/`isSeed`/`expiresAt` from inbound bodies so a client can't reassign ownership or immortalize a row.
- **Loose-schema gotcha.** With schemaless/`strict:false` documents, undeclared fields may need an explicit `.set(field, value)` (not direct assignment) to persist — verify per ORM.
- **Mirror production read shapes.** If the real API returns *populated* (joined/expanded) references, the sandbox `list`/`getOne` must do the same: resolve each `REFERENCE_GRAPH` field by loading the referenced docs *within the same session* and substituting them inline. Otherwise the frontend, which expects expanded objects, breaks. A one-level populate using the same reference graph is enough.

```
populateRefs(rows, resource, sessionId):
  for ref in REFERENCE_GRAPH[resource]:
      ids = collect non-null ref.field values across rows
      targets = find({ sessionId, id in ids }) in ref.target
      map = { id -> doc }
      replace each row[ref.field] (id or array of ids) with the doc(s)
```

---

## 9. Frontend integration

- **Single switch.** A `isSandbox()` predicate (token present and not client-expired) flips the API layer's base URL and auth header. The same UI/components run against either the real API or the sandbox — only the transport differs.
- **Token storage.** Persist `{ token, expiresAt, profile }` in `localStorage` so the session survives reloads and leaving the site. Treat the client-side expiry as a hint only.
- **Header, not cookie.** Send the token as `x-sandbox-token` (or bearer). Keeps it fully separate from the real auth cookie/session.
- **Routes.** Sandbox endpoints typically mount at the server root (`/sandbox/*`), *outside* the authenticated `/api/*` tree, since they use their own gate.
- **Entry UX.** A gate screen: "Start sandbox" (calls `session/start`) and, when a valid token exists, "Continue previous session" (confirmed via `session/me`).

---

## 10. Environment / config

| Variable | Purpose |
|---|---|
| `SANDBOX_DB_NAME` | isolated sandbox database/namespace |
| `SANDBOX_SECRET` | HMAC secret for signing sandbox tokens (≠ production auth secret) |
| `SANDBOX_TTL` | session lifetime (e.g. `6h`) |
| `SANDBOX_PURGE_CRON` | purge interval (e.g. every 2h) |

---

## 11. Build / seed order

1. Provision the isolated store (separate DB/namespace).
2. Author the **canonical seed**: realistic, every field and variant populated, all reference fields wired. Insert with `isSeed = true`, `expiresAt = null`.
3. Define `RESOURCE_ORDER` (independent → dependent) and `REFERENCE_GRAPH` (per-resource ref fields + targets + array flag).
4. Stand up the model factory, the gate, the ambient context, the generic CRUD layer, and the purge job.
5. Flip the frontend switch on `isSandbox()`.

---

## 12. Pitfalls checklist

- [ ] Seed never mutated or served directly — only cloned.
- [ ] `expiresAt != null` guard on every purge delete (or you nuke the seed).
- [ ] Two-pass clone — all new ids allocated before any reference is rewritten.
- [ ] Every CRUD query scoped to `sessionId` — no bare `id` lookups.
- [ ] Inbound bodies stripped of meta fields (`sessionId`/`isSeed`/`expiresAt`/`id`).
- [ ] Expiry verified against the **DB**, not just the token claim.
- [ ] Sandbox secret distinct from production auth secret.
- [ ] Populated read shapes match the real API or the frontend breaks.
- [ ] Reference order covers cycles (two-pass handles forward refs).
