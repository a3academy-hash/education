// lib/practice-session — the pure, repository-driven core of one practice
// attempt. Implements the EXACT per-attempt ordering of phase4-spec §H against
// the A3Repository contract, so it is fully unit-testable (InMemoryRepository)
// with no Next.js cookie/HTTP surface. The "use server" action is a thin
// wrapper that supplies studentId (cookie) + repo (getRepository) + graph.
//
// INVARIANTS (BLOCKER-level if violated):
//   - append the immutable StudentAttempt FIRST (evidence before decision);
//   - computeMasteryAll runs EXACTLY ONCE per attempt;
//   - the MasteryUpdate carries the REAL attempt id (diagnostic used null);
//   - recent[] is reset ONLY on the mastered transition, in the SAME
//     setSkillState write — never recomputed after the reset;
//   - setSkillState is the ONLY mutable write; no update/delete on the logs;
//   - server re-checks correctness (never trusts the caller's claim);
//   - source/sessionId are stamped for provenance and NEVER enter
//     mastery/phase/transfer/routing math.
//
// PURE w.r.t. time: nowIso is an explicit parameter (no Date.now() here).

import {
  advancePhase,
  checkAnswer,
  computeTransfer,
  selectProblems,
  PROBLEM_CONFIG,
} from "../problem-engine";
import { computeMasteryAll, ENGINE_VERSION } from "../mastery-engine";
import { tutorRemediation } from "../ai-tutor";
import {
  assembleCorrect,
  assembleIncorrectTagged,
  assembleIncorrectUntagged,
  type FeedbackState,
  type WhyAssembly,
} from "../session-helpers";
import type {
  A3Repository,
  CurriculumGraph,
  Phase,
  Sport,
  StudentSkillState,
} from "@/types";

/** Time clamp ceiling — 1 hour per item. */
export const MAX_ITEM_TIME_MS = 3_600_000;

export interface RawAttempt {
  skillId: string;
  problemId: string;
  response: string;
  timeMs: number;
  hintsUsed: number;
  phase: Phase;
  isProbe: boolean;
  sessionId: string;
}

export interface TutorPanel {
  diagnosis: string;
  reframe: string;
  bridgeToNeutral: string;
}

export interface PracticeAttemptResult {
  correct: boolean;
  feedbackState: FeedbackState;
  misconceptionTags: string[];
  why: WhyAssembly;
  tutor: TutorPanel | null;
  phaseChanged: boolean;
  masteredNow: boolean;
}

export class PracticeAttemptError extends Error {}

const blankState = (): StudentSkillState => ({
  mastery: 0,
  status: "unknown",
  phase: 1,
  attempts: 0,
  correct: 0,
  hints: 0,
  timeMs: 0,
  recent: [],
  transfer: false,
  lastAttemptAt: null,
  masteredAt: null,
});

/**
 * Run ONE practice attempt against the repository, exactly per spec §H.
 * Throws PracticeAttemptError on any validation failure (the action maps it to
 * a narrow FAIL DTO). Returns the narrow per-attempt result — the graph and
 * overlay are NEVER part of the return.
 */
