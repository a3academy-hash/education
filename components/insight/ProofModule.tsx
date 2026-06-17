// components/insight/ProofModule — the parent-facing "why this placement?" proof
// module (§12-13, R9). Plain-English confidence band; the numeric posterior/CI
// rides on hover/title ONLY, never as primary copy. Presentational, server-safe.
//
// "Confirmed" = passed an unseen re-check after a delay (the §3 delayed-unseen
// lock). "Likely solid" = mastered but not yet delay-confirmed. "Still proving
// it" = in progress. The band is computed server-side and passed in.

export type ProofBand = "confirmed" | "likely_solid" | "still_proving";

export interface ProofModuleData {
  skillId: string;
  title: string;
  band: ProofBand;
  /** Count of evidence items (attempts) behind the placement. */
  evidenceCount: number;
  /** True when the mastery was earned (not diagnostic/credit-propagation placement). */
  confirmed: boolean;
  /** ISO date of the last re-check, or null when none yet. */
  lastRecheckAt: string | null;
}

const BAND_META: Record<ProofBand, { label: string; color: string; tip: string }> = {
  confirmed: {
    label: "Confirmed",
    color: "var(--color-status-mastered)",
    tip: "Passed an unseen re-check after a delay.",
  },
  likely_solid: {
    label: "Likely solid",
    color: "var(--color-retrieval)",
    tip: "Mastered in practice; awaiting a delayed re-check to confirm.",
  },
  still_proving: {
    label: "Still proving it",
    color: "var(--color-status-developing)",
    tip: "Working toward mastery — more evidence needed.",
  },
};

export interface ProofModuleProps {
  data: ProofModuleData;
}

export function ProofModule({ data }: ProofModuleProps) {
  const meta = BAND_META[data.band];
  const recheck = data.lastRecheckAt ? data.lastRecheckAt.slice(0, 10) : "—";
  return (
    <div className="flex items-start justify-between gap-3 border-b border-selected pb-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-ink">{data.title}</p>
        <p className="mt-0.5 text-[11.5px] leading-[1.5] text-ink-500">
          {/* Numeric evidence count is factual context, not a score. */}
          {data.evidenceCount} item{data.evidenceCount === 1 ? "" : "s"} of evidence
          <span className="text-ink-400"> · last check {recheck}</span>
        </p>
      </div>
      <span
        // The precise definition lives on hover/title only (R9) — never primary copy.
        title={meta.tip}
        className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-ink-700"
      >
        <span
          aria-hidden
          className="inline-block shrink-0 rounded-full"
          style={{ width: 7, height: 7, background: meta.color }}
        />
        {meta.label}
      </span>
    </div>
  );
}
