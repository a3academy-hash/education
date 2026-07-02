// Apply mr-kahn batch-3 audit gating fixes (MAJOR defects 1-3) to the merged graph.
// Defect 1 (L12): 5 thirds-slope answers -> exact fractions (+ key as fraction).
// Defect 2 (L11): 16 point-slope-partial-distribution keys -> correct b = y1 - x1.
// Defect 3 (L10): 2 collision items re-coefficiented (full prompt/answer/map/hints).
// MINOR defects 4-5 (L13 dead decoy keys / "+ -" formatting) deferred.
import fs from "fs";
const path = "data/algebra1-graph.json";
const g = JSON.parse(fs.readFileSync(path, "utf8"));

// index all problems by id
const byId = new Map();
for (const node of g.nodes) {
  if (!node.problems) continue;
  for (const b of ["p1","p2","p3"]) for (const p of node.problems[b]||[]) byId.set(p.id, p);
}
let changed = 0;
function renameKey(map, oldK, newK) {
  if (!(oldK in map)) throw new Error(`key ${oldK} missing`);
  if (newK in map) throw new Error(`new key ${newK} already present`);
  const v = map[oldK]; delete map[oldK]; map[newK] = v;
}

// Defect 1: L12 thirds slopes
const d1 = [
  ["ALG-L12-p1-baseball-04","-2/3","0.6667","2/3"],
  ["ALG-L12-p1-basketball-04","-2/3","0.6667","2/3"],
  ["ALG-L12-p1-football-04","-7/3","2.3333","7/3"],
  ["ALG-L12-p2-baseball-03","-1/3","0.3333","1/3"],
  ["ALG-L12-p2-football-03","-4/3","1.3333","4/3"],
];
for (const [id,ans,oldK,newK] of d1) {
  const p = byId.get(id); if (!p) throw new Error("missing "+id);
  p.answer.value = ans;
  renameKey(p.misconceptionMap, oldK, newK);
  changed++;
}

// Defect 2: L11 partial-distribution key values
const d2 = [
  ["ALG-L11-p1-softball-03","26","25"],
  ["ALG-L11-p1-volleyball-03","16","17"],
  ["ALG-L11-p1-baseball-04","23","11"],
  ["ALG-L11-p1-softball-04","20","11"],
  ["ALG-L11-p1-basketball-04","9","17"],
  ["ALG-L11-p1-football-04","130","52"],
  ["ALG-L11-p1-volleyball-04","26","18"],
  ["ALG-L11-p1-neutral-04","-2","7"],
  ["ALG-L11-p2-soccer-03","18","16"],
  ["ALG-L11-p2-baseball-04","2","10"],
  ["ALG-L11-p2-softball-04","-1","8"],
  ["ALG-L11-p2-soccer-04","1","8"],
  ["ALG-L11-p2-football-04","-30","42"],
  ["ALG-L11-p2-volleyball-04","3","11"],
  ["ALG-L11-p2-neutral-04","12","9"],
  ["ALG-L11-p3-neutral-06","16","15"],
];
for (const [id,oldK,newK] of d2) {
  const p = byId.get(id); if (!p) throw new Error("missing "+id);
  if (p.misconceptionMap[oldK] !== "point-slope-partial-distribution")
    throw new Error(`${id} key ${oldK} not partial-distribution`);
  renameKey(p.misconceptionMap, oldK, newK);
  changed++;
}

// Defect 3: L10 collision re-coefficient (full replace of mutable fields)
const soc = byId.get("ALG-L10-p1-soccer-02");
soc.prompt = "A match clock shows m = 90 − 2p minutes remaining after p stoppages. When does the time remaining reach zero?";
soc.answer = { kind: "numeric", value: "45" };
soc.misconceptionMap = { "90": "sets-wrong-variable-to-zero" };
soc.hints = ["'Reach zero' means m = 0. Solve 0 = 90 − 2p for p.", "Setting p = 0 instead gives the full 90 on the clock, not when it ends."];
changed++;
const vol = byId.get("ALG-L10-p1-volleyball-02");
vol.prompt = "A team needs n = 50 − 2p more points to reach its goal, where p is rallies won. After how many rallies p does the points-needed reach zero?";
vol.answer = { kind: "numeric", value: "25" };
vol.misconceptionMap = { "50": "sets-wrong-variable-to-zero" };
vol.hints = ["'Reach zero' means n = 0. Solve 0 = 50 − 2p for p.", "Setting p = 0 gives the full 50 needed, not when the goal is reached."];
changed++;

if (g.schema.version !== "1.5.0") throw new Error("version " + g.schema.version);
g.schema.version = "1.5.1";
fs.writeFileSync(path, JSON.stringify(g, null, 2) + "\n");
console.log(`applied ${changed} fixes (expected 23); version -> 1.5.1`);
