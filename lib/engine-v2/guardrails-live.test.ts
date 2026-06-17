// guardrails-live.test.ts — the §8 guardrails AS WIRED into the LIVE practice
// selection (Phase 8 R1). PracticeFlow
// (app/student/(shell)/practice/[skillId]/PracticeFlow.tsx) maps each served item
// to a guardrail candidate (difficulty + isReview from `source`) and calls
// applyGuardrails with the live signals (mastery score, consecutive errors,
// review fraction) to choose the NEXT item from the not-yet-played pool. This
// test reproduces that EXACT mapping (kept in lockstep with PracticeFlow's
// pickNextIndex) and asserts band targeting + frustration recovery + the review
// cap are reachable on the live path. The server still grades every answer
// authoritatively — these guardrails govern ORDER only.

import { describe, it, expect } from "vitest";
import { applyGuardrails, type GuardrailCandidate } from "./guardrails";

interface LiveItem {
  difficulty: 1 | 2 | 3;
  source?: "practice" | "retention";
}

// MIRRORS PracticeFlow.pickNextIndex exactly.
function pickNextIndex(
  items: LiveItem[],
  played: number[],
  masteryScore: number,
  consecutiveErrors: number,
  reviewServedCount: number,
): number | null {
  const remaining = items.map((it, i) => ({ it, i })).filter(({ i }) => !played.includes(i));
  if (remaining.length === 0) return null;
  const probe = remaining.find(({ it }) => it.source === "retention");
  if (played.length === 0 && probe) return probe.i;
  const candidates: GuardrailCandidate[] = remaining.map(({ it, i }) => ({
    itemId: String(i),
    difficulty: it.difficulty,
    isReview: it.source === "retention",
  }));
  const reviewFrac = played.length > 0 ? reviewServedCount / played.length : 0;
  const decision = applyGuardrails(candidates, {
    masteryScore,
    consecutiveErrors,
    reviewServedFraction: reviewFrac,
  });
  return decision ? Number(decision.itemId) : remaining[0].i;
}

describe("guardrails active on the live practice path", () => {
  it("pins a retention probe FIRST regardless of difficulty", () => {
    const items: LiveItem[] = [
      { difficulty: 1, source: "practice" },
      { difficulty: 3, source: "retention" },
    ];
    expect(pickNextIndex(items, [], 0.8, 0, 0)).toBe(1);
  });

  it("BAND targeting: at moderate mastery, serves the band-appropriate difficulty next", () => {
    const items: LiveItem[] = [
      { difficulty: 3, source: "practice" }, // proxy 0.5
      { difficulty: 2, source: "practice" }, // proxy 0.65
      { difficulty: 1, source: "practice" }, // proxy 0.8 (in band)
    ];
    expect(pickNextIndex(items, [], 0.8, 0, 0)).toBe(2);
  });

  it("FRUSTRATION recovery: ≥K errors serve a reachable win, then auto-recover", () => {
    const items: LiveItem[] = [
      { difficulty: 3, source: "practice" },
      { difficulty: 1, source: "practice" },
      { difficulty: 2, source: "practice" },
    ];
    const tripped = pickNextIndex(items, [0], 0.8, 3, 0);
    expect(tripped).toBe(1); // easiest of the remaining
    const recovered = pickNextIndex(items, [1], 0.8, 0, 0);
    expect(recovered).not.toBeNull();
  });

  it("REVIEW cap: a retention item is not re-served once the review fraction is high", () => {
    const items: LiveItem[] = [
      { difficulty: 1, source: "retention" }, // index 0, played
      { difficulty: 1, source: "practice" }, // index 1, played
      { difficulty: 1, source: "retention" }, // index 2, remaining review
      { difficulty: 2, source: "practice" }, // index 3, remaining progress
    ];
    const picked = pickNextIndex(items, [0, 1], 0.8, 0, 1);
    expect(picked).toBe(3);
  });
});
