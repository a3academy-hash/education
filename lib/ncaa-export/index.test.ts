// lib/ncaa-export tests (Phase 7 R10/R13) — creditEligible refusal, disclaimers,
// field-map flag, evidence/transcript separation, seat-time isolation. PURE.

import { describe, expect, it } from "vitest";
import {
  FIELD_MAP_FLAG,
  NCAA_DISCLAIMERS,
  buildNcaaExport,
} from "./index";
import { computeGrade } from "../grade";
import type {
  CurriculumGraph,
  Phase,
  ProblemTemplate,
  SkillNode,
  StudentProfile,
  StudentSkillState,
} from "../../types";

function p3Problem(id: string): ProblemTemplate {
  return {
    id,
    version: 1,
    skillId: "credit-a",
    phase: 3 as Phase,
    sport: "neutral",
    prompt: "Solve 2x + 3 = 11.",
    visual: null,
    answer: { kind: "numeric", value: "4" },
    hints: [],
    difficulty: 1,
  };
}

function node(id: string, ccss: string[], withP3 = false): SkillNode {
  return {
    id,
    title: `Skill ${id}`,
    domain: "d",
    tier: 0,
    prereqs: [],
    standards: { ccss, state: null },
    objective: `Objective for ${id}`,
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
    problems: { p1: [], p2: [], p3: withP3 ? [p3Problem(id)] : [] },
  };
}

const graph: CurriculumGraph = {
  schema: {
    version: "1.11.0",
    course: "Algebra 1",
    audience: "test",
    sports: ["neutral"],
    phases: { p1: "s", p2: "b", p3: "n" },
    masteryStatuses: [],
  },
  domains: [{ id: "d", label: "D", tier: 0 }],
  misconceptionRegistry: [],
  nodes: [node("credit-a", ["A-REI.B.3"], true), node("prereq", ["8.EE.C.7"])],
  edges: [],
};

const student: StudentProfile = {
  id: "stu",
  displayName: "Ada",
  gradeLevel: 8,
  sport: "neutral",
  campusId: null,
  parentalConsent: { status: "granted", updatedAt: null },
  createdAt: "2026-06-01T00:00:00.000Z",
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

const NOW = "2026-06-10T00:00:00.000Z";

describe("buildNcaaExport", () => {
  it("emits NO credit-bearing transcript line when grade.creditEligible is false", () => {
    const grade = computeGrade({}, graph, [], { nowIso: NOW }); // no summative → not eligible
    expect(grade.creditEligible).toBe(false);
    const ex = buildNcaaExport(student, graph, {}, [], grade, NOW);
    expect(ex.parentCertified.transcriptLine).toBeNull();
  });

  it("emits a credit-bearing line only when credit-eligible", () => {
    const states: Record<string, StudentSkillState> = {
      "credit-a": state({ status: "mastered", masteredAt: NOW, attempts: 5, correct: 5, timeMs: 600_000 }),
    };
    // §14a credit eligibility requires the FULL credit-bearing scope locked-BY-
    // TRANSFER (a MasteryUpdate with trigger "attempt"), not just a summative.
    const updates = [
      {
        id: "u1",
        studentId: "stu",
        skillId: "credit-a",
        attemptId: "a1",
        trigger: "attempt" as const,
        prevMastery: 0.5,
        newMastery: 0.95,
        prevStatus: "near_mastery" as const,
        newStatus: "mastered" as const,
        prevPhase: 3 as Phase,
        newPhase: 3 as Phase,
        reason: "earned",
        engineVersion: "test",
        sessionId: "s1",
        graphVersion: "1.11.0",
        createdAt: NOW,
      },
    ];
    const grade = computeGrade(states, graph, updates, { nowIso: NOW, summative: 1 });
    expect(grade.creditEligible).toBe(true);
    const ex = buildNcaaExport(student, graph, states, [], grade, NOW);
    expect(ex.parentCertified.transcriptLine).not.toBeNull();
    expect(ex.parentCertified.transcriptLine!.credit).toContain("1.0");
  });

  it("carries all three §14 disclaimers and the field-map-not-validated flag", () => {
    const grade = computeGrade({}, graph, [], { nowIso: NOW });
    const ex = buildNcaaExport(student, graph, {}, [], grade, NOW);
    for (const d of NCAA_DISCLAIMERS) expect(ex.disclaimers).toContain(d);
    expect(ex.fieldMapNotValidated).toBe(FIELD_MAP_FLAG);
  });

  it("includes time-on-task ONLY in the activity/seat-time section", () => {
    const states: Record<string, StudentSkillState> = {
      "credit-a": state({ attempts: 3, timeMs: 180_000 }),
    };
    const grade = computeGrade(states, graph, [], { nowIso: NOW });
    const ex = buildNcaaExport(student, graph, states, [], grade, NOW);
    expect(ex.platformEvidence.coreCourseWorksheet.timeSpentMinutes).toBe(3);
    expect(ex.platformEvidence.activityLog[0].minutes).toBe(3);
  });

  it("separates platform evidence from parent-certified content; topics are credit-bearing only", () => {
    const grade = computeGrade({}, graph, [], { nowIso: NOW });
    const ex = buildNcaaExport(student, graph, {}, [], grade, NOW);
    expect(ex.platformEvidence.coreCourseWorksheet.majorTopics.map((t) => t.skillId)).toEqual([
      "credit-a",
    ]);
    expect(ex.parentCertified.administratorStatementTemplate.length).toBeGreaterThan(0);
    // a neutral P3 sample is surfaced for the domain.
    expect(ex.platformEvidence.assessmentSamples[0].prompt).toContain("Solve");
  });
});
