// lib/engine-v2/fragile.ts — "fast but fragile" detection (Phase 8 R2 / mr-kahn).
// The §3/§8 Alpha failure mode: a node acquired FAST but NOT holding up on a
// delayed retrieval. PURE, read-side, derived from the LIVE attempt log + the
// existing lib/retention scheduler — NEVER a magic halflife constant, never a
// faked durability number (trust-layer rule).
//
// FIREWALL (Phase 8 R5): imports NOTHING from gate.ts / session.ts /
// mastery-engine. This module is advisory/guardrail only — it can never alter a
// lock or mastery decision. (It does import lib/retention for OVERDUE scheduling,
// which is itself scheduling-only and isolated from mastery math.)
//
// STATUS semantics (mr-kahn 1a — NEVER call an unmeasured node fragile):
//   • "fragile"    = mastered AND acquired fast AND evidence it is NOT holding
//                    (a FAILED retention probe after mastery, OR a scheduled
//                    retention probe is OVERDUE with no passing probe yet).
//   • "holding"    = mastered but NOT fragile (acquired slow, OR a passed
//                    delayed probe, OR no overdue check).
//   • "unmeasured" = mastered, acquired fast, but no probe taken AND none overdue
//                    yet — there is NO retrieval evidence either way, so we make
//                    NO durability claim. Never fragile.
//   • not mastered → "unmeasured" (nothing to assess).

import { retentionStatus } from "../retention";
import type {
  CurriculumGraph,
  MasteryUpdate,
  SkillNode,
  StudentAttempt,
  StudentSkillState,
} from "@/types";

export type FragilityStatus = "fragile" | "holding" | "unmeasured";

export interface FragilityConfig {
  /**
   * "Acquired fast" threshold: a node whose graded attempt count AT mastery is at
   * or below this many attempts was picked up quickly. The smaller the count, the
   * less retrieval practice backs the mastery, so a delayed check matters more.
   *
   * MATT THRESHOLD CHECKPOINT: this is a motivational/coaching cut point, not a
   * mastery weight — it never enters lock/mastery math — but it IS calibratable
   * telemetry and should be tuned against real fast-acquisition retention data.
   * 6 is a deliberate starting value (roughly the minimum graded attempts to
   * cross the bar without much spaced reinforcement).
   */
  fastThreshold: number;
}

export const DEFAULT_FRAGILE_CONFIG: FragilityConfig = {
  fastThreshold: 6,
};

export interface FragilityAssessment {
  status: FragilityStatus;
  /** Factual reason string (count/date only — no editorializing). */
  reason: string;
}

/** Graded attempts to mastery — StudentSkillState.attempts is that running count. */
function acquiredFast(state: StudentSkillState, cfg: FragilityConfig): boolean {
  return state.attempts <= cfg.fastThreshold;
}

/**
 * Assess one node's fragility. PURE; reads committed state, the attempt log, and
 * the retention schedule (via lib/retention). Never alters any lock/mastery
 * decision (it imports nothing from gate.ts/session.ts/mastery-engine).
 *
 * @param node     the skill node
 * @param state    its committed StudentSkillState (may be undefined)
 * @param attempts the immutable attempt log (all skills)
 * @param updates  the immutable mastery-update log (feeds retention scheduling)
 * @param nowIso   explicit "now"
 */
export function assessFragility(
  node: SkillNode,
  state: StudentSkillState | undefined,
  attempts: StudentAttempt[],
  updates: MasteryUpdate[],
  nowIso: string,
  cfg: FragilityConfig = DEFAULT_FRAGILE_CONFIG,
): FragilityAssessment {
  if (!state || state.masteredAt == null) {
    return { status: "unmeasured", reason: "Not mastered" };
  }

  const masteredAtMs = Date.parse(state.masteredAt);

  // Retention probes on THIS node taken AFTER mastery (source-tagged provenance;
  // never engine math). A passed delayed probe = positive durability evidence.
  let passedProbe = false;
  let failedProbe = false;
  let lastFailedAt: string | null = null;
  for (const a of attempts) {
    if (a.skillId !== node.id || a.source !== "retention") continue;
    if (Date.parse(a.createdAt) <= masteredAtMs) continue;
    if (a.correct) passedProbe = true;
    else {
      failedProbe = true;
      if (lastFailedAt === null || a.createdAt > lastFailedAt) lastFailedAt = a.createdAt;
    }
  }

  // A passed delayed probe → holding, regardless of acquisition speed.
  if (passedProbe) {
    return { status: "holding", reason: "Passed a delayed retention check" };
  }

  // Slow acquisition is not the Alpha failure mode — not fragile.
  if (!acquiredFast(state, cfg)) {
    return {
      status: "holding",
      reason: `Acquired over ${state.attempts} attempts`,
    };
  }

  // Fast acquisition. Fragile iff there is NEGATIVE durability evidence:
  //   (a) a FAILED retention probe after mastery, or
  //   (b) a scheduled retention probe is OVERDUE (lib/retention) with no pass.
  if (failedProbe) {
    return {
      status: "fragile",
      reason: `Picked up in ${state.attempts} attempts; missed a retention check on ${(lastFailedAt ?? state.masteredAt).slice(0, 10)}`,
    };
  }

  const rs = retentionStatus(node, state, updates, attempts, nowIso);
  if (rs.due && rs.dueAt !== null) {
    return {
      status: "fragile",
      reason: `Picked up in ${state.attempts} attempts; retention check overdue since ${rs.dueAt.slice(0, 10)}`,
    };
  }

  // Fast, but no probe taken AND none overdue yet — no retrieval evidence either
  // way. Make NO durability claim (mr-kahn 1a).
  return {
    status: "unmeasured",
    reason: `Picked up in ${state.attempts} attempts; no retention check due yet`,
  };
}

export interface NodeFragility extends FragilityAssessment {
  skillId: string;
}

/**
 * Per-node fragility across the graph (graph node order). PURE, read-side. Returns
 * ONLY mastered nodes (the only nodes a durability claim is meaningful for) — a
 * node that is not mastered carries no entry.
 */
export function studentFragility(
  states: Record<string, StudentSkillState>,
  attempts: StudentAttempt[],
  updates: MasteryUpdate[],
  graph: CurriculumGraph,
  nowIso: string,
  cfg: FragilityConfig = DEFAULT_FRAGILE_CONFIG,
): NodeFragility[] {
  const out: NodeFragility[] = [];
  for (const node of graph.nodes) {
    const state = states[node.id];
    if (!state || state.masteredAt == null) continue;
    const a = assessFragility(node, state, attempts, updates, nowIso, cfg);
    out.push({ skillId: node.id, ...a });
  }
  return out;
}
