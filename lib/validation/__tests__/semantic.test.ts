import { describe, expect, it } from "vitest";
import {
  canon,
  numeralMultiset,
  opSet,
  skeleton,
  validateSemantics,
  SPORT_LEXICON,
} from "../semantic";
import realGraph from "../../../data/algebra1-graph.json";

// ---------------------------------------------------------------------------
// Helper types matching the raw shape validateSemantics accepts.
// ---------------------------------------------------------------------------

type RawStep = { prompt: string; reveal: string };
type RawWE = { id: string; title: string; steps: RawStep[] };
type RawProblem = {
  id: string;
  skillId: string;
  phase: number;
  sport: string;
  prompt: string;
  answer: { kind: string; value: string };
  hints: string[];
  difficulty: 1 | 2 | 3;
  misconceptionMap?: Record<string, string>;
};
type RawNode = {
  id: string;
  workedExamples: RawWE[];
  problems: { p1: RawProblem[]; p2: RawProblem[]; p3: RawProblem[] };
};

function makeNode(id: string, partial: Partial<RawNode> = {}): RawNode {
  return {
    id,
    workedExamples: [],
    problems: { p1: [], p2: [], p3: [] },
    ...partial,
  };
}

function makeProblem(
  id: string,
  skillId: string,
  phase: 1 | 2 | 3,
  sport: string,
  prompt: string,
  answer = "42",
  hints: string[] = [],
  misconceptionMap?: Record<string, string>,
): RawProblem {
  return {
    id,
    skillId,
    phase,
    sport,
    prompt,
    answer: { kind: "numeric", value: answer },
    hints,
    difficulty: 1,
    ...(misconceptionMap ? { misconceptionMap } : {}),
  };
}

function makeWE(id: string, title: string, steps: RawStep[]): RawWE {
  return { id, title, steps };
}

// ---------------------------------------------------------------------------
// canon / helpers unit tests
// ---------------------------------------------------------------------------

describe("canon helper", () => {
  it("lowercases text", () => {
    expect(canon("Hello World")).toBe("hello world");
  });

  it("converts superscript digits to ^n notation", () => {
    // The 5³ case from the regression fixture
    expect(canon("5³")).toBe("5^3");
    expect(canon("x²")).toBe("x^2");
    expect(canon("10⁰")).toBe("10^0");
  });

  it("converts U+2212 minus sign", () => {
    expect(canon("−4 + 7")).toBe("-4 + 7");
  });

  it("converts multiplication variants", () => {
    expect(canon("3·4")).toBe("3*4");
    expect(canon("3×4")).toBe("3*4");
    expect(canon("3⋅4")).toBe("3*4");
  });

  it("converts division symbol", () => {
    expect(canon("10÷2")).toBe("10/2");
  });

  it("collapses whitespace", () => {
    expect(canon("  a   b  ")).toBe("a b");
  });
});

describe("numeralMultiset", () => {
  it("extracts and sorts numerals", () => {
    expect(numeralMultiset("5^3 equals 125")).toBe("125,3,5");
  });

  it("returns empty string for no numerals", () => {
    expect(numeralMultiset("no numbers here")).toBe("");
  });
});

describe("opSet", () => {
  it("detects present operators in fixed order", () => {
    expect(opSet("3 + 4 = 7")).toBe("+=");
    expect(opSet("x^2 - 4")).toBe("-^");
    expect(opSet("a * b / c")).toBe("*/");
  });

  it("returns empty for no operators", () => {
    expect(opSet("hello world")).toBe("");
  });
});

describe("SPORT_LEXICON", () => {
  it("matches sport words at word boundaries", () => {
    SPORT_LEXICON.lastIndex = 0;
    const m = "baseball team scored 3 goals".match(SPORT_LEXICON);
    // Should match: baseball, team, scored, goals
    expect(m).not.toBeNull();
    expect(m!.length).toBeGreaterThanOrEqual(1);
  });

  it("does not match partial words (word boundary)", () => {
    SPORT_LEXICON.lastIndex = 0;
    const m = "baseballer".match(SPORT_LEXICON);
    // 'baseballer' should not match 'baseball' because of word boundary
    expect(m).toBeNull();
  });
});

