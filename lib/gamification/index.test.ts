import { describe, it, expect } from "vitest";
import {
  GAMIFICATION_CONFIG,
  computeMomentum,
  humanizeMinutes,
  masteryRingFraction,
} from "./index";
import type {
  CurriculumGraph,
  MasteryUpdate,
  StudentAttempt,
  StudentSkillState,
} from "@/types";

// Minimal builders — computeMomentum only reads the fields set here; the casts
// keep the test focused without hand-authoring every unrelated schema field.
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

function graphWith(nodeCount: number): CurriculumGraph {
  return {
    nodes: Array.from({ length: nodeCount }, (_, i) => ({ id: `S${i}` })),
    domains: [],
  } as unknown as CurriculumGraph;
}

function attempt(createdAt: string, timeMs: number): StudentAttempt {
  return { createdAt, timeMs } as unknown as StudentAttempt;
}

describe("humanizeMinutes", () => {
  it("formats sub-hour, exact-hour, and mixed durations", () => {
    expect(humanizeMinutes(0)).toBe("0 min");
    expect(humanizeMinutes(-5)).toBe("0 min");
    expect(humanizeMinutes(45)).toBe("45 min");
    expect(humanizeMinutes(60)).toBe("1 hr");
    expect(humanizeMinutes(125)).toBe("2 hr 5 min");
  });
});

describe("masteryRingFraction", () => {
  it("scales a raw score toward the bar and clamps", () => {
    expect(masteryRingFraction(0)).toBe(0);
    expect(masteryRingFraction(0.45, 0.9)).toBeCloseTo(0.5, 5);
    expect(masteryRingFraction(0.9, 0.9)).toBe(1);
    expect(masteryRingFraction(1.5, 0.9)).toBe(1); // clamped
    expect(masteryRingFraction(0.5, 0)).toBe(0); // guard
  });
});

describe("computeMomentum", () => {
  const now = "2026-06-15T12:00:00.000Z";

  it("derives productive minutes / XP from per-skill timeMs", () => {
    const states = {
      A: state({ timeMs: 600_000, attempts: 5, mastery: 0.4 }), // 10 min
      B: state({ timeMs: 900_000, attempts: 6, mastery: 0.95, masteredAt: now }), // 15 min
    };
    const m = computeMomentum(states, graphWith(4), [], now);
    expect(m.productiveMinutes).toBe(25);
    expect(m.xp).toBe(25);
    expect(m.masteredCount).toBe(1);
    expect(m.totalSkills).toBe(4);
    expect(m.courseFraction).toBeCloseTo(0.25, 5);
    expect(m.avgMastery).toBeCloseTo((0.4 + 0.95) / 2, 5);
  });

  it("counts only today's attempts toward today's XP + goal fraction", () => {
    const states = { A: state({ timeMs: 1_200_000, attempts: 4 }) };
    const attempts = [
      attempt("2026-06-15T09:00:00.000Z", 300_000), // today, 5 min
      attempt("2026-06-15T10:00:00.000Z", 180_000), // today, 3 min
      attempt("2026-06-14T10:00:00.000Z", 600_000), // yesterday — excluded
    ];
    const m = computeMomentum(states, graphWith(2), attempts, now);
    expect(m.todayMinutes).toBe(8);
    expect(m.todayXp).toBe(8);
    expect(m.dailyGoalXp).toBe(GAMIFICATION_CONFIG.dailyXpGoal);
    expect(m.dailyGoalFraction).toBeCloseTo(8 / 120, 5);
  });

  it("computes time given back vs the baseline, floored at zero", () => {
    // 2 mastered × 180 baseline = 360; spent 25 min → 335 given back.
    const states = {
      A: state({ timeMs: 600_000, attempts: 4, masteredAt: now }),
      B: state({ timeMs: 900_000, attempts: 4, masteredAt: now }),
    };
    const m = computeMomentum(states, graphWith(5), [], now);
    expect(m.timeGivenBackMinutes).toBe(2 * 180 - 25);
  });

  it("never returns negative time given back when effort exceeds baseline", () => {
    const states = { A: state({ timeMs: 60_000_000, attempts: 50, masteredAt: now }) }; // 1000 min
    const m = computeMomentum(states, graphWith(3), [], now);
    expect(m.timeGivenBackMinutes).toBe(0);
  });

  it("time given back counts only PRACTICE-earned mastery, not diagnostic credit (B3)", () => {
    const states = {
      A: state({ timeMs: 600_000, attempts: 4, masteredAt: now }), // practiced
      B: state({ timeMs: 0, attempts: 0, masteredAt: now }), // diagnostic-credited only
    };
    const mk = (skillId: string, trigger: "attempt" | "diagnostic") =>
      ({
        id: `u-${skillId}`,
        studentId: "s",
        skillId,
        attemptId: null,
        trigger,
        prevMastery: 0,
        newMastery: 0.95,
        prevStatus: "developing",
        newStatus: "mastered",
        prevPhase: 1,
        newPhase: 3,
        reason: "",
        engineVersion: "t",
        sessionId: "x",
        graphVersion: "1",
        createdAt: now,
      }) as unknown as MasteryUpdate;
    const updates = [mk("A", "attempt"), mk("B", "diagnostic")];
    // Without the log: both count (back-compat) → 2 × 180 − 10 = 350.
    expect(computeMomentum(states, graphWith(5), [], now).timeGivenBackMinutes).toBe(2 * 180 - 10);
    // With the log: only A (practiced) counts → 1 × 180 − 10 = 170. B is excluded.
    expect(
      computeMomentum(states, graphWith(5), [], now, undefined, updates).timeGivenBackMinutes,
    ).toBe(1 * 180 - 10);
  });

  it("handles an empty student with no division-by-zero", () => {
    const m = computeMomentum({}, graphWith(0), [], now);
    expect(m.productiveMinutes).toBe(0);
    expect(m.courseFraction).toBe(0);
    expect(m.avgMastery).toBe(0);
    expect(m.timeGivenBackMinutes).toBe(0);
  });
});
