import { describe, it, expect } from "vitest";
import { buildDiagnosticReport } from "./diagnostic-report";
import type { CurriculumGraph, ProblemTemplate, StudentAttempt } from "@/types";

function prob(id: string, skillId: string, answer: string): ProblemTemplate {
  return {
    id,
    version: 1,
    skillId,
    phase: 3,
    sport: "neutral",
    prompt: `Solve ${id}`,
    visual: null,
    answer: { kind: "numeric", value: answer },
    misconceptionMap: { "0": "thinks-zero" },
    hints: [],
    difficulty: 1,
  } as unknown as ProblemTemplate;
}

function node(id: string, domain: string, problems: ProblemTemplate[]) {
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
    contextHooks: { baseball: "", softball: "", basketball: "", soccer: "", football: "", volleyball: "", neutral: "" },
    workedExamples: [],
    problems: { p1: [], p2: [], p3: problems },
  };
}

const graph = {
  schema: { version: "1", course: "Algebra 1", audience: "t", sports: ["neutral"], phases: { p1: "s", p2: "b", p3: "n" }, masteryStatuses: [] },
  domains: [{ id: "foundations", label: "Foundations", tier: 0 }, { id: "linear", label: "Linear", tier: 1 }],
  misconceptionRegistry: [],
  edges: [],
  nodes: [
    node("F1", "foundations", [prob("p-f1", "F1", "4")]),
    node("L1", "linear", [prob("p-l1", "L1", "7")]),
  ],
} as unknown as CurriculumGraph;

function att(over: Partial<StudentAttempt>): StudentAttempt {
  return {
    id: "a", studentId: "s", skillId: "F1", problemId: "p-f1", phase: 3, sport: "neutral",
    response: "4", correct: true, hintsUsed: 0, timeMs: 1000, misconceptionTags: [], isProbe: false,
    source: "diagnostic", sessionId: "sess", createdAt: "2026-06-17T00:00:00.000Z", ...over,
  } as unknown as StudentAttempt;
}

describe("buildDiagnosticReport", () => {
  it("returns null when there are no diagnostic attempts", () => {
    expect(buildDiagnosticReport([att({ source: "practice" })], graph)).toBeNull();
  });

  it("reconstructs prompt/answer and INDEPENDENTLY re-grades each diagnostic item", () => {
    const r = buildDiagnosticReport(
      [
        att({ id: "a1", skillId: "F1", problemId: "p-f1", response: "4", correct: true }),
        att({ id: "a2", skillId: "L1", problemId: "p-l1", response: "5", correct: false }),
      ],
      graph,
    )!;
    expect(r.totalItems).toBe(2);
    expect(r.totalCorrect).toBe(1);
    expect(r.sections.map((s) => s.label)).toEqual(["Foundations", "Linear"]);
    const f = r.sections[0].items[0];
    expect(f.prompt).toBe("Solve p-f1");
    expect(f.studentAnswer).toBe("4");
    expect(f.correctAnswer).toBe("4");
    expect(f.regradedCorrect).toBe(true);
    expect(f.gradesMatch).toBe(true);
    const l = r.sections[1].items[0];
    expect(l.studentAnswer).toBe("5");
    expect(l.correctAnswer).toBe("7");
    expect(l.regradedCorrect).toBe(false);
    expect(r.allGradesMatch).toBe(true);
    expect(r.mismatchCount).toBe(0);
  });

  it("flags a stored/re-grade MISMATCH (the grading-bug detector)", () => {
    // Stored correct=true but the answer is actually wrong → re-grade catches it.
    const r = buildDiagnosticReport([att({ id: "a3", response: "999", correct: true })], graph)!;
    expect(r.sections[0].items[0].regradedCorrect).toBe(false);
    expect(r.sections[0].items[0].gradesMatch).toBe(false);
    expect(r.allGradesMatch).toBe(false);
    expect(r.mismatchCount).toBe(1);
  });

  it("handles a problem missing from the current graph gracefully", () => {
    const r = buildDiagnosticReport([att({ id: "a4", problemId: "gone", correct: true })], graph)!;
    expect(r.sections[0].items[0].problemMissing).toBe(true);
  });
});
