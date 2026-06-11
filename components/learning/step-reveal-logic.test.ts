import { describe, it, expect } from "vitest";
import {
  initRevealState,
  isBlankGating,
  isComplete,
  nextButtonLabel,
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
