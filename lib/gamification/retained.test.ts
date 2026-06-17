import { describe, it, expect } from "vitest";
import { retainedMastery } from "./retained";
import type { CurriculumGraph, StudentAttempt, StudentSkillState } from "@/types";

function state(partial: Partial<StudentSkillState>): StudentSkillState {
  return {
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
    ...partial,
  };
}

function graphWith(ids: string[]): CurriculumGraph {
  return { nodes: ids.map((id) => ({ id })), domains: [] } as unknown as CurriculumGraph;
}

function attempt(partial: Partial<StudentAttempt>): StudentAttempt {
  return {
    id: "a",
    skillId: "S0",
    source: "retention",
    correct: true,
    createdAt: "2026-01-10T00:00:00.000Z",
    ...partial,
  } as unknown as StudentAttempt;
}

const MASTERED = "2026-01-01T00:00:00.000Z";
const LATER = "2026-01-10T00:00:00.000Z";
const EARLIER = "2025-12-20T00:00:00.000Z";
const now = "2026-02-01T00:00:00.000Z";

describe("retainedMastery", () => {
  it("counts a node as retained when a passed retention probe lands after masteredAt", () => {
    const states = { S0: state({ masteredAt: MASTERED }) };
    const attempts = [attempt({ skillId: "S0", source: "retention", correct: true, createdAt: LATER })];
    const r = retainedMastery(states, attempts, graphWith(["S0"]), now);
    expect(r.masteredCount).toBe(1);
    expect(r.retainedCount).toBe(1);
    expect(r.retainedIds).toEqual(["S0"]);
    expect(r.pendingIds).toEqual([]);
  });

  it("treats a mastered node with no probe as PENDING (in Y, not against the student)", () => {
    const states = { S0: state({ masteredAt: MASTERED }) };
    const r = retainedMastery(states, [], graphWith(["S0"]), now);
    expect(r.masteredCount).toBe(1);
    expect(r.retainedCount).toBe(0);
    expect(r.pendingIds).toEqual(["S0"]);
    expect(r.retainedIds).toEqual([]);
  });

  it("does NOT count a node retained on a FAILED probe alone (no faked durability)", () => {
    const states = { S0: state({ masteredAt: MASTERED }) };
    const attempts = [attempt({ skillId: "S0", source: "retention", correct: false, createdAt: LATER })];
    const r = retainedMastery(states, attempts, graphWith(["S0"]), now);
    expect(r.retainedCount).toBe(0);
    expect(r.pendingIds).toEqual(["S0"]);
  });

  it("ignores a passed probe that PRECEDES masteredAt (not a delayed, post-mastery check)", () => {
    const states = { S0: state({ masteredAt: MASTERED }) };
    const attempts = [attempt({ skillId: "S0", source: "retention", correct: true, createdAt: EARLIER })];
    const r = retainedMastery(states, attempts, graphWith(["S0"]), now);
    expect(r.retainedCount).toBe(0);
    expect(r.pendingIds).toEqual(["S0"]);
  });

  it("ignores practice/diagnostic correct attempts after mastery (only source==='retention' counts)", () => {
    const states = { S0: state({ masteredAt: MASTERED }) };
    const attempts = [
      attempt({ skillId: "S0", source: "practice", correct: true, createdAt: LATER }),
      attempt({ skillId: "S0", source: "diagnostic", correct: true, createdAt: LATER }),
    ];
    const r = retainedMastery(states, attempts, graphWith(["S0"]), now);
    expect(r.retainedCount).toBe(0);
  });

  it("excludes un-mastered nodes from the denominator entirely", () => {
    const states = {
      S0: state({ masteredAt: MASTERED }),
      S1: state({ masteredAt: null, attempts: 4 }),
    };
    const attempts = [attempt({ skillId: "S0", source: "retention", correct: true, createdAt: LATER })];
    const r = retainedMastery(states, attempts, graphWith(["S0", "S1"]), now);
    expect(r.masteredCount).toBe(1);
    expect(r.retainedCount).toBe(1);
  });

  it("emits ids in graph node order", () => {
    const states = {
      A: state({ masteredAt: MASTERED }),
      B: state({ masteredAt: MASTERED }),
      C: state({ masteredAt: MASTERED }),
    };
    const attempts = [
      attempt({ skillId: "C", source: "retention", correct: true, createdAt: LATER }),
      attempt({ skillId: "A", source: "retention", correct: true, createdAt: LATER }),
    ];
    const r = retainedMastery(states, attempts, graphWith(["A", "B", "C"]), now);
    expect(r.retainedIds).toEqual(["A", "C"]);
    expect(r.pendingIds).toEqual(["B"]);
  });
});
