import { describe, expect, it } from "vitest";
import {
  computeMastery,
  computeMasteryAll,
  creditFromDiagnostic,
  ENGINE_VERSION,
  lockingGap,
  MASTERY_CONFIG,
  propagateDiagnosticCredit,
} from "./index";
import realGraphJson from "../../data/algebra1-graph.json";
import type {
  ContextHooks,
  CurriculumGraph,
  Phase,
  RecentAttempt,
  SkillNode,
  StudentSkillState,
} from "@/types";

const realGraph = realGraphJson as unknown as CurriculumGraph;

const NOW = "2026-06-10T00:00:00.000Z";
const daysAgo = (d: number): string => new Date(Date.parse(NOW) - d * 86_400_000).toISOString();
const minutesAgo = (m: number): string => new Date(Date.parse(NOW) - m * 60_000).toISOString();

const hooks: ContextHooks = {
  baseball: "bb",
  softball: "sb",
  basketball: "bk",
  soccer: "sc",
  football: "fb",
  volleyball: "vb",
  neutral: "nt",
};

const node = (id: string, prereqs: string[] = [], domain = "d1", tier = 0): SkillNode => ({
  id,
  title: `Title ${id}`,
  domain,
  tier,
  prereqs,
  standards: { ccss: [], state: null },
  objective: "",
  misconceptionTags: [],
  visual: null,
  contextHooks: hooks,
  workedExamples: [],
  problems: { p1: [], p2: [], p3: [] },
});

const graphOf = (nodes: SkillNode[]): CurriculumGraph => ({
  schema: {
    version: "test",
    course: "Algebra 1",
    audience: "test",
    sports: ["baseball", "neutral"],
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
    { id: "d1", label: "Domain 1", tier: 0 },
    { id: "d2", label: "Domain 2", tier: 1 },
  ],
  misconceptionRegistry: [],
  nodes,
  edges: nodes.flatMap((n) => n.prereqs.map((p) => ({ from: p, to: n.id }))),
});

const ra = (correct: boolean, phase: Phase = 3, timeMs = 30_000): RecentAttempt => ({
  correct,
  timeMs,
  phase,
});

const state = (over: Partial<StudentSkillState> = {}): StudentSkillState => ({
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
  ...over,
});

/** Cleanly mastered, then idle for `days` (recent[] reset per convention). */
const masteredState = (days: number): StudentSkillState =>
  state({
    mastery: 0.9,
    status: "mastered",
    phase: 3,
    attempts: 8,
    correct: 8,
    hints: 0,
    recent: [],
    transfer: true,
    lastAttemptAt: daysAgo(days),
    masteredAt: daysAgo(days),
  });

const chain = graphOf([node("A"), node("B", ["A"]), node("C", ["B"])]);

