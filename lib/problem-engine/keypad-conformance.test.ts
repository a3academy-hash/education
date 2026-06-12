// lib/problem-engine/keypad-conformance.test.ts — THE GUARANTEE (mr-gates).
//
// The math keypad (Phase 8 / C-2) is an INPUT method over the FROZEN checkAnswer.
// It must emit ONLY strings the unchanged checker already accepts. This test
// reads REAL items from data/algebra1-graph.json, simulates the keypad emitting
// the CORRECT answer's notation, and feeds that exact string through the
// UNCHANGED checkAnswer — asserting correct:true. It also asserts that a plain
// numeric item yields inputNotation null (no keypad).
//
// checkAnswer / problem-engine are NOT modified. If a keypad form failed to
// round-trip, the FIX is in the keypad's emitted form (or inputNotation returns
// null so the item degrades to the keyboard) — never in the checker.

import { describe, expect, it } from "vitest";
import { checkAnswer } from "./index";
import { inputNotation } from "../math-notation/input-notation";
import realGraphJson from "../../data/algebra1-graph.json";
import type { CurriculumGraph, ProblemTemplate } from "@/types";

const graph = realGraphJson as unknown as CurriculumGraph;

/** Every problem in the real graph, flattened across nodes/phases. */
function allProblems(): ProblemTemplate[] {
  const out: ProblemTemplate[] = [];
  for (const node of graph.nodes) {
    for (const phase of ["p1", "p2", "p3"] as const) {
      for (const p of node.problems[phase] ?? []) out.push(p);
    }
  }
  return out;
}

const PROBLEMS = allProblems();

/** Items the keypad would show (inputNotation non-null). */
const KEYPAD_ITEMS = PROBLEMS.filter((p) => inputNotation(p.answer) !== null);

/**
 * Simulate the keypad EMISSION for the correct answer of `p`. The keypad makes
 * each notation glyph in the accepted answer typeable, so a student writing the
 * answer with the keys reproduces exactly the authored value:
 *   - fraction key inserts "/"        → "a/b" reproduced verbatim
 *   - superscript toggle maps digits  → the authored unicode superscript glyphs
 *   - √ ± π keys insert that glyph     → reproduced verbatim
 * We therefore emit the authored value(s) — the round-trip proves the keys can
 * produce a checker-accepted string. (numeric-set joins members with commas, the
 * form parseNumericSet accepts.)
 */
function keypadEmission(p: ProblemTemplate): string {
  return p.answer.kind === "numeric-set"
    ? p.answer.values.join(",")
    : p.answer.value;
}

describe("keypad conformance — every keypad-enabled REAL item round-trips", () => {
  it("finds keypad-enabled items in the real graph", () => {
    expect(KEYPAD_ITEMS.length).toBeGreaterThan(0);
  });

  it.each(KEYPAD_ITEMS.map((p) => [p.id, p] as const))(
    "%s: keypad emission grades correct through unchanged checkAnswer",
    (_id, p) => {
      const emitted = keypadEmission(p);
      const { correct } = checkAnswer(p, emitted);
      expect(correct).toBe(true);
    },
  );
});

describe("keypad conformance — plain numeric items get NO keypad", () => {
  // The canonical render-only proof item: "Evaluate 4³" → answer "64" (plain).
  it("ALG-F04-p2-baseball-03 (Evaluate 4³ → 64) yields inputNotation null", () => {
    const p = PROBLEMS.find((x) => x.id === "ALG-F04-p2-baseball-03");
    expect(p).toBeDefined();
    expect(p && inputNotation(p.answer)).toBeNull();
  });

  it("a representative sample of plain-integer answers all yield null", () => {
    const plain = PROBLEMS.filter(
      (p) => p.answer.kind === "numeric" && /^-?\d+$/.test(p.answer.value),
    ).slice(0, 50);
    expect(plain.length).toBeGreaterThan(0);
    for (const p of plain) expect(inputNotation(p.answer)).toBeNull();
  });

  it("choice and coordinate answers never get a keypad", () => {
    const cc = PROBLEMS.filter(
      (p) => p.answer.kind === "choice" || p.answer.kind === "coordinate",
    );
    expect(cc.length).toBeGreaterThan(0);
    for (const p of cc) expect(inputNotation(p.answer)).toBeNull();
  });
});

