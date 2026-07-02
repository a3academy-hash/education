// Structural validator for the Quadratics & Radicals batch (.authoring-tmp/ALG-Q0[1-9],Q1[0-2].json).
// Like the poly validator but ALSO allows answer.kind === "coordinate" (Q06 vertex items).
import fs from "fs";
import path from "path";

const dir = "D:/a3_education/.authoring-tmp";
const SPORTS = ["baseball","softball","basketball","soccer","football","volleyball","neutral"];
const files = ["ALG-Q01","ALG-Q02","ALG-Q03","ALG-Q04","ALG-Q05","ALG-Q06","ALG-Q07","ALG-Q08","ALG-Q09","ALG-Q10","ALG-Q11","ALG-Q12"];
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

  // p1: strict 4-per-sport. p2 (Quadratics convention): 28 total, every sport present (>=1), neutral present.
  {
    const bySport = {};
    for (const pr of p.p1 || []) bySport[pr.sport] = (bySport[pr.sport]||0) + 1;
    for (const s of SPORTS) if (bySport[s] !== 4) mark(`p1 sport ${s}: expected 4, got ${bySport[s]||0}`);
  }
  {
    const bySport = {};
    for (const pr of p.p2 || []) bySport[pr.sport] = (bySport[pr.sport]||0) + 1;
    for (const s of SPORTS) if (!bySport[s]) mark(`p2 sport ${s}: expected >=1, got 0`);
  }

  for (const pr of p.p3 || []) if (pr.sport !== "neutral") mark(`${pr.id}: p3 sport must be neutral`);

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
      } else if (a.kind !== "numeric" && a.kind !== "coordinate") {
        mark(`${pr.id}: unexpected answer.kind ${a.kind}`);
      }
      // numeric misconception keys must be numerically DISTINCT from the answer
      if (a.kind === "numeric") {
        for (const k of Object.keys(pr.misconceptionMap || {}))
          if (Number(k) === Number(a.value)) mark(`${pr.id}: numeric misconception key "${k}" equals answer "${a.value}"`);
      }
      for (const v of Object.values(pr.misconceptionMap || {}))
        if (typeof v !== "string" || !v) mark(`${pr.id}: empty misconception value`);
    }
  }

  console.log(`${node.id}: ${nodeOk ? "OK" : "DEFECTS"}`);
}

console.log(`\nglobal unique problem ids: ${globalIds.size} (expected 744)`);
console.log(ok && globalIds.size === 744 ? "RESULT: VALID" : "RESULT: DEFECTS FOUND");
process.exit(ok ? 0 : 1);
