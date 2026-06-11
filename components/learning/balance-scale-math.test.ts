import { describe, it, expect } from "vitest";
import {
  applyOperation,
  equationString,
  isSolved,
  solution,
  suggestOperations,
  tiltAngle,
  tiltFor,
  type Equation,
} from "./balance-scale-math";

// 3x + 4 = 19  (the spec's worked example)
const eq: Equation = { leftX: 3, leftC: 4, rightX: 0, rightC: 19 };

describe("balance-scale-math: reduction", () => {
  it("renders the equation string with real minus", () => {
    expect(equationString(eq)).toBe("3x + 4 = 19");
    expect(equationString({ leftX: 5, leftC: -8, rightX: 0, rightC: 12 })).toBe(
      "5x − 8 = 12",
    );
  });
  it("subtracts a constant from both sides", () => {
    const r = applyOperation(eq, { kind: "subtractConst", amount: 4 });
    expect(equationString(r)).toBe("3x = 15");
  });
  it("divides both sides to isolate x", () => {
    const step1 = applyOperation(eq, { kind: "subtractConst", amount: 4 });
    const step2 = applyOperation(step1, { kind: "divide", by: 3 });
    expect(isSolved(step2)).toBe(true);
    expect(solution(step2)).toBe(5);
  });
  it("solves the full example via suggested operations", () => {
    let cur = eq;
    for (let i = 0; i < 5 && !isSolved(cur); i++) {
      const next = suggestOperations(cur)[0];
      expect(next).toBeDefined();
      cur = applyOperation(cur, next.op);
    }
    expect(isSolved(cur)).toBe(true);
    expect(solution(cur)).toBe(5);
  });
  it("handles variables on both sides", () => {
    const two: Equation = { leftX: 5, leftC: -2, rightX: 3, rightC: 8 };
    expect(solution(two)).toBe(5);
  });
  it("divide by zero is a no-op", () => {
    expect(applyOperation(eq, { kind: "divide", by: 0 })).toEqual(eq);
  });
  it("solution is null for a degenerate equation", () => {
    expect(solution({ leftX: 2, leftC: 1, rightX: 2, rightC: 3 })).toBeNull();
  });
});

describe("balance-scale-math: tilt", () => {
  it("balanced when sides are equal at the solution", () => {
    expect(tiltFor({ leftX: 1, leftC: 0, rightX: 0, rightC: 5 }, 5)).toBe("balanced");
  });
  it("tilts toward the heavier side", () => {
    // left = 3·1 + 9 = 12 > right = 10 → left dips
    expect(tiltFor({ leftX: 3, leftC: 9, rightX: 0, rightC: 10 }, 1)).toBe("left-heavy");
    // left = 1 < right = 10 → right dips
    expect(tiltFor({ leftX: 0, leftC: 1, rightX: 0, rightC: 10 }, 1)).toBe("right-heavy");
  });
  it("clamps the angle to ±4 degrees", () => {
    expect(tiltAngle("left-heavy")).toBe(4);
    expect(tiltAngle("right-heavy")).toBe(-4);
    expect(tiltAngle("balanced")).toBe(0);
  });
});
