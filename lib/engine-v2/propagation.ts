// Damped soft-KST prerequisite propagation (AI_ADAPTIVE §5). SINGLE-STEP (one hop)
// over the DAG prereq edges — the graph is acyclic, and single-step + damping means
// no iteration, hence NO oscillation or cycle risk (codexreview propagation). Pure.

export interface PrereqEdge {
  /** prerequisite node id */
  from: string;
  /** dependent node id */
  to: string;
}

/**
 * One damped propagation step from an updated node. A success delta on a DEPENDENT
 * softly RAISES its prerequisites; a failure delta on a FOUNDATIONAL node softly
 * LOWERS its dependents. The nudge is bounded: |nudge| <= damping * |delta|. Returns a
 * map of nodeId -> additive nudge (caller clamps the resulting pKnown to [0,1]).
 */
export function propagate(
  updatedNodeId: string,
  delta: number,
  edges: PrereqEdge[],
  damping = 0.2,
): Record<string, number> {
  const nudges: Record<string, number> = {};
  const add = (id: string, n: number) => {
    nudges[id] = (nudges[id] ?? 0) + n;
  };
  const bounded = damping * delta; // |bounded| <= damping*|delta|

  if (delta > 0) {
    // success on a dependent -> raise its prerequisites
    for (const e of edges) if (e.to === updatedNodeId) add(e.from, bounded);
  } else if (delta < 0) {
    // failure on a foundational node -> lower its dependents
    for (const e of edges) if (e.from === updatedNodeId) add(e.to, bounded);
  }
  return nudges;
}
