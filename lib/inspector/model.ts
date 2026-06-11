// lib/inspector — PURE view-model for the Graph Inspector (Phase 5 §A). No
// React, no IO. Derives an authoring-progress / validation dashboard from a
// RAW graph value by calling validateGraph(raw) DIRECTLY — so an INVALID graph
// still produces a renderable model (the page can show the invalid banner +
// issues; getRepository().getGraph() would throw and never render it).
//
// PURE READ. No new engine logic, no new validation codes. The coverage matrix
// is counts derived from the graph as-authored; it is an authoring dashboard,
// not a correctness check.

import { validateGraph } from "../validation";
import { creditTier } from "../transcript";
import type {
  CurriculumGraph,
  SkillEdge,
  SkillNode,
  Sport,
  ValidationIssue,
  ValidationReport,
} from "../../types";

const SPORTS: Sport[] = [
  "baseball",
  "softball",
  "basketball",
  "soccer",
  "football",
  "volleyball",
  "neutral",
];

export interface NodeDetail {
  id: string;
  title: string;
  domain: string;
  tier: number;
  prereqs: string[];
  dependents: string[];
  ccss: string[];
  state: string | null;
  creditTier: "algebra1-credit" | "prerequisite-review";
  misconceptionTags: string[];
  visual: string | null;
  workedExamples: number;
  /** per-sport hook present + per-phase problem counts. */
  coverage: NodeCoverage;
}

export interface NodeCoverage {
  /** sport → hook present (non-empty string). */
  hooks: Record<Sport, boolean>;
  p1: number;
  p2: number;
  p3: number;
}

export interface CoverageMatrixRow {
  nodeId: string;
  title: string;
  domain: string;
  cells: { sport: Sport; hook: boolean; p1: number; p2: number; p3: number }[];
}

export interface InspectorModel {
  /** validation outcome — drives the banner. */
  valid: boolean;
  schemaVersion: string | null;
  course: string | null;
  stats: ValidationReport["stats"];
  errorCount: number;
  warningCount: number;
  /** issues grouped by severity, original order preserved within each group. */
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** Detail rows + edge list + coverage are only populated for a valid graph. */
  nodes: NodeDetail[];
  edges: SkillEdge[];
  coverage: CoverageMatrixRow[];
  /** True when validateGraph could not parse the graph into usable nodes. */
  structureUnavailable: boolean;
}

function emptyHooks(): Record<Sport, boolean> {
  return {
    baseball: false,
    softball: false,
    basketball: false,
    soccer: false,
    football: false,
    volleyball: false,
    neutral: false,
  };
}

function nodeCoverage(node: SkillNode): NodeCoverage {
  const hooks = emptyHooks();
  for (const sport of SPORTS) {
    const hook = node.contextHooks?.[sport];
    hooks[sport] = typeof hook === "string" && hook.trim() !== "";
  }
  return {
    hooks,
    p1: node.problems?.p1?.length ?? 0,
    p2: node.problems?.p2?.length ?? 0,
    p3: node.problems?.p3?.length ?? 0,
  };
}

/**
 * Build the inspector model from a RAW graph value. Calls validateGraph(raw)
 * directly. When the graph is valid, the raw value is a CurriculumGraph and we
 * project node detail + edges + the coverage matrix; when invalid we still
 * return the banner + grouped issues (detail/coverage may be empty).
 */
export function buildInspectorModel(raw: unknown): InspectorModel {
  const report = validateGraph(raw);
  const errors = report.issues.filter((i) => i.severity === "error");
  const warnings = report.issues.filter((i) => i.severity === "warning");

  // Pull schema header defensively (raw may be malformed on the invalid path).
  let schemaVersion: string | null = null;
  let course: string | null = null;
  if (raw && typeof raw === "object") {
    const schema = (raw as { schema?: unknown }).schema;
    if (schema && typeof schema === "object") {
      const v = (schema as { version?: unknown }).version;
      const c = (schema as { course?: unknown }).course;
      if (typeof v === "string") schemaVersion = v;
      if (typeof c === "string") course = c;
    }
  }

  // Detail/coverage are only trustworthy for a VALID graph (the validator
  // guarantees node shape there). For an invalid graph we render the banner +
  // issues and leave structure unavailable.
  let nodes: NodeDetail[] = [];
  let edges: SkillEdge[] = [];
  let coverage: CoverageMatrixRow[] = [];
  let structureUnavailable = true;

  if (report.valid && raw && typeof raw === "object") {
    const graph = raw as CurriculumGraph;
    const dependents = new Map<string, string[]>();
    for (const n of graph.nodes) {
      for (const p of n.prereqs) {
        const list = dependents.get(p);
        if (list) list.push(n.id);
        else dependents.set(p, [n.id]);
      }
    }
    nodes = graph.nodes.map((n) => ({
      id: n.id,
      title: n.title,
      domain: n.domain,
      tier: n.tier,
      prereqs: [...n.prereqs],
      dependents: dependents.get(n.id) ?? [],
      ccss: [...n.standards.ccss],
      state: n.standards.state,
      creditTier: creditTier(n),
      misconceptionTags: [...n.misconceptionTags],
      visual: n.visual,
      workedExamples: n.workedExamples.length,
      coverage: nodeCoverage(n),
    }));
    edges = graph.edges.map((e) => ({ from: e.from, to: e.to }));
    coverage = graph.nodes.map((n) => {
      const cov = nodeCoverage(n);
      return {
        nodeId: n.id,
        title: n.title,
        domain: n.domain,
        cells: SPORTS.map((sport) => ({
          sport,
          hook: cov.hooks[sport],
          p1: cov.p1,
          p2: cov.p2,
          p3: cov.p3,
        })),
      };
    });
    structureUnavailable = false;
  }

  return {
    valid: report.valid,
    schemaVersion,
    course,
    stats: report.stats,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
    nodes,
    edges,
    coverage,
    structureUnavailable,
  };
}

export { SPORTS as INSPECTOR_SPORTS };
