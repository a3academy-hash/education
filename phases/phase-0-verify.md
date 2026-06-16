# Phase 0 — Verify (gate)

**Gate (PLAN.md Phase 0):** `AUDIT.md` exists with a gap list + severity per domain.

## Checklist
- [x] `AUDIT.md` exists with gap list + **normalized severity** across **10 domains** (7 planned +
      D8/D9/D10 from review).
- [x] All four named v0.1 failures located in the audit (slow→D2; fake-adaptive→D5; slop+dups→D3;
      weak-interactivity→D4).
- [x] The stack fork (D1) stated explicitly with cost framing for Phase 1 adjudication.
- [x] BLOCKERS identified + mapped to the phase that closes each (D7.1–D7.5→Ph1; D5→Ph3; D3.1→Ph6;
      D2.1→Ph1 skeleton).
- [x] "Single most-likely-fatal" named (D5 engine split + in-session lock) — converges with Codex.
- [x] Loop artifacts exist: `phase-0-plan.md`, `phase-0-review.md`, `phase-0-decisions.md`, this file;
      `OVERHAUL_LOG.md` updated; raw Codex JSON + adjudication preserved under `.codexreview/reviews/`.

## Build/test
- No code changed in Phase 0 (audit only). Baseline `npm run build` / tests deferred to Phase 1's
  first code change (the gate that matters there). v0.1 baseline = 694 tests green on `master`.

## Result: **PASS** — advance to Phase 1 (The Spine), beginning with the stack-decision codexreview
and the SECURITY §2 data-class/retention-first schema (D7.1–D7.5 blockers).
