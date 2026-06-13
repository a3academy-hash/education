// lib/retention tests (Phase 7 Workstream C). The scheduler is PURE +
// nowIso-threaded; the outcome-wiring + isolation tests drive the REAL graph
// through the REAL engine via InMemoryRepository to PROVE the hard constraint:
// retention adds scheduling + serving ONLY — no mastery/phase/routing math
// changes, and a no-due student's served order + recommend() output are
// untouched.

import { describe, expect, it } from "vitest";
import {
  RETENTION_CONFIG,
  retentionStatus,
  selectRetentionProbe,
} from "./index";
import { neutralP3Bank, selectProblems } from "../problem-engine";
import { runPracticeAttempt } from "../practice-session";
import { recommend } from "../adaptive-router";
import { InMemoryRepository } from "../repository/in-memory";
import realGraphJson from "../../data/algebra1-graph.json";
import type {
  AnswerSpec,
  ContextHooks,
  CurriculumGraph,
  MasteryUpdate,
  Phase,
  ProblemTemplate,
  SkillNode,
  Sport,
  StudentAttempt,
  StudentProfile,
  StudentSkillState,
} from "@/types";

// ---------------------------------------------------------------------------
// Synthetic fixtures (scheduler determinism / priority / filtering)
// ---------------------------------------------------------------------------

const HOOKS: ContextHooks = {
  baseball: "",
  softball: "",
  basketball: "",
  soccer: "",
  football: "",
  volleyball: "",
  neutral: "",
};

const p3 = (id: string, difficulty: 1 | 2 | 3 = 1): ProblemTemplate => ({
  id,
  version: 1,
  skillId: id.split("-p3")[0],
  phase: 3 as Phase,
  sport: "neutral",
  prompt: `prompt ${id}`,
  visual: null,
  answer: { kind: "numeric", value: "1" } as AnswerSpec,
  hints: [],
  difficulty,
});

function node(id: string, neutralP3: ProblemTemplate[], prereqs: string[] = []): SkillNode {
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
    contextHooks: HOOKS,
    workedExamples: [],
    problems: { p1: [], p2: [], p3: neutralP3 },
  };
}

