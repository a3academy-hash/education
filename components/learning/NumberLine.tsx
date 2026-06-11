// NumberLine (§C). Drag marker (snaps to ticks); click tick to move.
// Optional operation arc redraws as the marker moves. Keyboard ←/→ ±1,
// Shift ±5. Pointer + keyboard parity, aria-live, reduced-motion instant.

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
  DEFAULT_LINE,
  nudgeMarker,
  operationArc,
  pxToValue,
  ticksFor,
  valueToPx,
  type LineConfig,
} from "./number-line-math";

export interface NumberLineProps {
  value: number;
  onChange?: (value: number) => void;
  from?: number;
  to?: number;
  /** Optional signed operation; draws an arc from value-delta..value. */
  operationDelta?: number;
  caption?: string;
  ariaLabel?: string;
}

export function NumberLine({
  value,
  onChange,
  from = DEFAULT_LINE.from,
  to = DEFAULT_LINE.to,
  operationDelta,
  caption,
  ariaLabel = "Number line",
}: NumberLineProps) {
  const cfg: LineConfig = useMemo(
    () => ({ from, to, width: DEFAULT_LINE.width, pad: DEFAULT_LINE.pad }),
    [from, to],
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const titleId = useId();

  const ticks = useMemo(() => ticksFor(cfg), [cfg]);
  const H = 64;
  const axisY = 34;

  const safeValue = Number.isFinite(value) ? value : from;
  if (!Number.isFinite(value) && process.env.NODE_ENV !== "production") {
    console.warn("NumberLine: value is not finite, clamped to range start.", value);
  }

  const arc =
    typeof operationDelta === "number" && Number.isFinite(operationDelta)
      ? operationArc(safeValue - operationDelta, operationDelta)
      : null;

  const clientToValue = useCallback(
    (clientX: number): number => {
      const svg = svgRef.current;
      if (!svg) return safeValue;
      const rect = svg.getBoundingClientRect();
      const sx = ((clientX - rect.left) / rect.width) * cfg.width;
      return pxToValue(sx, cfg);
    },
    [cfg, safeValue],
  );

  const onPointerDown = (e: ReactPointerEvent) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    onChange?.(clientToValue(e.clientX));
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging) return;
    onChange?.(clientToValue(e.clientX));
  };
  const endDrag = () => setDragging(false);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onChange?.(nudgeMarker(safeValue, step, cfg));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onChange?.(nudgeMarker(safeValue, -step, cfg));
    }
  };

  const x = (v: number) => valueToPx(v, cfg);

  return (
    <div className="flex flex-col gap-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${cfg.width} ${H}`}
        width="100%"
        role="group"
        aria-labelledby={titleId}
        style={{ maxWidth: cfg.width, touchAction: "none" }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <title id={titleId}>{ariaLabel}</title>

        <line
          x1={x(cfg.from)}
          y1={axisY}
          x2={x(cfg.to)}
          y2={axisY}
          stroke="var(--color-axis-soft)"
          strokeWidth={1.5}
        />
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={x(t)}
              y1={axisY - 4}
              x2={x(t)}
              y2={axisY + 4}
              stroke="var(--color-axis-soft)"
              strokeWidth={1.5}
            />
            <text
              x={x(t)}
              y={axisY + 18}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-ink-500)"
              style={{ fontFamily: "var(--font-mono)", cursor: "pointer" }}
              onClick={() => onChange?.(t)}
            >
              {t}
            </text>
          </g>
        ))}

        {/* operation arc */}
        {arc && (
          <g aria-hidden>
            <path
              d={arcPath(x(arc.start), x(arc.end), axisY)}
              fill="none"
              stroke="var(--color-accent)"
              strokeOpacity={0.6}
              strokeWidth={1.5}
            />
            <text
              x={(x(arc.start) + x(arc.end)) / 2}
              y={axisY - 14}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-accent)"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {arc.label}
            </text>
          </g>
        )}

        {/* marker handle */}
        <g
          tabIndex={0}
          role="slider"
          aria-label={ariaLabel}
          aria-valuenow={safeValue}
          aria-valuemin={cfg.from}
          aria-valuemax={cfg.to}
          aria-valuetext={String(safeValue)}
          className="cursor-grab focus:outline-none [&:active]:cursor-grabbing"
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          {focused && (
            <circle
              cx={x(safeValue)}
              cy={axisY}
              r={13}
              fill="transparent"
              stroke="var(--color-accent)"
              strokeWidth={2}
              strokeOpacity={0.5}
            />
          )}
          <circle
            cx={x(safeValue)}
            cy={axisY}
            r={11}
            fill="var(--color-accent)"
            fillOpacity={0.25}
          />
          <circle cx={x(safeValue)} cy={axisY} r={14} fill="transparent" />
          <circle cx={x(safeValue)} cy={axisY} r={6} fill="var(--color-accent)" />
        </g>
      </svg>

      {caption && <p className="text-[13px] text-ink-500">{caption}</p>}

      <span className="sr-only" aria-live="polite">
        Marker at {safeValue}
        {arc ? `. Operation ${arc.label}.` : ""}
      </span>
    </div>
  );
}

/** A shallow upward arc between two x positions above the axis. */
function arcPath(x1: number, x2: number, baseY: number): string {
  const mid = (x1 + x2) / 2;
  const lift = baseY - 22;
  return `M ${x1} ${baseY} Q ${mid} ${lift} ${x2} ${baseY}`;
}
