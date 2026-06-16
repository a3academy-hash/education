// engine-v2 session update — the D5 LIVE CUTOVER at the logic level (Phase 4).
// updateNode applies in-session evidence to PROVISIONAL state and NEVER sets locked.
// `locked` can flip true ONLY through evaluateLock over a LockEvidence history, and a
// LockEvidence row can be constructed ONLY from a DelayedCheck (the scheduled
// delayed/unseen check) — generic in-session Evidence cannot become LockEvidence.
// This makes the retention firewall a TYPE-LEVEL invariant, not a convention. Pure.
import { applyEvidence, type LearningState } from "./interaction";
import { canLock, type LockParams } from "./gate";
import type { BktParams, Evidence, LockEvidence, TransferDimension } from "./types";

export interface NodeUpdate {
  next: LearningState;
  /** In-session updates are ALWAYS provisional — they never lock (the firewall). */
  provisional: true;
}

/** Apply one in-session attempt. Returns the next provisional state; NEVER locks. */
export function updateNode(
  state: LearningState,
  ev: Evidence,
  params: BktParams,
  nowIso: string,
): NodeUpdate {
  return { next: applyEvidence(state, ev, params, nowIso), provisional: true };
}

/**
 * A scheduled DELAYED check (the only thing that can produce lock evidence). It is a
 * DISTINCT type — you cannot fabricate one from an in-session attempt, because it
 * requires the scheduled `window` and the computed `pKnownLB` that only the
 * delayed-check path supplies.
 */
export interface DelayedCheck {
  window: 1 | 7 | 21;
  unseen: boolean;
  correct: boolean;
  dimension: TransferDimension;
  pKnownLB: number;
  atIso: string;
}

/** The ONLY constructor of LockEvidence (codexreview record-lock-check-only). */
export function lockEvidenceFromCheck(c: DelayedCheck): LockEvidence {
  return {
    window: c.window,
    unseen: c.unseen,
    correct: c.correct,
    pKnownLB: c.pKnownLB,
    dimension: c.dimension,
    atIso: c.atIso,
  };
}

/**
 * Evaluate whether a node may lock — the SESSION boundary accepts ONLY DelayedCheck[]
 * (codexreview lock-evidence-bypass): it constructs the LockEvidence internally via
 * lockEvidenceFromCheck, so a caller cannot fabricate a LockEvidence and slip it past
 * the firewall. The low-level canLock(LockEvidence[]) stays gate-internal.
 */
export function evaluateLock(checks: DelayedCheck[], params: LockParams): boolean {
  return canLock(checks.map(lockEvidenceFromCheck), params);
}
