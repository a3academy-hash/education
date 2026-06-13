// lib/insight decision-timeline tests (Phase 7 §A.1) — narrative fidelity
// (no dated non-events; verbatim engine reasons; K3 lock keying), session
// grouping, credited-not-taught cutoff (K4), reverse-chronological determinism.

import { describe, expect, it } from "vitest";
import { buildDecisionTimeline, isCreditedNotTaught } from "./decision-timeline";
import type {
  CurriculumGraph,
  MasteryUpdate,
  Phase,
  SkillNode,
  StudentAttempt,
} from "../../types";

// ---- Minimal builders --------------------------------------------------------

function node(id: string, prereqs: string[] = [], title = `Skill ${id}`): SkillNode {
  return {
    id,
    title,
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

function graphOf(nodes: SkillNode[]): CurriculumGraph {
  return {
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
    nodes,
    edges: nodes.flatMap((n) => n.prereqs.map((p) => ({ from: p, to: n.id }))),
  };
}

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
    timeMs: 10_000,
    misconceptionTags: [],
    isProbe: false,
    source: "practice",
    sessionId: "sess-1",
    graphVersion: "1.9.2",
    engineVersion: "1.0.0",
    ...over,
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
    newMastery: 0.9,
    prevStatus: "near_mastery",
    newStatus: "mastered",
    prevPhase: 3 as Phase,
    newPhase: 3 as Phase,
    reason: "Mastered: score above the bar, with transfer demonstrated on neutral problems.",
    engineVersion: "1.0.0",
    sessionId: "sess-1",
    graphVersion: "1.9.2",
    ...over,
  };
}

const graph = graphOf([node("a"), node("b", ["a"], "Skill B")]);

