// In-memory A3Repository — the only data store until Supabase is wired.
// Attempts and mastery updates are APPEND-ONLY by design (accreditation
// evidence trail): no update or delete path exists on this class.

import graphJson from "../../data/algebra1-graph.json";
import { validateGraph } from "../validation";
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

export interface InMemorySeed {
  /** Override the bundled curriculum graph (tests only). */
  graph?: unknown;
  students?: StudentProfile[];
  /** studentId → skillId → state */
  skillStates?: Record<string, Record<string, StudentSkillState>>;
  attempts?: StudentAttempt[];
  masteryUpdates?: MasteryUpdate[];
}

const byCreatedAtThenId = (
  a: { createdAt: string; id: string },
  b: { createdAt: string; id: string },
): number => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

const copyAttempt = (a: StudentAttempt): StudentAttempt => ({
  ...a,
  misconceptionTags: [...a.misconceptionTags],
});

const copyUpdate = (u: MasteryUpdate): MasteryUpdate => ({ ...u });

const copyState = (s: StudentSkillState): StudentSkillState => ({
  ...s,
  recent: s.recent.map((r) => ({ ...r })),
});

const copyProfile = (p: StudentProfile): StudentProfile => ({
  ...p,
  parentalConsent: { ...p.parentalConsent },
});

// The validated graph is cached and returned BY REFERENCE; deep-freeze it once
// so callers cannot mutate the curriculum source of truth.
const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
};

export class InMemoryRepository implements A3Repository {
  private readonly rawGraph: unknown;
  private graph: CurriculumGraph | null = null;
  private readonly students = new Map<string, StudentProfile>();
  private readonly skillStates = new Map<string, Map<string, StudentSkillState>>();
  private readonly attempts: StudentAttempt[] = [];
  private readonly masteryUpdates: MasteryUpdate[] = [];

  constructor(seed?: InMemorySeed) {
    this.rawGraph = seed?.graph ?? (graphJson as unknown);
    for (const s of seed?.students ?? []) this.students.set(s.id, copyProfile(s));
    for (const [studentId, states] of Object.entries(seed?.skillStates ?? {})) {
      const map = new Map<string, StudentSkillState>();
      for (const [skillId, state] of Object.entries(states)) map.set(skillId, copyState(state));
      this.skillStates.set(studentId, map);
    }
    for (const a of seed?.attempts ?? []) this.attempts.push(copyAttempt(a));
    for (const u of seed?.masteryUpdates ?? []) this.masteryUpdates.push(copyUpdate(u));
  }

  async getGraph(): Promise<CurriculumGraph> {
    if (!this.graph) {
      const report = validateGraph(this.rawGraph);
      if (!report.valid) {
        const errors = report.issues
          .filter((i) => i.severity === "error")
          .map((i) => `[${i.code}] ${i.message}`);
        throw new Error(
          `Curriculum graph failed validation (${errors.length} error${errors.length === 1 ? "" : "s"}):\n${errors.join("\n")}`,
        );
      }
      this.graph = deepFreeze(this.rawGraph as CurriculumGraph);
    }
    return this.graph;
  }

  async getStudent(studentId: string): Promise<StudentProfile | null> {
    const found = this.students.get(studentId);
    return found ? copyProfile(found) : null;
  }

  async createStudent(p: Omit<StudentProfile, "id" | "createdAt">): Promise<StudentProfile> {
    const student: StudentProfile = {
      ...copyProfile({ ...p, id: "", createdAt: "" }),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.students.set(student.id, student);
    return copyProfile(student);
  }

  async updateStudentSport(studentId: string, sport: Sport): Promise<void> {
    const student = this.students.get(studentId);
    if (!student) throw new Error(`Student not found: ${studentId}`);
    this.students.set(studentId, { ...student, sport });
  }

  async getSkillStates(studentId: string): Promise<Record<string, StudentSkillState>> {
    const out: Record<string, StudentSkillState> = {};
    for (const [skillId, state] of this.skillStates.get(studentId) ?? []) {
      out[skillId] = copyState(state);
    }
    return out;
  }

  async setSkillState(
    studentId: string,
    skillId: string,
    state: StudentSkillState,
  ): Promise<void> {
    const map = this.skillStates.get(studentId) ?? new Map<string, StudentSkillState>();
    map.set(skillId, copyState(state));
    this.skillStates.set(studentId, map);
  }

  async appendAttempt(a: NewStudentAttempt): Promise<StudentAttempt> {
    const attempt: StudentAttempt = {
      ...a,
      misconceptionTags: [...a.misconceptionTags],
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.attempts.push(attempt);
    return copyAttempt(attempt);
  }

  async appendMasteryUpdate(u: NewMasteryUpdate): Promise<MasteryUpdate> {
    const update: MasteryUpdate = {
      ...u,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.masteryUpdates.push(update);
    return copyUpdate(update);
  }

  async listAttempts(studentId: string, skillId?: string): Promise<StudentAttempt[]> {
    return this.attempts
      .filter((a) => a.studentId === studentId && (skillId === undefined || a.skillId === skillId))
      .map(copyAttempt)
      .sort(byCreatedAtThenId);
  }

  async listMasteryUpdates(studentId: string, skillId?: string): Promise<MasteryUpdate[]> {
    return this.masteryUpdates
      .filter((u) => u.studentId === studentId && (skillId === undefined || u.skillId === skillId))
      .map(copyUpdate)
      .sort(byCreatedAtThenId);
  }
}
