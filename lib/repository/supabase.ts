// SupabaseRepository — the live A3Repository backend (REPOSITORY_BACKEND=supabase).
//
// In-memory is THE CONTRACT (lib/repository/in-memory.ts): this class produces
// IDENTICAL row shapes and the SAME deterministic list order (createdAt asc, ties
// by id asc). Constructed PER REQUEST with both clients — never cached on
// globalThis (the userClient is bound to per-request cookies).
//
// CLIENT SPLIT (C-R1):
//   - userClient  (RLS-enforced): getStudent, listStudents (staff session),
//                  getSkillStates read, listAttempts, listMasteryUpdates,
//                  appendAttempt, appendMasteryUpdate (own-insert).
//   - serviceClient (RLS-bypass): setSkillState ONLY (no app write policy on
//                  student_skill_state). Reserved also for future grade /
//                  curriculum / video writes. Smallest possible surface.
//   - getGraph(): BACKEND-NEUTRAL bundled JSON (C-R2) — never service-role,
//                 works PRE-auth, identical to the in-memory load path.
//
// APPEND-ONLY (C-A1): appendAttempt / appendMasteryUpdate are INSERT only —
// NEVER upsert. There is NO .update()/.delete() against ANY evidence table in
// this file. setSkillState is the SOLE upsert (keyed (student_id, skill_id)).
//
// CENTRAL STAMPING (C-G1/C-G2): appendAttempt/appendMasteryUpdate stamp
// graph_version from getLoadedGraphVersion() and engine_version from
// ENGINE_VERSION (attempts) / the engine-supplied value (mastery_updates). No
// insert path can omit a stamp (the columns are NOT NULL → fail-closed).

import type { SupabaseClient } from "@supabase/supabase-js";

import graphJson from "../../data/algebra1-graph.json";
import { getLoadedGraphVersion } from "../curriculum";
import { ENGINE_VERSION } from "../mastery-engine";
import { validateGraph } from "../validation";
import type {
  A3Repository,
  CurriculumGraph,
  MasteryStatus,
  MasteryUpdate,
  NewMasteryUpdate,
  NewStudentAttempt,
  Phase,
  RecentAttempt,
  Sport,
  StudentAttempt,
  StudentProfile,
  StudentSkillState,
} from "../../types";

export interface SupabaseRepositoryClients {
  /** RLS-enforced, request-scoped (cookies). Reads + own-insert evidence writes. */
  userClient: SupabaseClient;
  /** RLS-bypass, server-only. setSkillState (+ future engine-only writes) ONLY. */
  serviceClient: SupabaseClient;
}

// ── snake_case row shapes (the columns of migrations 0001/0002) ──────────────

interface StudentProfileRow {
  id: string;
  display_name: string;
  grade_level: number | null;
  sport: string | null;
  campus_id: string | null;
  parental_consent_status: "pending" | "granted" | "revoked";
  parental_consent_updated_at: string | null;
  created_at: string;
}

interface SkillStateRow {
  student_id: string;
  skill_id: string;
  mastery: number;
  status: MasteryStatus;
  phase: number;
  attempts: number;
  correct: number;
  hints: number;
  time_ms: number;
  recent: RecentAttempt[];
  transfer: boolean;
  last_attempt_at: string | null;
  mastered_at: string | null;
}

interface AttemptRow {
  id: string;
  student_id: string;
  skill_id: string;
  problem_id: string;
  phase: number;
  sport: string;
  response: string;
  correct: boolean;
  hints_used: number;
  time_ms: number;
  misconception_tags: string[];
  is_probe: boolean;
  source: "practice" | "diagnostic" | "retention";
  session_id: string;
  graph_version: string;
  engine_version: string;
  created_at: string;
}

interface MasteryUpdateRow {
  id: string;
  student_id: string;
  skill_id: string;
  attempt_id: string | null;
  trigger: "attempt" | "diagnostic" | "decay" | "credit-propagation";
  prev_mastery: number;
  new_mastery: number;
  prev_status: MasteryStatus;
  new_status: MasteryStatus;
  prev_phase: number;
  new_phase: number;
  reason: string;
  engine_version: string;
  session_id: string;
  graph_version: string;
  created_at: string;
}

// ── row ↔ type mappers (camelCase types are the app surface) ──────────────────

const toProfile = (r: StudentProfileRow): StudentProfile => ({
  id: r.id,
  displayName: r.display_name,
  gradeLevel: r.grade_level ?? 0,
  sport: (r.sport ?? "neutral") as Sport,
  campusId: r.campus_id,
  parentalConsent: {
    status: r.parental_consent_status,
    updatedAt: r.parental_consent_updated_at,
  },
  createdAt: r.created_at,
});

