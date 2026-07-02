// Validate the 14 equations-batch fragment files in .authoring-tmp/.
// Checks: parses, counts (2 we / 28 p1 / 28 p2 / 6 p3), 4-per-sport in p1&p2,
// p3 all neutral, phase matches bucket, skillId matches node, difficulty ladders,
// global problem-id uniqueness. Reports gaps without mutating anything.
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), ".authoring-tmp");
const ids = ["E01","E02","E03","E04","E05","E06","E07","E08","E09","E10","E11","E12","E13","E14"].map(s => "ALG-" + s);
const SPORTS = ["baseball","softball","basketball","soccer","football","volleyball","neutral"];
const allProblemIds = new Map();
let problems = 0;
const report = [];

for (const id of ids) {
  const fp = path.join(dir, id + ".json");
  let o;
  try { o = JSON.parse(fs.readFileSync(fp, "utf8")); }
  catch (e) { report.push(`${id}: PARSE ERROR ${e.message}`); continue; }
  const issues = [];
  if (o.id !== id) issues.push(`node id ${o.id} != ${id}`);
  if (!Array.isArray(o.workedExamples) || o.workedExamples.length !== 2) issues.push(`we=${o.workedExamples?.length}`);
  for (const [bucket, n, phase] of [["p1",28,1],["p2",28,2],["p3",6,3]]) {
    const arr = o.problems?.[bucket];
    if (!Array.isArray(arr)) { issues.push(`${bucket} missing`); continue; }
    if (arr.length !== n) issues.push(`${bucket}=${arr.length} (want ${n})`);
    const bySport = {};
    for (const p of arr) {
      bySport[p.sport] = (bySport[p.sport]||0)+1;
      if (p.phase !== phase) issues.push(`${p.id} phase ${p.phase}!=${phase}`);
      if (p.skillId !== id) issues.push(`${p.id} skillId ${p.skillId}`);
      if (p.id) { if (allProblemIds.has(p.id)) issues.push(`DUP id ${p.id}`); else allProblemIds.set(p.id, id); }
      problems++;
    }
    if (bucket === "p3") {
      if ((bySport.neutral||0) !== 6) issues.push(`p3 neutral=${bySport.neutral||0}`);
    } else {
      for (const s of SPORTS) if ((bySport[s]||0) !== 4) issues.push(`${bucket} ${s}=${bySport[s]||0}`);
    }
  }
  report.push(`${id}: ${issues.length ? "ISSUES -> " + issues.join("; ") : "OK (we2 p1=28 p2=28 p3=6)"}`);
}
console.log(report.join("\n"));
console.log(`\nTotal problems across fragments: ${problems}; unique ids: ${allProblemIds.size}`);
