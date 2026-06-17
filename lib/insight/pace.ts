// lib/insight/pace — pace-vs-plan for staff/teacher reporting (§12-13). PURE: no
// IO, no Date.now() (nowIso explicit). Time-on-task is a PACE signal here, NEVER
// a mastery input (CLAUDE §14).
//
// Model: the course has a defined seat-time budget (courseBudgetMin) sized to the
// credit-bearing scope. The student's PROGRESS is the fraction of credit-bearing
// nodes mastered; their SPENT fraction is time-on-task / budget. Standing compares
// the two:
//   - ahead     : progress materially exceeds spent (faster than plan)
//   - on_track  : progress roughly tracks spent
//   - behind    : progress materially trails spent (slower than plan)
// "wastingTime" fires when a lot of seat-time has produced little mastery (high
// time / low gain) — the §12-13 explicit flag. It NEVER affects the grade.

import { creditTier } from "../transcript";
import type {
  CurriculumGraph,
  StudentAttempt,
  StudentSkillState,
} from "../../types";

const MS_PER_MIN = 60_000;

/** Tolerance band: |progress - spent| within this is "on_track". */
const ON_TRACK_BAND = 0.15;

/**
 * "wastingTime" floor: at least this much of the budget spent AND mastery this
 * far below spent. Documented, NOT a mastery weight (no Matt checkpoint).
 */
const WASTING_SPENT_FLOOR = 0.25;
const WASTING_GAP_FLOOR = 0.3;

export type PaceStanding = "ahead" | "on_track" | "behind";

export interface PaceResult {
  standing: PaceStanding;
  /** High seat-time, low mastery gain (§12-13). Never a grade input. */
  wastingTime: boolean;
  /** Fraction of credit-bearing nodes currently mastered (0-1). */
  progressFraction: number;
  /** time-on-task / budget (0-1, clamped). */
  spentFraction: number;
}

/**
 * Compute pace-vs-plan. PURE.
 *
 * @param states          per-skill states
 * @param graph           the curriculum graph (credit-bearing scope)
 * @param attempts        the student's attempts (time-on-task source)
 * @param nowIso          ISO "now" (reserved for audit parity; not in the math)
 * @param courseBudgetMin defined seat-time budget for the course, in minutes
 */
export function computePace(
  states: Record<string, StudentSkillState>,
  graph: CurriculumGraph,
  attempts: StudentAttempt[],
  nowIso: string,
  courseBudgetMin: number,
): PaceResult {
  void nowIso; // reserved for audit-header parity; never enters the math

  const creditNodes = graph.nodes.filter((n) => creditTier(n) === "algebra1-credit");
  const denom = creditNodes.length;
  const mastered = creditNodes.filter((n) => states[n.id]?.status === "mastered").length;
  const progressFraction = denom === 0 ? 0 : mastered / denom;

  const timeMs = attempts.reduce((sum, a) => sum + (a.timeMs > 0 ? a.timeMs : 0), 0);
  const budgetMs = Math.max(1, courseBudgetMin) * MS_PER_MIN;
  const spentFraction = Math.min(1, timeMs / budgetMs);

  const delta = progressFraction - spentFraction;
  let standing: PaceStanding;
  if (delta > ON_TRACK_BAND) standing = "ahead";
  else if (delta < -ON_TRACK_BAND) standing = "behind";
  else standing = "on_track";

  const wastingTime =
    spentFraction >= WASTING_SPENT_FLOOR &&
    spentFraction - progressFraction >= WASTING_GAP_FLOOR;

  return { standing, wastingTime, progressFraction, spentFraction };
}
