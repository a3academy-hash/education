import { describe, expect, it } from "vitest";
import {
  validateBktParams, bktUpdate, pKnownLowerBound, pKnownVar,
  pRecall, retentionUpdate, daysUntilReview,
  applyEvidence, canLock, propagate, seedFromDiagnostic, ebBlendStability,
  RETENTION, TRANSFER_DIMENSIONS,
} from "./index";
import type { BktParams, LockEvidence, LearningState } from "./index";

const P: BktParams = { pL0: 0.2, pT: 0.1, pG: 0.2, pS: 0.1 };

describe("BKT acquisition", () => {
  it("validates params and rejects non-discriminating (pG >= 1 - pS)", () => {
    expect(() => validateBktParams(P)).not.toThrow();
    expect(() => validateBktParams({ ...P, pG: 0.95 })).toThrow(/discriminating/);
    expect(() => validateBktParams({ ...P, pS: -0.1 })).toThrow(/\[0,1\]/);
  });

  it("a correct attempt RAISES p_known; an incorrect LOWERS it (valid params)", () => {
    const up = bktUpdate(0.5, true, P);
    const down = bktUpdate(0.5, false, P);
    expect(up).toBeGreaterThan(0.5);
    expect(down).toBeLessThan(0.5);
  });

  it("matches the closed-form posterior+learn for a correct answer", () => {
    const p = 0.5;
    const post = (p * (1 - P.pS)) / (p * (1 - P.pS) + (1 - p) * P.pG);
    const expected = post + (1 - post) * P.pT;
    expect(bktUpdate(p, true, P)).toBeCloseTo(expected, 10);
  });

  it("lower bound <= pKnown and variance is Bernoulli", () => {
    expect(pKnownLowerBound(0.8)).toBeLessThanOrEqual(0.8);
    expect(pKnownVar(0.8)).toBeCloseTo(0.16, 10);
  });
});

describe("FSRS retention", () => {
  it("pRecall decays with elapsed time; full recall at elapsed<=0", () => {
    expect(pRecall(0, 10)).toBe(1);
    expect(pRecall(10, 10)).toBeCloseTo(0.5, 10); // half-life at S
    expect(pRecall(20, 10)).toBeLessThan(pRecall(10, 10));
  });

  it("SPACED success extends stability; failure shrinks it; clamped", () => {
    const s0 = 10;
    expect(retentionUpdate(s0, true, 8)).toBeGreaterThan(s0); // weak memory, strengthens
    expect(retentionUpdate(s0, false, 8)).toBeLessThan(s0);
    expect(retentionUpdate(RETENTION.STABILITY_MAX, true, 1000)).toBeLessThanOrEqual(RETENTION.STABILITY_MAX);
    expect(retentionUpdate(RETENTION.STABILITY_MIN, false, 1)).toBeGreaterThanOrEqual(RETENTION.STABILITY_MIN);
  });

  it("MASSED success (elapsed<=0) builds NO durability (the firewall)", () => {
    expect(retentionUpdate(10, true, 0)).toBe(10);
    expect(retentionUpdate(10, true, -5)).toBe(10);
  });

  it("no blow-up/oscillation over a long success run (monotone, bounded)", () => {
    let s = 5, prev = 0;
    for (let i = 0; i < 50; i++) { s = retentionUpdate(s, true, s); expect(s).toBeGreaterThanOrEqual(prev); prev = s; }
    expect(s).toBeLessThanOrEqual(RETENTION.STABILITY_MAX);
  });

  it("daysUntilReview is positive and scales with stability", () => {
    expect(daysUntilReview(10)).toBeGreaterThan(0);
    expect(daysUntilReview(20)).toBeGreaterThan(daysUntilReview(10));
  });
});

describe("interaction rule — no double-count", () => {
  const base: LearningState = { acq: { pKnown: 0.5 }, ret: { stability: 10, lastRetrievalAtIso: "2026-06-10T00:00:00.000Z" } };

  it("new_acquisition updates BKT ONLY (retention untouched)", () => {
    const out = applyEvidence(base, { kind: "new_acquisition", correct: true, elapsedDays: 0 }, P, "2026-06-16T00:00:00.000Z");
    expect(out.acq.pKnown).not.toBe(base.acq.pKnown);
    expect(out.ret).toEqual(base.ret); // retention NOT touched
  });

  it("retrieval updates BOTH layers exactly once", () => {
    const out = applyEvidence(base, { kind: "retrieval", correct: true, elapsedDays: 8 }, P, "2026-06-16T00:00:00.000Z");
    expect(out.acq.pKnown).toBeGreaterThan(base.acq.pKnown);
    expect(out.ret.stability!).toBeGreaterThan(10);
    expect(out.ret.lastRetrievalAtIso).toBe("2026-06-16T00:00:00.000Z");
  });

  it("first retrieval initializes retention from the population prior", () => {
    const fresh: LearningState = { acq: { pKnown: 0.6 }, ret: { stability: null, lastRetrievalAtIso: null } };
    const out = applyEvidence(fresh, { kind: "retrieval", correct: true, elapsedDays: 2 }, P, "2026-06-16T00:00:00.000Z");
    expect(out.ret.stability).not.toBeNull();
  });
});