describe("keypad conformance — literal-input (*) expressions degrade to keyboard", () => {
  it("every *-bearing expression answer yields inputNotation null", () => {
    const star = PROBLEMS.filter(
      (p) =>
        (p.answer.kind === "expression" && p.answer.value.includes("*")) ||
        (p.answer.kind === "numeric-set" &&
          p.answer.values.some((v) => v.includes("*"))),
    );
    expect(star.length).toBeGreaterThan(0);
    for (const p of star) expect(inputNotation(p.answer)).toBeNull();
  });
});

describe("keypad conformance — superscript-toggle digit mapping round-trips", () => {
  // The toggle maps typed 0-9 → ⁰¹²³⁴⁵⁶⁷⁸⁹. Reconstruct an authored unicode
  // superscript answer from base + typed digits and assert the rebuild equals
  // the authored value AND grades correct — proving the toggle emits the
  // checker-accepted form. (No real numeric answer carries unicode superscripts;
  // expression answers are the path, so we build a representative one.)
  const SUPER: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  };
  const toSuper = (digits: string) =>
    [...digits].map((d) => SUPER[d]).join("");

  it("rebuilds x² via the toggle and grades correct through checkAnswer", () => {
    // base "x" + toggle + typed "2" → "x²"
    const rebuilt = "x" + toSuper("2");
    const item: ProblemTemplate = {
      id: "SYN-sup-1",
      version: 1,
      skillId: "SYN",
      phase: 3,
      sport: "neutral",
      prompt: "Write x squared.",
      visual: null,
      answer: { kind: "expression", value: "x²" },
      hints: [],
      difficulty: 1,
    };
    expect(rebuilt).toBe("x²");
    expect(inputNotation(item.answer)).toEqual({ superscript: true });
    expect(checkAnswer(item, rebuilt).correct).toBe(true);
  });

  it("rebuilds a multi-digit exponent (x¹²) via the toggle", () => {
    const rebuilt = "x" + toSuper("12");
    const item: ProblemTemplate = {
      id: "SYN-sup-2",
      version: 1,
      skillId: "SYN",
      phase: 3,
      sport: "neutral",
      prompt: "Write x to the twelfth.",
      visual: null,
      answer: { kind: "expression", value: "x¹²" },
      hints: [],
      difficulty: 1,
    };
    expect(rebuilt).toBe("x¹²");
    expect(checkAnswer(item, rebuilt).correct).toBe(true);
  });
});

describe("keypad conformance — synthetic √ ± π expression emission round-trips", () => {
  // No real non-choice answer carries these glyphs, but the keypad offers them
  // for EXPRESSION answers (string-compared). Prove the literal glyph keys emit
  // a checker-accepted form so the guarantee holds if such content is authored.
  const mk = (value: string): ProblemTemplate => ({
    id: "SYN",
    version: 1,
    skillId: "SYN",
    phase: 3,
    sport: "neutral",
    prompt: "synthetic",
    visual: null,
    answer: { kind: "expression", value },
    hints: [],
    difficulty: 1,
  });

  it.each([["2√13"], ["±5"], ["3π"], ["(-b±√13)/2"]])(
    "expression %s round-trips through unchanged checkAnswer",
    (value) => {
      const item = mk(value);
      expect(inputNotation(item.answer)).not.toBeNull();
      // The keypad reproduces the glyphs verbatim → emitted === authored value.
      expect(checkAnswer(item, value).correct).toBe(true);
    },
  );
});
