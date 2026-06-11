// lib/transcript — the standards explosion (Phase 5 §C). PURE TypeScript: no
// React, no IO, no Date.now(). Builds a per-student CCSS transcript by rolling
// each graph node up into the standards codes it carries, using a WEAKEST-LINK
// (conjunctive) rule. This is a REGENERABLE VIEW — never stored — so it can
// never drift from the immutable MasteryUpdate log it cites for provenance.
//
// INVARIANTS (mr-kahn gated, do not weaken):
//   - A standard is "mastered" ONLY if EVERY contributing node is mastered.
//     Never any-node→mastered (that over-claims credit). Never a numeric
//     average (that fabricates a status the engine never assigned).
//   - Credit / NCAA claims derive ONLY from the creditBearing section.
//   - creditTier is DERIVED here from the CCSS code prefix — NEVER authored
//     into data/algebra1-graph.json.

import type {
  CreditTier,
  CurriculumGraph,
  MasteryStatus,
  MasteryUpdate,
  SkillNode,
  StandardTranscriptRow,
  StudentSkillState,
  StudentStandardTranscript,
} from "../../types";

/**
 * HS conceptual-category prefixes (Common Core). A CCSS code in the high-school
 * conceptual categories — Algebra (A-), Functions (F-), Number & Quantity (N-),
 * Statistics & Probability (S-), Geometry (G-) — is Algebra-1 credit-bearing.
 * Middle-school codes (e.g. "7.NS.A.1", "8.EE.C.7b") begin with a grade digit
 * and are prerequisite-review. The rule is purely the leading token before the
 * first ".": if it starts with one of these category letters, it is HS credit.
 */
const HS_CATEGORY_PREFIXES = ["A-", "F-", "N-", "S-", "G-"] as const;

/** DERIVED: is this single CCSS code an HS conceptual-category (credit) code? */
export function isCreditBearingCode(ccss: string): boolean {
  return HS_CATEGORY_PREFIXES.some((p) => ccss.startsWith(p));
}

/**
 * DERIVED creditTier for a node: "algebra1-credit" iff ANY of its ccss codes is
 * an HS conceptual-category code; else "prerequisite-review". (A node can mix a
 * support code with a credit code; carrying any credit code makes the node
 * credit-relevant. Per-ROW tier, below, is keyed off the individual code.)
 */
export function creditTier(node: SkillNode): CreditTier {
  return node.standards.ccss.some(isCreditBearingCode)
    ? "algebra1-credit"
    : "prerequisite-review";
}

// Status "advancement" ladder for the weakest-link pick. Mirrors the display
// ranking used elsewhere in the app (summary page). Higher = more advanced.
// "mastered" is the ceiling; needs_review and near_mastery share a tier (both
// are "post-developing but not credit"), so we keep needs_review just below
// near_mastery to surface review state as the weaker of the two. This ladder
// is ONLY a tie-break for picking the LEAST-ADVANCED contributing status — it
// never produces a status; every status returned is one a node actually holds.
const STATUS_RANK: Record<MasteryStatus, number> = {
  prerequisite_gap: 0,
  unknown: 1,
  introduced: 2,
  developing: 3,
  needs_review: 4,
  near_mastery: 5,
  mastered: 6,
};

/** A node counts as mastered (sticky) iff its current status is "mastered". */
function isMastered(state: StudentSkillState | undefined): boolean {
  return state?.status === "mastered";
}

function stateStatus(state: StudentSkillState | undefined): MasteryStatus {
  return state?.status ?? "unknown";
}

interface BuildOpts {
  studentId: string;
  courseId: string;
  /** ISO timestamp; the view header records exactly this. */
  generatedAt: string;
}

/**
 * Build the per-student standards transcript from the graph, the student's
 * per-skill states, and the immutable MasteryUpdate log.
 *
 * Roll-up per CCSS code:
 *   - componentSkillIds: every node carrying the code (graph node order).
 *   - status: "mastered" iff EVERY component node is mastered; otherwise the
 *     LEAST-ADVANCED component node's status (weakest link).
 *   - masteredCount/totalCount: "N of M component skills mastered".
 *   - evidenceUpdateIds: the masteredAt-bearing MasteryUpdate ids for the
 *     mastered component nodes (latest mastered update per node) — provenance
 *     back into the append-only log.
 */
export function buildStandardTranscript(
  graph: CurriculumGraph,
  states: Record<string, StudentSkillState>,
  masteryUpdates: MasteryUpdate[],
  opts: BuildOpts,
): StudentStandardTranscript {
  // For each skill, the id of the LATEST MasteryUpdate that put it into
  // "mastered" (newStatus === "mastered"). createdAt asc, id asc tie-break —
  // we take the last such row so a restoration supersedes the original earn.
  const masteredUpdateBySkill = new Map<string, string>();
  const ordered = [...masteryUpdates].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  for (const u of ordered) {
    if (u.newStatus === "mastered") masteredUpdateBySkill.set(u.skillId, u.id);
  }

  // CCSS code → contributing nodes (preserve graph node order, dedupe nodes).
  const codeToNodes = new Map<string, SkillNode[]>();
  const codeIsCredit = new Map<string, boolean>();
  for (const node of graph.nodes) {
    for (const ccss of node.standards.ccss) {
      const list = codeToNodes.get(ccss);
      if (list) list.push(node);
      else codeToNodes.set(ccss, [node]);
      if (!codeIsCredit.has(ccss)) codeIsCredit.set(ccss, isCreditBearingCode(ccss));
    }
  }

  const creditBearing: StandardTranscriptRow[] = [];
  const prerequisiteReview: StandardTranscriptRow[] = [];

  // Deterministic output: standards sorted by code (stable, audit-friendly).
  const codes = [...codeToNodes.keys()].sort((a, b) => a.localeCompare(b));
  for (const ccss of codes) {
    const nodes = codeToNodes.get(ccss) ?? [];
    const componentSkillIds = nodes.map((n) => n.id);
    const totalCount = nodes.length;

    let masteredCount = 0;
    let leastAdvanced: MasteryStatus = "mastered";
    let leastRank = STATUS_RANK.mastered;
    const evidenceUpdateIds: string[] = [];

    for (const node of nodes) {
      const state = states[node.id];
      const status = stateStatus(state);
      if (isMastered(state)) {
        masteredCount += 1;
        const updId = masteredUpdateBySkill.get(node.id);
        if (updId) evidenceUpdateIds.push(updId);
      }
      const rank = STATUS_RANK[status];
      if (rank < leastRank) {
        leastRank = rank;
        leastAdvanced = status;
      }
    }

    // WEAKEST-LINK: mastered ONLY if every node mastered; else least-advanced.
    const status: MasteryStatus =
      masteredCount === totalCount && totalCount > 0 ? "mastered" : leastAdvanced;

    const row: StandardTranscriptRow = {
      ccss,
      creditTier: codeIsCredit.get(ccss) ? "algebra1-credit" : "prerequisite-review",
      status,
      componentSkillIds,
      masteredCount,
      totalCount,
      evidenceUpdateIds,
    };

    if (row.creditTier === "algebra1-credit") creditBearing.push(row);
    else prerequisiteReview.push(row);
  }

  return {
    studentId: opts.studentId,
    courseId: opts.courseId,
    graphSchemaVersion: graph.schema.version,
    generatedAt: opts.generatedAt,
    creditBearing,
    prerequisiteReview,
  };
}
