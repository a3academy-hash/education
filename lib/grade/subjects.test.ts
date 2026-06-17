// lib/grade/subjects tests (Phase 7 R2/R11) — domain roll-up, locked-by-transfer
// counting, accepts precomputed results, plain bands. PURE.

import { describe, expect, it } from "vitest";
import { rollUpSubjects } from "./subjects";
import type {
  CurriculumGraph,
  MasteryResult,
  Phase,
  SkillNode,
  StudentSkillState,
} from "../../types";

function node(id: string, domain: string): SkillNode {
  return {
    id,
    title: `Skill ${id}`,
    domain,
    tier: 0,
    prereqs: [],
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
    problems: { p1: [], p2: [], p3: [] },
  };
}

const graph: CurriculumGraph = {
  schema: {
    version: "1.0.0",
    course: "Algebra 1",
    audience: "test",
    sports: ["neutral"],
    phases: { p1: "sport", p2: "blended", p3: "neutral" },
    masteryStatuses: [],
  },
  domains: [
    { id: "alpha", label: "Alpha", tier: 0 },
    { id: "beta", label: "Beta", tier: 1 },
  ],
  misconceptionRegistry: [],
  nodes: [node("a1", "alpha"), node("a2", "alpha"), node("b1", "beta")],
  edges: [],
};

function state(over: Partial<StudentSkillState>): StudentSkillState {
  return {
    mastery: 0,
    status: "unknown",
    phase: 1 as Phase,
    attempts: 0,
    correct: 0,
    hints: 0,
    timeMs: 0,
    recent: [],
    transfer: false,
    lastAttemptAt: null,
    masteredAt: null,
    ...over,
  };
}

const result = (status: MasteryResult["status"]): MasteryResult => ({
  score: 0.9,
  status,
  flags: [],
});

describe("rollUpSubjects", () => {
  it("rolls touched nodes into domains and counts only locked-by-transfer mastery", () => {
    const states: Record<string, StudentSkillState> = {
      a1: state({ status: "mastered" }),
      a2: state({ status: "mastered" }),
      b1: state({ status: "developing" }),
    };
    const results: Record<string, MasteryResult> = {
      a1: result("mastered"),
      a2: result("mastered"),
      b1: result("developing"),
    };
    // a1 is locked-by-transfer; a2 mastered but provisional (NOT in lockedIds).
    const subjects = rollUpSubjects(graph, states, results, new Set(["a1"]));

    const alpha = subjects.find((s) => s.id === "alpha")!;
    expect(alpha.total).toBe(2);
    expect(alpha.masteredLocked).toBe(1);
    expect(alpha.fraction).toBeCloseTo(0.5, 10);
    expect(alpha.band).toBe("progressing");

    const beta = subjects.find((s) => s.id === "beta")!;
    expect(beta.total).toBe(1);
    expect(beta.masteredLocked).toBe(0);
    // touched but nothing locked → fraction 0 → not_started.
    expect(beta.band).toBe("not_started");
  });

  it("ignores nodes the student has no state on", () => {
    const states: Record<string, StudentSkillState> = { a1: state({ status: "mastered" }) };
    const results: Record<string, MasteryResult> = { a1: result("mastered") };
    const subjects = rollUpSubjects(graph, states, results, new Set(["a1"]));
    expect(subjects.find((s) => s.id === "alpha")!.total).toBe(1);
    expect(subjects.find((s) => s.id === "beta")!.total).toBe(0);
    expect(subjects.find((s) => s.id === "beta")!.band).toBe("not_started");
  });

  it("preserves graph.domains order", () => {
    const subjects = rollUpSubjects(graph, {}, {}, new Set());
    expect(subjects.map((s) => s.id)).toEqual(["alpha", "beta"]);
  });
});
