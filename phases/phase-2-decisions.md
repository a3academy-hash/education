# Phase 2 — Decisions (autonomous adjudication)

Chair: Claude (PLAN.md). Full adjudication JSON: `.codexreview/reviews/2026-06-16-phase2-items/
round-1.claude.json`.

## ADOPT (all plan + code concerns — the reviewers materially improved correctness)
- Honest rescope of "solver": well-formedness + round-trip + choice-integrity, NOT prose
  re-derivation (no derivation metadata exists). Flag-don't-fabricate for tags/maps.
- Safe dedup: within-bucket only; report before removal. (0 found — vindicated.)
- Schema-first: ProblemTemplate `equivalenceClass`/`calculatorFlag` + validators, camelCase.
- equivalenceClass = structural family (node|kind|difficulty|masked-skeleton), not calibrated.
- Code fixes: Unicode-minus normalization, relative script paths, numeric-set canonical order,
  shape-before-response (flag not throw).

## REJECT / SUBTRACT
- None.

## Logged (flag-don't-fabricate)
- misconceptionMap 283 gaps → authoring TODO (not gated; optional field).
- per-node no_calculator refinement → future pass.

## Net effect
Phase 2 delivered an honest, tested certification pipeline + 100% tagging + 0 true dups, with NO
destructive deletion (the snapshot stays the safety net but was not needed). 735 tests green.
