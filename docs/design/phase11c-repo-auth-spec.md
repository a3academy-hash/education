# Phase 11 — Workstream C — Repository Swap & Auth — Design Spec

Status: DRAFT for gate review (mr-gates primary — repository contract, client/RLS
architecture, cross-module; mr-kahn — evidence-trail/graph_version stamping integrity;
pee-wee — parent-held login/child-select UX honesty). Keep-moving workflow: gate →
implement (Opus) → mr-gates diff review → commit. LIVE verification (DoD) needs Matt to
have RUN migrations 0001→0004 + added SUPABASE_SERVICE_ROLE_KEY; in-memory tests stay
green regardless.

Deps approved + installed: `@supabase/supabase-js` + `@supabase/ssr`. Matt ruled auth =
**parent-held**.

Goal: implement `SupabaseRepository` against the EXISTING `A3Repository` interface
(in-memory is the contract — match exactly), add Supabase Auth (parent-held), feature-flag
the swap so in-memory stays for tests. Engine/mastery/evidence math UNCHANGED.

---

## 1. Three clients (`lib/supabase/`), least-privilege
- `client.ts` (browser): `createBrowserClient(url, PUBLISHABLE_KEY)` — auth UI + client
  components only. Holds only the public key; RLS-scoped as the signed-in principal.
- `server.ts` (SSR, USER-scoped): `createServerClient` reading `cookies()` — runs as the
  authenticated user, **RLS-enforced**. The default for student-facing reads + own-insert
  writes (defense-in-depth: even an app bug cannot cross students).
- `service.ts` (server-only, RLS-BYPASS): `createClient(url, SERVICE_ROLE_KEY,
  {auth:{persistSession:false}})`. Guarded server-only (the `lib/repository/server.ts`
  window-check pattern). Used ONLY where RLS has no app path: `student_skill_state` writes,
  `grade_artifacts` issuance, `curriculum_graphs`/`video_assets` writes. NEVER in browser,
  NEVER logged. Smallest possible surface.

## 2. SupabaseRepository client split (mr-gates: rule the exact split)
The repo is constructed per-request with BOTH `{ userClient, serviceClient }`. Principle:
**use the RLS-scoped userClient wherever a policy permits; reach for serviceClient ONLY for
engine-only tables.** Proposed mapping:
- userClient (RLS): getStudent, getSkillStates (read), listAttempts, listMasteryUpdates,
  appendAttempt, appendMasteryUpdate (own-insert with-check passes for the student's own
  session), createSession.
- serviceClient (bypass): setSkillState (no app write policy), grade_artifacts issuance,
  curriculum/video writes, and any inherently cross-student/admin read that staff RLS
  doesn't already cover server-side.
- listStudents (roster): staff path — userClient under a staff session (RLS staff-by-campus
  returns the campus roster). NOT service-role (keep RLS as the lock).

> mr-gates decision C1: confirm the split, especially that engine writes which CAN go
> through RLS (attempts/mastery_updates own-insert) do so via userClient, and serviceClient
> is reserved for skill_state/grade/curriculum/video. Minimizing service-role surface is the
> blast-radius control on this workstream.

## 3. Repository factory refactor (cross-module — mr-gates)
`lib/repository/server.ts` currently returns a PROCESS singleton (InMemory). Supabase
clients are PER-REQUEST (cookies), so:
- Add a feature flag `REPOSITORY_BACKEND` (env: `memory` | `supabase`; default `memory`).
- `getRepository()` becomes: if `memory` → the existing InMemory singleton (unchanged path,
  tests use this). If `supabase` → build a request-scoped SupabaseRepository from the
  per-request clients. Keep the server-only guard.
- All call sites already `await getRepository()` server-side — confirm none cache it across
  requests. Tests pin `REPOSITORY_BACKEND=memory`; all 600+ stay green on in-memory.

