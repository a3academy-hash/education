// Focused POC content (ALG-F01 only) — the mixed interaction script for the two
// Integer-Operations worked examples, keyed by worked-example id. Each array is
// aligned to that worked example's steps: null = plain reveal; otherwise a
// predict (choose the next move) or fill (type the short result) gate.
//
// mr-kahn note: this is interaction content for ONE skill's worked examples,
// kept code-side for the POC. If it proves out, promote the per-step interaction
// into the graph's WorkedExample schema (mr-gates/mr-kahn) instead of a map.

import type { StepInteraction } from "./step-reveal-logic";

const WORKED_INTERACTIONS: Record<string, (StepInteraction | null)[]> = {
  // "Adding signed numbers on a number line: −4 + 7"
  // steps: [where is −4] [adding +7 → direction] [land on ?] [why 3, not −3/−11]
  "ALG-F01-we-01": [
    null,
    {
      kind: "predict",
      prompt: "Adding a positive number — which way do you move on the line?",
      options: ["left", "right", "stay"],
      answer: "right",
    },
    { kind: "fill", answer: "3" },
    null,
  ],
  // "Subtracting a negative: 5 − (−3)"
  // steps: [warm-up 5−3] [subtracting −3 flips direction] [land on ?] [rewrite]
  "ALG-F01-we-02": [
    null,
    {
      kind: "predict",
      prompt: "Subtracting a negative flips the direction — which way do you move now?",
      options: ["left", "right"],
      answer: "right",
    },
    { kind: "fill", answer: "8" },
    null,
  ],
};

/** Per-step interactions for a worked example, or undefined (→ all reveal). */
export function workedInteractionsFor(
  workedExampleId: string,
): (StepInteraction | null)[] | undefined {
  return WORKED_INTERACTIONS[workedExampleId];
}
