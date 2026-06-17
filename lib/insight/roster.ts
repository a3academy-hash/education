// lib/insight/roster.ts — the cross-school staff roster (Phase 7 §A.4). PURE: no
// IO, no Date.now() (nowIso explicit). One RosterRow per student: current
// recommended node, its status, last-active timestamp, and open-flags count.
// Consumes the engine READ functions (computeMasteryAll.results, recommend) and
// computeFlags — never a write method (mr-gates G1).

import { computeMasteryAll } from "../mastery-engine";
import { recommend } from "../adaptive-router";
import { computeFlags } from "./flags";
import { interventionBand, nextAction } from "./intervention";
import { computePace } from "./pace";
import type {
  CurriculumGraph,
  MasteryUpdate,
  RosterRow,
  StaffRole,
  StudentAttempt,
  StudentProfile,
  StudentSkillState,
} from "@/types";

/**
 * Defined course seat-time budget (minutes) for pace-vs-plan (§12-13). A
 * documented working default sized to the Algebra 1 credit scope — NOT a mastery
 * weight (no Matt checkpoint). Wired here so every roster row uses one constant.
 */
export const COURSE_BUDGET_MIN = 6_000;

/** One student's already-fetched evidence + states, keyed for the roster build. */
export interface RosterStudentInput {
  profile: StudentProfile;
  states: Record<string, StudentSkillState>;
  attempts: StudentAttempt[];
  updates: MasteryUpdate[];
}

/**
 * Build the roster from already-fetched per-student data. The caller (a server
 * component) does the repository reads; this stays a pure projection.
 *
 * @param campusId staff campus scope (mr-gates G3). In the in-memory era the
 *   single seeded campus passes through; the later RLS swap filters rows. We
 *   filter defensively here too: a non-null campusId only returns matching
 *   students (null = unscoped/global staff sees all).
 * @param role REQUIRED staff role (Phase 7 R4). For "coach", the exact engine
 *   status and the raw current-focus title are REDACTED (severity bands + flags
 *   only, §11) — admin/teacher roles see the full row. Passing the role is
 *   mandatory so coach-banding can never be omitted at a call site.
 */
export function buildRoster(
  graph: CurriculumGraph,
  students: RosterStudentInput[],
  campusId: string | null,
  role: StaffRole,
  nowIso: string,
): RosterRow[] {
  const rows: RosterRow[] = [];
  const isCoach = role === "coach";

  for (const s of students) {
    if (campusId !== null && s.profile.campusId !== campusId) continue;

    const batch = computeMasteryAll(s.profile.id, s.states, graph, nowIso);
    const rec = recommend(batch.results, s.states, graph);
    const flags = computeFlags(
      graph,
      s.attempts,
      s.updates,
      s.states,
      batch.results,
      campusId,
      nowIso,
    );

    const lastActiveAt =
      s.attempts.length === 0
        ? null
        : s.attempts.reduce(
            (max, a) => (a.createdAt.localeCompare(max) > 0 ? a.createdAt : max),
            s.attempts[0].createdAt,
          );

    // When the course is complete, recommend() returns an empty skillId; the
    // student's standing is "mastered". Otherwise use the recommended skill's
    // computed status.
    const exactStatus =
      rec.kind === "complete"
        ? "mastered"
        : (batch.results[rec.skillId]?.status ?? "unknown");

    const pace = computePace(s.states, graph, s.attempts, nowIso, COURSE_BUDGET_MIN);

    rows.push({
      studentId: s.profile.id,
      displayName: s.profile.displayName,
      campusId: s.profile.campusId,
      // R4: coach sees NO raw current-focus title and NO exact status.
      currentSkillTitle: isCoach ? "" : rec.title,
      currentStatus: isCoach ? null : exactStatus,
      lastActiveAt,
      openFlags: flags.length,
      band: interventionBand(flags),
      nextAction: nextAction(flags),
      pace: pace.standing,
      wastingTime: pace.wastingTime,
    });
  }

  // Deterministic default order: displayName asc, then id asc (UI re-sorts).
  return rows.sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName) || a.studentId.localeCompare(b.studentId),
  );
}
