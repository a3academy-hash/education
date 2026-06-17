// lib/grade/subjects — roll node mastery up to the graph's domains for the
// parent dashboard's "5-10 subject-area masteries" (§12-13, R2). PURE: no IO, no
// recompute. ACCEPTS already-computed computeMasteryAll results (mr-gates perf,
// R11) — it never re-runs the engine.
//
// "masteredLocked" counts a node iff it is locked-BY-TRANSFER — the SAME
// provenance rule as lib/grade's 70% (R1). The caller passes the locked-id SET
// from computeGrade so the two surfaces can never disagree. Diagnostic/credit-
// propagation placements are NOT counted as locked here (they are provisional).

import type {
  CurriculumGraph,
  MasteryResult,
  StudentSkillState,
} from "../../types";

/** Plain-English band for a domain's locked-mastery fraction. */
export type SubjectBand = "not_started" | "developing" | "progressing" | "strong";

export interface SubjectMastery {
  /** Domain id (graph.domains[].id). */
  id: string;
  /** Domain label (graph.domains[].label). */
  label: string;
  /** Nodes in this domain that are locked-by-transfer (provenance-confirmed). */
  masteredLocked: number;
  /** Total nodes in this domain that the student has a state on. */
  total: number;
  /** masteredLocked / total (0 when total is 0). */
  fraction: number;
  band: SubjectBand;
}

function bandFor(fraction: number, total: number): SubjectBand {
  if (total === 0) return "not_started";
  if (fraction >= 0.8) return "strong";
  if (fraction >= 0.4) return "progressing";
  if (fraction > 0) return "developing";
  return "not_started";
}

/**
 * Roll the precomputed mastery results up to the graph's domains. PURE.
 *
 * @param graph   the curriculum graph (domain list + node→domain mapping)
 * @param states  per-skill states — defines which nodes the student has touched
 * @param results computeMasteryAll(...).results (ALREADY computed — never re-run)
 * @param lockedIds the locked-by-transfer node-id set from computeGrade (R1
 *   provenance). A node counts as masteredLocked iff it is in this set.
 */
export function rollUpSubjects(
  graph: CurriculumGraph,
  states: Record<string, StudentSkillState>,
  results: Record<string, MasteryResult>,
  lockedIds: ReadonlySet<string>,
): SubjectMastery[] {
  // domain id → { masteredLocked, total } over nodes the student has a state on.
  const counts = new Map<string, { masteredLocked: number; total: number }>();
  for (const d of graph.domains) counts.set(d.id, { masteredLocked: 0, total: 0 });

  for (const node of graph.nodes) {
    if (states[node.id] === undefined) continue; // only nodes the student has touched
    const bucket = counts.get(node.domain);
    if (!bucket) continue; // node references an unknown domain — skip defensively
    bucket.total += 1;
    // locked-by-transfer (provenance-confirmed) — never status alone.
    if (lockedIds.has(node.id) && results[node.id]?.status === "mastered") {
      bucket.masteredLocked += 1;
    }
  }

  // Preserve graph.domains order (tier-ascending, audit-stable).
  return graph.domains.map((d) => {
    const c = counts.get(d.id) ?? { masteredLocked: 0, total: 0 };
    const fraction = c.total === 0 ? 0 : c.masteredLocked / c.total;
    return {
      id: d.id,
      label: d.label,
      masteredLocked: c.masteredLocked,
      total: c.total,
      fraction,
      band: bandFor(fraction, c.total),
    };
  });
}
