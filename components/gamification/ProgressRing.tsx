// components/gamification/ProgressRing — a calm competence-feedback donut for the
// incentive layer. Presentational + server-safe (no hooks). White/premium tokens;
// the fill animates via the global ease-calm transition, which the reduced-motion
// media query neutralizes (globals.css). NO confetti, NO currency — just a
// progress indicator. Numbers/labels live in the center, caller-owned.

import type { ReactNode } from "react";

export interface ProgressRingProps {
  /** 0..1 fill fraction. */
  value: number;
  /** Outer diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  stroke?: number;
  /** CSS color for the filled arc; defaults to the accent. */
  fill?: string;
  /** CSS color for the track; defaults to --color-track. */
  track?: string;
  /** Center primary content (e.g. a count or percentage). */
  label?: ReactNode;
  /** Center secondary content (small, muted). */
  sublabel?: ReactNode;
  /** Accessible description, e.g. "Course mastery: 3 of 12 skills". */
  ariaLabel: string;
  className?: string;
}

const clamp01 = (x: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));

export function ProgressRing({
  value,
  size = 132,
  stroke = 12,
  fill = "var(--color-accent)",
  track = "var(--color-track)",
  label,
  sublabel,
  ariaLabel,
  className = "",
}: ProgressRingProps) {
  const clamped = clamp01(value);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * clamped;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`relative inline-grid place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fill}
          strokeWidth={stroke}
          // Round caps look best for a real arc, but at value 0 a round cap
          // paints a stray dot at 12 o'clock on the empty track — use a butt
          // cap (no dot) until there's something to show.
          strokeLinecap={clamped > 0 ? "round" : "butt"}
          strokeDasharray={`${filled} ${circumference - filled}`}
          className="transition-[stroke-dasharray] duration-[400ms] ease-[cubic-bezier(.2,.7,.2,1)]"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center px-2 text-center">
        {label != null && (
          <div className="font-display text-[24px] font-semibold leading-none text-ink">
            {label}
          </div>
        )}
        {sublabel != null && (
          <div className="mt-1 text-[11.5px] leading-tight text-ink-500">{sublabel}</div>
        )}
      </div>
    </div>
  );
}
