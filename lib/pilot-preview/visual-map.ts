// lib/pilot-preview/visual-map.ts — decide whether a visual spec maps onto the
// REAL CoordinatePlane component's props WITHOUT inventing behavior, for the
// DEV-ONLY pilot preview. Constraint 4: axes ranges/labels, points, and a
// straight line map; arrows, readouts, reveal beats, gridline_every, and any
// interaction affordances (draggable points, handles, palettes) do NOT — those
// render as spec text beside the component, or the whole spec falls back to an
// amber "VISUAL SPEC — NOT BUILT" box. Never silently drop a spec field.
// Pure; no React, no IO.

export interface PlanePoint {
  x: number;
  y: number;
  label?: string;
}

export interface PlaneRender {
  frame: { xMin: number; xMax: number; yMin: number; yMax: number };
  xLabel: string;
  yLabel: string;
  points: PlanePoint[];
  /** Two points to draw the spec's line through (null = no line drawn). */
  lineThrough: [PlanePoint, PlanePoint] | null;
}

export type PlaneMapResult =
  | { ok: true; plane: PlaneRender; unmapped: string[] }
  | { ok: false; reason: string };

/** Spec fields that describe interaction the display component does not have. */
const INTERACTIVE_DATA_KEYS = [
  "draggable_point",
  "handles",
  "arrow_palette",
  "preview_line",
  "live_readout",
  "live_line",
];

/** CoordinatePlane draws a gridline + tick per integer; beyond this span the
 * render would be an unreadable mesh, so we refuse rather than misrepresent. */
const MAX_AXIS_SPAN = 60;

interface AxisSpec {
  label: string;
  range: [number, number];
  extras: string[]; // unmapped sub-fields, e.g. gridline_every
}

function readAxis(value: unknown, axisName: string): AxisSpec | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const range = v.range;
  if (
    !Array.isArray(range) ||
    range.length !== 2 ||
    !range.every((n) => typeof n === "number" && Number.isFinite(n)) ||
    (range[1] as number) <= (range[0] as number)
  ) {
    return null;
  }
  const extras: string[] = [];
  for (const [k, val] of Object.entries(v)) {
    if (k === "label" || k === "range") continue;
    extras.push(`${axisName}.${k}: ${JSON.stringify(val)}`);
  }
  return {
    label: typeof v.label === "string" ? v.label : axisName,
    range: [range[0] as number, range[1] as number],
    extras,
  };
}

function readPoints(value: unknown): PlanePoint[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: PlanePoint[] = [];
  for (const p of value) {
    if (typeof p !== "object" || p === null) return null;
    const v = p as Record<string, unknown>;
    if (typeof v.x !== "number" || typeof v.y !== "number") return null;
    if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) return null;
    out.push({
      x: v.x,
      y: v.y,
      label: typeof v.label === "string" && v.label !== "" ? v.label : undefined,
    });
  }
  return out;
}

/**
 * Map a visual spec (type + data) onto CoordinatePlane props. `ok: false`
 * carries the honest reason for the amber fallback box; `ok: true` carries the
 * props plus every spec field NOT rendered by the component (shown as text).
 */
