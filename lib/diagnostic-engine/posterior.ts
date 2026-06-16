// lib/diagnostic-engine/posterior — BKT likelihood-ratio per-node posterior
// (§V3.1, supersedes the v2 Beta-mean). PURE: no React, no IO, no clock, no
// RNG, no Map/Set/Object.keys iteration order dependence.
//
// MODEL (§V3.1):
//   odds0 = p0 / (1 - p0)        p0 = prior by inference state
//   per DIRECT correct   odds *= (1 - slip) / guess
//   per DIRECT incorrect odds *= slip / (1 - guess)
//   posterior = odds / (1 + odds)
// Inference NEVER moves the posterior — only direct responses do, so an
// inferred-only high-impact node stays at its (skeptical) prior → UNCERTAIN.
//
// With guess=0.2, slip=0.1 and untouched prior 0.5:
//   1 direct-correct   ≈ .818   2 ≈ .953   1 direct-incorrect ≈ .111
// so READY (≥.85) requires ≥2 direct-correct BY CONSTRUCTION (§V3.1 / R2).
//
// CI: a ROUGH Wilson interval on the binary direct-correct count. Labelled
// rough; never shown as precise (it is a stability cue, not a measurement).

export interface BktTuning {
  guess: number;
  slip: number;
}

export interface BktPosterior {
  posterior: number;
  /** Rough Wilson lower bound on the direct-correct proportion. */
  ciLow: number;
  /** Rough Wilson upper bound on the direct-correct proportion. */
  ciHigh: number;
  /** Number of DIRECT responses folded in. */
  evidenceCount: number;
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** Rough Wilson score interval (z=1.96) on k/n; n=0 → the full [0,1]. */
function wilson(correct: number, total: number): { lo: number; hi: number } {
  if (total <= 0) return { lo: 0, hi: 1 };
  const z = 1.96;
  const p = correct / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denom;
  return { lo: clamp01(center - margin), hi: clamp01(center + margin) };
}

/**
 * BKT likelihood-ratio posterior over a node's DIRECT results (§V3.1).
 * `directResults` is the per-serve correct/incorrect list (order-independent —
 * multiplication of odds commutes). `prior` is p0 by inference state.
 */
export function bktPosterior(
  directResults: boolean[],
  prior: number,
  { guess, slip }: BktTuning,
): BktPosterior {
  // Guard the prior strictly inside (0,1) so odds is finite.
  const p0 = Math.min(1 - 1e-9, Math.max(1e-9, prior));
  let odds = p0 / (1 - p0);
  let correct = 0;
  for (const ok of directResults) {
    if (ok) {
      odds *= (1 - slip) / guess;
      correct += 1;
    } else {
      odds *= slip / (1 - guess);
    }
  }
  const posterior = clamp01(odds / (1 + odds));
  const { lo, hi } = wilson(correct, directResults.length);
  return {
    posterior,
    ciLow: lo,
    ciHigh: hi,
    evidenceCount: directResults.length,
  };
}
