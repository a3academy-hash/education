// lib/session-helpers/verdict.ts — pure verdict derivation for the Summary
// screen. The Summary verdict is DERIVED from the adaptive router's
// recommend() output (single source of truth, spec §F) — never a parallel
// routing decision. PURE: no React, no IO, no engine traversal.
//
// SPEC §F mapping (INVIOLABLE):
//   advance   ⇐ recommend().kind ∈ {accelerate, complete}
//              OR the just-practiced node's computed status is "mastered"
//   continue  ⇐ recommend().kind === "continue"  (developing / near_mastery)
//   review    ⇐ recommend().kind === "review"    (needs_review)
//   remediate ⇐ recommend().kind === "remediate" (prerequisite_gap)
//
// ISOLATION: source/sessionId never enter this mapping. The verdict reads only
// the router kind and the engine-computed status — both deterministic.

import type { AdaptiveRecommendation, MasteryStatus } from "@/types";

export type SessionVerdict = "advance" | "continue" | "review" | "remediate";

/**
 * Derive the Summary verdict from the router recommendation and the
 * just-practiced node's freshly-computed status.
 *
 * The mastered-override is the ONLY place a "mastered" status forces advance
 * regardless of the router kind — it covers the case where the router has
 * already moved the recommendation to the *next* skill (continue/accelerate)
 * but the node the student just finished is itself confirmed mastered.
 */
export function deriveVerdict(
  rec: AdaptiveRecommendation,
  practicedStatus: MasteryStatus | undefined,
): SessionVerdict {
  if (practicedStatus === "mastered") return "advance";
  switch (rec.kind) {
    case "accelerate":
    case "complete":
      return "advance";
    case "review":
      return "review";
    case "remediate":
      return "remediate";
    case "continue":
    default:
      return "continue";
  }
}

export interface VerdictCopy {
  /** The single capitalized verdict word shown beside the status dot. */
  word: string;
  /** One-sentence verdict note (pee-wee direction §3, verbatim). */
  note: string;
  /** Status whose color drives the single 7px verdict dot. */
  dotStatus: MasteryStatus;
  /** Primary-button verb: "Continue to" (forward) or "Review" (backward). */
  primaryVerb: "continue" | "review";
}

/** Verdict → exact copy + the status color for the single dot (direction §3). */
export const VERDICT_COPY: Record<SessionVerdict, VerdictCopy> = {
  advance: {
    word: "Advance",
    note: "Mastery is confirmed, including standard-notation transfer. You're moving on.",
    dotStatus: "mastered",
    primaryVerb: "continue",
  },
  continue: {
    word: "Continue",
    note: "Solid progress. One more focused session should push this to mastery.",
    dotStatus: "near_mastery",
    primaryVerb: "continue",
  },
  review: {
    word: "Review",
    note: "The core idea needs a little reinforcement before advancing.",
    dotStatus: "needs_review",
    primaryVerb: "review",
  },
  remediate: {
    word: "Remediate",
    note: "This rests on a skill that isn't solid yet — a short step back makes the rest click.",
    dotStatus: "prerequisite_gap",
    primaryVerb: "review",
  },
};
