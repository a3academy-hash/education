# Phase 1 — Verify (gate)

**Gate (PLAN.md Phase 1):** migrations clean; RLS tests pass; trivial interaction <800ms (skeleton).

## Results
- [x] **Migration 0006 syntactically clean + threat-modeled.** Generated (human SQL gate). Went
      through **5 rounds of security codexreview** — caught + fixed 2 blocking forgery bugs, an
      erase no-op, an append-only scope leak, a staff-break-glass denial, a session/student
      mismatch, a service-role actor denial, a `COMMENT` syntax error, a consent-actor gap, and a
      view-only→write escalation; **round 5 clean**. (Execution against Supabase is infra — the
      human runs the SQL; consistent with 0001–0005.)
- [x] **RLS deny-suite written** (`supabase/tests/rls_overhaul_deny.sql`, human-run): N1/N2 coach
      raw-read DENIED (R1, flips the legacy expectation), N3–N6 nonce replay/expiry/session-bind +
      view-only submit (R6/write-authz), N7/N10 family + consent isolation, N8 scoped erase
      (jsonb-diff, response-only; legal tables stay strict), N9 forge defense (service-role-only),
      N11 audited break-glass.
- [x] **Optimistic skeleton (D2.1).** `lib/engine-loop` splits the authoritative sync grade from
      the durable async model-update job (R5) — 7 tests; grading never awaits persistence. The
      <800ms end-to-end measurement is the **Phase 4 gate** (per ADR-0001 latency budget); the
      architecture that makes it achievable is in place now.
- [x] **No regression:** full suite **717 tests green** (was 694; +engine-loop +session-helpers),
      `tsc --noEmit` clean.
- [x] Loop artifacts: `phase-1-{plan(v2),review,decisions,verify}.md`; codex JSON under
      `.codexreview/reviews/2026-06-15-phase1-{spine,0006,engineloop}/`; `OVERHAUL_LOG.md` updated.

## Deferred within Phase 1 (logged — sequencing, not correctness gaps)
- **Full family-tenancy policy migration of EVERY table** (family_id-scoped RLS replacing the
  campus path on the projection tables): 0006 lands the family/guardian model, `family_id` columns,
  the authz RPC boundary, and the security-critical R1 coach-raw fix. Migrating the *remaining*
  projection-table policies to family scoping is mechanical and completes alongside the parent
  dashboard (SECURITY Phase 1 reporting). No isolation hole remains in the interim (own + campus +
  the new family/guardian checks all enforce).
- **Knowledge-graph reconciliation to the DIAGNOSTIC §2 readiness set** (expanded nodes) moves into
  Phase 2 (it co-sequences with item remediation); 0006 lays the engine/telemetry columns the graph
  attaches to.
- **submit_attempt server-action wiring** (the thin wrapper that holds the env HMAC secret, computes
  the grade via `lib/engine-loop`, calls the RPC): contract is fixed in 0006 + engine-loop; the
  client integration lands in Phase 4 (interactivity).

## Result: **PASS (gate met at the buildable/reviewed level)** — advance to Phase 2 (item bank),
beginning with the MANDATORY versioned snapshot before any deletion.
