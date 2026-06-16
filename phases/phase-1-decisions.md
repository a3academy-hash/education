# Phase 1 — Decisions (autonomous adjudication)

Chair: Claude (PLAN.md). No human consulted.

## ADOPT (all 8 — none over-engineered; each closes a real isolation/integrity/replay hole)
- R1 policy replacement (not overlay); R2 flag-gated erase path (not trigger whitelist); R3 DB-backed
  authorization; R4 anonymize-in-place deletion; R5 durable outbox async; R6 nonce/session binding
  substrate; R7 audited break-glass reads. Rationale per concern in `round-1.claude.json`.

## Convergence signal
Both reviewers independently raised the RLS-overlay bypass and the async-durability loss — per
PLAN.md "weight convergence heavily." These two are the load-bearing corrections; without R1 the
family-isolation goal is cosmetic, without R5 the evidence trail can silently drop mastery updates.

## REJECT / SUBTRACT
- None. No concern contradicted a binding spec or expanded scope beyond SECURITY §3/§6/§8/§9/§16.

## Scope note (logged, not a deferral of correctness)
- R7's full sensitive-read-path migration spans into Phase 7 (reporting). Phase 1 lands the
  `read_student_record` RPC contract + break-glass + the audit-row-before-return invariant; the
  remaining direct-SELECT removals on reporting tables complete when those surfaces are built. This
  is sequencing, not a weakening — no sensitive read ships unaudited.

## Net effect
phase-1-plan.md v1 → v2 (REVISION R1–R7 binding). Implementation (migration 0006 + deny-suite +
lib skeleton) builds to v2. This is the spec the next execution step follows.
