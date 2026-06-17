# phase-8-verify.md — Engagement Guardrails + Motivation acceptance

**Result: PASS.** 902 tests (was 856; +46), tsc clean, contrast 39/39, build green.

## Gate (PLAN.md/GOAL.md)
| Acceptance | Evidence | Status |
|------------|----------|--------|
| 70-90% success band + review cap + frustration fallback ACTIVE | `lib/engine-v2/selector.ts` (band/cap/frustration, Phase 4) + `lib/engine-v2/guardrails.ts applyGuardrails` WIRED into the live `PracticeFlow` next-item order (server still grades authoritatively; order only); `guardrails-live.test.ts` asserts band targeting + frustration recovery + review cap on the live path | ✅ |
| "Fast but fragile" flag | `lib/engine-v2/fragile.ts` — fragile = mastered + fast + (failed OR overdue retention probe); "unmeasured" when no probe (never fragile on unmeasured); surfaced to coach/parent (term "fragile") + a positive student tune-up nudge | ✅ |
| Visible retained-mastery | `lib/gamification/retained.ts` — retained = mastered AND a PASSED delayed `source:"retention"` probe after `masteredAt`; momentum shows "Retained · X of Y mastered" + "kept sharp — proven on a later, unseen check" | ✅ |
| Frustration fallback | selector `frustrationK` → most-reachable win, auto-recovers; live via guardrails | ✅ |
| Rings return-behavior-only, muted in tests, never in mastery math | Phase 5 firewall + `phase8-firewall.test.ts` asserts new modules import-acyclic with gate/session/mastery-engine and never alter `canLock` | ✅ |
| Training/Boost mode default-by-age + switchable | `lib/gamification/reward-mode.ts` (`defaultRewardMode(ageBand)`, presentational cadence only — 90s throttle + gold-cap-at-lock MODE-INVARIANT); `SegmentedControl` + `RewardModeToggle` ("Celebrations: Training/Boost · skills count the same"); per-LEARNER cookie scope | ✅ |
| Rewards never contaminate measurement | grep + `phase8-firewall.test.ts`: selector/mastery-engine/[data-surface=test] have ZERO import path to reward-mode/gamification; identical mastery math across modes | ✅ |
| Build + tests | 902 tests; tsc clean; contrast 39/39; build green | ✅ |

## Loop artifacts
phase-8-plan.md (v1+§V2) · review · this file · `.codexreview/reviews/2026-06-16-phase8-guardrails/`.
Gates: mr-kahn (fragile/retained/firewall, APPROVE-WITH-CHANGES, all adopted), pee-wee (Training/Boost
copy + reuse, 9 changes adopted), Codex plan informed+cold (2 blocking adopted), mr-gates diff
**APPROVE** (firewall holds, live wiring order-only), Codex diff (1 mine + 1 pre-existing).

## Diff-review fixes applied
- Reward-mode cookie SCOPED per-learner (`${studentId}:${mode}`; shared-device safety) — Codex
  reward-cookie-scope.

## Flagged (NOT Phase 8 — pre-existing parallel work)
- **Codex `nl-range`:** `numberlineAnswerSpec` forces an ALG-F01 number-line input fixed to [-20,20],
  which cannot represent answers outside that window. This is the **pre-existing ALG-F01 number-line
  authoring** (PracticeFlow.tsx was modified before this overhaul session — Matt's parallel work), NOT
  a Phase 8 change. Phase 8 only added the guardrail ordering to that file. Flagged for the ALG-F01
  interactivity owner: range must adapt to (or text-fallback for) out-of-window answers.

## Deferred (logged)
- Full engine-v2 mastery cutover into the practice loop (guardrails use a live-mastery predicted-
  success PROXY; the BKT/FSRS per-item swap is the standing engine-v2 cutover). §6 cold-start easier-
  band parameterization (R3); latency-spike frustration beyond consecutive-error; supabase
  `students.reward_mode` column (generated, not executed).
- Matt threshold checkpoints carried: `fastThreshold`, guardrail `difficultyDrag`, cold-start band.
