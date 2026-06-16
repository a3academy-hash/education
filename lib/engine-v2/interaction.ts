// The EXPLICIT interaction rule (AI_ADAPTIVE §5) — composes the BKT acquisition and
// FSRS retention layers from a single observation WITHOUT double-counting. Pure.
//
// Generative separation (why no double-count): BKT's latent is "does the student
// KNOW this skill"; retention's latent is "how DURABLE is the memory trace". They are
// orthogonal latents. One answer is evidence about BOTH latents — each layer consumes
// the observation exactly ONCE for its own latent. A new_acquisition attempt is
// evidence only about knowing (BKT); retention stays at its population prior until the
// first RETRIEVAL (you cannot measure durability of a trace that was just formed).
import { bktUpdate } from "./bkt";
import { retentionUpdate } from "./retention";
import type { AcquisitionState, BktParams, Evidence, RetentionState } from "./types";
import { RETENTION } from "./types";

export interface LearningState {
  acq: AcquisitionState;
  ret: RetentionState;
}

/**
 * Route one Evidence to the correct layers:
 *  - new_acquisition  -> BKT only; retention untouched (stays at prior / null).
 *  - retrieval        -> BKT (the answer) AND retention (the retrieval event).
 *  - delayed_lock_check -> same as retrieval (it IS a retrieval, additionally logged
 *                          to LockEvidence by the gate path).
 * Retention initializes from the population prior on the FIRST retrieval.
 */
export function applyEvidence(
  state: LearningState,
  ev: Evidence,
  params: BktParams,
  nowIso: string,
): LearningState {
  const acq: AcquisitionState = { pKnown: bktUpdate(state.acq.pKnown, ev.correct, params) };

  if (ev.kind === "new_acquisition") {
    return { acq, ret: state.ret }; // retention NOT touched on acquisition
  }

  // retrieval / delayed_lock_check -> update retention exactly once
  const baseStability = state.ret.stability ?? RETENTION.POPULATION_PRIOR; // EB: prior on first retrieval
  const stability = retentionUpdate(baseStability, ev.correct, ev.elapsedDays);
  return { acq, ret: { stability, lastRetrievalAtIso: nowIso } };
}
