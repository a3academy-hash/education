import { describe, expect, it } from "vitest";
import katex from "katex";
import { segmentMath } from "./segment";
import { toLatex } from "./to-latex";

/** The live repro: ALG-F04 P1 single-elimination bracket word problem. */
const F04_PROMPT =
  "In a single-elimination bracket, the number of teams doubles every round " +
  "you count back from the championship game. A small tournament has 3 rounds. " +
  "How many teams are in it?";

/** Reassemble the segments and compare to the source (byte-for-byte contract). */
function rejoin(s: string): string {
  return segmentMath(s)
    .map((seg) => seg.text)
    .join("");
}

describe("segmentMath — byte-for-byte preservation (no lost/collapsed spaces)", () => {
  const samples = [
    "",
    "hello world",
    "a   b",
    F04_PROMPT,
    "Evaluate 4² and compare",
    "A small tournament has 3 rounds.",
    "x²+3x",
    "√(b²−4ac)",
  ];
  for (const s of samples) {
    it(`rejoins ${JSON.stringify(s.slice(0, 32))}… exactly`, () => {
      expect(rejoin(s)).toBe(s);
    });
  }

  it("returns no segments for the empty string", () => {
    expect(segmentMath("")).toEqual([]);
  });
});

describe("segmentMath — the F04 word problem renders as PROSE", () => {
  const segs = segmentMath(F04_PROMPT);

  it("never emits a math run that contains a natural-language word", () => {
    // A run with a ≥4-letter alphabetic word must be PROSE, never math.
    for (const seg of segs) {
      if (seg.math) {
        expect(seg.text).not.toMatch(/[A-Za-z]{4,}/u);
      }
    }
  });

  it("keeps the word-problem vocabulary in prose runs", () => {
    const proseText = segs
      .filter((s) => !s.math)
      .map((s) => s.text)
      .join("");
    for (const word of [
      "single-elimination",
      "tournament",
      "rounds",
      "championship",
      "teams",
    ]) {
      expect(proseText).toContain(word);
    }
  });

  it("never wraps a whole clause as a single math run", () => {
    // No math run may span a space — a math run is always one token, so it can
    // never be a run-together sentence.
    for (const seg of segs) {
      if (seg.math) expect(seg.text).not.toMatch(/\s/u);
    }
  });

  it("preserves the spaces between the prose words", () => {
    const proseText = segs
      .filter((s) => !s.math)
      .map((s) => s.text)
      .join("");
    expect(proseText).toContain("single-elimination bracket");
    expect(proseText).toContain("championship game");
  });
});

describe("segmentMath — pure-notation strings become MATH runs", () => {
  it("classifies 2³ as a single math run", () => {
    expect(segmentMath("2³")).toEqual([{ text: "2³", math: true }]);
  });

  it("classifies √(b²−4ac) as a single math run", () => {
    expect(segmentMath("√(b²−4ac)")).toEqual([
      { text: "√(b²−4ac)", math: true },
    ]);
  });

  it("classifies x²+3x as a single math run", () => {
    expect(segmentMath("x²+3x")).toEqual([{ text: "x²+3x", math: true }]);
  });

  it("classifies 3/4 as a single math run", () => {
    expect(segmentMath("3/4")).toEqual([{ text: "3/4", math: true }]);
  });
});

describe("segmentMath — mixed prose + notation", () => {
  it("splits 'Evaluate 4² and compare' into prose / math / prose", () => {
    expect(segmentMath("Evaluate 4² and compare")).toEqual([
      { text: "Evaluate ", math: false },
      { text: "4²", math: true },
      { text: " and compare", math: false },
    ]);
  });
});

describe("segmentMath — a lone digit in prose stays PROSE (no single-digit KaTeX)", () => {
  it("treats 'A small tournament has 3 rounds.' as all prose", () => {
    const segs = segmentMath("A small tournament has 3 rounds.");
    expect(segs.every((s) => !s.math)).toBe(true);
    expect(rejoin("A small tournament has 3 rounds.")).toBe(
      "A small tournament has 3 rounds.",
    );
  });

  it("does not mathify a bare digit adjacent to words", () => {
    const segs = segmentMath("has 3 rounds");
    expect(segs.every((s) => !s.math)).toBe(true);
  });
});

describe("segmentMath — grading-safety literal-input is all prose", () => {
  it("keeps an `in the form ...` instruction entirely prose", () => {
    const prompt = "Type the area exactly in the form c/(2*pi)";
    expect(segmentMath(prompt)).toEqual([{ text: prompt, math: false }]);
  });
});

// ---------------------------------------------------------------------------
// Render-path assertion (the behavior MathText depends on). MathText maps each
// MATH segment through katex.renderToString(toLatex(run)); PROSE segments are
// plain React text. We assert the RENDERED math HTML for the F04 prompt never
// contains a single .katex element wrapping the whole sentence, and that the
// prose text (with spaces) is present. This exercises the exact data MathText
// renders without needing a jsdom/.tsx harness.
// ---------------------------------------------------------------------------
describe("MathText render path — F04 prompt is readable prose, not one KaTeX blob", () => {
  function renderLikeMathText(s: string): string {
    return segmentMath(s)
      .map((seg) => {
        if (!seg.math) return seg.text; // plain prose text node
        return katex.renderToString(toLatex(seg.text), {
          throwOnError: false,
          displayMode: false,
          output: "html",
        });
      })
      .join("");
  }

  it("emits the prose text with spaces intact (not run-together)", () => {
    const out = renderLikeMathText(F04_PROMPT);
    expect(out).toContain("In a single-elimination bracket,");
    expect(out).toContain("How many teams are in it?");
  });

  it("does not produce a single .katex element wrapping the whole sentence", () => {
    const out = renderLikeMathText(F04_PROMPT);
    const katexCount = (out.match(/class="katex"/gu) ?? []).length;
    // The F04 prompt carries NO genuine notation token → zero KaTeX blobs.
    expect(katexCount).toBe(0);
    // And none of the prose words appear inside KaTeX math-italic markup.
    expect(out).not.toContain('class="katex"');
  });

  it("still typesets a genuine notation token inside otherwise-prose text", () => {
    const out = renderLikeMathText("Evaluate 4² and compare");
    expect(out).toContain("Evaluate "); // prose, untouched
    expect(out).toContain("and compare");
    expect(out).toContain('class="katex"'); // 4² did render via KaTeX
  });
});
