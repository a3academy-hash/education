// lib/insight/roster.ts — the cross-school staff roster (Phase 7 §A.4). PURE: no
// IO, no Date.now() (nowIso explicit). One RosterRow per student: current
// recommended node, its status, last-active timestamp, and open-flags count.
// Consumes the engine READ functions (computeMasteryAll.results, recommend) and
// computeFlags — never a write method (mr-gates G1).

import { computeMasteryAll } from "../mastery-engine";
import { recommend } from "../adaptive-router";
import { computeFlags } from "./flags";
import type {
  CurriculumGraph,
  MasteryUpdate,
  RosterRow,
  StudentAttempt,
  StudentProfile,
  StudentSkillState,
} from "@/types";

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
 */
export function buildRoster(
  graph: CurriculumGraph,
  students: RosterStudentInput[],
  campusId: string | null,
  nowIso: string,
): RosterRow[] {
  const rows: RosterRow[] = [];

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
    const currentStatus =
      rec.kind === "complete"
        ? "mastered"
        : (batch.results[rec.skillId]?.status ?? "unknown");

    rows.push({
      studentId: s.profile.id,
      displayName: s.profile.displayName,
      campusId: s.profile.campusId,
      currentSkillTitle: rec.title,
      currentStatus,
      lastActiveAt,
      openFlags: flags.length,
    });
  }

  // Deterministic default order: displayName asc, then id asc (UI re-sorts).
  return rows.sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName) || a.studentId.localeCompare(b.studentId),
  );
}
