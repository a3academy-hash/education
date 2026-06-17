# phase-8-review.md — Adversarial review (Engagement Guardrails plan v1)

Reviewers: **mr-kahn** (APPROVE WITH CHANGES), **pee-wee** (APPROVE WITH CHANGES, 9), **Codex
informed+cold** (2 blocking + highs). Convergent. Trail `.codexreview/reviews/2026-06-16-phase8-guardrails/`.

## Load-bearing (BLOCKING)
1. **"Guardrails active" is self-contradictory** (codex guardrails-live-gap/live-guardrails-optional):
   the gate requires guardrails ACTIVE but the plan permits merely logging the engine-v2 cutover gap.
   RESOLVE: WIRE the §8 guardrails (band targeting + frustration fallback + review cap) into the LIVE
   practice selection path via a pure adapter using the live mastery signal as predicted-success proxy —
   genuinely active, additive (server still grades). + an end-to-end "guardrails active" test.
2. **Retained-mastery + fast-but-fragile have NO live data source** (mr-kahn2, codex retention-state-
   missing): live `StudentSkillState` has no stability/halflife/pRecall (those live on the not-cutover
   engine-v2 `RetentionState`). DERIVE from the live ATTEMPT LOG retention probes (`source:"retention"`,
   which exist) + `lib/retention` scheduling — NEVER fake a number (trust-layer rule).
   - **retained** = mastered AND ≥1 PASSED retention probe after `masteredAt` (delayed-unseen = the real
     §7 definition). Nodes with no probe yet = "retention pending", counted in the "X of Y" denominator,
     never against the student.
   - **fast-but-fragile** = mastered FAST AND (a FAILED retention probe OR an OVERDUE probe with no pass)
     → evidence it's not holding. No probe due/taken yet → "unmeasured", NEVER fragile (mr-kahn 1a).

## Adopted (high/medium)
3. **Fragile thresholds DERIVED not magic** (mr-kahn 1b, codex attempts-definition): fragile uses the
   retention layer's own scheduling (overdue/failed probe), not a magic halflife constant; "fast" =
   `StudentSkillState.attempts` at `masteredAt` ≤ `fastThreshold` (a documented, telemetry-calibrated
   config constant — Matt threshold checkpoint). Define "attempt" = a graded attempt count to mastery.
4. **§6 cold-start easier band** (mr-kahn3): first-cohort/high-uncertainty students get a lower band
   midpoint (~0.78, bandHi ~0.85) via `SelectorParams` — parameterization, Matt-checkpoint.
5. **Training/Boost = presentational frequency ONLY** (mr-kahn4, pee-wee1, codex boost-cadence): Boost
   changes WHICH §5 cadence levels fire a visible sweep (node-provisional gets a sweep in Boost, not
   Training); the **90s burst throttle + gold-cap-at-lock are MODE-INVARIANT**. Test: identical mastery
   events under training vs boost → IDENTICAL mastery math + IDENTICAL milestone set, only presentation
   differs. reward-mode imports nothing from mastery/gate.
6. **Reward-mode persistence** (codex reward-mode-persistence/preference-split): source of truth = a
   per-student preference; default computed `defaultRewardMode(ageBand)` (boost younger / training teen)
   when unset; the toggle persists via a server action (memory: in-record / cookie; supabase: a column,
   generated-not-executed). Pure default resolver.
7. **Structural firewall (import-acyclic, tested)** (mr-kahn5, pee-wee7): `fragile.ts`/`retained.ts`/
   `reward-mode.ts` import nothing from `gate.ts`/`session.ts`/`mastery-engine`; the selector,
   mastery-engine, and `[data-surface="test"]` have ZERO import path to the reward-mode preference. A
   test asserts each new fn is read-only and never alters `canLock`/lock output.

## Copy / UX (pee-wee, all adopted)
8. Toggle lives ONLY on the learner momentum/settings surface (never Focus chrome, never a test). Framed
   as a "Celebrations: Training (quiet) / Boost (more energy)" **preference** with "*Either way, skills
   count the same — this only changes how wins are shown*". NO "for younger players" copy.
9. Retained label = "**Retained**" + subline "*kept sharp — proven on a later, unseen check*"; ALWAYS
   render "X of Y mastered", never the bare count. Reject "Still got it".
10. Fast-but-fragile split by audience: "fragile" only on coach/parent; the STUDENT sees a positive,
    action-framed nudge — "**Worth a quick tune-up** — you picked this up fast; a short review in a day
    or two will lock it in" — no "fragile", no red (matches the existing non-punitive nudge pattern).
11. Retained stat reuses the existing momentum "Time given back" Card pattern (no new "RetainedRing").
    The toggle = a generic `components/ui` segmented control (keyboard + reduced-motion + contrast),
    composed by a gamification wrapper. Student fragile-nudge reuses the existing `<p>` nudge treatment.
12. **mr-gates gate** for the `FlagEntry`-union / `lib/insight/flags.ts` extension (new flag kind,
    factual-detail-only, severity info/attention — never a new band) — covered by the mr-gates diff review.

Single most-fatal (consensus): #2 — asserting "retained: N" or "fragile" with no measured retrieval
behind it. Fixed in v2 (derive from real retention probes; "pending"/"unmeasured" when absent).
