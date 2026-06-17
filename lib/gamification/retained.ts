// lib/gamification/retained.ts — visible RETAINED-mastery (Phase 8 R2). PURE,
// read-side: derives "kept sharp" from the LIVE attempt log, never from a faked
// durability number (trust-layer rule: never assert retention without measured
// retrieval). Imports NOTHING from gate.ts/session.ts/mastery-engine — this is
// presentation-only and can never touch lock/mastery math (Phase 8 R5 firewall).
//
// DEFINITIONS (Phase 8 R2 / review #2):
//   • masteredCount = every node currently mastered (masteredAt != null). This is
//     the "Y" denominator. A node with no retention probe yet is "retention
//     pending" — counted in Y, NEVER counted against the student.
//   • retained = a mastered node that has cleared ≥1 DELAYED, unseen retention
//     probe — i.e. ≥1 attempt with source==="retention" && correct &&
//     createdAt > masteredAt. This is the real §7 "proven on a later check"
//     definition. It is the "X" in "X of Y mastered".
//   • pendingIds = mastered nodes with no passed retention probe yet (the
//     remainder of Y not in X).
//
// "now" is unused here (the definition is purely log-relative: createdAt vs
// masteredAt), but it is accepted for a stable read-side signature parallel to
// computeMomentum and so a future windowed variant needs no signature change.

import type { CurriculumGraph, StudentAttempt, StudentSkillState } from "@/types";

export interface RetainedSummary {
  /** Mastered nodes proven on a later, unseen retention check (the "X"). */
  retainedCount: number;
  /** All currently-mastered nodes (the "Y" denominator). */
  masteredCount: number;
  /** Node ids in `retainedCount`, in graph node order. */
  retainedIds: string[];
  /** Mastered nodes with no passed retention probe yet (retention pending). */
  pendingIds: string[];
}

/**
 * Derive retained-mastery from committed state + the immutable attempt log.
 * PURE; never mutates inputs; never feeds mastery/lock math.
 */
export function retainedMastery(
  states: Record<string, StudentSkillState>,
  attempts: StudentAttempt[],
  graph: CurriculumGraph,
  nowIso: string,
): RetainedSummary {
  void nowIso; // log-relative definition; accepted for signature stability

  // Index passed retention probes per node (source-tagged, audit-only provenance —
  // never engine math). We only need a boolean "≥1 passed delayed probe" per node.
  const passedProbeNodes = new Set<string>();
  for (const a of attempts) {
    if (a.source !== "retention" || !a.correct) continue;
    const masteredAt = states[a.skillId]?.masteredAt;
    if (masteredAt == null) continue;
    // DELAYED + unseen is guaranteed by the retention scheduler that injected the
    // probe; the durability signal here is strictly "passed AFTER mastery".
    if (Date.parse(a.createdAt) > Date.parse(masteredAt)) {
      passedProbeNodes.add(a.skillId);
    }
  }

  const retainedIds: string[] = [];
  const pendingIds: string[] = [];
  let masteredCount = 0;

  // Iterate in graph node order for deterministic output.
  for (const node of graph.nodes) {
    const state = states[node.id];
    if (!state || state.masteredAt == null) continue;
    masteredCount += 1;
    if (passedProbeNodes.has(node.id)) retainedIds.push(node.id);
    else pendingIds.push(node.id);
  }

  return {
    retainedCount: retainedIds.length,
    masteredCount,
    retainedIds,
    pendingIds,
  };
}
