# Phase 3 engine — dossier

## Why (AUDIT D5 — the most-fatal gap)
Current engine (lib/mastery-engine) = deterministic weighted score (0.5·recentAcc + … ) + a status
ladder + a SINGLE global decay multiplier (halfLifeDays 21). It LOCKS mastery on IN-SESSION accuracy
(mastery-engine/index.ts:237-244: score>=0.9 && transfer && attempts>=3 — all reachable in one
sitting). No BKT p_known, no per-node FSRS stability, no delayed/unseen gate. This violates the
north-star retention firewall (AI_ADAPTIVE §7, CLAUDE §3).

## Spec targets
- AI_ADAPTIVE §5: modular acquisition (BKT/PFA p_known + prior/learn/guess/slip) + retention
  (FSRS stability/halflife, updated only on retrieval, decays to p_recall(t)) + EXPLICIT interaction
  rule (no double-count) + damped soft-KST propagation + composite-utility selector + advisory LLM
  never gating + interpretable gating layer.
- AI_ADAPTIVE §6: diagnostic seed -> graded init; population retention priors; EB blend first 3-5
  retrievals; first-cohort easier-difficulty bias.
- AI_ADAPTIVE §7 / CLAUDE §3: lock ONLY on delayed/unseen 1/7/21-day retrieval at lower-bound
  confidence (0.90 prereq / 0.85 leaf, MUST-VALIDATE, from ab_parameters); in-session never locks.
- v1 target (AI_ADAPTIVE §2/§13): BKT + FSRS + rule-based selector; LLM advisory only; full
  generative/transfer-gating is Phase 3-4 frontier (NOT this build).

## Substrate (0006)
node_mastery columns: p_known, p_known_var, stability, halflife, last_retrieval_at, next_review_at,
locked, provisional, transfer_dims. ab_parameters: lock_lb_prereq 0.90, lock_lb_leaf 0.85,
success_band 0.70-0.90, selector_target_difficulty 0.85.

## Constraints
- All NEW engine code is PURE (lib/engine-v2), framework-neutral, fully unit-tested. The v0.1
  deterministic engine KEEPS serving the live UI until Phase 4 wires the new one (no rip-out).
- Review focus: math correctness (BKT posterior; FSRS stability monotonic/stable; interaction
  no-double-count; gate airtight against in-session lock; cold-start faithful to §6).
