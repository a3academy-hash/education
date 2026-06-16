// CoordinatePlane (§C, finished). SVG, props = pure data + callbacks. No engine
// or repository imports. Spec-driven: an explicit `frame` (or frameFor over the
// geometry), axes drawn AT ZERO when 0 ∈ frame, and mode-gated interactivity:
//
//   mode "display"     → read-only illustration (no onChange, no click, no drag)
//   mode "interactive" → background click REPOSITIONS the single answer point
//   affordance "explore" (Learn) → background click APPENDS up to a concept cap
//
// Pointer + keyboard parity, visible SVG focus ring on handles, aria-live value
// announcements, reduced-motion = instant (inherited from global tokens; this
// component animates nothing imperatively).

"use client";

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "../ui/Button";
import {
  DEFAULT_FRAME,
  equationReadout,
  fmt,
  frameFor,
  lineThrough,
  pointLabel,
  snapValue,
  type Frame,
  type FrameLine,
  type Point,
} from "./coordinate-plane-math";

export type PlaneMode = "display" | "interactive";

/** A line to draw: through two points (preferred) or slope/intercept. */
export interface PlaneLine {
  through?: [Point, Point];
  slope?: number;
  intercept?: number;
  style?: "solid" | "dashed";
}

/** A point with an optional label rendered beside it. */
export interface LabeledPoint extends Point {
  label?: string;
}

export interface CoordinatePlaneProps {
  points: LabeledPoint[];
  onChange?: (points: LabeledPoint[]) => void;
  /**
   * Interaction posture. "display" is read-only (no onChange honored even if
   * passed); "interactive" repositions the single answer point on background
   * click. Default "display" — decoration never reappears by omission.
   */
  mode?: PlaneMode;
  /**
   * Explore mode (Learn only): background clicks APPEND points up to
   * `exploreCap`. Requires mode "interactive".
   */
  explore?: boolean;
  exploreCap?: number;
  /** Explicit frame; when absent it is auto-computed from the geometry. */
  frame?: Frame;
  /** Lines drawn over the plane (display geometry). */
  lines?: PlaneLine[];
  /** Standalone segments (two points each), drawn but not extended to a line. */
  segments?: [Point, Point][];
  /** Snap increment; 1 default, 0.5 allowed. */
  snap?: 1 | 0.5;
  /** Draw the connecting line + equation readout when exactly two points exist. */
  showLine?: boolean;
  /** Draw the dashed rise/run elbow for the two-point line. */
  showRiseRun?: boolean;
  /** Axis labels — sport semantics live HERE only (P1 → P3), never imagery. */
  xLabel?: string;
  yLabel?: string;
  /** Max rendered size in px (clamped 320..420). */
  size?: number;
  caption?: string;
  /**
   * Baseball-native visual (STYLE_GUIDE §6): draw a restrained strike-zone grid
   * behind the plane so a coordinate/slope problem reads like a strike-zone
   * readout. Purely decorative (aria-hidden); never changes the math or ticks.
   */
  strikeZone?: boolean;
}

const PAD = 28;