describe("status transition matrix (never-mastered ladder)", () => {
  it("no attempts → unknown with score 0", () => {
    const r = computeMastery({}, "A", chain, NOW);
    expect(r).toEqual({ score: 0, status: "unknown", flags: [] });
  });

  it("attempts below the band floor → introduced, even with a perfect score", () => {
    const states = {
      A: state({
        attempts: 2,
        correct: 2,
        recent: [ra(true, 1), ra(true, 1)],
        transfer: true,
        lastAttemptAt: NOW,
      }),
    };
    const r = computeMastery(states, "A", chain, NOW);
    expect(r.score).toBe(1);
    expect(r.status).toBe("introduced");
  });

  it("score below nearMastery → developing", () => {
    const states = {
      A: state({
        attempts: 4,
        correct: 2,
        recent: [ra(true, 1), ra(false, 1), ra(true, 1), ra(false, 1)],
        lastAttemptAt: NOW,
      }),
    };
    const r = computeMastery(states, "A", chain, NOW);
    expect(r.score).toBeLessThan(MASTERY_CONFIG.thresholds.nearMastery);
    expect(r.status).toBe("developing");
  });

  it("score at/above nearMastery but below the mastery bar → near_mastery", () => {
    const states = {
      A: state({
        attempts: 5,
        correct: 4,
        recent: [ra(true, 1), ra(true, 1), ra(false, 1), ra(true, 1), ra(true, 1)],
        lastAttemptAt: NOW,
      }),
    };
    const r = computeMastery(states, "A", chain, NOW);
    expect(r.score).toBeGreaterThanOrEqual(0.7);
    expect(r.score).toBeLessThan(MASTERY_CONFIG.thresholds.mastered);
    expect(r.status).toBe("near_mastery");
  });

  it("fresh mastery requires score, transfer, AND the attempts floor", () => {
    const strong = state({
      attempts: 6,
      correct: 6,
      recent: [ra(true, 3), ra(true, 3), ra(true, 3), ra(true, 3), ra(true, 3)],
      transfer: true,
      lastAttemptAt: NOW,
    });
    expect(computeMastery({ A: strong }, "A", chain, NOW).status).toBe("mastered");
  });

  it("proposes an 'attempt' update stamped with ENGINE_VERSION on fresh mastery", () => {
    const states = {
      A: state({
        status: "near_mastery",
        mastery: 0.8,
        attempts: 6,
        correct: 6,
        recent: [ra(true, 3), ra(true, 3), ra(true, 3), ra(true, 3), ra(true, 3)],
        transfer: true,
        lastAttemptAt: NOW,
      }),
    };
    const { proposedUpdates } = computeMasteryAll("stu-1", states, chain, NOW);
    expect(proposedUpdates).toHaveLength(1);
    expect(proposedUpdates[0]).toMatchObject({
      studentId: "stu-1",
      skillId: "A",
      trigger: "attempt",
      prevStatus: "near_mastery",
      newStatus: "mastered",
      engineVersion: ENGINE_VERSION,
    });
  });

  it("proposes updates only for nodes that have a persisted state row", () => {
    const { proposedUpdates } = computeMasteryAll("stu-1", {}, chain, NOW);
    expect(proposedUpdates).toEqual([]);
  });
});

describe("TRANSFER GATE — P3 neutral transfer is required, no exceptions", () => {
  it("100% sport-context P1/P2 success with transfer false is NEVER mastered", () => {
    const states = {
      A: state({
        attempts: 10,
        correct: 10,
        recent: [ra(true, 1), ra(true, 1), ra(true, 2), ra(true, 2), ra(true, 2)],
        transfer: false,
        lastAttemptAt: NOW,
      }),
    };
    const r = computeMastery(states, "A", chain, NOW);
    expect(r.score).toBeGreaterThanOrEqual(MASTERY_CONFIG.thresholds.mastered);
    expect(r.status).toBe("near_mastery");
  });
});

describe("prerequisite gap override", () => {
  it("a non-mastered node with a weak prereq → prerequisite_gap, overriding its own band", () => {
    const states = {
      A: state({
        attempts: 4,
        correct: 1,
        recent: [ra(false, 1), ra(true, 1), ra(false, 1), ra(false, 1)],
        lastAttemptAt: NOW,
      }),
      B: state({ attempts: 2, correct: 0, recent: [ra(false, 1), ra(false, 1)], lastAttemptAt: NOW }),
    };
    const { results } = computeMasteryAll("stu-1", states, chain, NOW);
    expect(results.A.score).toBeLessThan(MASTERY_CONFIG.thresholds.prereqGate);
    expect(results.B.status).toBe("prerequisite_gap");
    expect(results.C.status).toBe("prerequisite_gap"); // B's weak score locks C too
  });

  it("the gap reason names the blocking prerequisite in plain English", () => {
    const states = {
      A: state({
        attempts: 4,
        correct: 1,
        recent: [ra(false, 1), ra(true, 1), ra(false, 1), ra(false, 1)],
        lastAttemptAt: NOW,
      }),
      B: state({ attempts: 2, correct: 2, recent: [ra(true, 1), ra(true, 1)], lastAttemptAt: NOW }),
    };
    const { proposedUpdates } = computeMasteryAll("stu-1", states, chain, NOW);
    const gapUpdate = proposedUpdates.find((u) => u.skillId === "B");
    expect(gapUpdate?.newStatus).toBe("prerequisite_gap");
    expect(gapUpdate?.reason).toContain("Title A");
  });
});

