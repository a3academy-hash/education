// lib/transcript tests (Phase 5 §I) — creditTier prefix rule, weakest-link
// roll-up, two-section split, provenance wiring, header schema.version.

import { describe, expect, it } from "vitest";
import {
  buildStandardTranscript,
  creditTier,
  isCreditBearingCode,
} from "./index";
import type {
  CurriculumGraph,
  MasteryStatus,
  MasteryUpdate,
  SkillNode,
  StudentSkillState,
} from "../../types";

// ---- Minimal builders (no engine dependency; pure shape) --------------------

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

function graphOf(nodes: SkillNode[], version = "1.7.1"): CurriculumGraph {
  return {
    schema: {
      version,
      course: "Algebra 1",
      audience: "test",
      sports: [
        "baseball",
        "softball",
        "basketball",
        "soccer",
        "football",
        "volleyball",
        "neutral",
      ],
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
    nodes,
    edges: nodes.flatMap((n) => n.prereqs.map((p) => ({ from: p, to: n.id }))),
  };
}

function state(status: MasteryStatus, masteredAt: string | null = null): StudentSkillState {
  return {
    mastery: status === "mastered" ? 0.95 : 0.5,
    status,
    phase: 3,
    attempts: 4,
    correct: 3,
    hints: 0,
    timeMs: 1000,
    recent: [],
    transfer: status === "mastered",
    lastAttemptAt: "2026-06-01T00:00:00.000Z",
    masteredAt,
  };
}

function masteredUpdate(
  id: string,
  skillId: string,
  createdAt: string,
): MasteryUpdate {
  return {
    id,
    studentId: "stu-1",
    skillId,
    attemptId: `att-${id}`,
    trigger: "attempt",
    prevMastery: 0.6,
    newMastery: 0.95,
    prevStatus: "near_mastery",
    newStatus: "mastered",
    prevPhase: 3,
    newPhase: 3,
    reason: "Mastered",
    engineVersion: "1.0.0",
    sessionId: "sess-1",
    createdAt,
  };
}

const OPTS = { studentId: "stu-1", courseId: "algebra1", generatedAt: "2026-06-11T12:00:00.000Z" };

// ---- creditTier prefix rule -------------------------------------------------

describe("creditTier prefix rule", () => {
  it("treats HS conceptual-category prefixes A-/F-/N-/S-/G- as credit", () => {
    for (const code of ["A-CED.A.4", "A-REI.B.3", "F-IF.A.1", "F-LE.A.2", "N-RN.1", "S-ID.B.6", "G-GPE.B.5"]) {
      expect(isCreditBearingCode(code)).toBe(true);
    }
  });

  it("treats grade-prefixed middle-school codes as prerequisite-review", () => {
    for (const code of ["7.NS.A.1", "8.EE.C.7b", "6.EE.A.2c", "6.RP.A.2"]) {
      expect(isCreditBearingCode(code)).toBe(false);
    }
  });

  it("creditTier(node) is algebra1-credit iff any code is a credit code", () => {
    expect(creditTier(node("n", ["A-REI.B.3"]))).toBe("algebra1-credit");
    expect(creditTier(node("n", ["8.EE.C.7b"]))).toBe("prerequisite-review");
    // mixed: any credit code wins
    expect(creditTier(node("n", ["8.EE.C.7b", "A-REI.B.3"]))).toBe("algebra1-credit");
  });
});

// ---- weakest-link roll-up ---------------------------------------------------

describe("weakest-link roll-up", () => {
  it("all contributing nodes mastered → standard mastered (N of N)", () => {
    const g = graphOf([node("a", ["A-REI.B.3"]), node("b", ["A-REI.B.3"])]);
    const states = {
      a: state("mastered", "2026-06-01T00:00:00.000Z"),
      b: state("mastered", "2026-06-02T00:00:00.000Z"),
    };
    const t = buildStandardTranscript(g, states, [], OPTS);
    const row = t.creditBearing.find((r) => r.ccss === "A-REI.B.3")!;
    expect(row.status).toBe("mastered");
    expect(row.masteredCount).toBe(2);
    expect(row.totalCount).toBe(2);
  });

  it("one node unmastered → least-advanced status, never mastered, with N-of-M", () => {
    const g = graphOf([
      node("a", ["A-REI.B.3"]),
      node("b", ["A-REI.B.3"]),
      node("c", ["A-REI.B.3"]),
    ]);
    const states = {
      a: state("mastered", "2026-06-01T00:00:00.000Z"),
      b: state("developing"),
      c: state("near_mastery"),
    };
    const t = buildStandardTranscript(g, states, [], OPTS);
    const row = t.creditBearing.find((r) => r.ccss === "A-REI.B.3")!;
    // weakest link = developing (rank below near_mastery and mastered)
    expect(row.status).toBe("developing");
    expect(row.masteredCount).toBe(1);
    expect(row.totalCount).toBe(3);
  });

  it("never averages: a mastered + unknown pair reports unknown, not a midpoint", () => {
    const g = graphOf([node("a", ["A-REI.B.3"]), node("b", ["A-REI.B.3"])]);
    const states = { a: state("mastered", "2026-06-01T00:00:00.000Z") };
    const t = buildStandardTranscript(g, states, [], OPTS);
    const row = t.creditBearing.find((r) => r.ccss === "A-REI.B.3")!;
    expect(row.status).toBe("unknown");
    expect(row.masteredCount).toBe(1);
    expect(row.totalCount).toBe(2);
  });

  it("a prerequisite gap on any contributing node sinks the standard", () => {
    const g = graphOf([node("a", ["A-REI.B.3"]), node("b", ["A-REI.B.3"])]);
    const states = {
      a: state("mastered", "2026-06-01T00:00:00.000Z"),
      b: state("prerequisite_gap"),
    };
    const t = buildStandardTranscript(g, states, [], OPTS);
    const row = t.creditBearing.find((r) => r.ccss === "A-REI.B.3")!;
    expect(row.status).toBe("prerequisite_gap");
  });
});

// ---- two-section split ------------------------------------------------------

describe("two-section split", () => {
  it("routes credit codes to creditBearing and grade codes to prerequisiteReview", () => {
    const g = graphOf([node("a", ["A-REI.B.3"]), node("b", ["8.EE.C.7b"])]);
    const t = buildStandardTranscript(g, {}, [], OPTS);
    expect(t.creditBearing.map((r) => r.ccss)).toEqual(["A-REI.B.3"]);
    expect(t.prerequisiteReview.map((r) => r.ccss)).toEqual(["8.EE.C.7b"]);
  });
});

// ---- provenance wiring ------------------------------------------------------

describe("provenance", () => {
  it("collects the latest mastered MasteryUpdate id per contributing node", () => {
    const g = graphOf([node("a", ["A-REI.B.3"]), node("b", ["A-REI.B.3"])]);
    const states = {
      a: state("mastered", "2026-06-03T00:00:00.000Z"),
      b: state("mastered", "2026-06-04T00:00:00.000Z"),
    };
    const updates = [
      masteredUpdate("u1", "a", "2026-06-01T00:00:00.000Z"),
      masteredUpdate("u2", "a", "2026-06-03T00:00:00.000Z"), // restoration supersedes u1
      masteredUpdate("u3", "b", "2026-06-04T00:00:00.000Z"),
    ];
    const t = buildStandardTranscript(g, states, updates, OPTS);
    const row = t.creditBearing.find((r) => r.ccss === "A-REI.B.3")!;
    expect(row.evidenceUpdateIds).toEqual(["u2", "u3"]);
  });

  it("does not cite update ids for unmastered nodes", () => {
    const g = graphOf([node("a", ["A-REI.B.3"]), node("b", ["A-REI.B.3"])]);
    const states = { a: state("mastered", "2026-06-01T00:00:00.000Z"), b: state("developing") };
    const updates = [masteredUpdate("u1", "a", "2026-06-01T00:00:00.000Z")];
    const t = buildStandardTranscript(g, states, updates, OPTS);
    const row = t.creditBearing.find((r) => r.ccss === "A-REI.B.3")!;
    expect(row.evidenceUpdateIds).toEqual(["u1"]);
  });
});

// ---- header -----------------------------------------------------------------

describe("header", () => {
  it("records the graph schema.version and the supplied generatedAt", () => {
    const g = graphOf([node("a", ["A-REI.B.3"])], "1.7.1");
    const t = buildStandardTranscript(g, {}, [], OPTS);
    expect(t.graphSchemaVersion).toBe("1.7.1");
    expect(t.generatedAt).toBe(OPTS.generatedAt);
    expect(t.studentId).toBe("stu-1");
    expect(t.courseId).toBe("algebra1");
  });
});
