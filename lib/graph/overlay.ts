// lib/graph/overlay.ts
// Canonical Algebra 1 graph overlaid with the logged-in student's mastery
// state. Pure, deterministic, Supabase-ready (state arrives as rows; graph as
// JSON). Status/lock/frontier all derive from the mastery engine's results
// map + lockingGap — never from raw mastery numbers. Recommendations are
// owned by lib/adaptive-router; the overlay no longer computes one.
// Dependency direction: adaptive-router → graph/overlay → mastery-engine.

import { lockingGap, MASTERY_CONFIG } from "../mastery-engine";
import type {
  CurriculumGraph,
  MasteryResult,
  OverlayNode,
  StudentOverlay,
  StudentSkillState,
} from "@/types";

/** Compat alias — the single home of this value is MASTERY_CONFIG. */
export const MASTERY_GATE = MASTERY_CONFIG.thresholds.prereqGate;

export { propagateDiagnosticCredit } from "../mastery-engine";

const blank = (): StudentSkillState => ({
  mastery: 0,
  status: "unknown",
  phase: 1,
  attempts: 0,
  correct: 0,
  hints: 0,
  timeMs: 0,
  recent: [],
  transfer: false,
  lastAttemptAt: null,
  masteredAt: null,
});

/**
 * Merge the canonical graph with one student's state into a personalized
 * overlay. `results` is the output of computeMasteryAll for the same states —
 * accepted as a parameter to keep one computation per request cycle.
 */
export function computeOverlay(
  graph: CurriculumGraph,
  states: Record<string, StudentSkillState>,
  results: Record<string, MasteryResult>,
): StudentOverlay {
  const dependents = new Map<string, string[]>();
  for (const n of graph.nodes) {
    for (const p of n.prereqs) {
      const list = dependents.get(p);
      if (list) list.push(n.id);
      else dependents.set(p, [n.id]);
    }
  }

  const st = (id: string) => states[id] ?? blank();
  const res = (id: string): MasteryResult =>
    results[id] ?? { score: 0, status: "unknown", flags: [] };

  const nodes: OverlayNode[] = graph.nodes.map((n) => {
    const s = st(n.id);
    const r = res(n.id);
    const blockedBy =
      r.status === "mastered"
        ? null
        : (n.prereqs.find((p) => lockingGap(res(p), st(p))) ?? null);
    const frontier = r.status !== "mastered" && blockedBy === null;
    return {
      skillId: n.id,
      title: n.title,
      domain: n.domain,
      tier: n.tier,
      mastery: s.mastery,
      phase: s.phase,
      effectiveStatus: r.status,
      blockedBy,
      frontier,
      unlocks: dependents.get(n.id) ?? [],
    };
  });

  const domainProgress: StudentOverlay["summary"]["domainProgress"] = {};
  for (const d of graph.domains) {
    const dn = nodes.filter((o) => o.domain === d.id);
    domainProgress[d.id] = {
      mastered: dn.filter((o) => o.effectiveStatus === "mastered").length,
      total: dn.length,
      avgMastery: dn.reduce((a, o) => a + o.mastery, 0) / Math.max(dn.length, 1),
    };
  }

  return {
    summary: {
      mastered: nodes.filter((o) => o.effectiveStatus === "mastered").length,
      frontier: nodes.filter((o) => o.frontier).length,
      locked: nodes.filter((o) => o.effectiveStatus === "prerequisite_gap").length,
      domainProgress,
    },
    nodes,
  };
}
