// BKT acquisition layer (AI_ADAPTIVE §5; CLAUDE §3). Standard Bayesian Knowledge
// Tracing posterior + learn transition — NOT a heuristic. Pure.
import type { BktParams } from "./types";

/** Validate BKT params: all in [0,1] and DISCRIMINATING (pG < 1 - pS), so a correct
 *  answer is evidence FOR mastery (codexreview bkt-param-constraints). Throws if not. */
export function validateBktParams(p: BktParams): void {
  for (const [k, v] of Object.entries(p)) {
    if (typeof v !== "number" || Number.isNaN(v) || v < 0 || v > 1) {
      throw new Error(`BKT param ${k} out of [0,1]: ${v}`);
    }
  }
  if (!(p.pG < 1 - p.pS)) {
    throw new Error(`BKT params not discriminating: require pG (${p.pG}) < 1 - pS (${1 - p.pS})`);
  }
}

/** Posterior P(known | observation) before the learn transition. */
function posterior(pKnown: number, correct: boolean, p: BktParams): number {
  const num = correct ? pKnown * (1 - p.pS) : pKnown * p.pS;
  const den = correct
    ? pKnown * (1 - p.pS) + (1 - pKnown) * p.pG
    : pKnown * p.pS + (1 - pKnown) * (1 - p.pG);
  if (den <= 0) return pKnown; // degenerate guard (shouldn't occur for valid params)
  return num / den;
}

/** One BKT update: posterior conditioned on the answer, then the learn transition. */
export function bktUpdate(pKnown: number, correct: boolean, p: BktParams): number {
  validateBktParams(p);
  const post = posterior(pKnown, correct, p);
  return post + (1 - post) * p.pT; // learn opportunity
}

/** Bernoulli variance proxy for the latent (selector info-gain term). */
export function pKnownVar(pKnown: number): number {
  return pKnown * (1 - pKnown);
}

/** Lower-bound confidence used by the lock gate (CLAUDE §3). z default 1. */
export function pKnownLowerBound(pKnown: number, z = 1): number {
  return Math.max(0, pKnown - z * Math.sqrt(pKnownVar(pKnown)));
}
