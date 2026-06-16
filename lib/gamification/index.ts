// lib/gamification — PURE incentive-layer derivations (Alpha-style; NO currency,
// NO confetti). Mirrors the engine's purity discipline: no IO, no Date.now()/
// new Date(); "now" is an explicit ISO param. Read-only over committed state +
// the attempt log — never writes, never touches mastery math.
//
// SCOPE NOTE (mr-kahn / Matt): this layer evolves the product's prior
// "no gamification" standard into a COMPETENCE-anchored incentive layer —
//   • XP = minutes of productive (active) learning   (Alpha: 1 XP ≈ 1 minute)
//   • progress rings toward the mastery bar           (competence feedback)
//   • "time given back" vs a traditional-pace baseline (Alpha's TimeBack metric)
// There is intentionally NO points-for-streaks, NO leaderboard, NO currency.
//
// ASSUMPTION (mr-kahn to bless): `baselineMinutesPerMasteredSkill` is the
// traditional-classroom time to reach mastery on one skill. "Time given back" =
// (mastered skills × baseline) − productive minutes actually spent, floored at 0.
// It is a motivational estimate, not an accredited measurement — labelled as
// such in the UI.

import { MASTERY_CONFIG } from "../mastery-engine";
import type { CurriculumGraph, StudentAttempt, StudentSkillState } from "@/types";

export const GAMIFICATION_CONFIG = {
  /** 1 XP == 1 minute of productive learning (Alpha convention). */
  msPerXp: 60_000,
  /** Daily productive-minutes goal (Alpha targets ~120 = two focused hours). */
  dailyXpGoal: 120,
  /** Ring fill bar — SINGLE-SOURCED from the engine so it can never diverge. */
  masteryBar: MASTERY_CONFIG.thresholds.mastered,
  /** Traditional-pace minutes per mastered skill (mr-kahn assumption). */
  baselineMinutesPerMasteredSkill: 180,
} as const;

export type GamificationConfig = typeof GAMIFICATION_CONFIG;

export interface MomentumSummary {
  /** Lifetime productive minutes (Σ per-skill timeMs ÷ 60 000). */
  productiveMinutes: number;
  /** Productive minutes logged today (UTC calendar day of nowIso). */
  todayMinutes: number;
  /** XP == productive minutes. Kept as a distinct field for UI clarity. */
  xp: number;
  todayXp: number;
  dailyGoalXp: number;
  /** todayXp / dailyGoalXp, clamped 0..1 (ring/bar fill). */
  dailyGoalFraction: number;
  masteredCount: number;
  totalSkills: number;
  /** masteredCount / totalSkills, 0..1 (course-completion ring). */
  courseFraction: number;
  /** Mean mastery score across assessed skills, 0..1. */
  avgMastery: number;
  /** max(0, mastered × baseline − productiveMinutes), minutes. */
  timeGivenBackMinutes: number;
}

const clamp01 = (x: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));

/** Humanize whole minutes → "Xh Ym" / "Y min" (mirrors the digest's humanizeMs). */
export function humanizeMinutes(min: number): string {
  const m = Math.max(0, Math.round(Number.isFinite(min) ? min : 0));
  if (m <= 0) return "0 min";
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

/** Fraction of the mastery bar a raw score has reached, 0..1 (ring fill). */
export function masteryRingFraction(
  score: number,
  bar: number = GAMIFICATION_CONFIG.masteryBar,
): number {
  if (bar <= 0) return 0;
  return clamp01(score / bar);
}

/**
 * Derive the student's momentum summary from committed skill states + the
 * attempt log. PURE — pass nowIso for the "today" window. Never mutates inputs.
 */
export function computeMomentum(
  states: Record<string, StudentSkillState>,
  graph: CurriculumGraph,
  attempts: StudentAttempt[],
  nowIso: string,
  cfg: GamificationConfig = GAMIFICATION_CONFIG,
): MomentumSummary {
  const stateList = Object.values(states);

  const productiveMs = stateList.reduce((s, st) => s + (st.timeMs || 0), 0);
  const productiveMinutes = Math.round(productiveMs / cfg.msPerXp);

  // "Today" = UTC calendar day of nowIso (Date.parse is allowed; Date.now() is not).
  const dayStartMs = Date.parse(`${nowIso.slice(0, 10)}T00:00:00.000Z`);
  const todayMs = attempts.reduce((s, a) => {
    const t = Date.parse(a.createdAt);
    return Number.isFinite(t) && t >= dayStartMs ? s + (a.timeMs || 0) : s;
  }, 0);
  const todayMinutes = Math.round(todayMs / cfg.msPerXp);

  const masteredCount = stateList.filter((st) => st.masteredAt !== null).length;
  const totalSkills = graph.nodes.length;

  const assessed = stateList.filter((st) => st.attempts > 0 || st.masteredAt !== null);
  const avgMastery =
    assessed.length === 0
      ? 0
      : assessed.reduce((s, st) => s + (st.mastery || 0), 0) / assessed.length;

  const timeGivenBackMinutes = Math.max(
    0,
    masteredCount * cfg.baselineMinutesPerMasteredSkill - productiveMinutes,
  );

  const dailyGoalFraction = cfg.dailyXpGoal > 0 ? clamp01(todayMinutes / cfg.dailyXpGoal) : 0;

  return {
    productiveMinutes,
    todayMinutes,
    xp: productiveMinutes,
    todayXp: todayMinutes,
    dailyGoalXp: cfg.dailyXpGoal,
    dailyGoalFraction,
    masteredCount,
    totalSkills,
    courseFraction: totalSkills > 0 ? masteredCount / totalSkills : 0,
    avgMastery,
    timeGivenBackMinutes,
  };
}
