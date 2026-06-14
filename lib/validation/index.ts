// lib/validation — structural + semantic validation for the curriculum graph.
// Pure TypeScript, NO runtime imports (type-only imports are erased), so this
// file runs unmodified under Node 24 type stripping via scripts/validate-graph.ts.

import type {
  SkillEdge,
  ValidationIssue,
  ValidationReport,
} from "../../types";
import { validateSemantics } from "./semantic.ts";

const VISUAL_KINDS = new Set(["numberline", "coordinate", "balance", "table", "area-model"]);

const SPORT_KEYS = [
  "baseball",
  "softball",
  "basketball",
  "soccer",
  "football",
  "volleyball",
  "neutral",
] as const;

const PHASE_BUCKETS = [
  ["p1", 1],
  ["p2", 2],
  ["p3", 3],
] as const;

// The renderable answer-kind set — codifies the kind↔widget contract so a
// future unknown kind fails loudly (any kind not here has no widget).
const KNOWN_ANSWER_KINDS = new Set([
  "numeric",
  "expression",
  "choice",
  "coordinate",
  "inequality",
  "numeric-set",
]);

// Loose internal view of a node after the SCHEMA pass. Fields are re-checked
// before use; this only exists to avoid `any` while staying pure.
type RawNode = {
  id: string;
  title?: unknown;
  domain?: unknown;
  tier?: unknown;
  prereqs: string[];
  standards?: { ccss?: unknown; state?: unknown };
  objective?: unknown;
  misconceptionTags: string[];
  visual?: unknown;
  contextHooks?: Record<string, unknown>;
  workedExamples?: unknown;
  problems?: Record<string, unknown>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

const EMPTY_STATS: ValidationReport["stats"] = {
  nodes: 0,
  edges: 0,
  domains: 0,
  roots: [],
  leaves: 0,
  maxDepth: 0,
};

export function validateGraph(raw: unknown): ValidationReport {
  const issues: ValidationIssue[] = [];
  const error = (
    code: ValidationIssue["code"],
    message: string,
    extra?: Partial<Pick<ValidationIssue, "nodeId" | "edge" | "path">>,
  ): void => {
    issues.push({ severity: "error", code, message, ...extra });
  };
  const warn = (
    code: ValidationIssue["code"],
    message: string,
    extra?: Partial<Pick<ValidationIssue, "nodeId" | "edge" | "path">>,
  ): void => {
    issues.push({ severity: "warning", code, message, ...extra });
  };
  const finish = (stats: ValidationReport["stats"]): ValidationReport => ({
    valid: !issues.some((i) => i.severity === "error"),
    stats,
    issues,
  });

  // ---- SCHEMA: top level ----------------------------------------------------
  if (!isRecord(raw)) {
    error("SCHEMA", "graph root must be a JSON object");
    return finish(EMPTY_STATS);
  }
  for (const key of ["schema", "domains", "misconceptionRegistry", "nodes", "edges"]) {
    if (!(key in raw)) error("SCHEMA", `missing required top-level key "${key}"`);
  }
  const schema = raw.schema;
  if (!isRecord(schema) || typeof schema.version !== "string" || typeof schema.course !== "string") {
    error("SCHEMA", "schema must be an object with string version and course");
  }
  if (!Array.isArray(raw.domains) || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
    error("SCHEMA", "domains, nodes, and edges must all be arrays");
    return finish(EMPTY_STATS);
  }
  const registryRaw = Array.isArray(raw.misconceptionRegistry) ? raw.misconceptionRegistry : [];
  if (!Array.isArray(raw.misconceptionRegistry)) {
    error("SCHEMA", "misconceptionRegistry must be an array");
  }

  // ---- SCHEMA: domains + registry entries ----------------------------------
  const domainTier = new Map<string, number>();
  for (const d of raw.domains) {
    if (!isRecord(d) || typeof d.id !== "string" || typeof d.label !== "string" || typeof d.tier !== "number") {
      error("SCHEMA", `domain entry is malformed: ${JSON.stringify(d)}`);
      continue;
    }
    domainTier.set(d.id, d.tier);
  }
  const registryIds = new Set<string>();
  for (const entry of registryRaw) {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.description !== "string") {
      error("SCHEMA", `misconceptionRegistry entry is malformed: ${JSON.stringify(entry)}`);
      continue;
    }
    registryIds.add(entry.id);
  }

  // ---- SCHEMA: nodes (collect well-formed ones for graph analysis) ---------
  const nodes: RawNode[] = [];
  const nodeIds = new Set<string>();
  const duplicateNodeIds = new Set<string>();
  for (const n of raw.nodes) {
    if (!isRecord(n) || typeof n.id !== "string" || n.id.length === 0) {
      error("SCHEMA", `node without a string id: ${JSON.stringify(n).slice(0, 120)}`);
      continue;
    }
    const id = n.id;
    const where = (msg: string) => error("SCHEMA", `node ${id}: ${msg}`, { nodeId: id });

    if (typeof n.title !== "string" || n.title.length === 0) where("title must be a non-empty string");
    if (typeof n.objective !== "string" || n.objective.length === 0) where("objective must be a non-empty string");
    if (typeof n.tier !== "number") where("tier must be a number");
    if (typeof n.domain !== "string") {
      where("domain must be a string");
    } else if (!domainTier.has(n.domain)) {
      where(`domain "${n.domain}" does not exist in domains[]`);
    }
    if (!isStringArray(n.prereqs)) where("prereqs must be an array of strings");
    if (!isStringArray(n.misconceptionTags)) where("misconceptionTags must be an array of strings");
    if (
      !isRecord(n.standards) ||
      !isStringArray(n.standards.ccss) ||
      !(typeof n.standards.state === "string" || n.standards.state === null)
    ) {
      where("standards must be { ccss: string[]; state: string | null }");
    }
    if (!(n.visual === null || (typeof n.visual === "string" && VISUAL_KINDS.has(n.visual)))) {
      where(`visual must be null or one of: ${[...VISUAL_KINDS].join(", ")}`);
    }
    if (!isRecord(n.contextHooks)) where("contextHooks must be an object keyed by sport");
    if (!Array.isArray(n.workedExamples)) where("workedExamples must be an array");
    if (
      !isRecord(n.problems) ||
      !Array.isArray(n.problems.p1) ||
      !Array.isArray(n.problems.p2) ||
      !Array.isArray(n.problems.p3)
    ) {
      where("problems must be { p1: []; p2: []; p3: [] }");
    }

    if (nodeIds.has(id)) {
      duplicateNodeIds.add(id);
    } else {
      nodeIds.add(id);
      nodes.push({
        ...n,
        id,
        prereqs: isStringArray(n.prereqs) ? n.prereqs : [],
        misconceptionTags: isStringArray(n.misconceptionTags) ? n.misconceptionTags : [],
        contextHooks: isRecord(n.contextHooks) ? n.contextHooks : undefined,
        problems: isRecord(n.problems) ? n.problems : undefined,
        standards: isRecord(n.standards) ? n.standards : undefined,
      } as RawNode);
    }
  }

  // ---- DUPLICATE_ID ---------------------------------------------------------
  for (const id of duplicateNodeIds) {
    error("DUPLICATE_ID", `duplicate node id "${id}"`, { nodeId: id });
  }
  const seenProblemIds = new Map<string, string>(); // problemId -> first owning node
  const duplicateProblemIds = new Set<string>();
  for (const node of nodes) {
    for (const [bucket] of PHASE_BUCKETS) {
      const list = node.problems?.[bucket];
      if (!Array.isArray(list)) continue;
      for (const p of list) {
        if (!isRecord(p) || typeof p.id !== "string") continue; // shape handled below
        if (seenProblemIds.has(p.id)) {
          if (!duplicateProblemIds.has(p.id)) {
            error(
              "DUPLICATE_ID",
              `duplicate problem id "${p.id}" (first seen on node ${seenProblemIds.get(p.id)})`,
              { nodeId: node.id },
            );
            duplicateProblemIds.add(p.id);
          }
        } else {
          seenProblemIds.set(p.id, node.id);
        }
      }
    }
  }

  // ---- INVALID_EDGE ----------------------------------------------------------
  const edges: SkillEdge[] = [];
  for (const e of raw.edges) {
    if (!isRecord(e) || typeof e.from !== "string" || typeof e.to !== "string") {
      error("SCHEMA", `edge entry is malformed: ${JSON.stringify(e)}`);
      continue;
    }
    const edge: SkillEdge = { from: e.from, to: e.to };
    edges.push(edge);
    if (edge.from === edge.to) {
      error("INVALID_EDGE", `self-loop edge ${edge.from} → ${edge.to}`, { edge });
      continue;
    }
    if (!nodeIds.has(edge.from)) {
      error("INVALID_EDGE", `edge references nonexistent node "${edge.from}"`, { edge });
    }
    if (!nodeIds.has(edge.to)) {
      error("INVALID_EDGE", `edge references nonexistent node "${edge.to}"`, { edge });
    }
  }
  for (const node of nodes) {
    for (const p of node.prereqs) {
      if (p === node.id) {
        error("INVALID_EDGE", `node ${node.id} lists itself as a prerequisite`, {
          nodeId: node.id,
          edge: { from: p, to: node.id },
        });
      } else if (!nodeIds.has(p)) {
        error("INVALID_EDGE", `node ${node.id} prereq references nonexistent node "${p}"`, {
          nodeId: node.id,
          edge: { from: p, to: node.id },
        });
      }
    }
  }

  // ---- EDGE_PREREQ_MISMATCH (prereqs are source of truth; edges mirror) -----
  const pairKey = (from: string, to: string) => `${from} ${to}`;
  const prereqPairs = new Map<string, SkillEdge>();
  for (const node of nodes) {
    for (const p of node.prereqs) prereqPairs.set(pairKey(p, node.id), { from: p, to: node.id });
  }
  const edgePairs = new Map<string, SkillEdge>();
  for (const edge of edges) edgePairs.set(pairKey(edge.from, edge.to), edge);
  for (const [key, edge] of prereqPairs) {
    if (!edgePairs.has(key)) {
      error(
        "EDGE_PREREQ_MISMATCH",
        `edges[] is missing ${edge.from} → ${edge.to} (declared in ${edge.to}.prereqs)`,
        { nodeId: edge.to, edge },
      );
    }
  }
  for (const [key, edge] of edgePairs) {
    if (!prereqPairs.has(key)) {
      error(
        "EDGE_PREREQ_MISMATCH",
        `edges[] contains ${edge.from} → ${edge.to}, but "${edge.from}" is not in ${edge.to}.prereqs`,
        { nodeId: edge.to, edge },
      );
    }
  }

  // ---- Dependency maps for ORPHAN / stats ------------------------------------
  const byId = new Map<string, RawNode>(nodes.map((n) => [n.id, n]));
  const dependentCount = new Map<string, number>();
  for (const node of nodes) {
    for (const p of node.prereqs) {
      if (nodeIds.has(p)) dependentCount.set(p, (dependentCount.get(p) ?? 0) + 1);
    }
  }

  // ---- ORPHAN -----------------------------------------------------------------
  for (const node of nodes) {
    const hasIncoming = node.prereqs.length > 0;
    const hasOutgoing = (dependentCount.get(node.id) ?? 0) > 0;
    if (!hasIncoming && !hasOutgoing) {
      error("ORPHAN", `node ${node.id} has no prerequisites and no dependents`, {
        nodeId: node.id,
      });
    }
  }

  // ---- CYCLE (iterative-friendly DFS over prereqs, O(nodes + edges)) ---------
  const color = new Map<string, 1 | 2>(); // 1 = in current stack, 2 = done
  const stack: string[] = [];
  const visit = (id: string): void => {
    color.set(id, 1);
    stack.push(id);
    const node = byId.get(id);
    for (const p of node?.prereqs ?? []) {
      const c = color.get(p);
      if (c === 1) {
        const start = stack.indexOf(p);
        const path = [...stack.slice(start), p];
        error("CYCLE", `prerequisite cycle detected: ${path.join(" → ")}`, {
          nodeId: p,
          path,
        });
      } else if (c === undefined && byId.has(p)) {
        visit(p);
      }
    }
    stack.pop();
    color.set(id, 2);
  };
  for (const node of nodes) {
    if (!color.has(node.id)) visit(node.id);
  }

  // ---- MISSING_STANDARDS -------------------------------------------------------
  for (const node of nodes) {
    const ccss = node.standards?.ccss;
    if (isStringArray(ccss) && ccss.length === 0) {
      error("MISSING_STANDARDS", `node ${node.id} has an empty standards.ccss list`, {
        nodeId: node.id,
      });
    }
  }

  // ---- MISSING_HOOK --------------------------------------------------------------
  for (const node of nodes) {
    if (!node.contextHooks) continue; // SCHEMA already reported
    for (const sport of SPORT_KEYS) {
      const hook = node.contextHooks[sport];
      if (typeof hook !== "string" || hook.trim() === "") {
        error("MISSING_HOOK", `node ${node.id} is missing a usable "${sport}" context hook`, {
          nodeId: node.id,
        });
      }
    }
  }

  // ---- PROBLEM_MISMATCH + UNKNOWN_MISCONCEPTION_TAG (problem side) --------------
  for (const node of nodes) {
    const tagSet = new Set(node.misconceptionTags);
    for (const [bucket, phase] of PHASE_BUCKETS) {
      const list = node.problems?.[bucket];
      if (!Array.isArray(list)) continue;
      for (const p of list) {
        if (!isRecord(p)) {
          error("SCHEMA", `node ${node.id}: problem in ${bucket} is not an object`, {
            nodeId: node.id,
          });
          continue;
        }
        const pid = typeof p.id === "string" ? p.id : "<no id>";
        if (p.phase !== phase) {
          error(
            "PROBLEM_MISMATCH",
            `node ${node.id}: problem ${pid} sits in bucket ${bucket} but declares phase ${String(p.phase)}`,
            { nodeId: node.id },
          );
        }
        if (p.skillId !== node.id) {
          error(
            "PROBLEM_MISMATCH",
            `node ${node.id}: problem ${pid} declares skillId "${String(p.skillId)}"`,
            { nodeId: node.id },
          );
        }
        // Structural enforcement of mastery-requires-neutral-transfer. Never weaken.
        if (phase === 3 && p.sport !== "neutral") {
          error(
            "PROBLEM_MISMATCH",
            `node ${node.id}: p3 problem ${pid} has sport "${String(p.sport)}" — phase 3 must be neutral`,
            { nodeId: node.id },
          );
        }
        if (isRecord(p.misconceptionMap)) {
          for (const tag of Object.values(p.misconceptionMap)) {
            if (typeof tag !== "string" || !tagSet.has(tag)) {
              error(
                "UNKNOWN_MISCONCEPTION_TAG",
                `node ${node.id}: problem ${pid} maps to tag "${String(tag)}" which is not in the node's misconceptionTags`,
                { nodeId: node.id },
              );
            }
          }
        }

        // ---- kind↔widget contract + choice integrity (LB3) -----------------
        // Codifies the answer kind set so an unknown kind (which would have no
        // renderable widget) fails loudly, and enforces that every `choice`
        // item carries a usable, self-consistent options set.
        const answer = p.answer;
        if (!isRecord(answer) || typeof answer.kind !== "string") {
          error(
            "PROBLEM_MISMATCH",
            `node ${node.id}: problem ${pid} has no readable answer.kind`,
            { nodeId: node.id },
          );
        } else if (!KNOWN_ANSWER_KINDS.has(answer.kind)) {
          error(
            "PROBLEM_MISMATCH",
            `node ${node.id}: problem ${pid} has unknown answer.kind "${answer.kind}" (no renderable widget)`,
            { nodeId: node.id },
          );
        } else if (answer.kind === "choice") {
          const choices = p.choices;
          const value = answer.value;
          if (!isStringArray(choices) || choices.length < 2) {
            error(
              "PROBLEM_MISMATCH",
              `node ${node.id}: choice problem ${pid} must have a choices[] of at least 2 strings`,
              { nodeId: node.id },
            );
          } else if (typeof value !== "string" || !choices.includes(value)) {
            error(
              "PROBLEM_MISMATCH",
              `node ${node.id}: choice problem ${pid} answer.value "${String(value)}" is not one of its choices`,
              { nodeId: node.id },
            );
          } else {
            // 3a — no duplicate choices, and at least one distractor exists.
            if (new Set(choices).size !== choices.length) {
              error(
                "PROBLEM_MISMATCH",
                `node ${node.id}: choice problem ${pid} has duplicate choices`,
                { nodeId: node.id },
              );
            }
            if (!choices.some((c) => c !== value)) {
              error(
                "PROBLEM_MISMATCH",
                `node ${node.id}: choice problem ${pid} has no distractor (every choice equals answer.value)`,
                { nodeId: node.id },
              );
            }
            // 3b — every misconceptionMap key is a real distractor.
            if (isRecord(p.misconceptionMap)) {
              for (const key of Object.keys(p.misconceptionMap)) {
                if (!choices.includes(key)) {
                  error(
                    "PROBLEM_MISMATCH",
                    `node ${node.id}: choice problem ${pid} misconceptionMap key "${key}" is not one of its choices`,
                    { nodeId: node.id },
                  );
                } else if (key === value) {
                  error(
                    "PROBLEM_MISMATCH",
                    `node ${node.id}: choice problem ${pid} misconceptionMap key "${key}" equals answer.value`,
                    { nodeId: node.id },
                  );
                }
              }
            }
          }
          // 3c — every misconceptionMap key's tag is in the node's tags. This
          // is also covered by the UNKNOWN_MISCONCEPTION_TAG pass above (which
          // reports under its own code); kept implicit to avoid double-report.
        }
      }
    }
  }

  // ---- TIER_MISMATCH ---------------------------------------------------------------
  for (const node of nodes) {
    if (typeof node.domain !== "string" || typeof node.tier !== "number") continue;
    const expected = domainTier.get(node.domain);
    if (expected !== undefined && node.tier !== expected) {
      error(
        "TIER_MISMATCH",
        `node ${node.id} has tier ${node.tier} but domain "${node.domain}" is tier ${expected}`,
        { nodeId: node.id },
      );
    }
  }

  // ---- UNKNOWN_MISCONCEPTION_TAG (node side) + unused-registry warnings -------------
  const usedTags = new Set<string>();
  for (const node of nodes) {
    for (const tag of node.misconceptionTags) {
      usedTags.add(tag);
      if (!registryIds.has(tag)) {
        error(
          "UNKNOWN_MISCONCEPTION_TAG",
          `node ${node.id} tag "${tag}" does not exist in misconceptionRegistry`,
          { nodeId: node.id },
        );
      }
    }
  }
  for (const id of registryIds) {
    if (!usedTags.has(id)) {
      warn("UNKNOWN_MISCONCEPTION_TAG", `registry entry "${id}" is not used by any node`);
    }
  }

  // ---- SEMANTIC: dedup rules (DUP_WORKED_EXAMPLE, NEAR_DUP_PROMPT, REUSED_TEXT) -----
  for (const issue of validateSemantics(nodes)) {
    issues.push(issue);
  }

  // ---- Stats --------------------------------------------------------------------------
  const roots = nodes.filter((n) => n.prereqs.length === 0).map((n) => n.id);
  const leaves = nodes.filter((n) => (dependentCount.get(n.id) ?? 0) === 0).length;

  // Longest prerequisite chain (edge count), memoized; cycle-guarded.
  const depthMemo = new Map<string, number>();
  const inProgress = new Set<string>();
  const depth = (id: string): number => {
    const memo = depthMemo.get(id);
    if (memo !== undefined) return memo;
    if (inProgress.has(id)) return 0; // cycle guard — CYCLE already reported
    inProgress.add(id);
    let d = 0;
    for (const p of byId.get(id)?.prereqs ?? []) {
      if (byId.has(p)) d = Math.max(d, depth(p) + 1);
    }
    inProgress.delete(id);
    depthMemo.set(id, d);
    return d;
  };
  let maxDepth = 0;
  for (const node of nodes) maxDepth = Math.max(maxDepth, depth(node.id));

  return finish({
    nodes: nodes.length,
    edges: edges.length,
    domains: domainTier.size,
    roots,
    leaves,
    maxDepth,
  });
}
