// Placement-diagnostic contract types (Phase 3). Consumed by the pure engine
// in lib/diagnostic-engine and the diagnostic UI/server action. The diagnostic
// estimates — it NEVER writes mastery. It emits demonstrated[] and the
// committed creditFromDiagnostic/computeMasteryAll/recommend decide.

import type { MasteryStatus } from "./core";
import type { ProblemTemplate } from "./problem";

/**
 * Confidence is about the MEASUREMENT, not the student, and is not comparable
 * between students. "unknown" = never touched and never inferred (split from
 * "low" = descended past but not answered; mr-kahn #6).
 */
export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

/** Which interactive-visual surface an item renders with (pee-wee binding). */
export type ResponseType = "input" | "plane" | "line" | "table";

/**
 * One served diagnostic item. `phase` is the LITERAL 3: every credit-bearing
 * diagnostic item is a neutral Phase-3 problem, and this type makes a
 * non-neutral credit-bearing item unrepresentable (mr-kahn #3 / mr-gates #1).
 */
export interface DiagnosticItem {
  skillId: string;
  phase: 3;
  responseType: ResponseType;
  problem: ProblemTemplate;
}

/** Diagnostic engine tuning. Changing ANY value is a Matt human checkpoint. */
export interface DiagnosticConfig {
  /** Hard item budget for one diagnostic session. */
  maxItems: number;
  /**
   * Crediting ≥ this many ancestors off one correct answer (or any
   * cross-domain ancestry) requires a confirmation probe first.
   */
  creditDepthConfirm: number;
  /** The only sanctioned depth metric — node `tier` is NEVER used for depth. */
  anchorMetric: "prereqDepthWithinDomain";
  /** Evidence kind → confidence level mapping (single home). */
  confidence: {
    directlyProbed: ConfidenceLevel;
    inferredFromDescendant: ConfidenceLevel;
    descendedPast: ConfidenceLevel;
    untouched: ConfidenceLevel;
  };
}

/** Per-node estimate with evidence pointers (audit reconstructability). */
export interface DiagnosticNodeEstimate {
  status: MasteryStatus;
  confidence: ConfidenceLevel;
  evidenceAttemptIds: string[];
}

/** Per-domain rollup for the summary screen. */
export interface DiagnosticClusterEstimate {
  /** Keyed to graph.domains[].id. */
  domainId: string;
  status: MasteryStatus;
  confidence: ConfidenceLevel;
  masteredEstimate: number;
  total: number;
  /** True when the diagnostic could not probe this domain (empty p3 banks). */
  unestimated: boolean;
}

/**
 * Immutable in-progress session — recordResponse returns a NEW session.
 * Everything below is a pure function of (graph, config, responses).
 */
export interface DiagnosticSession {
  studentId: string;
  config: DiagnosticConfig;
  /** Skill ids in served-and-answered order. */
  asked: string[];
  responses: { skillId: string; correct: boolean; attemptIdRef?: string }[];
  /** Pending probe targets in serve order; [0] is next. */
  queue: string[];
  /** Probeable-domain id → localized (frontier found / walk concluded). */
  localized: Record<string, boolean>;
  /** 0..1 for the UI rail — non-numeric, monotonic, never a count. */
  progress: number;
}

export interface DiagnosticResult {
  perNode: Record<string, DiagnosticNodeEstimate>;
  byCluster: DiagnosticClusterEstimate[];
  /** Nodes demonstrated on a correct neutral-P3 item (confirm-gated chains
   * only when the confirm passed). Input to creditFromDiagnostic. */
  demonstrated: string[];
  /** May be "" when complete, mirroring AdaptiveRecommendation.skillId. */
  recommendedStart: string;
  recommendedReason: string;
}

/**
 * Narrow server-action result DTO. The server action NEVER returns the graph
 * or overlay to the client — this is the entire surface.
 */
export interface DiagnosticPersistResult {
  recommendedSkillId: string;
  recommendedReason: string;
  creditedCount: number;
  skippedCount: number;
}