const toSkillState = (r: SkillStateRow): StudentSkillState => ({
  mastery: r.mastery,
  status: r.status,
  phase: r.phase as Phase,
  attempts: r.attempts,
  correct: r.correct,
  hints: r.hints,
  timeMs: r.time_ms,
  recent: r.recent.map((x) => ({ ...x })),
  transfer: r.transfer,
  lastAttemptAt: r.last_attempt_at,
  masteredAt: r.mastered_at,
});

const toAttempt = (r: AttemptRow): StudentAttempt => ({
  id: r.id,
  studentId: r.student_id,
  skillId: r.skill_id,
  problemId: r.problem_id,
  phase: r.phase as Phase,
  sport: r.sport as Sport,
  response: r.response,
  correct: r.correct,
  hintsUsed: r.hints_used,
  timeMs: r.time_ms,
  misconceptionTags: [...r.misconception_tags],
  isProbe: r.is_probe,
  source: r.source,
  sessionId: r.session_id,
  graphVersion: r.graph_version,
  engineVersion: r.engine_version,
  createdAt: r.created_at,
});

const toUpdate = (r: MasteryUpdateRow): MasteryUpdate => ({
  id: r.id,
  studentId: r.student_id,
  skillId: r.skill_id,
  attemptId: r.attempt_id,
  trigger: r.trigger,
  prevMastery: r.prev_mastery,
  newMastery: r.new_mastery,
  prevStatus: r.prev_status,
  newStatus: r.new_status,
  prevPhase: r.prev_phase as Phase,
  newPhase: r.new_phase as Phase,
  reason: r.reason,
  engineVersion: r.engine_version,
  sessionId: r.session_id,
  graphVersion: r.graph_version,
  createdAt: r.created_at,
});

// Deterministic order matching in-memory: createdAt asc, ties by id asc. Applied
// in the app (not relying solely on SQL) so behavior is identical across backends.
const byCreatedAtThenId = (
  a: { createdAt: string; id: string },
  b: { createdAt: string; id: string },
): number => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

const fail = (op: string, error: { message: string } | null): never => {
  throw new Error(`SupabaseRepository.${op} failed: ${error?.message ?? "unknown error"}`);
};

export class SupabaseRepository implements A3Repository {
  private readonly userClient: SupabaseClient;
  private readonly serviceClient: SupabaseClient;
  // C-G4: the loaded graph (+ its version) is read ONCE per request and reused.
  private graph: CurriculumGraph | null = null;

  constructor(clients: SupabaseRepositoryClients) {
    this.userClient = clients.userClient;
    this.serviceClient = clients.serviceClient;
  }

  // BACKEND-NEUTRAL bundled graph (C-R2): identical load + validation path to
  // in-memory. NEVER reads curriculum_graphs / service-role; works pre-auth.
  async getGraph(): Promise<CurriculumGraph> {
    if (!this.graph) {
      const report = validateGraph(graphJson as unknown);
      if (!report.valid) {
        const errors = report.issues
          .filter((i) => i.severity === "error")
          .map((i) => `[${i.code}] ${i.message}`);
        throw new Error(
          `Curriculum graph failed validation (${errors.length} error${errors.length === 1 ? "" : "s"}):\n${errors.join("\n")}`,
        );
      }
      this.graph = graphJson as unknown as CurriculumGraph;
    }
    return this.graph;
  }

  async getStudent(studentId: string): Promise<StudentProfile | null> {
    const { data, error } = await this.userClient
      .from("student_profiles")
      .select("*")
      .eq("id", studentId)
      .maybeSingle();
    if (error) fail("getStudent", error);
    return data ? toProfile(data as StudentProfileRow) : null;
  }

  // Staff roster path: userClient under a staff session (RLS staff-by-campus
  // returns the campus roster). NOT service-role — RLS stays the lock (C-R1).
  async listStudents(): Promise<StudentProfile[]> {
    const { data, error } = await this.userClient.from("student_profiles").select("*");
    if (error) fail("listStudents", error);
    return ((data ?? []) as StudentProfileRow[]).map(toProfile).sort(byCreatedAtThenId);
  }

  async createStudent(p: Omit<StudentProfile, "id" | "createdAt">): Promise<StudentProfile> {
    // Provisioning write. Service-role: student creation is an administrative
    // action (no own-insert policy on student_profiles); C2 wires the actual
    // parent-provisioning flow that calls this. Insert (not upsert) — a new row.
    const { data, error } = await this.serviceClient
      .from("student_profiles")
      .insert({
        display_name: p.displayName,
        grade_level: p.gradeLevel,
        sport: p.sport,
        campus_id: p.campusId,
        parental_consent_status: p.parentalConsent.status,
        parental_consent_updated_at: p.parentalConsent.updatedAt,
      })
      .select("*")
      .single();
    if (error || !data) fail("createStudent", error);
    return toProfile(data as StudentProfileRow);
  }

