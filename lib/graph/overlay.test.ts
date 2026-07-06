import { describe, expect, it } from "vitest";
import { computeOverlay, MASTERY_GATE, propagateDiagnosticCredit } from "./overlay";
import { computeMasteryAll, MASTERY_CONFIG } from "../mastery-engine";
import realGraphJson from "../../data/algebra1-graph.json";
import type { CurriculumGraph } from "@/types";

const realGraph = realGraphJson as unknown as CurriculumGraph;
const NOW = "2026-06-10T00:00:00.000Z";

describe("computeOverlay — smoke test over the real graph", () => {
  it("with empty state: 75 nodes, ALG-F01 on the frontier, no recommendation field", () => {
    const { results } = computeMasteryAll("stu-1", {}, realGraph, NOW);
    const overlay = computeOverlay(realGraph, {}, results);
    expect(overlay.nodes).toHaveLength(75);

    const root = overlay.nodes.find((n) => n.skillId === "ALG-F01");
    expect(root?.frontier).toBe(true);
    expect(root?.effectiveStatus).toBe("unknown");
    expect(overlay.summary.frontier).toBe(1);
    expect(overlay.summary.locked).toBe(74);

    // Recommendations are owned by the adaptive router now.
    expect("recommendation" in overlay).toBe(false);
  });

  it("re-exports the gate from the single home in MASTERY_CONFIG", () => {
    expect(MASTERY_GATE).toBe(MASTERY_CONFIG.thresholds.prereqGate);
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
