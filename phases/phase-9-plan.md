# phase-9-plan.md — Full Verification (prove DONE)

**Plan against:** GOAL.md (every checkbox). **Gate = DONE:** every GOAL.md domain checkbox true +
all verification reports clean + `npm run build` + tests green.

## Methodology
A single live harness `scripts/phase9-verify.test.ts` (vitest resolver) measures the objective
domains over the REAL artifacts and asserts each gate (regression = test failure):
1. **Dedup** — within equivalence/skill bucket over all 4,588 items → 0 true duplicates.
2. **Solver-verification** — `certify()` round-trip over every live item → 100% certified.
3. **Tagging** — equivalenceClass + calculatorFlag derivable for every item → 100%.
4. **Performance** — `computeMasteryAll` + `recommend` over the full 74-node graph (all assessed),
   30 runs → median + p95 < 800ms.
5. **End-to-end journey** — diagnostic → finishDiagnostic (4 labels) → creditFromDiagnostic →
   computeGrade (provisional, not credit-eligible) → buildNcaaExport (transcript withheld when not
   credit-eligible; disclaimers present). Asserts the whole pipeline composes coherently.

The non-measurable / static domains are evidenced by the prior phase artifacts (contrast 39/39 from
the `prebuild` audit; interactivity Phase 4; visual system Phase 5; diagnostic Phase 6; compliance
Phase 7; guardrails Phase 8) and re-confirmed by `npm run build` + the full suite.

## Acceptance
Harness green + full suite + build + tsc + contrast all green → walk GOAL.md domain-by-domain in
`phase-9-verify.md`. Report → `phases/phase-9-verify-report.md` (PHASE9_REPORT=1). Then tag the
release. Compliance items remain SHIP gates (GOAL non-negotiable #6), not DONE blockers.
