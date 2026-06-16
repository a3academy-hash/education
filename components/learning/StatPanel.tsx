// components/learning/StatPanel — a TrackMan/HitTrax-style readout (STYLE_GUIDE
// §6). Plex-Mono label/value rows in a compact instrument panel; resolves by
// surface (dark on the Focus lesson canvas, light on Trust). Use for rate/slope/
// velocity context beside a coordinate or number-line visual — math rendered as
// baseball performance instrumentation, the moat. Presentational, server-safe.

import type { ReactNode } from "react";

export interface StatRow {
  label: string;
  value: ReactNode;
  /** Emphasis tint for the value (e.g. the key readout). */
  accent?: boolean;
}

export interface StatPanelProps {
  /** Eyebrow title, e.g. "LAUNCH" / "RATE". */
  title?: string;
  rows: StatRow[];
  className?: string;
}

export function StatPanel({ title, rows, className = "" }: StatPanelProps) {
  return (
    <div
      className={`rounded-[10px] border border-border-strong bg-inset px-4 py-3 ${className}`}
      role="group"
      aria-label={title ? `${title} stat panel` : "Stat panel"}
    >
      {title && (
        <p className="mb-2 font-mono text-[10.5px] font-medium uppercase tracking-[1.5px] text-ink-500">
          {title}
        </p>
      )}
      <dl className="flex flex-col gap-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-baseline justify-between gap-4">
            <dt className="font-mono text-[11.5px] uppercase tracking-[0.5px] text-ink-500">
              {r.label}
            </dt>
            <dd
              className="font-mono text-[14px] font-medium tabular-nums"
              style={{ color: r.accent ? "var(--color-focus)" : "var(--color-ink)" }}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
