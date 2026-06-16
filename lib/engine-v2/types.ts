// lib/engine-v2 — the modular adaptive engine (overhaul Phase 3; AI_ADAPTIVE §5-7,
// CLAUDE §3). PURE + framework-neutral. Closes AUDIT D5 at the MODULE level (a
// tested replacement for the v0.1 deterministic-score+in-session-lock engine);
// the live cutover is Phase 4. Substrate = StudentSkillState (student_skill_state);
// "node_mastery" in the specs is a conceptual alias, not a table.

/** BKT parameters per node (prior / learn / guess / slip). */
export interface BktParams {
  pL0: number; // prior P(known) before any evidence
  pT: number;  // learn (transition) probability per opportunity
  pG: number;  // guess: P(correct | not known)
  pS: number;  // slip:  P(incorrect | known)
}

/** Acquisition state: the BKT latent P(known) + its variance (uncertainty). */
export interface AcquisitionState {
  pKnown: number;
}

/** Retention state: the FSRS-style memory durability. */
export interface RetentionState {
  /** Stability in DAYS. null = never retrieved (still at the population prior). */
  stability: number | null;
  /** ISO timestamp of the last retrieval, or null. */
  lastRetrievalAtIso: string | null;
}

/**
 * Engine-local evidence. `kind` is derived from SELECTION/session context (which
 * the selector knows), NOT from StudentAttempt.source (which is provenance-only and
 * must never drive engine math). This discriminator routes the interaction rule.
 */
export interface Evidence {
  kind: "new_acquisition" | "retrieval" | "delayed_lock_check";
  correct: boolean;
  /** Days since the previous exposure of THIS node (for retention spacing). */
  elapsedDays: number;
  /** Was the served item instance unseen since the prior exposure? (lock requires it.) */
  unseen?: boolean;
  /** The transfer dimension this evidence covers (CLAUDE §5), if any. */
  dimension?: string;
}

/**
 * One delayed-lock-check observation — the ONLY evidence the gate consults. In-
 * session/practiced attempts never produce a LockEvidence row, so they can never
 * lock a node (the D5 firewall). `window` is the scheduled delayed check it cleared.
 */
export interface LockEvidence {
  window: 1 | 7 | 21;
  unseen: boolean;
  correct: boolean;
  /** BKT lower-bound confidence at the time of this check. */
  pKnownLB: number;
  dimension?: string;
  atIso: string;
}

/** The four transfer dimensions (CLAUDE §5) a lock must cover. */
export const TRANSFER_DIMENSIONS = [
  "changed_story",
  "changed_representation",
  "no_story_symbolic",
  "novel_form",
] as const;
export type TransferDimension = (typeof TRANSFER_DIMENSIONS)[number];

/** Retention constants (calibratable; mirror ab_parameters intent). */
export const RETENTION = {
  STABILITY_MIN: 0.5,
  STABILITY_MAX: 365,
  GROWTH: 1.0,
  FAIL_FACTOR: 0.5,
  POPULATION_PRIOR: 3, // days — novel-math FSRS-ish default
  TARGET_RECALL: 0.9,
} as const;
