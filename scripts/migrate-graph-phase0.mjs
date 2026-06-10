// scripts/migrate-graph-phase0.mjs
// ONE-SHOT AND IRREVERSIBLE BY DESIGN: this migration consumed and deleted
// data/misconception-registry.tmp.json; git history is the rollback.
// One-off Phase 0 data migration for data/algebra1-graph.json (mr-kahn approved):
//   a) add 3 missing prerequisite links (prereqs are source of truth; edges mirror them)
//   b) add "workedExamples": [] to every node (empty by design, like problem banks)
//   c) merge data/misconception-registry.tmp.json as top-level "misconceptionRegistry",
//      apply 4 approved tag renames in registry + node misconceptionTags, sort by id
//   d) update schema.notes; bump schema.version to 1.1.0
//   e) delete the tmp registry file after a successful merge
// Run once: node scripts/migrate-graph-phase0.mjs

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const graphPath = fileURLToPath(new URL("../data/algebra1-graph.json", import.meta.url));
const tmpRegistryPath = fileURLToPath(
  new URL("../data/misconception-registry.tmp.json", import.meta.url),
);

const graph = JSON.parse(readFileSync(graphPath, "utf8"));

if (graph.schema.version === "1.1.0") {
  console.log("Graph is already at schema version 1.1.0 — nothing to do.");
  process.exit(0);
}

// ---- (a) new prerequisite links: prereqs first, then mirror into edges[] ----
const newLinks = [
  { from: "ALG-L03", to: "ALG-Q06" },
  { from: "ALG-L03", to: "ALG-P04" },
  { from: "ALG-Q03", to: "ALG-Q07" },
];

const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
for (const { from, to } of newLinks) {
  const node = nodeById.get(to);
  if (!node) throw new Error(`Migration target node not found: ${to}`);
  if (!nodeById.has(from)) throw new Error(`Migration prereq node not found: ${from}`);
  if (!node.prereqs.includes(from)) node.prereqs.push(from);
  if (!graph.edges.some((e) => e.from === from && e.to === to)) {
    graph.edges.push({ from, to });
  }
}

// ---- (c) registry merge + approved tag renames ----
const renames = new Map([
  ["solves-b-with-arithmetic-slip", "b-as-given-y-coordinate"],
  ["expands-incorrectly", "point-slope-partial-distribution"],
  ["stops-at-no-progress", "transposes-in-circles"],
  ["reads-f(x)-as-multiplication", "reads-fx-as-multiplication"],
]);
const newDescriptions = new Map([
  [
    "b-as-given-y-coordinate",
    "Assumes b equals the y-coordinate of the known point instead of solving for it after substituting the point and slope.",
  ],
  [
    "point-slope-partial-distribution",
    "When expanding y − y₁ = m(x − x₁), distributes m to x only, omitting the m·x₁ product.",
  ],
  [
    "transposes-in-circles",
    "Moves the same terms back and forth across the equals sign without consolidating variable terms on one side when variables appear on both sides.",
  ],
]);

if (!existsSync(tmpRegistryPath)) {
  throw new Error(`Registry source not found: ${tmpRegistryPath}`);
}
const registry = JSON.parse(readFileSync(tmpRegistryPath, "utf8")).misconceptionRegistry;
if (!Array.isArray(registry) || registry.length === 0) {
  throw new Error("misconception-registry.tmp.json: misconceptionRegistry missing or empty");
}

const mergedRegistry = registry
  .map((entry) => {
    const id = renames.get(entry.id) ?? entry.id;
    const description = newDescriptions.get(id) ?? entry.description;
    return { id, description };
  })
  .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

// Apply renames in every node's misconceptionTags; (b) add workedExamples to every node.
// Rebuild each node to pin key order: ... contextHooks, workedExamples, problems.
graph.nodes = graph.nodes.map((n) => {
  const { problems, ...rest } = n;
  return {
    ...rest,
    misconceptionTags: n.misconceptionTags.map((t) => renames.get(t) ?? t),
    workedExamples: n.workedExamples ?? [],
    problems,
  };
});

// ---- (d) schema updates ----
graph.schema.version = "1.1.0";
graph.schema.notes =
  "prereqs[] are the source of truth; edges[] must mirror them exactly (validated). problems p1/p2/p3 and workedExamples are authored later per prompts/03-curriculum-graph-builder.md; misconceptionTags must exist in the top-level misconceptionRegistry; standards codes pending mr-kahn verification pass";

// Rebuild top level so misconceptionRegistry lands directly after domains.
const output = {
  schema: graph.schema,
  domains: graph.domains,
  misconceptionRegistry: mergedRegistry,
  nodes: graph.nodes,
  edges: graph.edges,
};

writeFileSync(graphPath, JSON.stringify(output, null, 2) + "\n", "utf8");

// ---- (e) remove the tmp registry file after a successful merge ----
unlinkSync(tmpRegistryPath);

console.log(
  `Migrated to 1.1.0: nodes=${output.nodes.length} edges=${output.edges.length} registry=${mergedRegistry.length}`,
);
