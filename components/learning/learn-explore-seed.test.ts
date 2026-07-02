import { describe, expect, it } from "vitest";
import {
  coordinateSeedFromProblems,
  numberlineSeedFromProblems,
  synthesizeNumberlineSeed,
  parseEquation,
  equationSeedFromNode,
} from "./learn-explore-seed";
import type { ProblemTemplate, WorkedExample } from "../../types";

function prob(over: Partial<ProblemTemplate>): ProblemTemplate {
  return {
    id: "p",
    version: 1,
    skillId: "ALG-X",
    phase: 1,
    sport: "neutral",
    prompt: "",
    visual: null,
    answer: { kind: "numeric", value: "0" },
    hints: [],
    difficulty: 1,
    ...over,
  };
}

describe("coordinateSeedFromProblems", () => {
  it("returns the first coordinate spec with two points (L05/L06 shape)", () => {
    const problems = [
      prob({ prompt: "no spec" }),
      prob({
        visual: "coordinate",
        visualSpec: {
          kind: "coordinate",
          mode: "display",
          points: [
            { x: 3, y: 9 },
            { x: 8, y: 24 },
          ],
        },
      }),
    ];
    const seed = coordinateSeedFromProblems(problems);
    expect(seed?.points).toHaveLength(2);
    expect(seed?.points?.[0]).toEqual({ x: 3, y: 9 });
  });

  it("returns null when no coordinate spec exists (degrade-safe)", () => {
    expect(coordinateSeedFromProblems([prob({})])).toBeNull();
  });
});

describe("numberlineSeedFromProblems", () => {
  it("derives operationDelta + a single live marker from two real markers (F09)", () => {
    const problems = [
      prob({
        visual: "numberline",
        visualSpec: {
          kind: "numberline",
          mode: "display",
          range: { min: -6, max: 6 },
          markers: [
            { value: 4, label: "4" },
            { value: -4, label: "-4" },
          ],
        },
      }),
    ];
    const seed = numberlineSeedFromProblems(problems);
    expect(seed?.operationDelta).toBe(-8); // -4 - 4
    expect(seed?.markers).toEqual([{ value: -4, label: "-4" }]);
    expect(seed?.range).toEqual({ min: -6, max: 6 });
  });

  it("keeps an explicit operationDelta untouched", () => {
    const problems = [
      prob({
        visual: "numberline",
        visualSpec: {
          kind: "numberline",
          mode: "display",
          range: { min: 0, max: 10 },
          markers: [{ value: 2 }],
          operationDelta: 3,
        },
      }),
    ];
    expect(numberlineSeedFromProblems(problems)?.operationDelta).toBe(3);
  });

  it("returns null with no numberline spec", () => {
    expect(numberlineSeedFromProblems([prob({})])).toBeNull();
  });
});

describe("parseEquation", () => {
  it("parses one-step x + b = c (E01)", () => {
    expect(parseEquation("the equation x + 8 = 20 sits on a balance")).toEqual({
      leftX: 1,
      leftC: 8,
      rightX: 0,
      rightC: 20,
    });
  });

  it("parses x - b = c with a unicode minus", () => {
    expect(parseEquation("x − 4 = 9. Solve for x.")).toEqual({
      leftX: 1,
      leftC: -4,
      rightX: 0,
      rightC: 9,
    });
  });

  it("parses two-step ax + b = c (E02)", () => {
    expect(parseEquation("Solve 3x + 4 = 19. Which operation")).toEqual({
      leftX: 3,
      leftC: 4,
      rightX: 0,
      rightC: 19,
    });
  });

  it("parses variables on both sides (E14 shape)", () => {
    expect(parseEquation("Set their totals equal: 2g + 14 = 2g + 14.")).toEqual({
      leftX: 2,
      leftC: 14,
      rightX: 2,
      rightC: 14,
    });
  });

  it("returns null on parenthesized / non-linear text (E03 degrades)", () => {
    expect(parseEquation("the group 2(g + 3) = 16")).toBeNull();
  });

  it("returns null when there is no equation", () => {
    expect(parseEquation("Find the rate in runs per game.")).toBeNull();
  });

  it("returns null when neither side has the variable", () => {
    expect(parseEquation("3 + 4 = 7")).toBeNull();
  });
});

describe("equationSeedFromNode", () => {
  it("prefers the first parseable worked-example step", () => {
    const we: WorkedExample[] = [
      {
        id: "we",
        title: "t",
        steps: [
          { prompt: "Solve 3x + 4 = 19 first.", reveal: "..." },
        ],
      },
    ];
    expect(equationSeedFromNode(we, [])).toEqual({
      leftX: 3,
      leftC: 4,
      rightX: 0,
      rightC: 19,
    });
  });

  it("falls back to a problem prompt when the WE has no equation", () => {
    const we: WorkedExample[] = [
      { id: "we", title: "t", steps: [{ prompt: "no equation here", reveal: "none" }] },
    ];
    const problems = [prob({ prompt: "x + 7 = 12. Solve for x." })];
    expect(equationSeedFromNode(we, problems)).toEqual({
      leftX: 1,
      leftC: 7,
      rightX: 0,
      rightC: 12,
    });
  });

  it("returns null when nothing parses (degrade-safe)", () => {
    expect(equationSeedFromNode([], [prob({ prompt: "no math" })])).toBeNull();
  });
});

describe("synthesizeNumberlineSeed", () => {
  const we = (title: string): WorkedExample => ({ id: "we", title, steps: [] });

  it("returns null for a non-numberline node", () => {
    expect(synthesizeNumberlineSeed({ visual: "coordinate", workedExamples: [] })).toBeNull();
    expect(synthesizeNumberlineSeed({ visual: null, workedExamples: [] })).toBeNull();
  });

  it("seeds the marker at `a` with an operationDelta from a clean WE title (ALG-F01 shape)", () => {
    const seed = synthesizeNumberlineSeed({
      visual: "numberline",
      workedExamples: [we("Adding signed numbers on a number line: −4 + 7")],
    });
    expect(seed).toMatchObject({
      kind: "numberline",
      mode: "interactive",
      markers: [{ value: -4 }],
      operationDelta: 7,
      range: { min: -10, max: 10 },
    });
  });

  it("skips parenthesized titles and uses the next clean move", () => {
    const seed = synthesizeNumberlineSeed({
      visual: "numberline",
      workedExamples: [we("Subtracting a negative: 5 − (−3)"), we("Then: -6 + 2")],
    });
    expect(seed?.markers).toEqual([{ value: -6 }]);
    expect(seed?.operationDelta).toBe(2);
  });

  it("falls back to a symmetric −10..10 line with a marker at 0 when no move parses", () => {
    const seed = synthesizeNumberlineSeed({
      visual: "numberline",
      workedExamples: [we("Integer operations overview")],
    });
    expect(seed).toMatchObject({
      kind: "numberline",
      mode: "interactive",
      range: { min: -10, max: 10 },
      markers: [{ value: 0 }],
    });
    expect(seed?.operationDelta).toBeUndefined();
  });
});
