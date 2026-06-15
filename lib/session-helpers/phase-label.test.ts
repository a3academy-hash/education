// phaseLabel tests (M2) — every phase × {a real sport, neutral}; the neutral
// track NEVER yields sport-context wording, the sport track always does.

import { describe, expect, it } from "vitest";
import { phaseLabel } from "./phase-label";
import type { Phase } from "../../types";

const SPORT_WORDS = ["Sports context", "Blended", "Neutral transfer"];
const PHASES: Phase[] = [1, 2, 3];

describe("phaseLabel", () => {
  it("returns sport-context wording for a real sport, per phase", () => {
    expect(phaseLabel(1, "baseball")).toBe("Sports context");
    expect(phaseLabel(2, "baseball")).toBe("Blended");
    expect(phaseLabel(3, "baseball")).toBe("Neutral transfer");
  });

  it("returns neutral-track wording for the neutral track, per phase", () => {
    expect(phaseLabel(1, "neutral")).toBe("Concrete examples");
    expect(phaseLabel(2, "neutral")).toBe("Bridging to notation");
    expect(phaseLabel(3, "neutral")).toBe("Standard notation");
  });

  it("never returns sport-context wording on the neutral track (any phase)", () => {
    for (const p of PHASES) {
      expect(SPORT_WORDS).not.toContain(phaseLabel(p, "neutral"));
    }
  });

  it("always returns sport-context wording on a sport track (any phase)", () => {
    for (const p of PHASES) {
      expect(SPORT_WORDS).toContain(phaseLabel(p, "baseball"));
    }
  });
});
