import { describe, it, expect } from "vitest";
import {
  DEFAULT_LINE,
  clampValue,
  lineSpan,
  nudgeMarker,
  operationArc,
  pxToValue,
  ticksFor,
  valueToPx,
  type LineConfig,
} from "./number-line-math";

const cfg: LineConfig = { ...DEFAULT_LINE };

describe("number-line-math", () => {
  it("produces inclusive integer ticks", () => {
    expect(ticksFor({ ...cfg, from: -2, to: 2 })).toEqual([-2, -1, 0, 1, 2]);
  });
  it("span is to - from", () => {
    expect(lineSpan(cfg)).toBe(12);
  });
  it("round-trips value → px → value", () => {
    expect(pxToValue(valueToPx(3, cfg), cfg)).toBe(3);
    expect(pxToValue(valueToPx(-5, cfg), cfg)).toBe(-5);
  });
  it("snaps arbitrary px to the nearest integer tick", () => {
    const near3 = valueToPx(3, cfg) + 2;
    expect(pxToValue(near3, cfg)).toBe(3);
  });
  it("clamps to range", () => {
    expect(clampValue(99, cfg)).toBe(6);
    expect(clampValue(-99, cfg)).toBe(-6);
  });
  it("nudges by signed step and clamps at edge", () => {
    expect(nudgeMarker(5, 5, cfg)).toBe(6);
    expect(nudgeMarker(-5, -5, cfg)).toBe(-6);
    expect(nudgeMarker(0, 1, cfg)).toBe(1);
  });
  it("degenerate span does not divide by zero", () => {
    expect(valueToPx(0, { ...cfg, from: 0, to: 0 })).toBe(cfg.pad);
    expect(pxToValue(100, { ...cfg, from: 0, to: 0 })).toBe(0);
  });
});

describe("number-line-math: operation arc", () => {
  it("builds a positive arc label", () => {
    const arc = operationArc(2, 7);
    expect(arc.start).toBe(2);
    expect(arc.end).toBe(9);
    expect(arc.label).toBe("+7");
  });
  it("uses a typographic minus for negatives", () => {
    const arc = operationArc(5, -3);
    expect(arc.end).toBe(2);
    expect(arc.label).toBe("−3");
    expect(arc.label).not.toContain("-");
  });
});
