// components/gamification/MasteryRing — the A3 signature mastery instrument
// (STYLE_GUIDE §3). One ring, three KINDS differentiated on THREE channels so
// they read in grayscale and for colorblind users:
//   • Focus      — solid stroke, crosshair icon, hue --color-focus
//   • Mastery    — solid stroke + GOLD CAP only at lock, up-track icon, --color-mastery
//   • Retrieval  — DASHED stroke, recall-arrow icon, --color-retrieval
// Hues resolve by surface (the focus re-scope swaps them to on-dark fills).
// Color is NEVER the sole signal: icon + Plex-Mono % + label always present.
// `muted` renders the instrument inactive (for gated tests, §8.3) — track-grey,
// no sweep, "(inactive)" announced. The fill arc carries `.a3-ring-fill`/
// `.a3-ring-sweep` so the [data-surface="test"] CSS backstop can neutralise it
// even if a caller forgets `muted`. Presentational, server-safe (no hooks).

import type { ReactNode } from "react";

export type RingKind = "focus" | "mastery" | "retrieval";

export interface MasteryRingProps {
  kind: RingKind;
  /** 0..1 fill fraction. */
  value: number;
  size?: number;
  stroke?: number;
  /** Mastery only: render the gold terminal cap (a node LOCK event). */
  goldCap?: boolean;
  /** Inactive instrument (gated test): track-grey, no animation, ARIA inactive. */
  muted?: boolean;
  /** Center primary (defaults to the Plex-Mono %). */
  label?: ReactNode;
  sublabel?: ReactNode;
  /** Override the generated ARIA label. */
  ariaLabel?: string;
  className?: string;
}

const clamp01 = (x: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));

const HUE: Record<RingKind, string> = {
  focus: "var(--color-focus)",
  mastery: "var(--color-mastery)",
  retrieval: "var(--color-retrieval)",
};

const VERB: Record<RingKind, string> = {
  focus: "active",
  mastery: "transferring",
  retrieval: "reviewing",
};

// polar→cartesian for an SVG arc path (0° = 12 o'clock, clockwise).
function pt(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const [x0, y0] = pt(cx, cy, r, startDeg);
  const [x1, y1] = pt(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

function RingIcon({ kind }: { kind: RingKind }) {
  const common = { width: 13, height: 13, viewBox: "0 0 16 16", "aria-hidden": true } as const;
  const s = { stroke: "currentColor", strokeWidth: 1.6, fill: "none", strokeLinecap: "round" as const };
  if (kind === "focus") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="3.2" {...s} />
        <line x1="8" y1="0.8" x2="8" y2="3" {...s} />
        <line x1="8" y1="13" x2="8" y2="15.2" {...s} />
        <line x1="0.8" y1="8" x2="3" y2="8" {...s} />
        <line x1="13" y1="8" x2="15.2" y2="8" {...s} />
      </svg>
    );
  }
  if (kind === "mastery") {
    return (
      <svg {...common}>
        <polyline points="2,11 6,7 9,9.5 14,3.5" {...s} strokeLinejoin="round" />
        <polyline points="10.5,3.5 14,3.5 14,7" {...s} strokeLinejoin="round" />
      </svg>
    );
  }
  // retrieval — circular recall arrow
  return (
    <svg {...common}>
      <path d="M13 8 A5 5 0 1 1 11.5 4.4" {...s} />
      <polyline points="11.6,1.4 11.8,4.6 8.6,4.8" {...s} strokeLinejoin="round" />
    </svg>
  );
}

export function MasteryRing({
  kind,
  value,
  size = 120,
  stroke = 11,
  goldCap = false,
  muted = false,
  label,
  sublabel,
  ariaLabel,
  className = "",
}: MasteryRingProps) {
  const v = clamp01(value);
  const pct = Math.round(v * 100);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const hue = muted ? "var(--color-track)" : HUE[kind];
  // Sweep just shy of a full turn so a filled ring leaves a hairline gap (reads
  // as an arc, not a closed O). Gold cap (lock) takes the final ~7%.
  const capDeg = goldCap && !muted ? 25 : 0; // ~7% of 360
  const fillEnd = v * 359.9;
  const solidEnd = Math.max(0, fillEnd - capDeg);
  const dash = kind === "retrieval" && !muted ? "4 4" : undefined;

  const aria =
    ariaLabel ??
    (muted
      ? `${cap(kind)} ring — inactive during this test`
      : `${cap(kind)} ring ${pct}% — ${goldCap ? "mastered" : VERB[kind]}`);

  return (
    <div
      role="img"
      aria-label={aria}
      className={`relative inline-grid place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-track)" strokeWidth={stroke} />
        {/* fill (solid portion) */}
        {v > 0 && (
          <path
            d={arcPath(cx, cy, r, 0, solidEnd > 0 ? solidEnd : 0.01)}
            fill="none"
            stroke={hue}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={dash}
            className="a3-ring-fill a3-ring-sweep"
            style={{ transition: "stroke 240ms var(--ease-calm)" }}
          />
        )}
        {/* gold terminal cap — EARNED only (node lock) */}
        {capDeg > 0 && v > 0 && (
          <path
            d={arcPath(cx, cy, r, solidEnd, fillEnd)}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth={stroke}
            strokeLinecap="round"
            className="a3-ring-fill"
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center px-2 text-center">
        <div className="flex flex-col items-center">
          <span style={{ color: muted ? "var(--color-ink-400)" : hue }}>
            <RingIcon kind={kind} />
          </span>
          {label != null ? (
            <div className="mt-0.5 font-display text-[22px] font-semibold leading-none text-ink">
              {label}
            </div>
          ) : (
            <div className="mt-0.5 font-mono text-[20px] font-medium leading-none tabular-nums text-ink">
              {pct}%
            </div>
          )}
          {sublabel != null && (
            <div className="mt-1 text-[11px] leading-tight text-ink-500">{sublabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
