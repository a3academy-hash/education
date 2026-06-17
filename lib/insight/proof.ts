// lib/insight/proof — pure builders for the parent dashboard's proof modules
// (R9) and stuck-node list (R8). PURE: no IO, no Date.now().
//
// Proof band (R9):
//   - "confirmed"    : locked-by-transfer (earned via attempt, the §3 delayed-
//                      unseen path) — passed an unseen re-check after a delay.
//   - "likely_solid" : status mastered but NOT in the locked-by-transfer set
//                      (a diagnostic/credit-propagation placement, provisional).
//   - "still_proving": anything else the student has touched.
//
// Stuck nodes (R8): nodes flagged stalled OR sitting in prerequisite_gap/
// developing with real attempts. The failing TRANSFER DIMENSION is not exposed by
// the engine read this phase, so we DOCUMENT the downgrade and surface
// "struggling with {title}" instead of silently dropping the signal (CLAUDE §13).

import type {
  CurriculumGraph,
  FlagEntry,
  MasteryResult,
  MasteryUpdate,
  StudentSkillState,
} from "../../types";
import type { ProofBand, ProofModuleData } from "../../components/insight/ProofModule";

/** Latest re-check (mastered-making attempt update) date per skill, ISO. */
function lastRecheckBySkill(updates: MasteryUpdate[]): Map<string, string> {
  const out = new Map<string, string>();
  const ordered = [...updates].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  for (const u of ordered) {
    if (u.newStatus === "mastered" && u.trigger === "attempt") out.set(u.skillId, u.createdAt);
  }
  return out;
}

/**
 * Build proof modules for the credit-bearing nodes the student has touched.
 * `lockedIds` is the locked-by-transfer set from computeGrade (provenance). PURE.
 *
 * @param creditNodeIds ordered ids of the credit-bearing nodes to surface
 */
export function buildProofModules(
  graph: CurriculumGraph,
  states: Record<string, StudentSkillState>,
  results: Record<string, MasteryResult>,
  updates: MasteryUpdate[],
  lockedIds: ReadonlySet<string>,
  creditNodeIds: string[],
): ProofModuleData[] {
  const titleOf = new Map(graph.nodes.map((n) => [n.id, n.title]));
  const recheck = lastRecheckBySkill(updates);
  const out: ProofModuleData[] = [];

  for (const id of creditNodeIds) {
    const state = states[id];
    if (!state) continue; // only surface touched nodes
    const status = results[id]?.status ?? state.status;
    let band: ProofBand;
    let confirmed: boolean;
    if (lockedIds.has(id) && status === "mastered") {
      band = "confirmed";
      confirmed = true;
    } else if (status === "mastered") {
      band = "likely_solid";
      confirmed = false;
    } else {
      band = "still_proving";
      confirmed = false;
    }
    out.push({
      skillId: id,
      title: titleOf.get(id) ?? id,
      band,
      evidenceCount: state.attempts,
      confirmed,
      lastRecheckAt: recheck.get(id) ?? null,
    });
  }
  return out;
}

export interface StuckNode {
  skillId: string;
  title: string;
  /** Plain-English line — "struggling with {title}" (transfer dimension TBD, R8). */
  message: string;
}

/**
 * Stuck nodes for the parent dashboard (R8). Surfaces nodes the student is
 * struggling with: those carrying a "stalled-node" flag, or in prerequisite_gap.
 * The engine read does not expose the failing transfer dimension this phase — we
 * DOCUMENT that downgrade here rather than drop the signal. PURE.
 */
export function buildStuckNodes(
  graph: CurriculumGraph,
  results: Record<string, MasteryResult>,
  flags: FlagEntry[],
): StuckNode[] {
  const titleOf = new Map(graph.nodes.map((n) => [n.id, n.title]));
  const stuck = new Map<string, StuckNode>();

  const add = (id: string) => {
    if (stuck.has(id)) return;
    const title = titleOf.get(id) ?? id;
    // DOWNGRADE (R8): no transfer-dimension read available → plain struggling line.
    stuck.set(id, { skillId: id, title, message: `Struggling with ${title}` });
  };

  for (const f of flags) {
    if (f.kind === "stalled-node" && f.skillId) add(f.skillId);
  }
  for (const [id, r] of Object.entries(results)) {
    if (r.status === "prerequisite_gap") add(id);
  }

  // Deterministic order: graph node order.
  const order = new Map(graph.nodes.map((n, i) => [n.id, i]));
  return [...stuck.values()].sort(
    (a, b) => (order.get(a.skillId) ?? 0) - (order.get(b.skillId) ?? 0),
  );
}
