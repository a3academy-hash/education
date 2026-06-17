// lib/engine-v2/guardrails.test.ts — the §8 guardrails (Phase 8 R1). End-to-end
// "guardrails active" over the live predicted-success PROXY: band targeting +
// frustration recovery (auto-recover) + review cap. Also asserts the proxy
// monotonicity and the firewall (imports only selector, never reward-mode).

import { describe, it, expect } from "vitest";
import {
  applyGuardrails,
  proxyPredictedSuccess,
  DEFAULT_GUARDRAILS,
  type GuardrailCandidate,
  type LiveSignals,
} from "./guardrails";

const base: LiveSignals = {
  masteryScore: 0.8,
  consecutiveErrors: 0,
  reviewServedFraction: 0,
};

function cand(itemId: string, difficulty: 1 | 2 | 3, isReview = false): GuardrailCandidate {
  return { itemId, difficulty, isReview };
}

describe("proxyPredictedSuccess", () => {
  it("rises with mastery and falls with difficulty, clamped 0..1", () => {
    expect(proxyPredictedSuccess(0.9, 1)).toBeCloseTo(0.9, 5);
    expect(proxyPredictedSuccess(0.9, 3)).toBeLessThan(proxyPredictedSuccess(0.9, 1));
    expect(proxyPredictedSuccess(0.1, 3)).toBe(0); // clamped
    expect(proxyPredictedSuccess(1.5, 1)).toBe(1); // clamped
  });
});

describe("band targeting", () => {
  it("picks the difficulty whose PROXY lands inside the 70-90% band", () => {
    // mastery 0.8: easy proxy=0.8 (in band), medium=0.65 (below), hard=0.5 (below).
    const decision = applyGuardrails(
      [cand("hard", 3), cand("medium", 2), cand("easy", 1)],
      base,
    );
    expect(decision?.itemId).toBe("easy");
    expect(decision?.reason).toBe("band");
  });

  it("for a high-mastery student, steers AWAY from a too-easy item toward an in-band stretch", () => {
    // mastery 1.0: easy proxy=1.0 (ABOVE band → too easy), medium=0.85 (in band),
    // hard=0.70 (at the band floor). The band guardrail must NOT serve the too-easy
    // item; within-band ranking is utility-driven (either stretch is acceptable).
    const decision = applyGuardrails(
      [cand("easy", 1), cand("medium", 2), cand("hard", 3)],
      { ...base, masteryScore: 1.0 },
    );
    expect(decision?.itemId).not.toBe("easy");
    expect(["medium", "hard"]).toContain(decision?.itemId);
    expect(decision?.reason).toBe("band");
  });
});

describe("frustration recovery", () => {
  const K = DEFAULT_GUARDRAILS.selector.frustrationK;

  it("at ≥K consecutive errors, serves the most reachable win", () => {
    const decision = applyGuardrails(
      [cand("hard", 3), cand("easy", 1), cand("medium", 2)],
      { ...base, consecutiveErrors: K },
    );
    // The easiest item has the highest proxy success — the reachable win.
    expect(decision?.itemId).toBe("easy");
    expect(decision?.reason).toBe("frustration_fallback");
  });

  it("auto-recovers: once errors reset (a correct answer), normal band targeting resumes", () => {
    const cands = [cand("hard", 3), cand("easy", 1), cand("medium", 2)];
    const tripped = applyGuardrails(cands, { ...base, consecutiveErrors: K });
    expect(tripped?.reason).toBe("frustration_fallback");
    const recovered = applyGuardrails(cands, { ...base, consecutiveErrors: 0 });
    expect(recovered?.reason).toBe("band");
  });
});

describe("review-burden cap", () => {
  it("excludes review items once the session is over the cap (when progress items remain)", () => {
    const over = DEFAULT_GUARDRAILS.selector.maxReviewFraction;
    const decision = applyGuardrails(
      [cand("review-a", 1, true), cand("progress", 1, false)],
      { ...base, reviewServedFraction: over },
    );
    expect(decision?.itemId).toBe("progress");
    expect(decision?.reason).toBe("review_capped");
  });

  it("falls back to review when review is all that's left, even over the cap", () => {
    const over = DEFAULT_GUARDRAILS.selector.maxReviewFraction;
    const decision = applyGuardrails(
      [cand("review-a", 1, true), cand("review-b", 2, true)],
      { ...base, reviewServedFraction: over },
    );
    expect(decision?.itemId).toBeDefined();
    expect(decision?.reason).not.toBe("review_capped"); // no progress item to switch to
  });
});

describe("edge cases", () => {
  it("returns null with no candidates", () => {
    expect(applyGuardrails([], base)).toBeNull();
  });

  it("is deterministic for identical input", () => {
    const cands = [cand("a", 2), cand("b", 2), cand("c", 1)];
    const d1 = applyGuardrails(cands, base);
    const d2 = applyGuardrails(cands, base);
    expect(d1).toEqual(d2);
  });
});

describe("firewall", () => {
  it("imports only the selector — nothing from gate/session/mastery-engine/reward-mode", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    const src = fs.readFileSync(new URL("./guardrails.ts", import.meta.url), "utf8");
    const imports = src
      .split("\n")
      .filter((l) => /^\s*import\b/.test(l) || /^\s*}\s*from\s+["']/.test(l))
      .join("\n");
    expect(imports).not.toMatch(/["'].*\/gate["']/);
    expect(imports).not.toMatch(/["'].*\/session["']/);
    expect(imports).not.toMatch(/mastery-engine/);
    expect(imports).not.toMatch(/reward-mode/);
  });
});
