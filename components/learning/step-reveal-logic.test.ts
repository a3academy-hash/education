import { describe, it, expect } from "vitest";
import {
  buildInteractions,
  initRevealState,
  isBlankGating,
  isComplete,
  isInteractionGating,
  nextButtonLabel,
  normalizeAnswer,
  revealNext,
} from "./step-reveal-logic";

describe("step-reveal-logic", () => {
  it("starts with nothing revealed", () => {
    const s = initRevealState(3);
    expect(s.revealed).toBe(0);
    expect(isComplete(s)).toBe(false);
  });
  it("reveals one step at a time and completes", () => {
    let s = initRevealState(2);
    s = revealNext(s);
    expect(s.revealed).toBe(1);
    s = revealNext(s);
    expect(s.revealed).toBe(2);
    expect(isComplete(s)).toBe(true);
  });
  it("does not advance past total", () => {
    let s = initRevealState(1);
    s = revealNext(s);
    s = revealNext(s);
    expect(s.revealed).toBe(1);
  });
  it("labels the final reveal as Show result", () => {
    let s = initRevealState(2);
    expect(nextButtonLabel(s)).toBe("Show next step");
    s = revealNext(s);
    expect(nextButtonLabel(s)).toBe("Show result");
  });
  it("ignores an out-of-range blank index", () => {
    const s = initRevealState(2, 5);
    expect(s.blankStepIndex).toBeNull();
  });
  it("gates on an unsatisfied blank step", () => {
    const s = initRevealState(3, 0);
    expect(isBlankGating(s, false)).toBe(true);
    expect(isBlankGating(s, true)).toBe(false);
  });
  it("blocks revealNext while the blank gates", () => {
    const s = initRevealState(3, 0);
    expect(revealNext(s, false).revealed).toBe(0);
    expect(revealNext(s, true).revealed).toBe(1);
  });
});

describe("per-step interactions", () => {
  it("normalizeAnswer is case/space-insensitive", () => {
    expect(normalizeAnswer("  Move Right ")).toBe("moveright");
    expect(normalizeAnswer("3")).toBe("3");
  });

  it("defaults every step to reveal with no interactions or blank", () => {
    expect(buildInteractions(3, undefined, null, "")).toEqual([
      { kind: "reveal" },
      { kind: "reveal" },
      { kind: "reveal" },
    ]);
  });

  it("maps a legacy blankStepIndex/blankAnswer to a single fill", () => {
    expect(buildInteractions(2, undefined, 1, "x=3")).toEqual([
      { kind: "reveal" },
      { kind: "fill", answer: "x=3" },
    ]);
  });

  it("lets explicit interactions win and pads missing entries to reveal", () => {
    const explicit = [
      { kind: "predict" as const, options: ["left", "right"], answer: "right" },
      null,
    ];
    expect(buildInteractions(3, explicit, null, "")).toEqual([
      { kind: "predict", options: ["left", "right"], answer: "right" },
      { kind: "reveal" },
      { kind: "reveal" },
    ]);
  });

  it("gates only on an unsatisfied fill/predict at the current step", () => {
    const eff = buildInteractions(3, [
      { kind: "reveal" as const },
      { kind: "fill" as const, answer: "3" },
      { kind: "reveal" as const },
    ], null, "");
    expect(isInteractionGating(eff, 0, new Set())).toBe(false); // reveal step
    expect(isInteractionGating(eff, 1, new Set())).toBe(true); // unsatisfied fill
    expect(isInteractionGating(eff, 1, new Set([1]))).toBe(false); // satisfied
    expect(isInteractionGating(eff, 3, new Set())).toBe(false); // past the end
  });
});