function graphOf(nodes: SkillNode[]): CurriculumGraph {
  return {
    schema: {
      version: "test",
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
    edges: [],
  };
}

const masteredState = (over: Partial<StudentSkillState> = {}): StudentSkillState => ({
  mastery: 0.9,
  status: "mastered",
  phase: 3,
  attempts: 5,
  correct: 5,
  hints: 0,
  timeMs: 100_000,
  recent: [],
  transfer: true,
  lastAttemptAt: "2026-05-01T10:00:00.000Z",
  masteredAt: "2026-05-01T10:00:00.000Z",
  ...over,
});

const NOW = "2026-06-15T10:00:00.000Z"; // 45 days after the 2026-05-01 mastery

// ---------------------------------------------------------------------------
// T1 — scheduling determinism
// ---------------------------------------------------------------------------

describe("retention scheduling — determinism (T1)", () => {
  const g = graphOf([
    node("a", [p3("a-p3-1"), p3("a-p3-2")]),
    node("b", [p3("b-p3-1"), p3("b-p3-2")]),
  ]);
  const states: Record<string, StudentSkillState> = {
    a: masteredState(),
    b: masteredState(),
  };

  it("same (logs, nowIso) → identical due set + identical pick", () => {
    const probe1 = selectRetentionProbe(g, states, [], [], "baseball", NOW);
    const probe2 = selectRetentionProbe(g, states, [], [], "baseball", NOW);
    expect(probe1?.problem.id).toBe(probe2?.problem.id);
    expect(probe1?.problem.id).toBeDefined();

    const setA = g.nodes
      .filter((n) => retentionStatus(n, states[n.id], [], [], NOW).due)
      .map((n) => n.id);
    const setB = g.nodes
      .filter((n) => retentionStatus(n, states[n.id], [], [], NOW).due)
      .map((n) => n.id);
    expect(setA).toEqual(setB);
    expect(setA).toEqual(["a", "b"]);
  });

  it("permuted node order gives an identical pick (deterministic tie-break)", () => {
    const g2 = graphOf([
      node("b", [p3("b-p3-1"), p3("b-p3-2")]),
      node("a", [p3("a-p3-1"), p3("a-p3-2")]),
    ]);
    const probe = selectRetentionProbe(g, states, [], [], "baseball", NOW);
    const probe2 = selectRetentionProbe(g2, states, [], [], "baseball", NOW);
    expect(probe2?.problem.id).toBe(probe?.problem.id);
  });
});

// ---------------------------------------------------------------------------
// T2 — one-per-session cap
// ---------------------------------------------------------------------------

describe("retention serving — one-per-session cap (T2)", () => {
  it("selectRetentionProbe returns at most one probe", () => {
    const g = graphOf([
      node("a", [p3("a-p3-1")]),
      node("b", [p3("b-p3-1")]),
      node("c", [p3("c-p3-1")]),
    ]);
    const states: Record<string, StudentSkillState> = {
      a: masteredState(),
      b: masteredState(),
      c: masteredState(),
    };
    const probe = selectRetentionProbe(g, states, [], [], "baseball", NOW);
    // A single ServedProblem (not an array) — structurally at most one.
    expect(probe).not.toBeNull();
    expect(typeof probe?.problem.id).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// T3 — credited-first priority + 14d-not-21d first interval
// ---------------------------------------------------------------------------

describe("retention scheduling — credited-first priority (T3)", () => {
  const g = graphOf([
    node("normal", [p3("normal-p3-1")]),
    node("credited", [p3("credited-p3-1")]),
  ]);
  // Both mastered 18 days before NOW: past the 14d credited interval, BEFORE 21d.
  const now = "2026-05-19T10:00:00.000Z";
  const states: Record<string, StudentSkillState> = {
    normal: masteredState(),
    credited: masteredState(),
  };
  const update = (skillId: string): MasteryUpdate => ({
    id: `u-${skillId}`,
    studentId: "s",
    skillId,
    attemptId: null,
    trigger: "diagnostic",
    prevMastery: 0,
    newMastery: 0.85,
    prevStatus: "unknown",
    newStatus: "mastered",
    prevPhase: 1,
    newPhase: 3,
    reason: "credited",
    engineVersion: "1.0.0",
    sessionId: "",
    graphVersion: "1.9.2",
    createdAt: "2026-05-01T10:00:00.000Z",
  });

  it("credited node's first interval is 14d, not 21d", () => {
    const rs = retentionStatus(g.nodes[1], states.credited, [update("credited")], [], now);
    expect(rs.creditedFirst).toBe(true);
    expect(rs.intervalIndex).toBe(-1); // credited-first track
    // dueAt = masteredAt + 14d = 2026-05-15; due at now (2026-05-19).
    expect(rs.dueAt).toBe("2026-05-15T10:00:00.000Z");
    expect(rs.due).toBe(true);

    // The normally-mastered node is NOT yet due at 18 days (21d interval).
    const rn = retentionStatus(g.nodes[0], states.normal, [], [], now);
    expect(rn.creditedFirst).toBe(false);
    expect(rn.dueAt).toBe("2026-05-22T10:00:00.000Z");
    expect(rn.due).toBe(false);
  });

  it("credited due node is chosen over a normally-mastered due node", () => {
    // Move NOW past both intervals so BOTH are due; credited must win.
    const later = "2026-06-30T10:00:00.000Z";
    const probe = selectRetentionProbe(
      g,
      states,
      [update("credited")],
      [],
      "baseball",
      later,
    );
    expect(probe?.problem.id).toBe("credited-p3-1");
  });

  it("a credited node rejoins the normal cadence after one satisfaction (no permanent fork)", () => {
    // One CORRECT neutral-P3 attempt after masteredAt → satisfactions=1 →
    // creditedFirst false, intervalIndex 0 (21d) from the new anchor.
    const sat: StudentAttempt = {
      id: "sat-1",
      studentId: "s",
      skillId: "credited",
      problemId: "credited-p3-1",
      phase: 3,
      sport: "neutral",
      response: "1",
      correct: true,
      hintsUsed: 0,
      timeMs: 1000,
      misconceptionTags: [],
      isProbe: false,
      source: "retention",
      sessionId: "x",
      graphVersion: "1.9.2",
      engineVersion: "1.0.0",
      createdAt: "2026-05-20T10:00:00.000Z",
    };
    const rs = retentionStatus(g.nodes[1], states.credited, [update("credited")], [sat], NOW);
    expect(rs.creditedFirst).toBe(false);
    expect(rs.intervalIndex).toBe(0);
    // anchor = 2026-05-20, +21d = 2026-06-10; due at NOW (2026-06-15).
    expect(rs.dueAt).toBe("2026-06-10T10:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// T6 — never-seen filtering
// ---------------------------------------------------------------------------

describe("retention serving — never-seen filtering (T6)", () => {
  it("a node whose entire neutral bank has been seen is skipped → next due node", () => {
    const g = graphOf([
      node("seen", [p3("seen-p3-1"), p3("seen-p3-2")]),
      node("fresh", [p3("fresh-p3-1")]),
    ]);
    const states: Record<string, StudentSkillState> = {
      seen: masteredState(),
      fresh: masteredState(),
    };
    // Every neutral item on "seen" already appears in the attempt log.
    const seenAttempt = (problemId: string): StudentAttempt => ({
      id: `at-${problemId}`,
      studentId: "s",
      skillId: "seen",
      problemId,
      phase: 3,
      sport: "neutral",
      response: "1",
      correct: false, // seen but not satisfying — still consumes the item
      hintsUsed: 0,
      timeMs: 1000,
      misconceptionTags: [],
      isProbe: false,
      source: "practice",
      sessionId: "x",
      graphVersion: "1.9.2",
      engineVersion: "1.0.0",
      createdAt: "2026-04-01T10:00:00.000Z",
    });
    const attempts = [seenAttempt("seen-p3-1"), seenAttempt("seen-p3-2")];
    // "seen" sorts before "fresh" but has no unseen item → falls through.
    const probe = selectRetentionProbe(g, states, [], attempts, "baseball", NOW);
    expect(probe?.problem.id).toBe("fresh-p3-1");
  });
});

// ---------------------------------------------------------------------------
// Real-engine outcome wiring (T4) + isolation (T5)
// ---------------------------------------------------------------------------

const realGraph = realGraphJson as unknown as CurriculumGraph;
const PROBE_NODE = "ALG-F01"; // root, 6 neutral-P3 items, no prereqs
const FIRST_ITEM = "ALG-F01-p3-neutral-01"; // easiest by (difficulty, id); answer -5
const STUDENT = "stu-ret";
const SPORT: Sport = "baseball";

const profile = (): StudentProfile => ({
  id: STUDENT,
  displayName: "Sam",
  gradeLevel: 8,
  sport: SPORT,
  campusId: null,
  parentalConsent: { status: "granted", updatedAt: null },
  createdAt: "2026-01-01T00:00:00.000Z",
});

// masteredAt is old enough to be DUE (>21d before NOW); lastAttemptAt is recent
// so the decay branch is inert — this isolates the dip path the probe exercises
// (a real long-idle node would already be needs_review via decay and out of the
// pool, which is the correct interplay). The two fields are independent and
// retentionStatus anchors on masteredAt / satisfying attempts, never lastAttemptAt.
const realMasteredState = (over: Partial<StudentSkillState> = {}): StudentSkillState => ({
  mastery: 0.9,
  status: "mastered",
  phase: 3,
  attempts: 5,
  correct: 5,
  hints: 0,
  timeMs: 100_000,
  recent: [],
  transfer: true,
  lastAttemptAt: "2026-06-14T10:00:00.000Z",
  masteredAt: "2026-05-01T10:00:00.000Z",
  ...over,
});

const RT = (n: number) => `2026-06-15T10:${String(n).padStart(2, "0")}:00.000Z`;

describe("retention outcome wiring — through the REAL engine (T4)", () => {
  it("selects the first unseen neutral item on a due mastered node", () => {
    const states = { [PROBE_NODE]: realMasteredState() };
    const probe = selectRetentionProbe(realGraph, states, [], [], SPORT, NOW);
    expect(probe?.problem.id).toBe(FIRST_ITEM);
    expect(probe?.isProbe).toBe(false); // a passed probe legitimately counts
    // The probe is a member of selectProblems for the probe node's phase-3 state.
    const node = realGraph.nodes.find((n) => n.id === PROBE_NODE)!;
    const served = selectProblems(node, realMasteredState({ phase: 3 }), SPORT);
    expect(served.some((s) => s.problem.id === FIRST_ITEM)).toBe(true);
  });

  it("correct probe → stays mastered, lastAttemptAt advances, next check at next interval", async () => {
    const repo = new InMemoryRepository({
      students: [profile()],
      skillStates: { [STUDENT]: { [PROBE_NODE]: realMasteredState() } },
    });
    await runPracticeAttempt(
      repo,
      STUDENT,
      realGraph,
      SPORT,
      {
        skillId: PROBE_NODE,
        problemId: FIRST_ITEM,
        response: "-5", // correct
        timeMs: 30_000,
        hintsUsed: 0,
        phase: 3,
        isProbe: false,
        sessionId: "sess-ret",
        source: "retention",
      },
      RT(0),
    );

    const states = await repo.getSkillStates(STUDENT);
    expect(states[PROBE_NODE].status).toBe("mastered");
    expect(states[PROBE_NODE].lastAttemptAt).toBe(RT(0));

    const attempts = await repo.listAttempts(STUDENT);
    const updates = await repo.listMasteryUpdates(STUDENT);
    expect(attempts.some((a) => a.source === "retention")).toBe(true);

    // Re-derive: anchor advanced to the correct attempt; next due = +21d.
    const rs = retentionStatus(
      realGraph.nodes.find((n) => n.id === PROBE_NODE)!,
      states[PROBE_NODE],
      updates,
      attempts,
      RT(1),
    );
    expect(rs.intervalIndex).toBe(0);
    const anchorMs = Date.parse(attempts.find((a) => a.source === "retention")!.createdAt);
    const expectedDue = new Date(anchorMs + 21 * 86_400_000).toISOString();
    expect(rs.dueAt).toBe(expectedDue);
  });

  it("incorrect probe ×1 → still mastered (no new demotion path)", async () => {
    const repo = new InMemoryRepository({
      students: [profile()],
      skillStates: { [STUDENT]: { [PROBE_NODE]: realMasteredState() } },
    });
    await runPracticeAttempt(
      repo,
      STUDENT,
      realGraph,
      SPORT,
      {
        skillId: PROBE_NODE,
        problemId: FIRST_ITEM,
        response: "999", // wrong
        timeMs: 30_000,
        hintsUsed: 0,
        phase: 3,
        isProbe: false,
        sessionId: "sess-ret",
        source: "retention",
      },
      RT(0),
    );
    const states = await repo.getSkillStates(STUDENT);
    expect(states[PROBE_NODE].status).toBe("mastered"); // 1 miss never demotes
  });

  it("incorrect probe ×2 → needs_review via the EXISTING dip reason string", async () => {
    const repo = new InMemoryRepository({
      students: [profile()],
      skillStates: { [STUDENT]: { [PROBE_NODE]: realMasteredState() } },
    });
    const node = realGraph.nodes.find((n) => n.id === PROBE_NODE)!;
    // Two distinct unseen neutral items, both answered wrong.
    const items = neutralP3Bank(node).slice(0, 2).map((p) => p.id);
    for (let i = 0; i < 2; i++) {
      await runPracticeAttempt(
        repo,
        STUDENT,
        realGraph,
        SPORT,
        {
          skillId: PROBE_NODE,
          problemId: items[i],
          response: "999", // wrong
          timeMs: 30_000,
          hintsUsed: 0,
          phase: 3,
          isProbe: false,
          sessionId: "sess-ret",
          source: "retention",
        },
        RT(i),
      );
    }
    const states = await repo.getSkillStates(STUDENT);
    expect(states[PROBE_NODE].status).toBe("needs_review");

    const updates = await repo.listMasteryUpdates(STUDENT, PROBE_NODE);
    const demotion = updates.find((u) => u.newStatus === "needs_review");
    expect(demotion).toBeDefined();
    // The EXISTING reason string (not a new retention-specific one).
    expect(demotion?.reason).toBe(
      "Recent attempts slipped below the accuracy line — a short review brings it back.",
    );
  });
});

describe("retention isolation — never alters non-due students (T5)", () => {
  const REC_STUDENT = "stu-iso";
  // A student with NO mastered nodes → no node is ever due.
  const isoStates: Record<string, StudentSkillState> = {
    "ALG-F01": {
      mastery: 0.4,
      status: "developing",
      phase: 1,
      attempts: 3,
      correct: 1,
      hints: 0,
      timeMs: 90_000,
      recent: [
        { correct: false, timeMs: 30_000, phase: 1 },
        { correct: true, timeMs: 30_000, phase: 1 },
        { correct: false, timeMs: 30_000, phase: 1 },
      ],
      transfer: false,
      lastAttemptAt: "2026-06-10T10:00:00.000Z",
      masteredAt: null,
    },
  };

  it("(a) no due nodes → selectRetentionProbe returns null", () => {
    const probe = selectRetentionProbe(realGraph, isoStates, [], [], SPORT, NOW);
    expect(probe).toBeNull();
  });

  it("(b) served items[] are element-wise identical with vs without the module", () => {
    const node = realGraph.nodes.find((n) => n.id === "ALG-F01")!;
    const withoutModule = selectProblems(node, isoStates["ALG-F01"], SPORT);
    // The page prepends a probe ONLY when selectRetentionProbe is non-null; for
    // a no-due student it is null, so the served list is exactly selectProblems.
    const probe = selectRetentionProbe(realGraph, isoStates, [], [], SPORT, NOW);
    const withModule = probe === null ? withoutModule : [probe, ...withoutModule];
    expect(withModule.map((s) => s.problem.id)).toEqual(
      withoutModule.map((s) => s.problem.id),
    );
    expect(withModule.map((s) => s.isProbe)).toEqual(withoutModule.map((s) => s.isProbe));
  });

  it("(c) recommend() output is deep-equal with vs without retention in play", async () => {
    void REC_STUDENT;
    // recommend() never sees retention at all (the module never calls it); this
    // asserts the no-due path leaves the recommendation byte-identical.
    const { computeMasteryAll } = await import("../mastery-engine");
    const batch = computeMasteryAll("s", isoStates, realGraph, NOW);
    const baseline = recommend(batch.results, isoStates, realGraph);
    const probe = selectRetentionProbe(realGraph, isoStates, [], [], SPORT, NOW);
    expect(probe).toBeNull();
    const afterRetention = recommend(batch.results, isoStates, realGraph);
    expect(afterRetention).toEqual(baseline);
  });

  it("due-student delta: the ONLY difference is one prepended retention item; recommend unchanged", async () => {
    const dueStates: Record<string, StudentSkillState> = {
      ...isoStates,
      "ALG-F02": realMasteredState(),
    };
    const { computeMasteryAll } = await import("../mastery-engine");
    const batch = computeMasteryAll("s", dueStates, realGraph, NOW);
    const recBefore = recommend(batch.results, dueStates, realGraph);

    const node = realGraph.nodes.find((n) => n.id === "ALG-F01")!;
    const mainServed = selectProblems(node, dueStates["ALG-F01"], SPORT);
    const probe = selectRetentionProbe(realGraph, dueStates, [], [], SPORT, NOW);
    expect(probe).not.toBeNull();
    const withProbe = [probe!, ...mainServed];

    // Exactly one prepended retention item; the rest is the unchanged main bank.
    expect(withProbe.length).toBe(mainServed.length + 1);
    expect(withProbe.slice(1).map((s) => s.problem.id)).toEqual(
      mainServed.map((s) => s.problem.id),
    );
    expect(probe!.problem.skillId).toBe("ALG-F02"); // probe carries its OWN node

    // recommend() is unaffected by the probe selection (it never sees it).
    const recAfter = recommend(batch.results, dueStates, realGraph);
    expect(recAfter).toEqual(recBefore);
  });
});

describe("retention config (C1)", () => {
  it("uses the documented scheduling-only shape", () => {
    expect(RETENTION_CONFIG.intervalsDays).toEqual([21, 60, 120]);
    expect(RETENTION_CONFIG.creditedFirstDays).toBe(14);
    expect(RETENTION_CONFIG.maxProbesPerSession).toBe(1);
  });
});