describe("STICKY MASTERY and decay (ever-mastered path)", () => {
  it("a decayed score of ~0.78 stays mastered (sticky between reviewTrigger and mastered)", () => {
    const r = computeMastery({ A: masteredState(14) }, "A", chain, NOW);
    expect(r.score).toBeCloseTo(0.778, 2);
    expect(r.status).toBe("mastered");
  });

  it("a decayed score of ~0.73 trips the review trigger → needs_review", () => {
    const r = computeMastery({ A: masteredState(18) }, "A", chain, NOW);
    expect(r.score).toBeCloseTo(0.731, 2);
    expect(r.score).toBeLessThan(MASTERY_CONFIG.thresholds.reviewTrigger);
    expect(r.status).toBe("needs_review");
  });

  it("pure decay proposes a 'decay' update (no recent attempt evidence)", () => {
    const { proposedUpdates } = computeMasteryAll("stu-1", { A: masteredState(18) }, chain, NOW);
    expect(proposedUpdates).toHaveLength(1);
    expect(proposedUpdates[0]).toMatchObject({
      skillId: "A",
      trigger: "decay",
      prevStatus: "mastered",
      newStatus: "needs_review",
    });
    expect(proposedUpdates[0].reason).toMatch(/decayed/i);
  });

  it("PURE DECAY NEVER LOCKS: an ever-mastered prereq decayed to ~0.65 does not gate dependents", () => {
    const states = { A: masteredState(27), B: state({ attempts: 1, correct: 1, recent: [ra(true, 1)], lastAttemptAt: NOW }) };
    const { results } = computeMasteryAll("stu-1", states, chain, NOW);
    expect(results.A.score).toBeLessThan(MASTERY_CONFIG.thresholds.prereqGate);
    expect(results.A.status).toBe("needs_review");
    expect(lockingGap(results.A, states.A)).toBe(false);
    expect(results.B.status).toBe("introduced"); // NOT prerequisite_gap
  });
});

describe("decay-branch review trigger requires ≥ 1 elapsed day (mr-kahn rule)", () => {
  /** Mastered the hard way with a rough lifetime record (6/10, 2 hints) —
   * undecayed base score 0.69, below reviewTrigger. recent[] reset per the
   * post-mastery convention. */
  const struggler = (lastAttemptAt: string): StudentSkillState =>
    state({
      mastery: 0.86,
      status: "mastered",
      phase: 3,
      attempts: 10,
      correct: 6,
      hints: 2,
      recent: [],
      transfer: true,
      lastAttemptAt,
      masteredAt: lastAttemptAt,
    });

  it("a just-mastered struggler (base 0.69, last attempt 5 minutes ago) STAYS mastered — the decay branch is inert under one day", () => {
    const batch = computeMasteryAll("stu-1", { A: struggler(minutesAgo(5)) }, chain, NOW);
    expect(batch.results.A.score).toBeLessThan(MASTERY_CONFIG.thresholds.reviewTrigger);
    expect(batch.results.A.status).toBe("mastered");
    expect(batch.proposedUpdates).toEqual([]);
  });

  it("the same node 18+ days idle demotes, the reason carrying undecayed base, decay factor, and elapsed days", () => {
    const batch = computeMasteryAll("stu-1", { A: struggler(daysAgo(18)) }, chain, NOW);
    expect(batch.results.A.status).toBe("needs_review");
    expect(batch.proposedUpdates).toHaveLength(1);
    const u = batch.proposedUpdates[0];
    expect(u).toMatchObject({ skillId: "A", trigger: "decay", newStatus: "needs_review" });
    expect(u.reason).toContain("base 0.69");
    expect(u.reason).toContain("decay factor 0.73");
    expect(u.reason).toContain("18.0 days");
  });

  it("BY DESIGN: pre-existing pure-decay demotions (≥ 1 day idle) still fire — the gate only silences sub-day decay", () => {
    expect(computeMastery({ A: masteredState(18) }, "A", chain, NOW).status).toBe("needs_review");
  });

  it("the attempt-evidence dip branch is unchanged and fires at ANY elapsed time", () => {
    const a = state({
      ...masteredState(0),
      recent: [ra(false, 3), ra(false, 3)],
      attempts: 10,
      correct: 8,
      lastAttemptAt: minutesAgo(5),
    });
    expect(computeMastery({ A: a }, "A", chain, NOW).status).toBe("needs_review");
  });
});

