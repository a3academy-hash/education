// Overlay/recommendation types consumed by the deterministic engine
// (extracted from the reference overlay implementation).

import type { MasteryStatus, Phase } from "./core";

export interface AdaptiveRecommendation {
  skillId: string;
  title: string;
  kind: "remediate" | "continue" | "review" | "accelerate" | "complete";
  /** One plain sentence a 12-year-old understands. */
  reason: string;
  /** What this unlocks, when routing backward. */
  blockedSkill?: string;
}

export interface OverlayNode {
  skillId: string;
  title: string;
  domain: string;
  tier: number;
  mastery: number;
  phase: Phase;
  /** Status with prerequisite-gap override applied. */
  effectiveStatus: MasteryStatus;
  /** First failing prerequisite, if locked. */
  blockedBy: string | null;
  /** All prereqs mastered, node not yet mastered. */
  frontier: boolean;
  /** Direct dependents. */
  unlocks: string[];
}

export interface StudentOverlay {
  summary: {
    mastered: number;
    frontier: number;
    locked: number;
    domainProgress: Record<string, { mastered: number; total: number; avgMastery: number }>;
  };
  recommendation: AdaptiveRecommendation | null;
  nodes: OverlayNode[];
}
