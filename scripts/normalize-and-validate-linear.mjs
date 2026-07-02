// Normalize choice items in linear-batch fragments, then validate.
// Normalize: choice answers must have a problem-level choices[] (not nested in
// answer). Move answer.choices -> problem.choices; synthesize when missing.
// Validate: counts (2 we / 28 p1 / 28 p2 / 6 p3), 4-per-sport p1&p2, p3 neutral,
// phase/bucket, skillId, difficulty, global id uniqueness, and for choice items:
// choices present, includes answer.value, all misconceptionMap keys ∈ choices.
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), ".authoring-tmp");
const present = fs.readdirSync(dir).filter(f => /^ALG-L\d\d\.json$/.test(f)).sort();
const SPORTS = ["baseball","softball","basketball","soccer","football","volleyball","neutral"];
const FUNC4 = ["Function and one-to-one","Function but not one-to-one","Not a function","One-to-one but not a function"];
const allIds = new Map();
const report = [];

function synthChoices(p) {
  const v = p.answer.value;
  const keys = Object.keys(p.misconceptionMap || {});
  if (v === "Function" || v === "Not a function") return ["Function","Not a function"];
  if (/one-to-one/.test(v) || keys.some(k => /one-to-one/.test(k))) return FUNC4.slice();
  // fallback: value + keys, value first
  const set = [v, ...keys.filter(k => k !== v)];
  return set;
}

let normalizedCount = 0;
for (const f of present) {
  const fp = path.join(dir, f);
  let o;
  try { o = JSON.parse(fs.readFileSync(fp, "utf8")); }
  catch (e) { report.push(`${f}: PARSE ERROR ${e.message}`); continue; }
  let changed = false;
  for (const bucket of ["p1","p2","p3"]) {
    for (const p of o.problems?.[bucket] || []) {
      if (p.answer?.kind === "choice") {
        if (Array.isArray(p.answer.choices)) {
          p.choices = p.answer.choices; delete p.answer.choices; changed = true; normalizedCount++;
        }
        if (!Array.isArray(p.choices)) { p.choices = synthChoices(p); changed = true; normalizedCount++; }
      }
    }
  }
  if (changed) fs.writeFileSync(fp, JSON.stringify(o));
}

// validate
for (const f of present) {
  const id = f.replace(".json","");
  const o = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const issues = [];
  if (o.id !== id) issues.push(`node id ${o.id}`);
  if (o.workedExamples?.length !== 2) issues.push(`we=${o.workedExamples?.length}`);
  for (const [bucket,n,phase] of [["p1",28,1],["p2",28,2],["p3",6,3]]) {
    const arr = o.problems?.[bucket];
    if (!Array.isArray(arr)) { issues.push(`${bucket} missing`); continue; }
    if (arr.length !== n) issues.push(`${bucket}=${arr.length}`);
    const bySport = {};
    for (const p of arr) {
      bySport[p.sport] = (bySport[p.sport]||0)+1;
      if (p.phase !== phase) issues.push(`${p.id} phase`);
      if (p.skillId !== id) issues.push(`${p.id} skillId`);
      if (![1,2,3].includes(p.difficulty)) issues.push(`${p.id} diff`);
      if (p.id) { if (allIds.has(p.id)) issues.push(`DUP ${p.id}`); else allIds.set(p.id,id); }
      if (p.answer?.kind === "choice") {
        if (!Array.isArray(p.choices)) issues.push(`${p.id} no choices`);
        else {
          if (!p.choices.includes(p.answer.value)) issues.push(`${p.id} ans∉choices`);
          for (const k of Object.keys(p.misconceptionMap||{})) if (!p.choices.includes(k)) issues.push(`${p.id} key∉choices:${k}`);
        }
      }
      if (p.answer && "choices" in p.answer) issues.push(`${p.id} stray answer.choices`);
    }
    if (bucket==="p3") { if ((bySport.neutral||0)!==6) issues.push(`p3 neutral=${bySport.neutral||0}`); }
    else for (const s of SPORTS) if ((bySport[s]||0)!==4) issues.push(`${bucket} ${s}=${bySport[s]||0}`);
  }
  report.push(`${id}: ${issues.length ? "ISSUES -> "+issues.join("; ") : "OK"}`);
}
console.log(`normalized ${normalizedCount} choice items across ${present.length} fragments\n`);
console.log(report.join("\n"));
console.log(`\nglobal unique ids so far: ${allIds.size}`);
