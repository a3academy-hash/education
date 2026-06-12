import { describe, expect, it } from "vitest";
import { inputNotation } from "./input-notation";
import type { AnswerSpec } from "@/types";

const num = (value: string, tolerance?: number): AnswerSpec => ({
  kind: "numeric",
  value,
  ...(tolerance !== undefined ? { tolerance } : {}),
});
const expr = (value: string): AnswerSpec => ({ kind: "expression", value });
const set = (...values: string[]): AnswerSpec => ({ kind: "numeric-set", values });
const ineq = (value: string): AnswerSpec => ({ kind: "inequality", value });

describe("inputNotation — plain answers get NO keypad", () => {
  it("returns null for a plain integer", () => {
    expect(inputNotation(num("16"))).toBeNull();
    expect(inputNotation(num("64"))).toBeNull();
    expect(inputNotation(num("-7"))).toBeNull();
  });

  it("returns null for a plain decimal", () => {
    expect(inputNotation(num("0.5"))).toBeNull();
  });

  it("ALWAYS returns null for choice (even when the value contains notation)", () => {
    expect(inputNotation({ kind: "choice", value: "3x² + 7x" })).toBeNull();
    expect(inputNotation({ kind: "choice", value: "4√2" })).toBeNull();
    expect(inputNotation({ kind: "choice", value: "3^4" })).toBeNull();
  });

  it("ALWAYS returns null for coordinate", () => {
    expect(inputNotation({ kind: "coordinate", value: "(2, 3)" })).toBeNull();
  });
});

describe("inputNotation — fraction trigger", () => {
  it("fires for a numeric a/b fraction answer", () => {
    expect(inputNotation(num("7/12"))).toEqual({ fraction: true });
    expect(inputNotation(num("5/6"))).toEqual({ fraction: true });
  });

  it("fires within a numeric-set member", () => {
    expect(inputNotation(set("3", "-13/3"))).toEqual({ fraction: true });
  });
});

describe("inputNotation — superscript trigger", () => {
  it("fires on a unicode superscript in an expression answer", () => {
    expect(inputNotation(expr("x²+3x"))).toEqual({ superscript: true });
  });

  it("fires on a caret exponent", () => {
    expect(inputNotation(expr("x^2+3x"))).toEqual({ superscript: true });
  });
});

describe("inputNotation — radical / plusminus / pi triggers (expression only)", () => {
  it("fires radical on √ in an expression", () => {
    expect(inputNotation(expr("2√13"))).toEqual({ radical: true });
  });

  it("fires plusminus on ± in an expression", () => {
    expect(inputNotation(expr("±5"))).toEqual({ plusminus: true });
  });

  it("fires pi on π", () => {
    expect(inputNotation(expr("3π"))).toEqual({ pi: true });
  });

  it("fires pi on the word pi at a word boundary", () => {
    expect(inputNotation(expr("2 pi"))).toEqual({ pi: true });
  });

  it("does NOT fire pi inside a word (conservative: pizza is prose)", () => {
    // \bpi\b only — "2pi" has no boundary before pi, so no spurious key.
    expect(inputNotation(expr("2pi"))).toBeNull();
  });

  it("combines multiple flags (quadratic-formula expression shape)", () => {
    // The denominator paren means the simple a/b fraction rule does not fire
    // (conservative — the / sits after a ')'); radical + plusminus do.
    expect(inputNotation(expr("(-b±√13)/2"))).toEqual({
      radical: true,
      plusminus: true,
    });
  });
});

describe("inputNotation — ROUND-TRIP SCOPE: numeric kinds offer fraction ONLY", () => {
  // parseNumeric rejects √ ± π and superscripts → those glyphs can't grade as
  // numeric, so they must NOT surface a key. Only a/b fractions round-trip.
  it("a numeric answer never offers superscript/radical/pi/plusminus", () => {
    // (No real numeric answer carries these, but assert the scope explicitly.)
    expect(inputNotation(num("4²"))).toBeNull(); // unicode sup in numeric → no key
    expect(inputNotation(num("√13"))).toBeNull();
    expect(inputNotation(num("±5"))).toBeNull();
  });

  it("a numeric-set offers fraction only, never radical/plusminus glyphs", () => {
    expect(inputNotation(set("±5", "√2"))).toBeNull();
    expect(inputNotation(set("3", "-13/3"))).toEqual({ fraction: true });
  });
});

describe("inputNotation — LITERAL-INPUT (asterisk) degrades to keyboard", () => {
  it("returns null for an expression carrying an ASCII * multiply", () => {
    expect(inputNotation(expr("C/(2*PI)"))).toBeNull();
    expect(inputNotation(expr("WHIP*IP-W"))).toBeNull();
    expect(inputNotation(expr("(TS*G-3T)/2"))).toBeNull();
  });

  it("returns null for a numeric-set with any * member", () => {
    expect(inputNotation(set("4", "2*x"))).toBeNull();
  });
});

describe("inputNotation — inequality", () => {
  it("returns null for a plain inequality (no notation)", () => {
    expect(inputNotation(ineq("x > 5"))).toBeNull();
  });

  it("fires when the inequality bound carries notation", () => {
    expect(inputNotation(ineq("x < √2"))).toEqual({ radical: true });
  });
});
