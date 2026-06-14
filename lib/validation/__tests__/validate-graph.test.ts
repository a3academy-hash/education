import { describe, expect, it } from "vitest";
import { validateGraph } from "../index";
import realGraph from "../../../data/algebra1-graph.json";
import type { ValidationIssue } from "@/types";

// ---------------------------------------------------------------------------
// Fixture factory — smallest graph that passes every rule.
// ---------------------------------------------------------------------------

const hooks = () => ({
  baseball: "hook",
  softball: "hook",
  basketball: "hook",
  soccer: "hook",
  football: "hook",
  volleyball: "hook",
  neutral: "hook",
});

const makeNode = (id: string, prereqs: string[] = []) => ({
  id,
  title: `Node ${id}`,
  domain: "d1",
  tier: 0,
  prereqs,
  standards: { ccss: ["CC.TEST.1"], state: null },
  objective: "Do the thing.",
  misconceptionTags: ["tag-a"],
  visual: null,
  contextHooks: hooks(),
  workedExamples: [],
  problems: {
    p1: [] as unknown[],
    p2: [] as unknown[],
    p3: [] as unknown[],
  },
});

const makeProblem = (
  id: string,
  skillId: string,
  phase: number,
  sport: string,
  misconceptionMap?: Record<string, string>,
  // LB3: optional overrides so a fixture can craft choice items / unknown kinds.
  overrides?: { answer?: unknown; choices?: unknown },
) => ({
  id,
  version: 1,
  skillId,
  phase,
  sport,
  prompt: "What is 1 + 1?",
  visual: null,
  ...(overrides && "choices" in overrides ? { choices: overrides.choices } : {}),
  answer: overrides?.answer ?? { kind: "numeric", value: "2" },
  ...(misconceptionMap ? { misconceptionMap } : {}),
  hints: [],
  difficulty: 1,
});

