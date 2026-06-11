// lib/session-helpers/why.ts — pure assembly of the Practice feedback "why"
// and the Summary "what to firm up" rephrase, from EXISTING v1.6.0 content
// only. NO new per-problem explanation field is invented (spec §B, mr-kahn #1).
// PURE: no React, no IO, no engine traversal, no fetch.
//
// STUDENT-SAFE SOURCES (all already in the graph):
//   problem.hints[]                         — progressive, never the answer
//   node.workedExamples[].steps[].reveal    — terminal reveal = the pattern
//
// BLOCKER B (mr-kahn): misconceptionRegistry[tag].description is AUDIT register
// (expert, sometimes deficit-framed) and must NEVER surface to a student. The
// tutor's `diagnosis` is built verbatim from that description, so it is NOT a
// student-safe source here either. The student-facing "what happened" / "what
// to firm up" is therefore sourced ONLY from authored student content — the
// next/most-specific authored HINT, then the worked-example terminal reveal —
// falling back to a non-deficit generic line. The tutor panel's contextHook
// REFRAME and BRIDGE remain student-appropriate and are handled at the screen.

import type { ProblemTemplate, WorkedExample } from "@/types";

/** Feedback state, mirroring pee-wee direction §2 (STATE A/B/C). */
export type FeedbackState = "correct" | "incorrect-tag" | "incorrect-no-tag";

/** Non-deficit generic framing — used only when no authored line is available. */
export const GENERIC_RECHECK =
  "Let's recheck this step — compare it against the worked example.";

export interface WhyAssembly {
  /** State A: restated correct result. */
  whatRight?: string;
  /** State A: terminal worked-example reveal ("this is the {title} pattern"). */
  whyItWorks?: string;
  /** State B/C: plain "what happened" line (student-facing, growth-framed). */
  whatHappened?: string;
  /** State B/C: the corrective next step. */
  theFix?: string;
}

/** Terminal reveal step of the worked example whose pattern matches the item. */
function terminalReveal(workedExamples: WorkedExample[]): { title: string; reveal: string } | null {
  const we = workedExamples[0];
  if (!we || we.steps.length === 0) return null;
  const last = we.steps[we.steps.length - 1];
  return { title: we.title, reveal: last.reveal };
}

/** The most-specific authored hint not yet shown (clamped to the last hint). */
function nextAuthoredHint(problem: ProblemTemplate, hintsAlreadyShown: number): string | null {
  if (problem.hints.length === 0) return null;
  return problem.hints[Math.min(hintsAlreadyShown, problem.hints.length - 1)];
}

/**
 * STATE A (CORRECT): whyItWorks = the worked example's terminal reveal
 * ("this is the {title} pattern"); whatRight = restated result. No generated
 * prose, no new field (spec §B).
 */
export function assembleCorrect(
  problem: ProblemTemplate,
  workedExamples: WorkedExample[],
): WhyAssembly {
  const we = terminalReveal(workedExamples);
  return {
    whatRight: "That's the correct result.",
    whyItWorks: we
      ? `This is the ${we.title} pattern: ${we.reveal}`
      : "You applied the rule for this skill correctly.",
  };
}

/**
 * STATE B (INCORRECT + matched tag): BLOCKER B — the student-facing "what
 * happened" / "the fix" come from AUTHORED student content only (the next
 * progressive hint, then the worked-example terminal reveal), NEVER from the
 * raw registry description or the tutor diagnosis built from it. The tutor
 * panel's contextHook reframe/bridge are added separately at the screen.
 */
export function assembleIncorrectTagged(
  problem: ProblemTemplate,
  hintsAlreadyShown: number,
  workedExamples: WorkedExample[],
): WhyAssembly {
  const hint = nextAuthoredHint(problem, hintsAlreadyShown);
  if (hint) {
    return {
      whatHappened: "Not quite yet — here's the step to check.",
      theFix: hint,
    };
  }
  const we = terminalReveal(workedExamples);
  return {
    whatHappened: "Not quite yet — compare your steps to the worked example.",
    theFix: we ? we.reveal : GENERIC_RECHECK,
  };
}

/**
 * STATE C (INCORRECT, no tag): reveal the next progressive hint as the
 * "why-not-yet" (never fabricate a misconception). Deeper fallback = the
 * node's worked-example terminal reveal. No tutor panel (honesty — spec §B).
 */
export function assembleIncorrectUntagged(
  problem: ProblemTemplate,
  hintsAlreadyShown: number,
  workedExamples: WorkedExample[],
): WhyAssembly {
  const nextHint = nextAuthoredHint(problem, hintsAlreadyShown);
  if (nextHint) {
    return {
      whatHappened: "Not quite yet — here's the next thing to check.",
      theFix: nextHint,
    };
  }
  const we = terminalReveal(workedExamples);
  return {
    whatHappened: "Not quite yet — compare your steps to the worked example.",
    theFix: we ? we.reveal : "Walk back through the worked example one line at a time.",
  };
}

/**
 * Summary "WHAT TO FIRM UP" rephrase (spec §C). BLOCKER B — sourced from
 * AUTHORED student content (the most-specific hint, then the worked-example
 * terminal reveal), NEVER the raw registry description / tutor diagnosis.
 * Falls back to a non-deficit generic line when no authored content exists.
 */
export function firmUpStatement(
  problem: ProblemTemplate | null,
  workedExamples: WorkedExample[],
): string {
  const hint = problem ? nextAuthoredHint(problem, 0) : null;
  if (hint && hint.trim() !== "") return hint.trim();
  const we = terminalReveal(workedExamples);
  if (we) return `Recheck this against the worked example: ${we.reveal}`;
  return GENERIC_RECHECK;
}
