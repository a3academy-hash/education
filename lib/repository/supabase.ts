// SupabaseRepository — placeholder until Supabase is wired (later phase).
// Deliberately has NO supabase dependency and imports no client.

import type {
  A3Repository,
  CurriculumGraph,
  MasteryUpdate,
  NewMasteryUpdate,
  NewStudentAttempt,
  Sport,
  StudentAttempt,
  StudentProfile,
  StudentSkillState,
} from "../../types";

export class NotWiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotWiredError";
  }
}

const notWired = (): never => {
  throw new NotWiredError(
    "SupabaseRepository is not wired yet — see docs/PLATFORM.md build-next",
  );
};

export class SupabaseRepository implements A3Repository {
  getGraph(): Promise<CurriculumGraph> {
    return notWired();
  }

  getStudent(_studentId: string): Promise<StudentProfile | null> {
    return notWired();
  }

  listStudents(): Promise<StudentProfile[]> {
    return notWired();
  }

  createStudent(_p: Omit<StudentProfile, "id" | "createdAt">): Promise<StudentProfile> {
    return notWired();
  }

  updateStudentSport(_studentId: string, _sport: Sport): Promise<void> {
    return notWired();
  }

  getSkillStates(_studentId: string): Promise<Record<string, StudentSkillState>> {
    return notWired();
  }

  setSkillState(
    _studentId: string,
    _skillId: string,
    _state: StudentSkillState,
  ): Promise<void> {
    return notWired();
  }

  appendAttempt(_a: NewStudentAttempt): Promise<StudentAttempt> {
    return notWired();
  }

  appendMasteryUpdate(_u: NewMasteryUpdate): Promise<MasteryUpdate> {
    return notWired();
  }

  listAttempts(_studentId: string, _skillId?: string): Promise<StudentAttempt[]> {
    return notWired();
  }

  listMasteryUpdates(_studentId: string, _skillId?: string): Promise<MasteryUpdate[]> {
    return notWired();
  }
}
