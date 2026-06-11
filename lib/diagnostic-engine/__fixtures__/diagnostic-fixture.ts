// lib/diagnostic-engine/__fixtures__ — a SYNTHETIC, FROZEN curriculum graph
// for precise diagnostic-engine assertions. The real graph
// (data/algebra1-graph.json) keeps growing as content is authored; every
// exact-sequence / exact-id assertion lives HERE so authoring never breaks
// the algorithmic suite. Real-graph tests assert content-count-robust
// invariants only (see index.test.ts).
//
// FIXTURE SHAPE (hand-chosen stable ids):
//
//   alpha (tier 0) — pure chain, depth 0..4, ALL nodes tier 0:
//     a1 → a2 → a3 → a4 → a5
//     • anchor = a5 (deepest probeable; tier carries no depth signal)
//     • a5's ancestry is 4 deep (= creditDepthConfirm) → confirmation probe
//
//   beta (tier 1) — cross-domain edge + multi-prereq descent, ALL tier 1:
//     b0 (root); b1 ← {b0, a2}  (a2→b1 is the CROSS-DOMAIN edge);
//     b2 ← {b1, b0}
//     • anchor = b2 (depth 2); a miss on b2 must descend to b1 (depth 1),
//       NOT b0 (depth 0) — deepest unprobed same-domain prereq
//     • a correct b2 would credit across the alpha boundary → confirm
//
//   gamma (tier 2) — shallow happy path: c1 → c2 (anchor c2, no confirm)
//
//   omega (tier 3) — EMPTY p3 banks (o1 → o2): never probeable, never
//     probed, reported unestimated / confidence "unknown"
//
// Every probeable node carries exactly one NEUTRAL p3 problem whose answer
// is the literal numeric "1", so scripted responders fully control
// correct/incorrect.

import type {
  CurriculumGraph,
  ProblemTemplate,
  SkillNode,
} from "@/types";

export const fixtureProblem = (
  skillId: string,
  sport: ProblemTemplate["sport"] = "neutral",
): ProblemTemplate => ({
  id: `${skillId}-p3-${sport}-01`,
  version: 1,
  skillId,
  phase: 3,
  sport,
  prompt: "Evaluate 1.",
  visual: null,
  answer: { kind: "numeric", value: "1" },
  hints: [],
  difficulty: 1,
});

export const fixtureNode = (
  id: string,
  domain: string,
  tier: number,
  prereqs: string[],
  opts: { probeable?: boolean } = {},
): SkillNode => ({
  id,
  title: `Skill ${id}`,
  domain,
  tier,
  prereqs,
  standards: { ccss: [], state: null },
  objective: "",
  misconceptionTags: [],
  visual: null,
  contextHooks: {
    baseball: "",
    softball: "",
    basketball: "",
    soccer: "",
    football: "",
    volleyball: "",
    neutral: "",
  },
  workedExamples: [],
  problems: {
    p1: [],
    p2: [],
    p3: (opts.probeable ?? true) ? [fixtureProblem(id)] : [],
  },
});

export function fixtureGraph(
  nodes: SkillNode[],
  domains: { id: string; label: string; tier: number }[],
): CurriculumGraph {
  return {
    schema: {
      version: "fixture",
      course: "Algebra 1",
      audience: "test",
      sports: [
        "baseball",
        "softball",
        "basketball",
        "soccer",
        "football",
        "volleyball",
        "neutral",
      ],
      phases: { p1: "sport", p2: "blended", p3: "neutral" },
      masteryStatuses: [
        "unknown",
        "introduced",
        "developing",
        "near_mastery",
        "mastered",
        "needs_review",
        "prerequisite_gap",
      ],
    },
    domains,
    misconceptionRegistry: [],
    nodes,
    edges: nodes.flatMap((n) => n.prereqs.map((p) => ({ from: p, to: n.id }))),
  };
}

/** The canonical frozen fixture described in the header comment. */
export function buildDiagnosticFixture(): CurriculumGraph {
  return fixtureGraph(
    [
      // alpha: chain depth 0..4, every node tier 0.
      fixtureNode("a1", "alpha", 0, []),
      fixtureNode("a2", "alpha", 0, ["a1"]),
      fixtureNode("a3", "alpha", 0, ["a2"]),
      fixtureNode("a4", "alpha", 0, ["a3"]),
      fixtureNode("a5", "alpha", 0, ["a4"]),
      // beta: cross-domain edge a2→b1; b2 has prereqs of DIFFERENT depths.
      fixtureNode("b0", "beta", 1, []),
      fixtureNode("b1", "beta", 1, ["b0", "a2"]),
      fixtureNode("b2", "beta", 1, ["b1", "b0"]),
      // gamma: shallow happy path.
      fixtureNode("c1", "gamma", 2, []),
      fixtureNode("c2", "gamma", 2, ["c1"]),
      // omega: EMPTY p3 banks — the probeability-gate domain.
      fixtureNode("o1", "omega", 3, [], { probeable: false }),
      fixtureNode("o2", "omega", 3, ["o1"], { probeable: false }),
    ],
    [
      { id: "alpha", label: "Alpha", tier: 0 },
      { id: "beta", label: "Beta", tier: 1 },
      { id: "gamma", label: "Gamma", tier: 2 },
      { id: "omega", label: "Omega", tier: 3 },
    ],
  );
}
