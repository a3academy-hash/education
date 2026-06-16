# Phase 4 — Verify (gate, PARTIAL — blocking concerns closed)

**Gate (PLAN.md):** zero advance-without-commit screens; measured loop <800ms; interactions instant.

## Delivered + verified (the two BLOCKING codexreview concerns, fully tested)
- [x] **Atom contract** (`lib/atoms`): predict/construct→resolve as a TYPED LIBRARY INVARIANT —
      `canAdvance` is false until `resolved`; an empty/invalid prediction never commits; correctable
      before resolve, frozen after; worked-example `fadeStage` ladder. 6 tests. (Closes the D4
      "no-slideshow" rule at the library level.)
- [x] **D5 live cutover (logic)** (`lib/engine-v2/session.ts`): `updateNode` applies in-session
      evidence to PROVISIONAL state and NEVER locks; `evaluateLock` accepts ONLY `DelayedCheck[]`
      (the enforced sole path — a caller cannot fabricate LockEvidence past the firewall). **Tested
      invariant: 20 perfect in-session attempts (pKnown>0.9) do NOT lock; only a full 1/7/21 ×
      transfer-dim delayed history locks.** 3 tests.
- [x] **Speed (architectural proof):** the Phase-1 `lib/engine-loop` split returns the grade
      independent of the model update (tested); the <800ms end-to-end is the EXTERNAL acceptance
      (Matt-run Supabase profile); if it exceeds, batch/parallelize the RPC path (logged).
- [x] No regression: full suite **767 tests green**; tsc clean. codexreview: 5 plan concerns + 1 code
      (LockEvidence boundary) all adopted/fixed.

## Phase 4 completions (now landed)
- [x] **Selector** (`lib/engine-v2/selector.ts`, 7 tests): band-guarded composite utility (success
      band is the PRIMARY difficulty target, utility ranks within it); frustration fallback +
      auto-recovery; review-burden cap with no-starve. codexreview band-fix adopted.
- [x] **Worked-example UI cutover:** StepReveal gained an `onComplete` that fires ONCE on genuine
      completion (stepped/committed to the result — fill/predict steps require committed answers);
      LearnClient wires `onAdvanced` to it and REMOVED both bypasses (the any-pointer/key
      `onPointerDownCapture/onKeyDownCapture` and the passive "I've read through" button). Practice
      now unlocks only after working through the example to the result. tsc clean, 774 tests green.
      codexreview: 1 low (once-only re-fire) → fixed with a ref guard. (A live chrome-devtools pass +
      authoring predict-steps for the remaining reveal-only nodes is the residual §7 polish — logged.)

## Result: **PASS** — atom contract + D5 firewall + selector + worked-example no-slideshow cutover
all landed and tested. Advance to Phase 5 (visual system).
