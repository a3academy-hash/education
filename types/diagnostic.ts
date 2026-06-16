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

/**
 * The four PLACEMENT labels (DIAGNOSTIC §1). This is a placement instrument,
 * NOT mastery — these are read-side metadata. The ONLY path to node_mastery
 * remains demonstrated[] → creditFromDiagnostic. Single source of truth;
 * lib/engine-v2/cold-start.ts imports this (underscore form canonical).
 */
export type DiagnosticPlacementLabel =
  | "READY"
  | "NEEDS_WORK"
  | "UNCERTAIN"
  | "INFERRED_READY";

/**
 * Per-node placement label with its BKT posterior + rough CI + evidence count.
 * `provisional` = NOT a confirmed READY lock — true for INFERRED_READY (topology-
 * derived) AND every UNCERTAIN placement (ambiguous, whether or not directly
 * probed). The course confirms all provisional placements via the first spaced
 * re-check (§12); only credited READY is non-provisional. `highImpact` = a
 * curated bridge node (§3a) that is never inferred-only.
 */
export interface DiagnosticNodeLabel {
  label: DiagnosticPlacementLabel;
  /** BKT likelihood-ratio posterior over DIRECT evidence (V3.1). */
  posterior: number;
  /** Rough Wilson CI on the direct-correct count (labelled rough, never precise). */
  ciLow: number;
  ciHigh: number;
  /** Number of DIRECT (served-and-answered) evidence points on this node. */
  evidenceCount: number;
  /** True when NOT a confirmed READY lock (INFERRED_READY or any UNCERTAIN). */
  provisional: boolean;
  highImpact: boolean;
}

/** Diagnostic engine tuning. Changing ANY value is a Matt human checkpoint. */
export interface DiagnosticConfig {
  /** Hard item budget for one diagnostic session. */
  maxItems: number;
  /** Provisional item cap (§4 MVD band) — the §V2 R5 stop ceiling. */
  provisionalMaxItems: number;
  /** Affective-fatigue pause ordinal (§9): asked ≥ this → pauseDue. */
  fatiguePauseAt: number;
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
  /**
   * BKT posterior + label thresholds (§V3.1 / §V2 R3). EVERY value here is a
   * Matt human checkpoint (mastery-threshold change). Documented defaults are
   * built; confirm before launch.
   */
  posterior: {
    /** Prior odds base p0 for untouched nodes (V3.1: 0.5). */
    priorUntouched: number;
    /** Skeptical prior p0 for inferred/descended-past nodes (V3.1: 0.4). */
    priorInferred: number;
    /** BKT guess parameter (0.2 — MC-ish). */
    guess: number;
    /** BKT slip parameter (0.1). */
    slip: number;
    /** READY needs posterior ≥ this (0.85). */
    readyThreshold: number;
    /** NEEDS_WORK needs posterior ≤ this (0.35). */
    needsWorkThreshold: number;
    /** Ambiguous high-impact band low bound for the stop rule (0.45). */
    ambiguousLo: number;
    /** Ambiguous high-impact band high bound for the stop rule (0.75). */
    ambiguousHi: number;
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
  /**
   * Affective fatigue pause (§9 / §V3.5): true once asked ≥ fatiguePauseAt.
   * The UI shows a calm optional pause; the engine never down-weights — it only
   * surfaces the cue. fatigueRisk itself is computed read-side in finish.
   */
  pauseDue: boolean;
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
  /**
   * Per-node placement labels (DIAGNOSTIC §1) — read-side metadata, NOT a
   * mastery write. Keyed by node id. Built from the BKT posterior layer.
   */
  labels: Record<string, DiagnosticNodeLabel>;
  /** NEEDS_WORK + UNCERTAIN nodes, topologically ordered (ancestors first). */
  remediation: string[];
  /**
   * Nodes credit may NEVER touch (§V3.2): unresolved-high-impact (< 2
   * direct-correct) ∪ NEEDS_WORK/UNCERTAIN nodes not directly demonstrated.
   * The server passes this to creditFromDiagnostic so actual persistence and
   * the recommendation sim agree. Sorted by id.
   */
  blocked: string[];
  /** Deepest non-READY nodes whose prereqs are all READY/INFERRED_READY. */
  entryFrontier: string[];
  /** Quality flags (§1.4). fatigueRisk is null when undecidable (V3.5). */
  qualityFlags: {
    lowConfidenceNodes: string[];
    suspectedGuessing: boolean;
    fatigueRisk: boolean | null;
  };
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
