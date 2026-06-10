// Graph validation report types (lib/validation).

import type { SkillEdge } from "./curriculum";

export interface ValidationIssue {
  severity: "error" | "warning";
  code:
    | "SCHEMA"
    | "DUPLICATE_ID"
    | "INVALID_EDGE"
    | "EDGE_PREREQ_MISMATCH"
    | "ORPHAN"
    | "CYCLE"
    | "MISSING_STANDARDS"
    | "MISSING_HOOK"
    | "PROBLEM_MISMATCH"
    | "TIER_MISMATCH"
    | "UNKNOWN_MISCONCEPTION_TAG";
  message: string;
  nodeId?: string;
  edge?: SkillEdge;
  path?: string[];
}

export interface ValidationReport {
  valid: boolean;
  stats: {
    nodes: number;
    edges: number;
    domains: number;
    roots: string[];
    leaves: number;
    maxDepth: number;
  };
  issues: ValidationIssue[];
}
