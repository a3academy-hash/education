# phase-8-plan.md — Engagement Guardrails + Motivation (v1, pre-review)

**Plan against:** `new_plan/AI_ADAPTIVE.md` §8 (+ §7 firewall, §11 pace) + STYLE_GUIDE §5/§8.6
(reward ethic + Training/Boost). **Gate (PLAN.md/GOAL.md):** 70-90% success band; capped review
burden; "fast but fragile" flag; visible retained-mastery; frustration fallback; rings return-
behavior-only (never in mastery math, muted in tests); Training/Boost mode default-by-age +
switchable. Guardrails active; rewards never contaminate measurement.

## 0. EXISTS vs MISSING
EXISTS (Phase 4, `lib/engine-v2/selector.ts`, pure + tested): **70-90% success band** (`bandLo/bandHi`,
`bandFit` the primary difficulty guardrail), **review-burden cap** (`maxReviewFraction 0.4`),
**frustration fallback** (`frustrationK 3` consecutive errors → highest-reachable win, auto-recovers).
Rings (Phase 5 `MasteryRing`/`RingTrio`) are read-only, never in mastery math, muted on the Test
surface (structural CSS firewall). Retention layer (`lib/engine-v2/retention.ts`) computes
stability/halflife/`pRecall`.

MISSING (build):
1. **Fast-but-fragile flag** — high p_known reached fast (few attempts) BUT low retention
   stability/halflife → would decay. Detector + dashboard surface (student/parent/coach).
2. **Visible retained-mastery** — count of nodes mastered AND currently retained (pRecall ≥ thresh),
   surfaced alongside the effort rings (momentum + parent dashboard).
3. **Training/Boost mode** — student-switchable reward-intensity preference (default by age band,
   STYLE_GUIDE §8.6); the reward layer (burst/sweep cadence) reads it; never touches measurement.
4. **Guardrails-active wiring/verification** — confirm the selector guardrails + frustration fallback
   are reachable from the live loop; document the engine-v2 cutover status honestly.

## 1. Fast-but-fragile — `lib/engine-v2/fragile.ts` (+ test) — mr-kahn GATED

Pure `assessFragility(node p_known, retention {stability/halflife, lastRetrieval}, attempts, nowIso)`
→ `{ fragile: boolean, reason }`. Fragile = `p_known ≥ masteredBar` AND `attempts ≤ fastThreshold`
(acquired fast) AND `halflife < fragileHalflifeDays` (won't hold) — i.e. the Alpha failure mode
(§3/§8: fast acquisition, poor retention). A read-side `studentFragilityFlags(states, retention,
graph)` → node ids flagged. NEVER feeds mastery/lock (advisory/guardrail only). Constants in config
(Matt threshold checkpoint).

## 2. Retained-mastery — `lib/gamification` extension (+ test)

`retainedMastery(states, retention, graph, nowIso)` → `{ retainedCount, masteredCount }` where
retained = mastered AND `pRecall(nowIso) ≥ retainedBar`. Pure. Surfaced as a "retained nodes" stat
beside the RingTrio on `/student/momentum` and as a proof signal on the parent dashboard — the
"durable-learning value felt, not asserted" (§8). Distinct from the rings (return behavior).

## 3. Training/Boost mode — preference + reward layer — pee-wee GATED

- A `RewardMode = "training" | "boost"` preference (default by age band: `boost` for younger /
  under-13, `training` for teen — §8.6 "default by age, not a hard split"; switchable). Stored on a
  lightweight per-student preference (memory: a field; supabase: a column — generated SQL, not
  executed). Read-side `defaultRewardMode(ageBand)`.
- The reward layer respects it: Boost = node-provisional gets a ring sweep + slightly richer
  celebration; Training = restrained performance-analytics (gold cap only at lock). The
  `MasteryRing`/burst already throttle (≤700ms, ≥90s, reduced-motion static, Phase 5) — Boost only
  raises CADENCE within the existing throttle, never variable OUTCOMES (STYLE_GUIDE §5 ethic).
- A small `RewardModeToggle` on the momentum/learner dashboard. NEVER on the Test surface; NEVER
  enters mastery math.

## 4. Guardrails-active — verify + (minimal) wire

Confirm `selectNext` (band + cap + frustration) is the selection path the live practice loop uses,
or document the precise cutover gap (engine-v2 vs the live `lib/problem-engine`/`adaptive-router`).
If a thin adapter makes the guardrails reachable without destabilizing the live path, add it; else
log the wiring as the engine-v2 live-cutover item (honest, not faked). Add a guardrails-active
acceptance test asserting band targeting + frustration recovery + review cap on the selector.

## 5. Files
**Create:** `lib/engine-v2/fragile.ts` (+test), `lib/gamification/retained.ts` (+test),
`lib/gamification/reward-mode.ts` (+test), `components/gamification/RewardModeToggle.tsx`,
`phases/phase-8-*`.
**Modify:** `app/student/(shell)/momentum/page.tsx` (retained-mastery stat + fast-but-fragile note +
RewardModeToggle), `app/parent/children/[studentId]/page.tsx` + `lib/insight/flags.ts` (fast-but-
fragile flag surfaced to coach/parent), maybe `types/student.ts` (rewardMode preference).

## 6. Verify
tsc clean; tests > 856; contrast 39/39; build green; fragile + retained + reward-mode unit-tested;
guardrail acceptance test green; momentum shows retained nodes + fragile note + reward toggle;
firewall intact (rewards never in mastery math; muted in tests — re-assert).

## 7. Deferred (logged)
- Full engine-v2 live-cutover of the selector into the practice loop (if not already wired) — the
  guardrail LOGIC is built + tested; the live-path swap is the standing engine-v2 cutover.
- Real-time latency-spike frustration detection (§8) beyond consecutive-error — needs client timing
  telemetry; the consecutive-error fallback ships.
- Supabase reward-mode column execution (generated, not executed).