describe("skeleton", () => {
  it("replaces numerals with # and sport words with @", () => {
    const s = skeleton("a baseball team scored 3 goals");
    // numerals → #, baseball/team/scored/goals all should become @
    expect(s).not.toMatch(/\d/);
    expect(s).not.toMatch(/baseball|team|scored|goal/i);
    expect(s).toContain("#");
    expect(s).toContain("@");
  });

  it("is idempotent w.r.t. canon — does not re-expand", () => {
    const s1 = skeleton("5³ + 3");
    const s2 = skeleton("5^3 + 3");
    // After canon both become '5^3 + 3' → same skeleton
    expect(s1).toBe(s2);
  });
});

// ---------------------------------------------------------------------------
// RULE 1 — DUP_WORKED_EXAMPLE
// ---------------------------------------------------------------------------

describe("Rule 1 — DUP_WORKED_EXAMPLE", () => {
  // 5³ REGRESSION FIXTURE (verbatim spec):
  // Two WEs both evaluating 5³, second reworded → must produce DUP_WORKED_EXAMPLE Tier A warning.
  it("5³ regression: two WEs with same operand signature (Tier A) → warning", () => {
    const we1 = makeWE("we-01", "Evaluate 5³", [
      {
        prompt: "What does 5³ mean?",
        reveal: "5³ means 5 × 5 × 5. Multiply it out: 5 × 5 = 25, then 25 × 5 = 125.",
      },
    ]);
    // Second WE: reworded but same operand signature (title contains 5³, step[0].prompt contains 5³)
    const we2 = makeWE("we-02", "Computing 5³ step by step", [
      {
        prompt: "Calculate 5³ using repeated multiplication.",
        reveal:
          "5³ = 5 × 5 × 5. First multiply 5 × 5 = 25, then 25 × 5 = 125. The exponent tells you how many times to use 5 as a factor.",
      },
    ]);
    const node = makeNode("TEST-01", { workedExamples: [we1, we2] });
    const issues = validateSemantics([node]);
    const dupWE = issues.filter((i) => i.code === "DUP_WORKED_EXAMPLE");
    expect(dupWE.length).toBeGreaterThanOrEqual(1);
    const tierAWarning = dupWE.find((i) => i.severity === "warning");
    expect(tierAWarning).toBeDefined();
    expect(tierAWarning?.items).toEqual(["we-01", "we-02"]);
  });

  it("Tier B (error): two WEs with identical full-trace fingerprint", () => {
    const steps: RawStep[] = [
      { prompt: "Find 3 + 4.", reveal: "3 + 4 = 7. Add the two numbers." },
    ];
    const we1 = makeWE("we-a", "Adding 3 and 4", steps);
    const we2 = makeWE("we-b", "Sum of 3 and 4", steps); // identical steps
    const node = makeNode("TEST-02", { workedExamples: [we1, we2] });
    const issues = validateSemantics([node]);
    const errors = issues.filter((i) => i.code === "DUP_WORKED_EXAMPLE" && i.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].items).toEqual(["we-a", "we-b"]);
  });

  it("two distinct WEs with different operands do NOT flag", () => {
    const we1 = makeWE("we-x", "Evaluate 2³", [
      { prompt: "What is 2³?", reveal: "2³ = 8." },
    ]);
    const we2 = makeWE("we-y", "Evaluate 3⁴", [
      { prompt: "What is 3⁴?", reveal: "3⁴ = 81." },
    ]);
    const node = makeNode("TEST-03", { workedExamples: [we1, we2] });
    const issues = validateSemantics([node]);
    expect(issues.filter((i) => i.code === "DUP_WORKED_EXAMPLE")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// RULE 2 — NEAR_DUP_PROMPT
// ---------------------------------------------------------------------------

describe("Rule 2 — NEAR_DUP_PROMPT", () => {
  it("cross-sport parallel-form pair does NOT flag", () => {
    // Two problems with same numerals + skeleton but different sports
    const p1 = makeProblem(
      "P-baseball-01",
      "SKILL",
      1,
      "baseball",
      "A baseball team scored 3 runs and conceded 7. What is the net run differential?",
    );
    const p2 = makeProblem(
      "P-soccer-01",
      "SKILL",
      1,
      "soccer",
      "A soccer team scored 3 goals and conceded 7. What is the net goal differential?",
    );
    const node = makeNode("TEST-10", {
      problems: { p1: [p1, p2], p2: [], p3: [] },
    });
    const issues = validateSemantics([node]);
    const nearDup = issues.filter((i) => i.code === "NEAR_DUP_PROMPT");
    expect(nearDup).toHaveLength(0);
  });

  it("neutral P1 == P3 pair (fake transfer) MUST flag NEAR_DUP_PROMPT", () => {
    // Same prompt text, both neutral, one in p1 and one in p3
    const prompt =
      "A bank balance starts at -4 dollars. After a deposit of 7 dollars, what is the balance?";
    const pA = makeProblem("P-neutral-p1", "SKILL", 1, "neutral", prompt, "3");
    const pC = makeProblem("P-neutral-p3", "SKILL", 3, "neutral", prompt, "3");
    const node = makeNode("TEST-11", {
      problems: { p1: [pA], p2: [], p3: [pC] },
    });
    const issues = validateSemantics([node]);
    const nearDup = issues.filter((i) => i.code === "NEAR_DUP_PROMPT");
    expect(nearDup.length).toBeGreaterThanOrEqual(1);
    const pair = nearDup[0];
    expect(pair.items).toEqual(["P-neutral-p1", "P-neutral-p3"]);
    expect(pair.severity).toBe("warning");
  });

  it("same-sport same-phase pair with identical skeleton flags", () => {
    // Two baseball problems with the same numerals AND the same structural skeleton.
    // Both prompts: same structure, same operand numbers — only minor word variation
    // that leaves them with identical numeralMultiset+skeleton keys.
    const sharedPrompt = "Solve for x: 3x + 5 = 11.";
    const p1 = makeProblem("P-bb-01", "SKILL", 1, "baseball", sharedPrompt, "2");
    const p2 = makeProblem("P-bb-02", "SKILL", 1, "baseball", sharedPrompt, "2");
    const node = makeNode("TEST-12", {
      problems: { p1: [p1, p2], p2: [], p3: [] },
    });
    const issues = validateSemantics([node]);
    const nearDup = issues.filter((i) => i.code === "NEAR_DUP_PROMPT");
    expect(nearDup.length).toBeGreaterThanOrEqual(1);
    expect(nearDup[0].items).toEqual(["P-bb-01", "P-bb-02"]);
  });
});

// ---------------------------------------------------------------------------
// RULE 3 — REUSED_TEXT
// ---------------------------------------------------------------------------

describe("Rule 3 — REUSED_TEXT", () => {
  it("generic shared hint (no operand numerals after removing concept constants) does NOT flag", () => {
    // Hint contains only concept constants 0 and 1 — genericity exemption
    const hint = "A negative times a negative equals a positive. Remember the sign rules.";
    const p1 = makeProblem("P-gen-01", "SKILL", 1, "baseball", "Compute −3 × −2.", "6", [hint]);
    const p2 = makeProblem("P-gen-02", "SKILL", 1, "softball", "Compute −5 × −4.", "20", [hint]);
    const node = makeNode("TEST-20", {
      problems: { p1: [p1, p2], p2: [], p3: [] },
    });
    const issues = validateSemantics([node]);
    expect(issues.filter((i) => i.code === "REUSED_TEXT")).toHaveLength(0);
  });

  it("stale numeral-bearing hint shared across problems where numerals don't appear in host MUST flag", () => {
    // hint references the number 25 — which appears in p2 (a different problem) but NOT in p1
    const staleHint = "d = 25 > 0, so two real solutions.";
    // p1: host problem whose numerals (4, 9) don't include 25
    const p1 = makeProblem(
      "P-host-01",
      "SKILL",
      1,
      "baseball",
      "Solve x² + 4x + 9 = 0.",
      "x=-2",
      [staleHint],
    );
    // p2: another problem that also carries the same hint; its numerals include 25
    const p2 = makeProblem(
      "P-host-02",
      "SKILL",
      1,
      "softball",
      "Solve x² - 10x + 25 = 0.",
      "5",
      [staleHint],
    );
    const node = makeNode("TEST-21", {
      problems: { p1: [p1, p2], p2: [], p3: [] },
    });
    const issues = validateSemantics([node]);
    const reused = issues.filter((i) => i.code === "REUSED_TEXT");
    // p1 (the host) should be flagged because 25 from the hint doesn't appear in p1's context
    expect(reused.length).toBeGreaterThanOrEqual(1);
    const hostFlag = reused.find((i) => i.items?.[0] === "P-host-01");
    expect(hostFlag).toBeDefined();
    expect(hostFlag?.severity).toBe("warning");
  });

  it("hint NOT shared (only one problem uses it) does NOT flag", () => {
    const hint = "Remember: the base is 7 and the exponent is 3.";
    const p1 = makeProblem("P-solo-01", "SKILL", 1, "neutral", "Compute 7³.", "343", [hint]);
    const node = makeNode("TEST-22", {
      problems: { p1: [p1], p2: [], p3: [] },
    });
    const issues = validateSemantics([node]);
    expect(issues.filter((i) => i.code === "REUSED_TEXT")).toHaveLength(0);
  });

  it("verbatim reveal shared across two different WEs flags REUSED_TEXT", () => {
    const sharedReveal = "Multiply both sides by the reciprocal: 3/4 × 4/3 = 1.";
    const we1 = makeWE("WE-r01", "Solving with fractions A", [
      { prompt: "Solve (3/4)x = 6.", reveal: sharedReveal },
    ]);
    const we2 = makeWE("WE-r02", "Solving with fractions B", [
      { prompt: "Solve (3/4)y = 9.", reveal: sharedReveal },
    ]);
    const node = makeNode("TEST-23", { workedExamples: [we1, we2] });
    const issues = validateSemantics([node]);
    const reused = issues.filter((i) => i.code === "REUSED_TEXT");
    expect(reused.length).toBeGreaterThanOrEqual(1);
    const issue = reused[0];
    expect(issue.items?.sort()).toEqual(["WE-r01", "WE-r02"].sort());
    expect(issue.severity).toBe("warning");
  });
});

// ---------------------------------------------------------------------------
// Real graph snapshot — regression guard
// ---------------------------------------------------------------------------

describe("validateSemantics — real data/algebra1-graph.json snapshot", () => {
  // Cast to the loose type validateSemantics accepts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issues = validateSemantics((realGraph as any).nodes);

  it("has exactly 0 DUP_WORKED_EXAMPLE issues (all tiers)", () => {
    const count = issues.filter((i) => i.code === "DUP_WORKED_EXAMPLE").length;
    expect(count).toBe(0);
  });

  it("has exactly 0 NEAR_DUP_PROMPT issues (A2 re-authoring cleared the dedup defects)", () => {
    const count = issues.filter((i) => i.code === "NEAR_DUP_PROMPT").length;
    expect(count).toBe(0);
  });

  it("has exactly 2 REUSED_TEXT issues (remaining are intentionally-generic conceptual hints)", () => {
    const count = issues.filter((i) => i.code === "REUSED_TEXT").length;
    expect(count).toBe(2);
  });

  it("DUP_WORKED_EXAMPLE errors = 0 (regression lock: this would block a release)", () => {
    const errors = issues.filter(
      (i) => i.code === "DUP_WORKED_EXAMPLE" && i.severity === "error",
    );
    expect(errors).toHaveLength(0);
  });

  it("all semantic issues are warnings (no errors from NEAR_DUP or REUSED_TEXT)", () => {
    const semanticErrors = issues.filter(
      (i) =>
        (i.code === "NEAR_DUP_PROMPT" || i.code === "REUSED_TEXT") && i.severity === "error",
    );
    expect(semanticErrors).toHaveLength(0);
  });

  // --- Phase 8 / B §G visual rules (baseline lock) ---

  it("flags 0 VISUAL_KIND_DRIFT warnings (B2 content pass nulled the 184 drift visuals)", () => {
    const drift = issues.filter((i) => i.code === "VISUAL_KIND_DRIFT");
    expect(drift).toHaveLength(0);
  });

  it("flags 0 VISUAL_DECORATION warnings (B2 content pass stripped/authored the 1535 leftovers)", () => {
    const deco = issues.filter((i) => i.code === "VISUAL_DECORATION");
    expect(deco).toHaveLength(0);
  });

  it("has zero VISUAL_SPEC_MISMATCH / VISUAL_ANSWER_LEAK (every authored spec is kind-aligned and leak-free)", () => {
    expect(issues.filter((i) => i.code === "VISUAL_SPEC_MISMATCH")).toHaveLength(0);
    expect(issues.filter((i) => i.code === "VISUAL_ANSWER_LEAK")).toHaveLength(0);
  });

  it("no visual rule emits an error against the shipped graph (build stays green)", () => {
    const visualErrors = issues.filter(
      (i) =>
        (i.code === "VISUAL_KIND_DRIFT" ||
          i.code === "VISUAL_DECORATION" ||
          i.code === "VISUAL_SPEC_MISMATCH" ||
          i.code === "VISUAL_ANSWER_LEAK") &&
        i.severity === "error",
    );
    expect(visualErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Phase 8 / B §G — crafted fixtures for the visual rules
// ---------------------------------------------------------------------------

describe("Rule 4 — visual spec rules (crafted)", () => {
  type RawAny = Record<string, unknown>;
  const nodeWith = (problems: RawAny[]): RawAny =>
    ({
      id: "VIS-01",
      workedExamples: [],
      problems: { p1: problems, p2: [], p3: [] },
    });

  it("VISUAL_KIND_DRIFT — a drift `visual` (scatter) flags a warning", () => {
    const node = nodeWith([
      { id: "P-drift", phase: 1, sport: "neutral", prompt: "x", visual: "scatter", answer: { kind: "numeric", value: "1" }, hints: [] },
    ]);
    const issues = validateSemantics([node as never]);
    const drift = issues.filter((i) => i.code === "VISUAL_KIND_DRIFT");
    expect(drift).toHaveLength(1);
    expect(drift[0].severity).toBe("warning");
    expect(drift[0].items).toEqual(["P-drift"]);
  });

  it("VISUAL_SPEC_MISMATCH — spec.kind ≠ visual is an error", () => {
    const node = nodeWith([
      {
        id: "P-mismatch",
        phase: 1,
        sport: "neutral",
        prompt: "x",
        visual: "coordinate",
        visualSpec: { kind: "numberline", mode: "display", range: { min: 0, max: 5 } },
        answer: { kind: "numeric", value: "1" },
        hints: [],
      },
    ]);
    const issues = validateSemantics([node as never]);
    const mismatch = issues.filter((i) => i.code === "VISUAL_SPEC_MISMATCH");
    expect(mismatch).toHaveLength(1);
    expect(mismatch[0].severity).toBe("error");
  });

  it("VISUAL_ANSWER_LEAK — interactive coordinate spec plotting the answer is an error", () => {
    const node = nodeWith([
      {
        id: "P-leak",
        phase: 1,
        sport: "neutral",
        prompt: "Plot the point",
        visual: "coordinate",
        visualSpec: {
          kind: "coordinate",
          mode: "interactive",
          points: [{ x: 4, y: 2 }],
        },
        answer: { kind: "coordinate", value: "(4, 2)" },
        hints: [],
      },
    ]);
    const issues = validateSemantics([node as never]);
    const leak = issues.filter((i) => i.code === "VISUAL_ANSWER_LEAK");
    expect(leak).toHaveLength(1);
    expect(leak[0].severity).toBe("error");
  });

  it("VISUAL_ANSWER_LEAK — interactive coordinate with only CONTEXT points is clean", () => {
    const node = nodeWith([
      {
        id: "P-ok",
        phase: 1,
        sport: "neutral",
        prompt: "Plot the point",
        visual: "coordinate",
        visualSpec: {
          kind: "coordinate",
          mode: "interactive",
          points: [{ x: 0, y: 0 }],
        },
        answer: { kind: "coordinate", value: "(4, 2)" },
        hints: [],
      },
    ]);
    const issues = validateSemantics([node as never]);
    expect(issues.filter((i) => i.code === "VISUAL_ANSWER_LEAK")).toHaveLength(0);
  });

  it("VISUAL_DECORATION — renderable visual, no spec, numeric answer is a warning", () => {
    const node = nodeWith([
      { id: "P-deco", phase: 1, sport: "neutral", prompt: "x", visual: "coordinate", answer: { kind: "numeric", value: "1" }, hints: [] },
    ]);
    const issues = validateSemantics([node as never]);
    const deco = issues.filter((i) => i.code === "VISUAL_DECORATION");
    expect(deco).toHaveLength(1);
    expect(deco[0].severity).toBe("warning");
  });

  it("VISUAL_DECORATION — null visual is never decoration", () => {
    const node = nodeWith([
      { id: "P-null", phase: 1, sport: "neutral", prompt: "x", visual: null, answer: { kind: "numeric", value: "1" }, hints: [] },
    ]);
    const issues = validateSemantics([node as never]);
    expect(issues.filter((i) => i.code === "VISUAL_DECORATION")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: validateGraph still passes valid=true with semantic warnings
// ---------------------------------------------------------------------------

describe("validateGraph integration — semantic warnings do not invalidate", () => {
  it("report.valid stays true even when NEAR_DUP_PROMPT warnings are present", async () => {
    // Import lazily to avoid circular-ish initialization in test runner
    const { validateGraph } = await import("../index");
    const report = validateGraph(realGraph);
    // Structural pass + semantic pass both run; no errors expected
    expect(report.valid).toBe(true);
    const semanticWarnings = report.issues.filter(
      (i) =>
        i.code === "NEAR_DUP_PROMPT" || i.code === "REUSED_TEXT" || i.code === "DUP_WORKED_EXAMPLE",
    );
    expect(semanticWarnings.length).toBeGreaterThan(0);
  });
});
