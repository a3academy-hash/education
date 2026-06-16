// lib/atoms — the predict/construct → resolve atom contract (overhaul Phase 4;
// CLAUDE §7). A PURE, typed state machine that makes "no slideshow: a screen cannot
// advance without a committed output" a LIBRARY INVARIANT. UI advance controls must
// consult canAdvance() (the priority UI cutover wires the worked-example stepper to
// it; tracked separately). Pure.

export type AtomState = "awaiting_prediction" | "resolving" | "resolved";

export interface Atom<T> {
  state: AtomState;
  /** The committed output (prediction/construction), or null before commit. */
  output: T | null;
}

export function newAtom<T>(): Atom<T> {
  return { state: "awaiting_prediction", output: null };
}

/**
 * Commit a prediction/construction. `isCommitted` decides whether `output` counts as
 * a real committed output (non-empty / valid) — an empty or invalid output leaves the
 * atom in `awaiting_prediction` (no advance). predict is idempotent/correctable BEFORE
 * resolve: re-predicting in `awaiting_prediction` or `resolving` updates the output.
 * It is a no-op once `resolved` (the answer is locked in).
 */
export function predict<T>(atom: Atom<T>, output: T, isCommitted: (o: T) => boolean): Atom<T> {
  if (atom.state === "resolved") return atom;
  if (!isCommitted(output)) return { state: "awaiting_prediction", output: null };
  return { state: "resolving", output };
}

/** Resolve a committed atom (reveal the teaching moment). Only valid from `resolving`. */
export function resolve<T>(atom: Atom<T>): Atom<T> {
  if (atom.state !== "resolving") return atom; // cannot resolve without a committed output
  return { state: "resolved", output: atom.output };
}

/** THE INVARIANT: a screen may advance ONLY when its atom is resolved. */
export function canAdvance<T>(atom: Atom<T>): boolean {
  return atom.state === "resolved";
}

/**
 * Worked-example fading ladder (CLAUDE §7): novices get the full example, then fill a
 * step, then work independently as the phase rises. Pure mapping.
 */
export type FadeStage = "full_example" | "fill_one_step" | "fill_more" | "independent";

export function fadeStage(phase: 1 | 2 | 3, masteryProgress: number): FadeStage {
  if (phase === 1 && masteryProgress < 0.3) return "full_example";
  if (phase === 1) return "fill_one_step";
  if (phase === 2) return masteryProgress < 0.6 ? "fill_one_step" : "fill_more";
  return "independent"; // phase 3: neutral transfer, no scaffold
}
