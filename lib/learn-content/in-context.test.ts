// selectInContext tests (M3) — the IN CONTEXT card de-dups against THE IDEA.
// THE IDEA shows `phase===3 ? neutralHook : sportHook`; IN CONTEXT must never
// echo that exact string, and is "none" for the neutral track.

import { describe, expect, it } from "vitest";
import { selectInContext } from "./in-context";
import type { ContextHooks } from "../../types";

function hooks(over: Partial<ContextHooks> = {}): ContextHooks {
  return {
    baseball: "Bases loaded story",
    softball: "",
    basketball: "",
    soccer: "",
    football: "",
    volleyball: "",
    neutral: "Standard notation 2^3 = 8",
    ...over,
  };
}

// THE IDEA string, mirroring LearnClient's concept derivation.
const idea = (phase: 1 | 2 | 3, sport: keyof ContextHooks, h: ContextHooks): string =>
  phase === 3 ? h.neutral : h[sport];

describe("selectInContext", () => {
  it("P1 sport → notation(neutralHook), distinct from THE IDEA (sport hook)", () => {
    const h = hooks();
    const v = selectInContext(1, "baseball", h);
    expect(v).toEqual({ kind: "notation", body: h.neutral });
    if (v.kind === "notation") {
      expect(v.body.trim()).not.toBe(idea(1, "baseball", h).trim());
    }
  });

  it("P2 sport → notation(neutralHook), distinct from THE IDEA", () => {
    const h = hooks();
    const v = selectInContext(2, "baseball", h);
    expect(v).toEqual({ kind: "notation", body: h.neutral });
    if (v.kind === "notation") {
      expect(v.body.trim()).not.toBe(idea(2, "baseball", h).trim());
    }
  });

  it("P3 sport (sportHook ≠ neutralHook) → breadcrumb(sportHook), distinct from THE IDEA", () => {
    const h = hooks();
    const v = selectInContext(3, "baseball", h);
    expect(v).toEqual({ kind: "breadcrumb", sportHook: h.baseball });
    if (v.kind === "breadcrumb") {
      expect(v.sportHook.trim()).not.toBe(idea(3, "baseball", h).trim());
    }
  });

  it("P3 sport (sportHook === neutralHook) → none", () => {
    const h = hooks({ baseball: "Standard notation 2^3 = 8" });
    expect(selectInContext(3, "baseball", h)).toEqual({ kind: "none" });
  });

  it("neutral track → none at every phase", () => {
    const h = hooks();
    expect(selectInContext(1, "neutral", h)).toEqual({ kind: "none" });
    expect(selectInContext(2, "neutral", h)).toEqual({ kind: "none" });
    expect(selectInContext(3, "neutral", h)).toEqual({ kind: "none" });
  });

  it("the returned body/breadcrumb never equals THE IDEA's idea string (all phases × sport)", () => {
    const h = hooks();
    for (const phase of [1, 2, 3] as const) {
      const v = selectInContext(phase, "baseball", h);
      const shown =
        v.kind === "notation" ? v.body : v.kind === "breadcrumb" ? v.sportHook : null;
      if (shown !== null) {
        expect(shown.trim()).not.toBe(idea(phase, "baseball", h).trim());
      }
    }
  });
});
