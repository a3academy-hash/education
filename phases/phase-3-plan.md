# Phase 3 — THE ADAPTIVE ENGINE — Plan

**Plan against:** AI_ADAPTIVE §5/§6/§7/§13, CLAUDE §3. **Closes AUDIT D5** (the single most-fatal gap:
deterministic score + in-session lock → no BKT/FSRS split, locks on massed performance). Substrate:
0006 `node_mastery` columns (p_known/stability/halflife/next_review_at/locked/provisional) +
`ab_parameters` (thresholds). All NEW engine code is PURE + framework-neutral (lib/), fully unit-
tested; it does NOT rip out the v0.1 deterministic engine yet (that stays serving the live UI until
Phase 4 wires the new one) — Phase 3 builds + tests the modular engine alongside.

## Deliverables (pure, tested modules under `lib/engine-v2/`)
1. **Acquisition (BKT) — `bkt.ts`:** per-node `p_known` with params {prior pL0, learn pT, guess pG,
   slip pS}. `bktUpdate(pKnown, correct, params) -> pKnown'` (the standard BKT posterior + learn
   transition). Plus a posterior-variance / confidence proxy for the selector's info-gain term and
   the §3 lower-bound lock criterion. Params seeded from `ab_parameters`/literature; calibratable.
2. **Retention (FSRS-style) — `retention.ts`:** per-node `stability` (days) + `pRecall(t)` =
   `2^(-elapsedDays/stability)` (or exp form). `retentionUpdate(state, success, elapsedDays) ->
   {stability', lastRetrievalAt}` — success EXTENDS stability (spacing-aware), failure SHRINKS it.
   Updated ONLY on retrieval attempts. `nextReviewAt(stability, target pRecall)` schedules review
   before predicted lapse.
3. **Interaction rule — `interaction.ts`:** the EXPLICIT no-double-count composition (§5):
   successful retrieval → raise BKT p_known AND extend stability; failed retrieval → BKT slip/guess
   AND weaken stability; NEW-node acquisition → primarily BKT, retention inherits the population
   prior until first retrieval. One function `applyEvidence(state, evidence) -> state'` that routes
   to bkt/retention correctly (a single retrieval is evidence to BOTH layers via the rule, not
   counted twice in either).
4. **Damped soft-KST — `propagation.ts`:** after an update, light probabilistic propagation along
   prereq edges (success on a dependent softly raises prereqs; failure on a foundational softly
   lowers dependents), DAMPED by a factor << 1 to avoid over-inference. Pure over the graph edges.
5. **Selector utility — `selector.ts`:** composite score per candidate = expected info gain (BKT
   uncertainty reduction) + retention-preservation benefit (P[node decays below threshold w/o
   review] × value) + small transfer-coverage bonus, targeting the §8 success band (~85%). Rule-
   based, interpretable, with the frustration-fallback hook.
6. **Gating / retention firewall — `gate.ts` (THE D5 fix):** `canLock(state, now) -> boolean` locks
   a node MASTERED **only** when delayed/unseen retrieval cleared at 1/7/21-day checks with the §3
   lower-bound confidence (0.90 prereq / 0.85 leaf, from `ab_parameters`). In-session accuracy +
   practiced items feed PROVISIONAL state + tutor routing, NEVER the lock. `dueForDelayedCheck(...)`.
7. **Cold-start — `cold-start.ts` (§6):** map diagnostic labels → graded init (READY→high p_known
   high-confidence; NEEDS-WORK→low; UNCERTAIN→mid+high-uncertainty; INFERRED-READY→provisional KST
   only), retention bootstrap with population priors + empirical-Bayes blend for the first 3-5
   retrievals.

## Tests (the verification — pure math is fully testable)
- BKT: a correct attempt raises p_known; the posterior matches the closed-form; guess/slip bounds.
- Retention: success extends stability, failure shrinks it; pRecall decays with elapsed time;
  nextReviewAt schedules before the threshold lapse; retention updates ONLY on retrieval.
- Interaction: a single success updates BOTH layers via the rule and is not double-counted; a
  new-node acquisition leaves retention at the prior until first retrieval.
- Propagation: damped, bounded, doesn't oscillate; success on a dependent nudges prereqs up < the
  direct update.
