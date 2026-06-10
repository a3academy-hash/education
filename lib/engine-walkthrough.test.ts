// lib/engine-walkthrough.test.ts — end-to-end story test (checkpoint artifact
// for Matt). One student, "Jordan" (sport: basketball), runs the REAL
// data/algebra1-graph.json through the REAL engine APIs: diagnostic credit,
// backward routing on a gap, the inviolable P3 transfer gate, unlock, and
// mid-course acceleration. Stages share state and MUST run in order.
// Deterministic nowIso constants throughout — no Date.now() anywhere.

import { describe, expect, it } from "vitest";
import {
  computeMasteryAll,
  creditFromDiagnostic,
  MASTERY_CONFIG,
  propagateDiagnosticCredit,
} from "./mastery-engine";
import { recommend } from "./adaptive-router";
import { computeOverlay } from "./graph/overlay";
import { computeTransfer } from "./problem-engine";
import realGraphJson from "../data/algebra1-graph.json";
import type {
  CurriculumGraph,
  NewMasteryUpdate,
  Phase,
  RecentAttempt,
  StudentAttempt,
  StudentSkillState,
} from "@/types";

const graph = realGraphJson as unknown as CurriculumGraph;

const STUDENT = "jordan";
const SPORT = "basketball" as const;

// One school day, 2026-06-10 — stage clocks are fixed and strictly ordered.
const T = {
  diagnostic: "2026-06-10T09:00:00.000Z",
  f06Done: "2026-06-10T09:45:00.000Z",
  gap: "2026-06-10T10:00:00.000Z",
  remediation: "2026-06-10T11:00:00.000Z",
  transfer: "2026-06-10T12:00:00.000Z",
  unlock: "2026-06-10T13:00:00.000Z",
  acceleration: "2026-06-10T14:00:00.000Z",
};

const blank = (): StudentSkillState => ({
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
});

const r = (correct: boolean, phase: Phase): RecentAttempt => ({
  correct,
  timeMs: 45_000,
  phase,
});

