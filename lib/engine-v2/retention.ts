// FSRS-style retention layer (AI_ADAPTIVE §5/§7). Per-node memory STABILITY (days)
// that decays to a recall probability and updates ONLY on retrieval. Exact, clamped,
// monotone — no blow-up/oscillation (codexreview retention-formula). Pure.
import { RETENTION } from "./types";

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** P(recall) of a node `elapsed` days after the last retrieval, given stability S. */
export function pRecall(elapsedDays: number, stability: number): number {
  if (elapsedDays <= 0) return 1; // just retrieved (or massed) -> full recall
  if (stability <= 0) return 0;
  return clamp(Math.pow(2, -elapsedDays / stability), 0, 1);
}

/**
 * Update stability on a RETRIEVAL. Success when the memory was WEAK (long elapsed,
 * low pRecall) strengthens MORE (desirable difficulty); MASSED success (elapsed<=0)
 * builds NO durability (the retention firewall — cramming never increases stability).
 * Failure shrinks stability by FAIL_FACTOR. Always clamped to [MIN, MAX].
 */
export function retentionUpdate(stability: number, success: boolean, elapsedDays: number): number {
  const S = clamp(stability, RETENTION.STABILITY_MIN, RETENTION.STABILITY_MAX);
  if (!success) return clamp(S * RETENTION.FAIL_FACTOR, RETENTION.STABILITY_MIN, RETENTION.STABILITY_MAX);
  if (elapsedDays <= 0) return S; // massed success: no durability gain (firewall)
  const spacing = 1 - pRecall(elapsedDays, S); // larger when retrieving a weaker memory
  return clamp(S * (1 + RETENTION.GROWTH * spacing), RETENTION.STABILITY_MIN, RETENTION.STABILITY_MAX);
}

/** Days until pRecall falls to targetRecall: t where 2^(-t/S) = target -> t = S·log2(1/target). */
export function daysUntilReview(stability: number, targetRecall = RETENTION.TARGET_RECALL): number {
  const S = clamp(stability, RETENTION.STABILITY_MIN, RETENTION.STABILITY_MAX);
  return S * Math.log2(1 / targetRecall);
}

/** Schedule the next review BEFORE the predicted lapse (ISO out). */
export function nextReviewAtIso(lastRetrievalAtIso: string, stability: number, targetRecall = RETENTION.TARGET_RECALL): string {
  const last = new Date(lastRetrievalAtIso).getTime();
  const ms = daysUntilReview(stability, targetRecall) * 86_400_000;
  return new Date(last + ms).toISOString();
}
