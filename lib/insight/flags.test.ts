// lib/insight flags tests (Phase 7 §A.3) — deterministic rule firing, factual
// details, reused thresholds, retention-probes stub absence.

import { describe, expect, it } from "vitest";
import { computeFlags, FLAGS_CONFIG } from "./flags";
import { computeMasteryAll, MASTERY_CONFIG } from "../mastery-engine";
import type {
  CurriculumGraph,
  MasteryUpdate,
  Phase,
  SkillNode,
  StudentAttempt,
  StudentSkillState,
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
  nodes: [node("a")],
  edges: [],
};

function attempt(over: Partial<StudentAttempt> & { id: string; createdAt: string }): StudentAttempt {
  return {
    studentId: "stu-1",
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
    ...over,
  };
}

function state(over: Partial<StudentSkillState> = {}): StudentSkillState {
  return {
    mastery: 0.5,
    status: "developing",
    phase: 1,
    attempts: 4,
    correct: 2,
    hints: 0,
    timeMs: 120_000,
    recent: [
      { correct: true, timeMs: 30_000, phase: 1 },
      { correct: false, timeMs: 30_000, phase: 1 },
      { correct: true, timeMs: 30_000, phase: 1 },
    ],
    transfer: false,
    lastAttemptAt: "2026-06-01T10:00:00.000Z",
    masteredAt: null,
    ...over,
  };
}

const NOW = "2026-06-02T10:00:00.000Z";

function flagsFor(
  states: Record<string, StudentSkillState>,
  attempts: StudentAttempt[],
  updates: MasteryUpdate[] = [],
) {
  const batch = computeMasteryAll("stu-1", states, graph, NOW);
  return computeFlags(graph, attempts, updates, states, batch.results, null, NOW);
}

describe("computeFlags", () => {
  it("flags a stalled node after enough sessions with no status improvement", () => {
    const attempts: StudentAttempt[] = [];
    for (let s = 1; s <= FLAGS_CONFIG.stalledMinSessions; s++) {
      attempts.push(
        attempt({
          id: `at-s${s}`,
          createdAt: `2026-06-01T1${s}:00:00.000Z`,
          sessionId: `sess-${s}`,
          correct: false,
        }),
      );
    }
    const flags = flagsFor({ a: state({ attempts: 3 }) }, attempts);
    expect(flags.some((f) => f.kind === "stalled-node" && f.skillId === "a")).toBe(true);
  });

  it("flags high hint dependence with a factual count detail", () => {
    const attempts = [
      attempt({ id: "h1", createdAt: "2026-06-01T10:00:00.000Z", hintsUsed: 2 }),
      attempt({ id: "h2", createdAt: "2026-06-01T10:05:00.000Z", hintsUsed: 1 }),
      attempt({ id: "h3", createdAt: "2026-06-01T10:10:00.000Z", hintsUsed: 0 }),
    ];
    const flags = flagsFor({ a: state() }, attempts);
    const hint = flags.find((f) => f.kind === "high-hint-dependence");
    expect(hint).toBeDefined();
    expect(hint?.detail).toMatch(/\d+ of \d+ recent attempts used a hint/);
  });

  it("flags rushing using MASTERY_CONFIG.timing.rushingMs", () => {
    const fast = MASTERY_CONFIG.timing.rushingMs - 1;
    const attempts = [
      attempt({ id: "r1", createdAt: "2026-06-01T10:00:00.000Z", timeMs: fast }),
      attempt({ id: "r2", createdAt: "2026-06-01T10:05:00.000Z", timeMs: fast }),
      attempt({ id: "r3", createdAt: "2026-06-01T10:10:00.000Z", timeMs: fast }),
    ];
    const flags = flagsFor({ a: state() }, attempts);
    expect(flags.some((f) => f.kind === "rushing")).toBe(true);
  });

  it("flags the decayed-mastery review queue for an ever-mastered needs_review node", () => {
    const decayed = state({
      status: "needs_review",
      masteredAt: "2026-05-01T10:00:00.000Z",
      recent: [],
    });
    const flags = flagsFor({ a: decayed }, [
      attempt({ id: "d1", createdAt: "2026-06-01T10:00:00.000Z" }),
    ]);
    const q = flags.find((f) => f.kind === "decayed-review-queue");
    expect(q).toBeDefined();
    expect(q?.detail).toContain("2026-05-01");
  });

  it("flags days-since-session with a factual day count", () => {
    const flags = flagsFor({ a: state() }, [
      attempt({ id: "x1", createdAt: "2026-06-01T10:00:00.000Z" }),
    ]);
    const stale = flags.find((f) => f.kind === "days-since-session");
    expect(stale).toBeDefined();
    expect(stale?.detail).toMatch(/1 day since last session/);
  });

  it("emits no retention-probes-due flag for a non-mastered node", () => {
    const flags = flagsFor({ a: state() }, [
      attempt({ id: "x1", createdAt: "2026-06-01T10:00:00.000Z" }),
    ]);
    expect(flags.some((f) => f.kind === "retention-probes-due")).toBe(false);
  });

  it("emits a retention-probes-due flag for a mastered node past its interval", () => {
    // Mastered 30 days before NOW (2026-06-02): past the 21-day first interval.
    const mastered = state({
      status: "mastered",
      masteredAt: "2026-05-03T10:00:00.000Z",
      recent: [],
    });
    const flags = flagsFor({ a: mastered }, [
      attempt({ id: "x1", createdAt: "2026-05-03T10:00:00.000Z" }),
    ]);
    const r = flags.find((f) => f.kind === "retention-probes-due");
    expect(r).toBeDefined();
    expect(r?.skillId).toBe("a");
    expect(r?.severity).toBe("info");
    expect(r?.detail).toMatch(/Due for a retention check/);
  });

  it("emits no skill flags for a student with no attempts", () => {
    const flags = flagsFor({}, []);
    expect(flags.filter((f) => f.skillId !== undefined)).toHaveLength(0);
  });
});
