// lib/insight/decision-timeline.ts — the Admin Decision Log centerpiece
// (Phase 7 §A.1). PURE: no React, no IO, no Date.now(). Consumes the immutable
// evidence logs (attempts + mastery updates) plus computeMasteryAll(...).results
// ONLY (mr-gates G1 — never proposedUpdates, never a write method). Produces a
// reverse-chronological DecisionTimelineEntry[].
//
// NARRATIVE FIDELITY (mr-kahn K1/K2/K3 — binding, supersedes the draft table):
//  - K1: there is NO dated "Routed backward" entry. A router recommendation is
//    not a logged event; we never date a non-event. Current routing lives in the
//    live Mastery Map (present tense), not here.
//  - K2: arc grouping is one entry per log event; an optional NON-causal arc
//    header joins events that share the same blocked skillId
//    ("{blockedTitle} — prerequisite arc"). No "because/so that" prose, no
//    synthesized "resume" event.
//  - K3: lock entries key on newStatus === "prerequisite_gap" (NOT a nonexistent
//    "lock" trigger — the real trigger is "attempt" or "decay"); the sentence is
//    the engine's VERBATIM reason, with no "below threshold" paraphrase.
//  - Every other mastery sentence is the engine's verbatim reason where the log
//    carries one; structural templates only state logged facts (dates, counts,
//    phase span, sport).
//
// Each entry carries an evidence footer (attemptIds, masteryUpdateIds,
// engineVersion) — the audit link back into the append-only logs.

import type {
  CurriculumGraph,
  DecisionTimelineEntry,
  MasteryResult,
  MasteryStatus,
  MasteryUpdate,
  Phase,
  StudentAttempt,
  StudentSkillState,
  TimelineAttemptRow,
} from "@/types";

/** Human date (YYYY-MM-DD) from an ISO timestamp — a logged fact, never derived. */
function dateOf(iso: string): string {
  return iso.slice(0, 10);
}

/** "Phase 1" / "Phases 1–3" from the distinct phases a session touched. */
function phaseSpanLabel(phases: Phase[]): string {
  if (phases.length === 0) return "no phases";
  if (phases.length === 1) return `Phase ${phases[0]}`;
  return `Phases ${phases[0]}–${phases[phases.length - 1]}`;
}

/**
 * Build the reverse-chronological decision timeline for one student.
 *
 * @param graph    the curriculum graph (titles + prereq topology for arc labels)
 * @param attempts the student's append-only attempt log (any order; we sort)
 * @param updates  the student's append-only MasteryUpdate log (any order)
 * @param states   per-skill states (reserved for future enrichment; unused in
 *                  the body today, accepted to keep the read-model signature
 *                  stable and mirror the engine read contract)
 * @param campusId staff campus scope (mr-gates G3); reserved for the RLS swap
 * @param nowIso   explicit clock (mr-gates G7) — reserved; no relative dates here
 */
