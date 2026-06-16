# Phase 3 — Verify (gate)

**Gate (PLAN.md):** session updates graph live, schedules future review, never locks on massed
performance. (Phase 3 closes D5 at the MODULE level — the live wiring is Phase 4.)

## Results
- [x] **BKT acquisition** (`bkt.ts`): closed-form posterior + learn transition; param validation
      (ranges + `pG<1−pS`); lower-bound + variance. Test: matches the closed form to 1e-10.
- [x] **FSRS retention** (`retention.ts`): exact clamped `pRecall`/`retentionUpdate`/`nextReviewAt`;
      **massed success (elapsed≤0) builds NO durability** (the firewall); no blow-up over a 50-step
      success run (monotone, ≤ MAX).
- [x] **Interaction rule** (`interaction.ts`): new_acquisition → BKT only; retrieval → both layers
      exactly once (orthogonal latents, no double-count); first retrieval bootstraps from the
      population prior.
- [x] **Gate / firewall** (`gate.ts`) — **the D5 invariant, tested:** perfect IN-SESSION accuracy
      → `canLock` false; locks ONLY when each 1/7/21 window has an unseen+correct clear at the lower
      bound AND every transfer dimension has ≥ minPerDimension (3) qualifying clears. Seen items,
      below-threshold clears, missing windows/dimensions, and under-counts all reject.
- [x] **Propagation** (`propagation.ts`): single-step, damped, DAG, bounded `|nudge|≤damping·|delta|`.
- [x] **Cold-start** (`cold-start.ts`): the 4 diagnostic labels → graded p_known; INFERRED_READY
      provisional; retention at population prior; EB blend over the first retrievals.
- [x] **22 engine-v2 unit tests** + full suite **757 green**; `tsc --noEmit` clean.

## Result: **PASS (module-level D5 closed)** — advance to Phase 4 (interactivity + speed): rebuild
atoms as predict/construct→resolve, enforce the optimistic loop, and WIRE engine-v2 (the live
cutover: route attempts through applyEvidence + the outbox worker; the gate replaces the v0.1
in-session lock so no live path can set locked=true on massed performance).
