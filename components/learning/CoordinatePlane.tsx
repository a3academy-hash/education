// CoordinatePlane (§C). SVG, props = pure data + callbacks. No engine or
// repository imports. Pointer + keyboard parity, visible SVG focus ring on
// handles, aria-live value announcements, reduced-motion = instant.

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
import {
  DEFAULT_PLANE,
  equationReadout,
  fmt,
  lineThrough,
  nudge,
  pointLabel,
  pxToSnappedPoint,
  toPxX,
  toPxY,
  type PlaneConfig,
  type Point,
} from "./coordinate-plane-math";

export interface CoordinatePlaneProps {
  points: Point[];
  onChange?: (points: Point[]) => void;
  /** Inclusive axis range (both axes share it). Default 0..10. */
  range?: { min: number; max: number };
  /** Snap increment; 1 default, 0.5 allowed. */
  snap?: number;
  /** Draw the connecting line + equation readout when two points exist. */
  showLine?: boolean;
  /** Draw the dashed rise/run elbow for the two-point line. */
  showRiseRun?: boolean;
  /** Axis labels — sport semantics live HERE only (P1 → P3), never imagery. */
  xLabel?: string;
  yLabel?: string;
  /** Max rendered size in px (clamped 320..420). */
  size?: number;
  caption?: string;
}

