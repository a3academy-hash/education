// lib/engine-v2/fragile.test.ts — fast-but-fragile detection (Phase 8 R2).
// Asserts the mr-kahn semantics (fast+failed → fragile; fast+no-probe →
// unmeasured, NEVER fragile; slow → holding) and the R5 firewall (the module
// imports NOTHING from gate.ts/session.ts/mastery-engine, so it can never alter
// a lock decision).

import { describe, it, expect } from "vitest";
import {
  assessFragility,
  studentFragility,
  DEFAULT_FRAGILE_CONFIG,
} from "./fragile";
import { RETENTION_CONFIG } from "../retention";
import type {
  CurriculumGraph,
  SkillNode,
  StudentAttempt,
  StudentSkillState,
} from "@/types";

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
  } as unknown as SkillNode;
}

function state(partial: Partial<StudentSkillState>): StudentSkillState {
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
    masteredAt: null,
    ...partial,
  };
}

function probe(partial: Partial<StudentAttempt>): StudentAttempt {
  return {
    id: "a",
    skillId: "N",
    source: "retention",
    correct: true,
    createdAt: "2026-01-20T00:00:00.000Z",
    phase: 3,
    sport: "neutral",
    ...partial,
  } as unknown as StudentAttempt;
}

const MASTERED = "2026-01-01T00:00:00.000Z";
// Far enough past the first retention interval (21d) to be OVERDUE.
const WAY_LATER = "2026-03-15T00:00:00.000Z";
// Inside the first interval — nothing overdue yet.
const SOON = "2026-01-05T00:00:00.000Z";

describe("assessFragility", () => {
  it("fast acquisition + a FAILED delayed probe → fragile", () => {
    const a = assessFragility(
      node("N"),
      state({ attempts: 4, masteredAt: MASTERED }),
      [probe({ skillId: "N", correct: false, createdAt: "2026-01-25T00:00:00.000Z" })],
      [],
      WAY_LATER,
    );
    expect(a.status).toBe("fragile");
    expect(a.reason).toContain("4 attempts");
  });

  it("fast acquisition + an OVERDUE scheduled probe (no pass) → fragile", () => {
    const a = assessFragility(
      node("N"),
      state({ attempts: 3, masteredAt: MASTERED }),
      [],
      [],
      WAY_LATER,
    );
    expect(a.status).toBe("fragile");
    expect(a.reason).toMatch(/overdue/);
  });

  it("fast acquisition + NO probe + nothing overdue → unmeasured (NEVER fragile)", () => {
    const a = assessFragility(
      node("N"),
      state({ attempts: 3, masteredAt: MASTERED }),
      [],
      [],
      SOON,
    );
    expect(a.status).toBe("unmeasured");
  });

  it("fast acquisition + a PASSED delayed probe → holding", () => {
    const a = assessFragility(
      node("N"),
      state({ attempts: 3, masteredAt: MASTERED }),
      [probe({ skillId: "N", correct: true, createdAt: "2026-01-25T00:00:00.000Z" })],
      [],
      WAY_LATER,
    );
    expect(a.status).toBe("holding");
  });

  it("slow acquisition is never fragile, even when overdue", () => {
    const a = assessFragility(
      node("N"),
      state({ attempts: DEFAULT_FRAGILE_CONFIG.fastThreshold + 5, masteredAt: MASTERED }),
      [],
      [],
      WAY_LATER,
    );
    expect(a.status).toBe("holding");
  });

  it("not mastered → unmeasured", () => {
    const a = assessFragility(node("N"), state({ attempts: 2, masteredAt: null }), [], [], WAY_LATER);
    expect(a.status).toBe("unmeasured");
  });

  it("a probe BEFORE mastery does not count as durability evidence", () => {
    const a = assessFragility(
      node("N"),
      state({ attempts: 3, masteredAt: MASTERED }),
      [probe({ skillId: "N", correct: true, createdAt: "2025-12-01T00:00:00.000Z" })],
      [],
      WAY_LATER,
    );
    // Passed probe is pre-mastery → ignored; overdue with no pass → fragile.
    expect(a.status).toBe("fragile");
  });
});

describe("studentFragility", () => {
  const graph = { nodes: [node("A"), node("B"), node("C")], domains: [] } as unknown as CurriculumGraph;

  it("returns only mastered nodes, in graph order", () => {
    const states: Record<string, StudentSkillState> = {
      A: state({ attempts: 3, masteredAt: MASTERED }),
      B: state({ attempts: 12, masteredAt: MASTERED }),
      C: state({ attempts: 2, masteredAt: null, status: "developing" }),
    };
    const out = studentFragility(states, [], [], graph, WAY_LATER);
    expect(out.map((o) => o.skillId)).toEqual(["A", "B"]);
    expect(out[0].status).toBe("fragile"); // fast + overdue
    expect(out[1].status).toBe("holding"); // slow
  });
});

describe("R5 firewall — fragile.ts has no lock/mastery import path", () => {
  it("imports nothing from gate.ts / session.ts / mastery-engine", () => {
    // Static assertion: the module's source must not reference the firewalled
    // modules. (Import-acyclic is also enforced by the dedicated firewall test;
    // this keeps the invariant local to the unit under test.)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    const src = fs.readFileSync(new URL("./fragile.ts", import.meta.url), "utf8");
    const importLines = src
      .split("\n")
      .filter((l) => /^\s*import\b/.test(l) || /^\s*}\s*from\s+["']/.test(l));
    const imports = importLines.join("\n");
    expect(imports).not.toMatch(/["'].*\/gate["']/);
    expect(imports).not.toMatch(/["'].*\/session["']/);
    expect(imports).not.toMatch(/mastery-engine/);
  });

  it("uses the real retention scheduling interval (sanity on the overdue derivation)", () => {
    expect(RETENTION_CONFIG.intervalsDays[0]).toBeGreaterThan(0);
  });
});
