// Structural validator for the Systems batch fragments (.authoring-tmp/ALG-S0[1-6].json).
// Checks counts, per-sport distribution, phase/bucket alignment, p3-neutral, difficulty,
// global id uniqueness, and choice-item integrity (choices present, answer.value in choices,
// every misconceptionMap key in choices). Arithmetic correctness is left to the mr-kahn audit.
import fs from "fs";
import path from "path";

const dir = "D:/a3_education/.authoring-tmp";
const SPORTS = ["baseball","softball","basketball","soccer","football","volleyball","neutral"];
const files = ["ALG-S01","ALG-S02","ALG-S03","ALG-S04","ALG-S05","ALG-S06"];
const globalIds = new Set();
let ok = true;
const fail = (id, msg) => { ok = false; console.log(`  FAIL ${id}: ${msg}`); };

for (const f of files) {
  const fp = path.join(dir, f + ".json");
  let node;
  try { node = JSON.parse(fs.readFileSync(fp, "utf8")); }
  catch (e) { console.log(`${f}: UNREADABLE ${e.message}`); ok = false; continue; }

  let nodeOk = true;
  const mark = (msg) => { nodeOk = false; fail(node.id || f, msg); };

  if (node.id !== f) mark(`id ${node.id} != filename ${f}`);
  if (!Array.isArray(node.workedExamples) || node.workedExamples.length !== 2)
    mark(`expected 2 workedExamples, got ${node.workedExamples?.length}`);

  const p = node.problems || {};
  const counts = { p1: 28, p2: 28, p3: 6 };
  for (const [b, n] of Object.entries(counts)) {
    if (!Array.isArray(p[b]) || p[b].length !== n) mark(`${b} expected ${n}, got ${p[b]?.length}`);
  }

  // per-sport distribution for p1, p2
  for (const b of ["p1","p2"]) {
    const bySport = {};
    for (const pr of p[b] || []) bySport[pr.sport] = (bySport[pr.sport]||0) + 1;
    for (const s of SPORTS) if (bySport[s] !== 4) mark(`${b} sport ${s}: expected 4, got ${bySport[s]||0}`);
  }

  // p3 all neutral
  for (const pr of p.p3 || []) if (pr.sport !== "neutral") mark(`${pr.id}: p3 sport must be neutral`);

  // per-problem checks
  const phaseOf = { p1: 1, p2: 2, p3: 3 };
  for (const b of ["p1","p2","p3"]) {
    for (const pr of p[b] || []) {
      if (globalIds.has(pr.id)) mark(`duplicate id ${pr.id}`);
      globalIds.add(pr.id);
      if (pr.skillId !== node.id) mark(`${pr.id}: skillId ${pr.skillId} != ${node.id}`);
      if (pr.phase !== phaseOf[b]) mark(`${pr.id}: phase ${pr.phase} != ${phaseOf[b]}`);
      if (![1,2,3].includes(pr.difficulty)) mark(`${pr.id}: difficulty ${pr.difficulty}`);
      if (!pr.answer || typeof pr.answer.value !== "string") mark(`${pr.id}: answer.value not a string`);
      if (!Array.isArray(pr.hints) || pr.hints.length < 1) mark(`${pr.id}: needs >=1 hint`);
      const a = pr.answer || {};
      if (a.kind === "choice") {
        if (!Array.isArray(pr.choices) || pr.choices.length < 2) mark(`${pr.id}: choice needs problem-level choices[]`);
        else {
          if (!pr.choices.includes(a.value)) mark(`${pr.id}: answer.value not in choices`);
          for (const k of Object.keys(pr.misconceptionMap || {}))
            if (!pr.choices.includes(k)) mark(`${pr.id}: misconception key "${k}" not in choices`);
        }
      } else if (a.kind === "coordinate") {
        if (!/^\(-?\d+(?:\.\d+)?, -?\d+(?:\.\d+)?\)$/.test(a.value)) mark(`${pr.id}: coordinate value malformed "${a.value}"`);
      } else if (a.kind !== "numeric") {
        mark(`${pr.id}: unexpected answer.kind ${a.kind}`);
      }
      // misconception value sanity (non-empty)
      for (const v of Object.values(pr.misconceptionMap || {}))
        if (typeof v !== "string" || !v) mark(`${pr.id}: empty misconception value`);
    }
  }

  console.log(`${node.id}: ${nodeOk ? "OK" : "DEFECTS"}`);
}

console.log(`\nglobal unique problem ids: ${globalIds.size} (expected 372)`);
console.log(ok && globalIds.size === 372 ? "RESULT: VALID" : "RESULT: DEFECTS FOUND");
process.exit(ok ? 0 : 1);
