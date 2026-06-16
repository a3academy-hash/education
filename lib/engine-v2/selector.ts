// engine-v2 selector (AI_ADAPTIVE §5/§8). Composite-utility, rule-based, interpretable
// next-item selection that targets the 70-90% success band, preserves retention, covers
// transfer, and has a frustration fallback that cannot trap a student below level. Pure.
import { pKnownVar } from "./bkt";

export interface Candidate {
  nodeId: string;
  itemId: string;
  difficulty: 1 | 2 | 3;
  /** BKT P(known) for the node. */
  pKnown: number;
  /** Current recall probability (retention). */
  pRecall: number;
  /** How overdue this node is for review (0 = not due, 1 = well past). */
  dueWeight: number;
  /** Unmet transfer-dimension coverage for the node (0 = covered, 1 = none). */
  coverageGap: number;
  /** Is this a maintenance/review item (vs forward progress)? */
  isReview: boolean;
}

export interface SelectorState {
  /** Consecutive incorrect answers this session (frustration signal). */
  consecutiveErrors: number;
  /** Fraction of this session already spent on review items. */
  reviewServedFraction: number;
}

export interface SelectorParams {
  wInfo: number; wRet: number; wTransfer: number;
  /** Frustration fallback triggers at/after this many consecutive errors. */
  frustrationK: number;
  /** Max fraction of a session that may be review (burden cap, §8). */
  maxReviewFraction: number;
  /** Target predicted-success band (§8). */
  bandLo: number; bandHi: number;
}

export const DEFAULT_SELECTOR: SelectorParams = {
  wInfo: 1, wRet: 1.2, wTransfer: 0.5,
  frustrationK: 3, maxReviewFraction: 0.4, bandLo: 0.7, bandHi: 0.9,
};

/** Predicted success on a candidate = P(known) · P(recall). */
export function predictedSuccess(c: Candidate): number {
  return c.pKnown * c.pRecall;
}

/** Composite utility (higher = more valuable to serve now). */
export function utility(c: Candidate, p: SelectorParams): number {
  const info = pKnownVar(c.pKnown); // max uncertainty reduction near p=0.5
  const ret = (1 - c.pRecall) * c.dueWeight; // about to lapse + overdue
  return p.wInfo * info + p.wRet * ret + p.wTransfer * c.coverageGap;
}

/**
 * Band-fit (the §8 difficulty GUARDRAIL). Pure info-gain peaks at 50% success, which
 * is frustrating — so the success band is the PRIMARY difficulty target and utility
 * ranks WITHIN it. 1 = predicted success inside [bandLo, bandHi]; decays with distance
 * outside (below-band = frustration risk, above-band = too easy). 0..1.
 */
export function bandFit(c: Candidate, p: SelectorParams): number {
  const ps = predictedSuccess(c);
  if (ps >= p.bandLo && ps <= p.bandHi) return 1;
  const dist = ps < p.bandLo ? p.bandLo - ps : ps - p.bandHi;
  return Math.max(0, 1 - dist);
}

export interface Selection {
  itemId: string;
  reason: "utility" | "frustration_fallback";
}

/**
 * Choose the next item. Rules:
 *  1. Review-burden cap: if the session is already at/over maxReviewFraction review,
 *     EXCLUDE review candidates (don't let maintenance crowd out progress) — unless
 *     review is all that's left.
 *  2. Frustration fallback: at >= frustrationK consecutive errors, pick the candidate
 *     with the HIGHEST predicted success that is still within/above the band floor (a
 *     reachable win) — never below the band's purpose, and it RECOVERS automatically
 *     the next turn errors reset (caller resets consecutiveErrors on a correct answer).
 *  3. Otherwise: maximize composite utility, breaking ties toward the band (closest
 *     predicted success to the band midpoint) then itemId for determinism.
 */
export function selectNext(
  candidates: Candidate[],
  state: SelectorState,
  p: SelectorParams = DEFAULT_SELECTOR,
): Selection | null {
  if (candidates.length === 0) return null;

  // (1) review-burden cap
  let pool = candidates;
  if (state.reviewServedFraction >= p.maxReviewFraction) {
    const nonReview = candidates.filter((c) => !c.isReview);
    if (nonReview.length > 0) pool = nonReview;
  }

  // (2) frustration fallback -> the most reachable win
  if (state.consecutiveErrors >= p.frustrationK) {
    const reachable = [...pool].sort(
      (a, b) => predictedSuccess(b) - predictedSuccess(a) || a.itemId.localeCompare(b.itemId),
    );
    return { itemId: reachable[0].itemId, reason: "frustration_fallback" };
  }

  // (3) band-fit FIRST (the difficulty guardrail — never serve a frustrating/too-easy
  //     item when a band-appropriate one exists), then maximize utility within the
  //     band tier, then closeness to the band midpoint, then itemId for determinism.
  const ranked = [...pool].sort((a, b) => {
    const dband = bandFit(b, p) - bandFit(a, p);
    if (Math.abs(dband) > 1e-9) return dband;
    const du = utility(b, p) - utility(a, p);
    if (Math.abs(du) > 1e-12) return du;
    const mid = (p.bandLo + p.bandHi) / 2;
    return Math.abs(predictedSuccess(a) - mid) - Math.abs(predictedSuccess(b) - mid)
      || a.itemId.localeCompare(b.itemId);
  });
  return { itemId: ranked[0].itemId, reason: "utility" };
}
