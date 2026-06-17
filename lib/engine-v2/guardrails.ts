// lib/engine-v2/guardrails.ts — the §8 engagement guardrails, GENUINELY active
// on the LIVE practice selection path (Phase 8 R1). PURE. Additive: the server
// still grades every answer authoritatively. This module only governs WHICH of
// the already-served items is presented NEXT — the 70-90% success band, the
// frustration fallback (≥K consecutive errors → a reachable win, auto-recover),
// and the review-burden cap.
//
// It REUSES the existing selector (selector.ts) over a predicted-success PROXY
// derived from the LIVE mastery score (the live engine has no per-item BKT
// P(known)/FSRS P(recall) yet — that is the not-cutover engine-v2 substrate).
// proxy = f(masteryScore, difficulty): a higher mastery score lifts predicted
// success; a harder item lowers it. This keeps the guardrails reachable from the
// live loop WITHOUT the full engine-v2 mastery cutover (which remains separate).
//
// FIREWALL: this imports ONLY selector.ts (pure ranking) — nothing from
// gate.ts/session.ts/mastery-engine, and nothing reward-mode. It never sets
// mastery, never locks, never reorders curriculum.

import {
  selectNext,
  predictedSuccess,
  type Candidate,
  type SelectorParams,
  type SelectorState,
  DEFAULT_SELECTOR,
} from "./selector";

/** One already-served practice item the guardrails may choose among. */
export interface GuardrailCandidate {
  itemId: string;
  /** 1 = easy, 2 = medium, 3 = hard. */
  difficulty: 1 | 2 | 3;
  /** Is this a maintenance/review item (vs forward progress)? */
  isReview: boolean;
}

/** Live, per-request signals (no per-item BKT/FSRS on the live substrate yet). */
export interface LiveSignals {
  /** The live engine mastery score for the focus node, 0..1. */
  masteryScore: number;
  /** Consecutive incorrect answers this session (frustration signal). */
  consecutiveErrors: number;
  /** Fraction of this session already spent on review items, 0..1. */
  reviewServedFraction: number;
}

export interface GuardrailParams {
  selector: SelectorParams;
  /**
   * Per-difficulty success penalty for the predicted-success PROXY. A harder
   * item is less likely to be answered correctly at a given mastery level. These
   * are presentation/selection tuning only — they never enter mastery math.
   * MATT THRESHOLD CHECKPOINT (selection tuning, not a mastery weight).
   */
  difficultyDrag: Record<1 | 2 | 3, number>;
}

export const DEFAULT_GUARDRAILS: GuardrailParams = {
  selector: DEFAULT_SELECTOR,
  // proxy ≈ masteryScore − drag(difficulty): an easy item reads near the raw
  // mastery score; a hard item sits well below it (so a low-mastery student is
  // steered toward easier wins, a high-mastery student toward stretch).
  difficultyDrag: { 1: 0.0, 2: 0.15, 3: 0.3 },
};

/**
 * Predicted success PROXY for an item, from the live mastery score and the
 * item's difficulty. Clamped 0..1. Higher mastery → higher predicted success;
 * harder item → lower. This is the live stand-in for the engine-v2
 * predictedSuccess = P(known)·P(recall).
 */
export function proxyPredictedSuccess(
  masteryScore: number,
  difficulty: 1 | 2 | 3,
  p: GuardrailParams = DEFAULT_GUARDRAILS,
): number {
  const raw = masteryScore - p.difficultyDrag[difficulty];
  return Math.min(1, Math.max(0, Number.isFinite(raw) ? raw : 0));
}

/**
 * Map a GuardrailCandidate to the selector's Candidate shape. The proxy success
 * is carried as pKnown with pRecall = 1, so predictedSuccess(Candidate) ===
 * proxy (bandFit/frustration ranking is over the proxy). The utility-only
 * dimensions (dueWeight, coverageGap) are neutralised so the band guardrail +
 * frustration + review cap drive the decision (the live substrate has no
 * per-item retention/transfer signal yet).
 */
function toSelectorCandidate(c: GuardrailCandidate, signals: LiveSignals, p: GuardrailParams): Candidate {
  const proxy = proxyPredictedSuccess(signals.masteryScore, c.difficulty, p);
  return {
    nodeId: "live",
    itemId: c.itemId,
    difficulty: c.difficulty,
    pKnown: proxy,
    pRecall: 1,
    dueWeight: 0,
    coverageGap: 0,
    isReview: c.isReview,
  };
}

export interface GuardrailDecision {
  itemId: string;
  reason: "band" | "frustration_fallback" | "review_capped";
}

/**
 * Choose the next item under the §8 guardrails. Returns the chosen item id + the
 * governing reason, or null when there are no candidates. PURE.
 *
 * The selector applies (in order): review-burden cap → frustration fallback →
 * band-fit ranking. We surface the governing reason for the live UI / audit:
 *  - "frustration_fallback" when the selector took the reachable-win path,
 *  - "review_capped" when the review cap excluded review items this turn,
 *  - "band" otherwise (the normal success-band target).
 */
export function applyGuardrails(
  candidates: GuardrailCandidate[],
  signals: LiveSignals,
  params: GuardrailParams = DEFAULT_GUARDRAILS,
): GuardrailDecision | null {
  if (candidates.length === 0) return null;

  const selectorCands = candidates.map((c) => toSelectorCandidate(c, signals, params));
  const state: SelectorState = {
    consecutiveErrors: signals.consecutiveErrors,
    reviewServedFraction: signals.reviewServedFraction,
  };

  const choice = selectNext(selectorCands, state, params.selector);
  if (!choice) return null;

  if (choice.reason === "frustration_fallback") {
    return { itemId: choice.itemId, reason: "frustration_fallback" };
  }

  // Distinguish "review was capped this turn" (a non-review item was chosen
  // while the session is over the review cap and review candidates existed) from
  // the normal band target — purely for the surfaced reason.
  const overCap = signals.reviewServedFraction >= params.selector.maxReviewFraction;
  const hadReview = candidates.some((c) => c.isReview);
  const hadNonReview = candidates.some((c) => !c.isReview);
  if (overCap && hadReview && hadNonReview) {
    const chosen = candidates.find((c) => c.itemId === choice.itemId);
    if (chosen && !chosen.isReview) {
      return { itemId: choice.itemId, reason: "review_capped" };
    }
  }

  return { itemId: choice.itemId, reason: "band" };
}

/** Re-export for callers that want to inspect the proxy directly. */
export { predictedSuccess as selectorPredictedSuccess };
