// lib/inspector tests (Phase 5 §I) — buildInspectorModel renders both a VALID
// graph (real data/algebra1-graph.json) and a crafted INVALID graph (→ invalid
// banner + issues). This is the direct-validateGraph requirement: the inspector
// must surface an invalid report, which getRepository().getGraph() never could.

import { describe, expect, it } from "vitest";
import graphJson from "../../data/algebra1-graph.json";
import { buildInspectorModel } from "./model";

describe("buildInspectorModel — valid graph", () => {
  const model = buildInspectorModel(graphJson);

  it("reports valid with schema version + non-empty stats", () => {
    expect(model.valid).toBe(true);
    expect(model.errorCount).toBe(0);
    expect(model.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(model.stats.nodes).toBeGreaterThan(0);
    expect(model.stats.edges).toBeGreaterThan(0);
    expect(model.stats.domains).toBeGreaterThan(0);
  });

  it("projects node detail with derived creditTier and coverage", () => {
    expect(model.nodes.length).toBe(model.stats.nodes);
    expect(model.structureUnavailable).toBe(false);
    const credit = model.nodes.filter((n) => n.creditTier === "algebra1-credit");
    const review = model.nodes.filter((n) => n.creditTier === "prerequisite-review");
    expect(credit.length).toBeGreaterThan(0);
    expect(review.length).toBeGreaterThan(0);
    // every node has the 7 sport hook flags + 3 phase counts
    for (const n of model.nodes) {
      expect(Object.keys(n.coverage.hooks).length).toBe(7);
    }
  });

  it("builds an edge list and a coverage matrix row per node", () => {
    expect(model.edges.length).toBe(model.stats.edges);
    expect(model.coverage.length).toBe(model.stats.nodes);
    for (const row of model.coverage) {
      expect(row.cells.length).toBe(7);
    }
  });

  it("dependents are the inverse of prereqs", () => {
    const byId = new Map(model.nodes.map((n) => [n.id, n]));
    for (const n of model.nodes) {
      for (const p of n.prereqs) {
        expect(byId.get(p)?.dependents).toContain(n.id);
      }
    }
  });
});

describe("buildInspectorModel — invalid graph", () => {
  it("renders an INVALID banner + grouped issues for a graph with a cycle and a bad edge", () => {
    // Craft a structurally-parseable but semantically-invalid graph: two nodes
    // form a prereq cycle, and one edge references a nonexistent node.
    const invalid = {
      schema: { version: "9.9.9", course: "Algebra 1" },
      domains: [{ id: "d", label: "D", tier: 0 }],
      misconceptionRegistry: [],
      nodes: [
        baseNode("x", ["y"]),
        baseNode("y", ["x"]),
      ],
      edges: [
        { from: "y", to: "x" },
        { from: "x", to: "y" },
        { from: "ghost", to: "x" },
      ],
    };
    const model = buildInspectorModel(invalid);
    expect(model.valid).toBe(false);
    expect(model.errorCount).toBeGreaterThan(0);
    expect(model.errors.length).toBe(model.errorCount);
    expect(model.structureUnavailable).toBe(true);
    // The crafted defects must show up as issues.
    const codes = new Set(model.errors.map((e) => e.code));
    expect(codes.has("CYCLE")).toBe(true);
    expect(codes.has("INVALID_EDGE")).toBe(true);
    // Schema header still parses for the banner.
    expect(model.schemaVersion).toBe("9.9.9");
  });

  it("handles a non-object root without throwing", () => {
    const model = buildInspectorModel(null);
    expect(model.valid).toBe(false);
    expect(model.structureUnavailable).toBe(true);
    expect(model.schemaVersion).toBeNull();
  });
});

function baseNode(id: string, prereqs: string[]) {
  return {
    id,
    title: `Skill ${id}`,
    domain: "d",
    tier: 0,
    prereqs,
    standards: { ccss: ["A-REI.B.3"], state: null },
    objective: "obj",
    misconceptionTags: [],
    visual: null,
    contextHooks: {
      baseball: "h",
      softball: "h",
      basketball: "h",
      soccer: "h",
      football: "h",
      volleyball: "h",
      neutral: "h",
    },
    workedExamples: [],
    problems: { p1: [], p2: [], p3: [] },
  };
}
