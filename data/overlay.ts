// lib/graph/overlay.ts
// Canonical Algebra 1 graph overlaid with the logged-in student's mastery state.
// Pure, deterministic, Supabase-ready (state arrives as rows; graph as JSON).

export type MasteryStatus =
  | "unknown" | "introduced" | "developing" | "near_mastery"
  | "mastered" | "needs_review" | "prerequisite_gap";

export interface SkillNode {
  id: string; title: string; domain: string; tier: number;
  prereqs: string[];
  standards: { ccss: string[]; state: string | null };
  objective: string;
  misconceptionTags: string[];
  visual: "numberline" | "coordinate" | "balance" | "table" | "area-model" | null;
  contextHooks: Record<string, string>; // keyed by sport + "neutral"
  problems: { p1: unknown[]; p2: unknown[]; p3: unknown[] };
}

export interface CurriculumGraph {
  schema: { version: string; course: string };
  domains: { id: string; label: string; tier: number }[];
  nodes: SkillNode[];
  edges: { from: string; to: string }[];
}

export interface StudentSkillState {
  mastery: number;          // 0..1
  status: MasteryStatus;    // engine-computed, persisted
  phase: 1 | 2 | 3;         // context progression
  attempts: number; correct: number; hints: number; timeMs: number;
  lastFive: boolean[];
  transfer: boolean;        // demonstrated phase-3 neutral success
}

export interface OverlayNode {
  skillId: string; title: string; domain: string; tier: number;
  mastery: number; phase: 1 | 2 | 3;
  effectiveStatus: MasteryStatus;   // status with prerequisite-gap override applied
  blockedBy: string | null;         // first failing prerequisite, if locked
  frontier: boolean;                // all prereqs mastered, node not yet mastered
  unlocks: string[];                // direct dependents
}

export interface StudentOverlay {
  summary: {
    mastered: number; frontier: number; locked: number;
    domainProgress: Record<string, { mastered: number; total: number; avgMastery: number }>;
  };
  recommendation: AdaptiveRecommendation | null;
  nodes: OverlayNode[];
}

export interface AdaptiveRecommendation {
  skillId: string; title: string;
  kind: "remediate" | "continue" | "review" | "accelerate" | "complete";
  reason: string;               // one plain sentence a 12-year-old understands
  blockedSkill?: string;        // what this unlocks, when routing backward
}

export const MASTERY_GATE = 0.7; // tuning is a human checkpoint (CLAUDE.md)

const STATUS_RANK: Record<string, number> = {
  needs_review: 0, developing: 1, near_mastery: 2, introduced: 3, unknown: 4,
};

const blank = (): StudentSkillState => ({
  mastery: 0, status: "unknown", phase: 1, attempts: 0, correct: 0,
  hints: 0, timeMs: 0, lastFive: [], transfer: false,
});

/** Merge the canonical graph with one student's state into a personalized overlay. */
export function computeOverlay(
  graph: CurriculumGraph,
  state: Record<string, StudentSkillState>,
): StudentOverlay {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const dependents = new Map<string, string[]>();
  for (const n of graph.nodes)
    for (const p of n.prereqs)
      dependents.set(p, [...(dependents.get(p) ?? []), n.id]);

  const st = (id: string) => state[id] ?? blank();

  const nodes: OverlayNode[] = graph.nodes.map((n) => {
    const s = st(n.id);
    let effectiveStatus: MasteryStatus = s.status;
    let blockedBy: string | null = null;
    if (s.status !== "mastered") {
      blockedBy = n.prereqs.find((p) => st(p).mastery < MASTERY_GATE) ?? null;
      if (blockedBy) effectiveStatus = "prerequisite_gap";
    }
    const frontier =
      s.status !== "mastered" &&
      n.prereqs.every((p) => st(p).mastery >= MASTERY_GATE);
    return {
      skillId: n.id, title: n.title, domain: n.domain, tier: n.tier,
      mastery: s.mastery, phase: s.phase,
      effectiveStatus, blockedBy, frontier,
      unlocks: dependents.get(n.id) ?? [],
    };
  });

  const tierOf = new Map(graph.domains.map((d) => [d.id, d.tier]));

  // Deterministic recommendation:
  // 1) finish in-progress work (needs_review first — decayed mastery is urgent)
  // 2) then lowest mastery, earliest domain tier, then skillId (stable tiebreak)
  const frontierNodes = nodes
    .filter((o) => o.frontier)
    .sort(
      (a, b) =>
        (STATUS_RANK[a.effectiveStatus] ?? 5) - (STATUS_RANK[b.effectiveStatus] ?? 5) ||
        a.mastery - b.mastery ||
        (tierOf.get(a.domain) ?? 99) - (tierOf.get(b.domain) ?? 99) ||
        a.skillId.localeCompare(b.skillId),
    );

  let recommendation: AdaptiveRecommendation | null = null;
  const top = frontierNodes[0];
  if (!top) {
    recommendation = {
      skillId: "", title: "", kind: "complete",
      reason: "Every skill in Algebra 1 is mastered.",
    };
  } else {
    const lockedDependent = nodes.find((o) => o.blockedBy === top.skillId);
    const kind: AdaptiveRecommendation["kind"] =
      top.effectiveStatus === "needs_review" ? "review"
      : lockedDependent ? "remediate"
      : "continue";
    const reason =
      kind === "review"
        ? `You had this mastered and it slipped a little — a short review brings it back.`
        : lockedDependent
        ? `${lockedDependent.title} is waiting on this skill, so we strengthen it first.`
        : `This is the next skill you're fully ready for.`;
    recommendation = {
      skillId: top.skillId, title: top.title, kind, reason,
      blockedSkill: lockedDependent?.title,
    };
  }

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
    recommendation,
    nodes,
  };
}

/**
 * Diagnostic credit propagation: demonstrated mastery of a node implies its
 * prerequisite ancestry — credit it downward so strong students accelerate
 * past material they've already proven, without busywork.
 */
export function propagateDiagnosticCredit(
  graph: CurriculumGraph,
  demonstrated: string[],
): Set<string> {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const credited = new Set<string>();
  const visit = (id: string) => {
    if (credited.has(id)) return;
    credited.add(id);
    for (const p of byId.get(id)?.prereqs ?? []) visit(p);
  };
  demonstrated.forEach(visit);
  return credited;
}
