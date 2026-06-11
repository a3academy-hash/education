// StatusPill (§B): 7px status dot + label. The dot is never the sole signal
// (label always present). The mapping is exhaustive over MasteryStatus via
// `satisfies` (mr-gates condition 6 — adding an 8th status breaks the build).

import type { MasteryStatus } from "@/types";

interface StatusMeta {
  label: string;
  /** CSS variable token name for the status color. */
  color: string;
}

const STATUS_META = {
  unknown: { label: "Unknown", color: "var(--color-status-unknown)" },
  introduced: { label: "Introduced", color: "var(--color-status-introduced)" },
  developing: { label: "Developing", color: "var(--color-status-developing)" },
  near_mastery: {
    label: "Near mastery",
    color: "var(--color-status-near-mastery)",
  },
  mastered: { label: "Mastered", color: "var(--color-status-mastered)" },
  needs_review: {
    label: "Needs review",
    color: "var(--color-status-needs-review)",
  },
  prerequisite_gap: {
    label: "Prerequisite gap",
    color: "var(--color-status-prerequisite-gap)",
  },
} satisfies Record<MasteryStatus, StatusMeta>;

export interface StatusPillProps {
  status: MasteryStatus;
  small?: boolean;
  className?: string;
}

export function StatusPill({ status, small = false, className = "" }: StatusPillProps) {
  const meta = STATUS_META[status];
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
