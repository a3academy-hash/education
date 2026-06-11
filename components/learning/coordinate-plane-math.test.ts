import { describe, it, expect } from "vitest";
import {
  DEFAULT_PLANE,
  clampToRange,
  equationReadout,
  fmt,
  lineThrough,
  nudge,
  pointLabel,
  pxToSnappedPoint,
  snapValue,
  toDataX,
  toDataY,
  toPxX,
  toPxY,
  unitPx,
  type PlaneConfig,
} from "./coordinate-plane-math";

const cfg: PlaneConfig = { ...DEFAULT_PLANE };

describe("coordinate-plane-math: mapping", () => {
  it("round-trips data → px → data for x", () => {
    expect(toDataX(toPxX(5, cfg), cfg)).toBeCloseTo(5);
  });
  it("round-trips data → px → data for y", () => {
    expect(toDataY(toPxY(7, cfg), cfg)).toBeCloseTo(7);
  });
  it("origin maps to bottom-left padding", () => {
    expect(toPxX(0, cfg)).toBeCloseTo(cfg.pad);
    expect(toPxY(0, cfg)).toBeCloseTo(cfg.size - cfg.pad);
  });
  it("unitPx is positive for a valid span", () => {
    expect(unitPx(cfg)).toBeGreaterThan(0);
  });
  it("unitPx is 0 for a degenerate span", () => {
    expect(unitPx({ ...cfg, min: 5, max: 5 })).toBe(0);
  });
});

describe("coordinate-plane-math: snapping/clamping", () => {
  it("snaps to nearest whole by default", () => {
    expect(snapValue(2.4, 1)).toBe(2);
    expect(snapValue(2.6, 1)).toBe(3);
  });
  it("supports half snap", () => {
    expect(snapValue(2.24, 0.5)).toBe(2);
    expect(snapValue(2.3, 0.5)).toBe(2.5);
  });
  it("never returns -0", () => {
    expect(Object.is(snapValue(-0.1, 1), -0)).toBe(false);
    expect(snapValue(-0.1, 1)).toBe(0);
  });
  it("clamps to range", () => {
    expect(clampToRange(-3, cfg)).toBe(0);
    expect(clampToRange(99, cfg)).toBe(10);
  });
  it("pxToSnappedPoint stays in range and snapped", () => {
    const p = pxToSnappedPoint(-50, -50, cfg);
    expect(p.x).toBeGreaterThanOrEqual(cfg.min);
    expect(p.y).toBeLessThanOrEqual(cfg.max);
    expect(Number.isInteger(p.x)).toBe(true);
  });
  it("nudge respects shift step and clamps at the edge", () => {
    expect(nudge(9, 5, cfg)).toBe(10);
    expect(nudge(1, -5, cfg)).toBe(0);
  });
});

describe("coordinate-plane-math: line model", () => {
  it("computes slope and intercept", () => {
    const l = lineThrough({ x: 0, y: 2 }, { x: 1, y: 4 });
    expect(l.slope).toBe(2);
    expect(l.intercept).toBe(2);
    expect(l.rise).toBe(2);
    expect(l.run).toBe(1);
  });
  it("handles a vertical line without throwing", () => {
    const l = lineThrough({ x: 3, y: 0 }, { x: 3, y: 5 });
    expect(l.slope).toBeNull();
    expect(l.intercept).toBeNull();
  });
  it("formats an equation readout with real minus", () => {
    const l = lineThrough({ x: 0, y: -2 }, { x: 1, y: 0 });
    const out = equationReadout(l);
    expect(out).toContain("m = 2");
    expect(out).toContain("−");
    expect(out).not.toContain("-2x"); // hyphen-minus should not appear
  });
  it("readout flags vertical lines", () => {
    const l = lineThrough({ x: 3, y: 0 }, { x: 3, y: 5 });
    expect(equationReadout(l)).toContain("undefined");
  });
});

describe("coordinate-plane-math: formatting", () => {
  it("fmt keeps integers bare", () => {
    expect(fmt(3)).toBe("3");
    expect(fmt(2.5)).toBe("2.5");
  });
  it("pointLabel renders an ordered pair", () => {
    expect(pointLabel({ x: 3, y: 2 })).toBe("(3, 2)");
  });
});
