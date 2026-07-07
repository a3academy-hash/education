// Deterministic answer-checking tests — mirrors lib/problem-engine's
// exact-equality pin (no float tolerance).

import { describe, expect, it } from "vitest";
import {
  checkChoice,
  checkNumeric,
  matchTrigger,
  numericMatches,
  parseNumericExact,
} from "./check";
import type { MisconceptionMapEntry } from "./types";

describe("parseNumericExact", () => {
  it("parses integers, decimals, and a/b fractions", () => {
    expect(parseNumericExact("20")).toBe(20);
    expect(parseNumericExact("-1.75")).toBe(-1.75);
    expect(parseNumericExact(" 3/4 ")).toBe(0.75);
    expect(parseNumericExact("-7/4")).toBe(-1.75);
    expect(parseNumericExact("−7/4")).toBe(-1.75); // unicode minus
  });
  it("rejects junk and zero denominators", () => {
    expect(parseNumericExact("abc")).toBeNull();
    expect(parseNumericExact("1/0")).toBeNull();
    expect(parseNumericExact("")).toBeNull();
  });
});

describe("checkNumeric (exact equality, no tolerance)", () => {
  it("accepts fraction/decimal exact equivalence", () => {
    expect(checkNumeric("0.75", "3/4")).toBe(true);
    expect(checkNumeric("-1.75", "-7/4", ["-1.75", "-14/8"])).toBe(true);
    expect(checkNumeric("-14/8", "-7/4", ["-1.75", "-14/8"])).toBe(true);
  });
  it("has NO float tolerance", () => {
    expect(checkNumeric("0.333", "1/3")).toBe(false);
    expect(checkNumeric("0.3333333", "1/3")).toBe(false);
    expect(checkNumeric("-19.9999", "-20")).toBe(false);
  });
  it("rejects the wrong sign", () => {
    expect(checkNumeric("-20", "20")).toBe(false);
    expect(checkNumeric("7/4", "-7/4")).toBe(false);
  });
});

describe("checkChoice", () => {
  it("compares exact option ids", () => {
    expect(checkChoice(" A ", "A")).toBe(true);
    expect(checkChoice("B", "A")).toBe(false);
  });
});

describe("matchTrigger", () => {
  const entries: MisconceptionMapEntry[] = [
    { trigger: "-20", tag: "inconsistent-subtraction-order", signature: "s1" },
    { trigger: "30", tag: "slope-as-height", signature: "s2" },
    { trigger: "1/4", tag: "inverted-ratio", signature: "s3" },
  ];
  it("matches numeric triggers exactly (including fraction forms)", () => {
    expect(matchTrigger("-20", "numeric", entries)?.tag).toBe(
      "inconsistent-subtraction-order",
    );
    expect(matchTrigger("0.25", "numeric", entries)?.tag).toBe("inverted-ratio");
    expect(matchTrigger("42", "numeric", entries)).toBeNull();
  });
  it("handles part-prefixed item-level triggers", () => {
    const prefixed: MisconceptionMapEntry[] = [
      { trigger: "c:20", tag: "forgot-denominator", signature: "s" },
      { trigger: "d:B", tag: "inverted-ratio", signature: "s" },
    ];
    expect(matchTrigger("20", "numeric", prefixed, "c")?.tag).toBe("forgot-denominator");
    expect(matchTrigger("B", "choice", prefixed, "d")?.tag).toBe("inverted-ratio");
    expect(matchTrigger("20", "numeric", prefixed, "d")).toBeNull();
  });
});

describe("numericMatches", () => {
  it("falls back to trimmed string equality for non-numeric targets", () => {
    expect(numericMatches("undefined", "undefined")).toBe(true);
    expect(numericMatches("undefined", "0")).toBe(false);
  });
});
