// Repository contract — the ONLY data-access surface. Components never import
// a database client directly; implementations live in lib/repository.

import type { Sport } from "./core";
import type { CurriculumGraph } from "./curriculum";
import type {
  MasteryUpdate,
  NewMasteryUpdate,
  NewStudentAttempt,
  StaffRole,
  StudentAttempt,
  StudentProfile,
  StudentSkillState,
} from "./student";
import type { StreamVideoAsset } from "./stream-video";

/**
 * Kinds of student education-record disclosure that generate a FERPA read-audit
 * row. Only "student_insight" (the admin per-student record view) is WIRED today;
 * "transcript" and "parent_child_record" are reserved for surfaces that must log
 * before they ship (see appendAccessLog).
 */
export type RecordAccessType =
  | "student_insight"
  | "transcript"
  | "parent_child_record"
  | "operational_erase";

/**
 * Who performed an audited action. Staff roles plus "parent" — the parent is the
 * administrator of record (§7) for their own child's record actions (export /
 * delete, Phase 7 R5). The audit row carries this string only; no PII body.
 */
export type AuditActorRole = StaffRole | "parent";

/**
 * All IDs are opaque strings — no numeric parsing, no ordering semantics
 * (DB key mapping happens inside implementations).
 */
export interface A3Repository {
  getGraph(): Promise<CurriculumGraph>;
  getStudent(studentId: string): Promise<StudentProfile | null>;
  /**
   * All known student profiles, deterministic order (createdAt asc, then id
   * asc — same convention as listAttempts). Powers the staff roster (Phase 7
   * §A.4). No campusId param yet: in-memory holds a single seeded campus and
   * the later RLS swap scopes at the row level (mr-gates G4).
   */
  listStudents(): Promise<StudentProfile[]>;
  createStudent(p: Omit<StudentProfile, "id" | "createdAt">): Promise<StudentProfile>;
  updateStudentSport(studentId: string, sport: Sport): Promise<void>;
  getSkillStates(studentId: string): Promise<Record<string, StudentSkillState>>;
  setSkillState(studentId: string, skillId: string, state: StudentSkillState): Promise<void>;
  /**
   * Idempotently ensure the parent session row exists before any evidence
   * (student_attempts / mastery_updates) references it via session_id FK.
   * NOT append-only (no immutability trigger on `sessions`) → insert-or-noop is
   * allowed. Provenance only; never enters mastery/phase/routing math.
   *   - InMemory → records the id (no FK to satisfy).
   *   - Supabase → userClient insert with on-conflict-do-nothing on the PK
   *               (own-insert RLS: sessions_insert_own).
   */
  ensureSession(input: { id: string; studentId: string; kind: string }): Promise<void>;
  /** Append-only evidence log. No update/delete exists by design (accreditation trail). */
  appendAttempt(a: NewStudentAttempt): Promise<StudentAttempt>;
  appendMasteryUpdate(u: NewMasteryUpdate): Promise<MasteryUpdate>;
  /** Deterministic order: createdAt ascending, ties broken by id ascending. */
  listAttempts(studentId: string, skillId?: string): Promise<StudentAttempt[]>;
  listMasteryUpdates(studentId: string, skillId?: string): Promise<MasteryUpdate[]>;
  /**
   * Supplementary lesson-video METADATA for a skill (Phase 11 Workstream D, D6).
   * Read-only metadata (no PII): the server then mints a SIGNED playback URL per
   * asset (lib/video/signed-url.ts). Video NEVER affects mastery, routing, or the
   * evidence trail — it is supplementary instruction.
   *   - InMemory  → returns [] (deterministic; video is a supabase-only feature).
   *   - Supabase  → reads video_assets via the RLS userClient (authenticated read,
   *                 NOT service-role). Writes are service-role-only (upload script).
   */
  listVideoAssets(skillId: string): Promise<StreamVideoAsset[]>;
  /**
   * Append an immutable FERPA read-audit row: logs HUMAN inspection of a student's
   * education record (admin record view, future parent/transcript views). NOT a query
   * log — engine/service-role/system reads are deliberately NOT audited here.
   * Supabase: INSERT via the userClient (RLS with-check actor_id = current_actor_id()).
   * InMemory: no-op (memory mode has no FERPA disclosure surface).
   */
  appendAccessLog(entry: { actorId: string; actorRole: AuditActorRole; studentId: string; recordType: RecordAccessType }): Promise<void>;
  /**
   * COPPA parent-deletion (§3 / Phase 7 R5): irreversibly anonymize the student's
   * OPERATIONAL data (raw attempt responses) while PRESERVING the append-only
   * evidence trail — NO row delete. Export-then-erase ordering is enforced by the
   * CALLER (the parent delete action), not here.
   *   - InMemory → sets each of the student's attempt `response` to "[erased]"
   *                in place (append-only preserved; counts/timestamps untouched).
   *   - Supabase → calls the erase_student_operational_data RPC (SECURITY DEFINER,
   *                asserts caller access first). Stubbed/wired behind REPOSITORY_BACKEND.
   */
  eraseOperationalData(studentId: string): Promise<void>;
}
