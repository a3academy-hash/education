# Phase 0 — Decisions (autonomous adjudication)

Chair: Claude (per PLAN.md ADJUDICATION CRITERIA). No human consulted.

## ADOPT
- All 3 informed concerns → new audit domains **D8 (diagnostic flow), D9 (accessibility), D10
  (telemetry/calibration)**. Rationale: each is a real binding-spec dimension (DIAGNOSTIC §4/§13;
  STYLE_GUIDE §9 + DIAGNOSTIC §10 + SECURITY §17; CLAUDE §3/§9.7 + DIAGNOSTIC §14) that, if unaudited,
  lets a fatal v0.1 failure survive. Convergence weight: D8/D9 align with spec text → adopted heavily.
- Cold `spec-source`, `static-latency`, `stack-deferral`, `agent-consistency`, `security-static-gap`
  → method-rigor hardening folded into AUDIT.md (inputs/precedence stated; latency provisional;
  stack-invariant split; severity normalized; runtime tracing noted). Reversible, improves rigor, no
  scope creep.

## ADD
- Nothing beyond the three new domains (they ARE the adds the specs require that the plan missed).

## REJECT
- None. (No concern contradicted a binding spec, expanded scope beyond GOAL, or was over-engineering.)

## SUBTRACT
- None.

## Standing decision logged (the one fork surfaced)
- **Stack (D1):** stated, NOT decided in Phase 0. Will be adjudicated at the start of Phase 1 with a
  dedicated codexreview (Next-stays vs Vite-migration). Tie-breaker context: binding specs name Vite,
  but GOAL.md = "transform the existing v0.1 course" and the simpler/reversible tiebreaker favors not
  discarding a working RLS spine + 700 tests. The codexreview resolves it; logged either way.

## Net effect on the plan
phase-0-plan.md v1 → AUDIT.md added D8/D9/D10 + the 5 rigor notes. No execution step changed (Phase 0
is a report). Proceed to Phase 1.
