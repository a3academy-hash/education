// lib/mastery-engine — deterministic mastery scoring + status transitions.
// Pure TypeScript: no React, no IO, no Date.now()/Math.random(). "Now" is
// always an explicit ISO parameter. mr-kahn gated (CLAUDE.md).
//
// STATUS LADDER (evaluated in this order, per node):
//   1. EVER-MASTERED PATH (masteredAt ≠ null) — exempt from prerequisite_gap
//      entirely. Status stays "mastered" (sticky — including when the decayed
//      score sits between reviewTrigger and mastered) UNLESS a review trigger
//      fires: decayed score < reviewTrigger AND ≥ 1 full day has elapsed since
//      lastAttemptAt (under one day the decay branch is INERT regardless of
//      score — a just-mastered node is never demoted on "decay" at near-zero
//      elapsed time; mr-kahn rule), OR recent.length ≥ 2 with
//      recentAcc < recentDip (the attempt-evidence branch — fires at any
//      elapsed time) → "needs_review". Once persisted as
//      "needs_review", the ONLY way back to "mastered" is RESTORATION:
//      recent.length ≥ minAttempts.restore AND recentAcc ≥ restoreAccuracy
//      AND at least one recent entry with phase === 3 && correct. A 1/1
//      window must NOT restore (floor of 2). Restoration is signalled by a
//      proposed MasteryUpdate (trigger "attempt", reason "Review passed…")
//      whose application refreshes masteredAt (caller resets recent[] per the
//      convention on StudentSkillState).
//   2. NOT-EVER-MASTERED: prerequisite_gap if ANY prereq has lockingGap —
//      overrides everything below.
//   3. mastered: score ≥ thresholds.mastered AND transfer === true AND
//      attempts ≥ minAttempts.mastered. (The acceleration path does not pass
//      here — diagnostic credit sets masteredAt directly via updates,
//      entering the sticky path with NO attempts floor; mr-kahn approved.)
//   4. unknown (attempts === 0) → introduced (attempts < statusBands) →
//      developing (score < nearMastery) → near_mastery (score ≥ nearMastery).
//
// lockingGap(prereq): (masteredAt == null && score < prereqGate) OR
// (masteredAt ≠ null && recent.length ≥ lockConfirm && (recent.length === 2
// ? both incorrect : recentAcc < recentDip)). PURE DECAY ON AN EVER-MASTERED
// PREREQ NEVER LOCKS — it yields needs_review, served first by the router.
// Exactly-2-attempt window: 0/2 locks, 1/2 does not.

import type {
  CurriculumGraph,
  MasteryBatchResult,
  MasteryConfig,
  MasteryResult,
  MasteryStatus,
  NewMasteryUpdate,
  RecentAttempt,
  SkillNode,
  StudentSkillState,
  TimingFlag,
} from "@/types";

/** Bump on ANY config or logic change — stamped on every proposed MasteryUpdate. */
export const ENGINE_VERSION = "1.0.0";

/**
 * THE single home of the 0.7 prerequisite gate — lib/graph/overlay.ts
 * re-exports MASTERY_GATE from here. Changing ANY value below is a Matt
 * human checkpoint (CLAUDE.md: mastery model weights / status thresholds).
 */
export const MASTERY_CONFIG: MasteryConfig = {
  weights: { recent: 0.5, overall: 0.2, consistency: 0.15, hintFactor: 0.15 },
  thresholds: {
    prereqGate: 0.7,
    mastered: 0.85,
    reviewTrigger: 0.75,
    recentDip: 0.6,
    nearMastery: 0.7,
    developing: 0.0,
    restoreAccuracy: 0.8,
  },
  minAttempts: { mastered: 3, statusBands: 3, lockConfirm: 2, restore: 2 },
  transfer: { window: 5, required: 2 },
  decay: { halfLifeDays: 21, floor: 0.4 },
  timing: { rushingMs: 5000, stallingMs: 240000 },
};

const MS_PER_DAY = 86_400_000;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

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

/** Geometric weights, most recent first (recent[] is most-recent-LAST). */
const GEO_WEIGHTS = [16, 8, 4, 2, 1];

/**
 * Geometrically weighted accuracy over the recent window (most recent
 * weighted highest). Returns null when the window is empty.
 */
function recentAccuracy(recent: RecentAttempt[]): number | null {
  if (recent.length === 0) return null;
  let num = 0;
  let den = 0;
  const newestFirst = [...recent].slice(-GEO_WEIGHTS.length).reverse();
  newestFirst.forEach((r, i) => {
    num += GEO_WEIGHTS[i] * (r.correct ? 1 : 0);
    den += GEO_WEIGHTS[i];
  });
  return num / den;
}

