// lib/engine-loop — the framework-neutral submit loop (overhaul Phase 1; AUDIT
// D2.1; AI_ADAPTIVE §0/§9; ADR-0001 rule 2 "domain logic stays in lib/").
//
// THE SPLIT (the whole point): the authoritative GRADE is computed synchronously
// and returned IMMEDIATELY (so the UI can paint optimistically, perceived <16ms),
// while the model/mastery update is a SEPARATE, DURABLE, REPLAYABLE job that runs
// async without blocking the interaction. Grading NEVER awaits persistence or the
// model update. (Closes the v0.1 "client blocks on the full grade+persist+recompute
// transaction" latency BLOCKER.)
//
// This module is PURE + framework-neutral: no I/O, no fetch, no await, no Next, no
// Supabase import. A server action (the thin wrapper, ADR-0001) calls gradeAttempt
// for the immediate response, then the submit_attempt RPC (0006) persists the
// attempt + enqueues the model_update_outbox job (R5) in one transaction. An async
// worker applies the job, replayable from the persisted attempt alone — so an
// async failure can never silently lose a mastery update.

import { checkAnswer } from "../problem-engine";
import type { ProblemTemplate } from "@/types";

/** The authoritative grade — the ONLY thing the optimistic paint needs. */
export interface GradeOutcome {
  /** Server-authoritative correctness (never the client's claim). */
  correct: boolean;
  /** A matched misconception tag (drives the deterministic tutor), if any. */
  misconceptionTag?: string;
}

/**
 * Authoritative, SYNCHRONOUS grade. Pure: same (problem, response) → same outcome,
 * no I/O. The server action returns this immediately for an optimistic render; it
 * does NOT await persistence or any model recompute. Delegates the actual answer
 * checking to the existing deterministic checker (no CAS/LLM on this path).
 */
export function gradeAttempt(problem: ProblemTemplate, response: string): GradeOutcome {
  return checkAnswer(problem, response);
}

/**
 * A durable model-update job — exactly what `submit_attempt` (0006) enqueues into
 * `model_update_outbox` IN THE SAME TRANSACTION as the append-only attempt insert
 * (R5). It carries ONLY the keys needed to replay the update from persisted
 * evidence; it deliberately does NOT carry the grade or any derived state, so the
 * worker recomputes from the immutable attempt (idempotent replay) and an async
 * failure loses nothing.
 */
export interface ModelUpdateJob {
  attemptId: string;
  studentId: string;
}

/** Build the deferred, replayable model-update job from a persisted attempt. */
export function buildModelUpdateJob(attempt: { id: string; studentId: string }): ModelUpdateJob {
  return { attemptId: attempt.id, studentId: attempt.studentId };
}

/**
 * The submit loop, as a pure decomposition the server action wires I/O around:
 *   1. grade        — sync, authoritative, returned immediately (optimistic).
 *   2. afterPersist — given the persisted attempt, the durable job to enqueue.
 * Step 1 NEVER depends on step 2; the separation is the architecture, made explicit
 * (and testable) here rather than tangled into a Next server action.
 */
export interface SubmitLoop {
  grade: GradeOutcome;
  afterPersist: (attempt: { id: string; studentId: string }) => ModelUpdateJob;
}

export function runSubmitLoop(problem: ProblemTemplate, response: string): SubmitLoop {
  return {
    grade: gradeAttempt(problem, response),
    afterPersist: (attempt) => buildModelUpdateJob(attempt),
  };
}
