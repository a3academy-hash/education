# Phase 3 — Decisions (autonomous adjudication)

Chair: Claude (PLAN.md). Adjudication JSON: `.codexreview/reviews/2026-06-16-phase3-engine/round-1.claude.json`.

## ADOPT (all 7 plan + 1 code concern)
Each made the engine math precise + correct: evidence-history lock API; exact clamped FSRS; engine-
local Evidence.kind (not provenance source); generative no-double-count separation; BKT param
validation; single-step DAG propagation; student_skill_state substrate; module-level D5 framing;
≥minPerDimension gate count. Rationale per concern in round-1.claude.json.

## REJECT / SUBTRACT — none.

## Logged
- Selector composite-utility + the live cutover (wire engine-v2, prevent any v0.1 in-session lock)
  = Phase 4. The LLM advisory layer stays out (frontier).
- Lock thresholds (0.90/0.85), minPerDimension (3), retention GROWTH/FAIL/MAX are calibratable
  (ab_parameters / MUST-VALIDATE) — no parameter is a design commitment pre-pilot.

## Net effect
Phase 3 ships a pure, tested modular engine that closes D5 at the module level: in-session accuracy
can NEVER lock a node; only delayed/unseen 1/7/21 clears at the lower bound across all transfer
dimensions do. 757 tests green.