export function CoordinatePlane({
  points,
  onChange,
  mode = "display",
  explore = false,
  exploreCap = 6,
  frame,
  lines = [],
  segments = [],
  snap = 1,
  showLine = true,
  showRiseRun = false,
  xLabel = "x",
  yLabel = "y",
  size = 320,
  caption,
  strikeZone = false,
}: CoordinatePlaneProps) {
  const interactive = mode === "interactive";
  const clampedSize = Math.max(320, Math.min(420, size));
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [placedPoint, setPlacedPoint] = useState<Point | null>(null);
  const titleId = useId();

  // dev-only invalid-prop guard: render frame, suppress the bad point.
  const safePoints = useMemo<LabeledPoint[]>(
    () =>
      points.filter((p, i) => {
        const ok = Number.isFinite(p?.x) && Number.isFinite(p?.y);
        if (!ok && process.env.NODE_ENV !== "production") {
          console.warn(`CoordinatePlane: point ${i} is not finite, suppressed.`, p);
        }
        return ok;
      }),
    [points],
  );

  // Frame: explicit spec.frame ?? auto-frame over points+lines+segments.
  const fr: Frame = useMemo(() => {
    if (frame) {
      const ok = [frame.xMin, frame.xMax, frame.yMin, frame.yMax].every(
        Number.isFinite,
      );
      if (ok && frame.xMax > frame.xMin && frame.yMax > frame.yMin) return frame;
      if (process.env.NODE_ENV !== "production") {
        console.warn("CoordinatePlane: invalid frame prop, using auto-frame.", frame);
      }
    }
    const frameLines: FrameLine[] = [
      ...lines.map((l) => ({ through: l.through, slope: l.slope, intercept: l.intercept })),
      ...segments.map((s) => ({ through: s })),
    ];
    return frameFor(safePoints, frameLines);
  }, [frame, lines, segments, safePoints]);

  const fallbackFrame = fr ?? DEFAULT_FRAME;

  // Per-axis pixel mapping over the (square) frame.
  const xSpan = fallbackFrame.xMax - fallbackFrame.xMin;
  const ySpan = fallbackFrame.yMax - fallbackFrame.yMin;
  const inner = clampedSize - 2 * PAD;
  const px = useCallback(
    (x: number) => PAD + ((x - fallbackFrame.xMin) / xSpan) * inner,
    [fallbackFrame.xMin, xSpan, inner],
  );
  const py = useCallback(
    (y: number) => clampedSize - PAD - ((y - fallbackFrame.yMin) / ySpan) * inner,
    [fallbackFrame.yMin, ySpan, inner, clampedSize],
  );

  // Axes at data-0 when 0 is inside the frame; otherwise pin to the edge.
  const xZero = fallbackFrame.xMin <= 0 && fallbackFrame.xMax >= 0;
  const yZero = fallbackFrame.yMin <= 0 && fallbackFrame.yMax >= 0;
  const axisX = yZero ? 0 : fallbackFrame.yMin; // y-value where the x-axis sits
  const axisY = xZero ? 0 : fallbackFrame.xMin; // x-value where the y-axis sits

  // Integer ticks; thin labels when the span is large.
  const xTicks = useMemo(() => integerTicks(fallbackFrame.xMin, fallbackFrame.xMax), [fallbackFrame.xMin, fallbackFrame.xMax]);
  const yTicks = useMemo(() => integerTicks(fallbackFrame.yMin, fallbackFrame.yMax), [fallbackFrame.yMin, fallbackFrame.yMax]);
  const labelEvery = Math.max(xSpan, ySpan) > 16 ? 2 : 1;

  const line =
    showLine && safePoints.length === 2
      ? lineThrough(safePoints[0], safePoints[1])
      : null;

  const clientToData = useCallback(
    (clientX: number, clientY: number): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: fallbackFrame.xMin, y: fallbackFrame.yMin };
      const rect = svg.getBoundingClientRect();
      const sx = ((clientX - rect.left) / rect.width) * clampedSize;
      const sy = ((clientY - rect.top) / rect.height) * clampedSize;
      const dataX = fallbackFrame.xMin + ((sx - PAD) / inner) * xSpan;
      const dataY = fallbackFrame.yMin + ((clampedSize - PAD - sy) / inner) * ySpan;
      return {
        x: clampAxis(snapValue(dataX, snap), fallbackFrame.xMin, fallbackFrame.xMax),
        y: clampAxis(snapValue(dataY, snap), fallbackFrame.yMin, fallbackFrame.yMax),
      };
    },
    [fallbackFrame, clampedSize, inner, xSpan, ySpan, snap],
  );

  const commit = useCallback(
    (idx: number, next: Point) => {
      if (!interactive) return;
      const updated = points.map((p, i) =>
        i === idx ? { ...p, x: next.x, y: next.y } : p,
      );
      onChange?.(updated);
    },
    [points, onChange, interactive],
  );

  const onPointerDownHandle = (idx: number) => (e: ReactPointerEvent) => {
    if (!interactive) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setActiveIdx(idx);
    setDraggingIdx(idx);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!interactive || draggingIdx === null) return;
    commit(draggingIdx, clientToData(e.clientX, e.clientY));
  };

  const endDrag = () => setDraggingIdx(null);

  // Background placement. Display → inert. Interactive/plot → REPOSITION the
  // single answer point (replace, never append). Explore (Learn) → append up to
  // the concept cap. A pointerdown that lands on an existing handle is ignored
  // here (the handle drag owns it), so dragging never also places.
  const onBackgroundPointerDown = (e: ReactPointerEvent) => {
    if (!interactive) return;
    if (draggingIdx !== null) return;
    const target = e.target as Element;
    if (target.closest?.('[role="slider"]')) return;
    const next = clientToData(e.clientX, e.clientY);
    if (explore) {
      if (points.length >= exploreCap) return;
      onChange?.([...points, next]);
      setActiveIdx(points.length);
    } else {
      // plot: a single answer point — replace if one exists, else create.
      onChange?.([next]);
      setActiveIdx(0);
    }
    setPlacedPoint(next);
  };

  const onHandleKeyDown = (idx: number) => (e: ReactKeyboardEvent) => {
    if (!interactive) return;
    const step = (e.shiftKey ? 5 : 1) * snap;
    const p = points[idx];
    let next: Point | null = null;
    switch (e.key) {
      case "ArrowRight":
        next = { x: clampAxis(snapValue(p.x + step, snap), fallbackFrame.xMin, fallbackFrame.xMax), y: p.y };
        break;
      case "ArrowLeft":
        next = { x: clampAxis(snapValue(p.x - step, snap), fallbackFrame.xMin, fallbackFrame.xMax), y: p.y };
        break;
      case "ArrowUp":
        next = { x: p.x, y: clampAxis(snapValue(p.y + step, snap), fallbackFrame.yMin, fallbackFrame.yMax) };
        break;
      case "ArrowDown":
        next = { x: p.x, y: clampAxis(snapValue(p.y - step, snap), fallbackFrame.yMin, fallbackFrame.yMax) };
        break;
      default:
        return;
    }
    e.preventDefault();
    setActiveIdx(idx);
    if (next) commit(idx, next);
  };

  // Reset (interactive only). plot → clear the placed point; explore → caller
  // owns the seed, so we delegate by emitting an empty set and refocusing the
  // first handle if one survives. Focus returns to the live region's handle.
  const onReset = () => {
    if (!interactive) return;
    setPlacedPoint(null);
    setActiveIdx(null);
    onChange?.([]);
    // Return focus to the SVG group so keyboard users keep their place.
    requestAnimationFrame(() => svgRef.current?.focus?.());
  };

  const placedAnnouncement = placedPoint
    ? `Point placed at ${fmt(placedPoint.x)} comma ${fmt(placedPoint.y)}. `
    : "";

  const announce =
    placedAnnouncement +
    (safePoints.length > 0
      ? safePoints.map((p, i) => `Point ${i + 1} at ${pointLabel(p)}`).join(". ") +
        (line ? `. ${equationReadout(line)}` : "")
      : "No points placed.");

  // Per-mode readout strip (fixed height). display → slope/equation; plot →
  // placed coordinate only (no derived equation hand-out); explore → equation.
  const readout = readoutFor({ mode, explore, line, points: safePoints });

  // Lines to draw: explicit spec lines + the two-point auto-line.
  const drawLines = useMemo(
    () => buildDrawLines(lines, line, safePoints),
    [lines, line, safePoints],
  );

  return (
    <div className="inline-flex flex-col gap-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${clampedSize} ${clampedSize}`}
        width="100%"
        role="group"
        tabIndex={-1}
        aria-labelledby={titleId}
        style={{
          maxWidth: clampedSize,
          touchAction: "none",
          cursor: interactive ? "crosshair" : undefined,
        }}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <title id={titleId}>
          Coordinate plane, {xLabel} by {yLabel}
        </title>

        {/* gridlines */}
        {xTicks.map((t) => (
          <line
            key={`gx-${t}`}
            x1={px(t)}
            y1={py(fallbackFrame.yMin)}
            x2={px(t)}
            y2={py(fallbackFrame.yMax)}
            stroke="var(--color-selected)"
            strokeWidth={1}
          />
        ))}
        {yTicks.map((t) => (
          <line
            key={`gy-${t}`}
            x1={px(fallbackFrame.xMin)}
            y1={py(t)}
            x2={px(fallbackFrame.xMax)}
            y2={py(t)}
            stroke="var(--color-selected)"
            strokeWidth={1}
          />
        ))}

        {/* baseball strike-zone overlay (§6) — restrained, decorative */}
        {strikeZone && <StrikeZone fr={fallbackFrame} px={px} py={py} />}

        {/* axes — drawn AT ZERO when 0 ∈ frame, so the four quadrants read */}
        <line
          x1={px(fallbackFrame.xMin)}
          y1={py(axisX)}
          x2={px(fallbackFrame.xMax)}
          y2={py(axisX)}
          stroke="var(--color-axis)"
          strokeWidth={1.5}
        />
        <line
          x1={px(axisY)}
          y1={py(fallbackFrame.yMin)}
          x2={px(axisY)}
          y2={py(fallbackFrame.yMax)}
          stroke="var(--color-axis)"
          strokeWidth={1.5}
        />

        {/* axis ticks (mono) */}
        {xTicks.map((t) =>
          t === axisY ? null : (
            <text
              key={`tx-${t}`}
              x={px(t)}
              y={py(axisX) + 16}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-ink-500)"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t % labelEvery === 0 ? t : ""}
            </text>
          ),
        )}
        {yTicks.map((t) =>
          t === axisX ? null : (
            <text
              key={`ty-${t}`}
              x={px(axisY) - 8}
              y={py(t) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-ink-500)"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t % labelEvery === 0 ? t : ""}
            </text>
          ),
        )}

        {/* standalone segments */}
        {segments.map((s, i) => (
          <line
            key={`seg-${i}`}
            x1={px(s[0].x)}
            y1={py(s[0].y)}
            x2={px(s[1].x)}
            y2={py(s[1].y)}
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ))}

        {/* rise/run elbow for the auto two-point line */}
        {showRiseRun && line && safePoints.length === 2 && (
          <RiseRun a={safePoints[0]} b={safePoints[1]} px={px} py={py} />
        )}

        {/* lines (spec + auto), clipped to the frame edges */}
        {drawLines.map((dl, i) => (
          <line
            key={`line-${i}`}
            x1={px(fallbackFrame.xMin)}
            y1={py(dl.slope * fallbackFrame.xMin + dl.intercept)}
            x2={px(fallbackFrame.xMax)}
            y2={py(dl.slope * fallbackFrame.xMax + dl.intercept)}
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={dl.style === "dashed" ? "5 4" : undefined}
          />
        ))}

        {/* points */}
        {safePoints.map((p, i) => {
          const active = activeIdx === i || draggingIdx === i;
          const showHalo = active || hoverIdx === i;
          const labelText = p.label ?? pointLabel(p);
          return (
            <g
              key={`pt-${i}`}
              tabIndex={interactive ? 0 : -1}
              role={interactive ? "slider" : "img"}
              aria-label={`Point ${i + 1}`}
              aria-valuetext={pointLabel(p)}
              className={
                interactive
                  ? "cursor-grab focus:outline-none [&:active]:cursor-grabbing"
                  : "focus:outline-none"
              }
              onPointerDown={onPointerDownHandle(i)}
              onKeyDown={onHandleKeyDown(i)}
              onFocus={() => {
                if (!interactive) return;
                setActiveIdx(i);
                setFocusIdx(i);
              }}
              onBlur={() => setFocusIdx((cur) => (cur === i ? null : cur))}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {focusIdx === i && (
                <circle
                  cx={px(p.x)}
                  cy={py(p.y)}
                  r={13}
                  fill="transparent"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  strokeOpacity={0.5}
                />
              )}
              {showHalo && (
                <circle
                  cx={px(p.x)}
                  cy={py(p.y)}
                  r={11}
                  fill="var(--color-accent)"
                  fillOpacity={0.25}
                />
              )}
              <circle cx={px(p.x)} cy={py(p.y)} r={12} fill="transparent" />
              <circle
                cx={px(p.x)}
                cy={py(p.y)}
                r={6}
                fill={active ? "var(--color-accent)" : "var(--color-ink)"}
              />
              <text
                x={px(p.x) + 8}
                y={py(p.y) - 8}
                fontSize={11}
                fill="var(--color-ink)"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {labelText}
              </text>
            </g>
          );
        })}
      </svg>

      {/* fixed-height mono readout strip */}
      <div
        className="flex h-6 items-center font-mono text-[13px] text-ink-700"
        aria-hidden
      >
        {readout || " "}
      </div>

      {/* axis labels + caption */}
      <div className="flex items-center justify-between text-[11px] text-ink-500">
        <span className="font-mono">{xLabel}</span>
        <span className="font-mono">{yLabel}</span>
      </div>
      {caption && <p className="text-[13px] text-ink-500">{caption}</p>}
      {interactive && safePoints.length === 0 && !caption && (
        <p className="text-[13px] text-ink-500">Click the plane to place a point.</p>
      )}

      {/* Reset — interactive only, right-aligned, keyboard reachable. */}
      {interactive && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" type="button" onClick={onReset}>
            Reset
          </Button>
        </div>
      )}

      {/* aria-live announcement region */}
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers (local presentational logic; pure math lives in the sibling module).
// ---------------------------------------------------------------------------

