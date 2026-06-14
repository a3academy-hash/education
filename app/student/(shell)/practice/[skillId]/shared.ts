// Shared Practice DTO/constants. Kept OUT of actions.ts because a "use server"
// module may only export async functions (onboarding/diagnostic pattern).

import type { FeedbackState } from "../../../../../lib/session-helpers";

/** Raw client submission — the server re-checks correctness itself (spec §H.0). */
export interface PracticeSubmission {
  skillId: string;
  problemId: string;
  response: string;
  timeMs: number;
  hintsUsed: number;
  phase: 1 | 2 | 3;
  isProbe: boolean;
  sessionId: string;
  /**
   * Per-item provenance. "retention" for an injected retention probe (carries
   * its OWN mastered-node skillId, which may differ from the session skill);
   * defaulted to "practice" otherwise. Provenance ONLY — never enters
   * mastery/phase/routing math (types/student.ts ISOLATION RULE).
   */
  source?: "practice" | "retention";
}

/** Resolved tutor strings (in-process RuleBasedTutor — never a fetch). */
export interface TutorPanelData {
  diagnosis: string;
  reframe: string;
  bridgeToNeutral: string;
}

/** The assembled "why" pieces for the feedback moment (spec §B). */
export interface WhyData {
  whatRight?: string;
  whyItWorks?: string;
  whatHappened?: string;
  theFix?: string;
}

/** Narrow per-attempt DTO — the graph/overlay are NEVER serialized (spec §H.10). */
export interface PracticeResult {
  /** Server-authoritative correctness (never the client's claim). */
  correct: boolean;
  feedbackState: FeedbackState;
  misconceptionTags: string[];
  why: WhyData;
  /** Present only in STATE B (incorrect + matched tag). */
  tutor: TutorPanelData | null;
  /** True when this attempt advanced the phase. */
  phaseChanged: boolean;
  /** True when this attempt earned (or restored) mastery on the node. */
  masteredNow: boolean;
  /**
   * Multiple-choice items ONLY: the correct option string, for marking the
   * correct row at the feedback moment (the options are already on screen).
   * Absent for every non-choice kind — the typed value is never serialized.
   */
  correctChoice?: string;
}

export type SubmitPracticeResponse =
  | { ok: true; result: PracticeResult }
  | { ok: false; error: string };

/** Time clamp ceiling — 1 hour per item (mirrors the diagnostic action). */
export const MAX_ITEM_TIME_MS = 3_600_000;