export function CoordinatePlane({
  points,
  onChange,
  range = { min: DEFAULT_PLANE.min, max: DEFAULT_PLANE.max },
  snap = 1,
  showLine = true,
  showRiseRun = false,
  xLabel = "x",
  yLabel = "y",
  size = 320,
  caption,
}: CoordinatePlaneProps) {
  const clampedSize = Math.max(320, Math.min(420, size));
  const cfg: PlaneConfig = useMemo(
    () => ({
      min: range.min,
      max: range.max,
      size: clampedSize,
      pad: 28,
      snap: snap === 0.5 ? 0.5 : 1,
    }),
    [range.min, range.max, clampedSize, snap],
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [placedPoint, setPlacedPoint] = useState<Point | null>(null);
  const titleId = useId();

  // dev-only invalid-prop guard: render frame, suppress the bad point.
  const safePoints = useMemo(
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

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let i = Math.ceil(range.min); i <= range.max; i++) out.push(i);
    return out;
  }, [range.min, range.max]);

  const line =
    showLine && safePoints.length === 2
      ? lineThrough(safePoints[0], safePoints[1])
      : null;

  const clientToData = useCallback(
    (clientX: number, clientY: number): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: range.min, y: range.min };
      const rect = svg.getBoundingClientRect();
      const sx = ((clientX - rect.left) / rect.width) * cfg.size;
      const sy = ((clientY - rect.top) / rect.height) * cfg.size;
      return pxToSnappedPoint(sx, sy, cfg);
    },
    [cfg, range.min],
  );

  const commit = useCallback(
    (idx: number, next: Point) => {
      const updated = points.map((p, i) => (i === idx ? next : p));
      onChange?.(updated);
    },
    [points, onChange],
  );

  const onPointerDownHandle = (idx: number) => (e: ReactPointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setActiveIdx(idx);
    setDraggingIdx(idx);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (draggingIdx === null) return;
    commit(draggingIdx, clientToData(e.clientX, e.clientY));
  };

  const endDrag = () => setDraggingIdx(null);

  // Background placement: only when interactive (onChange present) and the
  // pointerdown did NOT originate on an existing draggable point handle
  // (so dragging a point never also creates one). Gridlines/axes/ticks count
  // as background, so a click anywhere on the plotting area places a point.
  const onBackgroundPointerDown = (e: ReactPointerEvent) => {
    if (!onChange) return;
    if (draggingIdx !== null) return; // a handle drag is in progress
    const target = e.target as Element;
    if (target.closest?.('[role="slider"]')) return; // an existing handle was hit
    const next = clientToData(e.clientX, e.clientY);
    const nextIdx = points.length;
    onChange([...points, next]);
    setActiveIdx(nextIdx);
    setPlacedPoint(next);
  };

  const onHandleKeyDown = (idx: number) => (e: ReactKeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1;
    const p = points[idx];
    let next: Point | null = null;
    switch (e.key) {
      case "ArrowRight":
        next = { x: nudge(p.x, step * cfg.snap, cfg), y: p.y };
        break;
      case "ArrowLeft":
        next = { x: nudge(p.x, -step * cfg.snap, cfg), y: p.y };
        break;
      case "ArrowUp":
        next = { x: p.x, y: nudge(p.y, step * cfg.snap, cfg) };
        break;
      case "ArrowDown":
        next = { x: p.x, y: nudge(p.y, -step * cfg.snap, cfg) };
        break;
      default:
        return;
    }
    e.preventDefault();
    setActiveIdx(idx);
    if (next) commit(idx, next);
  };

  const placedAnnouncement = placedPoint
    ? `Point placed at ${fmt(placedPoint.x)} comma ${fmt(placedPoint.y)}. `
    : "";

  const announce =
    placedAnnouncement +
    (safePoints.length > 0
      ? safePoints.map((p, i) => `Point ${i + 1} at ${pointLabel(p)}`).join(". ") +
        (line
          ? `. ${equationReadout(line)}`
          : "")
      : "No points placed.");

  const px = (x: number) => toPxX(x, cfg);
  const py = (y: number) => toPxY(y, cfg);

  return (
    <div className="inline-flex flex-col gap-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${cfg.size} ${cfg.size}`}
        width="100%"
        role="group"
        aria-labelledby={titleId}
        style={{
          maxWidth: cfg.size,
          touchAction: "none",
          cursor: onChange ? "crosshair" : undefined,
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
        {ticks.map((t) => (
          <g key={`grid-${t}`}>
            <line
              x1={px(t)}
              y1={py(range.min)}
              x2={px(t)}
              y2={py(range.max)}
              stroke="var(--color-selected)"
              strokeWidth={1}
            />
            <line
              x1={px(range.min)}
              y1={py(t)}
              x2={px(range.max)}
              y2={py(t)}
              stroke="var(--color-selected)"
              strokeWidth={1}
            />
          </g>
        ))}

        {/* axes */}
        <line
          x1={px(range.min)}
          y1={py(range.min)}
          x2={px(range.max)}
          y2={py(range.min)}
          stroke="var(--color-axis)"
          strokeWidth={1.5}
        />
        <line
          x1={px(range.min)}
          y1={py(range.min)}
          x2={px(range.min)}
          y2={py(range.max)}
          stroke="var(--color-axis)"
          strokeWidth={1.5}
        />

        {/* axis ticks (mono) */}
        {ticks.map((t) => (
          <g key={`tick-${t}`}>
            <text
              x={px(t)}
              y={py(range.min) + 16}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-ink-500)"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t}
            </text>
            {t !== range.min && (
              <text
                x={px(range.min) - 8}
                y={py(t) + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--color-ink-500)"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {t}
              </text>
            )}
          </g>
        ))}

        {/* rise/run elbow */}
        {showRiseRun && line && safePoints.length === 2 && (
          <RiseRun a={safePoints[0]} b={safePoints[1]} px={px} py={py} />
        )}

        {/* line */}
        {line && line.slope !== null && line.intercept !== null && (
          <line
            x1={px(range.min)}
            y1={py(line.slope * range.min + line.intercept)}
            x2={px(range.max)}
            y2={py(line.slope * range.max + line.intercept)}
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* draggable points */}
        {safePoints.map((p, i) => {
          const active = activeIdx === i || draggingIdx === i;
          const showHalo = active || hoverIdx === i;
          return (
            <g
              key={`pt-${i}`}
              tabIndex={0}
              role="slider"
              aria-label={`Point ${i + 1}`}
              aria-valuetext={pointLabel(p)}
              className="cursor-grab focus:outline-none [&:active]:cursor-grabbing"
              onPointerDown={onPointerDownHandle(i)}
              onKeyDown={onHandleKeyDown(i)}
              onFocus={() => {
                setActiveIdx(i);
                setFocusIdx(i);
              }}
              onBlur={() => setFocusIdx((cur) => (cur === i ? null : cur))}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {/* focus ring (visible when the handle is focused) */}
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
              {/* 12px hit radius */}
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
                {pointLabel(p)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* fixed-height mono equation readout */}
      <div
        className="flex h-6 items-center font-mono text-[13px] text-ink-700"
        aria-hidden
      >
        {line ? equationReadout(line) : " "}
      </div>

      {/* axis labels + caption */}
      <div className="flex items-center justify-between text-[11px] text-ink-500">
        <span className="font-mono">{xLabel}</span>
        <span className="font-mono">{yLabel}</span>
      </div>
      {caption && <p className="text-[13px] text-ink-500">{caption}</p>}
      {safePoints.length === 0 && !caption && onChange && (
        <p className="text-[13px] text-ink-500">Click the plane to place a point.</p>
      )}

      {/* aria-live announcement region */}
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </div>
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
      {/* horizontal run leg */}
      <line
        x1={px(a.x)}
        y1={py(a.y)}
        x2={px(b.x)}
        y2={py(a.y)}
        stroke="var(--color-axis)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {/* vertical rise leg */}
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