export function mapCoordinatePlaneVisual(
  type: string,
  data: Record<string, unknown>,
): PlaneMapResult {
  if (type !== "coordinate-plane") {
    return { ok: false, reason: `type "${type}" has no built component` };
  }
  const interactive = INTERACTIVE_DATA_KEYS.filter((k) => k in data);
  if (interactive.length > 0) {
    return {
      ok: false,
      reason: `interaction fields (${interactive.join(", ")}) are not in the display component`,
    };
  }
  const xAxis = readAxis(data.x_axis, "x_axis");
  const yAxis = readAxis(data.y_axis, "y_axis");
  if (!xAxis || !yAxis) {
    return { ok: false, reason: "axis ranges missing or malformed" };
  }
  const xSpan = xAxis.range[1] - xAxis.range[0];
  const ySpan = yAxis.range[1] - yAxis.range[0];
  if (xSpan > MAX_AXIS_SPAN || ySpan > MAX_AXIS_SPAN) {
    return {
      ok: false,
      reason: `axis span ${Math.max(xSpan, ySpan)} exceeds CoordinatePlane's integer-tick rendering (max ${MAX_AXIS_SPAN})`,
    };
  }
  const points = readPoints(data.points);
  if (!points) {
    return { ok: false, reason: "points missing or malformed" };
  }

  const unmapped: string[] = [...xAxis.extras, ...yAxis.extras];
  let lineThrough: [PlanePoint, PlanePoint] | null = null;
  const consumed = new Set(["x_axis", "y_axis", "points"]);
  if (typeof data.line === "string") {
    consumed.add("line");
    if (/through/i.test(data.line) && points.length >= 2) {
      lineThrough = [points[0], points[1]];
      unmapped.push(
        `line: ${JSON.stringify(data.line)} (drawn solid through the first two points; dash/extension semantics shown as spec text)`,
      );
    } else {
      unmapped.push(`line: ${JSON.stringify(data.line)} (not drawn)`);
    }
  }
  for (const [k, v] of Object.entries(data)) {
    if (consumed.has(k)) continue;
    unmapped.push(`${k}: ${JSON.stringify(v)}`);
  }

  return {
    ok: true,
    plane: {
      frame: {
        xMin: xAxis.range[0],
        xMax: xAxis.range[1],
        yMin: yAxis.range[0],
        yMax: yAxis.range[1],
      },
      xLabel: xAxis.label,
      yLabel: yAxis.label,
      points,
      lineThrough,
    },
    unmapped,
  };
}

// ---------------------------------------------------------------------------
// Lesson visual fences (YAML-ish text) → best-effort {type, data} extraction.
// Extraction failure just means the amber spec box — never a guess.
// ---------------------------------------------------------------------------

const POINT_OBJ_RE = /\{\s*x:\s*(-?[\d.]+)\s*,\s*y:\s*(-?[\d.]+)\s*(?:,\s*label:\s*"([^"]*)")?\s*\}/g;

function extractAxis(raw: string, axis: "x_axis" | "y_axis"): Record<string, unknown> | null {
  const m = new RegExp(`${axis}:\\s*\\{([^}]*)\\}`).exec(raw);
  if (!m) return null;
  const body = m[1];
  const label = /label:\s*"([^"]+)"/.exec(body)?.[1];
  const range = /range:\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/.exec(body);
  if (!range) return null;
  const out: Record<string, unknown> = {
    label: label ?? axis,
    range: [Number(range[1]), Number(range[2])],
  };
  const grid = /gridline_every:\s*([\d.]+)/.exec(body);
  if (grid) out.gridline_every = Number(grid[1]);
  return out;
}

/**
 * Extract a coordinate-plane data object from a lesson ```visual fence's raw
 * text. Returns null when the fence is not a top-level coordinate-plane or the
 * fields cannot be read verbatim.
 */
export function extractLessonPlaneData(raw: string): Record<string, unknown> | null {
  const type = /^type:\s*(\S+)/m.exec(raw)?.[1];
  if (type !== "coordinate-plane") return null;
  const xAxis = extractAxis(raw, "x_axis");
  const yAxis = extractAxis(raw, "y_axis");
  if (!xAxis || !yAxis) return null;
  const pointsLine = /^\s*points:\s*\[(.+)\]\s*$/m.exec(raw)?.[1];
  if (!pointsLine) return null;
  const points: Record<string, unknown>[] = [];
  POINT_OBJ_RE.lastIndex = 0;
  let pm: RegExpExecArray | null;
  while ((pm = POINT_OBJ_RE.exec(pointsLine)) !== null) {
    points.push({
      x: Number(pm[1]),
      y: Number(pm[2]),
      ...(pm[3] !== undefined ? { label: pm[3] } : {}),
    });
  }
  if (points.length === 0) return null;
  const data: Record<string, unknown> = { x_axis: xAxis, y_axis: yAxis, points };
  const line = /^\s*line:\s*(.+)$/m.exec(raw)?.[1];
  if (line) data.line = line.trim();
  return data;
}