- Gate (the D5 invariant test): a node with perfect IN-SESSION accuracy does NOT lock; it locks ONLY
  after delayed/unseen 1/7/21 clears at the lower-bound; massed performance never locks.
- Cold-start: each diagnostic label maps to the spec'd init; EB blend stabilizes early estimates.

## Out of scope (logged)
- Wiring the new engine into the live UI / writing to node_mastery via the outbox worker = Phase 4
  (interactivity + speed). Phase 3 ships the pure engine + tests; the v0.1 engine keeps serving.
- LLM advisory layer (§ Phase 3-frontier in AI_ADAPTIVE) stays advisory/out — not built here.

## REVISION v2 (codexreview informed+cold — BINDING; exact math; supersedes above)
All 7 concerns adopted. Substrate = `student_skill_state`/`StudentSkillState` (node_mastery = alias).
Phase 3 closes D5 at the MODULE level (tested replacement); live cutover = Phase 4.

- **R-EVIDENCE:** engine-local `type Evidence = { kind: "new_acquisition" | "retrieval" |
  "delayed_lock_check"; correct: boolean; elapsedDays: number; unseen?: boolean; dimension?: string }`
  derived from SELECTION/session context — NOT `StudentAttempt.source` (provenance-only). `applyEvidence`
  routes by kind: new_acquisition → BKT only (retention stays at prior); retrieval/delayed_lock_check →
  BOTH layers. Generative separation (no double-count): BKT latent = *known*; retention latent =
  *durable*; orthogonal latents → the same observation updates each ONCE for its own latent.
- **R-BKT:** params `{pL0,pT,pG,pS}` validated (`0≤each≤1`, `pG < 1−pS`). Posterior:
  correct `p(1−pS)/(p(1−pS)+(1−p)pG)`; incorrect `p·pS/(p·pS+(1−p)(1−pG))`; then learn
  `p'' = p' + (1−p')·pT`. `pKnownVar = p(1−p)`; lower bound `pKnownLB = max(0, p − z·sqrt(var))` (z from
  ab_parameters; default 1).
- **R-RETENTION (exact, clamped):** `pRecall(elapsed,S) = elapsed≤0 ? 1 : clamp(2^(−elapsed/S),0,1)`.
  Success: `S' = elapsed≤0 ? S : clamp(S·(1+GROWTH·(1−pRecall(elapsed,S))), MIN, MAX)` (massed success
  builds NO durability — the firewall). Failure: `S' = clamp(S·FAIL_FACTOR, MIN, MAX)`. Constants
  `MIN=0.5, MAX=365, GROWTH=1.0, FAIL_FACTOR=0.5` (in ab_parameters-style consts). `nextReviewAt =
  lastRetrievalAt + S·log2(1/targetRecall)` (targetRecall=0.9).
- **R-GATE (the D5 invariant):** `canLock(history: LockEvidence[], { isPrereq }) -> boolean` where
  `LockEvidence = { window: 1|7|21; unseen: boolean; correct: boolean; pKnownLB: number; dimension?:
  string; atIso: string }`. Locks ONLY when EACH of the 1/7/21 windows has an `unseen && correct` clear
  with `pKnownLB ≥ (isPrereq?0.90:0.85)` AND the four transfer dimensions are covered. In-session
  evidence never carries kind `delayed_lock_check`, so it cannot enter `history` → cannot lock. Airtight.
- **R-PROP:** SINGLE-STEP damped propagation over the DAG prereq edges (graph acyclic): one hop,
  `|nudge| ≤ damping·|delta|`, damping≈0.2. No iteration → no oscillation/cycle risk.
- **R-SELECTOR / R-COLDSTART:** per the plan, using the above; selector targets the §8 success band via
  pRecall + BKT uncertainty; cold-start maps the 4 diagnostic labels → graded BKT init + population
  retention prior + EB blend (first 3-5 retrievals).

## Codex review ask
Attack the math: is the BKT update the correct posterior (not a heuristic)? Is the FSRS stability
update monotonic + stable (no blow-up/oscillation)? Does the interaction rule actually avoid
double-counting a single retrieval? Is the gate's delayed/unseen lock airtight (can any in-session
path reach `locked=true`)? Are the cold-start mappings faithful to §6?
