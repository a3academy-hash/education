// Curriculum graph access and query helpers.

import graphJson from "../../data/algebra1-graph.json";
import type { CurriculumGraph } from "../../types";

/**
 * The CONTENT graph version stamped onto every evidence row at write time
 * (C-G1). Source = the SAME bundled curriculum graph both repository backends
 * load via getGraph(): `schema.version`. This is the single source of truth for
 * the stamp — the curriculum_graphs "active" row may later be read ONLY as a
 * cross-check that RAISES on mismatch, never copied from (C-G1).
 *
 * Read once per request and reuse (C-G4); the bundled JSON is a process-level
 * constant, so repeated reads are free and cannot mid-request "flip".
 */
export function getLoadedGraphVersion(): string {
  const version = (graphJson as unknown as CurriculumGraph).schema.version;
  if (typeof version !== "string" || version.length === 0) {
    throw new Error("Loaded curriculum graph is missing schema.version.");
  }
  return version;
}