/** 1 − population variance of recent corrects, normalized by the 0.25 max. */
function consistencyOf(recent: RecentAttempt[]): number {
  if (recent.length === 0) return 1;
  const vals: number[] = recent.map((r) => (r.correct ? 1 : 0));
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length;
  return clamp01(1 - variance / 0.25);
}

/** floor + (1 − floor) · 2^(−days/halfLife). lastAttemptAt null → factor 1. */
function decayFactor(lastAttemptAt: string | null, nowIso: string, cfg: MasteryConfig): number {
  if (lastAttemptAt === null) return 1;
  const elapsed = Date.parse(nowIso) - Date.parse(lastAttemptAt);
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 1;
  const days = elapsed / MS_PER_DAY;
  const { floor, halfLifeDays } = cfg.decay;
  return floor + (1 - floor) * 2 ** (-days / halfLifeDays);
}

function timingFlags(recent: RecentAttempt[], cfg: MasteryConfig): TimingFlag[] {
  if (recent.length === 0) return [];
  const times = recent.map((r) => r.timeMs).sort((a, b) => a - b);
  const mid = Math.floor(times.length / 2);
  const median = times.length % 2 === 1 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
  if (median < cfg.timing.rushingMs) return ["rushing"];
  if (median > cfg.timing.stallingMs) return ["stalling"];
  return [];
}

/**
 * Undecayed base score: clamp01(weighted blend). attempts === 0 → 0.
 * When recent[] is empty but attempts > 0 (the post-mastery reset convention),
 * recentAcc falls back to overall accuracy — without this, every freshly
 * mastered/restored node would instantly trip the review trigger.
 */
function baseScoreFor(state: StudentSkillState, cfg: MasteryConfig): number {
  if (state.attempts === 0) return 0;
  const overallAcc = state.correct / state.attempts;
  const recentAcc = recentAccuracy(state.recent) ?? overallAcc;
  const consistency = consistencyOf(state.recent);
  const hintRate = Math.min(1, state.hints / state.attempts);
  const w = cfg.weights;
  return clamp01(
    w.recent * recentAcc +
      w.overall * overallAcc +
      w.consistency * consistency +
      w.hintFactor * (1 - hintRate),
  );
}

/** Decayed score: baseScoreFor × decayFactor. */
function scoreFor(state: StudentSkillState, nowIso: string, cfg: MasteryConfig): number {
  return baseScoreFor(state, cfg) * decayFactor(state.lastAttemptAt, nowIso, cfg);
}

/** Elapsed ms since the last attempt; null when never attempted or unparseable. */
function elapsedSinceLastAttempt(state: StudentSkillState, nowIso: string): number | null {
  if (state.lastAttemptAt === null) return null;
  const elapsed = Date.parse(nowIso) - Date.parse(state.lastAttemptAt);
  return Number.isFinite(elapsed) ? elapsed : null;
}

/**
 * Does this prerequisite's evidence lock its dependents? See the lockingGap
 * rule in the ladder comment above. Consumes the computed MasteryResult —
 * callers must never re-derive from raw state.
 */
export function lockingGap(result: MasteryResult, state: StudentSkillState): boolean {
  const cfg = MASTERY_CONFIG;
  if (state.masteredAt === null) return result.score < cfg.thresholds.prereqGate;
  const n = state.recent.length;
  if (n < cfg.minAttempts.lockConfirm) return false; // pure decay never locks
  if (n === 2) return state.recent.every((r) => !r.correct); // 0/2 locks, 1/2 does not
  const acc = recentAccuracy(state.recent);
  return acc !== null && acc < cfg.thresholds.recentDip;
}

function restorationMet(state: StudentSkillState, cfg: MasteryConfig): boolean {
  if (state.recent.length < cfg.minAttempts.restore) return false; // 1/1 must NOT restore
  const acc = recentAccuracy(state.recent);
  if (acc === null || acc < cfg.thresholds.restoreAccuracy) return false;
  return state.recent.some((r) => r.phase === 3 && r.correct);
}

