// phase8-firewall.test.ts — the Phase 8 structural firewall (R5), enforced as a
// test so a future import can't silently breach it. Asserts:
//   • fragile.ts / retained.ts / reward-mode.ts / guardrails.ts import NOTHING
//     from gate.ts / session.ts / mastery-engine (import-acyclic);
//   • selector.ts and mastery-engine have ZERO import path to the reward-mode
//     preference (rewards never contaminate measurement);
//   • the new read-side fns never alter a lock decision (canLock is unchanged
//     when fragile/retained run over the same inputs).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { canLock } from "./gate";
import { studentFragility } from "./fragile";
import { retainedMastery } from "../gamification/retained";
import type { LockEvidence } from "./types";
import type { CurriculumGraph, SkillNode, StudentSkillState } from "@/types";

function src(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), "utf8");
}

function importLines(text: string): string {
  return text
    .split("\n")
    .filter((l) => /^\s*import\b/.test(l) || /^\s*}\s*from\s+["']/.test(l))
    .join("\n");
}

describe("Phase 8 firewall — import-acyclic", () => {
  const FIREWALLED = /["'][^"']*\/(gate|session)["']|mastery-engine/;

  it("fragile.ts imports nothing from gate/session/mastery-engine", () => {
    expect(importLines(src("./fragile.ts"))).not.toMatch(FIREWALLED);
  });
  it("guardrails.ts imports nothing from gate/session/mastery-engine", () => {
    expect(importLines(src("./guardrails.ts"))).not.toMatch(FIREWALLED);
  });
  it("retained.ts imports nothing from gate/session/mastery-engine", () => {
    expect(importLines(src("../gamification/retained.ts"))).not.toMatch(FIREWALLED);
  });
  it("reward-mode.ts imports nothing at all (pure constants/resolvers)", () => {
    expect(importLines(src("../gamification/reward-mode.ts")).trim()).toBe("");
  });
});

describe("Phase 8 firewall — rewards never reach measurement", () => {
  it("selector.ts has no import path to the reward-mode preference", () => {
    expect(src("./selector.ts")).not.toMatch(/reward-mode|gamification/);
  });
});

describe("Phase 8 firewall — read-side fns never alter a lock decision", () => {
  function node(id: string): SkillNode {
    return {
      id,
      title: id,
      domain: "d",
      tier: 0,
      prereqs: [],
      standards: { ccss: [], state: null },
      objective: "",
      misconceptionTags: [],
      visual: null,
    } as unknown as SkillNode;
  }
  function state(p: Partial<StudentSkillState>): StudentSkillState {
    return {
      mastery: 0.95,
      status: "mastered",
      phase: 3,
      attempts: 3,
      correct: 3,
      hints: 0,
      timeMs: 0,
      recent: [],
      transfer: true,
      lastAttemptAt: null,
      masteredAt: "2026-01-01T00:00:00.000Z",
      ...p,
    };
  }

  it("running fragile/retained does not change canLock over the same history", () => {
    const history: LockEvidence[] = []; // empty → canLock false (firewall)
    const before = canLock(history, { lowerBound: 0.9 });

    const graph = { nodes: [node("N")], domains: [] } as unknown as CurriculumGraph;
    const states = { N: state({}) };
    // Run the read-side derivations (over a far-future now → "fragile").
    studentFragility(states, [], [], graph, "2026-06-01T00:00:00.000Z");
    retainedMastery(states, [], graph, "2026-06-01T00:00:00.000Z");

    const after = canLock(history, { lowerBound: 0.9 });
    expect(after).toBe(before);
    expect(after).toBe(false);
  });
});
