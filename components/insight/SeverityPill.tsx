// components/insight/SeverityPill — the intervention-band pill for staff/coach
// reporting (Phase 7 R7). 7px dot + MANDATORY text label — NEVER color-only
// (accessibility + STYLE_GUIDE). Tokens only: --color-status-mastered (green) /
// --color-retrieval (amber) / --color-error (rose). Presentational, server-safe.
//
// This is a DISPLAY band, distinct from FlagEntry.severity (which is unchanged).

import type { InterventionBand } from "@/types";

interface BandMeta {
  label: string;
  /** CSS variable token for the dot color. */
  color: string;
}

const BAND_META = {
  on_track: { label: "On track", color: "var(--color-status-mastered)" },
  watch: { label: "Watch", color: "var(--color-retrieval)" },
  intervention: { label: "Intervention", color: "var(--color-error)" },
} satisfies Record<InterventionBand, BandMeta>;

export interface SeverityPillProps {
  band: InterventionBand;
  small?: boolean;
  className?: string;
}

export function SeverityPill({ band, small = false, className = "" }: SeverityPillProps) {
  const meta = BAND_META[band];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium text-ink-700 ${className}`}
      style={{ fontSize: small ? 11 : 12.5 }}
    >
      <span
        aria-hidden
        className="inline-block shrink-0 rounded-full"
        style={{ width: 7, height: 7, background: meta.color }}
      />
      {meta.label}
    </span>
  );
}
