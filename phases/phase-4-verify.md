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

## Phase 4 CONTINUATION (tracked — not yet built; the gate is not fully PASS until these land)
- [ ] **Selector** (`lib/engine-v2/selector.ts`): the precise contract adjudicated (score =
      wInfo·pKnownVar + wRet·(1−pRecall)·due + wTransfer·coverageGap; predictedSuccess target band
      0.70–0.90; frustration fallback K-errors→easier, recover after M; review-burden cap) + tests.
- [ ] **Worked-example UI cutover:** wire the StepReveal/LearnClient advance to `canAdvance` and
      REMOVE the bypasses (LearnClient `exampleSeen` on any pointer/key; the "I've read through"
      shortcut). Requires the React edit (no jsdom → verify via the extracted pure gate + a live
      chrome-devtools pass). This is what makes the no-slideshow invariant true at the USER level.

## Result: **PARTIAL PASS** — the two blocking firewall/atom invariants are closed + tested. The
selector + UI cutover are the remaining Phase 4 work (logged in OVERHAUL_LOG for continuation) before
the full gate passes and Phase 5 (visual system) begins.
