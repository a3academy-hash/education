// Engine contract types: mastery results, overlay, routing, tutor boundary.
// Consumed by the deterministic engine in /lib (pure, no IO).

import type { MasteryStatus, Phase, Sport } from "./core";
import type { SkillNode } from "./curriculum";
import type { NewMasteryUpdate } from "./student";

/** Timing observations on the recent-attempt window. NEVER affect score or status. */
export type TimingFlag = "rushing" | "stalling";

/** Per-node output of the mastery engine. */
export interface MasteryResult {
  score: number;
  status: MasteryStatus;
  flags: TimingFlag[];
}

/** Whole-graph output of computeMasteryAll. */
export interface MasteryBatchResult {
  results: Record<string, MasteryResult>;
  /** One proposed update per node whose computed status differs from the persisted status. */
  proposedUpdates: NewMasteryUpdate[];
}

/**
 * The bounded tutor output: strings only. The tutor never routes, never sets
 * mastery, never reorders curriculum — enforced by this return type.
 */
export interface TutorResponse {
  diagnosis: string;
  reframe: string;
  bridgeToNeutral: string;
}

/** Seam for tutor backends (rule-based now; LLM later, OUTSIDE /lib). */
export interface TutorBackend {
  remediate(misconceptionTag: string, node: SkillNode, sport: Sport): Promise<TutorResponse>;
}

/** Mastery engine tuning. Changing ANY value is a Matt human checkpoint (CLAUDE.md). */
export interface MasteryConfig {
  weights: {
    recent: number;
    overall: number;
    consistency: number;
    hintFactor: number;
  };
  thresholds: {
    prereqGate: number;
    mastered: number;
    reviewTrigger: number;
    recentDip: number;
    nearMastery: number;
    developing: number;
    restoreAccuracy: number;
  };
  minAttempts: {
    mastered: number;
    statusBands: number;
    lockConfirm: number;
    restore: number;
  };
  transfer: {
    window: number;
    required: number;
  };
  decay: {
    halfLifeDays: number;
    floor: number;
  };
  timing: {
    rushingMs: number;
    stallingMs: number;
  };
}

/** Problem engine tuning. Changing ANY value is a Matt human checkpoint (CLAUDE.md). */
export interface ProblemEngineConfig {
  phaseAdvanceAccuracy: number;
  phaseAdvanceMinAttempts: number;
  /** Every probeRatio-th served slot is an N+1-phase probe. */
  probeRatio: number;
  transferWindow: number;
  transferRequired: number;
}

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
  /** No prerequisite locks this node, and it is not yet mastered. */
  frontier: boolean;
  /** Direct dependents. */
  unlocks: string[];
}

/** Recommendations are owned by the adaptive router; callers compose. */
export interface StudentOverlay {
  summary: {
    mastered: number;
    frontier: number;
    locked: number;
    domainProgress: Record<string, { mastered: number; total: number; avgMastery: number }>;
  };
  nodes: OverlayNode[];
}
