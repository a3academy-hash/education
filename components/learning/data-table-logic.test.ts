import { describe, it, expect } from "vitest";
import { checkCell, initCell, isCorrect, normalizeAnswer } from "./data-table-logic";

describe("data-table-logic", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeAnswer(" 3 X ")).toBe("3x");
  });
  it("isCorrect ignores spacing and case", () => {
    expect(isCorrect("3 x", "3X")).toBe(true);
    expect(isCorrect("4", "3")).toBe(false);
  });
  it("empty expected is never correct", () => {
    expect(isCorrect("", "")).toBe(false);
  });
  it("confirms a correct submission", () => {
    const cell = { ...initCell(), value: "6" };
    const r = checkCell(cell, "6");
    expect(r.outcome).toBe("correct");
    expect(r.next.status).toBe("confirmed");
    expect(r.resolved).toBe(true);
  });
  it("errors on a first miss without resolving", () => {
    const cell = { ...initCell(), value: "5" };
    const r = checkCell(cell, "6");
    expect(r.outcome).toBe("first-miss");
    expect(r.next.status).toBe("error");
    expect(r.next.misses).toBe(1);
    expect(r.resolved).toBe(false);
  });
  it("reveals the answer on the second miss and never blocks", () => {
    let cell = { ...initCell(), value: "5" };
    cell = checkCell(cell, "6").next;
    cell = { ...cell, value: "7" };
    const r = checkCell(cell, "6");
    expect(r.outcome).toBe("second-miss");
    expect(r.next.status).toBe("revealed");
    expect(r.next.value).toBe("6");
    expect(r.resolved).toBe(true);
  });
});
