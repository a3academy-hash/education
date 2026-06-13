// Consent policy constants (C2 P5, S6) — the disclosure the parent consents to
// at child provisioning. Frozen into each consent_events row (consent_policy_version
// + consent_scope) so a later wording change never silently rewrites a prior
// consent (schema I2).
//
// COUNSEL FLAG (carry, binding): the COPPA consent METHOD remains
// jurisdiction-specific and NEEDS COUNSEL (0001). This UI must NOT imply the
// method is legally sufficient until counsel-verified. The scope copy below is
// a plain-language disclosure, not a legal sufficiency claim.

/** Literal policy version, rendered verbatim in quiet ink and frozen on the event. */
export const CONSENT_POLICY_VERSION = "2026-06-01";

/** One disclosure line: what data, why, and who sees it. */
export interface ConsentScopeItem {
  /** Short heading for the inset list row. */
  what: string;
  /** Plain-language detail. */
  detail: string;
}

/**
 * The structured consent scope. Stored as JSON on the consent event and rendered
 * as a legible InsetPanel list (P5). Plain language, no jargon, no "AI".
 */
export const CONSENT_SCOPE: readonly ConsentScopeItem[] = [
  {
    what: "What we collect",
    detail:
      "Your student's first name, grade, and their math work — the problems they attempt, answers, hints used, and time on task.",
  },
  {
    what: "Why we collect it",
    detail:
      "To place your student correctly, adapt the lessons to what they know, and keep an accurate record of their progress.",
  },
  {
    what: "Who can see it",
    detail:
      "You, as the parent account holder, and your student's teachers at A3 Academy. It is never sold or shared with advertisers.",
  },
] as const;
