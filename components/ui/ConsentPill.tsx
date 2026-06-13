// ConsentPill (C2 P4) — the consent-state pill for the parent roster. SIBLING
// grammar to StatusPill (7px dot + label, never the dot alone) but a SEPARATE,
// NEUTRAL-palette component: the project rule is do NOT extend the
// MasteryStatus-typed StatusPill with non-mastery values (a consent state is not
// a mastery state). Three values only, mapped to the consent lifecycle the
// parent surface renders:
//   active   — link active AND current consent event granted  → "Active"
//   pending  — no granted consent yet (setup not finished)     → "Setup not finished"
//   revoked  — consent revoked (access paused, re-grantable)   → "Access paused"
//
// Palette is intentionally CALM/neutral (not the mastery status colors and not
// the error channel): a paused child must never read as "failed" (pee-wee).

export type ConsentState = "active" | "pending" | "revoked";

interface ConsentMeta {
  label: string;
  /** Dot color — a literal token value (calm, neutral; not a status color). */
  color: string;
}

// Exported PURE map so the values are unit-testable without rendering React
// (the test suite runs lib/ + components/ logic, no DOM renderer).
export const CONSENT_META: Record<ConsentState, ConsentMeta> = {
  active: { label: "Active", color: "var(--color-status-mastered)" },
  pending: { label: "Setup not finished", color: "var(--color-ink-400)" },
  revoked: { label: "Access paused", color: "var(--color-ink-500)" },
};

export interface ConsentPillProps {
  state: ConsentState;
  className?: string;
}

export function ConsentPill({ state, className = "" }: ConsentPillProps) {
  const meta = CONSENT_META[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium text-ink-700 ${className}`}
      style={{ fontSize: 12.5 }}
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