function statusFor(
  state: StudentSkillState,
  score: number,
  lockedByPrereq: boolean,
  cfg: MasteryConfig,
  nowIso: string,
): MasteryStatus {
  // 1. Ever-mastered path — exempt from prerequisite_gap entirely.
  if (state.masteredAt !== null) {
    if (state.status === "needs_review") {
      return restorationMet(state, cfg) ? "mastered" : "needs_review";
    }
    // Diagnostic-credit nodes (no attempt evidence) cannot slip: the raw
    // score of 0 is an artifact of having no attempts, not of decay.
    if (state.attempts === 0) return "mastered";
    const acc = recentAccuracy(state.recent);
    // COUPLING NOTE (mr-gates): this review-dip floor REUSES
    // minAttempts.lockConfirm — the prerequisite-lock confirmation floor.
    // Changing the lock floor silently changes review sensitivity too;
    // both are Matt-checkpoint values (CLAUDE.md).
    const dip =
      state.recent.length >= cfg.minAttempts.lockConfirm &&
      acc !== null &&
      acc < cfg.thresholds.recentDip;
    // mr-kahn rule: the decay branch (score < reviewTrigger) may fire ONLY
    // when ≥ 1 full day has elapsed since lastAttemptAt. Under one day it is
    // INERT regardless of score — a just-mastered node must never be demoted
    // for "decay" at near-zero elapsed time. The attempt-evidence branch
    // (dip) is unchanged and fires at any elapsed time.
    const elapsed = elapsedSinceLastAttempt(state, nowIso);
    const decayed =
      elapsed !== null && elapsed >= MS_PER_DAY && score < cfg.thresholds.reviewTrigger;
    if (decayed || dip) return "needs_review";
    return "mastered"; // sticky, including decayed scores in [reviewTrigger, mastered)
  }
  // 2. Gap override.
  if (lockedByPrereq) return "prerequisite_gap";
  // 3. Fresh mastery (requires demonstrated P3 transfer — no exceptions).
  if (
    score >= cfg.thresholds.mastered &&
    state.transfer &&
    state.attempts >= cfg.minAttempts.mastered
  ) {
    return "mastered";
  }
  // 4. Evidence bands.
  if (state.attempts === 0) return "unknown";
  if (state.attempts < cfg.minAttempts.statusBands) return "introduced";
  return score >= cfg.thresholds.nearMastery ? "near_mastery" : "developing";
}

/** Plain-English reason for a proposed status change. */
function reasonFor(
  state: StudentSkillState,
  next: MasteryStatus,
  score: number,
  blockingPrereqTitle: string | null,
  nowIso: string,
  cfg: MasteryConfig,
): string {
  if (next === "prerequisite_gap" && blockingPrereqTitle) {
    return `Locked: the prerequisite skill ${blockingPrereqTitle} needs strengthening first.`;
  }
  if (next === "needs_review") {
    const acc = recentAccuracy(state.recent);
    const dip =
      state.recent.length >= cfg.minAttempts.lockConfirm &&
      acc !== null &&
      acc < cfg.thresholds.recentDip;
    if (dip) {
      return "Recent attempts slipped below the accuracy line — a short review brings it back.";
    }
    // Decay-branch demotion: the reason must carry the undecayed base score,
    // the decay factor, and the elapsed days (mr-kahn: never claim decay at
    // zero elapsed time — the decay branch only fires at ≥ 1 elapsed day).
    const base = baseScoreFor(state, cfg);
    const factor = decayFactor(state.lastAttemptAt, nowIso, cfg);
    const days = (elapsedSinceLastAttempt(state, nowIso) ?? 0) / MS_PER_DAY;
    return `Mastered earlier, but after ${days.toFixed(1)} days without practice the score decayed below the review line (base ${base.toFixed(2)} × decay factor ${factor.toFixed(2)} = ${score.toFixed(2)}) — a short review brings it back.`;
  }
  if (next === "mastered" && state.status === "needs_review") {
    return "Review passed: recent practice, including a correct neutral problem, restored mastery.";
  }
  if (next === "mastered") {
    return "Mastered: score above the bar, with transfer demonstrated on neutral problems.";
  }
  return `Status recomputed from current evidence: ${state.status} → ${next} (score ${score.toFixed(2)}).`;
}

/**
 * Compute mastery for every node in the graph, in topological prerequisite
 * order. O(nodes + edges). NEVER mutates inputs.
 *
 * proposedUpdates: one NewMasteryUpdate per node PRESENT IN `states` whose
 * computed status differs from the persisted status (nodes absent from
 * `states` have no persisted row to update). Trigger is "attempt" when
 * recent-window evidence explains the change (restoration, dips, fresh
 * mastery), "decay" when no new attempt evidence does (e.g. mastered →
 * needs_review via pure decay).
 */
