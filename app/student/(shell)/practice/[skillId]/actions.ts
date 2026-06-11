"use server";

// Practice persistence server action — a THIN wrapper over the pure,
// repository-driven core in lib/practice-session (which implements the exact
// per-attempt ordering of phase4-spec §H and is unit-tested there). This module
// supplies studentId (cookie), the server-only repository, the graph, and the
// student's sport; all ordering/invariants live in lib. The client sends RAW
// fields; correctness is re-checked server-side; source/sessionId are
// provenance only and never enter mastery/phase/routing math.

import { cookies } from "next/headers";
import { getRepository } from "../../../../../lib/repository/server";
import { runPracticeAttempt } from "../../../../../lib/practice-session";
import { STUDENT_COOKIE } from "../../../onboarding/constants";
import type { PracticeSubmission, SubmitPracticeResponse } from "./shared";
import type { Phase } from "../../../../../types";

const FAIL: SubmitPracticeResponse = {
  ok: false,
  error: "We couldn't save that answer.",
};

function isSubmissionShape(s: unknown): s is PracticeSubmission {
  if (typeof s !== "object" || s === null) return false;
  const r = s as Record<string, unknown>;
  return (
    typeof r.skillId === "string" &&
    typeof r.problemId === "string" &&
    typeof r.response === "string" &&
    typeof r.timeMs === "number" &&
    typeof r.hintsUsed === "number" &&
    (r.phase === 1 || r.phase === 2 || r.phase === 3) &&
    typeof r.isProbe === "boolean" &&
    typeof r.sessionId === "string"
  );
}

export async function submitPractice(raw: PracticeSubmission): Promise<SubmitPracticeResponse> {
  try {
    if (!isSubmissionShape(raw)) return FAIL;

    const cookieStore = await cookies();
    const studentId = cookieStore.get(STUDENT_COOKIE)?.value;
    if (!studentId) return FAIL;

    const repo = getRepository();
    const student = await repo.getStudent(studentId);
    if (!student) return FAIL;

    const graph = await repo.getGraph();
    const nowIso = new Date().toISOString();

    const result = await runPracticeAttempt(
      repo,
      studentId,
      graph,
      student.sport,
      {
        skillId: raw.skillId,
        problemId: raw.problemId,
        response: raw.response,
        timeMs: raw.timeMs,
        hintsUsed: raw.hintsUsed,
        phase: raw.phase as Phase,
        isProbe: raw.isProbe,
        sessionId: raw.sessionId,
      },
      nowIso,
    );

    return { ok: true, result };
  } catch {
    return FAIL;
  }
}
