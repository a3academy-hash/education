// lib/digest/progress-digest.ts — the parent/student weekly digest (Phase 7 §B).
// PURE: no IO, no Date.now() (nowIso explicit), no email sending. Returns a
// serializable ProgressDigest DTO so a later Resend email job reuses this exact
// builder unchanged (architecture note B.3). Consumes the engine READ functions
// (computeMasteryAll.results, computeOverlay, recommend) — never a write method.
//
// HONESTY RULE (mr-kahn B.1 — binding): no percentage on a domain with no
// measured evidence (assessed:false → "Not yet assessed", never "0%"); the word
// "mastered" only where the engine says mastered.
//
// MASTERED-THIS-WEEK (mr-kahn K6): the window INCLUDES restoration
// (needs_review→mastered) and diagnostic/credit-propagation masteries, each
// tagged credited-vs-practiced. "unlocks" is relabeled "helps unlock" — a node
// isn't open until ALL its prereqs clear, so the DTO only ever claims "a
// prerequisite for".

import { computeMasteryAll } from "../mastery-engine";
import { computeOverlay } from "../graph/overlay";
import { recommend } from "../adaptive-router";
import { isCreditedNotTaught } from "../insight/decision-timeline";
import type {
  CurriculumGraph,
  DigestDomainStanding,
  DigestMasteredSkill,
  MasteryUpdate,
  ProgressDigest,
  StudentAttempt,
  StudentProfile,
  StudentSkillState,
} from "@/types";

const MS_PER_DAY = 86_400_000;
const WINDOW_DAYS = 7;

/** Humanize a ms duration into "Xh Ym" parent-legible form. */
function humanizeMs(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  if (totalMin <= 0) return "0 min";
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

/**
 * Build the weekly progress digest for one student.
 *
 * @param campusId staff/tenant scope (mr-gates G3); reserved for the RLS swap —
 *   a parent/student page is already self-scoped to their own record.
 */
export function buildProgressDigest(
  graph: CurriculumGraph,
  profile: StudentProfile,
  states: Record<string, StudentSkillState>,
  updates: MasteryUpdate[],
  attempts: StudentAttempt[],
  campusId: string | null,
  nowIso: string,
): ProgressDigest {
  void campusId;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const titleOf = (id: string): string => byId.get(id)?.title ?? id;

  const nowMs = Date.parse(nowIso);
  const windowStartMs = nowMs - WINDOW_DAYS * MS_PER_DAY;
  const windowStart = new Date(windowStartMs).toISOString();
  const inWindow = (iso: string): boolean => {
    const t = Date.parse(iso);
    return t >= windowStartMs && t <= nowMs;
  };

  const batch = computeMasteryAll(profile.id, states, graph, nowIso);
  const overlay = computeOverlay(graph, states, batch.results);

  // ---- Mastered this week. Include EVERY newStatus="mastered" update in the
  // window (K6: restoration + diagnostic + credit-propagation all count), latest
  // per skill so a restore supersedes the original earn. Tag credited vs
  // practiced via isCreditedNotTaught (K4 cutoff).
  const masteredBySkill = new Map<string, MasteryUpdate>();
  for (const u of [...updates].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  )) {
    if (u.newStatus === "mastered" && inWindow(u.createdAt)) {
      masteredBySkill.set(u.skillId, u);
    }
  }

  const dependents = new Map<string, string[]>();
  for (const n of graph.nodes) {
    for (const p of n.prereqs) {
      const list = dependents.get(p);
      if (list) list.push(n.id);
      else dependents.set(p, [n.id]);
    }
  }

  const masteredThisWeek: DigestMasteredSkill[] = [...masteredBySkill.values()]
    .map((u) => ({
      skillId: u.skillId,
      title: titleOf(u.skillId),
      credited: isCreditedNotTaught(u.skillId, attempts, updates),
      at: u.createdAt,
      // "helps unlock" — direct dependents this skill is a prerequisite for.
      helpsUnlock: (dependents.get(u.skillId) ?? []).map(titleOf),
    }))
    .sort((a, b) => b.at.localeCompare(a.at) || a.skillId.localeCompare(b.skillId));

  // ---- Split practiced vs credited by the per-row `credited` boolean (L1).
  // Mastery is sticky, so a credited skill later practiced emits no new mastered
  // update; isCreditedNotTaught already excludes credited rows that have a
  // newer source="practice" attempt. The split therefore matches the per-row
  // CreditedTag exactly. Both arrays preserve the recency sort above.
  const learnedThisWeek = masteredThisWeek.filter((m) => !m.credited);
  const creditedThisWeek = masteredThisWeek.filter((m) => m.credited);

  // ---- Current focus + verbatim reason (no engine jargon; reason is already
  // written for a 12-year-old).
  const rec = recommend(batch.results, states, graph);
  const courseComplete = rec.kind === "complete";
  const focusNode = rec.skillId ? byId.get(rec.skillId) : undefined;
  const currentFocus: ProgressDigest["currentFocus"] =
    courseComplete || !focusNode
      ? null
      : {
          skillId: focusNode.id,
          title: focusNode.title,
          objective: focusNode.objective,
          reason: rec.reason,
          leadsTo: (dependents.get(focusNode.id) ?? []).map(titleOf),
        };

  // ---- Time on task + attempt count in the window (practice + diagnostic both
  // count as time the student spent; the digest is about effort, not provenance).
  const windowAttempts = attempts.filter((a) => inWindow(a.createdAt));
  const timeMs = windowAttempts.reduce((s, a) => s + a.timeMs, 0);

  // ---- Per-domain standing. Honesty rule: a domain with NO attempted/probeable
  // evidence renders assessed:false. "Measured" = at least one node in the
  // domain has an attempt or a logged mastery update.
  const attemptedSkills = new Set(attempts.map((a) => a.skillId));
  const updatedSkills = new Set(updates.map((u) => u.skillId));
  const domains: DigestDomainStanding[] = graph.domains.map((d) => {
    const dp = overlay.summary.domainProgress[d.id];
    const domainSkillIds = graph.nodes.filter((n) => n.domain === d.id).map((n) => n.id);
    const assessed = domainSkillIds.some(
      (id) => attemptedSkills.has(id) || updatedSkills.has(id),
    );
    return {
      domainId: d.id,
      label: d.label,
      assessed,
      mastered: dp?.mastered ?? 0,
      total: dp?.total ?? domainSkillIds.length,
    };
  });

  return {
    studentId: profile.id,
    displayName: profile.displayName,
    windowStart,
    generatedAt: nowIso,
    masteredThisWeek,
    learnedThisWeek,
    creditedThisWeek,
    currentFocus,
    courseComplete,
    timeOnTask: humanizeMs(timeMs),
    attemptsThisWeek: windowAttempts.length,
    domains,
  };
}
