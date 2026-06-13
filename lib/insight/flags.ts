// lib/insight/flags.ts — deterministic, rule-based staff signals (Phase 7 §A.3).
// NO LLM. PURE: no IO, no Date.now() (nowIso is explicit). Every flag detail is a
// factual count/date — no editorializing (pee-wee P3 renders these quietly, no
// red, no alarms).
//
// Thresholds: reuse MASTERY_CONFIG / PROBLEM_CONFIG where a value already exists
// (rushingMs is the canonical timing floor). Flag-specific constants live in the
// documented FLAGS_CONFIG literal below (mr-gates G6 — NOT a Matt checkpoint; it
// holds no mastery weights).

import { MASTERY_CONFIG } from "../mastery-engine";
import { retentionStatus } from "../retention";
import type {
  CurriculumGraph,
  FlagEntry,
  MasteryResult,
  MasteryUpdate,
  StudentAttempt,
  StudentSkillState,
} from "@/types";

/**
 * Flag-specific tuning. Each constant carries its rationale inline. Reused
 * thresholds (e.g. the rushing floor) read from MASTERY_CONFIG and are NOT
 * duplicated here.
 */
export const FLAGS_CONFIG = {
  /**
   * A node is "stalled" when the student has worked it across this many distinct
   * sessions with NO status improvement. Three is the smallest count that rules
   * out one-off variance while still surfacing genuine plateaus early.
   */
  stalledMinSessions: 3,
  /**
   * Hint-dependence floor over the recent window: flag when the fraction of
   * recent attempts that used ≥1 hint meets this. 0.5 = "leaning on hints at
   * least half the time recently" — a coaching signal, not a failure.
   */
  hintRateFloor: 0.5,
  /** Minimum recent attempts before the hint-rate signal is meaningful. */
  hintRateMinAttempts: 3,
  /**
   * Rushing frequency floor: flag when at least this fraction of recent attempts
   * fall under MASTERY_CONFIG.timing.rushingMs. 0.5 keeps a single fast (but
   * correct) answer from tripping it.
   */
  rushingFractionFloor: 0.5,
  /** Minimum recent attempts before the rushing signal is meaningful. */
  rushingMinAttempts: 3,
  /**
   * "Days since last session" becomes an attention signal at this many days of
   * inactivity. One school week. Below it, the signal is informational only.
   */
  staleSessionDays: 7,
} as const;

const MS_PER_DAY = 86_400_000;

/** Distinct sessionId count for a skill over the practice attempt log. */
function distinctSessions(attempts: StudentAttempt[], skillId: string): number {
  return new Set(
    attempts
      .filter((a) => a.skillId === skillId && a.source === "practice")
      .map((a) => a.sessionId),
  ).size;
}

/**
 * Compute the deterministic flag set for one student. `results` is the output of
 * computeMasteryAll for the same states (mr-gates G1) — never re-derived.
 */