export function computeMasteryAll(
  studentId: string,
  states: Record<string, StudentSkillState>,
  graph: CurriculumGraph,
  nowIso: string,
): MasteryBatchResult {
  const cfg = MASTERY_CONFIG;
  const st = (id: string): StudentSkillState => states[id] ?? blankState();
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  // Topological order over prereqs (Kahn), deterministic in node order.
  const inDegree = new Map(graph.nodes.map((n) => [n.id, n.prereqs.length]));
  const dependents = new Map<string, string[]>();
  for (const n of graph.nodes) {
    for (const p of n.prereqs) {
      const list = dependents.get(p);
      if (list) list.push(n.id);
      else dependents.set(p, [n.id]);
    }
  }
  const queue = graph.nodes.filter((n) => n.prereqs.length === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const d of dependents.get(id) ?? []) {
      const remaining = (inDegree.get(d) ?? 0) - 1;
      inDegree.set(d, remaining);
      if (remaining === 0) queue.push(d);
    }
  }
  // lib/validation guarantees acyclicity at graph import — this guard is
  // defensive: a cycle would otherwise silently drop nodes from the results.
  if (order.length !== graph.nodes.length) {
    throw new Error(
      `computeMasteryAll: graph is not acyclic — ${graph.nodes.length - order.length} node(s) left unresolved by topological processing`,
    );
  }

  const results: Record<string, MasteryResult> = {};
  for (const id of order) {
    const node = byId.get(id);
    if (!node) continue;
    const state = st(id);
    const score = scoreFor(state, nowIso, cfg);
    const flags = timingFlags(state.recent, cfg);
    // Prereq results exist by topological order; lockingGap consumes them.
    const locked =
      state.masteredAt === null &&
      node.prereqs.some((p) => lockingGap(results[p], st(p)));
    results[id] = { score, status: statusFor(state, score, locked, cfg, nowIso), flags };
  }

  const proposedUpdates: NewMasteryUpdate[] = [];
  for (const node of graph.nodes) {
    const state = states[node.id];
    if (!state) continue; // no persisted row — nothing to update
    const result = results[node.id];
    if (result.status === state.status) continue;
    const blockingPrereq =
      result.status === "prerequisite_gap"
        ? node.prereqs.find((p) => lockingGap(results[p], st(p)))
        : undefined;
    proposedUpdates.push({
      studentId,
      skillId: node.id,
      attemptId: null,
      trigger: state.recent.length > 0 ? "attempt" : "decay",
      prevMastery: state.mastery,
      newMastery: result.score,
      prevStatus: state.status,
      newStatus: result.status,
      prevPhase: state.phase,
      newPhase: state.phase,
      reason: reasonFor(
        state,
        result.status,
        result.score,
        blockingPrereq ? (byId.get(blockingPrereq)?.title ?? blockingPrereq) : null,
        nowIso,
        cfg,
      ),
      engineVersion: ENGINE_VERSION,
    });
  }

  return { results, proposedUpdates };
}

/**
 * Convenience wrapper over the batch — same numbers, guaranteed.
 * Throws if skillId is not a graph node.
 */
export function computeMastery(
  states: Record<string, StudentSkillState>,
  skillId: string,
  graph: CurriculumGraph,
  nowIso: string,
): MasteryResult {
  const result = computeMasteryAll("", states, graph, nowIso).results[skillId];
  if (!result) throw new Error(`Unknown skill: ${skillId}`);
  return result;
}

/**
 * Diagnostic credit propagation: demonstrated mastery of a node implies its
 * prerequisite ancestry — credit it downward so strong students accelerate
 * past material they've already proven, without busywork.
 */
export function propagateDiagnosticCredit(
  graph: CurriculumGraph,
  demonstrated: string[],
): Set<string> {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const credited = new Set<string>();
  const visit = (id: string) => {
    if (credited.has(id)) return;
    credited.add(id);
    for (const p of byId.get(id)?.prereqs ?? []) visit(p);
  };
  demonstrated.forEach(visit);
  return credited;
}

/** Per-node outcome when diagnostic credit declines to touch a node. */
export interface DiagnosticCreditSkip {
  skillId: string;
  reason: string;
}

export interface DiagnosticCreditResult {
  updates: NewMasteryUpdate[];
  skipped: DiagnosticCreditSkip[];
}

