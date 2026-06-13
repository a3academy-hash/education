// lib/retention — spaced retention-probe SCHEDULING + SERVING only. PURE
// TypeScript: no React, no IO, no Date.now()/Math.random(). "Now" is always an
// explicit ISO parameter. mr-kahn + mr-gates gated (Phase 7 Workstream C).
//
// THE HARD CONSTRAINT (both gates, Matt re-confirmed): a retention probe is a
// NORMAL P3-neutral problem on an already-mastered node, served and scored
// through the EXISTING engine UNCHANGED. This module adds scheduling + serving
// ONLY. It NEVER calls recommend/computeMastery/advancePhase or any write
// method, NEVER imports lib/mastery-engine or lib/adaptive-router, and changes
// no mastery/phase/routing MATH. The schedule is DERIVED from the immutable
// logs (no new mutable state) — consistent with the engine's "logs are the
// source of truth" model and fully audit-reconstructable from a given nowIso.
//
// Outcome wiring is entirely the existing machinery (NO new demotion path):
//   - Correct probe → the existing lastAttemptAt path resets the decay clock;
//     the derived anchor advances and the next check lands at the next interval.
//   - Incorrect probe → the existing dip/decay → needs_review machinery; a
//     needs_review node leaves the retention pool (the review flow takes over).

import { neutralP3Bank, type ServedProblem } from "../problem-engine";
import { diagnosticCreditedSkills } from "../diagnostic-engine";
import type {
  CurriculumGraph,
  MasteryUpdate,
  RetentionConfig,
  SkillNode,
  Sport,
  StudentAttempt,
  StudentSkillState,
} from "@/types";

/**
 * Retention scheduling tuning. SCHEDULING + SERVING ONLY — these values do NOT
 * enter any scoring/mastery/phase/routing decision (the isolation guarantee
 * that keeps lib/mastery-engine + lib/adaptive-router byte-identical). Changing
 * ANY value is a Matt human checkpoint (CLAUDE.md), exactly like MASTERY_CONFIG
 * / PROBLEM_CONFIG.
 *
 * BACKLOG H1 (deferred — comment only, NOT implemented here): a student
 * returning from a long break can accrue many simultaneously-overdue nodes; a
 * future per-week overdue-surfacing cap should drip the backlog out instead of
 * presenting a perpetual overdue queue. The maxProbesPerSession:1 serving cap
 * already bounds per-session exposure; the per-week cap is a separate surfacing
 * concern and is intentionally left for a later pass.
 */
export const RETENTION_CONFIG: RetentionConfig = {
  intervalsDays: [21, 60, 120], // normal escalating cadence (days)
  creditedFirstDays: 14, //         diagnostic-credited nodes' FIRST check (days)
  maxProbesPerSession: 1, //        hard cap — one tune-up per session
};

const MS_PER_DAY = 86_400_000;

/** A neutral Phase-3 attempt (the only kind that satisfies / probes retention). */
const isNeutralP3 = (a: StudentAttempt): boolean => a.phase === 3 && a.sport === "neutral";

export interface RetentionStatus {
  due: boolean;
  /** ISO timestamp the node next becomes due; null when the node is not mastered. */
  dueAt: string | null;
  /** Index into intervalsDays the current cadence used (-1 when on the credited-first track). */
  intervalIndex: number;
  /** True while a diagnostic-credited node has had zero neutral-P3 exercise here. */
  creditedFirst: boolean;
}

/**
 * Per-node retention derivation (D1/D2/D3 — everything off the ATTEMPT log).
 *
 * - satisfactions = count of CORRECT neutral-P3 attempts on the node AFTER
 *   masteredAt (off the immutable attempt log — never sessions, which the
 *   isolation rule keeps out of routing-adjacent logic).
 * - anchor = createdAt of the latest such attempt, or masteredAt if none.
 * - creditedFirst = satisfactions === 0 AND mastery came from a diagnostic /
 *   credit-propagation trigger. First interval = creditedFirstDays (14). From
 *   satisfactions >= 1 the node REJOINS the normal cadence
 *   (intervalsDays[min(satisfactions-1, len-1)]) — credited nodes do NOT fork
 *   forever.
 * - dueAt = anchor + intervalDays.
 * - due iff status === "mastered" AND nowIso >= dueAt AND NOT needs_review AND
 *   not freshly mastered inside its first interval.
 */