export function computeFlags(
  graph: CurriculumGraph,
  attempts: StudentAttempt[],
  updates: MasteryUpdate[],
  states: Record<string, StudentSkillState>,
  results: Record<string, MasteryResult>,
  campusId: string | null,
  nowIso: string,
): FlagEntry[] {
  void campusId; // stable read-model signature (G3); RLS scopes at row level
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const flags: FlagEntry[] = [];
  const cfg = FLAGS_CONFIG;
  const rushingMs = MASTERY_CONFIG.timing.rushingMs;

  // Iterate skills in graph node order for deterministic output.
  for (const node of graph.nodes) {
    const skillId = node.id;
    const state = states[skillId];
    if (!state || state.attempts === 0) continue;

    const skillAttempts = attempts.filter(
      (a) => a.skillId === skillId && a.source === "practice",
    );

    // --- Stalled node: ≥ N distinct sessions, no status improvement. We treat
    // "no improvement" as: never reached mastered AND no mastery update on this
    // skill advanced its status (the log carries every transition).
    const sessions = distinctSessions(attempts, skillId);
    const improved = updates.some(
      (u) =>
        u.skillId === skillId &&
        // an advance = moved to a more-advanced post-developing status
        (u.newStatus === "near_mastery" ||
          u.newStatus === "mastered" ||
          (u.newStatus === "developing" && u.prevStatus === "introduced")),
    );
    if (sessions >= cfg.stalledMinSessions && state.status !== "mastered" && !improved) {
      flags.push({
        kind: "stalled-node",
        severity: "attention",
        skillId,
        detail: `${sessions} sessions, no status change`,
        evidenceAttemptIds: skillAttempts.map((a) => a.id),
      });
    }

    // --- High hint dependence over the recent window.
    const recent = state.recent;
    // recent[] does not carry hintsUsed; the immutable log does. Use the last
    // `recent.length` practice attempts (the same window the engine scores) so
    // the signal aligns with what the engine "saw".
    const windowSize = Math.max(recent.length, cfg.hintRateMinAttempts);
    const recentRows = skillAttempts.slice(-windowSize);
    if (recentRows.length >= cfg.hintRateMinAttempts) {
      const withHints = recentRows.filter((a) => a.hintsUsed > 0).length;
      const rate = withHints / recentRows.length;
      if (rate >= cfg.hintRateFloor) {
        flags.push({
          kind: "high-hint-dependence",
          severity: "info",
          skillId,
          detail: `${withHints} of ${recentRows.length} recent attempts used a hint`,
          evidenceAttemptIds: recentRows.map((a) => a.id),
        });
      }
    }

    // --- Rushing: a frequency of sub-rushingMs attempts in the recent window.
    if (recentRows.length >= cfg.rushingMinAttempts) {
      const fast = recentRows.filter((a) => a.timeMs < rushingMs);
      const frac = fast.length / recentRows.length;
      if (frac >= cfg.rushingFractionFloor) {
        flags.push({
          kind: "rushing",
          severity: "info",
          skillId,
          detail: `${fast.length} of ${recentRows.length} recent attempts under ${Math.round(rushingMs / 1000)}s`,
          evidenceAttemptIds: fast.map((a) => a.id),
        });
      }
    }
  }

  // --- Decayed-mastery review queue: needs_review nodes that were once mastered.
  for (const node of graph.nodes) {
    const state = states[node.id];
    if (!state) continue;
    const status = results[node.id]?.status ?? state.status;
    if (status === "needs_review" && state.masteredAt !== null) {
      flags.push({
        kind: "decayed-review-queue",
        severity: "attention",
        skillId: node.id,
        detail: `Mastered ${state.masteredAt.slice(0, 10)}, now due for review`,
        evidenceAttemptIds: [],
      });
    }
  }
  void byId; // title index retained for parity with other builders

  // --- Days since last session (whole-student signal). Practice attempts only.
  const practice = attempts.filter((a) => a.source === "practice");
  if (practice.length > 0) {
    const last = practice.reduce(
      (max, a) => (a.createdAt.localeCompare(max) > 0 ? a.createdAt : max),
      practice[0].createdAt,
    );
    const days = Math.floor((Date.parse(nowIso) - Date.parse(last)) / MS_PER_DAY);
    if (days >= 1) {
      flags.push({
        kind: "days-since-session",
        severity: days >= cfg.staleSessionDays ? "attention" : "info",
        detail: `${days} day${days === 1 ? "" : "s"} since last session`,
        evidenceAttemptIds: [],
      });
    }
  }

  // --- Retention probes due (Phase 7C): a mastered node whose spaced-review
  // clock has come due (derived read-only from the immutable logs by
  // lib/retention — scheduling/serving only, never engine math). One info-level
  // flag per due node, in graph node order; the detail is the factual due date.
  for (const node of graph.nodes) {
    const rs = retentionStatus(node, states[node.id], updates, attempts, nowIso);
    if (rs.due && rs.dueAt !== null) {
      flags.push({
        kind: "retention-probes-due",
        severity: "info",
        skillId: node.id,
        detail: `Due for a retention check (since ${rs.dueAt.slice(0, 10)})`,
        evidenceAttemptIds: [],
      });
    }
  }

  return flags;
}
