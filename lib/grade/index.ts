// lib/grade — the published, versioned 70/20/10 course-grade model (§14a,
// phase-7 R1/R2/R3). PURE TypeScript: no React, no IO, no Date.now() (nowIso is
// an explicit parameter). mr-kahn GATED.
//
// This is a DOCUMENTED PROJECTION of the deterministic mastery model — never a
// separate black-box number, never stored. It is recomputable from the graph,
// the per-skill states, and the immutable MasteryUpdate log it cites.
//
// NON-NEGOTIABLE INVARIANTS (do not weaken):
//   - SERVER-SIDE ONLY (R6): computeGrade runs in server components/actions.
//     NO "use client" module may import lib/grade. The grade is rendered, never
//     shipped as client state.
//   - LOCKED = locked-BY-TRANSFER, read from MasteryUpdate provenance (R1): a
//     node's 70% credit counts iff its LATEST mastered-making update has trigger
//     "attempt" (earned P3 transfer). Nodes whose only mastered-making update is
//     "diagnostic"/"credit-propagation" (provisional placement) are EXCLUDED →
//     provisionalExcluded[]. NEVER read "locked" from status alone.
//   - DENOMINATOR = credit-bearing nodes only (R2): isCreditBearingCode/creditTier
//     from lib/transcript (single source). Prerequisite-review nodes excluded.
//   - EFFORT/TIME is NEVER an input (CLAUDE §14 / §14a).
//   - creditEligible is FALSE until a summative assessment exists (the intake is
//     deferred — §14a credit requires full scope + summative + admin approval).

import { creditTier } from "../transcript";
import type {
  CurriculumGraph,
  MasteryUpdate,
  SkillNode,
  StudentSkillState,
} from "../../types";

/**
 * The published grading scale (0-100 → letter). FROZEN + versioned: changing any
 * boundary is a Matt human checkpoint and a version bump (the scale must be
 * published before the course begins, §14a). Standard +/- bands.
 */
export const GRADING_SCALE: { min: number; letter: string }[] = [
  { min: 97, letter: "A+" },
  { min: 93, letter: "A" },
  { min: 90, letter: "A-" },
  { min: 87, letter: "B+" },
  { min: 83, letter: "B" },
  { min: 80, letter: "B-" },
  { min: 77, letter: "C+" },
  { min: 73, letter: "C" },
  { min: 70, letter: "C-" },
  { min: 67, letter: "D+" },
  { min: 63, letter: "D" },
  { min: 60, letter: "D-" },
  { min: 0, letter: "F" },
];

/** Bump on ANY scale/weight change (Matt checkpoint). */
export const GRADING_SCALE_VERSION = "1.0.0";

/** Component weights — published, frozen (§14a). Sum to 1.0. */
export const GRADE_WEIGHTS = { mastery: 0.7, summative: 0.2, portfolio: 0.1 } as const;

/**
 * The verbatim FERPA disclaimer (R3). Rides the computeGrade output AND the NCAA
 * grade line. A3 is the curriculum/software provider — the parent is the
 * administrator of record; A3 does not issue grades or credit (§7, §14a).
 */
export const GRADE_DISCLAIMER =
  "Projected course grade — for the parent-administrator's reference; A3 does not issue grades or credit";

/** Map a 0-100 percentage to a letter via the published scale. */
export function letterFor(pct: number): string {
  const clamped = Math.min(100, Math.max(0, pct));
  for (const band of GRADING_SCALE) {
    if (clamped >= band.min) return band.letter;
  }
  return "F";
}

export interface GradeComponents {
  /** 70% — locked-by-transfer fraction over the credit-bearing denominator. */
  mastery: number;
  /** 20% — summative score (0 until the summative intake exists). */
  summative: number;
  /** 10% — real-work-product portfolio fraction over the same denominator. */
  portfolio: number;
}

export interface GradeOptions {
  /** Cumulative proctored/summative score as a 0-1 fraction. Absent until built. */
  summative?: number;
  /** ISO "now" — the view header records exactly this. Reserved for audit parity. */
  nowIso: string;
}

export interface CourseGrade {
  /** Weighted 0-100 projection. */
  pct: number;
  /** Letter from the published scale. */
  letter: string;
  components: GradeComponents;
  gradingScaleVersion: string;
  /** Node ids counted in the 70% (locked-by-transfer, credit-bearing). */
  locked: string[];
  /** Node ids EXCLUDED from the 70%: mastered only by diagnostic/credit-propagation. */
  provisionalExcluded: string[];
  /** False when no summative score was supplied (20% defaults to 0). */
  summativePresent: boolean;
  /** False until a summative exists — no 1.0 Algebra-1 credit before then (§14a). */
  creditEligible: boolean;
  /** Verbatim FERPA disclaimer (R3). */
  disclaimer: string;
}

