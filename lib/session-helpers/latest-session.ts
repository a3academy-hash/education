import type { StudentAttempt } from "@/types";

/**
 * Resolve which session a param-less /student/summary should show, from the
 * student's OWN persisted attempts (display provenance only — never engine math).
 * Defensive: sorts by createdAt asc then id asc itself (does not trust input order).
 * The summary page is the PRACTICE summary, so only "practice" attempts are
 * session/skill candidates: "retention" probes carry another node's skillId, and
 * "diagnostic" attempts have their OWN results flow and must never backfill this
 * page. Missing/unknown source is treated as practice (defensive superset).
 */
export function resolveLatestSession(
  attempts: StudentAttempt[],
  skillId?: string,
): { sessionId: string; skillId: string } | null {
  if (attempts.length === 0) return null;
  const sorted = [...attempts].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  const isPractice = (a: StudentAttempt) => a.source !== "retention" && a.source !== "diagnostic";

  if (skillId) {
    for (let i = sorted.length - 1; i >= 0; i--) {
      const a = sorted[i];
      if (a.skillId === skillId && isPractice(a)) return { sessionId: a.sessionId, skillId };
    }
    return null; // no session contains a practice attempt for this skill -> NoSession
  }

  // The most recent PRACTICE attempt (not merely the latest attempt overall — a
  // diagnostic attempt may be newer and must not select a diagnostic session).
  let latestPractice: StudentAttempt | null = null;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (isPractice(sorted[i])) { latestPractice = sorted[i]; break; }
  }
  if (!latestPractice) return null; // only diagnostic/retention rows -> NoSession

  const sessionId = latestPractice.sessionId;
  const sessionAttempts = sorted.filter((a) => a.sessionId === sessionId);
  let resolvedSkill = latestPractice.skillId;
  for (let i = sessionAttempts.length - 1; i >= 0; i--) {
    if (isPractice(sessionAttempts[i])) { resolvedSkill = sessionAttempts[i].skillId; break; }
  }
  return { sessionId, skillId: resolvedSkill };
}
