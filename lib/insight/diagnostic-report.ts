// lib/insight/diagnostic-report — STAFF/dev diagnostic grading-verification view.
// PURE (no React, no IO, no clock). Reconstructs, from the immutable attempt log
// (source "diagnostic"), exactly what each diagnostic item asked, what the
// student answered, what the authored answer is, whether the engine marked it
// correct — AND an INDEPENDENT re-grade (checkAnswer over the same problem +
// response) so a developer/admin can confirm grading is reproducible. Grouped by
// domain with per-section right/wrong counts. NEVER writes anything.

import { checkAnswer } from "../problem-engine";
import { answerAsResponse } from "../item-certification";
import type { CurriculumGraph, ProblemTemplate, StudentAttempt } from "@/types";

export interface DiagnosticItemResult {
  attemptId: string;
  skillId: string;
  nodeTitle: string;
  domainId: string;
  problemId: string;
  prompt: string;
  studentAnswer: string;
  correctAnswer: string;
  /** What the engine stored at test time. */
  storedCorrect: boolean;
  /** Independent re-grade of (problem, studentAnswer) right now. */
  regradedCorrect: boolean;
  /** storedCorrect === regradedCorrect — the grading-consistency check. */
  gradesMatch: boolean;
  /** Misconception tag from the independent re-grade, if any. */
  misconceptionTag?: string;
  /** True when the problem could not be found in the current graph. */
  problemMissing: boolean;
  createdAt: string;
}

export interface DiagnosticSectionResult {
  domainId: string;
  label: string;
  correct: number;
  total: number;
  items: DiagnosticItemResult[];
}

export interface DiagnosticReport {
  sections: DiagnosticSectionResult[];
  totalCorrect: number;
  totalItems: number;
  /** True when EVERY item's stored grade matches the independent re-grade. */
  allGradesMatch: boolean;
  /** Items whose stored grade disagreed with the re-grade (should be empty). */
  mismatchCount: number;
}

/** Index every problem in the graph by id → {problem, nodeTitle, domainId}. */
function indexProblems(graph: CurriculumGraph) {
  const byId = new Map<string, { problem: ProblemTemplate; nodeTitle: string; domainId: string }>();
  for (const n of graph.nodes) {
    for (const ph of ["p1", "p2", "p3"] as const) {
      for (const p of n.problems[ph]) {
        byId.set(p.id, { problem: p, nodeTitle: n.title, domainId: n.domain });
      }
    }
  }
  return byId;
}

/**
 * Build the diagnostic grading-verification report for a student, or null when
 * the student has no diagnostic attempts. Pure: iterates attempts in their
 * recorded order, groups by domain in graph.domains order (deterministic).
 */
export function buildDiagnosticReport(
  attempts: StudentAttempt[],
  graph: CurriculumGraph,
): DiagnosticReport | null {
  const diag = attempts.filter((a) => a.source === "diagnostic");
  if (diag.length === 0) return null;

  const problems = indexProblems(graph);
  const nodeDomain = new Map(graph.nodes.map((n) => [n.id, n.domain]));
  const domainLabel = new Map(graph.domains.map((d) => [d.id, d.label]));

  const items: DiagnosticItemResult[] = diag.map((a) => {
    const found = problems.get(a.problemId);
    const domainId = found?.domainId ?? nodeDomain.get(a.skillId) ?? "unknown";
    if (!found) {
      return {
        attemptId: a.id,
        skillId: a.skillId,
        nodeTitle: a.skillId,
        domainId,
        problemId: a.problemId,
        prompt: "(problem not found in current graph)",
        studentAnswer: a.response,
        correctAnswer: "—",
        storedCorrect: a.correct,
        regradedCorrect: a.correct,
        gradesMatch: true,
        problemMissing: true,
        createdAt: a.createdAt,
      };
    }
    const regrade = checkAnswer(found.problem, a.response);
    return {
      attemptId: a.id,
      skillId: a.skillId,
      nodeTitle: found.nodeTitle,
      domainId,
      problemId: a.problemId,
      prompt: found.problem.prompt,
      studentAnswer: a.response,
      correctAnswer: answerAsResponse(found.problem.answer),
      storedCorrect: a.correct,
      regradedCorrect: regrade.correct,
      gradesMatch: a.correct === regrade.correct,
      misconceptionTag: regrade.misconceptionTag,
      problemMissing: false,
      createdAt: a.createdAt,
    };
  });

  // Group by domain, in graph.domains order (deterministic), domain-by-domain.
  const sections: DiagnosticSectionResult[] = graph.domains
    .map((d) => {
      const dItems = items.filter((it) => it.domainId === d.id);
      return {
        domainId: d.id,
        label: d.label,
        correct: dItems.filter((it) => it.storedCorrect).length,
        total: dItems.length,
        items: dItems,
      };
    })
    .filter((s) => s.total > 0);

  const totalCorrect = items.filter((it) => it.storedCorrect).length;
  const mismatchCount = items.filter((it) => !it.gradesMatch).length;

  return {
    sections,
    totalCorrect,
    totalItems: items.length,
    allGradesMatch: mismatchCount === 0,
    mismatchCount,
  };
}
