// lib/adaptive-router — deterministic routing. PURE: no mutation, no
// persistence, no IO. The router is the single owner of recommendations;
// callers compose. mr-kahn gated (CLAUDE.md).
//
// DECISION ORDER:
//   1. All nodes mastered → kind "complete".
//   2. Any needs_review → kind "review" on the worst (lowest score, then
//      domain tier, then skillId). Decayed/slipped mastery is urgent.
//   3. Frontier set = nodes not mastered whose prereqs ALL fail
//      lockingGap-to-lock (consuming the results map — never re-derived from
//      raw state). Sorted by status rank (needs_review 0, developing 1,
//      near_mastery 2, introduced 3, unknown 4), then score asc, then domain
//      tier asc, then skillId lexicographic. Deterministic: same inputs →
//      same output; permuted node order → same output.
//   4. Top candidate:
//      - justCredited skill is a direct/transitive prereq → kind "accelerate"
//        (caller flow: persist diagnostic/decay updates FIRST, recompute
//        mastery, then call recommend with justCredited).
//      - Else kind "remediate" IFF the candidate blocks ≥ 1 dependent AND
//        there is attempt evidence of the gap (candidate.attempts > 0 OR any
//        dependent.attempts > 0), with blockedSkill naming the dependent.
//      - Else kind "continue". An empty state on the root therefore yields
//        "continue", not "remediate" (resolves the Phase 0 carry-over in
//        docs/curriculum-notes.md).

import { lockingGap } from "../mastery-engine";
import type {
  AdaptiveRecommendation,
  CurriculumGraph,
  MasteryResult,
  SkillNode,
  StudentSkillState,
} from "@/types";

const STATUS_RANK: Record<string, number> = {
  needs_review: 0,
  developing: 1,
  near_mastery: 2,
  introduced: 3,
  unknown: 4,
};

const blankState = (): StudentSkillState => ({
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

/** Transitive prerequisite closure of one node (the node itself excluded). */
function ancestorsOf(skillId: string, byId: Map<string, SkillNode>): Set<string> {
  const seen = new Set<string>();
  const visit = (id: string) => {
    for (const p of byId.get(id)?.prereqs ?? []) {
      if (seen.has(p)) continue;
      seen.add(p);
      visit(p);
    }
  };
  visit(skillId);
  return seen;
}

export function recommend(
  results: Record<string, MasteryResult>,
  states: Record<string, StudentSkillState>,
  graph: CurriculumGraph,
  opts?: { justCredited?: string[] },
): AdaptiveRecommendation {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const tierOf = new Map(graph.domains.map((d) => [d.id, d.tier]));
  const st = (id: string): StudentSkillState => states[id] ?? blankState();
  const res = (id: string): MasteryResult =>
    results[id] ?? { score: 0, status: "unknown", flags: [] };
  const domainTier = (n: SkillNode) => tierOf.get(n.domain) ?? 99;

  // 1. Course complete.
  if (graph.nodes.every((n) => res(n.id).status === "mastered")) {
    return {
      skillId: "",
      title: "",
      kind: "complete",
      reason: "Every skill in Algebra 1 is mastered.",
    };
  }

  // 2. Reviews first — slipped mastery is the most urgent, and an
  //    ever-mastered prereq in needs_review never locks (pure decay), so it
  //    must be served here rather than via backward routing.
  const reviews = graph.nodes
    .filter((n) => res(n.id).status === "needs_review")
    .sort(
      (a, b) =>
        res(a.id).score - res(b.id).score ||
        domainTier(a) - domainTier(b) ||
        a.id.localeCompare(b.id),
    );
  if (reviews.length > 0) {
    const worst = reviews[0];
    return {
      skillId: worst.id,
      title: worst.title,
      kind: "review",
      reason: `You had ${worst.title} mastered and it slipped a little — a short review brings it back.`,
    };
  }

  // 3. Frontier: not mastered, and no prerequisite locks it.
  const frontier = graph.nodes
    .filter(
      (n) =>
        res(n.id).status !== "mastered" &&
        n.prereqs.every((p) => !lockingGap(res(p), st(p))),
    )
    .sort(
      (a, b) =>
        (STATUS_RANK[res(a.id).status] ?? 5) - (STATUS_RANK[res(b.id).status] ?? 5) ||
        res(a.id).score - res(b.id).score ||
        domainTier(a) - domainTier(b) ||
        a.id.localeCompare(b.id),
    );

  const top = frontier[0];
  if (!top) {
    // Unreachable on a validated acyclic graph (a non-mastered locking chain
    // always terminates at an unlocked root); defensive only.
    return {
      skillId: "",
      title: "",
      kind: "complete",
      reason: "Every skill in Algebra 1 is mastered.",
    };
  }

  // 4a. Acceleration: a just-credited skill sits in the candidate's ancestry.
  const justCredited = opts?.justCredited ?? [];
  if (justCredited.length > 0) {
    const ancestry = ancestorsOf(top.id, byId);
    const skipped = justCredited.filter((id) => ancestry.has(id));
    if (skipped.length > 0) {
      const names = skipped
        .map((id) => byId.get(id)?.title ?? id)
        .sort((a, b) => a.localeCompare(b));
      const list = names.join(" and ");
      return {
        skillId: top.id,
        title: top.title,
        kind: "accelerate",
        reason: `You already proved ${list} — we're not re-teaching ${names.length === 1 ? "it" : "them"}.`,
      };
    }
  }

  // 4b. Remediate only when the gap is evidenced and something is waiting.
  const topLocks = lockingGap(res(top.id), st(top.id));
  const dependents = graph.nodes
    .filter((n) => n.prereqs.includes(top.id))
    .sort((a, b) => domainTier(a) - domainTier(b) || a.id.localeCompare(b.id));
  const attemptEvidence =
    st(top.id).attempts > 0 || dependents.some((d) => st(d.id).attempts > 0);
  if (topLocks && dependents.length > 0 && attemptEvidence) {
    const blocked = dependents[0];
    return {
      skillId: top.id,
      title: top.title,
      kind: "remediate",
      reason: `${blocked.title} is waiting on this skill, so we strengthen it first.`,
      blockedSkill: blocked.title,
    };
  }

  // 4c. Plain forward progress.
  return {
    skillId: top.id,
    title: top.title,
    kind: "continue",
    reason: "This is the next skill you're fully ready for.",
  };
}
