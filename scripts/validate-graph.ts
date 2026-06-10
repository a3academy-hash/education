// scripts/validate-graph.ts — runs under plain `node` (Node 24 type stripping).
// Erasable TypeScript only: no enums, no namespaces, no parameter properties.

import { readFileSync } from "node:fs";
import { validateGraph } from "../lib/validation/index.ts";

const graphUrl = new URL("../data/algebra1-graph.json", import.meta.url);
const raw: unknown = JSON.parse(readFileSync(graphUrl, "utf8"));

const report = validateGraph(raw);
const errors = report.issues.filter((i) => i.severity === "error");
const warnings = report.issues.filter((i) => i.severity === "warning");

console.log("Curriculum graph validation — data/algebra1-graph.json");
console.log(
  `Stats: nodes=${report.stats.nodes} edges=${report.stats.edges} domains=${report.stats.domains} leaves=${report.stats.leaves} maxDepth=${report.stats.maxDepth}`,
);
console.log(`Roots: ${report.stats.roots.join(", ") || "(none)"}`);

console.log(`\nErrors (${errors.length}):`);
for (const issue of errors) {
  const where = issue.nodeId ? ` [node ${issue.nodeId}]` : "";
  console.log(`  [${issue.code}]${where} ${issue.message}`);
}

console.log(`\nWarnings (${warnings.length}):`);
for (const issue of warnings) {
  const where = issue.nodeId ? ` [node ${issue.nodeId}]` : "";
  console.log(`  [${issue.code}]${where} ${issue.message}`);
}

console.log(`\nRESULT: ${report.valid ? "VALID" : "INVALID"}`);
if (!report.valid) process.exitCode = 1;
