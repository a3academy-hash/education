# phase-6-verify.md — Diagnostic acceptance

**Result: PASS** (build-and-test + simulation level). Two pre-existing items flagged as Matt human
checkpoints (not gate-blocking; built with documented defaults).

## Gate checks (PLAN.md Phase 6 + GOAL.md "Diagnostic")

| Acceptance | Evidence | Status |
|------------|----------|--------|
| Four labels (READY/NEEDS_WORK/UNCERTAIN/INFERRED_READY) + provisional + posteriors/CI | `labels.ts` + `posterior.ts` (BKT likelihood-ratio); `DiagnosticNodeLabel` carries label/posterior/ci/evidenceCount/provisional/highImpact | ✅ |
| Structured multistage routing + KST inference | existing anchor+frontier walk + confirmation probe (reused) | ✅ |
| High-impact nodes tested DIRECTLY / never inferred-only (≥2 direct) | curated `HIGH_IMPACT_NODE_IDS` (mr-kahn-blessed); BKT READY needs ≥2 direct-correct; high-impact re-serve; inferred-only high-impact → UNCERTAIN | ✅ |
| **Credit firewall (§3a teeth)** | `creditFromDiagnostic(...,blocked)` — propagation STOPS at blocked (unresolved-high-impact ∪ NEEDS_WORK ∪ UNCERTAIN); test: blocked node never credited via a demonstrated descendant; INFERRED_READY/UNCERTAIN emit no MasteryUpdate | ✅ |
| Remediation list + entry frontier + quality flags | `remediationList` (topo-ordered), `entryFrontier` (deepest non-READY w/ READY prereqs, carries provisional), `qualityFlags{lowConfidenceNodes,suspectedGuessing,fatigueRisk}` | ✅ |
| Posterior-aware stopping INSIDE `nextItem` (client/server parity) | stop = queue empty ∨ provisionalMaxItems(40) ∨ (all high-impact resolved ∧ none in .45–.75 band); pure replay → identical client+server stop | ✅ |
| Fatigue pause + flag | `pauseDue` (ordinal); fatigue card in `DiagnosticFlow`; `fatigueRisk` from POST-pause vs pre-pause matched-tier accuracy drop ≥25pts, K≥4 each side, else null | ✅ |
| **§4 simulation (MANDATORY)** | `scripts/diagnostic-sim.test.ts` (vitest resolver, seeded LCG, 500 students): high-impact **sensitivity 0.956** (≥.80), **specificity 1.000** (≥.85), **false-READY 0.044** (≤.05), **procedural-over-brittle 0 false bridge-READY**; length min 15 / median 28 / max 40; UNMEASURED gaps named. Report → `phases/phase-6-simulation.md` | ✅ |
| New student completes placement; engine starts seeded | credit path intact (blocked-aware); recommendedStart via committed pipeline; diagnostic route builds (203 kB) | ✅ |
| Determinism / purity preserved | mr-gates diff review: no clock/RNG in lib/diagnostic-engine; all iteration over graph.nodes/sorted ids; re-serve item selection deterministic (count-indexed) | ✅ |
| Build + tests green | `npm run build` ✅ (20/20 routes); `tsc` clean; **817 tests** (was 781; +36); contrast 39/39; lint clean | ✅ |

## Loop artifacts
- phase-6-plan.md (v1 + §V2 + §V3) · phase-6-review.md · phase-6-decisions.md · phase-6-simulation.md · this file.
- Gates: **mr-kahn REJECT→fixed** (curated high-impact set + 10 items, all adopted in v2);
  **mr-gates APPROVE-WITH-CHANGES on plan** (2 blockers + 5, all adopted) **and APPROVE on diff**;
  **Codex plan informed+cold** (6 concerns incl. 2 blocking — credit-propagation + BKT posterior — all
  adopted in v3) + **Codex diff** (4 minor, all applied). Trail: `.codexreview/reviews/2026-06-16-phase6-diagnostic/`.

## Codex diff fixes applied
- Fatigue window restricted to POST-pause matched items (was whole-session) — §9 fidelity.
- Sim report write guarded behind `DIAG_SIM_REPORT=1` (default test run is read-only — no CI dirt).
- Removed the vestigial `inferredReadyThreshold` config (inference can't move the BKT posterior;
  INFERRED_READY is topology-gated by design — documented).
- `provisional` contract clarified: true for INFERRED_READY AND every UNCERTAIN (the course confirms all).

## Matt human checkpoints (flagged, built with documented defaults — confirm before launch, not blocking)
1. **`DIAGNOSTIC_CONFIG.posterior` constants** (priors/guess/slip/thresholds) — a mastery-threshold change
   per CLAUDE.md → calibrate from pilot data (DIAGNOSTIC §1/§3 MUST-VALIDATE).
2. **§12 credit semantics (pre-existing):** `creditFromDiagnostic` writes status `mastered`+masteredAt for
   credited nodes; DIAGNOSTIC §12 says diagnostic-READY is never course-MASTERED until confirmed. This
   predates Phase 6 (v0.1 credit model) and is a mastery-status-threshold change. Phase-6 labels are
   honestly provisional and the blocked-set prevents inference credit; the credit-status rename to
   provisional/needs_review is a required pre-launch fix wired to the engine-v2 cold-start seam.

## Deferred (logged, justified — §15a cuts / v1.5)
- True IRT/CAT selector (§3 Phase-2, post-calibration). 24h resume persistence + full §13 validation (n≥200).
- **UNMEASURED bridge gaps** (named, never fake-tagged): ordered-pair-as-solution (no dedicated node);
  decimal/fraction/rational ops collapsed into ALG-F02 vs §2's split → v1.5 graph coverage.
- Diagnostic-exposed P3 items must be excluded from that student's later transfer battery (integrity,
  §3/§11) — attempts already carry `source:"diagnostic"`; enforce course-side when the transfer gate lands.
- Audit nit (mr-gates): `attemptRefFor` records only the first attempt id for a re-served node — future
  audit-completeness pass.

## COMMIT NOTE (human checkpoint — not auto-committed)
Phase 6 file set (commit separately from the unrelated parallel/Phase-4 working-tree changes):
`types/diagnostic.ts`, `lib/engine-v2/cold-start.ts`, `lib/diagnostic-engine/{index,high-impact,
posterior,labels}.ts` (+ their `.test.ts` + `index.test.ts`), `lib/mastery-engine/{index,index.test}.ts`,
`app/student/(shell)/diagnostic/{actions,DiagnosticFlow}.tsx`, `scripts/diagnostic-sim.test.ts`,
`vitest.config.ts`, `phases/phase-6-*`, `.codexreview/reviews/2026-06-16-phase6-diagnostic/`.
