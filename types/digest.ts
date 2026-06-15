// Parent/Student weekly Progress Digest DTO (Phase 7 §B). A serializable,
// REGENERABLE VIEW built by lib/digest/buildProgressDigest — so a later email
// job (Resend) reuses the same builder unchanged (no email sending this phase).
// Parent-legible register: no engine jargon, no percentages on unmeasured
// domains, "mastered" only where the engine says mastered (mr-kahn B.1 honesty).

import type { MasteryStatus } from "./core";

/**
 * One skill that reached mastery within the digest window. `credited` is true
 * when the mastery came from diagnostic / credit-propagation evidence with no
 * newer practice attempt (mr-kahn K4) — shown with a faint "Credited" tag, never
 * conflated with practiced mastery.
 */
export interface DigestMasteredSkill {
  skillId: string;
  title: string;
  /** Credited (diagnostic/propagation) vs practiced mastery (K6). */
  credited: boolean;
  /** ISO of the qualifying mastery update. */
  at: string;
  /** Titles this skill "helps unlock" (a prerequisite for — never "unlocks"). */
  helpsUnlock: string[];
}

/**
 * Per-domain standing for the digest. Honesty rule: a domain with no measured
 * evidence renders `assessed: false` ("Not yet assessed") — never "0%".
 */
export interface DigestDomainStanding {
  domainId: string;
  label: string;
  assessed: boolean;
  /** Count of mastered skills in the domain (only meaningful when assessed). */
  mastered: number;
  total: number;
}

export interface ProgressDigest {
  studentId: string;
  displayName: string;
  /** Inclusive window [windowStart, generatedAt]. */
  windowStart: string;
  generatedAt: string;
  masteredThisWeek: DigestMasteredSkill[];
  /** masteredThisWeek rows earned by practice/teaching (credited === false). */
  learnedThisWeek: DigestMasteredSkill[];
  /** masteredThisWeek rows credited from diagnostic/propagation (credited === true). */
  creditedThisWeek: DigestMasteredSkill[];
  /** Current focus skill (recommend); null when the course is complete. */
  currentFocus: {
    skillId: string;
    title: string;
    objective: string;
    /** Verbatim recommend().reason — already written for a 12-year-old. */
    reason: string;
    /** Titles the current focus leads to (helps unlock). */
    leadsTo: string[];
  } | null;
  /** True when every mapped skill is mastered. */
  courseComplete: boolean;
  /** Sum of attempt timeMs in the window, humanized (e.g. "1 hr 20 min"). */
  timeOnTask: string;
  /** Total attempts logged in the window. */
  attemptsThisWeek: number;
  domains: DigestDomainStanding[];
}

/** Mastery-status set the digest is allowed to surface verbatim (honesty guard). */
export type DigestMasteryStatus = MasteryStatus;
