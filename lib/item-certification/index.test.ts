import { describe, expect, it } from "vitest";
import {
  certify, equivalenceClassOf, maskNumbers, calculatorFlagFor, detectDuplicates, answerAsResponse,
} from "./index";
import type { ProblemTemplate } from "@/types";

function problem(o: Partial<ProblemTemplate> & Pick<ProblemTemplate, "answer">): ProblemTemplate {
  return {
    id: o.id ?? "p-1", version: o.version ?? 1, skillId: o.skillId ?? "ALG-F04",
    phase: o.phase ?? 1, sport: o.sport ?? "neutral", prompt: o.prompt ?? "Evaluate 4^2.",
    visual: o.visual ?? null, choices: o.choices, answer: o.answer,
    misconceptionMap: o.misconceptionMap, hints: o.hints ?? [], difficulty: o.difficulty ?? 1,
  };
}

describe("certify — well-formedness + round-trip + choice-integrity (no prose re-derivation)", () => {
  it("certifies a well-formed numeric item whose stated answer round-trips", () => {
    const r = certify(problem({ answer: { kind: "numeric", value: "16" } }));
    expect(r.certified).toBe(true);
    expect(r.flags).toEqual([]);
  });

  it("flags an empty numeric answer", () => {
    const r = certify(problem({ answer: { kind: "numeric", value: "  " } }));
    expect(r.certified).toBe(false);
    expect(r.flags.join(" ")).toContain("empty");
  });

  it("certifies a clean choice item", () => {
    const r = certify(problem({
      answer: { kind: "choice", value: "64" }, choices: ["8", "16", "64", "12"],
    }));
    expect(r.certified).toBe(true);
  });

  it("flags a choice answer not among the choices", () => {
    const r = certify(problem({
      answer: { kind: "choice", value: "99" }, choices: ["8", "16", "64"],
    }));
    expect(r.certified).toBe(false);
    expect(r.flags.join(" ")).toContain("not among the choices");
  });

  it("flags duplicate choices and a non-choice item carrying choices[]", () => {
    expect(certify(problem({ answer: { kind: "choice", value: "1" }, choices: ["1", "1", "2"] }))
      .flags.join(" ")).toContain("duplicate");
    expect(certify(problem({ answer: { kind: "numeric", value: "1" }, choices: ["1", "2"] }))
      .flags.join(" ")).toContain("carries a choices[]");
  });

  it("numeric-set: certifies a well-formed set, flags a blank member", () => {
    expect(certify(problem({ answer: { kind: "numeric-set", values: ["2", "-3"] } })).certified).toBe(true);
    expect(certify(problem({ answer: { kind: "numeric-set", values: ["2", " "] } })).certified).toBe(false);
  });

  it("malformed numeric-set (non-array values) FLAGS, never throws", () => {
    const bad = problem({ answer: { kind: "numeric-set", values: undefined as unknown as string[] } });
    expect(() => certify(bad)).not.toThrow();
    expect(certify(bad).certified).toBe(false);
  });
});

describe("equivalenceClassOf — structural family with discriminators", () => {
  it("groups number-swapped variants of the same structure", () => {
    const a = problem({ skillId: "ALG-F04", prompt: "Evaluate 4^2.", answer: { kind: "numeric", value: "16" } });
    const b = problem({ skillId: "ALG-F04", prompt: "Evaluate 7^2.", answer: { kind: "numeric", value: "49" } });
    expect(equivalenceClassOf(a)).toBe(equivalenceClassOf(b));
  });

  it("does NOT merge same-skeleton items that differ by difficulty or answer-kind (false-positive guard)", () => {
    const easy = problem({ prompt: "Solve x + 3 = 5.", difficulty: 1, answer: { kind: "numeric", value: "2" } });
    const hard = problem({ prompt: "Solve x + 9 = 4.", difficulty: 3, answer: { kind: "numeric", value: "-5" } });
    expect(equivalenceClassOf(easy)).not.toBe(equivalenceClassOf(hard)); // difficulty discriminator
    const asChoice = problem({ prompt: "Solve x + 3 = 5.", difficulty: 1, answer: { kind: "choice", value: "2" }, choices: ["1", "2"] });
    expect(equivalenceClassOf(easy)).not.toBe(equivalenceClassOf(asChoice)); // kind discriminator
  });

  it("maskNumbers masks ints, decimals, fractions, negatives", () => {
    expect(maskNumbers("Add -3/4 + 0.5 and 12")).toBe("add # + # and #");
  });

  it("maskNumbers normalizes the Unicode minus (U+2212) used in the bank", () => {
    // "−3" (− minus) must mask like ASCII "-3"
    expect(maskNumbers("Evaluate −3 + 2")).toBe(maskNumbers("Evaluate -3 + 2"));
    expect(maskNumbers("Evaluate −3 + 2")).toBe("evaluate # + #");
  });
});

describe("calculatorFlagFor — explicit rule, not fabricated", () => {
  it("numeric -> no_calculator; other kinds -> calc_neutral_arithmetic_light", () => {
    expect(calculatorFlagFor(problem({ answer: { kind: "numeric", value: "1" } }))).toBe("no_calculator");
    expect(calculatorFlagFor(problem({ answer: { kind: "choice", value: "a" }, choices: ["a", "b"] }))).toBe("calc_neutral_arithmetic_light");
    expect(calculatorFlagFor(problem({ answer: { kind: "coordinate", value: "(1,2)" } }))).toBe("calc_neutral_arithmetic_light");
  });
});

describe("detectDuplicates — true within-bucket only", () => {
  it("groups same node+phase+sport+prompt+answer", () => {
    const items = [
      problem({ id: "a", skillId: "ALG-S01", phase: 2, sport: "baseball", prompt: "Same?", answer: { kind: "numeric", value: "1" } }),
      problem({ id: "b", skillId: "ALG-S01", phase: 2, sport: "baseball", prompt: "Same?", answer: { kind: "numeric", value: "1" } }),
    ];
    const g = detectDuplicates(items);
    expect(g.length).toBe(1);
    expect(g[0].ids.sort()).toEqual(["a", "b"]);
  });

  it("does NOT group same-prompt items in DIFFERENT phase/sport buckets (legit coverage)", () => {
    const items = [
      problem({ id: "a", skillId: "ALG-S06", phase: 2, sport: "softball", prompt: "Feasible region?", choices: ["x", "y"], answer: { kind: "choice", value: "x" } }),
      problem({ id: "b", skillId: "ALG-S06", phase: 3, sport: "neutral", prompt: "Feasible region?", choices: ["x", "y"], answer: { kind: "choice", value: "x" } }),
    ];
    expect(detectDuplicates(items).length).toBe(0);
  });

  it("answerAsResponse canonicalizes numeric-set order (reversed -> same key)", () => {
    expect(answerAsResponse({ kind: "numeric-set", values: ["2", "-3"] }))
      .toBe(answerAsResponse({ kind: "numeric-set", values: ["-3", "2"] }));
  });

  it("dedup groups numeric-set items with reversed solution order (order-insensitive)", () => {
    const items = [
      problem({ id: "a", skillId: "ALG-Q01", phase: 1, sport: "neutral", prompt: "Roots?", answer: { kind: "numeric-set", values: ["2", "-3"] } }),
      problem({ id: "b", skillId: "ALG-Q01", phase: 1, sport: "neutral", prompt: "Roots?", answer: { kind: "numeric-set", values: ["-3", "2"] } }),
    ];
    expect(detectDuplicates(items).length).toBe(1);
  });
});
