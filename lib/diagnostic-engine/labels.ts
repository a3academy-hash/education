// lib/diagnostic-engine/labels — the four PLACEMENT labels (§1 / §V2 R6 /
// §V3), remediation ordering, and the entry frontier. PURE: no React, no IO,
// no clock, no RNG. All graph iteration is over graph.nodes / sorted ids only
// (G5 / R8) — never raw Map/Set/Object.keys order.
//
// LABELS ARE READ-SIDE PLACEMENT METADATA. They never write node_mastery; the
// ONLY path to mastery is demonstrated[] → creditFromDiagnostic (R9).

import type {
  CurriculumGraph,
  DiagnosticConfig,
  DiagnosticNodeLabel,
  DiagnosticPlacementLabel,
} from "@/types";

export interface LabelInput {
  posterior: number;
  /** Count of DIRECT correct responses on this node (per-serve). */
  directCorrect: number;
  /** Count of DIRECT incorrect responses on this node (per-serve). */
  directIncorrect: number;
  /** True when the node has NO direct evidence (resolved by topology only). */
  inferredOnly: boolean;
  highImpact: boolean;
  /** A domain-root / high-impact-foundational node (K5 foundational-fail rule). */
  foundational: boolean;
  /** Fatigue flagged for this node (§V3.5) → unresolved becomes UNCERTAIN. */
  fatigueFlagged: boolean;
}

/**
 * Classify ONE node (§V2 R6 / §V3). Thresholds come from
 * DIAGNOSTIC_CONFIG.posterior (Matt checkpoint constants).
 *
 *   READY          posterior ≥ readyThreshold ∧ ≥2 DIRECT evidence;
 *                  high-impact additionally requires ≥2 DIRECT-CORRECT.
 *   NEEDS_WORK     posterior ≤ needsWorkThreshold ∧ ≥2 fails, OR a foundational
 *                  direct fail at 1 evidence (K5). Never when fatigue-flagged.
 *   INFERRED_READY inferred-only (resolved by prerequisite TOPOLOGY, §1) and
 *                  provisional. NOT posterior-gated: the BKT posterior cannot
 *                  rise without direct evidence, which an inferred-only node by
 *                  definition lacks, so a posterior gate here is unreachable —
 *                  confirmation-gated topology membership IS the signal.
 *                  High-impact inferred-only is DEMOTED → UNCERTAIN (forces
 *                  direct evidence, §3a).
 *   UNCERTAIN      everything else (the ambiguous middle, inconsistent
 *                  evidence, or fatigue-flagged).
 */
export function labelNode(
  input: LabelInput,
  cfg: DiagnosticConfig["posterior"],
): DiagnosticPlacementLabel {
  const {
    posterior,
    directCorrect,
    directIncorrect,
    inferredOnly,
    highImpact,
    foundational,
    fatigueFlagged,
  } = input;
  const directEvidence = directCorrect + directIncorrect;

  // Fatigue-flagged unresolved nodes are UNCERTAIN, never NEEDS_WORK (§9 /
  // §V3.5) — but a confidently-cleared READY node is not down-graded.
  const fatigueBlocksDown = fatigueFlagged;

  // READY — needs the posterior bar AND ≥2 direct evidence; high-impact needs
  // ≥2 direct-CORRECT specifically (R2).
  if (posterior >= cfg.readyThreshold && directEvidence >= 2) {
    if (highImpact && directCorrect < 2) return "UNCERTAIN";
    return "READY";
  }

  // INFERRED_READY — resolved by prerequisite TOPOLOGY (§1), provisional only.
  // In this engine inference is confirmation-gated (the confirm probe passed),
  // so topology membership is the signal; the BKT posterior cannot rise
  // without direct evidence, which an inferred-only node by definition lacks.
  // High-impact inferred-only is DEMOTED to UNCERTAIN (never inferred-only,
  // §3a) — it must earn ≥2 direct points.
  if (inferredOnly) {
    return highImpact ? "UNCERTAIN" : "INFERRED_READY";
  }

  // NEEDS_WORK — strong failure signal. Suppressed under fatigue.
  if (!fatigueBlocksDown) {
    if (posterior <= cfg.needsWorkThreshold && directIncorrect >= 2) return "NEEDS_WORK";
    // Foundational direct fail at a single evidence point (K5).
    if (foundational && directIncorrect >= 1 && directCorrect === 0) return "NEEDS_WORK";
  }

  return "UNCERTAIN";
}

