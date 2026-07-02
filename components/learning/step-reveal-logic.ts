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

// ---------------------------------------------------------------------------
// Per-step interactions (the mixed worked-example stepper). A step can simply
// REVEAL (today's behavior), require the student to FILL in a short token, or
// PREDICT the next move from 2–3 options before it reveals. Backward-compatible:
// with no interactions and no blank, every step is "reveal" (unchanged).
// ---------------------------------------------------------------------------

export type StepInteraction =
  | { kind: "reveal" }
  | { kind: "fill"; answer: string }
  | { kind: "predict"; prompt?: string; options: string[]; answer: string };

/** Case/space-insensitive normalization for fill/predict matching. */
export function normalizeAnswer(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/**
 * Resolve the effective per-step interaction list. Explicit `interactions` win;
 * otherwise a legacy `blankStepIndex`/`blankAnswer` maps to a single fill; every
 * other step is a plain reveal. Always returns exactly `total` entries.
 */
export function buildInteractions(
  total: number,
  interactions: (StepInteraction | null | undefined)[] | undefined,
  blankStepIndex: number | null,
  blankAnswer: string,
): StepInteraction[] {
  const out: StepInteraction[] = [];
  for (let i = 0; i < total; i++) {
    const explicit = interactions?.[i];
    if (explicit) {
      out.push(explicit);
    } else if (blankStepIndex === i && blankAnswer !== "") {
      out.push({ kind: "fill", answer: blankAnswer });
    } else {
      out.push({ kind: "reveal" });
    }
  }
  return out;
}

/** Is the step at `revealed` gated by an unsatisfied fill/predict interaction? */
export function isInteractionGating(
  effective: StepInteraction[],
  revealed: number,
  satisfied: ReadonlySet<number>,
): boolean {
  if (revealed >= effective.length) return false;
  const it = effective[revealed];
  if (it.kind === "reveal") return false;
  return !satisfied.has(revealed);
}
