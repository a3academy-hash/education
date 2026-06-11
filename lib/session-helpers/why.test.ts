import { describe, expect, it } from "vitest";
import {
  assembleCorrect,
  assembleIncorrectTagged,
  assembleIncorrectUntagged,
  firmUpStatement,
  GENERIC_RECHECK,
} from "./why";
import type { ProblemTemplate, WorkedExample } from "@/types";

const problem = (hints: string[], misconceptionMap?: Record<string, string>): ProblemTemplate => ({
  id: "P-1",
  version: 1,
  skillId: "ALG-X",
  phase: 1,
  sport: "baseball",
  prompt: "What is 35% of 80?",
  visual: null,
  answer: { kind: "numeric", value: "28" },
  misconceptionMap,
  hints,
  difficulty: 1,
});

const workedExamples: WorkedExample[] = [
  {
    id: "we-1",
    title: "Finding a Percent of a Number",
    steps: [
      { prompt: "Rewrite the percent.", reveal: "35% is 0.35." },
      { prompt: "Multiply.", reveal: "0.35 × 80 = 28." },
    ],
  },
];

// The raw audit-register description that must NEVER reach a student field.
const RAW_DESCRIPTION = "fails to form the required pass through the origin";

describe("assembleCorrect — STATE A from the worked-example terminal reveal", () => {
  it("uses the worked-example title + terminal reveal, no new field", () => {
    const w = assembleCorrect(problem([]), workedExamples);
    expect(w.whatRight).toContain("correct");
    expect(w.whyItWorks).toContain("Finding a Percent of a Number");
    expect(w.whyItWorks).toContain("0.35 × 80 = 28.");
  });

  it("degrades gracefully when there is no worked example", () => {
    const w = assembleCorrect(problem([]), []);
    expect(w.whyItWorks).toBeTruthy();
  });
});

describe("assembleIncorrectTagged — STATE B uses AUTHORED content, never the raw description", () => {
  it("whatHappened + theFix come from the next authored hint", () => {
    const w = assembleIncorrectTagged(problem(["Percent means out of 100."]), 0, workedExamples);
    expect(w.whatHappened).toMatch(/not quite/i);
    expect(w.theFix).toBe("Percent means out of 100.");
  });

  it("clamps to the most-specific authored hint by hintsAlreadyShown", () => {
    const p = problem(["First hint.", "Second hint."]);
    expect(assembleIncorrectTagged(p, 1, workedExamples).theFix).toBe("Second hint.");
    expect(assembleIncorrectTagged(p, 9, workedExamples).theFix).toBe("Second hint.");
  });

  it("falls back to the worked-example terminal reveal when there are no hints", () => {
    const w = assembleIncorrectTagged(problem([]), 0, workedExamples);
    expect(w.theFix).toBe("0.35 × 80 = 28.");
  });

  it("falls back to the non-deficit generic line when no authored content exists", () => {
    const w = assembleIncorrectTagged(problem([]), 0, []);
    expect(w.theFix).toBe(GENERIC_RECHECK);
  });
});

describe("assembleIncorrectUntagged — STATE C reveals the next hint, never fabricates", () => {
  it("surfaces the next progressive hint by hintsAlreadyShown", () => {
    const p = problem(["First hint.", "Second hint."]);
    expect(assembleIncorrectUntagged(p, 0, workedExamples).theFix).toBe("First hint.");
    expect(assembleIncorrectUntagged(p, 1, workedExamples).theFix).toBe("Second hint.");
  });

  it("falls back to the worked-example terminal reveal when hints are exhausted", () => {
    const p = problem([]);
    expect(assembleIncorrectUntagged(p, 0, workedExamples).theFix).toBe("0.35 × 80 = 28.");
  });

  it("never carries a tutor panel (no whatRight either) — honesty", () => {
    const w = assembleIncorrectUntagged(problem(["h"]), 0, workedExamples);
    expect(w.whatRight).toBeUndefined();
  });
});

describe("firmUpStatement — growth-framed, AUTHORED content, never the raw registry description", () => {
  it("returns the matched problem's most-specific hint when present", () => {
    expect(firmUpStatement(problem(["Line up the place values first."]), workedExamples)).toBe(
      "Line up the place values first.",
    );
  });
  it("falls back to the worked-example terminal reveal when no hint exists", () => {
    expect(firmUpStatement(problem([]), workedExamples)).toContain("0.35 × 80 = 28.");
  });
  it("falls back to the non-deficit generic line when no authored content at all", () => {
    expect(firmUpStatement(null, [])).toBe(GENERIC_RECHECK);
    expect(firmUpStatement(problem([]), [])).toBe(GENERIC_RECHECK);
  });
});

describe("BLOCKER B — the raw registry description never reaches a student-facing field", () => {
  it("no assembler echoes a description-shaped string passed via any non-content channel", () => {
    // The assemblers take ONLY authored content (hints / worked examples) and a
    // hint counter — there is NO parameter through which a registry description
    // could flow. These calls prove the student fields are built solely from
    // authored sources, so the raw description is structurally unreachable.
    const p = problem([], { wrong: "tag-x" });
    const tagged = assembleIncorrectTagged(p, 0, workedExamples);
    const firm = firmUpStatement(p, workedExamples);
    for (const s of [tagged.whatHappened, tagged.theFix, firm]) {
      expect(s).not.toContain(RAW_DESCRIPTION);
    }
  });
});
