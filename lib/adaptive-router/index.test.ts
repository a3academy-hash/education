import { describe, expect, it } from "vitest";
import { recommend } from "./index";
import {
  computeMasteryAll,
  creditFromDiagnostic,
  propagateDiagnosticCredit,
} from "../mastery-engine";
import { computeOverlay } from "../graph/overlay";
import realGraphJson from "../../data/algebra1-graph.json";
import type {
  ContextHooks,
  CurriculumGraph,
  Phase,
  RecentAttempt,
  SkillNode,
  StudentSkillState,
} from "@/types";

const realGraph = realGraphJson as unknown as CurriculumGraph;

const NOW = "2026-06-10T00:00:00.000Z";
const daysAgo = (d: number): string => new Date(Date.parse(NOW) - d * 86_400_000).toISOString();

const hooks: ContextHooks = {
  baseball: "bb",
  softball: "sb",
  basketball: "bk",
  soccer: "sc",
  football: "fb",
  volleyball: "vb",
  neutral: "nt",
};

const node = (id: string, prereqs: string[] = [], domain = "d1", tier = 0): SkillNode => ({
  id,
  title: `Title ${id}`,
  domain,
  tier,
  prereqs,
  standards: { ccss: [], state: null },
  objective: "",
  misconceptionTags: [],
  visual: null,
  contextHooks: hooks,
  workedExamples: [],
  problems: { p1: [], p2: [], p3: [] },
});

