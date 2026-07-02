// scripts/merge-quad-banks.mjs
// One-off content-debt batch 6 merge (mr-kahn authored and approved all content):
// merges the 12 quadratics-domain problem-bank fragments in
// .authoring-tmp/ALG-Q01.json … ALG-Q12.json into data/algebra1-graph.json, then
// bumps schema.version to 1.8.0. Every fragment is validated before anything is
// assigned; any failure aborts the whole run before the graph file is written.
// Fragments are left in place as the audit trail until commit.
//
// Two allowed Quadratics conventions differ from earlier batches:
//   1. answer.kind may be "numeric", "choice", OR "coordinate" (Q06 vertex items).
//      Non-choice items may carry "choices": null.
//   2. p2 is NOT strictly 4-per-sport: p2 total is exactly 28 and every one of the
//      7 sports appears at least once. p1 IS strict 4-per-sport.
//
// Run once: node scripts/merge-quad-banks.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const graphPath = fileURLToPath(new URL("../data/algebra1-graph.json", import.meta.url));
const fragmentIds = [
  "ALG-Q01",
  "ALG-Q02",
  "ALG-Q03",
  "ALG-Q04",
  "ALG-Q05",
  "ALG-Q06",
  "ALG-Q07",
  "ALG-Q08",
  "ALG-Q09",
  "ALG-Q10",
  "ALG-Q11",
  "ALG-Q12",
];

const EXPECTED = { workedExamples: 2, p1: 28, p2: 28, p3: 6 };
const SPORTS = ["baseball", "softball", "basketball", "soccer", "football", "volleyball", "neutral"];
const PER_SPORT = 4; // p1 only: 4 problems per sport × 7 sports = 28
const DIFFICULTIES = new Set([1, 2, 3]);
const ANSWER_KINDS = new Set(["numeric", "choice", "coordinate"]);

const ACCEPTED_VERSIONS = new Set(["1.7.1"]);
const TARGET_VERSION = "1.8.0";

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
      if (!ANSWER_KINDS.has(p.answer?.kind)) {
        fail(id, `${bucket} problem ${p.id}: answer.kind "${p.answer?.kind}" not in {numeric, choice, coordinate}`);
      }
      for (const tag of Object.values(p.misconceptionMap ?? {})) {
        if (!nodeTags.has(tag)) {
          fail(id, `${bucket} problem ${p.id}: misconceptionMap value "${tag}" not in node misconceptionTags`);
        }
      }
      // For choice-kind answers, the problem must carry a choices[] that includes
      // answer.value and every misconceptionMap key. An empty misconceptionMap is
      // allowed (e.g. ALG-Q06 "opens up/down" items).
      if (p.answer?.kind === "choice") {
        if (!Array.isArray(p.choices)) {
          fail(id, `${bucket} problem ${p.id}: choice answer has no problem-level choices[]`);
        }
        if (!p.choices.includes(p.answer.value)) {
          fail(id, `${bucket} problem ${p.id}: choices[] does not include answer.value "${p.answer.value}"`);
        }
        for (const key of Object.keys(p.misconceptionMap ?? {})) {
          if (!p.choices.includes(key)) {
            fail(id, `${bucket} problem ${p.id}: choices[] does not include misconceptionMap key "${key}"`);
          }
        }
      }
      // For numeric-kind answers, every misconceptionMap key must be numerically
      // DISTINCT from answer.value.
      if (p.answer?.kind === "numeric") {
        for (const key of Object.keys(p.misconceptionMap ?? {})) {
          if (Number(key) === Number(p.answer.value)) {
            fail(id, `${bucket} problem ${p.id}: numeric misconceptionMap key "${key}" equals answer "${p.answer.value}"`);
          }
        }
      }
      if (seenProblemIds.has(p.id)) {
        fail(id, `${bucket} problem id "${p.id}" duplicates one in ${seenProblemIds.get(p.id)}`);
      }
      seenProblemIds.set(p.id, `${id}.${bucket}`);
      sportCounts.set(p.sport, (sportCounts.get(p.sport) ?? 0) + 1);
    }

    const extras = [...sportCounts.keys()].filter((s) => !SPORTS.includes(s));
    if (extras.length > 0) fail(id, `${bucket}: unknown sport(s): ${extras.join(", ")}`);

    if (bucket === "p1") {
      // Strict 4-per-sport.
      for (const sport of SPORTS) {
        if (sportCounts.get(sport) !== PER_SPORT) {
          fail(id, `p1: expected ${PER_SPORT} "${sport}" problems, got ${sportCounts.get(sport) ?? 0}`);
        }
      }
    } else if (bucket === "p2") {
      // Quadratics convention: 28 total (already checked), every sport present >=1.
      for (const sport of SPORTS) {
        if (!(sportCounts.get(sport) >= 1)) {
          fail(id, `p2: expected at least 1 "${sport}" problem, got ${sportCounts.get(sport) ?? 0}`);
        }
      }
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
  `Merged ${fragments.length} quadratics banks (${totalProblems} problems, ` +
    `${fragments.length * EXPECTED.workedExamples} worked examples); schema.version → ${TARGET_VERSION}.`,
);
