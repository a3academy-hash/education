// The CERTIFICATION GATE over the LIVE bank (overhaul Phase 2 R6). Runs the full
// certify() round-trip (the engine's own checker confirms each authored answer)
// over every real item in data/algebra1-graph.json, and asserts the Phase-2 tags
// (equivalenceClass + calculatorFlag) are present on 100% of items. An uncertified
// item (malformed/untyped answer, choice-integrity fail, missing tag) fails here —
// this is the gate that keeps slop out of the bank.
import { describe, expect, it } from "vitest";
import graph from "../../data/algebra1-graph.json";
import { certify } from "./index";
import type { ProblemTemplate } from "@/types";

function allItems(): ProblemTemplate[] {
  const out: ProblemTemplate[] = [];
  for (const node of (graph as { nodes: { problems?: Record<string, ProblemTemplate[]> }[] }).nodes) {
    if (!node.problems) continue;
    for (const phase of ["p1", "p2", "p3"]) for (const it of node.problems[phase] ?? []) out.push(it);
  }
  return out;
}

describe("item-certification gate — live bank", () => {
  const items = allItems();

  it("has a non-trivial bank", () => {
    expect(items.length).toBeGreaterThan(4000);
  });

  it("every item carries equivalenceClass + calculatorFlag (100% tag coverage)", () => {
    const missing = items.filter((it) => !it.equivalenceClass || !it.calculatorFlag);
    expect(missing.map((m) => m.id)).toEqual([]);
  });

  it("every live item certifies (well-formed + round-trip + choice-integrity)", () => {
    const flagged = items
      .map((it) => ({ id: it.id, ...certify(it) }))
      .filter((r) => !r.certified);
    // A failure here names the human-QA queue (id + reasons) — never a silent pass.
    expect(flagged.map((f) => `${f.id}: ${f.flags.join("; ")}`)).toEqual([]);
  });
});
