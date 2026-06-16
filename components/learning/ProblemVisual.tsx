// ProblemVisual (§D) — the SINGLE source of truth mapping a problem's
// visualSpec → the right learning primitive. Replaces the three duplicated,
// hardcoded scratch visuals (DiagnosticFlow.ItemVisual, the Practice scratch
// surface, LearnClient.Manipulable's seeded plane/line).
//
// DEGRADE-SAFE: with NO spec — or a spec whose kind is not a renderable kind,
// or whose kind disagrees with `visual` — this renders NOTHING (returns null).
// Since no problem carries a visualSpec yet (authored in B2), every item today
// renders a clean prompt + input, which by itself removes the broken-decoration
// / stray-click bug. Real geometry lights up node-by-node in B2.

"use client";

import { CoordinatePlane, type LabeledPoint } from "./CoordinatePlane";
import { NumberLine } from "./NumberLine";
import { DataTable } from "./DataTable";
import type {
  Phase,
  Sport,
  VisualKind,
  VisualSpec,
  CoordinateSpec,
  NumberLineSpec,
  TableSpec,
} from "../../types";

export interface ProblemVisualProps {
  /** The declared visual kind (node/problem). Used only for the degrade gate. */
  visual: VisualKind | null;
  /** Geometry. When absent or non-renderable, nothing is drawn. */
  visualSpec?: VisualSpec;
  sport: Sport;
  phase: Phase;
  /**
   * LEARN/explore context flag (adapter fix, mr-gates #3). When true, an
   * interactive coordinate spec runs in EXPLORE mode (background clicks APPEND
   * up to a concept cap, full live equation) — the Learn lesson area opts in.
   * When false/absent (the assess context: Diagnostic / Practice plot items),
   * an interactive spec stays SINGLE-POINT reposition and NEVER appends.
   * Explore is NO LONGER inferred from `affordances.includes("place")`.
   */
  explore?: boolean;
  /**
   * Baseball-native visual (STYLE_GUIDE §6): draw the strike-zone grid behind a
   * coordinate plane. Defaults to the Learn/explore context (the immersive
   * lesson surface), OFF in assess (Diagnostic/Practice) where it would add
   * noise to a graded item. Pass explicitly to override.
   */
  strikeZone?: boolean;
  /**
   * Interactive sink for placed/dragged geometry. Only consulted when the spec
   * is interactive (the engine still grades server-side; this is the response
   * surface). Display specs ignore it.
   */
  onChange?: (spec: VisualSpec) => void;
}

/**
 * Render the primitive a problem's visualSpec describes, or null.
 *
 * The degrade-safe contract is enforced here once:
 *  - no spec → null
 *  - spec.kind not a renderable kind → null (the union already excludes the
 *    non-renderable kinds, so this is structural)
 *  - spec.kind disagrees with `visual` → null (an authoring drift guard; the
 *    validator also flags this, but the UI refuses to render the mismatch)
 */
export function ProblemVisual({
  visual,
  visualSpec,
  sport,
  phase,
  explore = false,
  strikeZone,
  onChange,
}: ProblemVisualProps): React.ReactElement | null {
  // sport/phase are part of the documented mapper contract and feed axis
  // labels / captions per-kind in B2; referenced here so the public signature
  // stays stable without an unused-var warning.
  void sport;
  void phase;

  if (!visualSpec) return null;
  // Spec must agree with the declared visual kind (when one is declared).
  if (visual !== null && visual !== visualSpec.kind) return null;

  switch (visualSpec.kind) {
    case "coordinate":
      return (
        <CoordinatePlaneFromSpec
          spec={visualSpec}
          explore={explore}
          strikeZone={strikeZone ?? explore}
          onChange={onChange}
        />
      );
    case "numberline":
      return <NumberLineFromSpec spec={visualSpec} onChange={onChange} />;
    case "table":
      return <TableFromSpec spec={visualSpec} />;
    default:
      // Exhaustiveness guard — the union is renderable-only.
      return null;
  }
}

// ---------------------------------------------------------------------------
// Per-kind adapters. Sport/phase reach the primitives ONLY as axis labels /
// captions; geometry is sport-agnostic (engine rule).
// ---------------------------------------------------------------------------

function CoordinatePlaneFromSpec({
  spec,
  explore,
  strikeZone,
  onChange,
}: {
  spec: CoordinateSpec;
  /** Explore is decided by the CALLER's context (Learn lesson area), NOT by the
   * spec's affordances — so per-item plot problems never append a stray point. */
  explore: boolean;
  strikeZone?: boolean;
  onChange?: (spec: VisualSpec) => void;
}) {
  const points: LabeledPoint[] = (spec.points ?? []).map((p) => ({
    x: p.x,
    y: p.y,
    label: p.label,
  }));
  const interactive = spec.mode === "interactive";
  // Explore append (multi-point, up to the concept cap) is gated on the lesson
  // context flag + interactive mode — adapter fix, mr-gates #3.
  const exploreActive = explore && interactive;

  return (
    <CoordinatePlane
      points={points}
      mode={spec.mode}
      explore={exploreActive}
      frame={spec.frame}
      lines={spec.lines}
      segments={spec.segments}
      snap={spec.snap}
      strikeZone={strikeZone}
      xLabel={spec.xLabel}
      yLabel={spec.yLabel}
      onChange={
        interactive && onChange
          ? (next) =>
              onChange({
                ...spec,
                points: next.map((p) => ({ x: p.x, y: p.y, label: p.label })),
              })
          : undefined
      }
    />
  );
}

function NumberLineFromSpec({
  spec,
  onChange,
}: {
  spec: NumberLineSpec;
  onChange?: (spec: VisualSpec) => void;
}) {
  const interactive = spec.mode === "interactive";
  // Display markers carry the value; the live "value" for an interactive line
  // is the first marker (or range start) until the student moves it.
  const seed = spec.markers?.[0]?.value ?? spec.range.min;
  return (
    <NumberLine
      value={seed}
      mode={spec.mode}
      from={spec.range.min}
      to={spec.range.max}
      markers={spec.mode === "display" ? spec.markers : undefined}
      operationDelta={spec.operationDelta}
      onChange={
        interactive && onChange
          ? (value) =>
              onChange({
                ...spec,
                markers: [{ value }],
              })
          : undefined
      }
    />
  );
}

function TableFromSpec({ spec }: { spec: TableSpec }) {
  const columns = spec.headers.map((header, i) => ({
    key: `c${i}`,
    header,
  }));
  const rows = spec.rows.map((row) => {
    const r: Record<string, { text: string }> = {};
    row.forEach((cell, i) => {
      r[`c${i}`] = { text: cell };
    });
    return r;
  });
  return <DataTable columns={columns} rows={rows} />;
}
