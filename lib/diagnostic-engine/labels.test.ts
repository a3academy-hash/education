// Tests for the four placement labels + remediation ordering + entry frontier
// (§V2 R6 / §V3). Pure-function tests on a small synthetic label graph.

import { describe, expect, it } from "vitest";
import { entryFrontier, labelNode, remediationList } from "./labels";
import { fixtureGraph, fixtureNode } from "./__fixtures__/diagnostic-fixture";
import { DIAGNOSTIC_CONFIG } from "./index";
import type { DiagnosticPlacementLabel } from "@/types";

const P = DIAGNOSTIC_CONFIG.posterior;

const base = {
  posterior: 0.5,
  directCorrect: 0,
  directIncorrect: 0,
  inferredOnly: false,
  highImpact: false,
  foundational: false,
  fatigueFlagged: false,
};

describe("labelNode (§V2 R6 / §V3)", () => {
  it("READY needs posterior ≥ .85 AND ≥2 direct evidence", () => {
    expect(labelNode({ ...base, posterior: 0.95, directCorrect: 2 }, P)).toBe("READY");
    // High posterior but only 1 direct point → not READY.
    expect(labelNode({ ...base, posterior: 0.82, directCorrect: 1 }, P)).toBe("UNCERTAIN");
  });

  it("high-impact READY requires ≥2 DIRECT-CORRECT (R2)", () => {
    // 2 direct evidence but 1 correct + 1 incorrect, posterior pushed high by
    // construction won't happen, but guard the rule directly:
    expect(
      labelNode(
        { ...base, posterior: 0.9, directCorrect: 1, directIncorrect: 1, highImpact: true },
        P,
      ),
    ).toBe("UNCERTAIN");
    expect(
      labelNode({ ...base, posterior: 0.95, directCorrect: 2, highImpact: true }, P),
    ).toBe("READY");
  });

  it("NEEDS_WORK on posterior ≤ .35 with ≥2 fails", () => {
    expect(
      labelNode({ ...base, posterior: 0.11, directIncorrect: 2 }, P),
    ).toBe("NEEDS_WORK");
    // One fail, non-foundational → not enough for NEEDS_WORK.
    expect(labelNode({ ...base, posterior: 0.11, directIncorrect: 1 }, P)).toBe("UNCERTAIN");
  });

  it("foundational direct fail at 1 evidence → NEEDS_WORK (K5)", () => {
    expect(
      labelNode({ ...base, posterior: 0.11, directIncorrect: 1, foundational: true }, P),
    ).toBe("NEEDS_WORK");
  });

  it("INFERRED_READY for inferred-only at/above .65, provisional", () => {
    expect(
      labelNode({ ...base, posterior: 0.65, inferredOnly: true }, P),
    ).toBe("INFERRED_READY");
  });

  it("high-impact inferred-only is demoted to UNCERTAIN (never inferred-only, §3a)", () => {
    expect(
      labelNode({ ...base, posterior: 0.7, inferredOnly: true, highImpact: true }, P),
    ).toBe("UNCERTAIN");
  });

  it("ambiguous middle → UNCERTAIN", () => {
    expect(labelNode({ ...base, posterior: 0.5, directCorrect: 1 }, P)).toBe("UNCERTAIN");
  });

  it("fatigue-flagged unresolved → UNCERTAIN, never NEEDS_WORK (§V3.5)", () => {
    expect(
      labelNode(
        { ...base, posterior: 0.11, directIncorrect: 2, fatigueFlagged: true },
        P,
      ),
    ).toBe("UNCERTAIN");
    // …but a confidently-cleared READY is NOT down-graded by a fatigue flag.
    expect(
      labelNode({ ...base, posterior: 0.95, directCorrect: 2, fatigueFlagged: true }, P),
    ).toBe("READY");
  });
});

// A small label graph: r (root) → m (middle) → t (top).
const chain = fixtureGraph(
  [
    fixtureNode("r", "alpha", 0, []),
    fixtureNode("m", "alpha", 0, ["r"]),
    fixtureNode("t", "alpha", 0, ["m"]),
  ],
  [{ id: "alpha", label: "Alpha", tier: 0 }],
);

describe("remediationList — topological, ancestors first", () => {
  it("orders NEEDS_WORK + UNCERTAIN by prereq topology", () => {
    const labels: Record<string, DiagnosticPlacementLabel> = {
      r: "NEEDS_WORK",
      m: "UNCERTAIN",
      t: "NEEDS_WORK",
    };
    expect(remediationList(labels, chain)).toEqual(["r", "m", "t"]);
  });

  it("excludes READY/INFERRED_READY nodes", () => {
    const labels: Record<string, DiagnosticPlacementLabel> = {
      r: "READY",
      m: "INFERRED_READY",
      t: "NEEDS_WORK",
    };
    expect(remediationList(labels, chain)).toEqual(["t"]);
  });
});

describe("entryFrontier — deepest non-READY with READY/INFERRED_READY prereqs", () => {
  it("picks the deepest qualifying node on a chain", () => {
    // r READY, m UNCERTAIN (prereq r is READY → qualifies), t NEEDS_WORK
    // (prereq m is UNCERTAIN → does not qualify). Frontier = {m}.
    const labels: Record<string, DiagnosticPlacementLabel> = {
      r: "READY",
      m: "UNCERTAIN",
      t: "NEEDS_WORK",
    };
    expect(entryFrontier(labels, chain)).toEqual(["m"]);
  });

  it("carries inferred prereqs (INFERRED_READY counts as a satisfied prereq)", () => {
    const labels: Record<string, DiagnosticPlacementLabel> = {
      r: "INFERRED_READY",
      m: "NEEDS_WORK",
      t: "UNCERTAIN",
    };
    // m qualifies (prereq r is INFERRED_READY); t does not (prereq m non-READY).
    expect(entryFrontier(labels, chain)).toEqual(["m"]);
  });

  it("is empty when every node is READY", () => {
    const labels: Record<string, DiagnosticPlacementLabel> = {
      r: "READY",
      m: "READY",
      t: "READY",
    };
    expect(entryFrontier(labels, chain)).toEqual([]);
  });
});
