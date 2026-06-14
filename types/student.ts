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

/** Staff role tiers minted by the 0005 access-token hook (user_role claim). */
export type StaffRole = "super_admin" | "campus_admin" | "coach";
export const STAFF_ROLES: readonly StaffRole[] = ["super_admin", "campus_admin", "coach"];

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
   * diagnostic items, "retention" for a scheduled retention probe (a normal
   * P3-neutral problem on an already-mastered node, injected by lib/retention
   * and scored through the UNCHANGED engine). ISOLATION RULE (mr-kahn +
   * mr-gates): `source` must NEVER enter mastery/phase/routing math —
   * advancePhase/selectProblems/computeMastery/recommend ignore it. Write-side
   * provenance + read-side audit only (lib/retention reads it to derive the
   * schedule; it never feeds any scoring decision).
   * (Supabase later: `source text not null default 'practice'
   * check (source in ('practice','diagnostic','retention'))` — additive, reversible.)
   */
  source: "practice" | "diagnostic" | "retention";
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
  /**
   * Curriculum CONTENT version the engine loaded when this attempt was scored
   * (graph_version, C-G2). Stamped CENTRALLY by the repository at append time
   * from getLoadedGraphVersion() — callers never pass it (it is NOT on
   * NewStudentAttempt). Maps to student_attempts.graph_version (NOT NULL).
   */
  graphVersion: string;
  /**
   * Deterministic engine version that produced this attempt row (engine_version,
   * C-G2). Stamped CENTRALLY by the repository at append time from ENGINE_VERSION
   * — callers never pass it. Maps to student_attempts.engine_version (NOT NULL).
   */
  engineVersion: string;
  createdAt: string;
}

/**
 * Insert shape: the centrally-stamped provenance fields (id, createdAt,
 * graphVersion, engineVersion) are Omitted — the repository fills them so no
 * call site can forget or forge a stamp (C-G1/C-G2).
 */
export type NewStudentAttempt = Omit<
  StudentAttempt,
  "id" | "createdAt" | "graphVersion" | "engineVersion"
>;

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
  /**
   * Curriculum CONTENT version the engine loaded when this update was produced
   * (graph_version, C-G2). Stamped CENTRALLY by the repository at append time
   * from getLoadedGraphVersion() — callers never pass it (NOT on
   * NewMasteryUpdate). engineVersion above is kept from the engine (the engine
   * already stamps it); only graphVersion is repository-filled. Maps to
   * mastery_updates.graph_version (NOT NULL).
   */
  graphVersion: string;
  createdAt: string;
}

/**
 * Insert shape: id, createdAt and the centrally-stamped graphVersion are
 * Omitted. engineVersion is RETAINED on the input (the engine stamps it on the
 * proposed update; the repository preserves it — C-G2).
 */
export type NewMasteryUpdate = Omit<
  MasteryUpdate,
  "id" | "createdAt" | "graphVersion"
>;
