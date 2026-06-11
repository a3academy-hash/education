"use server";

// Diagnostic persistence server action. The client sends RAW responses
// (skillId, problemId, response, timeMs) — the server replays the session
// against the real graph, re-checks every answer itself, and recomputes
// demonstrated[] server-side; client-side correctness is never trusted.
//
// ORDER (mr-gates #5 — exact, spec §C):
//   (a) append ONE StudentAttempt per item (phase 3, sport "neutral", real
//       problemId/response, source "diagnostic", isProbe false, hintsUsed 0,
//       misconceptionTags from checkAnswer)
//   (b) compute demonstrated[]
//   (c) creditFromDiagnostic(studentId, graph, demonstrated, states, nowIso)
//   (d) persist each returned NewMasteryUpdate via appendMasteryUpdate
//   (e) for each credited node setSkillState with masteredAt set + recent: []
//       (StudentSkillState convention)
//   (f) return the narrow DiagnosticPersistResult DTO only — the graph and
//       overlay are NEVER serialized to the client.
//
// RETAKE is strictly additive: this action only ever appends attempt rows and
// credits more skills; prior diagnostic credit is never revoked.

import { cookies } from "next/headers";
import { getRepository } from "../../../../lib/repository/server";
import {
  DIAGNOSTIC_CONFIG,
  finishDiagnostic,
  nextItem,
  recordResponse,
  startDiagnostic,
} from "../../../../lib/diagnostic-engine";
import { checkAnswer } from "../../../../lib/problem-engine";
import { computeMasteryAll, creditFromDiagnostic } from "../../../../lib/mastery-engine";
import { recommend } from "../../../../lib/adaptive-router";
import { STUDENT_COOKIE } from "../../onboarding/constants";
import type { DiagnosticSession, StudentSkillState } from "../../../../types";
import type { DiagnosticAnswer, PersistDiagnosticResponse } from "./shared";

const MAX_ITEM_TIME_MS = 3_600_000; // clamp ceiling — 1 hour per item

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

const FAIL: PersistDiagnosticResponse = {
  ok: false,
  error: "The diagnostic could not be saved.",
};

function isAnswerShape(a: unknown): a is DiagnosticAnswer {
  if (typeof a !== "object" || a === null) return false;
  const r = a as Record<string, unknown>;
  return (
    typeof r.skillId === "string" &&
    typeof r.problemId === "string" &&
    typeof r.response === "string" &&
    typeof r.timeMs === "number"
  );
}

export async function persistDiagnostic(
  rawAnswers: DiagnosticAnswer[],
): Promise<PersistDiagnosticResponse> {
  try {
    const cookieStore = await cookies();
    const studentId = cookieStore.get(STUDENT_COOKIE)?.value;
    if (!studentId) return FAIL;

    const repo = getRepository();
    const student = await repo.getStudent(studentId);
    if (!student) return FAIL;

    // --- server-side validation (do not trust the client) ---
    if (
      !Array.isArray(rawAnswers) ||
      rawAnswers.length === 0 ||
      rawAnswers.length > DIAGNOSTIC_CONFIG.maxItems ||
      !rawAnswers.every(isAnswerShape)
    ) {
      return FAIL;
    }

    const graph = await repo.getGraph();

    // Replay against the REAL graph: every response must match the engine's
    // deterministic sequence, and correctness is re-checked server-side.
    let session: DiagnosticSession = startDiagnostic(graph, studentId, DIAGNOSTIC_CONFIG);
    const checked: { answer: DiagnosticAnswer; correct: boolean; tag?: string }[] = [];
    for (const answer of rawAnswers) {
      const item = nextItem(session, graph);
      if (!item || item.skillId !== answer.skillId || item.problem.id !== answer.problemId) {
        return FAIL; // out-of-sequence / tampered submission
      }
      const check = checkAnswer(item.problem, answer.response);
      checked.push({ answer, correct: check.correct, tag: check.misconceptionTag });
      session = recordResponse(session, graph, answer.skillId, check.correct);
    }

    const nowIso = new Date().toISOString();

    // (a) append the immutable attempt rows — the accreditation evidence trail.
    const attemptIds: string[] = [];
    for (const c of checked) {
      const timeMs = Number.isFinite(c.answer.timeMs)
        ? Math.min(Math.max(0, Math.round(c.answer.timeMs)), MAX_ITEM_TIME_MS)
        : 0;
      const attempt = await repo.appendAttempt({
        studentId,
        skillId: c.answer.skillId,
        problemId: c.answer.problemId,
        phase: 3,
        sport: "neutral",
        response: c.answer.response,
        correct: c.correct,
        hintsUsed: 0,
        timeMs,
        misconceptionTags: c.tag ? [c.tag] : [],
        isProbe: false,
        source: "diagnostic",
      });
      attemptIds.push(attempt.id);
    }

    // (b) demonstrated[] — evidence pointers carry the real attempt ids.
    const sessionWithRefs: DiagnosticSession = {
      ...session,
      responses: session.responses.map((r, i) => ({ ...r, attemptIdRef: attemptIds[i] })),
    };
    const result = finishDiagnostic(sessionWithRefs, graph, nowIso);

    // (c) credit through the committed engine — the diagnostic never writes
    // mastery itself.
    const states = await repo.getSkillStates(studentId);
    const credit = creditFromDiagnostic(studentId, graph, result.demonstrated, states, nowIso);

    // (d) persist the mastery updates.
    for (const u of credit.updates) await repo.appendMasteryUpdate(u);

    // (e) set each credited skill state: masteredAt set, recent reset.
    for (const u of credit.updates) {
      const prev = states[u.skillId] ?? blankState();
      await repo.setSkillState(studentId, u.skillId, {
        ...prev,
        mastery: u.newMastery,
        status: u.newStatus,
        phase: u.newPhase,
        recent: [],
        masteredAt: nowIso,
      });
    }

    // (f) narrow DTO only — recommendation over the REAL post-credit state.
    const postStates = await repo.getSkillStates(studentId);
    const batch = computeMasteryAll(studentId, postStates, graph, nowIso);
    const rec = recommend(batch.results, postStates, graph, {
      justCredited: credit.updates.map((u) => u.skillId),
    });
    return {
      ok: true,
      result: {
        recommendedSkillId: rec.skillId,
        recommendedReason: rec.reason,
        creditedCount: credit.updates.length,
        skippedCount: credit.skipped.length,
      },
    };
  } catch {
    return FAIL;
  }
}