  async updateStudentSport(studentId: string, sport: Sport): Promise<void> {
    // student_profiles is NOT an evidence table; sport is mutable profile data.
    // Service-role (no own-update policy). NOT an evidence-table mutation.
    const { error } = await this.serviceClient
      .from("student_profiles")
      .update({ sport })
      .eq("id", studentId);
    if (error) fail("updateStudentSport", error);
  }

  async getSkillStates(studentId: string): Promise<Record<string, StudentSkillState>> {
    const { data, error } = await this.userClient
      .from("student_skill_state")
      .select("*")
      .eq("student_id", studentId);
    if (error) fail("getSkillStates", error);
    const out: Record<string, StudentSkillState> = {};
    for (const row of (data ?? []) as SkillStateRow[]) {
      out[row.skill_id] = toSkillState(row);
    }
    return out;
  }

  // The SOLE mutable write and the ONLY place upsert is allowed (C-A1), keyed
  // (student_id, skill_id). Service-role: student_skill_state has no app write
  // policy (the engine owns it).
  async setSkillState(
    studentId: string,
    skillId: string,
    state: StudentSkillState,
  ): Promise<void> {
    const { error } = await this.serviceClient.from("student_skill_state").upsert(
      {
        student_id: studentId,
        skill_id: skillId,
        mastery: state.mastery,
        status: state.status,
        phase: state.phase,
        attempts: state.attempts,
        correct: state.correct,
        hints: state.hints,
        time_ms: state.timeMs,
        recent: state.recent,
        transfer: state.transfer,
        last_attempt_at: state.lastAttemptAt,
        mastered_at: state.masteredAt,
      },
      { onConflict: "student_id,skill_id" },
    );
    if (error) fail("setSkillState", error);
  }

  // APPEND-ONLY (C-A1): INSERT, never upsert/update/delete. Central stamping
  // (C-G1/C-G2): graph_version + engine_version filled HERE, never by the caller.
  async appendAttempt(a: NewStudentAttempt): Promise<StudentAttempt> {
    const { data, error } = await this.userClient
      .from("student_attempts")
      .insert({
        student_id: a.studentId,
        skill_id: a.skillId,
        problem_id: a.problemId,
        phase: a.phase,
        sport: a.sport,
        response: a.response,
        correct: a.correct,
        hints_used: a.hintsUsed,
        time_ms: a.timeMs,
        misconception_tags: a.misconceptionTags,
        is_probe: a.isProbe,
        source: a.source,
        session_id: a.sessionId,
        graph_version: getLoadedGraphVersion(),
        engine_version: ENGINE_VERSION,
      })
      .select("*")
      .single();
    if (error || !data) fail("appendAttempt", error);
    return toAttempt(data as AttemptRow);
  }

  // APPEND-ONLY (C-A1): INSERT, never upsert/update/delete. graph_version is
  // stamped HERE; engine_version is RETAINED from the engine-supplied input.
  async appendMasteryUpdate(u: NewMasteryUpdate): Promise<MasteryUpdate> {
    const { data, error } = await this.userClient
      .from("mastery_updates")
      .insert({
        student_id: u.studentId,
        skill_id: u.skillId,
        attempt_id: u.attemptId,
        trigger: u.trigger,
        prev_mastery: u.prevMastery,
        new_mastery: u.newMastery,
        prev_status: u.prevStatus,
        new_status: u.newStatus,
        prev_phase: u.prevPhase,
        new_phase: u.newPhase,
        reason: u.reason,
        engine_version: u.engineVersion,
        session_id: u.sessionId,
        graph_version: getLoadedGraphVersion(),
      })
      .select("*")
      .single();
    if (error || !data) fail("appendMasteryUpdate", error);
    return toUpdate(data as MasteryUpdateRow);
  }

  async listAttempts(studentId: string, skillId?: string): Promise<StudentAttempt[]> {
    let q = this.userClient.from("student_attempts").select("*").eq("student_id", studentId);
    if (skillId !== undefined) q = q.eq("skill_id", skillId);
    const { data, error } = await q;
    if (error) fail("listAttempts", error);
    return ((data ?? []) as AttemptRow[]).map(toAttempt).sort(byCreatedAtThenId);
  }

  async listMasteryUpdates(studentId: string, skillId?: string): Promise<MasteryUpdate[]> {
    let q = this.userClient.from("mastery_updates").select("*").eq("student_id", studentId);
    if (skillId !== undefined) q = q.eq("skill_id", skillId);
    const { data, error } = await q;
    if (error) fail("listMasteryUpdates", error);
    return ((data ?? []) as MasteryUpdateRow[]).map(toUpdate).sort(byCreatedAtThenId);
  }
}