export function buildDecisionTimeline(
  graph: CurriculumGraph,
  attempts: StudentAttempt[],
  updates: MasteryUpdate[],
  states: Record<string, StudentSkillState>,
  campusId: string | null,
  nowIso: string,
): DecisionTimelineEntry[] {
  // states/campusId/nowIso are part of the stable read-model signature (G3/G7)
  // and the engine read contract; referenced here so lint sees them consumed
  // without altering any logged fact.
  void states;
  void campusId;
  void nowIso;

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const titleOf = (skillId: string): string => byId.get(skillId)?.title ?? skillId;

  // Deterministic chronological base order (createdAt asc, id asc) — the same
  // order the repository guarantees for the logs.
  const sortedAttempts = [...attempts].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  const sortedUpdates = [...updates].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );

  const entries: DecisionTimelineEntry[] = [];

  // ---- Session entries: consecutive practice attempts grouped by sessionId.
  // "Consecutive" = adjacent in chronological order AND sharing (sessionId,
  // skillId). The diagnostic is provenance, not a learning session — exclude
  // source "diagnostic" (consistent with the Learning Home activity rule).
  let current: StudentAttempt[] = [];
  const flushSession = () => {
    if (current.length === 0) return;
    const skillId = current[0].skillId;
    const sessionId = current[0].sessionId;
    const correctCount = current.filter((a) => a.correct).length;
    const hintsTotal = current.reduce((s, a) => s + a.hintsUsed, 0);
    const timeMsTotal = current.reduce((s, a) => s + a.timeMs, 0);
    const phases = [...new Set(current.map((a) => a.phase))].sort((x, y) => x - y) as Phase[];
    const rows: TimelineAttemptRow[] = current.map((a) => ({
      attemptId: a.id,
      problemId: a.problemId,
      response: a.response,
      correct: a.correct,
      phase: a.phase,
      hintsUsed: a.hintsUsed,
      timeMs: a.timeMs,
    }));
    const startedAt = current[0].createdAt;
    const at = current[current.length - 1].createdAt;
    const title = titleOf(skillId);
    const dateRange =
      dateOf(startedAt) === dateOf(at) ? dateOf(at) : `${dateOf(startedAt)}–${dateOf(at)}`;
    entries.push({
      kind: "session",
      trigger: null,
      outcomeStatus: null,
      skillId,
      skillTitle: title,
      at,
      startedAt,
      // Structural-fact template only — counts, phase span. No interpretation.
      sentence: `${dateRange} — Practiced ${title}: ${current.length} attempt${current.length === 1 ? "" : "s"}, ${correctCount} correct, ${phaseSpanLabel(phases)}.`,
      arcLabel: null,
      session: {
        sessionId,
        attemptCount: current.length,
        correctCount,
        hintsTotal,
        timeMsTotal,
        sport: current[0].sport,
        phases,
        rows,
      },
      evidence: {
        attemptIds: current.map((a) => a.id),
        masteryUpdateIds: [],
        engineVersion: null,
      },
    });
    current = [];
  };

  for (const a of sortedAttempts) {
    if (a.source === "diagnostic") continue;
    const head = current[0];
    if (head && (head.sessionId !== a.sessionId || head.skillId !== a.skillId)) {
      flushSession();
    }
    current.push(a);
  }
  flushSession();

  // ---- Mastery entries: one entry per logged MasteryUpdate (K2 — never a
  // composite arc). The sentence is the engine's verbatim reason; structural
  // templates state only logged facts and never paraphrase a threshold (K3).
  for (const u of sortedUpdates) {
    entries.push({
      kind: "mastery",
      trigger: u.trigger,
      outcomeStatus: u.newStatus,
      skillId: u.skillId,
      skillTitle: titleOf(u.skillId),
      at: u.createdAt,
      startedAt: u.createdAt,
      sentence: masterySentence(u, titleOf(u.skillId)),
      arcLabel: null,
      session: null,
      evidence: {
        attemptIds: u.attemptId ? [u.attemptId] : [],
        masteryUpdateIds: [u.id],
        engineVersion: u.engineVersion,
      },
    });
  }

  // ---- Arc headers (K2): a NON-causal header joining events that share the
  // same blocked skillId. A lock event (newStatus "prerequisite_gap") names the
  // blocked node itself; we tag every entry on that skill with the arc label so
  // the UI can visually group them — no synthesized events, no causal prose.
  const blockedSkillIds = new Set(
    sortedUpdates.filter((u) => u.newStatus === "prerequisite_gap").map((u) => u.skillId),
  );
  for (const e of entries) {
    if (blockedSkillIds.has(e.skillId)) {
      e.arcLabel = `${titleOf(e.skillId)} — prerequisite arc`;
    }
  }

  // ---- Reverse-chronological output. Tie-break by id-bearing evidence so the
  // order is fully deterministic when two events share a timestamp.
  return entries.sort((a, b) => {
    const cmp = b.at.localeCompare(a.at);
    if (cmp !== 0) return cmp;
    return tieKey(b).localeCompare(tieKey(a));
  });
}

/** Stable secondary sort key (newest-first ties): mastery-update id, else first attempt id. */
function tieKey(e: DecisionTimelineEntry): string {
  return e.evidence.masteryUpdateIds[0] ?? e.evidence.attemptIds[0] ?? e.skillId;
}

/**
 * The sentence for a mastery entry. Per mr-kahn K1/K3: prefer the engine's
 * VERBATIM reason (it is already audit-grade, written for the learner). Where a
 * thin structural framing is added, it states only logged facts (date, status
 * transition, trigger) and never paraphrases a threshold.
 */
function masterySentence(u: MasteryUpdate, title: string): string {
  const date = dateOf(u.createdAt);
  switch (u.trigger) {
    case "diagnostic":
      // newStatus is "mastered" here. The reason already names the evidence.
      return `${date} — Credited ${title} from neutral Phase-3 diagnostic evidence. ${u.reason}`;
    case "credit-propagation":
      return `${date} — Credited ${title} as a prerequisite of demonstrated work. ${u.reason}`;
    case "decay":
      // The decay reason already states base × factor = score and the
      // elapsed days — surface it verbatim, no paraphrase.
      return `${date} — ${u.reason}`;
    case "attempt":
    default: {
      if (u.newStatus === "prerequisite_gap") {
        // K3: key on the status, use the verbatim engine reason.
        return `${date} — ${u.reason}`;
      }
      if (u.newStatus === "mastered") {
        return `${date} — ${u.reason}`;
      }
      // Any other recomputed transition — verbatim engine reason.
      return `${date} — ${u.reason}`;
    }
  }
}

/**
 * A node is "credited, not yet taught" (mr-kahn K4) iff its mastery came from a
 * diagnostic / credit-propagation update AND there is NO source="practice"
 * attempt newer than the latest newStatus="mastered" update. Lifetime checks
 * would mislabel a credited-then-practiced node — this is strictly "newer than".
 * Pure helper shared by the admin mastery map + the parent digest.
 */
export function isCreditedNotTaught(
  skillId: string,
  attempts: StudentAttempt[],
  updates: MasteryUpdate[],
): boolean {
  const masteredUpdates = updates
    .filter((u) => u.skillId === skillId && u.newStatus === "mastered")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const latestMastered = masteredUpdates[masteredUpdates.length - 1];
  if (!latestMastered) return false;
  const credited =
    latestMastered.trigger === "diagnostic" || latestMastered.trigger === "credit-propagation";
  if (!credited) return false;
  const newerPractice = attempts.some(
    (a) =>
      a.skillId === skillId &&
      a.source === "practice" &&
      a.createdAt.localeCompare(latestMastered.createdAt) > 0,
  );
  return !newerPractice;
}

/** Re-export so callers needn't pull MasteryResult through a second import. */
export type { MasteryResult, MasteryStatus };