## 4. graph_version + engine_version stamping (mr-kahn G2 — non-negotiable)
Evidence rows now require `graph_version NOT NULL` (+ engine_version). The WRITER stamps it
at write time from the graph it actually loaded:
- Add `graphVersion` (and `engineVersion` where missing) to `NewStudentAttempt` /
  `NewMasteryUpdate` (types/student.ts — mr-gates gates the /types change), OR have the
  repo stamp from a single `GRAPH_VERSION` derived from the loaded graph
  (data/algebra1-graph.json `schema.version` + the active `curriculum_graphs` row).
- Recommend: a server-side `getActiveGraphVersion()` (reads the loaded graph's version;
  later cross-checks curriculum_graphs active row) and the repo stamps every evidence insert.
  Never back-filled from "whatever is active now" — stamped from the graph the engine used.
> mr-kahn: confirm stamping source (loaded graph version) and that schema_version + content
> graph_version are both captured. mr-gates: confirm whether to thread via the New* types
> (explicit) or stamp in the repo (centralized).

## 5. Auth — parent-held (Matt ruled). The child-scoping question (mr-gates + maybe Matt)
Parent signs up via Supabase Auth (email/password). `role='parent'` in app_metadata. The
parent provisions student profiles + parent_student_links + consent_events (server action,
service-role). The hard part: a student's OWN-INSERT RLS (`with check student_id =
current_student_id()`) needs the ACTIVE SESSION's JWT to carry `student_id = the child`.
Two models:

- **Model A — parent session + child-scoping token (literal "parent-held"):** parent
  authenticates; selecting a child calls a server action that, after validating the
  parent→child link + granted consent, issues a child-scoped JWT (via a Supabase
  `custom_access_token_hook` reading a server-set active-student, or a short-lived signed
  token) carrying `student_id=child`, `role='student'`, `campus_id`. Faithful to "student
  logs in under the parent," but the token re-issue on child-switch is the complex,
  security-sensitive piece.
- **Model B — parent-provisioned student identity (hybrid):** the student has their own
  Supabase auth identity (provisioned + controlled + consented by the parent), JWT carries
  a stable `student_id=uid` (via an access-token hook reading student_profiles). The parent
  has a separate parent login for oversight (reads via is_parent_of). "Parent-held" =
  parent holds provisioning + consent + oversight authority. RLS-cleanest (stable claim).

Recommend **Model A** to honor Matt's "parent-held + student logs in under the parent,"
implemented via a `custom_access_token_hook` that injects `student_id/role/campus_id` from
a server-validated active-student selection (link + consent checked). If the gates judge the
token-reissue complexity a COPPA/security risk, fall back to Model B. **mr-gates rules the
mechanism; flag to Matt if the choice changes the COPPA posture.**

JWT claims feeding the 0002 helpers: `current_actor_id()` ← `sub` (or actor_id);
`current_student_id()` ← `student_id`; `current_campus_id()` ← `campus_id`; role ← `role`.
The access-token hook is the single place these are minted — it must match the helper reads
exactly (the 0002/0004 contract).

## 6. Env (already in .env.local, gitignored)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/ANON_KEY (client);
SUPABASE_SERVICE_ROLE_KEY (server-only, Matt adds). The service-role key is read ONLY in
`lib/supabase/service.ts` behind the server-only guard; never imported client-side, never
logged, never in a NEXT_PUBLIC var.

## 7. Feature flag + test posture
- `REPOSITORY_BACKEND=memory` (default + CI/tests) → InMemory, all 600+ tests green.
- `REPOSITORY_BACKEND=supabase` (live) → SupabaseRepository.
- The SupabaseRepository itself is integration-tested against a live project (Matt-run),
  NOT in the vitest unit suite (which stays in-memory + deterministic). Document how to run
  the integration check.

## Gates requested
- **mr-gates**: client split (C1), the service-role least-privilege surface, the
  getRepository per-request refactor (cross-module), the feature flag, the auth model
  (Model A vs B) + the access-token-hook↔helper-claim contract, and that the service-role
  key can never reach the browser. The heart: one wrong client choice leaks a child's data.
- **mr-kahn**: graph_version/engine_version stamping at write time (source + both axes),
  append-only preserved through the Supabase writes, evidence-trail integrity unchanged.
- **pee-wee**: the parent-held login + child-select UX (parent signs in, picks a child to
  "play," consent-paused state honest), and that auth error/empty states are calm and
  non-alarming for a family.

Verdict: APPROVE | APPROVE WITH CHANGES (list) | REJECT (reason).

---

## GATE RESOLUTIONS — BINDING (supersedes conflicting text above)

mr-gates APPROVE WITH CHANGES (5 blocker + should/nits) · mr-kahn APPROVE WITH CHANGES
(5) · pee-wee APPROVE WITH NOTES (5, all UX follow-ups). The AUTH MODEL (A vs B) is a
mr-gates↔pee-wee CONFLICT + COPPA human checkpoint → **ESCALATED TO MATT** (below); NO C
implementation begins until Matt rules. Everything else is folded here.

### Repository & clients (mr-gates C1/1-a/2-a/2-b)
C-R1. Client split APPROVED: userClient (RLS) for reads + own-insert writes (attempts,
   mastery_updates, diagnostic_estimates, sessions); serviceClient (bypass) ONLY for
   skill_state, grade_artifacts, curriculum, video; listStudents via userClient under a
   staff session. Minimize service-role surface.
C-R2. `getGraph()` is BACKEND-NEUTRAL: reads the bundled data/algebra1-graph.json (same as
   in-memory), works PRE-auth, NEVER service-role. (Curriculum_graphs `using(true)` read is
   only a later cross-check, not the load path.)
C-R3. **`getRepository()` becomes `async`** (Supabase clients need per-request `cookies()`).
   The spec's "already await" claim was WRONG — ~13 call sites currently call it
   synchronously and MUST change to `const repo = await getRepository();`
   (app/student/(shell)/{summary,diagnostic,progress,learn/[skillId],practice/[skillId],
   page,layout}, practice+diagnostic actions, onboarding actions, app/admin/students[/...],
   + the lib/practice-session + lib/inspector indirections). memory-mode path behavior
   UNCHANGED (Promise wrapper is free); Supabase mode builds a FRESH repo per request (no
   globalThis caching of the Supabase repo). Add a test asserting memory-mode returns the
   in-memory instance.
C-R4. Per-module server-only guards: BOTH lib/supabase/service.ts and lib/supabase/server.ts
   carry their own `typeof window` throw (not just the repository module's guard).

### Service-role isolation (mr-gates 5-a/5-b/5-c)
C-S1. SUPABASE_SERVICE_ROLE_KEY read ONLY in lib/supabase/service.ts (no NEXT_PUBLIC_),
   behind the window guard, never logged. Build-time assertion: throw loudly if missing in
   `supabase` mode. Service client constructed lazily inside the repo, never module-exported
   where it could cross the server/client boundary as a prop.

### graph_version / engine_version stamping (mr-kahn 1/2/3/5 + mr-gates 4-a) — replay-grade
C-G1. Stamp CENTRALLY in `appendAttempt`/`appendMasteryUpdate` (single chokepoint; never
   threaded through call sites). Source = the SAME loaded `CurriculumGraph` instance the
   engine used for that request — `graph.schema.version`. Rename the getter
   **`getLoadedGraphVersion()`** (NOT "Active"); the curriculum_graphs active row may ONLY
   be read as a cross-check that RAISES on mismatch — never the source copied from.
C-G2. Extend the TYPES to match the new NOT NULL columns: `StudentAttempt` gains
   `graphVersion` + `engineVersion`; `MasteryUpdate` gains `graphVersion` (already has
   engineVersion). In-memory repo stamps the SAME fields (contract parity — "in-memory is
   the contract"). No insert path can omit a stamp (columns are NOT NULL → fail-closed).
C-G3. Capture both axes: content `graph_version` ← graph.schema.version. If a distinct
   structural `schema_version` is needed, source it from the curriculum_graphs row;
   TODAY the graph exposes one version string — stamp graph_version from it and FLAG to
   mr-kahn at implementation whether a second axis must be separately defined. (mr-kahn
   gates this — confirm one-string-is-acceptable or define the second.)
C-G4. Read the graph instance + its version ONCE per request and reuse (no mid-request
   re-load / activation-flip hazard).

### Append-only preservation (mr-kahn 4 + mr-gates 6-a)
C-A1. SupabaseRepository contains NO `.update()`/`.delete()` against any evidence table
   (attempts, mastery_updates, diagnostic_estimates, summative_results, grade_artifacts).
   Evidence inserts are INSERT only — NEVER `upsert`. `setSkillState` is the SOLE mutable
   write and the only place `upsert` is allowed (keyed (student_id, skill_id), serviceClient).
   mr-gates diff review checks "no upsert on evidence tables" explicitly.

### Auth claim contract (mr-gates 3-b/3-c) — binding regardless of model
C-C1. The access-token hook mints claims that EXACTLY match the 0002/0001 helper reads:
   `current_actor_id()`←sub(/actor_id), `current_student_id()`←student_id,
   `current_campus_id()`←campus_id, role←role.
C-C2. Forge prevention: a parent's `parent_profiles.id` = their Supabase auth uid (set at
   signup). The provisioning server action (service-role) verifies the authenticated sub ==
   the parent_profiles.id it links from. `student_id`/`campus_id` claims are minted by the
   hook from SERVER-READ profile tables keyed by the authenticated uid — NEVER accepted from
   client input. A parent can never forge a student_id for a child they lack a consented
   link to.

### pee-wee UX follow-ups (when the mechanism lands — not blocking the swap)
C-U1. Hand pee-wee a follow-up screen spec for: active-student indicator + parent-gated
   child-select (zero-friction for one-child families), clean mid-session switch boundary,
   calm consent-paused state (distinct from "not yet granted"), and graceful auth-error/
   expiry handling (a CHILD must NEVER see a raw auth error — degrade to "let's get a
   parent"; preserve in-progress work across re-auth). Child surfaces show no auth machinery.

### >>> ESCALATED TO MATT — auth model A vs B (COPPA human checkpoint) <<<
C-E1. **Conflict.** mr-gates RULES **Model B** (parent-provisioned student identity, stable
   `student_id=uid` claim): Model A re-mints a child-scoped JWT into the parent's live
   session on every child-switch — the `custom_access_token_hook` fires on Supabase's
   refresh schedule, not synchronously on "select child," opening a window where the
   session's student_id and the intended child DISAGREE → an attempt could be written under
   the WRONG child (evidence corruption + cross-child event). Disqualifying for a children's-
   records store. pee-wee RULES **Model A** (parent session + child-scoping) on UX-honesty
   grounds: an under-13 should have NO separate login/identity; Model B risks the child/
   parent perceiving a student-owned account (the COPPA perception to avoid). BOTH are
   "parent-held" in Matt's sense (parent provisions + consents + oversees). mr-gates: if B,
   the student credential must be presented strictly as a parent-managed profile, never "your
   account," no child-reachable password reset. **Matt decides the mechanism.** Until then,
   C is NOT implemented.

   **>>> MATT RULED 2026-06-13: MODEL B (stable parent-provisioned student identity). <<<**
   `student_id` claim = the student's own auth uid, minted by the access-token hook from
   server-read student_profiles (never client input). Parent provisions + consents +
   oversees. pee-wee CAVEAT (binding on C2 auth UI): the student credential is presented
   STRICTLY as a parent-managed profile — never "your account," NO child-reachable password
   reset, no auth machinery on child surfaces.
   IMPLEMENTATION SPLIT: **C1 (this pass)** = data layer — 3 clients, SupabaseRepository,
   async getRepository + ~13 call sites, types + central stamping, feature flag, the
   access-token-hook migration 0005 (Model B claims), in-memory parity; ALL tests green.
   **C2 (follow-up, pee-wee-gated)** = parent signup/login + child-provisioning + child-select
   UI per C-U1. C1 needs no new screens (data layer only); C2 carries the family-facing auth.
