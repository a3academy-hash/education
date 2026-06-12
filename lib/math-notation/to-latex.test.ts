import { describe, expect, it } from "vitest";
import { toLatex } from "./to-latex";

describe("toLatex — caret exponents", () => {
  it("groups a single-digit exponent", () => {
    expect(toLatex("a^2")).toBe("a^{2}");
  });

  it("groups a multi-char exponent run up to the next space", () => {
    expect(toLatex("b^23")).toBe("b^{23}");
  });

  it("stops the exponent run at the next operator", () => {
    expect(toLatex("2^3+1")).toBe("2^{3}+1");
  });

  it("leaves an already-grouped exponent alone", () => {
    expect(toLatex("a^{bc}")).toBe("a^{bc}");
  });

  it("emits a dangling caret verbatim (TOTAL, no throw)", () => {
    expect(toLatex("3^")).toBe("3^");
  });
});

describe("toLatex — unicode superscripts and subscripts", () => {
  it("converts a unicode superscript digit", () => {
    expect(toLatex("4²")).toBe("4^{2}");
  });

  it("groups a multi-glyph superscript run", () => {
    expect(toLatex("b²³")).toBe("b^{23}");
  });

  it("converts signed superscripts", () => {
    expect(toLatex("x⁻¹")).toBe("x^{-1}");
  });

  it("converts a unicode subscript run", () => {
    expect(toLatex("y₂")).toBe("y_{2}");
  });

  it("handles a subscript difference token", () => {
    // y₂−y₁ is one token; − becomes -, subscripts group.
    expect(toLatex("y₂−y₁")).toBe("y_{2}-y_{1}");
  });
});

describe("toLatex — radicals", () => {
  it("wraps a single-token radicand", () => {
    expect(toLatex("√13")).toBe("\\sqrt{13}");
  });

  it("balances a parenthesised radicand", () => {
    expect(toLatex("√(b²−4ac)")).toBe("\\sqrt{b^{2}-4ac}");
  });

  it("balances nested parens inside a radicand", () => {
    expect(toLatex("√((a+b))")).toBe("\\sqrt{(a+b)}");
  });

  it("degrades an unbalanced radical without throwing", () => {
    // No closing paren → √ emitted verbatim, no crash.
    expect(toLatex("√(b²")).toBe("√(b^{2}");
  });

  it("emits a dangling √ verbatim", () => {
    expect(toLatex("√")).toBe("√");
  });
});

describe("toLatex — single-char symbols", () => {
  it("maps − to a hyphen-minus", () => {
    expect(toLatex("3−2")).toBe("3-2");
  });

  it("maps · to \\cdot", () => {
    expect(toLatex("3·2")).toBe("3\\cdot 2");
  });

  it("maps × to \\times", () => {
    expect(toLatex("3×2")).toBe("3\\times 2");
  });

  it("maps ± to \\pm", () => {
    expect(toLatex("±5")).toBe("\\pm 5");
  });

  it("maps π to \\pi", () => {
    expect(toLatex("2π")).toBe("2\\pi ");
  });
});

describe("toLatex — ASCII subscripts (mr-kahn #1)", () => {
  it("groups a single-letter ASCII subscript", () => {
    expect(toLatex("a_n")).toBe("a_{n}");
  });

  it("groups single-digit ASCII subscripts", () => {
    expect(toLatex("a_1")).toBe("a_{1}");
    expect(toLatex("a_6")).toBe("a_{6}");
  });

  it("leaves an already-grouped subscript alone", () => {
    expect(toLatex("a_{12}")).toBe("a_{12}");
  });

  it("emits a bare trailing underscore verbatim (TOTAL)", () => {
    expect(toLatex("a_")).toBe("a_");
  });
});

describe("toLatex — parenthesised caret exponent (mr-kahn #2)", () => {
  it("consumes the parens and keeps content verbatim", () => {
    expect(toLatex("x^(a+b)")).toBe("x^{a+b}");
  });

  it("converts 2^(n-1) as one token", () => {
    expect(toLatex("2^(n-1)")).toBe("2^{n-1}");
  });

  it("degrades an unbalanced paren exponent without throwing", () => {
    expect(toLatex("x^(a+b")).toBe("x^(a+b");
  });
});

describe("toLatex — new symbols (mr-kahn #3)", () => {
  it("maps ≤ ≥ ≠ ≈", () => {
    expect(toLatex("x≤5")).toBe("x\\le 5");
    expect(toLatex("x≥5")).toBe("x\\ge 5");
    expect(toLatex("x≠5")).toBe("x\\neq 5");
    expect(toLatex("x≈5")).toBe("x\\approx 5");
  });

  it("passes single-level absolute value bars through verbatim", () => {
    // |expr| renders fine in KaTeX; do NOT auto-\left|\right|.
    expect(toLatex("|x|")).toBe("|x|");
    expect(toLatex("|x−3|")).toBe("|x-3|");
  });

  it("leaves the degree sign as plain text in units prose", () => {
    // −6°F is unit prose — never mathified (the run carries a long word "F"? no;
    // it is a short token, but ° is not a math marker and there is no op-shape).
    expect(toLatex("−6°F")).toBe("−6°F");
  });
});

