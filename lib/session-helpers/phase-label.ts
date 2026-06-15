// lib/session-helpers/phase-label.ts — the shared phase-chip label (M2). PURE.
// One source of truth for the per-phase wording, replacing four duplicated
// local maps across Learn / Practice / Summary / Home. The neutral track never
// sees sport-context wording: a neutral-track student's problems are not
// sport-themed, so the label set is chosen by `student.sport`, and the phase
// picks the word within that set.

import type { Phase, Sport } from "@/types";

const SPORT: Record<Phase, string> = {
  1: "Sports context",
  2: "Blended",
  3: "Neutral transfer",
};
const NEUTRAL: Record<Phase, string> = {
  1: "Concrete examples",
  2: "Bridging to notation",
  3: "Standard notation",
};

/** Phase chip label. Neutral-track students never see sport-context wording. */
export function phaseLabel(phase: Phase, sport: Sport): string {
  return (sport === "neutral" ? NEUTRAL : SPORT)[phase];
}
