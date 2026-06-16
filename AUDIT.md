# AUDIT.md — A3 v0.1 → v0.2 Overhaul Gap Report (Phase 0)

**Date:** 2026-06-15. **Branch:** `overhaul/v0.2`. **Method:** 6 parallel read-only domain agents +
direct inspection + codexreview of the methodology (informed+cold), which added domains D8–D10.

**Inputs + precedence (per cold review `spec-source`):** binding specs = `new_plan/*.md` (v0.2:
GOAL, PLAN, CLAUDE, DIAGNOSTIC, AI_ADAPTIVE, STYLE_GUIDE, SECURITY_DB_REPORTING). Precedence on any
conflict: **GOAL.md non-negotiables > the five binding specs > Codex review** (PLAN.md). Severity
rubric (normalized across domains): **BLOCKER** (build can't proceed / direct north-star violation),
**HIGH** (major spec-conformance gap), **MED**, **LOW**.

**The four named v0.1 failures this overhaul must kill:** (1) slow/clunky; (2) "AI adaptive" in name
only; (3) AI-slop + duplicate questions; (4) weak interactivity. Each maps to findings below.

**Stack-invariance (per cold review `stack-deferral`):** all findings except D2-arch and the build
tooling are **stack-invariant** (they concern lib/ logic, data, schema, design — not Next-vs-Vite).

---

## D1 — Stack & architecture (THE fork — adjudicated at Phase 1, not here)
**Current:** Next.js (App Router, RSC + server actions + middleware auth) + TypeScript + Tailwind +
Supabase (Postgres/RLS, migrations 0001–0005, Model-B identity) + Vercel. ~700 unit tests green.
**Spec:** "React 19 + Vite + Supabase (Postgres, RLS, RPC), Vercel" (named in 4 of 5 specs).
**Fork:** Next→Vite is a routing/SSR/auth-layer rewrite (server actions → Supabase RPC; middleware →
client guards; RSC data-loading → SPA fetch). Deeper spec requirements (RLS, **server-side grading
via RPC**, <800ms, optimistic UI) are achievable in BOTH; Next.js is React-19-capable on Vercel.
**Severity:** HIGH (architectural). **Disposition:** STATED here, **decided at Phase 1 via a
dedicated codexreview** (Next-stays vs Vite-migration: spec-fidelity vs regret/cost of discarding a
working RLS spine + 700 tests + the salvageable engine/component library). Lean documented in
`OVERHAUL_LOG.md`; not pre-judged in this audit.

## D2 — Latency / speed vs <800ms (AI_ADAPTIVE §0/§9) — **maps to v0.1 failure #1**
Findings PROVISIONAL on backend (per `static-latency`): in-memory hides cost today; the
architecture-level violations are static-certain and stand regardless of profiling (the Phase 4 gate).

| # | Current | Target | Gap | Sev |
|---|---|---|---|---|
| D2.1 | Client `await`s the FULL server txn (grade + all writes + full recompute) before any feedback; Submit spinner for the whole RTT (`PracticeFlow.tsx:143-168`) | Optimistic UI; model updates async, non-blocking (§9) | No optimistic UI — the biggest felt-latency violation | **BLOCKER** |
| D2.2 | 7–9 **sequential** Supabase round-trips per submit incl. a redundant 2nd `getSkillStates` (`practice-session/index.ts:124-222`) | <800ms end-to-end | ~300–600ms serialized network; no batching | HIGH |
| D2.3 | 4.5MB graph `validateGraph`'d **per request** on Supabase backend (`supabase.ts:220-234`) | <800ms; feel fast | Multi-MB validation on blocking path each request | HIGH |
| D2.4 | Tutor fires on **every tagged miss** (`practice-session/index.ts:232`), not stuck-state | LLM only after stuck/low-confidence (§9) | Wrong gating at the exact LLM-swap seam (latent BLOCKER once an LLM backend lands) | MED |
| D2.5 | No precompute of next-item candidates; fresh server render + engine recompute per item | precompute candidates (§9) | between-item re-run instead of prefetch | LOW |
**Positives (keep):** grading is server-authoritative (`checkAnswer`), answer value never shipped
(except intentional MC `correctChoice` at feedback), no LLM on the common path today.

## D3 — Item bank (DIAGNOSTIC §5/§9, CLAUDE §9) — **maps to v0.1 failure #3**
**Counts:** 74 nodes, **4,588 problems** (p1 2,072 / p2 2,072 / p3 444); **0 diagnostic items** (this
is the *course practice bank*, not the diagnostic — a *source* to mine).

| # | Current | Target | Gap | Sev |
|---|---|---|---|---|
| D3.1 | **0** `diag_items` | full diagnostic bank | build from scratch (Phase 6) | **BLOCKER** (for diagnostic) |
| D3.2 | `equivalence_class` coverage **0%** | 100% (§9.5) | 4,588; transfer/difficulty-equivalence uninterpretable without it | HIGH |
| D3.3 | `calculator_flag` **0%** | 100%, 3-way (§10) | 4,588 | HIGH |
| D3.4 | Checker = conservative compare vs author answer; **no CAS/solver** (`problem-engine/index.ts`) | symbolic solution validation (§9.1) | nothing enforces answer correctness (sample of 60 hand-checked: all correct) | HIGH |
| D3.5 | 536 near-dup number-swap twins across 223 skeletons; 33 exact dups | 0 above threshold; isomorphic families behind randomization (§8) | collapse to parameterized templates | MED |
| D3.6 | `misconception_map` 93.8% | 100% on high-error skills (§5) | 283 items | MED |
| D3.7 | `difficulty` ints 1/2/3 | named tiers + calibrated IRT (`calibration_status`) | tier scheme + calibration | LOW-MED |
| D3.8 | 5 items render `y = 3x + -2` ("+ -") | normalize | cosmetic (tracked MINOR) | LOW |
**Note:** 3,552 sport-skinned items are OUT of scope for the diagnostic (DIAGNOSTIC §6 bans skins);
only ~1,036 neutral items (+ re-neutralized) are directly mineable. **Snapshot before Phase 2 purge.**

## D4 — Interactivity / atoms (CLAUDE §7) — **maps to v0.1 failure #4**
| # | Current | Target | Gap | Sev |
|---|---|---|---|---|
| D4.1 | Worked-example stepper is **reveal-only** except ALG-F01 (`StepReveal` default); student clicks "next step" with no commit | every atom predict/construct→resolve; no slideshow (§7) | core Learn surface is a slideshow | **HIGH** |
| D4.2 | No **predict-then-reveal** before interactive geometry (coordinate/number-line drag in Learn) | predict-then-reveal before simulations (§7) | the wrong-prediction teaching moment is absent | HIGH |
| D4.3 | No **self-explanation + rubric** scoring on key nodes | §7/§10 rubric scoring | core mechanism missing | HIGH |
| D4.4 | Worked-example **fading** authored only for ALG-F01 | P1 full→P2 fill→P3 independent (§7) | not generalized | MED |
**Positives (keep):** typed numeric/expression/coordinate/inequality/set, ChoiceInput radiogroup,
CoordinatePlane drag (+keyboard), NumberLine drag (+keyboard), BalanceScale, DataTable, MathKeypad —
all construct→resolve with server re-validation; **no string-matched free-text/LLM grading**.

## D5 — Adaptive engine (AI_ADAPTIVE §5-7, CLAUDE §3) — **maps to v0.1 failure #2** (the core lie)
Current engine = **deterministic weighted-score + status ladder**, not a probabilistic two-layer model.

| Spec component | Present? (path:line) | Sev |
|---|---|---|
| (a) BKT/PFA `p_known` w/ prior/learn/guess/slip | **NO** — fixed-weight blend `0.5·recentAcc+…` (`mastery-engine/index.ts:151-169`) | **HIGH** |
| (b) FSRS retention stability/halflife, `p_recall(t)` | **PARTIAL** — single global `halfLifeDays:21` decay multiplier; no per-node stability, no update-on-retrieval (`:126-133`) | **HIGH** |
| (c) Explicit acquisition↔retention interaction rule | **NO** — one collapsed number | MED |
| (d) Damped soft-KST propagation | **NO** — hard lock (`lockingGap :183-191`) + one-shot all-or-nothing diagnostic credit | MED (hard gating is intentional per CLAUDE §2; soft nudge missing) |
| (e) Selector composite utility (info-gain + retention + transfer) | **NO** — lexicographic rule ordering (`adaptive-router/index.ts:71-186`) | MED (rule-based is the v1 target; utility math missing) |
| (f) Advisory LLM/DKT never gating | **YES ✅** (`ai-tutor` strings-only, walled off `practice-session:232-245`) | aligned |
| (g) **Lock ONLY on delayed/unseen 1/7/21d** | **NO** — locks on in-session accuracy (`mastery-engine:237-244`); retention module walled off, runs 21/60/120d review only, never gates | **HIGH** (most severe — direct firewall violation) |
| §6 diagnostic seed → graph | **PARTIAL** — binary mastered-or-not seed; no graded p_known / EB retention bootstrap | MED |
**Single biggest architectural gap:** mastery is ONE deterministic score conflating "right now" with
"will hold in 3 weeks." Spec demands SEPARATE BKT (acquisition) + FSRS (retention) layers so the gate
can require delayed/unseen retrieval. Everything else cascades from this missing split. **This is the
v0.1 "adaptive in name only" failure, precisely located.**

## D6 — Visual system (STYLE_GUIDE) — **~15-20% spec-compliant**
| # | Current | Target | Sev |
|---|---|---|---|
| D6.1 | White-only tokens; no on-light/on-dark duality; no Focus dark canvas anywhere (`globals.css:8-74`) | tokens resolve by surface; `--canvas #0B0F17` | **HIGH** (central organizing principle) |
| D6.2 | ONE generic `ProgressRing` (slate, solid) | 3 rings Focus/Mastery/Retrieval × hue+icon+pattern+gold-cap+ARIA | **HIGH** (signature element) |
| D6.3 | Zero baseball-native instrumentation (generic ed-tech visuals) | strike-zone grids, film-room, TrackMan readouts, Plex-Mono stat panels (§6, "the moat") | **HIGH** |
| D6.4 | Fonts = Fraunces / Hanken / Spline Sans Mono | Source Serif 4 + Plex Sans(or Hanken) + IBM Plex Mono (§4) | MED |
| D6.5 | No mode indicator (Training/Measurement); firewall invisible | persistent mode indicator (§1) | MED |
| D6.6 | Motion 400ms ceiling; no burst/throttle | ring-sweep 600-900ms; 90s burst throttle (§7) | LOW-MED |
**Positives (keep):** reduced-motion handled correctly (`globals.css`). Current "Stripe/Linear calm"
register is well-built but is the WRONG register — spec wants the A3 baseball-instrument identity.

## D7 — Schema / RLS / identity / data-class (SECURITY §2-8/§16) — runtime call-sites traced
**Plumbing is strong + spec-faithful** (pinned `search_path` SECURITY DEFINER, `security_invoker`
views, append-only evidence, recursion-safe RLS, Model-B forge-safe JWT). **But built to the OLD
campus/staff model; the spec's Phase-0 gating controls are absent.**

| # | Current | Target | Sev |
|---|---|---|---|
| D7.1 | **No** `data_classes` / `retention_policies` tables (spec §3 = FIRST, gates the schema) | machine-readable data-class + retention registry | **BLOCKER** |
| D7.2 | **No** `families`/`family_id`; tenancy is `campus_id` | `family_id`+`student_id` on every table (§8) | **BLOCKER** (cross-cutting) |
| D7.3 | `student_profiles` has no `dob`/`age_band`/`compliance_path`; flat "parent", no guardian role enum (§6/§16) | guardian roles + dob → COPPA-vs-teen branch + age-up | **BLOCKER** (spec-faithful identity) |
| D7.4 | VPC = one-step checkbox attestation; no pre-consent age screen; onboarding NOT gated behind VPC (§0/§5) | age-screen → parent verify (+billing match) → consent → THEN onboarding | **BLOCKER** (named cross-doc gate) |
| D7.5 | `forbid_mutation` trigger makes COPPA 30-day per-row deletion impossible (§3) | class-aware deletion/anonymize path | **BLOCKER** (reconcile immutability vs deletion) |
| D7.6 | **No** HMAC/nonce/`item_version`/`graded_server_side`; grading client-trusting (§9) | submission integrity layer | HIGH (ship-gate) |
| D7.7 | `tutor_exchanges` stores raw `prompt`/`response` bodies; no misconception_tag/session_id (§10) | redact/tokenize; tags + session_id only | HIGH (ship-gate) |
| D7.8 | coach == campus_admin whole-campus read incl raw submissions/transcripts (§11) | coach roster-scoped severity bands only | HIGH (ship-gate) |
| D7.9 | super_admin = unconditional all-campus, no break-glass/reason-code (§8/§11) | JIT + reason code + audit | HIGH (ship-gate) |
| D7.10 | No n≥5 aggregate suppression; no CI RLS tests; no MFA; no subprocessor register; no parent export/delete | §8/§15/§5 controls | HIGH (ship-gates) |
**Build-order:** D7.1–D7.5 are **schema BLOCKERS for Phase 1** (must land in migrations first per
SECURITY §2). D7.6–D7.10 are **SHIP-gates** (build + test freely; certify before a real user).

## D8 — Diagnostic flow (DIAGNOSTIC.md) — added by codexreview `diag-routing-validity`
**Current:** `lib/diagnostic-engine` runs an anchor→credit→seed pipeline (`finishDiagnostic:574-706`),
emits per-node estimates + credits demonstrated nodes as mastered, writes the seed. **Gaps:** it is
NOT the spec's structured multistage router with **posterior/SEM stopping rule** (§4); outputs are
the old status set, **not** the 4 placement labels READY/NEEDS-WORK/UNCERTAIN/INFERRED-READY (§1); no
**KST-routing-not-locking** distinction (§3a); **no simulation on synthetic mastery patterns** to set
length (§4, "mandatory before engine finalization"); no validity machinery (sens≥.80/spec≥.85, §13).
**Sev:** HIGH — the diagnostic is a Phase-6 near-rebuild against DIAGNOSTIC.md.

## D9 — Accessibility (STYLE_GUIDE §9, DIAGNOSTIC §10, SECURITY §17) — added by `a11y-interaction-gap`
**Current:** CoordinatePlane + NumberLine have **keyboard** drag (←/→, Shift±5) ✅; reduced-motion ✅.
**Gaps:** no audited **screen-reader announcement** path for construct/coordinate/structured-math
inputs (the spec's hard case — "design early"); no ARIA on the (absent) rings; KaTeX math has MathML
now (prior fix) but construct widgets lack SR semantics; no 504/WCAG-AA conformance pass. **Sev:**
HIGH (504/ADA is a deployment prerequisite; construct-not-select is hard to make accessible).

## D10 — Telemetry / calibration (CLAUDE §3/§9.7, DIAGNOSTIC §14, AI_ADAPTIVE §10) — added by `calibration-telemetry`
**Current:** attempts/mastery_updates are logged (provenance: graph_version/engine_version), but
there are **no** `item_versions` / `calibration_runs` / `item_exposure` tables, **no** A/B-test
parameter wiring, **no** thresholds-as-telemetry-tunable-params. **Sev:** MED — without these the
"AI adaptive" + item quality cannot be calibrated/validated over time (CLAUDE §3 "A/B-testable from
day one"); build them into the Phase-1 schema so Phase-4 validity is measurable.

---

## Severity rollup → phase that closes it
- **BLOCKERS:** D2.1 (optimistic UI → Ph4 skeleton in Ph1), D3.1 (diag bank → Ph6), D5.g+D5.a+D5.b
  (engine split → Ph3), D7.1–D7.5 (compliance schema → **Ph1, first**).
- **HIGH:** D2.2/D2.3, D3.2/D3.3/D3.4, D4.1/D4.2/D4.3, D6.1/D6.2/D6.3, D7.6–D7.10, D8, D9.
- **MED/LOW:** the remainder, scheduled per the PLAN.md phase map.

## The single thing most likely to be fatally wrong (Codex convergence + specs)
**The engine's missing acquisition/retention split + in-session mastery lock (D5).** It is the v0.1
"adaptive in name only" failure, it violates the north-star retention firewall directly, and every
other adaptivity gap cascades from it. Phase 3 must rebuild the engine as modular BKT + FSRS with the
lock gated on delayed/unseen retrieval — and Phase 1 must lay the schema (per-node p_known +
retention state + review scheduling + telemetry) so Phase 3 has somewhere to write.

## Phase 0 gate: PASS
All 7 planned domains + 3 codex-added (D8/D9/D10) audited; gap list + normalized severity present;
stack fork stated for Phase 1; latency marked provisional; stack-invariant findings separated.
