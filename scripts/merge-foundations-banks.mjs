// scripts/merge-foundations-banks.mjs
// One-off content-debt batch 1 merge (mr-kahn authored and approved all content):
// merges the 11 foundations problem-bank fragments in .authoring-tmp/ALG-F01.json
// … ALG-F11.json into data/algebra1-graph.json, then bumps schema.version to 1.3.0.
// Every fragment is validated before anything is assigned; any failure aborts the
// whole run before the graph file is written. Fragments are left in place as the
// audit trail until commit.
// Run once: node scripts/merge-foundations-banks.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const graphPath = fileURLToPath(new URL("../data/algebra1-graph.json", import.meta.url));
const fragmentIds = [
  "ALG-F01",
  "ALG-F02",
  "ALG-F03",
  "ALG-F04",
  "ALG-F05",
  "ALG-F06",
  "ALG-F07",
  "ALG-F08",
  "ALG-F09",
  "ALG-F10",
  "ALG-F11",
];

const EXPECTED = { workedExamples: 2, p1: 28, p2: 28, p3: 6 };
const SPORTS = ["baseball", "softball", "basketball", "soccer", "football", "volleyball", "neutral"];
const PER_SPORT = 4; // 4 problems per sport × 7 sports = 28 in each of p1 and p2
const DIFFICULTIES = new Set([1, 2, 3]);

// Spec said 1.2.1 → 1.3.0, but a parallel session's uncommitted hook scrub already
// moved the working tree to 1.2.2; both are accepted as the starting point.
const ACCEPTED_VERSIONS = new Set(["1.2.1", "1.2.2"]);
const TARGET_VERSION = "1.3.0";

const graph = JSON.parse(readFileSync(graphPath, "utf8"));

if (graph.schema.version === TARGET_VERSION) {
  console.log(`Graph is already at schema version ${TARGET_VERSION} — nothing to do.`);
  process.exit(0);
}
if (!ACCEPTED_VERSIONS.has(graph.schema.version)) {
  throw new Error(
    `Unexpected schema.version ${graph.schema.version}; expected one of ${[...ACCEPTED_VERSIONS].join(", ")}`,
  );
}

const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

// Seed global problem-id uniqueness with every problem id already in the graph.
const seenProblemIds = new Map(); // id -> where it was first seen
for (const node of graph.nodes) {
  for (const bucket of ["p1", "p2", "p3"]) {
    for (const p of node.problems?.[bucket] ?? []) {
      seenProblemIds.set(p.id, `${node.id}.${bucket} (pre-existing)`);
    }
  }
}

function fail(fragmentId, message) {
  throw new Error(`[${fragmentId}] ${message}`);
}

// ---- Phase 1: read and validate every fragment before assigning anything ----
const fragments = [];
for (const id of fragmentIds) {
  const fragmentPath = fileURLToPath(new URL(`../.authoring-tmp/${id}.json`, import.meta.url));
  const fragment = JSON.parse(readFileSync(fragmentPath, "utf8"));

  if (fragment.id !== id) fail(id, `fragment.id is "${fragment.id}", expected "${id}"`);

  const node = nodeById.get(id);
  if (!node) fail(id, "node not found in graph");
  if (!Array.isArray(node.workedExamples) || node.workedExamples.length !== 0) {
    fail(id, "node.workedExamples is not empty — refusing to overwrite");
  }
  for (const bucket of ["p1", "p2", "p3"]) {
    if (!Array.isArray(node.problems?.[bucket]) || node.problems[bucket].length !== 0) {
      fail(id, `node.problems.${bucket} is not empty — refusing to overwrite`);
    }
  }

  if (!Array.isArray(fragment.workedExamples) || fragment.workedExamples.length !== EXPECTED.workedExamples) {
    fail(id, `expected ${EXPECTED.workedExamples} workedExamples, got ${fragment.workedExamples?.length}`);
  }

  const nodeTags = new Set(node.misconceptionTags);
  for (const [bucket, phase] of [["p1", 1], ["p2", 2], ["p3", 3]]) {
    const problems = fragment.problems?.[bucket];
    if (!Array.isArray(problems) || problems.length !== EXPECTED[bucket]) {
      fail(id, `expected ${EXPECTED[bucket]} problems in ${bucket}, got ${problems?.length}`);
    }

    const sportCounts = new Map();
    for (const p of problems) {
      if (p.skillId !== id) fail(id, `${bucket} problem ${p.id}: skillId "${p.skillId}" !== node id`);
      if (p.phase !== phase) fail(id, `${bucket} problem ${p.id}: phase ${p.phase}, expected ${phase}`);
      if (phase === 3 && p.sport !== "neutral") {
        fail(id, `p3 problem ${p.id}: sport "${p.sport}", expected "neutral"`);
      }
      if (!DIFFICULTIES.has(p.difficulty)) {
        fail(id, `${bucket} problem ${p.id}: difficulty ${p.difficulty} not in {1,2,3}`);
      }
      for (const tag of Object.values(p.misconceptionMap ?? {})) {
        if (!nodeTags.has(tag)) {
          fail(id, `${bucket} problem ${p.id}: misconceptionMap tag "${tag}" not in node misconceptionTags`);
        }
      }
      if (seenProblemIds.has(p.id)) {
        fail(id, `${bucket} problem id "${p.id}" duplicates one in ${seenProblemIds.get(p.id)}`);
      }
      seenProblemIds.set(p.id, `${id}.${bucket}`);
      sportCounts.set(p.sport, (sportCounts.get(p.sport) ?? 0) + 1);
    }

    if (phase !== 3) {
      for (const sport of SPORTS) {
        if (sportCounts.get(sport) !== PER_SPORT) {
          fail(id, `${bucket}: expected ${PER_SPORT} "${sport}" problems, got ${sportCounts.get(sport) ?? 0}`);
        }
      }
      const extras = [...sportCounts.keys()].filter((s) => !SPORTS.includes(s));
      if (extras.length > 0) fail(id, `${bucket}: unknown sport(s): ${extras.join(", ")}`);
    }
  }

  fragments.push({ node, fragment });
}

// ---- Phase 2: all fragments valid — assign onto nodes and bump version ----
let totalProblems = 0;
for (const { node, fragment } of fragments) {
  node.workedExamples = fragment.workedExamples;
  node.problems.p1 = fragment.problems.p1;
  node.problems.p2 = fragment.problems.p2;
  node.problems.p3 = fragment.problems.p3;
  totalProblems += fragment.problems.p1.length + fragment.problems.p2.length + fragment.problems.p3.length;
}

graph.schema.version = TARGET_VERSION;

writeFileSync(graphPath, JSON.stringify(graph, null, 2) + "\n", "utf8");

console.log(
  `Merged ${fragments.length} foundations banks (${totalProblems} problems, ` +
    `${fragments.length * EXPECTED.workedExamples} worked examples); schema.version → ${TARGET_VERSION}.`,
);