/**
 * INVARIANT (mr-kahn required): credit-propagation may fire ONLY from neutral
 * Phase-3 evidence on the evidencing node, ONLY along declared prerequisite
 * edges; every propagated reason must name the evidencing node and its
 * evidence. Applying these updates sets masteredAt on each credited node (the
 * diagnostic mastery path — enters the sticky ever-mastered ladder with no
 * attempts floor), and the caller resets recent[] per the StudentSkillState
 * convention.
 *
 * SKIP RULES (mr-kahn, applied to propagated ANCESTORS only — never to
 * demonstrated nodes, whose fresh direct neutral-P3 evidence supersedes any
 * stale state):
 * - IDEMPOTENCE: an ancestor whose current status is "mastered" emits
 *   nothing (never overwrite masteredAt / trigger the recent[] reset) —
 *   recorded in `skipped` with reason "already mastered".
 * - CONTRARY EVIDENCE: skip when attempts > 0 AND (status ∈ {developing,
 *   needs_review} OR (recent.length ≥ minAttempts.lockConfirm AND
 *   recentAccuracy(recent) < thresholds.recentDip)). The recent-accuracy
 *   clause uses actual recent[] entries only — NO lifetime fallback here.
 *   Recorded with reason "direct contrary attempt evidence on the node".
 * - Skips are node-local: propagation continues through a skipped node to
 *   its own ancestors (the demonstrated evidence still implies them).
 * All prevMastery/prevStatus/prevPhase values are TRUE prevs read from the
 * existing state (blank-state defaults only when no state row exists).
 */
export function creditFromDiagnostic(
  studentId: string,
  graph: CurriculumGraph,
  demonstrated: string[],
  states: Record<string, StudentSkillState>,
  nowIso: string,
): DiagnosticCreditResult {
  const cfg = MASTERY_CONFIG;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const date = nowIso.slice(0, 10);
  const updates: NewMasteryUpdate[] = [];
  const skipped: DiagnosticCreditSkip[] = [];
  const visited = new Set<string>();
  const st = (id: string): StudentSkillState => states[id] ?? blankState();

  const baseUpdate = (skillId: string): Omit<NewMasteryUpdate, "trigger" | "reason"> => {
    const prev = st(skillId);
    return {
      studentId,
      skillId,
      attemptId: null,
      prevMastery: prev.mastery,
      newMastery: MASTERY_CONFIG.thresholds.mastered,
      prevStatus: prev.status,
      newStatus: "mastered",
      prevPhase: prev.phase,
      newPhase: 3,
      engineVersion: ENGINE_VERSION,
    };
  };

  // COUPLING NOTE (mr-gates): the recent-dip clause below reuses
  // minAttempts.lockConfirm and thresholds.recentDip — the prerequisite-lock
  // confirmation values. Changing those silently changes credit-skip
  // sensitivity too; all are Matt-checkpoint values (CLAUDE.md).
  const contraryEvidence = (s: StudentSkillState): boolean => {
    if (s.attempts === 0) return false;
    if (s.status === "developing" || s.status === "needs_review") return true;
    if (s.recent.length >= cfg.minAttempts.lockConfirm) {
      const acc = recentAccuracy(s.recent);
      if (acc !== null && acc < cfg.thresholds.recentDip) return true;
    }
    return false;
  };

  const visitAncestors = (id: string, evidencingId: string) => {
    for (const p of byId.get(id)?.prereqs ?? []) {
      if (visited.has(p)) continue;
      visited.add(p);
      const s = st(p);
      if (s.status === "mastered") {
        skipped.push({ skillId: p, reason: "already mastered" });
      } else if (contraryEvidence(s)) {
        skipped.push({ skillId: p, reason: "direct contrary attempt evidence on the node" });
      } else {
        const evidencing = byId.get(evidencingId);
        updates.push({
          ...baseUpdate(p),
          trigger: "credit-propagation",
          reason: `Credited as a prerequisite of ${evidencing?.title ?? evidencingId} (${evidencingId}), which was demonstrated with neutral Phase-3 evidence on the ${date} diagnostic.`,
        });
      }
      visitAncestors(p, evidencingId);
    }
  };

  // Demonstrated nodes first (always credited — regardless of prior status),
  // so a node that is both demonstrated and an ancestor of another
  // demonstrated node still gets the "diagnostic" trigger.
  const demonstratedNodes = demonstrated.filter((d) => byId.has(d) && !visited.has(d));
  for (const d of demonstratedNodes) {
    visited.add(d);
    const node = byId.get(d) as SkillNode;
    updates.push({
      ...baseUpdate(d),
      trigger: "diagnostic",
      reason: `Demonstrated ${node.title} (${d}) with neutral Phase-3 evidence on the ${date} diagnostic.`,
    });
  }
  for (const d of demonstratedNodes) visitAncestors(d, d);

  return { updates, skipped };
}
