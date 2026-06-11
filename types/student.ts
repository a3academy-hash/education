// Student profile, per-skill state, and the append-only evidence trail
// (StudentAttempt + MasteryUpdate — accreditation/NCAA logging).

import type { MasteryStatus, Phase, Sport } from "./core";

export interface StudentProfile {
  id: string;
  /** First-name-only by policy (COPPA data minimization). */
  displayName: string;
  gradeLevel: number;
  sport: Sport;
  /** RLS-readiness: campus scoping for school/academy tenants. */
  campusId: string | null;
  parentalConsent: {
    status: "pending" | "granted" | "revoked";
    updatedAt: string | null;
  };
  createdAt: string;
}

/** One entry in the rolling recent-attempt window kept on StudentSkillState. */
export interface RecentAttempt {
  correct: boolean;
  timeMs: number;
  phase: Phase;
}

/**
 * Per-skill mastery state. Shape matches the mastery engine exactly.
 *
 * CONVENTION — whenever a MasteryUpdate sets/refreshes `masteredAt`, the
 * caller resets `recent` to []. `recent[]` therefore only ever contains
 * post-mastery (or post-restoration) attempts; full history lives in the
 * immutable StudentAttempt log, so nothing is lost for audit.
 */
export interface StudentSkillState {
  mastery: number;
  status: MasteryStatus;
  phase: Phase;
  attempts: number;
  correct: number;
  hints: number;
  timeMs: number;
  /** Rolling window, cap 5, most recent LAST. See CONVENTION above. */
  recent: RecentAttempt[];
  transfer: boolean;
  /** ISO timestamp of the most recent attempt, or null if never attempted. */
  lastAttemptAt: string | null;
  /** ISO timestamp of when mastery was (last) earned, or null if never mastered. */
  masteredAt: string | null;
}

export interface StudentAttempt {
  id: string;
  studentId: string;
  skillId: string;
  problemId: string;
  phase: Phase;
  sport: Sport;
  response: string;
  correct: boolean;
  hintsUsed: number;
  timeMs: number;
  misconceptionTags: string[];
  /**
   * True when the item was served as an N+1 phase probe. Probe attempts are
   * EXCLUDED from phase-advance accuracy (audit-reconstructable from this log).
   */
  isProbe: boolean;
  /**
   * Provenance marker, orthogonal to isProbe: "practice" for normal learning
   * attempts (the default at every writer), "diagnostic" for placement-
   * diagnostic items. ISOLATION RULE (mr-kahn + mr-gates): `source` must NEVER
   * enter mastery/phase math — advancePhase/selectProblems/computeMastery
   * ignore it. Write-side provenance + read-side audit only.
   * (Supabase later: `source text not null default 'practice'
   * check (source in ('practice','diagnostic'))` — additive, reversible.)
   */
  source: "practice" | "diagnostic";
  /**
   * Provenance/audit marker for the session that produced this attempt —
   * mirrors `source`. ISOLATION RULE (mr-kahn + mr-gates): `sessionId` must
   * NEVER enter mastery/phase/routing math — advancePhase/computeTransfer/
   * computeMastery/recommend ignore it. Write-side provenance + read-side
   * audit (and Summary before/after scoping) only.
   * (Supabase later: `session_id uuid not null` — Phase 5 references
   * sessions(id); bare uuid until then. Additive, reversible.)
   */
  sessionId: string;
  createdAt: string;
}

export type NewStudentAttempt = Omit<StudentAttempt, "id" | "createdAt">;

export interface MasteryUpdate {
  id: string;
  studentId: string;
  skillId: string;
  attemptId: string | null;
  trigger: "attempt" | "diagnostic" | "decay" | "credit-propagation";
  prevMastery: number;
  newMastery: number;
  prevStatus: MasteryStatus;
  newStatus: MasteryStatus;
  prevPhase: Phase;
  newPhase: Phase;
  reason: string;
  engineVersion: string;
  /**
   * Provenance/audit marker for the session that produced this update —
   * mirrors StudentAttempt.sessionId. ISOLATION RULE: `sessionId` must NEVER
   * enter mastery/phase/routing math. Write-side provenance + read-side audit
   * (Summary before/after scoping) only.
   * (Supabase later: `session_id uuid not null` — additive, reversible.)
   */
  sessionId: string;
  createdAt: string;
}

export type NewMasteryUpdate = Omit<MasteryUpdate, "id" | "createdAt">;