const graphOf = (nodes: SkillNode[]): CurriculumGraph => ({
  schema: {
    version: "test",
    course: "Algebra 1",
    audience: "test",
    sports: ["baseball", "neutral"],
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
  domains: [
    { id: "d1", label: "Domain 1", tier: 0 },
    { id: "d2", label: "Domain 2", tier: 1 },
  ],
  misconceptionRegistry: [],
  nodes,
  edges: nodes.flatMap((n) => n.prereqs.map((p) => ({ from: p, to: n.id }))),
});

const ra = (correct: boolean, phase: Phase = 3, timeMs = 30_000): RecentAttempt => ({
  correct,
  timeMs,
  phase,
});

const state = (over: Partial<StudentSkillState> = {}): StudentSkillState => ({
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
  ...over,
});

const masteredState = (days = 0): StudentSkillState =>
  state({
    mastery: 0.9,
    status: "mastered",
    phase: 3,
    attempts: 8,
    correct: 8,
    recent: [],
    transfer: true,
    lastAttemptAt: daysAgo(days),
    masteredAt: daysAgo(days),
  });

const chain = graphOf([node("A"), node("B", ["A"]), node("C", ["B"])]);

const run = (
  graph: CurriculumGraph,
  states: Record<string, StudentSkillState>,
  opts?: { justCredited?: string[] },
) => {
  const { results } = computeMasteryAll("stu-1", states, graph, NOW);
  return { results, rec: recommend(results, states, graph, opts) };
};

describe("decision order 1 — complete", () => {
  it("all nodes mastered → complete", () => {
    const states = { A: masteredState(), B: masteredState(), C: masteredState() };
    expect(run(chain, states).rec.kind).toBe("complete");
  });
});

describe("decision order 2 — review beats everything else", () => {
  it("serves the worst needs_review node with a plain-language reason", () => {
    const states = {
      A: masteredState(18), // decayed → needs_review
      B: state({ attempts: 3, correct: 2, recent: [ra(true, 1), ra(false, 1), ra(true, 1)], lastAttemptAt: NOW }),
    };
    const { rec } = run(chain, states);
    expect(rec.kind).toBe("review");
    expect(rec.skillId).toBe("A");
    expect(rec.reason).toMatch(/slipped/i);
    expect(rec.reason).toMatch(/review/i);
  });
});

describe("decay never locks — engine, overlay, and router agree (same nowIso)", () => {
  it("ever-mastered prereq decayed to ~0.65: dependent stays unlocked; router says review, not remediate", () => {
    const states = { A: masteredState(27), B: state({ attempts: 1, correct: 1, recent: [ra(true, 1)], lastAttemptAt: NOW }) };
    const { results, rec } = run(chain, states);

    // Engine: prereq slipped to needs_review, dependent NOT gapped.
    expect(results.A.status).toBe("needs_review");
    expect(results.B.status).toBe("introduced");

    // Overlay agrees: B is not blocked.
    const overlay = computeOverlay(chain, states, results);
    const b = overlay.nodes.find((n) => n.skillId === "B");
    expect(b?.blockedBy).toBeNull();
    expect(b?.effectiveStatus).toBe("introduced");

    // Router agrees: backward path is a review of A, not a remediation lock.
    expect(rec.kind).toBe("review");
    expect(rec.skillId).toBe("A");
  });
});

describe("decision order 3/4 — frontier, remediate vs continue", () => {
  it("empty state on the root → continue (Phase 0 carry-over resolved)", () => {
    const { rec } = run(realGraph, {});
    expect(rec.skillId).toBe("ALG-F01");
    expect(rec.kind).toBe("continue");
    expect(rec.blockedSkill).toBeUndefined();
  });

  it("an evidenced gap that blocks a dependent → remediate, naming the blocked skill", () => {
    const states = {
      A: state({
        attempts: 4,
        correct: 1,
        recent: [ra(false, 1), ra(true, 1), ra(false, 1), ra(false, 1)],
        lastAttemptAt: NOW,
      }),
    };
    const { rec } = run(chain, states);
    expect(rec.kind).toBe("remediate");
    expect(rec.skillId).toBe("A");
    expect(rec.blockedSkill).toBe("Title B");
    expect(rec.reason).toContain("Title B");
  });

  it("a weak candidate with NO attempt evidence anywhere → continue, not remediate", () => {
    // A locks B on score alone, but neither A nor any dependent has attempts.
    const { rec } = run(chain, {});
    expect(rec.kind).toBe("continue");
    expect(rec.skillId).toBe("A");
  });

  it("dependent attempt evidence is enough to classify the gap as remediation", () => {
    const states = {
      B: state({ attempts: 2, correct: 0, recent: [ra(false, 1), ra(false, 1)], lastAttemptAt: NOW }),
    };
    const { rec } = run(chain, states);
    expect(rec.kind).toBe("remediate");
    expect(rec.skillId).toBe("A");
    expect(rec.blockedSkill).toBe("Title B");
  });
});

describe("decision order 4 — acceleration after diagnostic credit", () => {
  const credited = [...propagateDiagnosticCredit(realGraph, ["ALG-E03"])];

  const creditedStates = (): Record<string, StudentSkillState> => {
    const { updates } = creditFromDiagnostic("stu-1", realGraph, ["ALG-E03"], {}, NOW);
    const states: Record<string, StudentSkillState> = {};
    for (const u of updates) {
      states[u.skillId] = state({
        mastery: u.newMastery,
        status: "mastered",
        phase: 3,
        masteredAt: NOW,
      });
    }
    return states;
  };

  it("recommends accelerate, naming the skipped prerequisite skill", () => {
    const states = creditedStates();
    const { rec } = run(realGraph, states, { justCredited: credited });
    expect(rec.kind).toBe("accelerate");
    expect(rec.skillId).toBe("ALG-F02"); // first frontier node past the credited ancestry
    expect(rec.reason).toContain("Integer Operations"); // the skipped ALG-F01
    expect(rec.reason).toMatch(/not re-teaching/i);
  });

  it("no busywork: credited nodes are never recommended for teaching", () => {
    const states = creditedStates();
    const { rec } = run(realGraph, states, { justCredited: credited });
    expect(credited).not.toContain(rec.skillId);
  });

  it("without justCredited the same state simply continues — never re-teaches credited nodes either", () => {
    const states = creditedStates();
    const { rec } = run(realGraph, states);
    expect(rec.kind).toBe("continue");
    expect(credited).not.toContain(rec.skillId);
  });
});

describe("determinism", () => {
  const states = {
    A: masteredState(),
    B: state({ attempts: 3, correct: 2, recent: [ra(true, 1), ra(false, 1), ra(true, 1)], lastAttemptAt: NOW }),
  };

  it("same inputs twice → deep-equal recommendation", () => {
    expect(run(chain, states).rec).toEqual(run(chain, states).rec);
  });

  it("node-order-permuted graph → identical recommendation", () => {
    const permuted: CurriculumGraph = {
      ...chain,
      nodes: [...chain.nodes].reverse(),
      edges: [...chain.edges].reverse(),
    };
    expect(run(permuted, states).rec).toEqual(run(chain, states).rec);

    const permutedReal: CurriculumGraph = {
      ...realGraph,
      nodes: [...realGraph.nodes].reverse(),
      edges: [...realGraph.edges].reverse(),
    };
    expect(run(permutedReal, {}).rec).toEqual(run(realGraph, {}).rec);
  });
});
