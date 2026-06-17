// lib/insight/proof tests (Phase 7 R8/R9) — proof band provenance + stuck nodes.

import { describe, expect, it } from "vitest";
import { buildProofModules, buildStuckNodes } from "./proof";
import type {
  CurriculumGraph,
  FlagEntry,
  MasteryResult,
  MasteryUpdate,
  Phase,
  SkillNode,
  StudentSkillState,
} from "../../types";

function node(id: string): SkillNode {
  return {
    id,
    title: `Skill ${id}`,
    domain: "d",
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
    phases: { p1: "s", p2: "b", p3: "n" },
    masteryStatuses: [],
  },
  domains: [{ id: "d", label: "D", tier: 0 }],
  misconceptionRegistry: [],
  nodes: [node("a"), node("b"), node("c")],
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

const r = (status: MasteryResult["status"]): MasteryResult => ({ score: 0.9, status, flags: [] });

describe("buildProofModules", () => {
  it("bands by provenance: confirmed (locked) / likely_solid (provisional) / still_proving", () => {
    const states: Record<string, StudentSkillState> = {
      a: state({ status: "mastered", attempts: 6 }),
      b: state({ status: "mastered", attempts: 1 }),
      c: state({ status: "developing", attempts: 3 }),
    };
    const results: Record<string, MasteryResult> = {
      a: r("mastered"),
      b: r("mastered"),
      c: r("developing"),
    };
    const updates: MasteryUpdate[] = [
      {
        id: "u1",
        studentId: "s",
        skillId: "a",
        attemptId: null,
        trigger: "attempt",
        prevMastery: 0,
        newMastery: 0.9,
        prevStatus: "developing",
        newStatus: "mastered",
        prevPhase: 1 as Phase,
        newPhase: 3 as Phase,
        reason: "",
        engineVersion: "1.0.0",
        sessionId: "",
        graphVersion: "1.0.0",
        createdAt: "2026-06-05T00:00:00.000Z",
      },
    ];
    const modules = buildProofModules(
      graph,
      states,
      results,
      updates,
      new Set(["a"]),
      ["a", "b", "c"],
    );
    expect(modules.find((m) => m.skillId === "a")!.band).toBe("confirmed");
    expect(modules.find((m) => m.skillId === "a")!.lastRecheckAt).toBe("2026-06-05T00:00:00.000Z");
    expect(modules.find((m) => m.skillId === "b")!.band).toBe("likely_solid");
    expect(modules.find((m) => m.skillId === "c")!.band).toBe("still_proving");
  });

  it("only surfaces touched nodes", () => {
    const modules = buildProofModules(graph, {}, {}, [], new Set(), ["a", "b"]);
    expect(modules).toEqual([]);
  });
});

describe("buildStuckNodes", () => {
  it("surfaces stalled flags and prerequisite_gap with a plain struggling line (R8 downgrade)", () => {
    const flags: FlagEntry[] = [
      { kind: "stalled-node", severity: "attention", skillId: "a", detail: "", evidenceAttemptIds: [] },
    ];
    const results: Record<string, MasteryResult> = {
      a: r("developing"),
      b: r("prerequisite_gap"),
    };
    const stuck = buildStuckNodes(graph, results, flags);
    expect(stuck.map((s) => s.skillId)).toEqual(["a", "b"]);
    expect(stuck[0].message).toBe("Struggling with Skill a");
  });
});