const makeGraph = () => ({
  schema: {
    version: "1.0.0",
    course: "Test Course",
    audience: "test",
    sports: ["baseball", "softball", "basketball", "soccer", "football", "volleyball", "neutral"],
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
  domains: [{ id: "d1", label: "Domain One", tier: 0 }],
  misconceptionRegistry: [{ id: "tag-a", description: "A test misconception." }],
  nodes: [makeNode("A"), makeNode("B", ["A"])],
  edges: [{ from: "A", to: "B" }],
});

const errorsOf = (issues: ValidationIssue[], code: ValidationIssue["code"]) =>
  issues.filter((i) => i.severity === "error" && i.code === code);

// ---------------------------------------------------------------------------
// Real graph
// ---------------------------------------------------------------------------

describe("validateGraph — real data/algebra1-graph.json", () => {
  const report = validateGraph(realGraph);

  it("is valid with zero error-severity issues", () => {
    expect(report.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(report.valid).toBe(true);
  });

  it("has the expected shape: 74 nodes, 114 edges, single root ALG-F01", () => {
    expect(report.stats.nodes).toBe(74);
    expect(report.stats.edges).toBe(114);
    expect(report.stats.roots).toEqual(["ALG-F01"]);
  });
});

// ---------------------------------------------------------------------------
// Fixture sanity + one crafted fixture per error code
// ---------------------------------------------------------------------------

describe("validateGraph — crafted fixtures", () => {
  it("base fixture is valid", () => {
    const report = validateGraph(makeGraph());
    expect(report.valid).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.stats.roots).toEqual(["A"]);
  });

  it("rejects a non-object root", () => {
    const report = validateGraph("nonsense");
    expect(report.valid).toBe(false);
    expect(errorsOf(report.issues, "SCHEMA").length).toBeGreaterThan(0);
  });

  it("SCHEMA — malformed node fields and unknown visual", () => {
    const g = makeGraph();
    (g.nodes[0] as Record<string, unknown>).title = 42;
    (g.nodes[1] as Record<string, unknown>).visual = "hologram";
    const report = validateGraph(g);
    expect(report.valid).toBe(false);
    expect(errorsOf(report.issues, "SCHEMA").length).toBeGreaterThanOrEqual(2);
  });

  it("SCHEMA — node domain must exist in domains[]", () => {
    const g = makeGraph();
    g.nodes[1].domain = "ghost-domain";
    const report = validateGraph(g);
    expect(errorsOf(report.issues, "SCHEMA")).toHaveLength(1);
    expect(errorsOf(report.issues, "SCHEMA")[0].nodeId).toBe("B");
  });

  it("DUPLICATE_ID — duplicate node ids and duplicate problem ids", () => {
    const g = makeGraph();
    g.nodes.push(makeNode("A"));
    g.nodes[0].problems.p1.push(
      makeProblem("P-1", "A", 1, "baseball"),
      makeProblem("P-1", "A", 1, "neutral"),
    );
    const report = validateGraph(g);
    const dupes = errorsOf(report.issues, "DUPLICATE_ID");
    expect(dupes.some((i) => i.message.includes('node id "A"'))).toBe(true);
    expect(dupes.some((i) => i.message.includes('problem id "P-1"'))).toBe(true);
  });

  it("INVALID_EDGE — nonexistent endpoints, nonexistent prereqs, self-loops", () => {
    const g = makeGraph();
    g.edges.push({ from: "A", to: "ZZZ" }); // bad endpoint
    g.edges.push({ from: "B", to: "B" }); // self-loop
    g.nodes[1].prereqs.push("GHOST"); // bad prereq ref
    const report = validateGraph(g);
    const invalid = errorsOf(report.issues, "INVALID_EDGE");
    expect(invalid.some((i) => i.message.includes('"ZZZ"'))).toBe(true);
    expect(invalid.some((i) => i.message.includes("self-loop"))).toBe(true);
    expect(invalid.some((i) => i.message.includes('"GHOST"'))).toBe(true);
  });

  it("EDGE_PREREQ_MISMATCH — catches both a missing and an extra edge", () => {
    const g = makeGraph();
    g.edges = [{ from: "B", to: "A" }]; // A→B (from prereqs) now missing; B→A is extra
    const report = validateGraph(g);
    const mismatches = errorsOf(report.issues, "EDGE_PREREQ_MISMATCH");
    expect(mismatches).toHaveLength(2);
    expect(mismatches.some((i) => i.message.includes("missing A → B"))).toBe(true);
    expect(mismatches.some((i) => i.message.includes("contains B → A"))).toBe(true);
  });

  it("ORPHAN — node with no prerequisites and no dependents", () => {
    const g = makeGraph();
    g.nodes.push(makeNode("C"));
    const report = validateGraph(g);
    const orphans = errorsOf(report.issues, "ORPHAN");
    expect(orphans).toHaveLength(1);
    expect(orphans[0].nodeId).toBe("C");
  });

  it("CYCLE — reports the offending path", () => {
    const g = makeGraph();
    g.nodes[0].prereqs = ["B"]; // A ⇄ B
    g.edges.push({ from: "B", to: "A" });
    const report = validateGraph(g);
    const cycles = errorsOf(report.issues, "CYCLE");
    expect(cycles.length).toBeGreaterThanOrEqual(1);
    const path = cycles[0].path;
    expect(path).toBeDefined();
    expect(path![0]).toBe(path![path!.length - 1]); // closed loop
    expect(path).toContain("A");
    expect(path).toContain("B");
  });

  it("MISSING_STANDARDS — empty standards.ccss", () => {
    const g = makeGraph();
    g.nodes[1].standards.ccss = [];
    const report = validateGraph(g);
    const missing = errorsOf(report.issues, "MISSING_STANDARDS");
    expect(missing).toHaveLength(1);
    expect(missing[0].nodeId).toBe("B");
  });

  it("MISSING_HOOK — absent and whitespace-only sport hooks", () => {
    const g = makeGraph();
    delete (g.nodes[0].contextHooks as Record<string, string>).volleyball;
    (g.nodes[1].contextHooks as Record<string, string>).neutral = "   ";
    const report = validateGraph(g);
    const missing = errorsOf(report.issues, "MISSING_HOOK");
    expect(missing).toHaveLength(2);
    expect(missing.some((i) => i.nodeId === "A" && i.message.includes("volleyball"))).toBe(true);
    expect(missing.some((i) => i.nodeId === "B" && i.message.includes("neutral"))).toBe(true);
  });

  it("PROBLEM_MISMATCH — sport-flavored p3 problem is rejected (neutral-transfer rule)", () => {
    const g = makeGraph();
    g.nodes[0].problems.p3.push(makeProblem("P-p3-bad", "A", 3, "baseball"));
    const report = validateGraph(g);
    const mismatches = errorsOf(report.issues, "PROBLEM_MISMATCH");
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].message).toContain("must be neutral");
  });

  it("PROBLEM_MISMATCH — wrong phase for bucket and wrong skillId", () => {
    const g = makeGraph();
    g.nodes[0].problems.p1.push(makeProblem("P-phase", "A", 2, "baseball")); // phase ≠ bucket
    g.nodes[0].problems.p2.push(makeProblem("P-skill", "B", 2, "baseball")); // skillId ≠ owner
    const report = validateGraph(g);
    const mismatches = errorsOf(report.issues, "PROBLEM_MISMATCH");
    expect(mismatches).toHaveLength(2);
  });

  it("TIER_MISMATCH — node tier differs from its domain tier", () => {
    const g = makeGraph();
    g.nodes[1].tier = 5;
    const report = validateGraph(g);
    const mismatches = errorsOf(report.issues, "TIER_MISMATCH");
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].nodeId).toBe("B");
  });

  it("UNKNOWN_MISCONCEPTION_TAG — node tag missing from registry; problem map value missing from node tags", () => {
    const g = makeGraph();
    g.nodes[1].misconceptionTags.push("ghost-tag");
    g.nodes[0].problems.p1.push(
      makeProblem("P-map", "A", 1, "baseball", { "3": "not-on-this-node" }),
    );
    const report = validateGraph(g);
    const unknown = errorsOf(report.issues, "UNKNOWN_MISCONCEPTION_TAG");
    expect(unknown).toHaveLength(2);
    expect(unknown.some((i) => i.message.includes('"ghost-tag"'))).toBe(true);
    expect(unknown.some((i) => i.message.includes('"not-on-this-node"'))).toBe(true);
  });

  it("UNKNOWN_MISCONCEPTION_TAG — unused registry entries are warnings, not errors", () => {
    const g = makeGraph();
    g.misconceptionRegistry.push({ id: "never-used", description: "Unused." });
    const report = validateGraph(g);
    expect(report.valid).toBe(true); // warnings don't invalidate
    const warnings = report.issues.filter(
      (i) => i.severity === "warning" && i.code === "UNKNOWN_MISCONCEPTION_TAG",
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('"never-used"');
  });

  // -------------------------------------------------------------------------
  // LB3 — choice integrity + kind↔widget contract (PROBLEM_MISMATCH).
  // -------------------------------------------------------------------------

  const validChoice = () => ({
    answer: { kind: "choice", value: "no solution" },
    choices: ["one solution", "no solution", "infinitely many solutions"],
  });

  it("PROBLEM_MISMATCH — a well-formed choice item passes", () => {
    const g = makeGraph();
    g.nodes[0].problems.p1.push(
      makeProblem("P-ch-ok", "A", 1, "baseball", undefined, validChoice()),
    );
    const report = validateGraph(g);
    expect(errorsOf(report.issues, "PROBLEM_MISMATCH")).toHaveLength(0);
  });

  it("PROBLEM_MISMATCH — choice with no choices[] fails", () => {
    const g = makeGraph();
    g.nodes[0].problems.p1.push(
      makeProblem("P-ch-none", "A", 1, "baseball", undefined, {
        answer: { kind: "choice", value: "no solution" },
      }),
    );
    const mismatches = errorsOf(validateGraph(g).issues, "PROBLEM_MISMATCH");
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].message).toContain("at least 2 strings");
  });

  it("PROBLEM_MISMATCH — choice with fewer than 2 choices fails", () => {
    const g = makeGraph();
    g.nodes[0].problems.p1.push(
      makeProblem("P-ch-short", "A", 1, "baseball", undefined, {
        answer: { kind: "choice", value: "no solution" },
        choices: ["no solution"],
      }),
    );
    const mismatches = errorsOf(validateGraph(g).issues, "PROBLEM_MISMATCH");
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].message).toContain("at least 2 strings");
  });

  it("PROBLEM_MISMATCH — choice whose answer.value is not in choices fails", () => {
    const g = makeGraph();
    g.nodes[0].problems.p1.push(
      makeProblem("P-ch-val", "A", 1, "baseball", undefined, {
        answer: { kind: "choice", value: "two solutions" },
        choices: ["one solution", "no solution"],
      }),
    );
    const mismatches = errorsOf(validateGraph(g).issues, "PROBLEM_MISMATCH");
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].message).toContain("is not one of its choices");
  });

  it("PROBLEM_MISMATCH — duplicate choices fail", () => {
    const g = makeGraph();
    g.nodes[0].problems.p1.push(
      makeProblem("P-ch-dup", "A", 1, "baseball", undefined, {
        answer: { kind: "choice", value: "no solution" },
        choices: ["no solution", "no solution", "one solution"],
      }),
    );
    const mismatches = errorsOf(validateGraph(g).issues, "PROBLEM_MISMATCH");
    expect(mismatches.some((i) => i.message.includes("duplicate choices"))).toBe(true);
  });

  it("PROBLEM_MISMATCH — all-correct (no distractor) fails", () => {
    const g = makeGraph();
    g.nodes[0].problems.p1.push(
      makeProblem("P-ch-allcorrect", "A", 1, "baseball", undefined, {
        answer: { kind: "choice", value: "no solution" },
        choices: ["no solution", "no solution"],
      }),
    );
    const mismatches = errorsOf(validateGraph(g).issues, "PROBLEM_MISMATCH");
    // duplicate AND no-distractor both fire here — both are integrity errors.
    expect(mismatches.some((i) => i.message.includes("no distractor"))).toBe(true);
  });

  it("PROBLEM_MISMATCH — misconceptionMap key not among choices fails", () => {
    const g = makeGraph();
    g.nodes[0].problems.p1.push(
      makeProblem(
        "P-ch-mapkey",
        "A",
        1,
        "baseball",
        { "two solutions": "tag-a" },
        {
          answer: { kind: "choice", value: "no solution" },
          choices: ["one solution", "no solution", "infinitely many solutions"],
        },
      ),
    );
    const mismatches = errorsOf(validateGraph(g).issues, "PROBLEM_MISMATCH");
    expect(mismatches.some((i) => i.message.includes("is not one of its choices"))).toBe(true);
  });

  it("PROBLEM_MISMATCH — misconceptionMap key equal to answer.value fails", () => {
    const g = makeGraph();
    g.nodes[0].problems.p1.push(
      makeProblem(
        "P-ch-mapself",
        "A",
        1,
        "baseball",
        { "no solution": "tag-a" },
        {
          answer: { kind: "choice", value: "no solution" },
          choices: ["one solution", "no solution"],
        },
      ),
    );
    const mismatches = errorsOf(validateGraph(g).issues, "PROBLEM_MISMATCH");
    expect(mismatches.some((i) => i.message.includes("equals answer.value"))).toBe(true);
  });

  it("PROBLEM_MISMATCH — an unknown answer.kind fails (kind↔widget contract)", () => {
    const g = makeGraph();
    g.nodes[0].problems.p1.push(
      makeProblem("P-kind", "A", 1, "baseball", undefined, {
        answer: { kind: "freeform", value: "anything" },
      }),
    );
    const mismatches = errorsOf(validateGraph(g).issues, "PROBLEM_MISMATCH");
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].message).toContain("unknown answer.kind");
  });

  it("stats — roots, leaves, maxDepth", () => {
    const g = makeGraph();
    g.nodes.push(makeNode("C", ["B"]));
    g.edges.push({ from: "B", to: "C" });
    const report = validateGraph(g);
    expect(report.stats).toEqual({
      nodes: 3,
      edges: 2,
      domains: 1,
      roots: ["A"],
      leaves: 1,
      maxDepth: 2,
    });
  });
});