export function retentionStatus(
  node: SkillNode,
  state: StudentSkillState | undefined,
  updates: MasteryUpdate[],
  attempts: StudentAttempt[],
  nowIso: string,
  cfg: RetentionConfig = RETENTION_CONFIG,
): RetentionStatus {
  const notDue: RetentionStatus = {
    due: false,
    dueAt: null,
    intervalIndex: -1,
    creditedFirst: false,
  };
  if (!state || state.status !== "mastered" || state.masteredAt === null) return notDue;

  const masteredAtMs = Date.parse(state.masteredAt);
  const satisfyingAttempts = attempts
    .filter(
      (a) =>
        a.skillId === node.id &&
        a.correct &&
        isNeutralP3(a) &&
        Date.parse(a.createdAt) > masteredAtMs,
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const satisfactions = satisfyingAttempts.length;
  const anchor =
    satisfactions > 0 ? satisfyingAttempts[satisfactions - 1].createdAt : state.masteredAt;

  const credited =
    satisfactions === 0 && diagnosticCreditedSkills(updates).includes(node.id);

  let intervalDays: number;
  let intervalIndex: number;
  if (credited) {
    intervalDays = cfg.creditedFirstDays;
    intervalIndex = -1;
  } else {
    intervalIndex = satisfactions === 0 ? 0 : Math.min(satisfactions - 1, cfg.intervalsDays.length - 1);
    intervalDays = cfg.intervalsDays[intervalIndex];
  }

  const dueAtMs = Date.parse(anchor) + intervalDays * MS_PER_DAY;
  const dueAt = new Date(dueAtMs).toISOString();
  const nowMs = Date.parse(nowIso);

  // D3 hard preconditions: mastered (above) AND now past dueAt AND not
  // freshly mastered inside the first interval. The "fresh" guard is implied by
  // nowMs >= dueAtMs when satisfactions === 0 (anchor === masteredAt), but it is
  // stated explicitly so the precondition is self-evident.
  const firstIntervalEndMs = masteredAtMs + intervalDays * MS_PER_DAY;
  const freshlyMastered = nowMs < firstIntervalEndMs;
  const due = nowMs >= dueAtMs && !freshlyMastered;

  return { due, dueAt, intervalIndex, creditedFirst: credited };
}

/**
 * Select ONE retention probe across all mastered nodes, or null when none is
 * due (or no due node has an unseen neutral-P3 item). PURE + nowIso-threaded;
 * NEVER calls recommend/computeMastery/any write method.
 *
 * Across mastered nodes: keep the due ones; priority order is credited-first,
 * then most-overdue (nowIso − dueAt desc), tie-break by skillId. For the
 * winner, pick ONE never-seen neutral-P3 item (neutralP3Bank filtered by
 * !seenProblemIds, in the bank's committed easy→hard order); if the node has no
 * unseen item, fall to the next due node. The returned ServedProblem is always
 * a member of selectProblems(node, phase-3 state, sport), isProbe:false.
 */
export function selectRetentionProbe(
  graph: CurriculumGraph,
  states: Record<string, StudentSkillState>,
  updates: MasteryUpdate[],
  attempts: StudentAttempt[],
  sport: Sport,
  nowIso: string,
  cfg: RetentionConfig = RETENTION_CONFIG,
): ServedProblem | null {
  void sport; // phase-3 banks are ALWAYS neutral; sport is accepted for a stable
  //            signature parallel to selectProblems and never selects a bank.
  const nowMs = Date.parse(nowIso);

  interface DueNode {
    node: SkillNode;
    creditedFirst: boolean;
    overdueMs: number;
  }
  const dueNodes: DueNode[] = [];
  for (const node of graph.nodes) {
    const status = retentionStatus(node, states[node.id], updates, attempts, nowIso, cfg);
    if (!status.due || status.dueAt === null) continue;
    dueNodes.push({
      node,
      creditedFirst: status.creditedFirst,
      overdueMs: nowMs - Date.parse(status.dueAt),
    });
  }

  // Priority: credited-first, then most-overdue, then skillId (deterministic).
  dueNodes.sort(
    (a, b) =>
      Number(b.creditedFirst) - Number(a.creditedFirst) ||
      b.overdueMs - a.overdueMs ||
      a.node.id.localeCompare(b.node.id),
  );

  const seenProblemIds = new Set(attempts.map((a) => a.problemId));
  for (const { node } of dueNodes) {
    const unseen = neutralP3Bank(node).find((p) => !seenProblemIds.has(p.id));
    if (unseen) return { problem: unseen, isProbe: false };
    // No unseen neutral item on this node — fall to the next due node.
  }
  return null;
}