describe("buildDecisionTimeline", () => {
  it("groups consecutive attempts in one session into a single session entry", () => {
    const attempts = [
      attempt({ id: "at-1", createdAt: "2026-06-01T10:00:00.000Z", correct: true }),
      attempt({ id: "at-2", createdAt: "2026-06-01T10:01:00.000Z", correct: false }),
      attempt({ id: "at-3", createdAt: "2026-06-01T10:02:00.000Z", correct: true }),
    ];
    const t = buildDecisionTimeline(graph, attempts, [], {}, null, "2026-06-02T00:00:00.000Z");
    const sessions = t.filter((e) => e.kind === "session");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].session?.attemptCount).toBe(3);
    expect(sessions[0].session?.correctCount).toBe(2);
    expect(sessions[0].evidence.attemptIds).toEqual(["at-1", "at-2", "at-3"]);
  });

  it("splits a new session entry when sessionId changes", () => {
    const attempts = [
      attempt({ id: "at-1", createdAt: "2026-06-01T10:00:00.000Z", sessionId: "s1" }),
      attempt({ id: "at-2", createdAt: "2026-06-01T11:00:00.000Z", sessionId: "s2" }),
    ];
    const t = buildDecisionTimeline(graph, attempts, [], {}, null, "2026-06-02T00:00:00.000Z");
    expect(t.filter((e) => e.kind === "session")).toHaveLength(2);
  });

  it("excludes diagnostic-source attempts from session grouping", () => {
    const attempts = [
      attempt({ id: "at-1", createdAt: "2026-06-01T10:00:00.000Z", source: "diagnostic" }),
    ];
    const t = buildDecisionTimeline(graph, attempts, [], {}, null, "2026-06-02T00:00:00.000Z");
    expect(t.filter((e) => e.kind === "session")).toHaveLength(0);
  });

  it("never produces a dated 'Routed backward' non-event (K1)", () => {
    const attempts = [attempt({ id: "at-1", createdAt: "2026-06-01T10:00:00.000Z" })];
    const t = buildDecisionTimeline(graph, attempts, [], {}, null, "2026-06-02T00:00:00.000Z");
    for (const e of t) {
      expect(e.sentence.toLowerCase()).not.toContain("routed backward");
    }
  });

  it("uses the verbatim engine reason for a lock keyed on prerequisite_gap (K3)", () => {
    const lockReason = "Locked: the prerequisite skill Skill A needs strengthening first.";
    const updates = [
      update({
        id: "mu-1",
        skillId: "b",
        createdAt: "2026-06-03T09:00:00.000Z",
        trigger: "attempt",
        newStatus: "prerequisite_gap",
        reason: lockReason,
      }),
    ];
    const t = buildDecisionTimeline(graph, [], updates, {}, null, "2026-06-04T00:00:00.000Z");
    const lock = t.find((e) => e.outcomeStatus === "prerequisite_gap");
    expect(lock).toBeDefined();
    expect(lock?.sentence).toContain(lockReason);
    expect(lock?.sentence.toLowerCase()).not.toContain("below threshold");
  });

  it("carries verbatim decay reason and an evidence footer with engineVersion", () => {
    const decayReason =
      "Mastered earlier, but after 23.0 days without practice the score decayed below the review line (base 0.90 × decay factor 0.50 = 0.45) — a short review brings it back.";
    const updates = [
      update({
        id: "mu-2",
        skillId: "a",
        createdAt: "2026-06-05T09:00:00.000Z",
        trigger: "decay",
        newStatus: "needs_review",
        reason: decayReason,
      }),
    ];
    const t = buildDecisionTimeline(graph, [], updates, {}, null, "2026-06-06T00:00:00.000Z");
    const entry = t[0];
    expect(entry.sentence).toContain(decayReason);
    expect(entry.evidence.engineVersion).toBe("1.0.0");
    expect(entry.evidence.masteryUpdateIds).toEqual(["mu-2"]);
  });

  it("tags entries sharing a blocked skill with a non-causal arc label (K2)", () => {
    const updates = [
      update({
        id: "mu-3",
        skillId: "b",
        createdAt: "2026-06-03T09:00:00.000Z",
        trigger: "attempt",
        newStatus: "prerequisite_gap",
        reason: "Locked: the prerequisite skill Skill A needs strengthening first.",
      }),
    ];
    const t = buildDecisionTimeline(graph, [], updates, {}, null, "2026-06-04T00:00:00.000Z");
    const arc = t.find((e) => e.skillId === "b");
    expect(arc?.arcLabel).toBe("Skill B — prerequisite arc");
    // No causal prose injected anywhere.
    for (const e of t) expect(e.sentence.toLowerCase()).not.toContain("because");
  });

  it("returns entries reverse-chronological and deterministic on tied timestamps", () => {
    const updates = [
      update({ id: "mu-a", skillId: "a", createdAt: "2026-06-01T09:00:00.000Z" }),
      update({ id: "mu-b", skillId: "b", createdAt: "2026-06-01T09:00:00.000Z" }),
      update({ id: "mu-c", skillId: "a", createdAt: "2026-06-02T09:00:00.000Z" }),
    ];
    const t1 = buildDecisionTimeline(graph, [], updates, {}, null, "2026-06-03T00:00:00.000Z");
    const t2 = buildDecisionTimeline(
      graph,
      [],
      [...updates].reverse(),
      {},
      null,
      "2026-06-03T00:00:00.000Z",
    );
    const ids1 = t1.map((e) => e.evidence.masteryUpdateIds[0]);
    const ids2 = t2.map((e) => e.evidence.masteryUpdateIds[0]);
    expect(ids1).toEqual(ids2); // permuted input → identical output
    expect(ids1[0]).toBe("mu-c"); // newest first
  });
});

describe("isCreditedNotTaught (K4 cutoff)", () => {
  it("is true when the latest mastered update is diagnostic with no newer practice", () => {
    const updates = [
      update({
        id: "mu-1",
        skillId: "a",
        createdAt: "2026-06-01T09:00:00.000Z",
        trigger: "diagnostic",
        newStatus: "mastered",
      }),
    ];
    expect(isCreditedNotTaught("a", [], updates)).toBe(true);
  });

  it("is false when a practice attempt is newer than the latest mastered update", () => {
    const updates = [
      update({
        id: "mu-1",
        skillId: "a",
        createdAt: "2026-06-01T09:00:00.000Z",
        trigger: "credit-propagation",
        newStatus: "mastered",
      }),
    ];
    const attempts = [
      attempt({ id: "at-1", skillId: "a", createdAt: "2026-06-02T09:00:00.000Z" }),
    ];
    expect(isCreditedNotTaught("a", attempts, updates)).toBe(false);
  });

  it("is false when the latest mastered update came from practice", () => {
    const updates = [
      update({
        id: "mu-1",
        skillId: "a",
        createdAt: "2026-06-01T09:00:00.000Z",
        trigger: "attempt",
        newStatus: "mastered",
      }),
    ];
    expect(isCreditedNotTaught("a", [], updates)).toBe(false);
  });
});