describe("lock floors on the exactly-2-attempt window", () => {
  it("ever-mastered prereq going 0/2 locks dependents", () => {
    const a = state({
      ...masteredState(0),
      recent: [ra(false, 3), ra(false, 3)],
      attempts: 10,
      correct: 8,
      lastAttemptAt: NOW,
    });
    const states = { A: a, B: state({ attempts: 1, correct: 0, recent: [ra(false, 1)], lastAttemptAt: NOW }) };
    const { results } = computeMasteryAll("stu-1", states, chain, NOW);
    expect(results.A.status).toBe("needs_review");
    expect(lockingGap(results.A, a)).toBe(true);
    expect(results.B.status).toBe("prerequisite_gap");
  });

  it("ever-mastered prereq going 1/2 → needs_review but does NOT lock", () => {
    const a = state({
      ...masteredState(0),
      recent: [ra(true, 3), ra(false, 3)],
      attempts: 10,
      correct: 8,
      lastAttemptAt: NOW,
    });
    const states = { A: a, B: state({ attempts: 1, correct: 0, recent: [ra(false, 1)], lastAttemptAt: NOW }) };
    const { results } = computeMasteryAll("stu-1", states, chain, NOW);
    expect(results.A.status).toBe("needs_review");
    expect(lockingGap(results.A, a)).toBe(false);
    expect(results.B.status).toBe("introduced");
  });
});

describe("restoration from needs_review", () => {
  const reviewBase = (recent: RecentAttempt[]): StudentSkillState =>
    state({
      mastery: 0.7,
      status: "needs_review",
      phase: 3,
      attempts: 9 + recent.length,
      correct: 9 + recent.filter((r) => r.correct).length,
      recent,
      transfer: true,
      lastAttemptAt: NOW,
      masteredAt: daysAgo(40),
    });

  it("a 1/1 window must NOT restore (floor of 2)", () => {
    const states = { A: reviewBase([ra(true, 3)]) };
    const batch = computeMasteryAll("stu-1", states, chain, NOW);
    expect(batch.results.A.status).toBe("needs_review");
    expect(batch.proposedUpdates).toEqual([]);
  });

  it("2/2 with one correct neutral P3 restores → proposed 'attempt' update, reason 'Review passed…'", () => {
    const states = { A: reviewBase([ra(true, 2), ra(true, 3)]) };
    const batch = computeMasteryAll("stu-1", states, chain, NOW);
    expect(batch.results.A.status).toBe("mastered");
    expect(batch.proposedUpdates).toHaveLength(1);
    expect(batch.proposedUpdates[0]).toMatchObject({
      skillId: "A",
      trigger: "attempt",
      prevStatus: "needs_review",
      newStatus: "mastered",
    });
    expect(batch.proposedUpdates[0].reason).toMatch(/review passed/i);
  });

  it("2/2 without any correct neutral P3 evidence does NOT restore", () => {
    const states = { A: reviewBase([ra(true, 1), ra(true, 2)]) };
    expect(computeMasteryAll("stu-1", states, chain, NOW).results.A.status).toBe("needs_review");
  });
});

