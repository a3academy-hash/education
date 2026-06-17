// lib/insight roster tests (Phase 7 §A.4) — one row per student, deterministic
// ordering, campus scoping, last-active + open-flags wiring.

import { describe, expect, it } from "vitest";
import { buildRoster, type RosterStudentInput } from "./roster";
import type {
  CurriculumGraph,
  Phase,
  SkillNode,
  StudentAttempt,
  StudentProfile,
} from "../../types";

function node(id: string, prereqs: string[] = []): SkillNode {
  return {
    id,
    title: `Skill ${id}`,
    domain: "d",
    tier: 0,
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
    problems: { p1: [], p2: [], p3: [] },
  };
}

const graph: CurriculumGraph = {
  schema: {
    version: "1.9.0",
    course: "Algebra 1",
    audience: "test",
    sports: ["baseball", "softball", "basketball", "soccer", "football", "volleyball", "neutral"],
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
  domains: [{ id: "d", label: "D", tier: 0 }],
  misconceptionRegistry: [],
  nodes: [node("a"), node("b", ["a"])],
  edges: [{ from: "a", to: "b" }],
};

function profile(over: Partial<StudentProfile> & { id: string }): StudentProfile {
  return {
    displayName: over.id,
    gradeLevel: 7,
    sport: "baseball",
    campusId: null,
    parentalConsent: { status: "granted", updatedAt: null },
    createdAt: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}

function attempt(over: Partial<StudentAttempt> & { id: string; createdAt: string }): StudentAttempt {
  return {
    studentId: "stu",
    skillId: "a",
    problemId: "p-1",
    phase: 1 as Phase,
    sport: "baseball",
    response: "x",
    correct: true,
    hintsUsed: 0,
    timeMs: 30_000,
    misconceptionTags: [],
    isProbe: false,
    source: "practice",
    sessionId: "sess-1",
    graphVersion: "1.9.2",
    engineVersion: "1.0.0",
    ...over,
  };
}

const NOW = "2026-06-10T00:00:00.000Z";

describe("buildRoster", () => {
  it("returns one deterministic row per student, sorted by displayName then id", () => {
    const inputs: RosterStudentInput[] = [
      { profile: profile({ id: "z", displayName: "Zoe" }), states: {}, attempts: [], updates: [] },
      { profile: profile({ id: "a", displayName: "Ada" }), states: {}, attempts: [], updates: [] },
    ];
    const rows = buildRoster(graph, inputs, null, "super_admin", NOW);
    expect(rows.map((r) => r.displayName)).toEqual(["Ada", "Zoe"]);
  });

  it("derives current focus from recommend and last-active from max attempt", () => {
    const inputs: RosterStudentInput[] = [
      {
        profile: profile({ id: "a", displayName: "Ada" }),
        states: {},
        attempts: [
          attempt({ id: "at-1", createdAt: "2026-06-02T10:00:00.000Z" }),
          attempt({ id: "at-2", createdAt: "2026-06-05T10:00:00.000Z" }),
        ],
        updates: [],
      },
    ];
    const rows = buildRoster(graph, inputs, null, "super_admin", NOW);
    expect(rows[0].currentSkillTitle).toBe("Skill a");
    expect(rows[0].lastActiveAt).toBe("2026-06-05T10:00:00.000Z");
  });

  it("reports null last-active and zero flags for an untouched student", () => {
    const inputs: RosterStudentInput[] = [
      { profile: profile({ id: "a", displayName: "Ada" }), states: {}, attempts: [], updates: [] },
    ];
    const rows = buildRoster(graph, inputs, null, "super_admin", NOW);
    expect(rows[0].lastActiveAt).toBeNull();
    expect(rows[0].openFlags).toBe(0);
    expect(rows[0].band).toBe("on_track");
    expect(rows[0].pace).toBe("on_track");
  });

  it("scopes to a campus when a campusId is given", () => {
    const inputs: RosterStudentInput[] = [
      {
        profile: profile({ id: "a", displayName: "Ada", campusId: "c1" }),
        states: {},
        attempts: [],
        updates: [],
      },
      {
        profile: profile({ id: "b", displayName: "Bo", campusId: "c2" }),
        states: {},
        attempts: [],
        updates: [],
      },
    ];
    const rows = buildRoster(graph, inputs, "c1", "super_admin", NOW);
    expect(rows.map((r) => r.studentId)).toEqual(["a"]);
  });

  it("redacts exact status and raw current-focus title for the coach role (R4)", () => {
    const inputs: RosterStudentInput[] = [
      {
        profile: profile({ id: "a", displayName: "Ada" }),
        states: {},
        attempts: [attempt({ id: "at-1", createdAt: "2026-06-05T10:00:00.000Z" })],
        updates: [],
      },
    ];
    const coach = buildRoster(graph, inputs, null, "coach", NOW);
    expect(coach[0].currentStatus).toBeNull();
    expect(coach[0].currentSkillTitle).toBe("");
    // band/flags signals remain available to the coach.
    expect(coach[0].band).toBeDefined();

    const admin = buildRoster(graph, inputs, null, "campus_admin", NOW);
    expect(admin[0].currentStatus).not.toBeNull();
    expect(admin[0].currentSkillTitle).toBe("Skill a");
  });
});
