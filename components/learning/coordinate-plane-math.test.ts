import { describe, it, expect } from "vitest";
import {
  DEFAULT_FRAME,
  DEFAULT_PLANE,
  clampToRange,
  equationReadout,
  fmt,
  frameFor,
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
  type Frame,
  type PlaneConfig,
  type Point,
} from "./coordinate-plane-math";

const span = (lo: number, hi: number) => hi - lo;
const isSquare = (f: Frame) =>
  span(f.xMin, f.xMax) === span(f.yMin, f.yMax);
const allInteger = (f: Frame) =>
  [f.xMin, f.xMax, f.yMin, f.yMax].every(Number.isInteger);
const includesOrigin = (f: Frame) =>
  f.xMin <= 0 && f.xMax >= 0 && f.yMin <= 0 && f.yMax >= 0;
const contains = (f: Frame, p: Point) =>
  p.x >= f.xMin && p.x <= f.xMax && p.y >= f.yMin && p.y <= f.yMax;

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

describe("coordinate-plane-math: frameFor (auto-frame §C)", () => {
  it("empty geometry → origin-centered default frame", () => {
    expect(frameFor([])).toEqual(DEFAULT_FRAME);
  });

  it("all-invalid geometry → default frame (never blank)", () => {
    expect(frameFor([{ x: NaN, y: 2 }, { x: 3, y: Infinity }])).toEqual(
      DEFAULT_FRAME,
    );
  });

  it("always includes the origin on both axes (first-quadrant data)", () => {
    const f = frameFor([{ x: 6, y: 8 }, { x: 9, y: 5 }]);
    expect(includesOrigin(f)).toBe(true);
  });

  it("renders negative quadrants when data is negative", () => {
    const f = frameFor([{ x: -3, y: 5 }, { x: 2, y: -4 }]);
    expect(f.xMin).toBeLessThan(0);
    expect(f.yMin).toBeLessThan(0);
    expect(includesOrigin(f)).toBe(true);
  });

  it("produces a square frame with integer bounds", () => {
    const f = frameFor([{ x: -3, y: 5 }, { x: 9, y: -1 }]);
    expect(isSquare(f)).toBe(true);
    expect(allInteger(f)).toBe(true);
  });

  it("enforces a minimum span of 4 for tightly clustered data", () => {
    // A single point near the origin: padding alone is small; min-span lifts it.
    const f = frameFor([{ x: 1, y: 1 }]);
    expect(span(f.xMin, f.xMax)).toBeGreaterThanOrEqual(4);
    expect(span(f.yMin, f.yMax)).toBeGreaterThanOrEqual(4);
    expect(isSquare(f)).toBe(true);
  });

  it("pads by at least 1 unit beyond the extreme points", () => {
    const f = frameFor([{ x: 5, y: 5 }]);
    // The data max (5) must sit strictly inside the framed max.
    expect(f.xMax).toBeGreaterThan(5);
    expect(f.yMax).toBeGreaterThan(5);
  });

  it("pads by ~10% of span for a wide spread", () => {
    // Span 0..20 → pad = ceil(0.1*20) = 2.
    const f = frameFor([{ x: 0, y: 0 }, { x: 20, y: 0 }]);
    expect(f.xMax).toBe(22);
  });

  it("keeps every data point inside the frame", () => {
    const pts: Point[] = [{ x: -7, y: 3 }, { x: 4, y: -9 }, { x: 1, y: 1 }];
    const f = frameFor(pts);
    for (const p of pts) expect(contains(f, p)).toBe(true);
  });

  it("includes a line's endpoints in the frame", () => {
    const f = frameFor([], [{ through: [{ x: -6, y: 0 }, { x: 0, y: 6 }] }]);
    expect(contains(f, { x: -6, y: 0 })).toBe(true);
    expect(contains(f, { x: 0, y: 6 })).toBe(true);
    expect(isSquare(f)).toBe(true);
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
