// Tests for the curated high-impact bridge set (§V2 R1 / §V3.3). Asserts every
// id exists in the REAL graph and reports each id's neutral-P3 item count.

import { describe, expect, it } from "vitest";
import {
  HIGH_IMPACT_NODE_IDS,
  assertHighImpactProbeable,
  highImpactProbeCounts,
  isHighImpact,
} from "./high-impact";
import realGraphJson from "../../data/algebra1-graph.json";
import type { CurriculumGraph } from "@/types";

const graph = realGraphJson as unknown as CurriculumGraph;

describe("high-impact: curated bridge set", () => {
  it("is the 9 mr-kahn-blessed ids (§V2 R1)", () => {
    expect([...HIGH_IMPACT_NODE_IDS].sort()).toEqual([
      "ALG-E02",
      "ALG-E03",
      "ALG-E04",
      "ALG-E13",
      "ALG-F02",
      "ALG-F03",
      "ALG-F08",
      "ALG-L05",
      "ALG-L07",
    ]);
  });

  it("isHighImpact membership", () => {
    expect(isHighImpact("ALG-F02")).toBe(true);
    expect(isHighImpact("ALG-F01")).toBe(false);
    expect(isHighImpact("NOPE")).toBe(false);
  });

  it("every curated id exists in the real graph with its neutral-P3 count", () => {
    const counts = highImpactProbeCounts(graph);
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    for (const id of HIGH_IMPACT_NODE_IDS) {
      // Existence — fail loudly with the id, not a generic undefined.
      expect(byId.has(id), `high-impact node ${id} must exist in the graph`).toBe(true);
      // Reportable count, ≥2 so the ≥2-direct READY bar is reachable.
      expect(counts[id], `high-impact node ${id} neutral-P3 count`).toBeGreaterThanOrEqual(2);
    }
    // Visible in the test log for the §V3.3 audit.
    console.log("high-impact neutral-P3 counts:", JSON.stringify(counts));
  });

  it("assertHighImpactProbeable passes on the real graph", () => {
    expect(() => assertHighImpactProbeable(graph)).not.toThrow();
  });

  it("assertHighImpactProbeable throws on a missing id", () => {
    const stripped: CurriculumGraph = {
      ...graph,
      nodes: graph.nodes.filter((n) => n.id !== "ALG-F02"),
    };
    expect(() => assertHighImpactProbeable(stripped)).toThrow(/missing high-impact/);
  });

  it("assertHighImpactProbeable throws when a high-impact node has <2 neutral-P3 items", () => {
    const thinned: CurriculumGraph = {
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === "ALG-F03"
          ? {
              ...n,
              problems: {
                ...n.problems,
                p3: n.problems.p3.filter((p) => p.sport === "neutral").slice(0, 1),
              },
            }
          : n,
      ),
    };
    expect(() => assertHighImpactProbeable(thinned)).toThrow(/<2 neutral-P3/);
  });
});
