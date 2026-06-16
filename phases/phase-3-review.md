# Phase 3 — Adversarial Review (Codex)

## Plan review (informed + cold) — 7 concerns, ALL adopted (round-1.claude.json)
The reviewers turned a named-pieces plan into a precise math spec before any code:
- **gate-state-only / lock-history (blocking):** canLock needs an EVIDENCE HISTORY (1/7/21 windows,
  unseen, correctness, pKnownLB, dimension), not aggregate state → `LockEvidence[]` API; in-session
  evidence (kinds retrieval/new_acquisition) can never enter it.
- **retention-formula / fsrs (high):** exact clamped equation specified (massed success builds no
  durability — the firewall); **evidence-type (high):** engine-local `Evidence.kind` discriminator,
  NOT provenance-only `StudentAttempt.source`; generative separation prevents double-counting.
- **bkt-params (med):** validate ranges + `pG<1−pS`; **substrate-name (med):** student_skill_state;
  **pure-vs-persistence (high):** Phase 3 closes D5 at the MODULE level (cutover = Phase 4);
  **propagation (med):** single-step over the DAG → no oscillation.

## Code review (build/diff) — 1 concern, fixed
- **gate-transfer-count (high):** CLAUDE §3 requires ≥3–5 clears PER transfer dimension; the gate
  accepted 1. Fixed: `minPerDimension` (default 3, calibratable) counts per-dimension qualifying
  clears; added the under-count rejection test.

Outcome: the engine math is precise, pure, and verified — BKT closed-form posterior, FSRS clamped
monotone stability, no-double-count interaction, and an airtight delayed/unseen lock gate. 22 tests.
