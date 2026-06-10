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

/** Per-skill mastery state. Shape matches the overlay engine exactly. */
export interface StudentSkillState {
  mastery: number;
  status: MasteryStatus;
  phase: Phase;
  attempts: number;
  correct: number;
  hints: number;
  timeMs: number;
  lastFive: boolean[];
  transfer: boolean;
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
  createdAt: string;
}

export type NewMasteryUpdate = Omit<MasteryUpdate, "id" | "createdAt">;