describe("timing flags (never affect score or status)", () => {
  const fast = state({
    attempts: 4,
    correct: 3,
    recent: [ra(true, 1, 2000), ra(true, 1, 3000), ra(false, 1, 2500), ra(true, 1, 1000)],
    lastAttemptAt: NOW,
  });
  const slow = state({
    ...fast,
    recent: fast.recent.map((r) => ({ ...r, timeMs: 300_000 })),
  });
  const steady = state({
    ...fast,
    recent: fast.recent.map((r) => ({ ...r, timeMs: 60_000 })),
  });

  it("median under rushingMs flags rushing; over stallingMs flags stalling; otherwise none", () => {
    expect(computeMastery({ A: fast }, "A", chain, NOW).flags).toEqual(["rushing"]);
    expect(computeMastery({ A: slow }, "A", chain, NOW).flags).toEqual(["stalling"]);
    expect(computeMastery({ A: steady }, "A", chain, NOW).flags).toEqual([]);
  });

  it("identical evidence at different speeds yields identical score and status", () => {
    const a = computeMastery({ A: fast }, "A", chain, NOW);
    const b = computeMastery({ A: slow }, "A", chain, NOW);
    expect(a.score).toBe(b.score);
    expect(a.status).toBe(b.status);
  });
});

describe("acceleration — creditFromDiagnostic over the real graph", () => {
  const credited = propagateDiagnosticCredit(realGraph, ["ALG-E03"]);

  it("credits ALG-E03 (diagnostic) and its full ancestry (credit-propagation), reasons naming the evidence", () => {
    const { updates, skipped } = creditFromDiagnostic("stu-1", realGraph, ["ALG-E03"], {}, NOW);
    expect(skipped).toEqual([]); // no prior state — nothing to skip
    expect(new Set(updates.map((u) => u.skillId))).toEqual(credited);

    const diagnostic = updates.filter((u) => u.trigger === "diagnostic");
    expect(diagnostic.map((u) => u.skillId)).toEqual(["ALG-E03"]);
    expect(diagnostic[0].reason).toContain("ALG-E03");
    expect(diagnostic[0].reason).toContain("2026-06-10");

    const propagated = updates.filter((u) => u.trigger === "credit-propagation");
    expect(propagated).toHaveLength(8);
    for (const u of propagated) {
      expect(u.reason).toContain("ALG-E03"); // names the evidencing node
      expect(u.reason).toMatch(/neutral phase-3 evidence/i);
      expect(u.newStatus).toBe("mastered");
      expect(u.engineVersion).toBe(ENGINE_VERSION);
    }
  });

  it("applied credit enters the sticky path with NO attempts floor and proposes nothing further", () => {
    const { updates } = creditFromDiagnostic("stu-1", realGraph, ["ALG-E03"], {}, NOW);
    const states: Record<string, StudentSkillState> = {};
    for (const u of updates) {
      states[u.skillId] = state({
        mastery: u.newMastery,
        status: "mastered",
        phase: 3,
        masteredAt: NOW,
      });
    }
    const batch = computeMasteryAll("stu-1", states, realGraph, NOW);
    for (const id of credited) expect(batch.results[id].status).toBe("mastered");
    expect(batch.proposedUpdates).toEqual([]);
  });
});