export async function runPracticeAttempt(
  repo: A3Repository,
  studentId: string,
  graph: CurriculumGraph,
  sport: Sport,
  raw: RawAttempt,
  nowIso: string,
): Promise<PracticeAttemptResult> {
  // --- §H.0 Validate (do not trust the caller) ---
  const node = graph.nodes.find((n) => n.id === raw.skillId);
  if (!node) throw new PracticeAttemptError("Unknown skill.");

  const states = await repo.getSkillStates(studentId);
  const prev = states[raw.skillId] ?? blankState();

  // The problem must belong to this node, and the phase/isProbe pair must match
  // a legitimately-served slot for the CURRENT persisted phase/sport.
  const served = selectProblems(node, prev, sport);
  const slot = served.find((s) => s.problem.id === raw.problemId);
  if (!slot) throw new PracticeAttemptError("Problem is not a served slot for this phase.");
  if (slot.problem.phase !== raw.phase || slot.isProbe !== raw.isProbe) {
    throw new PracticeAttemptError("Phase/probe mismatch with the served slot.");
  }
  const problem = slot.problem;

  // --- §H.2 server re-check (correctness is ALWAYS the server's) ---
  const check = checkAnswer(problem, raw.response);
  const correct = check.correct;
  const misconceptionTags = check.misconceptionTag ? [check.misconceptionTag] : [];

  const hintsUsed = Number.isFinite(raw.hintsUsed)
    ? Math.max(0, Math.min(2, Math.round(raw.hintsUsed)))
    : 0;
  const timeMs = Number.isFinite(raw.timeMs)
    ? Math.min(Math.max(0, Math.round(raw.timeMs)), MAX_ITEM_TIME_MS)
    : 0;

  // --- §H.3 append the immutable attempt FIRST ---
  const attempt = await repo.appendAttempt({
    studentId,
    skillId: raw.skillId,
    problemId: raw.problemId,
    phase: raw.phase,
    sport: problem.sport,
    response: raw.response,
    correct,
    hintsUsed,
    timeMs,
    misconceptionTags,
    isProbe: raw.isProbe,
    source: "practice",
    sessionId: raw.sessionId,
  });

  // --- §H.4/§H.5 prev state + the full log (includes the step-3 row) ---
  const attempts = await repo.listAttempts(studentId, raw.skillId);

  // --- §H.6 running candidate state (phase/transfer fed from the PERSISTED log) ---
  const nextRecent = [...prev.recent, { correct, timeMs, phase: raw.phase }].slice(-5);
  const nextPhase: Phase = advancePhase(attempts, prev.phase, PROBLEM_CONFIG);
  const nextTransfer = computeTransfer(attempts, PROBLEM_CONFIG);
  const candidateState: StudentSkillState = {
    ...prev,
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    hints: prev.hints + hintsUsed,
    timeMs: prev.timeMs + timeMs,
    recent: nextRecent,
    phase: nextPhase,
    transfer: nextTransfer,
    lastAttemptAt: nowIso,
  };

  // --- §H.7 persist the candidate so the engine sees fresh evidence ---
  await repo.setSkillState(studentId, raw.skillId, candidateState);

  // --- §H.8 recompute mastery EXACTLY ONCE ---
  const freshStates = await repo.getSkillStates(studentId);
  const batch = computeMasteryAll(studentId, freshStates, graph, nowIso);

  // --- §H.9 apply this node's proposed update (if any) ---
  const proposed = batch.proposedUpdates.find((u) => u.skillId === raw.skillId);
  let masteredNow = false;
  if (proposed) {
    await repo.appendMasteryUpdate({
      ...proposed,
      attemptId: attempt.id, // REAL id
      trigger: "attempt",
      sessionId: raw.sessionId,
      engineVersion: ENGINE_VERSION,
    });
    const finalState: StudentSkillState = {
      ...candidateState,
      mastery: proposed.newMastery,
      status: proposed.newStatus,
      phase: proposed.newPhase,
    };
    if (proposed.newStatus === "mastered") {
      masteredNow = true;
      finalState.masteredAt = nowIso;
      finalState.recent = []; // reset in the SAME write
    }
    await repo.setSkillState(studentId, raw.skillId, finalState);
  } else {
    await repo.setSkillState(studentId, raw.skillId, {
      ...candidateState,
      mastery: batch.results[raw.skillId]?.score ?? candidateState.mastery,
    });
  }

  // --- §H.10 assemble the narrow DTO ---
  const phaseChanged = nextPhase !== prev.phase;
  let feedbackState: FeedbackState;
  let why: WhyAssembly;
  let tutor: TutorPanel | null = null;
  if (correct) {
    feedbackState = "correct";
    why = assembleCorrect(problem, node.workedExamples);
  } else if (check.misconceptionTag) {
    feedbackState = "incorrect-tag";
    const t = await tutorRemediation(
      check.misconceptionTag,
      node,
      problem.sport,
      graph.misconceptionRegistry,
    );
    // BLOCKER B (mr-kahn): t.diagnosis is the raw audit-register description and
    // must NOT reach the student. It rides in the DTO ONLY for an instructor/
    // audit surface (none ships Phase 4); the screen never renders it. The
    // student "why" is sourced from AUTHORED hints / worked example instead.
    tutor = { diagnosis: t.diagnosis, reframe: t.reframe, bridgeToNeutral: t.bridgeToNeutral };
    why = assembleIncorrectTagged(problem, hintsUsed, node.workedExamples);
  } else {
    feedbackState = "incorrect-no-tag";
    why = assembleIncorrectUntagged(problem, hintsUsed, node.workedExamples);
  }

  return { correct, feedbackState, misconceptionTags, why, tutor, phaseChanged, masteredNow };
}
