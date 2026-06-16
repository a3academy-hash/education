// Cold-start: diagnostic seed -> live graph (AI_ADAPTIVE §6). Maps the four
// DIAGNOSTIC placement labels to a graded BKT init + population retention prior +
// empirical-Bayes blend for the first few retrievals. Pure.
import type { LearningState } from "./interaction";
import { RETENTION } from "./types";
import type { DiagnosticPlacementLabel } from "@/types";

// One label type (G4 / §V2 R7): the canonical union lives in types/diagnostic.ts.
// Kept as a local alias so existing engine-v2 callers keep their name.
export type DiagnosticLabel = DiagnosticPlacementLabel;

/** Graded initial p_known per label (§6). UNCERTAIN sits mid with high uncertainty. */
const PRIOR_BY_LABEL: Record<DiagnosticLabel, number> = {
  READY: 0.85,
  NEEDS_WORK: 0.2,
  UNCERTAIN: 0.5,
  INFERRED_READY: 0.65, // provisional (KST-propagated), not locked
};

export interface SeedResult {
  state: LearningState;
  /** INFERRED_READY is provisional-only (never a lock) per DIAGNOSTIC §3a. */
  provisional: boolean;
}

/** Seed a node's learning state from its diagnostic label. Retention starts at the
 *  population prior (null stability => prior on first retrieval), per §6 bootstrap. */
export function seedFromDiagnostic(label: DiagnosticLabel): SeedResult {
  return {
    state: {
      acq: { pKnown: PRIOR_BY_LABEL[label] },
      ret: { stability: null, lastRetrievalAtIso: null }, // population prior until first retrieval
    },
    provisional: label === "INFERRED_READY" || label === "UNCERTAIN",
  };
}

/**
 * Empirical-Bayes blend for the first N retrievals: blend the personalized stability
 * toward the population prior to stabilize early estimates (§6). weight -> 1 as the
 * retrieval count grows past `n`.
 */
export function ebBlendStability(personalized: number, retrievalCount: number, n = 4): number {
  const w = Math.min(1, retrievalCount / n);
  return w * personalized + (1 - w) * RETENTION.POPULATION_PRIOR;
}
