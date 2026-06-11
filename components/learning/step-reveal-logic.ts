// Pure step-reveal progression (mr-gates condition 8). No React imports.

export interface RevealStep {
  /** Step body text. */
  text: string;
}

export interface RevealState {
  totalSteps: number;
  /** Number of steps currently revealed (0..totalSteps). */
  revealed: number;
  /** Index of a step rendered as a fill-in input (completion mode), or null. */
  blankStepIndex: number | null;
}

export function initRevealState(
  totalSteps: number,
  blankStepIndex: number | null = null,
): RevealState {
  return {
    totalSteps: Math.max(0, totalSteps),
    revealed: 0,
    blankStepIndex:
      blankStepIndex !== null && blankStepIndex >= 0 && blankStepIndex < totalSteps
        ? blankStepIndex
        : null,
  };
}

/** True once every step has been revealed. */
export function isComplete(s: RevealState): boolean {
  return s.revealed >= s.totalSteps;
}

/**
 * The button advancing the reveal is blocked while a completion-mode blank is
 * the NEXT step to reveal and has not been satisfied yet.
 */
export function isBlankGating(s: RevealState, blankSatisfied: boolean): boolean {
  if (s.blankStepIndex === null) return false;
  // The blank gates when it is the next step to reveal.
  return s.revealed === s.blankStepIndex && !blankSatisfied;
}

/** Advance one step if allowed; returns the next state (or the same state). */
export function revealNext(s: RevealState, blankSatisfied = true): RevealState {
  if (isComplete(s)) return s;
  if (isBlankGating(s, blankSatisfied)) return s;
  return { ...s, revealed: s.revealed + 1 };
}

/** Button label: "Show next step" until the final, then "Show result". */
export function nextButtonLabel(s: RevealState): string {
  return s.revealed >= s.totalSteps - 1 ? "Show result" : "Show next step";
}
