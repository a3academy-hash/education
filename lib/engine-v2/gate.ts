// The retention firewall / lock gate (THE D5 fix; AI_ADAPTIVE §7, CLAUDE §3). A node
// locks MASTERED ONLY from DELAYED, UNSEEN retrieval clears at the 1/7/21-day windows,
// each at the §3 lower-bound confidence, covering all four transfer dimensions.
// In-session/practiced attempts never produce LockEvidence, so they can NEVER lock a
// node — the firewall is airtight by construction. Pure.
import type { LockEvidence } from "./types";
import { TRANSFER_DIMENSIONS } from "./types";

const WINDOWS = [1, 7, 21] as const;

export interface LockParams {
  /** lower-bound threshold (0.90 prereq / 0.85 leaf, from ab_parameters). */
  lowerBound: number;
  /** CLAUDE §3 ">=3-5 successful items per transfer dimension" (calibratable; default 3). */
  minPerDimension?: number;
}

/**
 * canLock — true iff, for EACH of the 1/7/21-day windows there is a qualifying
 * (`unseen && correct && pKnownLB >= lowerBound`) clear, AND every transfer dimension
 * has at least `minPerDimension` qualifying clears (CLAUDE §3, default 3). Empty/
 * in-session history -> false (in-session evidence never reaches this history).
 */
export function canLock(history: LockEvidence[], { lowerBound, minPerDimension = 3 }: LockParams): boolean {
  const qualifying = history.filter((e) => e.unseen && e.correct && e.pKnownLB >= lowerBound);
  if (qualifying.length === 0) return false;

  // every delayed window must have a qualifying clear
  for (const w of WINDOWS) {
    if (!qualifying.some((e) => e.window === w)) return false;
  }
  // every transfer dimension must have >= minPerDimension qualifying clears
  for (const dim of TRANSFER_DIMENSIONS) {
    if (qualifying.filter((e) => e.dimension === dim).length < minPerDimension) return false;
  }
  return true;
}

/** Is a node due for its next scheduled delayed check at `now`? (provenance helper) */
export function dueForDelayedCheck(nextReviewAtIso: string | null, nowIso: string): boolean {
  if (!nextReviewAtIso) return false;
  return new Date(nowIso).getTime() >= new Date(nextReviewAtIso).getTime();
}