describe("creditFromDiagnostic skip rules (mr-kahn) — chain A ← B ← C, C demonstrated", () => {
  const developingB = (): StudentSkillState =>
    state({
      mastery: 0.3,
      status: "developing",
      phase: 1,
      attempts: 4,
      correct: 1,
      recent: [ra(false, 1), ra(true, 1), ra(false, 1), ra(false, 1)],
      lastAttemptAt: NOW,
    });

  it("a mid-course struggling ancestor (developing, attempts > 0) is skipped and logged; deeper ancestors are still credited", () => {
    const { updates, skipped } = creditFromDiagnostic("stu-1", chain, ["C"], { B: developingB() }, NOW);
    expect(updates.map((u) => u.skillId)).toEqual(["C", "A"]); // propagation continues through the skip
    expect(skipped).toEqual([
      { skillId: "B", reason: "direct contrary attempt evidence on the node" },
    ]);
  });

  it("a needs_review ancestor is skipped (contrary evidence)", () => {
    const b = state({
      status: "needs_review",
      mastery: 0.6,
      attempts: 9,
      correct: 7,
      recent: [ra(false, 3)],
      lastAttemptAt: NOW,
      masteredAt: daysAgo(30),
    });
    const { updates, skipped } = creditFromDiagnostic("stu-1", chain, ["C"], { B: b }, NOW);
    expect(updates.map((u) => u.skillId)).toEqual(["C", "A"]);
    expect(skipped).toEqual([
      { skillId: "B", reason: "direct contrary attempt evidence on the node" },
    ]);
  });

  it("a recent-dip ancestor (0/2 in the window) is skipped even when its persisted status looks healthy", () => {
    const b = state({
      status: "near_mastery",
      mastery: 0.75,
      attempts: 6,
      correct: 4,
      recent: [ra(false, 1), ra(false, 2)],
      lastAttemptAt: NOW,
    });
    const { skipped } = creditFromDiagnostic("stu-1", chain, ["C"], { B: b }, NOW);
    expect(skipped).toEqual([
      { skillId: "B", reason: "direct contrary attempt evidence on the node" },
    ]);
  });

  it("the skip test uses actual recent[] entries only — a weak LIFETIME record with an empty window does not skip", () => {
    const b = state({
      status: "introduced",
      mastery: 0.2,
      attempts: 6,
      correct: 1, // lifetime 17%, but recent[] is empty → no contrary clause fires
      recent: [],
      lastAttemptAt: NOW,
    });
    const { updates, skipped } = creditFromDiagnostic("stu-1", chain, ["C"], { B: b }, NOW);
    expect(skipped).toEqual([]);
    const bUpdate = updates.find((u) => u.skillId === "B");
    expect(bUpdate).toMatchObject({
      trigger: "credit-propagation",
      prevMastery: 0.2,
      prevStatus: "introduced",
      prevPhase: 1,
    });
  });

  it("a no-evidence ancestor is credited with TRUE blank prevs", () => {
    const { updates } = creditFromDiagnostic("stu-1", chain, ["C"], {}, NOW);
    const a = updates.find((u) => u.skillId === "A");
    expect(a).toMatchObject({
      trigger: "credit-propagation",
      prevMastery: 0,
      prevStatus: "unknown",
      prevPhase: 1,
      newStatus: "mastered",
    });
  });

  it("an already-mastered propagation target emits NO update (masteredAt never overwritten) and is logged 'already mastered'", () => {
    const b = state({
      status: "mastered",
      mastery: 0.9,
      phase: 3,
      attempts: 8,
      correct: 8,
      transfer: true,
      lastAttemptAt: daysAgo(2),
      masteredAt: daysAgo(2),
    });
    const { updates, skipped } = creditFromDiagnostic("stu-1", chain, ["C"], { B: b }, NOW);
    expect(updates.map((u) => u.skillId)).toEqual(["C", "A"]);
    expect(skipped).toEqual([{ skillId: "B", reason: "already mastered" }]);
  });

  it("a DEMONSTRATED node is credited with true prevs regardless of prior status — fresh direct evidence supersedes stale state", () => {
    const c = state({
      status: "needs_review",
      mastery: 0.55,
      phase: 3,
      attempts: 9,
      correct: 6,
      recent: [ra(false, 3)],
      lastAttemptAt: daysAgo(20),
      masteredAt: daysAgo(40),
    });
    const { updates, skipped } = creditFromDiagnostic("stu-1", chain, ["C"], { C: c }, NOW);
    const cUpdate = updates.find((u) => u.skillId === "C");
    expect(cUpdate).toMatchObject({
      trigger: "diagnostic",
      prevMastery: 0.55,
      prevStatus: "needs_review",
      prevPhase: 3,
      newStatus: "mastered",
    });
    expect(skipped.map((s) => s.skillId)).not.toContain("C");
  });
});