/** Transitive prerequisite closure of `id` (node excluded), sorted by id. */
function ancestorsOf(id: string, byId: Map<string, { prereqs: string[] }>): string[] {
  const seen = new Set<string>();
  const visit = (cur: string) => {
    for (const p of byId.get(cur)?.prereqs ?? []) {
      if (seen.has(p)) continue;
      seen.add(p);
      visit(p);
    }
  };
  visit(id);
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/**
 * Topological order (Kahn) over prereqs, deterministic in graph.nodes order
 * with a sorted-id tie-break. Ancestors come before dependents.
 */
function topoOrder(graph: CurriculumGraph): string[] {
  const inDegree = new Map(graph.nodes.map((n) => [n.id, n.prereqs.length]));
  const dependents = new Map<string, string[]>();
  for (const n of graph.nodes) {
    for (const p of n.prereqs) {
      const list = dependents.get(p);
      if (list) list.push(n.id);
      else dependents.set(p, [n.id]);
    }
  }
  for (const list of dependents.values()) list.sort((a, b) => a.localeCompare(b));
  // Sorted-id ready queue → fully deterministic regardless of node order.
  const ready = graph.nodes
    .filter((n) => n.prereqs.length === 0)
    .map((n) => n.id)
    .sort((a, b) => a.localeCompare(b));
  const order: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift() as string;
    order.push(id);
    const newlyReady: string[] = [];
    for (const d of dependents.get(id) ?? []) {
      const remaining = (inDegree.get(d) ?? 0) - 1;
      inDegree.set(d, remaining);
      if (remaining === 0) newlyReady.push(d);
    }
    newlyReady.sort((a, b) => a.localeCompare(b));
    for (const d of newlyReady) ready.push(d);
  }
  return order;
}

const READY_LABELS = new Set<DiagnosticPlacementLabel>(["READY", "INFERRED_READY"]);

/**
 * Prioritized remediation list: NEEDS_WORK + UNCERTAIN nodes, topologically
 * ordered (ancestors first) so the student fills foundations before
 * dependents. Pure; iterates the topo order (sorted-id deterministic).
 */
export function remediationList(
  labels: Record<string, DiagnosticPlacementLabel>,
  graph: CurriculumGraph,
): string[] {
  const order = topoOrder(graph);
  return order.filter((id) => {
    const l = labels[id];
    return l === "NEEDS_WORK" || l === "UNCERTAIN";
  });
}

/**
 * Recommended entry frontier: the DEEPEST non-READY nodes whose prereqs are
 * all READY/INFERRED_READY — the recommended start set. "Deepest" = a frontier
 * node has no non-READY descendant that itself qualifies (we keep the lowest
 * qualifying node on each chain). Pure; iterates sorted ids.
 */
export function entryFrontier(
  labels: Record<string, DiagnosticPlacementLabel>,
  graph: CurriculumGraph,
): string[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, { prereqs: n.prereqs }]));
  const ids = graph.nodes.map((n) => n.id).sort((a, b) => a.localeCompare(b));

  const qualifies = (id: string): boolean => {
    const l = labels[id];
    if (l === undefined || READY_LABELS.has(l)) return false; // node itself must be non-READY
    const node = byId.get(id);
    if (!node) return false;
    return node.prereqs.every((p) => {
      const pl = labels[p];
      return pl !== undefined && READY_LABELS.has(pl);
    });
  };

  const candidates = ids.filter(qualifies);
  const candidateSet = new Set(candidates);

  // "Deepest" pruning: drop a candidate if any of its ANCESTORS is also a
  // candidate (the ancestor is the deeper start on that chain).
  return candidates
    .filter((id) => !ancestorsOf(id, byId).some((a) => candidateSet.has(a)))
    .sort((a, b) => a.localeCompare(b));
}

/** Build a node-id→full-label record from a label map + posterior layer. */
export function toNodeLabel(
  label: DiagnosticPlacementLabel,
  posterior: { posterior: number; ciLow: number; ciHigh: number; evidenceCount: number },
  highImpact: boolean,
): DiagnosticNodeLabel {
  return {
    label,
    posterior: posterior.posterior,
    ciLow: posterior.ciLow,
    ciHigh: posterior.ciHigh,
    evidenceCount: posterior.evidenceCount,
    provisional: label === "INFERRED_READY" || label === "UNCERTAIN",
    highImpact,
  };
}
