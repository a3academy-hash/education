// lib/learn-content/in-context.ts — what the Learn "IN CONTEXT" card shows (M3).
// PURE. THE IDEA card already shows `concept = phase===3 ? neutralHook :
// sportHook`. IN CONTEXT must not echo that same string. This selector returns
// only the part THE IDEA did not, and "none" when nothing distinct remains
// (the card then renders nothing — no filler).

import type { ContextHooks, Phase, Sport } from "@/types";

export type InContextView =
  | { kind: "none" }
  | { kind: "notation"; body: string }
  | { kind: "breadcrumb"; sportHook: string };

/** What the Learn "IN CONTEXT" card shows, de-duped vs THE IDEA (which shows
 *  phase===3 ? neutral hook : sport hook). Returns "none" when nothing distinct remains. */
export function selectInContext(phase: Phase, sport: Sport, hooks: ContextHooks): InContextView {
  const idea = (phase === 3 ? hooks.neutral : hooks[sport]).trim();
  if (sport === "neutral") return { kind: "none" };
  if (phase === 3) {
    const sh = hooks[sport];
    return sh.trim() === idea ? { kind: "none" } : { kind: "breadcrumb", sportHook: sh };
  }
  const body = hooks.neutral;
  return body.trim() === idea ? { kind: "none" } : { kind: "notation", body };
}
