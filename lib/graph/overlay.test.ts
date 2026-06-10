import { describe, expect, it } from "vitest";
import { computeOverlay, MASTERY_GATE, propagateDiagnosticCredit } from "./overlay";
import realGraphJson from "../../data/algebra1-graph.json";
import type { CurriculumGraph } from "@/types";

const realGraph = realGraphJson as unknown as CurriculumGraph;

describe("computeOverlay — smoke test over the real graph", () => {
  it("with empty state: 74 nodes, ALG-F01 on the frontier, deterministic recommendation", () => {
    const overlay = computeOverlay(realGraph, {});
    expect(overlay.nodes).toHaveLength(74);

    const root = overlay.nodes.find((n) => n.skillId === "ALG-F01");
    expect(root?.frontier).toBe(true);
    expect(overlay.summary.frontier).toBe(1);

    // NOTE: the Phase 0 spec expected kind "continue" here, but the
    // pre-existing overlay logic (moved byte-for-byte, zero-behavior refactor)
    // returns "remediate": ALG-F02 is blocked by ALG-F01, and a frontier node
    // with a locked dependent is classified remediate. Flagged to mr-gates.
    expect(overlay.recommendation?.skillId).toBe("ALG-F01");
    expect(overlay.recommendation?.kind).toBe("remediate");
  });

  it("exposes the approved mastery gate unchanged", () => {
    expect(MASTERY_GATE).toBe(0.7);
  });
});

describe("propagateDiagnosticCredit — over the real graph", () => {
  it("demonstrated ALG-E03 credits its full transitive prerequisite ancestry and nothing else", () => {
    const credited = propagateDiagnosticCredit(realGraph, ["ALG-E03"]);

    // ALG-E03 → {ALG-E02, ALG-F08}; ALG-E02 → ALG-E01 → ALG-F06 → {ALG-F05, ALG-F03};
    // ALG-F08 → ALG-F07 → ALG-F05 → ALG-F03 → ALG-F01.
    expect(credited).toEqual(
      new Set([
        "ALG-E03",
        "ALG-E02",
        "ALG-E01",
        "ALG-F06",
        "ALG-F05",
        "ALG-F03",
        "ALG-F01",
        "ALG-F08",
        "ALG-F07",
      ]),
    );
  });
});