describe("gate — the D5 retention firewall", () => {
  const clear = (window: 1 | 7 | 21, dimension: string): LockEvidence =>
    ({ window, dimension, unseen: true, correct: true, pKnownLB: 0.92, atIso: "2026-06-16T00:00:00.000Z" });
  const full = (): LockEvidence[] =>
    [1, 7, 21].flatMap((w) => TRANSFER_DIMENSIONS.map((d) => clear(w as 1 | 7 | 21, d)));

  it("a node with PERFECT IN-SESSION accuracy does NOT lock (empty delayed history)", () => {
    expect(canLock([], { lowerBound: 0.9 })).toBe(false);
  });

  it("locks ONLY when all 1/7/21 windows + all transfer dims clear unseen at the lower bound", () => {
    expect(canLock(full(), { lowerBound: 0.9 })).toBe(true);
  });

  it("missing a window -> no lock", () => {
    const miss21 = full().filter((e) => e.window !== 21);
    expect(canLock(miss21, { lowerBound: 0.9 })).toBe(false);
  });

  it("a SEEN item or a below-threshold clear does not qualify", () => {
    const seen = full().map((e) => ({ ...e, unseen: false }));
    expect(canLock(seen, { lowerBound: 0.9 })).toBe(false);
    const low = full().map((e) => ({ ...e, pKnownLB: 0.5 }));
    expect(canLock(low, { lowerBound: 0.9 })).toBe(false);
  });

  it("missing a transfer dimension -> no lock", () => {
    const missDim = full().filter((e) => e.dimension !== "novel_form");
    expect(canLock(missDim, { lowerBound: 0.9 })).toBe(false);
  });

  it("requires >= minPerDimension qualifying clears per dimension (CLAUDE §3 3-5)", () => {
    // exactly ONE qualifying clear per dimension (window 1 only) -> rejected at default 3
    const oneEach = TRANSFER_DIMENSIONS.map((d) => clear(1, d));
    expect(canLock(oneEach, { lowerBound: 0.9 })).toBe(false);
    // full() = 3 per dimension (one per window) -> passes at default 3
    expect(canLock(full(), { lowerBound: 0.9 })).toBe(true);
    // and a lower bar (minPerDimension 1) accepts one-each only if all windows present
    expect(canLock(oneEach, { lowerBound: 0.9, minPerDimension: 1 })).toBe(false); // still missing windows 7,21
  });
});

describe("propagation — single-step, damped, bounded", () => {
  const edges = [{ from: "A", to: "B" }, { from: "B", to: "C" }];
  it("success on a dependent raises its prereqs, bounded by damping*delta", () => {
    const n = propagate("B", 0.5, edges, 0.2);
    expect(n.A).toBeCloseTo(0.1, 10); // 0.2 * 0.5
    expect(n.C).toBeUndefined(); // not a prereq of B
  });
  it("failure on a foundational node lowers its dependents", () => {
    const n = propagate("B", -0.5, edges, 0.2);
    expect(n.C).toBeCloseTo(-0.1, 10);
    expect(n.A).toBeUndefined();
  });
});

describe("cold-start — diagnostic seed (§6)", () => {
  it("maps each label to a graded p_known; INFERRED_READY is provisional", () => {
    expect(seedFromDiagnostic("READY").state.acq.pKnown).toBeGreaterThan(seedFromDiagnostic("NEEDS_WORK").state.acq.pKnown);
    expect(seedFromDiagnostic("INFERRED_READY").provisional).toBe(true);
    expect(seedFromDiagnostic("READY").provisional).toBe(false);
    expect(seedFromDiagnostic("READY").state.ret.stability).toBeNull(); // population prior until first retrieval
  });
  it("EB blend moves from prior toward personalized as retrievals accrue", () => {
    expect(ebBlendStability(20, 0)).toBeCloseTo(RETENTION.POPULATION_PRIOR, 10);
    expect(ebBlendStability(20, 4)).toBeCloseTo(20, 10);
    expect(ebBlendStability(20, 2)).toBeGreaterThan(RETENTION.POPULATION_PRIOR);
  });
});
