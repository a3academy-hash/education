// Pure coordinate-plane math (mr-gates condition 8). No React, no SVG, no
// engine/repository imports. CoordinatePlane.tsx stays thin over these.

export interface Point {
  x: number;
  y: number;
}

export interface PlaneConfig {
  /** Inclusive min/max for both axes. */
  min: number;
  max: number;
  /** Pixel size of the (square) plotting area. */
  size: number;
  /** Inner padding in px around the plotting area. */
  pad: number;
  /** Snap increment (default 1; 0.5 allowed). */
  snap: number;
}

export const DEFAULT_PLANE: PlaneConfig = {
  min: 0,
  max: 10,
  size: 320,
  pad: 28,
  snap: 1,
};

/** Pixels per axis unit for the given config. */
export function unitPx(cfg: PlaneConfig): number {
  const span = cfg.max - cfg.min;
  if (span <= 0) return 0;
  return (cfg.size - 2 * cfg.pad) / span;
}

/** Data x → svg px (x grows right). */
export function toPxX(x: number, cfg: PlaneConfig): number {
  return cfg.pad + (x - cfg.min) * unitPx(cfg);
}

/** Data y → svg px (y grows up, so invert). */
export function toPxY(y: number, cfg: PlaneConfig): number {
  return cfg.size - cfg.pad - (y - cfg.min) * unitPx(cfg);
}

/** svg px x → data x (unsnapped). */
export function toDataX(px: number, cfg: PlaneConfig): number {
  const u = unitPx(cfg);
  if (u === 0) return cfg.min;
  return cfg.min + (px - cfg.pad) / u;
}

/** svg px y → data y (unsnapped). */
export function toDataY(px: number, cfg: PlaneConfig): number {
  const u = unitPx(cfg);
  if (u === 0) return cfg.min;
  return cfg.min + (cfg.size - cfg.pad - px) / u;
}

/** Round to the nearest snap increment. */
export function snapValue(v: number, snap: number): number {
  if (snap <= 0) return v;
  const snapped = Math.round(v / snap) * snap;
  // avoid -0 and floating dust
  return Number((snapped + 0).toFixed(6));
}

/** Clamp a value to the config's axis range. */
export function clampToRange(v: number, cfg: PlaneConfig): number {
  return Math.max(cfg.min, Math.min(cfg.max, v));
}

/** Convert a raw pointer position (px) to a snapped, clamped data point. */
export function pxToSnappedPoint(
  px: number,
  py: number,
  cfg: PlaneConfig,
): Point {
  return {
    x: clampToRange(snapValue(toDataX(px, cfg), cfg.snap), cfg),
    y: clampToRange(snapValue(toDataY(py, cfg), cfg.snap), cfg),
  };
}

/** Nudge a value by step (keyboard arrows), snapped and clamped. */
export function nudge(v: number, step: number, cfg: PlaneConfig): number {
  return clampToRange(snapValue(v + step, cfg.snap), cfg);
}

export interface LineModel {
  /** slope; null when the two points share an x (vertical / undefined). */
  slope: number | null;
  /** y-intercept; null when slope is null. */
  intercept: number | null;
  /** Δy between the two points. */
  rise: number;
  /** Δx between the two points. */
  run: number;
}

/** Slope/intercept and rise/run from two points; degenerate-safe. */
export function lineThrough(a: Point, b: Point): LineModel {
  const rise = b.y - a.y;
  const run = b.x - a.x;
  if (run === 0) {
    return { slope: null, intercept: null, rise, run };
  }
  const slope = rise / run;
  const intercept = a.y - slope * a.x;
  return { slope, intercept, rise, run };
}

/** Tidy number for display: integers bare, otherwise up to 2 dp, trimmed. */
export function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return Number(n.toFixed(2)).toString();
}

/** Mono equation readout, e.g. "m = 2 · y = 2x − 2". Uses real minus signs. */
export function equationReadout(line: LineModel): string {
  if (line.slope === null || line.intercept === null) {
    return "x = constant (vertical line — slope undefined)";
  }
  const m = line.slope;
  const b = line.intercept;
  const mPart = `m = ${fmt(m)}`;
  const slopeTerm =
    m === 1 ? "x" : m === -1 ? `${minus(1)}x` : `${fmt(m)}x`;
  let bTerm = "";
  if (b > 0) bTerm = ` + ${fmt(b)}`;
  else if (b < 0) bTerm = ` ${minus(Math.abs(b))}`;
  return `${mPart} · y = ${slopeTerm}${bTerm}`;
}

/** Prefix a magnitude with a typographic minus (U+2212). */
function minus(magnitude: number): string {
  return `− ${fmt(magnitude)}`.replace("− ", "−");
}

/** Point label like "(3, 2)". */
export function pointLabel(p: Point): string {
  return `(${fmt(p.x)}, ${fmt(p.y)})`;
}
