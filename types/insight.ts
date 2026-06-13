// Read-model DTOs for the Admin Decision Log & Student Insight surfaces
// (Phase 7 §A). These are REGENERABLE VIEWS over the immutable evidence logs —
// never stored, never fed back into engine math. Built by the pure functions in
// lib/insight. No `any` at the boundary (mr-gates G5).

import type { MasteryStatus, Phase, Sport } from "./core";

/**
 * One raw attempt row surfaced inside an expanded timeline session entry (the
 * audit view). Field names mirror StudentAttempt exactly — this is a projection,
 * not a reinterpretation.
 */
export interface TimelineAttemptRow {
  attemptId: string;
  problemId: string;
  response: string;
  correct: boolean;
  phase: Phase;
  hintsUsed: number;
  timeMs: number;
}

/**
 * One entry in the reverse-chronological decision timeline. Every `sentence` is
 * composed ONLY from structural log facts and/or a verbatim MasteryUpdate.reason
 * (mr-kahn K1/K2/K3) — no authored interpretation the engine never produced.
 *
 * Kinds:
 *  - "session": a group of consecutive practice attempts on one skill, keyed by
 *    StudentAttempt.sessionId. Carries the attempt roll-up + raw rows.
 *  - "mastery": a single logged MasteryUpdate (mastered / restored / credited /
 *    decayed / locked). `sentence` is the verbatim engine reason where one
 *    exists; structural templates only state logged facts.
 */
export interface DecisionTimelineEntry {
  kind: "session" | "mastery";
  /** The MasteryUpdate.trigger when kind === "mastery"; null for sessions. */
  trigger: "attempt" | "diagnostic" | "decay" | "credit-propagation" | null;
  /** The status this entry resolves to (mastery entries) — drives the dot color. */
  outcomeStatus: MasteryStatus | null;
  skillId: string;
  skillTitle: string;
  /** ISO timestamp anchoring the entry (a logged fact — never a non-event). */
  at: string;
  /** ISO of the earliest event in the entry (session start); equals `at` for mastery. */
  startedAt: string;
  /** One factual/verbatim sentence (3-lines-max collapsed view). */
  sentence: string;
  /** Non-causal arc header joining events sharing a blocked skill, else null (K2). */
  arcLabel: string | null;
  /** Session roll-up (null for mastery entries). */
  session: {
    sessionId: string;
    attemptCount: number;
    correctCount: number;
    hintsTotal: number;
    timeMsTotal: number;
    sport: Sport;
    /** Distinct phases touched, ascending (the "phase span"). */
    phases: Phase[];
    rows: TimelineAttemptRow[];
  } | null;
  /** Evidence footer — the audit link back into the append-only logs. */
  evidence: {
    attemptIds: string[];
    masteryUpdateIds: string[];
    engineVersion: string | null;
  };
}

/** A deterministic, rule-based signal for staff attention (NO LLM). */
export interface FlagEntry {
  kind:
    | "stalled-node"
    | "high-hint-dependence"
    | "rushing"
    | "decayed-review-queue"
    | "retention-probes-due"
    | "days-since-session";
  /** info = neutral signal; attention = worth a look (never an error/alarm). */
  severity: "info" | "attention";
  skillId?: string;
  /** Factual count/date only — no editorializing (A.3). */
  detail: string;
  evidenceAttemptIds: string[];
}

/** One roster row — the cross-school "is the engine working" view (A.4). */
export interface RosterRow {
  studentId: string;
  displayName: string;
  campusId: string | null;
  /** Current recommended skill title (from recommend); "" when course complete. */
  currentSkillTitle: string;
  /** Status of the current recommended skill, or "mastered" when complete. */
  currentStatus: MasteryStatus;
  /** ISO of the most recent attempt, or null when never active. */
  lastActiveAt: string | null;
  openFlags: number;
}
