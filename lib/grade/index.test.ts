// lib/grade tests (Phase 7 R1/R2/R3/R13) — provenance exclusion, credit-bearing
// denominator, summative-zero, creditEligible. PURE fixtures (no live graph).

import { describe, expect, it } from "vitest";
import {
  GRADE_DISCLAIMER,
  GRADING_SCALE_VERSION,
  computeGrade,
  letterFor,
} from "./index";
import type {
  CurriculumGraph,
  MasteryUpdate,
  Phase,
  SkillNode,
  StudentSkillState,
} from "../../types";

function node(id: string, ccss: string[]): SkillNode {
  return {
    id,
    title: `Skill ${id}`,
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

// Two credit-bearing nodes (A-... HS-category) + one prerequisite-review (8.EE...).
const graph: CurriculumGraph = {
  schema: {
    version: "1.0.0",
    course: "Algebra 1",
    audience: "test",
    sports: ["neutral"],
    phases: { p1: "sport", p2: "blended", p3: "neutral" },
    masteryStatuses: [],
  },
  domains: [{ id: "d", label: "D", tier: 0 }],
  misconceptionRegistry: [],
  nodes: [
    node("credit-a", ["A-REI.B.3"]),
    node("credit-b", ["A-SSE.A.1"]),
    node("prereq", ["8.EE.C.7"]),
  ],
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

function masteredUpdate(
  over: Partial<MasteryUpdate> & { skillId: string; trigger: MasteryUpdate["trigger"] },
): MasteryUpdate {
  return {
    id: `u-${over.skillId}-${over.trigger}`,
    studentId: "stu",
    attemptId: null,
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
    createdAt: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}

const NOW = "2026-06-10T00:00:00.000Z";

describe("computeGrade", () => {
  it("counts only attempt-earned mastery in the 70%; excludes diagnostic/credit-propagation as provisional", () => {
    const states: Record<string, StudentSkillState> = {
      "credit-a": state({ status: "mastered", masteredAt: NOW, attempts: 6, correct: 6 }),
      "credit-b": state({ status: "mastered", masteredAt: NOW }),
    };
    const updates: MasteryUpdate[] = [
      masteredUpdate({ skillId: "credit-a", trigger: "attempt" }),
      masteredUpdate({ skillId: "credit-b", trigger: "diagnostic" }),
    ];
    const grade = computeGrade(states, graph, updates, { nowIso: NOW });

    expect(grade.locked).toEqual(["credit-a"]);
    expect(grade.provisionalExcluded).toEqual(["credit-b"]);
    // Denominator = 2 credit-bearing nodes (prereq excluded). 1/2 = 0.5.
    expect(grade.components.mastery).toBeCloseTo(0.5, 10);
  });

  it("uses the LATEST mastered-making update's trigger (a later attempt confirms a diagnostic placement)", () => {
    const states: Record<string, StudentSkillState> = {
      "credit-a": state({ status: "mastered", masteredAt: NOW, attempts: 5, correct: 5 }),
    };
    const updates: MasteryUpdate[] = [
      masteredUpdate({
        skillId: "credit-a",
        trigger: "diagnostic",
        id: "u1",
        createdAt: "2026-06-01T00:00:00.000Z",
      }),
      masteredUpdate({
        skillId: "credit-a",
        trigger: "attempt",
        id: "u2",
        createdAt: "2026-06-05T00:00:00.000Z",
      }),
    ];
    const grade = computeGrade(states, graph, updates, { nowIso: NOW });
    expect(grade.locked).toEqual(["credit-a"]);
    expect(grade.provisionalExcluded).toEqual([]);
  });

  it("denominator is credit-bearing nodes only (prerequisite-review excluded)", () => {
    // Master the prerequisite-review node only — it must NOT affect the 70%.
    const states: Record<string, StudentSkillState> = {
      prereq: state({ status: "mastered", masteredAt: NOW, attempts: 4, correct: 4 }),
    };
    const updates: MasteryUpdate[] = [masteredUpdate({ skillId: "prereq", trigger: "attempt" })];
    const grade = computeGrade(states, graph, updates, { nowIso: NOW });
    expect(grade.locked).toEqual([]); // prereq node is not in the denominator
    expect(grade.components.mastery).toBe(0);
  });

  it("summative defaults to 0 with summativePresent:false and creditEligible:false", () => {
    const grade = computeGrade({}, graph, [], { nowIso: NOW });
    expect(grade.summativePresent).toBe(false);
    expect(grade.components.summative).toBe(0);
    expect(grade.creditEligible).toBe(false);
  });

  it("summative present → summativePresent:true, creditEligible:true, weighted into pct", () => {
    const states: Record<string, StudentSkillState> = {
      "credit-a": state({ status: "mastered", masteredAt: NOW, attempts: 6, correct: 6 }),
      "credit-b": state({ status: "mastered", masteredAt: NOW, attempts: 6, correct: 6 }),
    };
    const updates: MasteryUpdate[] = [
      masteredUpdate({ skillId: "credit-a", trigger: "attempt" }),
      masteredUpdate({ skillId: "credit-b", trigger: "attempt" }),
    ];
    const grade = computeGrade(states, graph, updates, { nowIso: NOW, summative: 1 });
    expect(grade.summativePresent).toBe(true);
    expect(grade.creditEligible).toBe(true);
    // mastery 1.0, summative 1.0, portfolio 1.0 → 100.
    expect(grade.pct).toBeCloseTo(100, 6);
    expect(grade.letter).toBe("A+");
  });

  it("portfolio counts real work-product (attempts>0), never diagnostic-credit-only", () => {
    const states: Record<string, StudentSkillState> = {
      // mastered by diagnostic, NO attempts → counts for neither 70% nor portfolio.
      "credit-a": state({ status: "mastered", masteredAt: NOW, attempts: 0 }),
      // has real attempts but not mastered → portfolio yes, 70% no.
      "credit-b": state({ status: "developing", attempts: 3, correct: 1 }),
    };
    const updates: MasteryUpdate[] = [
      masteredUpdate({ skillId: "credit-a", trigger: "diagnostic" }),
    ];
    const grade = computeGrade(states, graph, updates, { nowIso: NOW });
    expect(grade.components.mastery).toBe(0);
    expect(grade.provisionalExcluded).toEqual(["credit-a"]);
    // portfolio = credit-b only (1 of 2 credit-bearing) = 0.5.
    expect(grade.components.portfolio).toBeCloseTo(0.5, 10);
  });

  it("carries the verbatim disclaimer and scale version on every output", () => {
    const grade = computeGrade({}, graph, [], { nowIso: NOW });
    expect(grade.disclaimer).toBe(GRADE_DISCLAIMER);
    expect(grade.gradingScaleVersion).toBe(GRADING_SCALE_VERSION);
  });
});

describe("letterFor", () => {
  it("maps boundaries to the published scale", () => {
    expect(letterFor(100)).toBe("A+");
    expect(letterFor(90)).toBe("A-");
    expect(letterFor(72)).toBe("C-");
    expect(letterFor(59)).toBe("F");
    expect(letterFor(0)).toBe("F");
  });
});
