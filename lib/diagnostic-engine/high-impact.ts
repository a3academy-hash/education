// lib/diagnostic-engine/high-impact — the curated bridge set (DIAGNOSTIC §3a,
// §V2 R1 / decision K1). These are the prerequisite skills most likely to
// break Algebra 1; they are NEVER inferred-only and require ≥2 DIRECT evidence
// points to reach READY. Pure: no React, no IO, no clock, no RNG.
//
// The id list is mr-kahn-blessed (§3a → node-id table). A CCSS set is kept
// only as a secondary cross-check guard; the id list is authoritative.
//
// COVERAGE GAPS (logged for v1.5, never fake-tagged — K2/V3.4):
//   • no ordered-pair-as-solution node exists in the graph;
//   • decimal/fraction/rational magnitude is collapsed into ALG-F02.
// The simulation marks these as UNMEASURED rather than silently dropping them.

import type { CurriculumGraph, ProblemTemplate, SkillNode } from "@/types";

/**
 * The curated high-impact bridge node ids (mr-kahn §3a→node-id table). Order
 * is the table order; consumers that need determinism sort by id themselves.
 */
export const HIGH_IMPACT_NODE_IDS: readonly string[] = [
  "ALG-F02", // Rational Number Operations (signed/fraction/decimal, collapsed)
  "ALG-F03", // Order of Operations
  "ALG-F08", // Distributive Property
  "ALG-E02", // Two-Step Equations
  "ALG-E03", // Multi-Step Equations
  "ALG-E04", // Variables on Both Sides
  "ALG-L05", // Slope as Rate of Change
  "ALG-L07", // Patterns, Tables & Graphs (table↔graph↔rule)
  "ALG-E13", // Modeling with Linear Equations (verbal→equation)
];

/** Secondary CCSS cross-check guard (§3a bridge codes). NOT authoritative. */
export const HIGH_IMPACT_CCSS: ReadonlySet<string> = new Set([
  "7.NS.A.1",
  "7.NS.A.2",
  "6.NS.B.3",
  "6.NS.C.7",
  "6.EE.A.1",
  "7.EE.A.1",
  "6.EE.B.7",
  "7.EE.B.4",
  "8.EE.C.7",
  "8.EE.B.5",
  "8.F.B.4",
  "6.EE.A.2",
]);

const HIGH_IMPACT_SET = new Set(HIGH_IMPACT_NODE_IDS);

/** Is this node id one of the curated high-impact bridge nodes? */
export function isHighImpact(nodeId: string): boolean {
  return HIGH_IMPACT_SET.has(nodeId);
}

/** Neutral Phase-3 problems for a node — the only diagnostic-eligible items. */
function neutralP3(n: SkillNode): ProblemTemplate[] {
  return n.problems.p3.filter((p) => p.sport === "neutral");
}

/** Per-id eligible neutral-P3 item count (build-time visibility / reporting). */
export function highImpactProbeCounts(graph: CurriculumGraph): Record<string, number> {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const out: Record<string, number> = {};
  for (const id of HIGH_IMPACT_NODE_IDS) {
    const node = byId.get(id);
    out[id] = node ? neutralP3(node).length : 0;
  }
  return out;
}

/**
 * Build-time assertion (§V3.3): every curated high-impact id MUST exist in the
 * graph AND carry ≥2 eligible neutral-P3 items (so it can reach the ≥2-direct
 * READY bar via the re-serve). Throws with the offending ids otherwise.
 */
export function assertHighImpactProbeable(graph: CurriculumGraph): void {
  const counts = highImpactProbeCounts(graph);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const missing = HIGH_IMPACT_NODE_IDS.filter((id) => !byId.has(id));
  const tooFew = HIGH_IMPACT_NODE_IDS.filter((id) => byId.has(id) && counts[id] < 2);
  if (missing.length > 0 || tooFew.length > 0) {
    throw new Error(
      `assertHighImpactProbeable: ${
        missing.length ? `missing high-impact node(s): ${missing.join(", ")}; ` : ""
      }${
        tooFew.length
          ? `high-impact node(s) with <2 neutral-P3 items: ${tooFew
              .map((id) => `${id}(${counts[id]})`)
              .join(", ")}`
          : ""
      }`.trim(),
    );
  }
}
