// lib/digest progress-digest tests (Phase 7 §B) — window inclusion (restoration
// + credited masteries, K6), credited-vs-practiced tagging (K4), honesty rule
// ("Not yet assessed", never 0%), verbatim focus reason, time humanization.

import { describe, expect, it } from "vitest";
import { buildProgressDigest } from "./progress-digest";
import type {
  CurriculumGraph,
  MasteryUpdate,
  Phase,
  SkillNode,
  StudentAttempt,
  StudentProfile,
  StudentSkillState,
} from "../../types";

function node(id: string, prereqs: string[] = [], domain = "d"): SkillNode {
  return {
    id,
    title: `Skill ${id}`,
    domain,
    tier: 0,
    prereqs,
    standards: { ccss: ["A-SSE.1"], state: null },
    objective: `Objective ${id}`,
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
  domains: [
    { id: "d", label: "Domain D", tier: 0 },
    { id: "e", label: "Domain E", tier: 1 },
  ],
  misconceptionRegistry: [],
  nodes: [node("a"), node("b", ["a"]), node("e1", [], "e")],
  edges: [{ from: "a", to: "b" }],
};

function profile(): StudentProfile {
  return {
    id: "stu-1",
    displayName: "Ada",
    gradeLevel: 7,
    sport: "baseball",
    campusId: null,
    parentalConsent: { status: "granted", updatedAt: null },
    createdAt: "2026-05-01T00:00:00.000Z",
  };
}

function masteredState(masteredAt: string): StudentSkillState {
  return {
    mastery: 0.95,
    status: "mastered",
    phase: 3,
    attempts: 0,
    correct: 0,
    hints: 0,
    timeMs: 0,
    recent: [],
    transfer: true,
    lastAttemptAt: null,
    masteredAt,
  };
}

function update(
  over: Partial<MasteryUpdate> & { id: string; createdAt: string },
): MasteryUpdate {
  return {
    studentId: "stu-1",
    skillId: "a",
    attemptId: null,
    trigger: "attempt",
    prevMastery: 0.6,
    newMastery: 0.95,
    prevStatus: "near_mastery",
    newStatus: "mastered",
    prevPhase: 3 as Phase,
    newPhase: 3 as Phase,
    reason: "Mastered.",
    engineVersion: "1.0.0",
    sessionId: "sess-1",
    ...over,
  };
}

function attempt(over: Partial<StudentAttempt> & { id: string; createdAt: string }): StudentAttempt {
  return {
    studentId: "stu-1",
    skillId: "a",
    problemId: "p-1",
    phase: 3 as Phase,
    sport: "neutral",
    response: "x",
    correct: true,
    hintsUsed: 0,
    timeMs: 60_000,
    misconceptionTags: [],
    isProbe: false,
    source: "practice",
    sessionId: "sess-1",
    ...over,
  };
}

const NOW = "2026-06-10T00:00:00.000Z"; // window = [2026-06-03, 2026-06-10]

describe("buildProgressDigest", () => {
  it("includes masteries in the window and tags credited vs practiced (K4/K6)", () => {
    const states = {
      a: masteredState("2026-06-05T09:00:00.000Z"),
      b: masteredState("2026-06-06T09:00:00.000Z"),
    };
    const updates = [
      update({
        id: "mu-a",
        skillId: "a",
        createdAt: "2026-06-05T09:00:00.000Z",
        trigger: "diagnostic",
        newStatus: "mastered",
      }),
      update({
        id: "mu-b",
        skillId: "b",
        createdAt: "2026-06-06T09:00:00.000Z",
        trigger: "attempt",
        newStatus: "mastered",
      }),
    ];
    const digest = buildProgressDigest(graph, profile(), states, updates, [], null, NOW);
    const a = digest.masteredThisWeek.find((m) => m.skillId === "a");
    const b = digest.masteredThisWeek.find((m) => m.skillId === "b");
    expect(a?.credited).toBe(true); // diagnostic, no newer practice
    expect(b?.credited).toBe(false); // earned by practice trigger
  });

  it("excludes masteries earned before the window", () => {
    const states = { a: masteredState("2026-05-20T09:00:00.000Z") };
    const updates = [
      update({ id: "mu-a", skillId: "a", createdAt: "2026-05-20T09:00:00.000Z" }),
    ];
    const digest = buildProgressDigest(graph, profile(), states, updates, [], null, NOW);
    expect(digest.masteredThisWeek).toHaveLength(0);
  });

  it("uses 'helps unlock' titles for a mastered skill's dependents", () => {
    const states = { a: masteredState("2026-06-05T09:00:00.000Z") };
    const updates = [
      update({ id: "mu-a", skillId: "a", createdAt: "2026-06-05T09:00:00.000Z" }),
    ];
    const digest = buildProgressDigest(graph, profile(), states, updates, [], null, NOW);
    expect(digest.masteredThisWeek[0].helpsUnlock).toEqual(["Skill b"]);
  });

  it("marks an untouched domain 'Not yet assessed' (honesty rule, never 0%)", () => {
    const states = { a: masteredState("2026-06-05T09:00:00.000Z") };
    const updates = [
      update({ id: "mu-a", skillId: "a", createdAt: "2026-06-05T09:00:00.000Z" }),
    ];
    const digest = buildProgressDigest(graph, profile(), states, updates, [], null, NOW);
    const e = digest.domains.find((d) => d.domainId === "e");
    expect(e?.assessed).toBe(false);
    const d = digest.domains.find((d) => d.domainId === "d");
    expect(d?.assessed).toBe(true);
  });

  it("surfaces the verbatim recommend reason as the current focus reason", () => {
    const digest = buildProgressDigest(graph, profile(), {}, [], [], null, NOW);
    expect(digest.currentFocus).not.toBeNull();
    expect(digest.currentFocus?.reason).toBe("This is the next skill you're fully ready for.");
  });

  it("humanizes time on task over the window and counts window attempts only", () => {
    const states = {};
    const attempts = [
      attempt({ id: "at-old", createdAt: "2026-06-01T09:00:00.000Z", timeMs: 99_000 }),
      attempt({ id: "at-1", createdAt: "2026-06-05T09:00:00.000Z", timeMs: 60_000 }),
      attempt({ id: "at-2", createdAt: "2026-06-06T09:00:00.000Z", timeMs: 3_600_000 }),
    ];
    const digest = buildProgressDigest(graph, profile(), states, [], attempts, null, NOW);
    expect(digest.attemptsThisWeek).toBe(2); // the 2026-06-01 attempt is out of window
    expect(digest.timeOnTask).toBe("1 hr 1 min");
  });
});
