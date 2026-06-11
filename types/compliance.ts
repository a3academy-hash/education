// Compliance-spine stubs (Phase 5 §B). ADDITIVE shapes only — types + the
// matching migration tables (supabase/migrations/0001_compliance_spine.sql).
// NO business logic, NO wiring, NO new A3Repository methods in Phase 5. These
// exist so the NCAA/COPPA/FERPA surfaces have a contract to render against and
// the migration has a 1:1 column source. No `any` anywhere.
//
// ID convention (matches the rest of /types): every `id` / `*Id` is an opaque
// string. In Postgres each maps to a uuid PK (app-supplied gen_random_uuid),
// so there is no boundary translation — see the migration header.

import type { MasteryStatus } from "./core";

/**
 * NCAA defined-course-timeframe pillar. One row per student enrollment in a
 * course; the transcript header references the enrollment's course + window.
 * Append/transition-logged like the rest of the spine (status moves are facts).
 */
export interface CourseEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  startedAt: string;
  /** Defined end of the course window (NCAA). Null until scheduled. */
  expectedEndAt: string | null;
  completedAt: string | null;
  status: "active" | "completed" | "withdrawn" | "expired";
  /** The teacher of record (NCAA regular-interaction). Null until assigned. */
  instructorId: string | null;
}

/**
 * NCAA regular-interaction surface — a per-student instructor thread. The
 * messages carry it; the thread is the grouping anchor.
 */
export interface MessageThread {
  id: string;
  studentId: string;
  instructorId: string | null;
  createdAt: string;
}

/**
 * One message in a thread. `skillId` + `attemptId` tie the interaction to the
 * concrete student work it is about (NCAA "teacher access to student work" +
 * meaningful interaction). APPEND-ONLY / edit-logged — same insert-only posture
 * as the evidence trail; an edit is a new row, never a mutation.
 */
export interface Message {
  id: string;
  threadId: string;
  studentId: string;
  authorRole: "instructor" | "student";
  authorId: string | null;
  body: string;
  /** Optional link to the skill the interaction concerns. */
  skillId: string | null;
  /** Optional link to the specific attempt the interaction concerns. */
  attemptId: string | null;
  createdAt: string;
}

/**
 * COPPA parental-consent audit. APPEND-ONLY — every status transition is a new
 * row, so the consent history is reconstructable and tamper-evident.
 * `method` specifics (verifiable-consent mechanism) NEED COUNSEL verification
 * before this is wired; the shape is deliberately permissive (string|null).
 */
export interface ConsentEvent {
  id: string;
  studentId: string;
  status: "pending" | "granted" | "revoked";
  /** e.g. "credit-card", "signed-form", "school-as-agent" — NEEDS COUNSEL. */
  method: string | null;
  consentedByName: string | null;
  /** Relationship of the consenting adult to the student (e.g. "parent"). */
  relationship: string | null;
  createdAt: string;
}

/**
 * FERPA read-audit stub — who read which student record, when. SHAPE ONLY in
 * Phase 5 (not built/wired). APPEND-ONLY when it is.
 */
export interface RecordAccessLog {
  id: string;
  actorId: string | null;
  actorRole: string;
  studentId: string;
  recordType: string;
  accessedAt: string;
}

// ---- Transcript projection (computed by lib/transcript; never stored) -------

/** Which credit lane a standard contributes to (DERIVED — see lib/transcript). */
export type CreditTier = "algebra1-credit" | "prerequisite-review";

/**
 * One CCSS standard rolled up across every graph node that carries it.
 * `status` is the WEAKEST-LINK (conjunctive) roll-up — never a numeric average,
 * never any-node-mastered. `masteredCount`/`totalCount` show "N of M component
 * skills mastered". `evidenceUpdateIds` are the MasteryUpdate ids that earned
 * mastery on the contributing nodes — provenance back into the immutable log.
 */
export interface StandardTranscriptRow {
  ccss: string;
  creditTier: CreditTier;
  status: MasteryStatus;
  componentSkillIds: string[];
  masteredCount: number;
  totalCount: number;
  evidenceUpdateIds: string[];
}

/**
 * The full per-student standards transcript. A REGENERABLE VIEW — built from
 * the graph + skill states + the MasteryUpdate log; never persisted, so it
 * cannot drift from the evidence trail. Header pins the graph schema version
 * and generation time for audit reproducibility.
 */
export interface StudentStandardTranscript {
  studentId: string;
  courseId: string;
  graphSchemaVersion: string;
  generatedAt: string;
  /** algebra1-credit standards — the ONLY source of credit/NCAA claims. */
  creditBearing: StandardTranscriptRow[];
  /** middle-school prerequisite standards (support, not credit). */
  prerequisiteReview: StandardTranscriptRow[];
}
