// Tests for the BKT likelihood-ratio posterior (§V3.1). The exact numbers are
// load-bearing: they are what makes READY(≥.85) require ≥2 direct-correct.

import { describe, expect, it } from "vitest";
import { bktPosterior } from "./posterior";

const T = { guess: 0.2, slip: 0.1 };

describe("bktPosterior: §V3.1 exact numbers (untouched prior .5)", () => {
  it("1 direct-correct ≈ .82", () => {
    const r = bktPosterior([true], 0.5, T);
    expect(r.posterior).toBeCloseTo(0.818, 3);
    expect(r.evidenceCount).toBe(1);
    // Below READY(.85): a single correct cannot reach READY (R2 by construction).
    expect(r.posterior).toBeLessThan(0.85);
  });

  it("2 direct-correct ≈ .95 (crosses the READY bar)", () => {
    const r = bktPosterior([true, true], 0.5, T);
    expect(r.posterior).toBeCloseTo(0.953, 3);
    expect(r.posterior).toBeGreaterThanOrEqual(0.85);
    expect(r.evidenceCount).toBe(2);
  });

  it("1 direct-incorrect ≈ .11", () => {
    const r = bktPosterior([false], 0.5, T);
    expect(r.posterior).toBeCloseTo(0.111, 3);
  });

  it("is order-independent (odds multiplication commutes)", () => {
    const a = bktPosterior([true, false, true], 0.5, T);
    const b = bktPosterior([false, true, true], 0.5, T);
    expect(a.posterior).toBeCloseTo(b.posterior, 12);
  });

  it("no direct evidence → stays at the prior (inference never moves it)", () => {
    expect(bktPosterior([], 0.4, T).posterior).toBeCloseTo(0.4, 12);
    expect(bktPosterior([], 0.5, T).posterior).toBeCloseTo(0.5, 12);
    expect(bktPosterior([], 0.4, T).evidenceCount).toBe(0);
  });

  it("an inferred-only high-impact node (skeptical prior .4) stays UNCERTAIN-range", () => {
    const r = bktPosterior([], 0.4, T);
    expect(r.posterior).toBeLessThan(0.65); // below INFERRED_READY threshold
    expect(r.posterior).toBeGreaterThan(0.35); // above NEEDS_WORK threshold
  });

  it("rough Wilson CI brackets the point estimate and widens with little data", () => {
    const one = bktPosterior([true], 0.5, T);
    const four = bktPosterior([true, true, true, true], 0.5, T);
    expect(one.ciLow).toBeGreaterThanOrEqual(0);
    expect(one.ciHigh).toBeLessThanOrEqual(1);
    expect(one.ciLow).toBeLessThan(one.ciHigh);
    // More evidence → a tighter interval.
    expect(four.ciHigh - four.ciLow).toBeLessThan(one.ciHigh - one.ciLow);
  });

  it("empty evidence yields the full [0,1] rough interval", () => {
    const r = bktPosterior([], 0.5, T);
    expect(r.ciLow).toBe(0);
    expect(r.ciHigh).toBe(1);
  });
});