describe("creditFromDiagnostic §V3.2 — credit-propagation BLOCK (chain A ← B ← C)", () => {
  it("a demonstrated descendant of a BLOCKED ancestor yields NO update for that ancestor, and propagation stops there", () => {
    // C demonstrated; B is a blocked (e.g. unresolved high-impact bridge) node.
    // B must NOT be credited, and propagation must STOP at B → A is also not
    // credited (it sits above the block).
    const { updates, skipped } = creditFromDiagnostic(
      "stu-1",
      chain,
      ["C"],
      {},
      NOW,
      new Set(["B"]),
    );
    const credited = updates.map((u) => u.skillId);
    expect(credited).toContain("C"); // direct evidence still credits the demonstrated node
    expect(credited).not.toContain("B"); // blocked → never credited
    expect(credited).not.toContain("A"); // propagation stopped at B
    expect(skipped).toContainEqual({
      skillId: "B",
      reason: "blocked: unresolved placement (not credited)",
    });
  });

  it("a demonstrated node that is itself blocked is not credited (high-impact short of ≥2 direct)", () => {
    const { updates, skipped } = creditFromDiagnostic(
      "stu-1",
      chain,
      ["C"],
      {},
      NOW,
      new Set(["C"]),
    );
    const credited = updates.map((u) => u.skillId);
    expect(credited).not.toContain("C"); // blocked demonstrated node not credited
    // …but its UNBLOCKED ancestors still receive credit (the evidence implies them).
    expect(credited).toContain("B");
    expect(credited).toContain("A");
    expect(skipped).toContainEqual({
      skillId: "C",
      reason: "blocked: unresolved placement (not credited)",
    });
  });

  it("default empty blocked set preserves existing behavior", () => {
    const { updates } = creditFromDiagnostic("stu-1", chain, ["C"], {}, NOW);
    expect(updates.map((u) => u.skillId)).toEqual(["C", "B", "A"]);
  });
});

describe("determinism and purity", () => {
  it("same inputs twice → deep-equal batch output", () => {
    const states = {
      A: masteredState(18),
      B: state({ attempts: 3, correct: 2, recent: [ra(true, 1), ra(false, 1), ra(true, 1)], lastAttemptAt: NOW }),
    };
    const one = computeMasteryAll("stu-1", states, chain, NOW);
    const two = computeMasteryAll("stu-1", states, chain, NOW);
    expect(two).toEqual(one);
  });

  it("never mutates its inputs", () => {
    const states = {
      A: masteredState(18),
      B: state({ attempts: 3, correct: 2, recent: [ra(true, 1), ra(false, 1), ra(true, 1)], lastAttemptAt: NOW }),
    };
    const snapshot = JSON.parse(JSON.stringify({ states, chain }));
    computeMasteryAll("stu-1", states, chain, NOW);
    expect(JSON.parse(JSON.stringify({ states, chain }))).toEqual(snapshot);
  });

  it("computeMastery is a wrapper over the batch — same numbers, and throws on unknown skills", () => {
    const states = { A: masteredState(14) };
    const batch = computeMasteryAll("stu-1", states, chain, NOW);
    expect(computeMastery(states, "A", chain, NOW)).toEqual(batch.results.A);
    expect(() => computeMastery(states, "NOPE", chain, NOW)).toThrow(/unknown skill/i);
  });
});
