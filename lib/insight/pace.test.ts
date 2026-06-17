// lib/insight/pace tests — ahead/on_track/behind + wastingTime. PURE.

import { describe, expect, it } from "vitest";
import { computePace } from "./pace";
import type {
  CurriculumGraph,
  Phase,
  SkillNode,
  StudentAttempt,
  StudentSkillState,
} from "../../types";

function node(id: string, ccss: string[]): SkillNode {
  return {
    id,
    title: id,
    domain: "d",
    tier: 0,
    prereqs: [],
    standards: { ccss, state: null },
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
    problems: { p1: [], p2: [], p3: [] },
  };
}

// 4 credit-bearing nodes (A-...) + 1 prerequisite-review (8.EE...).
const graph: CurriculumGraph = {
  schema: {
    version: "1.0.0",
    course: "Algebra 1",
    audience: "test",
    sports: ["neutral"],
    phases: { p1: "s", p2: "b", p3: "n" },
    masteryStatuses: [],
  },
  domains: [{ id: "d", label: "D", tier: 0 }],
  misconceptionRegistry: [],
  nodes: [
    node("c1", ["A-REI.B.3"]),
    node("c2", ["A-REI.B.4"]),
    node("c3", ["A-SSE.A.1"]),
    node("c4", ["A-SSE.A.2"]),
    node("p1", ["8.EE.C.7"]),
  ],
  edges: [],
};

function state(status: StudentSkillState["status"]): StudentSkillState {
  return {
    mastery: status === "mastered" ? 0.9 : 0.3,
    status,
    phase: 1 as Phase,
    attempts: 1,
    correct: 1,
    hints: 0,
    timeMs: 0,
    recent: [],
    transfer: status === "mastered",
    lastAttemptAt: null,
    masteredAt: status === "mastered" ? "2026-06-01T00:00:00.000Z" : null,
  };
}

function attempt(timeMs: number): StudentAttempt {
  return {
    id: `a-${Math.random()}`,
    studentId: "stu",
    skillId: "c1",
    problemId: "p",
    phase: 1 as Phase,
    sport: "neutral",
    response: "x",
    correct: true,
    hintsUsed: 0,
    timeMs,
    misconceptionTags: [],
    isProbe: false,
    source: "practice",
    sessionId: "s",
    graphVersion: "1.0.0",
    engineVersion: "1.0.0",
    createdAt: "2026-06-01T00:00:00.000Z",
  };
}

const NOW = "2026-06-10T00:00:00.000Z";

describe("computePace", () => {
  it("is ahead when mastery outpaces seat-time", () => {
    // 3/4 mastered (0.75 progress), ~6 min of 100 budget (0.06 spent) → ahead.
    const states: Record<string, StudentSkillState> = {
      c1: state("mastered"),
      c2: state("mastered"),
      c3: state("mastered"),
      c4: state("developing"),
    };
    const r = computePace(states, graph, [attempt(6 * 60_000)], NOW, 100);
    expect(r.standing).toBe("ahead");
    expect(r.wastingTime).toBe(false);
  });

  it("is behind and wastingTime when lots of seat-time yields little mastery", () => {
    // 0 mastered (0 progress), 50 min of 100 budget (0.5 spent) → behind + wasting.
    const states: Record<string, StudentSkillState> = {
      c1: state("developing"),
      c2: state("developing"),
    };
    const r = computePace(states, graph, [attempt(50 * 60_000)], NOW, 100);
    expect(r.standing).toBe("behind");
    expect(r.wastingTime).toBe(true);
  });

  it("is on_track when progress roughly matches spent", () => {
    // 2/4 mastered (0.5), 50 min of 100 (0.5) → delta 0 → on_track, not wasting.
    const states: Record<string, StudentSkillState> = {
      c1: state("mastered"),
      c2: state("mastered"),
      c3: state("developing"),
      c4: state("developing"),
    };
    const r = computePace(states, graph, [attempt(50 * 60_000)], NOW, 100);
    expect(r.standing).toBe("on_track");
    expect(r.wastingTime).toBe(false);
  });
});
