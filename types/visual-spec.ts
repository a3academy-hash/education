// Per-problem visual specification (Phase 8 / B §A). ADDITIVE, OPTIONAL, NO `any`.
//
// DEGRADE-SAFE CONTRACT: a problem renders NO visual surface (clean prompt +
// input) unless it carries a `visualSpec` whose `kind` is a RENDERABLE kind
// here (coordinate | numberline | table). `visualSpec` is INDEPENDENT of the
// node/problem `visual` field: an item may declare visual:"coordinate" and
// carry no spec — it renders nothing. Decoration must never reappear by
// omission. The renderable set EXCLUDES balance / area-model / graph / boxplot
// / histogram / scatter (no primitive built in B).

export type VisualMode = "display" | "interactive";

export type PlaneAffordance =
  | "place"
  | "drag"
  | "clear"
  | "snap"
  | "labels"
  | "readout";

export interface SpecPoint {
  x: number;
  y: number;
  label?: string;
}

export interface SpecLine {
  through?: [SpecPoint, SpecPoint];
  slope?: number;
  intercept?: number;
  style?: "solid" | "dashed";
}

export interface Frame {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface CoordinateSpec {
  kind: "coordinate";
  mode: VisualMode;
  points?: SpecPoint[];
  lines?: SpecLine[];
  segments?: [SpecPoint, SpecPoint][];
  xLabel?: string;
  yLabel?: string;
  frame?: Frame;
  snap?: 1 | 0.5;
  affordances?: PlaneAffordance[];
}

export interface NumberLineSpec {
  kind: "numberline";
  mode: VisualMode;
  range: { min: number; max: number };
  markers?: { value: number; label?: string }[];
  operationDelta?: number;
  affordances?: ("drag" | "clear" | "labels")[];
}

export interface TableSpec {
  kind: "table";
  mode: VisualMode;
  headers: string[];
  /** Display rows only; fillable cells stay on the existing DataCellSpec path. */
  rows: string[][];
}

/** Renderable kinds ONLY — excludes balance/area-model/graph/boxplot/histogram/scatter. */
export type VisualSpec = CoordinateSpec | NumberLineSpec | TableSpec;

/** The renderable discriminants of a VisualSpec — the degrade-safe gate set. */
export const RENDERABLE_VISUAL_KINDS = ["coordinate", "numberline", "table"] as const;
export type RenderableVisualKind = (typeof RENDERABLE_VISUAL_KINDS)[number];
