// lib/gamification/reward-mode.ts — Training/Boost reward intensity (Phase 8 R4,
// STYLE_GUIDE §5/§8.6). PRESENTATIONAL FREQUENCY ONLY. PURE — no IO, no
// Date.now()/Math.random().
//
// FIREWALL (Phase 8 R5): imports NOTHING from mastery/gate/selector. The reward
// mode is a per-learner PRESENTATION preference; it can never reach mastery math,
// the lock gate, or the selector, and it never appears on the [data-surface=test]
// chrome. The ETHIC (STYLE_GUIDE §5): rewards never gate variable OUTCOMES — they
// only change WHICH §5 celebration cadence levels fire a visible sweep.
//
// MODE-INVARIANTS (documented, NOT parameters — the same in both modes):
//   • the ~90s burst throttle, and
//   • the gold cap fires ONLY at a node LOCK.
// Boost differs from Training in exactly ONE way: in Boost a node-PROVISIONAL
// milestone also fires a visible sweep; in Training only a node LOCK does. The
// underlying milestone SET (the mastery math) is identical in both modes.

/** Coarse audience band for the default reward intensity (§8.6). */
export type AgeBand = "under_13" | "teen_13_17" | "adult";

export type RewardMode = "training" | "boost";

/**
 * Default reward mode by age band (§8.6 "default by age, not a hard split").
 * Boost for the youngest learners (a little more energy); Training (quiet) for
 * teens and adults. Always overridable by the learner's stored preference.
 */
export function defaultRewardMode(ageBand: AgeBand): RewardMode {
  return ageBand === "under_13" ? "boost" : "training";
}

/**
 * Coarse age band from a US grade level (the platform's known age proxy —
 * middle-schoolers are ~grade 6-8). Grade ≤ 7 (roughly ≤ 12-13) → under_13;
 * grade 8-12 → teen; anything higher → adult. PURE; presentation default only.
 */
export function ageBandForGrade(gradeLevel: number): AgeBand {
  if (!Number.isFinite(gradeLevel) || gradeLevel <= 7) return "under_13";
  if (gradeLevel <= 12) return "teen_13_17";
  return "adult";
}

/** Type guard for a persisted reward-mode string (e.g. from a cookie). */
export function isRewardMode(v: string | null | undefined): v is RewardMode {
  return v === "training" || v === "boost";
}

/**
 * The §5 celebration levels. A milestone is computed identically in both modes
 * (mastery math is mode-invariant); the mode only decides which levels fire a
 * VISIBLE sweep.
 */
export type CelebrationLevel = "node_provisional" | "node_lock";

export interface RewardCadence {
  /** Celebration levels that fire a visible ring sweep in this mode. */
  sweepLevels: readonly CelebrationLevel[];
  /** Mode-invariant: the ~90s burst throttle floor (documented, not a knob). */
  burstThrottleMs: 90_000;
  /** Mode-invariant: the gold cap is reserved for a node LOCK only. */
  goldCapOnLockOnly: true;
}

const TRAINING_CADENCE: RewardCadence = {
  // Training (quiet): only a true node LOCK sweeps; gold cap at lock.
  sweepLevels: ["node_lock"],
  burstThrottleMs: 90_000,
  goldCapOnLockOnly: true,
};

const BOOST_CADENCE: RewardCadence = {
  // Boost (a little more energy): a node-provisional milestone ALSO sweeps, in
  // ADDITION to the lock sweep. Same throttle, same gold-cap-at-lock rule.
  sweepLevels: ["node_provisional", "node_lock"],
  burstThrottleMs: 90_000,
  goldCapOnLockOnly: true,
};

/** Which §5 cadence levels fire a visible sweep for a mode (presentation only). */
export function cadenceFor(mode: RewardMode): RewardCadence {
  return mode === "boost" ? BOOST_CADENCE : TRAINING_CADENCE;
}

/**
 * Does a given celebration level fire a visible sweep under `mode`? Convenience
 * predicate over cadenceFor — pure, presentation-only.
 */
export function sweeps(mode: RewardMode, level: CelebrationLevel): boolean {
  return cadenceFor(mode).sweepLevels.includes(level);
}