describe("ENGINE WALKTHROUGH — Jordan (basketball) goes from diagnostic to acceleration on the real Algebra 1 graph", () => {
  // Shared, evolving student record — the immutable attempt log plus the
  // per-skill state rows a caller would persist between engine cycles.
  const states: Record<string, StudentSkillState> = {};
  const attemptLog: StudentAttempt[] = [];
  let attemptSeq = 0;

  const logAttempt = (skillId: string, correct: boolean, phase: Phase, createdAt: string) => {
    attemptSeq += 1;
    attemptLog.push({
      id: `att-${String(attemptSeq).padStart(3, "0")}`,
      studentId: STUDENT,
      skillId,
      problemId: `${skillId}-p${phase}-${attemptSeq}`,
      phase,
      sport: phase === 3 ? "neutral" : SPORT, // Phase 3 is ALWAYS neutral
      response: "",
      correct,
      hintsUsed: 0,
      timeMs: 45_000,
      misconceptionTags: [],
      isProbe: false,
      createdAt,
    });
  };

  /** Apply credit updates the way a caller persists them: set masteredAt and
   * reset recent[] per the StudentSkillState convention. */
  const applyCredit = (updates: NewMasteryUpdate[], nowIso: string) => {
    for (const u of updates) {
      const prev = states[u.skillId] ?? blank();
      states[u.skillId] = {
        ...prev,
        mastery: u.newMastery,
        status: u.newStatus,
        phase: u.newPhase,
        recent: [],
        masteredAt: nowIso,
      };
    }
  };

  it("Stage 1 — DIAGNOSTIC: Jordan demonstrates Variables & Expressions (ALG-F05); the engine credits it and its full ancestry with true blank prevs — no busywork", () => {
    const { updates, skipped } = creditFromDiagnostic(
      STUDENT,
      graph,
      ["ALG-F05"],
      states,
      T.diagnostic,
    );

    expect(skipped).toEqual([]); // blank record — nothing to skip
    expect(updates.map((u) => u.skillId).sort()).toEqual(["ALG-F01", "ALG-F03", "ALG-F05"]);

    const f05 = updates.find((u) => u.skillId === "ALG-F05");
    expect(f05?.trigger).toBe("diagnostic");
    const propagated = updates.filter((u) => u.trigger === "credit-propagation");
    expect(propagated.map((u) => u.skillId).sort()).toEqual(["ALG-F01", "ALG-F03"]);
    for (const u of updates) {
      // True prevs — Jordan had no state rows, so blank-state defaults.
      expect(u).toMatchObject({
        prevMastery: 0,
        prevStatus: "unknown",
        prevPhase: 1,
        newStatus: "mastered",
      });
      expect(u.reason).toContain("ALG-F05");
    }

    applyCredit(updates, T.diagnostic);
    const { results } = computeMasteryAll(STUDENT, states, graph, T.diagnostic);
    expect(results["ALG-F01"].status).toBe("mastered");
    expect(results["ALG-F03"].status).toBe("mastered");
    expect(results["ALG-F05"].status).toBe("mastered");
  });

  it("Stage 2 — GAP: after honestly mastering Evaluating Expressions, Jordan goes 1/4 on One-Step Equations; dependents lock and the router routes BACKWARD with a plain-language reason", () => {
    // Between stages Jordan worked ALG-F06 to real mastery (6/6 with neutral
    // transfer); recent[] is reset per the post-mastery convention.
    states["ALG-F06"] = {
      mastery: 0.9,
      status: "mastered",
      phase: 3,
      attempts: 6,
      correct: 6,
      hints: 0,
      timeMs: 6 * 45_000,
      recent: [],
      transfer: true,
      lastAttemptAt: T.f06Done,
      masteredAt: T.f06Done,
    };

    // Four weak basketball-context attempts on ALG-E01: 1/4 correct.
    const e01Window = [r(false, 1), r(true, 1), r(false, 1), r(false, 1)];
    for (const a of e01Window) logAttempt("ALG-E01", a.correct, a.phase, T.gap);
    states["ALG-E01"] = {
      ...blank(),
      status: "developing", // persisted from the prior engine cycle
      attempts: 4,
      correct: 1,
      recent: e01Window,
      lastAttemptAt: T.gap,
    };

    const { results } = computeMasteryAll(STUDENT, states, graph, T.gap);
    expect(results["ALG-E01"].score).toBeLessThan(MASTERY_CONFIG.thresholds.prereqGate);
    expect(results["ALG-E01"].status).toBe("developing");
    // The weak prerequisite locks BOTH direct dependents.
    expect(results["ALG-E02"].status).toBe("prerequisite_gap");
    expect(results["ALG-E09"].status).toBe("prerequisite_gap");

    const rec = recommend(results, states, graph);
    expect(rec).toMatchObject({
      skillId: "ALG-E01",
      kind: "remediate",
      blockedSkill: "Two-Step Equations",
    });
    expect(rec.reason).toBe(
      "Two-Step Equations is waiting on this skill, so we strengthen it first.",
    );
  });

  it("Stage 3 — REMEDIATION WITHOUT TRANSFER: accuracy climbs to 4/5 in sport/blended context, but with zero neutral work ALG-E01 is near_mastery — NOT mastered (transfer gate inviolable)", () => {
    // Five more attempts, P1/P2 only: 4/5 correct. Still no Phase-3 evidence.
    const newWindow = [r(false, 1), r(true, 1), r(true, 2), r(true, 2), r(true, 2)];
    for (const a of newWindow) logAttempt("ALG-E01", a.correct, a.phase, T.remediation);
    states["ALG-E01"] = {
      ...states["ALG-E01"],
      phase: 2,
      attempts: 9,
      correct: 5,
      recent: newWindow,
      lastAttemptAt: T.remediation,
    };

    // The immutable log agrees: no neutral transfer has been demonstrated.
    expect(computeTransfer(attemptLog.filter((a) => a.skillId === "ALG-E01"))).toBe(false);

    const batch = computeMasteryAll(STUDENT, states, graph, T.remediation);
    expect(batch.results["ALG-E01"].score).toBeGreaterThanOrEqual(
      MASTERY_CONFIG.thresholds.nearMastery,
    );
    expect(batch.results["ALG-E01"].status).toBe("near_mastery");
    expect(batch.results["ALG-E01"].status).not.toBe("mastered");

    // Persist the proposed developing → near_mastery update.
    const up = batch.proposedUpdates.find((u) => u.skillId === "ALG-E01");
    expect(up?.newStatus).toBe("near_mastery");
    states["ALG-E01"] = {
      ...states["ALG-E01"],
      status: "near_mastery",
      mastery: batch.results["ALG-E01"].score,
    };
  });

  it("Stage 4 — TRANSFER: two correct neutral Phase-3 problems flip the transfer gate, and ALG-E01 is mastered on real evidence", () => {
    // Two correct NEUTRAL Phase-3 attempts, logged immutably.
    logAttempt("ALG-E01", true, 3, T.transfer);
    logAttempt("ALG-E01", true, 3, T.transfer);
    expect(computeTransfer(attemptLog.filter((a) => a.skillId === "ALG-E01"))).toBe(true);

    const prev = states["ALG-E01"];
    states["ALG-E01"] = {
      ...prev,
      phase: 3,
      attempts: 11,
      correct: 7,
      recent: [...prev.recent, r(true, 3), r(true, 3)].slice(-5),
      transfer: true, // derived from the attempt log above
      lastAttemptAt: T.transfer,
    };

    const batch = computeMasteryAll(STUDENT, states, graph, T.transfer);
    expect(batch.results["ALG-E01"].score).toBeGreaterThanOrEqual(
      MASTERY_CONFIG.thresholds.mastered,
    );
    expect(batch.results["ALG-E01"].status).toBe("mastered");

    const up = batch.proposedUpdates.find((u) => u.skillId === "ALG-E01");
    expect(up).toMatchObject({
      trigger: "attempt",
      prevStatus: "near_mastery",
      newStatus: "mastered",
    });
    expect(up?.reason).toMatch(/transfer demonstrated on neutral problems/i);

    // Persist: masteredAt set, recent[] reset per convention.
    states["ALG-E01"] = {
      ...states["ALG-E01"],
      mastery: batch.results["ALG-E01"].score,
      status: "mastered",
      recent: [],
      masteredAt: T.transfer,
    };
  });

  it("Stage 5 — UNLOCK: Two-Step Equations is freed onto the frontier, and Jordan's same-day mastery cannot decay away (≥ 1-day decay gate holds)", () => {
    const batch = computeMasteryAll(STUDENT, states, graph, T.unlock);

    // Jordan's lifetime record on ALG-E01 is rough (7/11), so the undecayed
    // score sits BELOW the review trigger — yet one hour after mastering,
    // the decay branch is inert and mastery holds (mr-kahn ≥ 1-day rule).
    expect(batch.results["ALG-E01"].score).toBeLessThan(
      MASTERY_CONFIG.thresholds.reviewTrigger,
    );
    expect(batch.results["ALG-E01"].status).toBe("mastered");
    expect(batch.proposedUpdates).toEqual([]);

    // The gap is gone: ALG-E02 is unlocked and on the frontier.
    expect(batch.results["ALG-E02"].status).not.toBe("prerequisite_gap");
    expect(batch.results["ALG-E02"].status).toBe("unknown");
    const overlay = computeOverlay(graph, states, batch.results);
    const e02 = overlay.nodes.find((n) => n.skillId === "ALG-E02");
    expect(e02?.blockedBy).toBeNull();
    expect(e02?.frontier).toBe(true);
  });

  it("Stage 6 — ACCELERATION: a mid-course diagnostic on Multi-Step Equations credits only unevidenced ancestors, skips already-mastered ones, and the router accelerates past Integer Operations", () => {
    const { updates, skipped } = creditFromDiagnostic(
      STUDENT,
      graph,
      ["ALG-E03"],
      states,
      T.acceleration,
    );

    // Unevidenced ancestry is credited; everything Jordan already owns is not.
    expect(updates.map((u) => u.skillId).sort()).toEqual([
      "ALG-E02",
      "ALG-E03",
      "ALG-F07",
      "ALG-F08",
    ]);
    const e02 = updates.find((u) => u.skillId === "ALG-E02");
    expect(e02).toMatchObject({
      trigger: "credit-propagation",
      prevMastery: 0,
      prevStatus: "unknown",
      prevPhase: 1,
    });
    // ALG-E01 (and the rest of the mastered ancestry) emits NOTHING — its
    // masteredAt and reset recent[] are never touched. Logged instead.
    expect(skipped).toContainEqual({ skillId: "ALG-E01", reason: "already mastered" });
    expect(skipped.map((s) => s.skillId).sort()).toEqual([
      "ALG-E01",
      "ALG-F01",
      "ALG-F03",
      "ALG-F05",
      "ALG-F06",
    ]);
    expect(skipped.every((s) => s.reason === "already mastered")).toBe(true);
    const e01MasteredAt = states["ALG-E01"].masteredAt;

    applyCredit(updates, T.acceleration);
    expect(states["ALG-E01"].masteredAt).toBe(e01MasteredAt); // untouched

    const { results } = computeMasteryAll(STUDENT, states, graph, T.acceleration);
    expect(results["ALG-E03"].status).toBe("mastered");

    const justCredited = [...propagateDiagnosticCredit(graph, ["ALG-E03"])];
    const rec = recommend(results, states, graph, { justCredited });
    expect(rec.kind).toBe("accelerate");
    expect(rec.skillId).toBe("ALG-F02");
    expect(rec.reason).toContain("Integer Operations"); // names the skipped skill
    expect(rec.reason).toMatch(/not re-teaching/i);

    // No busywork: nodes the diagnostic just proved are never recommended
    // for teaching.
    expect(justCredited).not.toContain(rec.skillId);
    const masteredIds = graph.nodes
      .filter((n) => results[n.id].status === "mastered")
      .map((n) => n.id);
    expect(masteredIds).not.toContain(rec.skillId);
  });
});