describe("toLatex — HARD answer-format exclusion (mr-kahn #4, grading-safety)", () => {
  it("leaves a `*` (asterisk-multiply) token verbatim, unconverted", () => {
    expect(toLatex("c/(2*pi)")).toBe("c/(2*pi)");
    expect(toLatex("c/(2*pi)")).not.toContain("\\frac");
    expect(toLatex("c/(2*pi)")).not.toContain("\\tfrac");
  });

  it("leaves an `in the form ...` instruction string fully verbatim", () => {
    const prompt = "Type the area exactly in the form c/(2*pi)";
    expect(toLatex(prompt)).toBe(prompt);
  });

  it("leaves an `exactly ...` instruction string fully verbatim", () => {
    const prompt = "Enter it exactly as 3x^2";
    expect(toLatex(prompt)).toBe(prompt);
  });

  it("does not mathify a `*` token even amid otherwise-math prose", () => {
    expect(toLatex("Compute 2*3 now")).toBe("Compute 2*3 now");
  });
});

describe("toLatex — checkmark stays plain text (mr-kahn #5)", () => {
  it("never converts a ✓ glyph", () => {
    expect(toLatex("✓ correct")).toBe("✓ correct");
    expect(toLatex("4² ✓")).toBe("4^{2} ✓");
  });
});

describe("toLatex — conservative grouping (mr-kahn #6)", () => {
  it("binds ^ to one digit-run, not past a space/operator", () => {
    expect(toLatex("2^3 + 4")).toBe("2^{3} + 4");
  });

  it("groups each exponent separately across a single-token product", () => {
    // x^2·x^3 is one token (no spaces) → both exponents group independently.
    expect(toLatex("x^2·x^3")).toBe("x^{2}\\cdot x^{3}");
  });

  it("converts a unicode superscript run as ONE contiguous group", () => {
    expect(toLatex("x²³")).toBe("x^{23}");
  });

  it("√ binds to exactly one parenthesised group, not past a space", () => {
    expect(toLatex("√(b²−4ac)")).toBe("\\sqrt{b^{2}-4ac}");
  });
});

describe("toLatex — fractions (mr-kahn ruling)", () => {
  it("renders a simple numeric ratio as inline \\tfrac in prose", () => {
    expect(toLatex("3/4")).toBe("\\tfrac{3}{4}");
  });

  it("uses \\dfrac when displayStyle is requested", () => {
    expect(toLatex("3/4", { displayStyle: true })).toBe("\\dfrac{3}{4}");
  });

  it("renders an explicitly parenthesised ratio as \\tfrac inline", () => {
    expect(toLatex("(6±4)/2")).toBe("\\tfrac{6\\pm 4}{2}");
  });

  it("renders a parenthesised ratio as \\dfrac on a standalone line", () => {
    expect(toLatex("(y₂−y₁)/(x₂−x₁)", { displayStyle: true })).toBe(
      "\\dfrac{y_{2}-y_{1}}{x_{2}-x_{1}}",
    );
  });

  it("renders the quadratic formula numerator/denominator", () => {
    expect(toLatex("(-b±√(b²−4ac))/(2a)", { displayStyle: true })).toBe(
      "\\dfrac{-b\\pm \\sqrt{b^{2}-4ac}}{2a}",
    );
  });

  it("leaves a non-matching `/` shape literal (conservative fallback)", () => {
    // three-part path with extra slash → not a recognised ratio token.
    expect(toLatex("a/b/c")).toBe("a/b/c");
  });
});

describe("toLatex — prose left untouched (segmentation gate)", () => {
  it("leaves a plain sentence byte-for-byte", () => {
    const prose = "Solve the equation for the unknown value.";
    expect(toLatex(prose)).toBe(prose);
  });

  it("does not convert a caret embedded in a long word", () => {
    // "answer^2word" carries a 4+ letter word → treated as prose.
    expect(toLatex("answer^2word")).toBe("answer^2word");
  });

  it("converts only the math token in mixed prose", () => {
    expect(toLatex("Evaluate 4² and b²³")).toBe("Evaluate 4^{2} and b^{23}");
  });

  it("preserves whitespace spacing exactly", () => {
    expect(toLatex("a   b")).toBe("a   b");
  });

  it("leaves a word containing a unicode superscript-free token alone", () => {
    expect(toLatex("hello world")).toBe("hello world");
  });
});

describe("toLatex — TOTAL: never throws on junk", () => {
  const junk = [
    "",
    "\\frac{ bad",
    "^^^^",
    "√√√",
    "}{}{}{",
    "a^{b^{c",
    " ",
    "π·×±−√^",
    "((((((",
    ")))))",
    "𝕏𝕐𝕑 ^ 🧮",
    "1/0 + ^ - √()",
  ];
  for (const input of junk) {
    it(`does not throw on ${JSON.stringify(input)}`, () => {
      expect(() => toLatex(input)).not.toThrow();
      expect(typeof toLatex(input)).toBe("string");
    });
  }
});