/**
 * The latest MasteryUpdate that put a skill into "mastered" (newStatus ===
 * "mastered"), by skill, plus that update's trigger. createdAt asc, id asc
 * tie-break — the LAST such row wins (a restoration/earn supersedes an earlier
 * placement). Mirrors lib/transcript's masteredUpdateBySkill provenance read.
 */
function latestMasteredTriggerBySkill(
  updates: MasteryUpdate[],
): Map<string, MasteryUpdate["trigger"]> {
  const out = new Map<string, MasteryUpdate["trigger"]>();
  const ordered = [...updates].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  for (const u of ordered) {
    if (u.newStatus === "mastered") out.set(u.skillId, u.trigger);
  }
  return out;
}

/** Credit-bearing (HS-category) nodes — the 70% + 10% denominator (R2). */
function creditBearingNodes(graph: CurriculumGraph): SkillNode[] {
  return graph.nodes.filter((n) => creditTier(n) === "algebra1-credit");
}

/**
 * Compute the published 70/20/10 course grade. PURE.
 *
 * @param states  per-skill states (the student's current state map)
 * @param graph   the curriculum graph (credit-bearing scope is derived from it)
 * @param updates the immutable MasteryUpdate log — provenance for the 70%
 * @param opts    summative score (absent until built) + nowIso
 */
export function computeGrade(
  states: Record<string, StudentSkillState>,
  graph: CurriculumGraph,
  updates: MasteryUpdate[],
  opts: GradeOptions,
): CourseGrade {
  void opts.nowIso; // reserved for audit-header parity; never enters the math
  const denomNodes = creditBearingNodes(graph);
  const denom = denomNodes.length;
  const triggerBySkill = latestMasteredTriggerBySkill(updates);

  // --- 70%: locked-BY-TRANSFER over the credit-bearing denominator (R1/R2).
  const locked: string[] = [];
  const provisionalExcluded: string[] = [];
  for (const node of denomNodes) {
    const state = states[node.id];
    if (!state || state.status !== "mastered") continue; // not mastered → neither bucket
    const trigger = triggerBySkill.get(node.id);
    if (trigger === "attempt") {
      // Earned P3 transfer (incl. a restoration, which logs trigger "attempt").
      locked.push(node.id);
    } else {
      // Mastered only by diagnostic placement / credit-propagation — provisional.
      provisionalExcluded.push(node.id);
    }
  }
  const masteryComponent = denom === 0 ? 0 : locked.length / denom;

  // --- 20%: summative when present, else 0 (intake deferred — R12/§14a).
  const summativePresent = typeof opts.summative === "number";
  const summativeComponent = summativePresent
    ? Math.min(1, Math.max(0, opts.summative as number))
    : 0;

  // --- 10%: portfolio = credit-bearing nodes with REAL work-product (attempts > 0
  //     or lesson progress), NEVER diagnostic-credit-only (R2). Same denominator.
  let portfolioCount = 0;
  for (const node of denomNodes) {
    const state = states[node.id];
    if (state && state.attempts > 0) portfolioCount += 1;
  }
  const portfolioComponent = denom === 0 ? 0 : portfolioCount / denom;

  const pct =
    100 *
    (GRADE_WEIGHTS.mastery * masteryComponent +
      GRADE_WEIGHTS.summative * summativeComponent +
      GRADE_WEIGHTS.portfolio * portfolioComponent);

  return {
    pct,
    letter: letterFor(pct),
    components: {
      mastery: masteryComponent,
      summative: summativeComponent,
      portfolio: portfolioComponent,
    },
    gradingScaleVersion: GRADING_SCALE_VERSION,
    locked,
    provisionalExcluded,
    summativePresent,
    // §14a: 1.0 credit ONLY after FULL required scope is locked-by-transfer AND a
    // summative score exists (AND admin approval — a further human gate outside
    // this pure function). A summative score alone is NOT enough: partial-scope
    // completion can never export as full Algebra-1 credit (codex credit-before-
    // complete). Requires every credit-bearing node locked.
    creditEligible: summativePresent && denom > 0 && locked.length === denom,
    disclaimer: GRADE_DISCLAIMER,
  };
}