function clampAxis(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Integer ticks across [min, max] inclusive. */
function integerTicks(min: number, max: number): number[] {
  const out: number[] = [];
  for (let i = Math.ceil(min); i <= max; i++) out.push(i);
  return out;
}

interface DrawLine {
  slope: number;
  intercept: number;
  style?: "solid" | "dashed";
}

/** Resolve spec lines + the auto two-point line into slope/intercept drawables. */
function buildDrawLines(
  specLines: PlaneLine[],
  autoLine: ReturnType<typeof lineThrough> | null,
  points: Point[],
): DrawLine[] {
  const out: DrawLine[] = [];
  for (const l of specLines) {
    if (l.through) {
      const m = lineThrough(l.through[0], l.through[1]);
      if (m.slope !== null && m.intercept !== null) {
        out.push({ slope: m.slope, intercept: m.intercept, style: l.style });
      }
    } else if (typeof l.slope === "number" && typeof l.intercept === "number") {
      out.push({ slope: l.slope, intercept: l.intercept, style: l.style });
    }
  }
  if (autoLine && autoLine.slope !== null && autoLine.intercept !== null && points.length === 2) {
    out.push({ slope: autoLine.slope, intercept: autoLine.intercept });
  }
  return out;
}

function readoutFor({
  mode,
  explore,
  line,
  points,
}: {
  mode: PlaneMode;
  explore: boolean;
  line: ReturnType<typeof lineThrough> | null;
  points: Point[];
}): string {
  // plot (interactive, not explore): show only the placed coordinate.
  if (mode === "interactive" && !explore) {
    return points.length > 0 ? pointLabel(points[points.length - 1]) : "";
  }
  // display + explore: surface the equation when a line is present.
  return line ? equationReadout(line) : "";
}

/** Restrained strike-zone grid (3×3) + home-plate notch behind the plane (§6).
 * Drawn in the central region of the frame; decorative only. */
function StrikeZone({
  fr,
  px,
  py,
}: {
  fr: Frame;
  px: (x: number) => number;
  py: (y: number) => number;
}) {
  const xSpan = fr.xMax - fr.xMin;
  const ySpan = fr.yMax - fr.yMin;
  const zx0 = fr.xMin + xSpan * 0.3;
  const zx1 = fr.xMin + xSpan * 0.7;
  const zy0 = fr.yMin + ySpan * 0.3;
  const zy1 = fr.yMin + ySpan * 0.7;
  const v1 = fr.xMin + xSpan * (0.3 + 0.4 / 3);
  const v2 = fr.xMin + xSpan * (0.3 + (0.4 * 2) / 3);
  const h1 = fr.yMin + ySpan * (0.3 + 0.4 / 3);
  const h2 = fr.yMin + ySpan * (0.3 + (0.4 * 2) / 3);
  const stroke = "var(--color-axis-soft)";
  const mx = (px(zx0) + px(zx1)) / 2;
  const plateTop = py(zy0) + 8;
  return (
    <g aria-hidden opacity={0.55}>
      <rect
        x={px(zx0)}
        y={py(zy1)}
        width={px(zx1) - px(zx0)}
        height={py(zy0) - py(zy1)}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
      />
      <line x1={px(v1)} y1={py(zy0)} x2={px(v1)} y2={py(zy1)} stroke={stroke} strokeWidth={0.75} />
      <line x1={px(v2)} y1={py(zy0)} x2={px(v2)} y2={py(zy1)} stroke={stroke} strokeWidth={0.75} />
      <line x1={px(zx0)} y1={py(h1)} x2={px(zx1)} y2={py(h1)} stroke={stroke} strokeWidth={0.75} />
      <line x1={px(zx0)} y1={py(h2)} x2={px(zx1)} y2={py(h2)} stroke={stroke} strokeWidth={0.75} />
      {/* home-plate notch under the zone */}
      <polygon
        points={`${mx - 10},${plateTop} ${mx + 10},${plateTop} ${mx + 10},${plateTop + 7} ${mx},${plateTop + 14} ${mx - 10},${plateTop + 7}`}
        fill="none"
        stroke={stroke}
        strokeWidth={1}
      />
    </g>
  );
}

function RiseRun({
  a,
  b,
  px,
  py,
}: {
  a: Point;
  b: Point;
  px: (x: number) => number;
  py: (y: number) => number;
}) {
  const rise = b.y - a.y;
  const run = b.x - a.x;
  return (
    <g aria-hidden>
      <line
        x1={px(a.x)}
        y1={py(a.y)}
        x2={px(b.x)}
        y2={py(a.y)}
        stroke="var(--color-axis)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <line
        x1={px(b.x)}
        y1={py(a.y)}
        x2={px(b.x)}
        y2={py(b.y)}
        stroke="var(--color-axis)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text
        x={(px(a.x) + px(b.x)) / 2}
        y={py(a.y) + 14}
        textAnchor="middle"
        fontSize={11}
        fill="var(--color-ink-500)"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {`Δx ${run}`}
      </text>
      <text
        x={px(b.x) + 6}
        y={(py(a.y) + py(b.y)) / 2}
        fontSize={11}
        fill="var(--color-ink-500)"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {`Δy ${rise}`}
      </text>
    </g>
  );
}
