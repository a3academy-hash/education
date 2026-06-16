import { describe, expect, it } from "vitest";
import { selectNext, utility, predictedSuccess, DEFAULT_SELECTOR, type Candidate, type SelectorState } from "./selector";

const c = (o: Partial<Candidate> & Pick<Candidate, "itemId">): Candidate => ({
  nodeId: o.nodeId ?? "N", itemId: o.itemId, difficulty: o.difficulty ?? 2,
  pKnown: o.pKnown ?? 0.5, pRecall: o.pRecall ?? 0.8, dueWeight: o.dueWeight ?? 0,
  coverageGap: o.coverageGap ?? 0, isReview: o.isReview ?? false,
});
const calm: SelectorState = { consecutiveErrors: 0, reviewServedFraction: 0 };

describe("selector — composite utility + guardrails", () => {
  it("returns null on no candidates", () => {
    expect(selectNext([], calm)).toBeNull();
  });

  it("within the success band, prefers the higher-utility candidate", () => {
    const highU = c({ itemId: "highU", pKnown: 0.8, pRecall: 0.95, dueWeight: 1, coverageGap: 1 }); // predSucc 0.76 (in band)
    const lowU = c({ itemId: "lowU", pKnown: 0.85, pRecall: 0.95, dueWeight: 0, coverageGap: 0 });  // predSucc 0.81 (in band)
    expect(utility(highU, DEFAULT_SELECTOR)).toBeGreaterThan(utility(lowU, DEFAULT_SELECTOR));
    expect(selectNext([lowU, highU], calm)!.itemId).toBe("highU");
  });

  it("BAND GUARDRAIL: an in-band candidate beats a higher-raw-utility BELOW-band (frustrating) one", () => {
    const belowBand = c({ itemId: "tooHard", pKnown: 0.5, pRecall: 0.5, dueWeight: 1, coverageGap: 1 }); // predSucc 0.25, high utility
    const inBand = c({ itemId: "justRight", pKnown: 0.8, pRecall: 0.95, dueWeight: 0, coverageGap: 0 }); // predSucc 0.76, low utility
    expect(utility(belowBand, DEFAULT_SELECTOR)).toBeGreaterThan(utility(inBand, DEFAULT_SELECTOR));
    expect(selectNext([belowBand, inBand], calm)!.itemId).toBe("justRight"); // band-fit wins
  });

  it("frustration fallback: after K errors, picks the most REACHABLE win (highest predicted success)", () => {
    const hard = c({ itemId: "hard", pKnown: 0.4, pRecall: 0.5 });   // predSucc 0.20
    const easy = c({ itemId: "easy", pKnown: 0.95, pRecall: 0.95 }); // predSucc ~0.90
    const frustrated: SelectorState = { consecutiveErrors: 3, reviewServedFraction: 0 };
    const sel = selectNext([hard, easy], frustrated);
    expect(sel!.reason).toBe("frustration_fallback");
    expect(sel!.itemId).toBe("easy");
    expect(predictedSuccess(easy)).toBeGreaterThan(predictedSuccess(hard));
  });

  it("RECOVERS: once errors reset to 0, selection returns to utility ranking (reason 'utility')", () => {
    const highU = c({ itemId: "highU", pKnown: 0.8, pRecall: 0.95, dueWeight: 1, coverageGap: 1 }); // in band, high utility
    const lowU = c({ itemId: "lowU", pKnown: 0.85, pRecall: 0.95 });                                // in band, low utility
    const sel = selectNext([highU, lowU], calm);
    expect(sel!.reason).toBe("utility");
    expect(sel!.itemId).toBe("highU");
  });

  it("review-burden cap: over maxReviewFraction excludes review items (if alternatives exist)", () => {
    const review = c({ itemId: "review", isReview: true, pKnown: 0.5, pRecall: 0.4, dueWeight: 1 });
    const progress = c({ itemId: "progress", isReview: false, pKnown: 0.5, pRecall: 0.8, coverageGap: 1 });
    const overCap: SelectorState = { consecutiveErrors: 0, reviewServedFraction: 0.5 };
    expect(selectNext([review, progress], overCap)!.itemId).toBe("progress");
  });

  it("review-burden cap does NOT starve when review is all that remains", () => {
    const review = c({ itemId: "only-review", isReview: true });
    const overCap: SelectorState = { consecutiveErrors: 0, reviewServedFraction: 0.9 };
    expect(selectNext([review], overCap)!.itemId).toBe("only-review");
  });
});
