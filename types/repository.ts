// Repository contract — the ONLY data-access surface. Components never import
// a database client directly; implementations live in lib/repository.

import type { Sport } from "./core";
import type { CurriculumGraph } from "./curriculum";
import type {
  MasteryUpdate,
  NewMasteryUpdate,
  NewStudentAttempt,
  StudentAttempt,
  StudentProfile,
  StudentSkillState,
} from "./student";

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
  /** Append-only evidence log. No update/delete exists by design (accreditation trail). */
  appendAttempt(a: NewStudentAttempt): Promise<StudentAttempt>;
  appendMasteryUpdate(u: NewMasteryUpdate): Promise<MasteryUpdate>;
  /** Deterministic order: createdAt ascending, ties broken by id ascending. */
  listAttempts(studentId: string, skillId?: string): Promise<StudentAttempt[]>;
  listMasteryUpdates(studentId: string, skillId?: string): Promise<MasteryUpdate[]>;
}
