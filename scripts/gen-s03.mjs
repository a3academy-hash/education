// Deterministic generator for ALG-S03 "Systems by Elimination" problem bank.
// Builds every system point-first and ASSERTS correctness before writing.
// Run: node D:\a3_education\scripts\gen-s03.mjs
// Output: D:\a3_education\.authoring-tmp\ALG-S03.json
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT = "D:\\a3_education\\.authoring-tmp\\ALG-S03.json";
const MINUS = "−"; // Unicode minus, matches repo convention
const SKILL = "ALG-S03";

// ---- helpers -------------------------------------------------------------
const assert = (cond, msg) => { if (!cond) throw new Error("ASSERT FAILED: " + msg); };
// Render a signed integer term as a string using Unicode minus for negatives.
const sgn = (n) => (n < 0 ? `${MINUS}${Math.abs(n)}` : `${n}`);
// Render "ax + by = c" with proper signs and Unicode minus.
function eqStr(a, b, c) {
  const xTerm = a === 1 ? "x" : `${a}x`;
  const bAbs = Math.abs(b);
  const yTerm = bAbs === 1 ? "y" : `${bAbs}y`;
  const left = `${xTerm} ${b < 0 ? MINUS : "+"} ${yTerm}`;
  const right = c < 0 ? `${MINUS}${Math.abs(c)}` : `${c}`;
  return `${left} = ${right}`;
}
const point = (x, y) => `(${x}, ${y})`;

// ---- sports & purchase contexts -----------------------------------------
const SPORTS = ["baseball", "softball", "basketball", "soccer", "football", "volleyball", "neutral"];
const ITEMS = {
  baseball: { i1: "an adult ticket", i2: "a youth ticket", n1: "adult tickets", n2: "youth tickets", who: "A baseball booster club" },
  softball: { i1: "a bat", i2: "a ball", n1: "bats", n2: "balls", who: "A softball team" },
  basketball: { i1: "a jersey", i2: "a pair of shorts", n1: "jerseys", n2: "pairs of shorts", who: "A basketball program" },
  soccer: { i1: "a pair of cleats", i2: "a pack of socks", n1: "pairs of cleats", n2: "packs of socks", who: "A soccer club" },
  football: { i1: "a helmet", i2: "a set of pads", n1: "helmets", n2: "sets of pads", who: "A football program" },
  volleyball: { i1: "a pair of kneepads", i2: "a jersey", n1: "pairs of kneepads", n2: "jerseys", who: "A volleyball team" },
};

const collected = []; // every coordinate-item record, for verification

// ---- builders ------------------------------------------------------------
// Item 01: CHOICE, adds-without-scaling. Coeffs do NOT match (need scaling).
function buildItem01({ phase, sport, id, a1, b1, c1, a2, b2, c2, framing }) {
  const e1 = eqStr(a1, b1, c1);
  const e2 = eqStr(a2, b2, c2);
  const choices = [
    "Multiply an equation so the y-coefficients match in size, then add or subtract",
    "Add the two equations as they are",
    "Multiply only the constant terms",
  ];
  return {
    id, version: 1, skillId: SKILL, phase, sport,
    prompt: `${framing}To eliminate y from ${e1} and ${e2}, what is the correct FIRST step?`,
    visual: null,
    answer: { kind: "choice", value: choices[0] },
    choices,
    misconceptionMap: { "Add the two equations as they are": "adds-without-scaling" },
    hints: [
      `The y-coefficients here are ${sgn(b1)} and ${sgn(b2)}, which are different in size, so adding right away leaves a y term.`,
      "Scale one equation until the y-coefficients match in size, then add or subtract to cancel y.",
    ],
    difficulty: 1,
  };
}

// Item 02: CHOICE, sign-error-subtracting-equations. Concrete coeffs a,b.
function buildItem02({ phase, sport, id, a, b, c, framing }) {
  const flipped = `${MINUS}${a}x ${MINUS} ${b}y (every term flips)`;
  const onlyFirst = `${MINUS}${a}x + ${b}y (only the first term flips)`;
  const onlySecond = `${a}x ${MINUS} ${b}y (only the second term flips)`;
  const choices = [flipped, onlyFirst, onlySecond];
  return {
    id, version: 1, skillId: SKILL, phase, sport,
    prompt: `${framing}When you subtract (${a}x + ${b}y = ${c}) from another equation, ${MINUS}(${a}x + ${b}y) becomes ___.`,
    visual: null,
    answer: { kind: "choice", value: flipped },
    choices,
    misconceptionMap: { [onlyFirst]: "sign-error-subtracting-equations" },
    hints: [
      "Subtracting an equation means subtracting EVERY one of its terms, so the minus distributes to both.",
      `Both ${a}x and ${b}y change sign: the result is ${MINUS}${a}x ${MINUS} ${b}y.`,
    ],
    difficulty: 2,
  };
}

// Item 03: COORDINATE, matched same-sign x-coefficient, subtract to eliminate x.
// eq1: a*x + p*y = a*x0 + p*y0 ; eq2: a*x + q*y = a*x0 + q*y0 ; p != q.
function buildItem03({ phase, sport, id, x0, y0, a, p, q, framing }) {
  const c1 = a * x0 + p * y0;
  const c2 = a * x0 + q * y0;
  const e1 = eqStr(a, p, c1);
  const e2 = eqStr(a, q, c2);
  const dy = p - q;            // y-coefficient after subtraction
  const dc = c1 - c2;          // constant after subtraction
  assert(dy !== 0, `${id}: p must differ from q`);
  assert(dc % dy === 0, `${id}: (c1-c2) not divisible by (p-q)`);
  const ySol = dc / dy;
  assert(ySol === y0, `${id}: solved y ${ySol} != y0 ${y0}`);
  // back-sub into eq1: a*x = c1 - p*y0 -> x
  const axNum = c1 - p * y0;
  assert(axNum % a === 0, `${id}: back-sub x not integer`);
  const xSol = axNum / a;
  assert(xSol === x0, `${id}: solved x ${xSol} != x0 ${x0}`);

  const rec = {
    id, version: 1, skillId: SKILL, phase, sport,
    prompt: `${framing}Solve the system: ${e1} and ${e2}. Type as (x, y).`,
    visual: null,
    answer: { kind: "coordinate", value: point(x0, y0) },
    hints: [
      `Both equations have ${a}x, so subtract them to eliminate x: (${sgn(p)}y) ${MINUS} (${sgn(q)}y) gives ${sgn(dy)}y, and ${c1} ${MINUS} ${c2} gives ${dc}. So ${sgn(dy)}y = ${dc}, which gives y = ${y0}.`,
      `Substitute y = ${y0} into ${e1}: ${a}x ${p < 0 ? MINUS : "+"} ${Math.abs(p)}(${y0}) = ${c1}, so ${a}x = ${axNum}, giving x = ${x0}.`,
    ],
    difficulty: 2,
  };
  collected.push({ id, x0, y0, a1: a, b1: p, c1, a2: a, b2: q, c2 });
  return rec;
}

// Item 04: COORDINATE, scale eq1 by k so y-coeffs become opposite & equal; add.
// eq1: a1*x + b*y = c1 ; eq2: a2*x - (k*b)*y = c2 ; scale eq1 by k -> k*b*y matches +k*b, opposite to -k*b.
function buildItem04({ phase, sport, id, x0, y0, a1, a2, b, k, framing }) {
  const b2 = -(k * b);
  const c1 = a1 * x0 + b * y0;
  const c2 = a2 * x0 + b2 * y0;
  const e1 = eqStr(a1, b, c1);
  const e2 = eqStr(a2, b2, c2);
  // scale eq1 by k: (k*a1)x + (k*b)y = k*c1 ; add to eq2: y cancels.
  const sa1 = k * a1, sb1 = k * b, sc1 = k * c1;
  assert(sb1 + b2 === 0, `${id}: scaled y-coeff does not cancel`);
  const xCoef = sa1 + a2;     // coefficient of x after adding
  const xConst = sc1 + c2;    // constant after adding
  assert(xCoef !== 0, `${id}: x eliminated too`);
  assert(xConst % xCoef === 0, `${id}: x not integer after add`);
  const xSol = xConst / xCoef;
  assert(xSol === x0, `${id}: solved x ${xSol} != x0 ${x0}`);
  // back-sub into eq2 for y: b2*y = c2 - a2*x0 -> y
  const byNum = c2 - a2 * x0;
  assert(byNum % b2 === 0, `${id}: back-sub y not integer`);
  const ySol = byNum / b2;
  assert(ySol === y0, `${id}: solved y ${ySol} != y0 ${y0}`);

  const rec = {
    id, version: 1, skillId: SKILL, phase, sport,
    prompt: `${framing}Solve the system: ${e1} and ${e2}. Type as (x, y).`,
    visual: null,
    answer: { kind: "coordinate", value: point(x0, y0) },
    hints: [
      `Multiply the first equation by ${k} to make the y-coefficients opposite: ${k} times (${e1}) gives ${eqStr(sa1, sb1, sc1)}. Now the y-terms are ${sgn(sb1)}y and ${sgn(b2)}y.`,
      `Add ${eqStr(sa1, sb1, sc1)} to ${e2}: the y-terms cancel, ${sgn(sa1)}x + (${sgn(a2)}x) = ${sgn(xCoef)}x, and ${sc1} + (${sgn(c2)}) = ${xConst}. So ${sgn(xCoef)}x = ${xConst}, giving x = ${x0}, then y = ${y0}.`,
    ],
    difficulty: 3,
  };
  collected.push({ id, x0, y0, a1, b1: b, c1, a2, b2, c2 });
  return rec;
}

// ---- per-sport quartet parameter generation ------------------------------
// Vary by index so quartets are not identical. All numbers small & clean.
function quartetParams(idx) {
  // Item 01 (needs scaling: y-coeffs differ in size). vary across quartets.
  const i01 = (() => {
    const sets = [
      { a1: 3, b1: 2, c1: 16, a2: 5, b2: -4, c2: 12 },
      { a1: 2, b1: 3, c1: 13, a2: 4, b2: -6, c2: 8 },
      { a1: 4, b1: 3, c1: 18, a2: 3, b2: -6, c2: 3 },
      { a1: 2, b1: 5, c1: 19, a2: 3, b2: -2, c2: 11 },
      { a1: 5, b1: 2, c1: 24, a2: 2, b2: -3, c2: 5 },
      { a1: 3, b1: 4, c1: 22, a2: 2, b2: -2, c2: 8 },
      { a1: 2, b1: 3, c1: 17, a2: 3, b2: -2, c2: 4 },
    ][idx % 7];
    // confirm y-coeffs differ in size (need scaling) and constants are integers
    assert(Math.abs(sets.b1) !== Math.abs(sets.b2), "item01 coeffs must differ in size");
    return sets;
  })();

  // Item 02 (concrete a,b,c) — vary.
  const i02 = [
    { a: 2, b: 3, c: 12 },
    { a: 3, b: 2, c: 13 },
    { a: 4, b: 5, c: 21 },
    { a: 5, b: 2, c: 19 },
    { a: 2, b: 7, c: 16 },
    { a: 3, b: 4, c: 18 },
    { a: 4, b: 3, c: 19 },
  ][idx % 7];

  // Item 03 (matched x-coeff a, y-coeffs p,q). vary x0,y0,a,p,q.
  const i03 = [
    { x0: 3, y0: 2, a: 2, p: 3, q: 1 },
    { x0: 2, y0: 4, a: 3, p: 2, q: 5 },
    { x0: 4, y0: 1, a: 2, p: 5, q: 2 },
    { x0: 1, y0: 3, a: 4, p: 1, q: 4 },
    { x0: 5, y0: 2, a: 2, p: 4, q: 1 },
    { x0: 3, y0: 5, a: 3, p: 2, q: 4 },
    { x0: 2, y0: 3, a: 2, p: 3, q: 1 },
  ][idx % 7];

  // Item 04 (scale eq1 by k). vary x0,y0,a1,a2,b,k.
  const i04 = [
    { x0: 2, y0: 3, a1: 2, a2: 3, b: 2, k: 2 },
    { x0: 3, y0: 2, a1: 3, a2: 2, b: 1, k: 3 },
    { x0: 1, y0: 4, a1: 4, a2: 1, b: 3, k: 2 },
    { x0: 4, y0: 1, a1: 2, a2: 5, b: 2, k: 2 },
    { x0: 2, y0: 5, a1: 3, a2: 4, b: 1, k: 2 },
    { x0: 5, y0: 2, a1: 2, a2: 3, b: 3, k: 2 },
    { x0: 3, y0: 2, a1: 2, a2: 3, b: 2, k: 2 },
  ][idx % 7];

  return { i01, i02, i03, i04 };
}

function pad2(n) { return String(n).padStart(2, "0"); }

function buildQuartet(phase, sport, idx, framingFns) {
  const { i01, i02, i03, i04 } = quartetParams(idx);
  const base = `${SKILL}-p${phase}-${sport}`;
  return [
    buildItem01({ phase, sport, id: `${base}-01`, ...i01, framing: framingFns.f01(sport) }),
    buildItem02({ phase, sport, id: `${base}-02`, ...i02, framing: framingFns.f02(sport) }),
    buildItem03({ phase, sport, id: `${base}-03`, ...i03, framing: framingFns.f03(sport) }),
    buildItem04({ phase, sport, id: `${base}-04`, ...i04, framing: framingFns.f04(sport) }),
  ];
}

// ---- framing strings -----------------------------------------------------
// p1: purchase context with "let x = price of item1, y = price of item2".
function p1Framing(sport) {
  if (sport === "neutral") {
    const lead = "Two numbers x and y are related by a system: ";
    return { f01: () => lead, f02: () => lead, f03: () => lead, f04: () => lead };
  }
  const it = ITEMS[sport];
  const lead = `${it.who} sets prices so that, with x = the price of ${it.i1} and y = the price of ${it.i2}: `;
  return {
    f01: () => lead,
    f02: () => lead,
    f03: () => lead,
    f04: () => lead,
  };
}
// p2: light framing.
function p2Framing() {
  const lead = "A coach models a system: ";
  return { f01: () => lead, f02: () => lead, f03: () => lead, f04: () => lead };
}

// ---- assemble ------------------------------------------------------------
const p1 = [];
SPORTS.forEach((sport, idx) => { p1.push(...buildQuartet(1, sport, idx, p1Framing(sport))); });

const p2 = [];
SPORTS.forEach((sport, idx) => { p2.push(...buildQuartet(2, sport, idx, p2Framing(sport))); });

// p3: 6 neutral. [1,2,2,2,3,3]: 01 choice adds, 02 choice sign, 03/04 matched, 05/06 scaled.
// Must NOT equal a worked-example system.
const p3 = [];
{
  const base = `${SKILL}-p3-neutral`;
  const fr = ""; // pure
  // 01 choice adds-without-scaling (coeffs differ in size)
  p3.push(buildItem01({ phase: 3, sport: "neutral", id: `${base}-01`, a1: 2, b1: 3, c1: 17, a2: 3, b2: -2, c2: 4, framing: fr }));
  // 02 choice sign-error
  p3.push(buildItem02({ phase: 3, sport: "neutral", id: `${base}-02`, a: 4, b: 3, c: 19, framing: fr }));
  // 03 matched-coeff coordinate
  p3.push(buildItem03({ phase: 3, sport: "neutral", id: `${base}-03`, x0: 2, y0: 3, a: 2, p: 3, q: 1, framing: fr }));
  // 04 matched-coeff coordinate (different)
  p3.push(buildItem03({ phase: 3, sport: "neutral", id: `${base}-04`, x0: 4, y0: 2, a: 3, p: 1, q: 4, framing: fr }));
  // 05 scaled coordinate
  p3.push(buildItem04({ phase: 3, sport: "neutral", id: `${base}-05`, x0: 3, y0: 2, a1: 2, a2: 3, b: 2, k: 2, framing: fr }));
  // 06 scaled coordinate (different)
  p3.push(buildItem04({ phase: 3, sport: "neutral", id: `${base}-06`, x0: 2, y0: 4, a1: 3, a2: 2, b: 1, k: 3, framing: fr }));
  // patch difficulties to spec pattern [1,2,2,2,3,3]
  p3[2].difficulty = 2;
  p3[3].difficulty = 2;
  p3[4].difficulty = 3;
  p3[5].difficulty = 3;
}

// ---- worked examples (verbatim) -----------------------------------------
const WE0 = {"id":"ALG-S03-we-01","title":"Scale one equation, then eliminate: 3x + 2y = 16 and 5x − 4y = 12","steps":[{"prompt":"We want to eliminate y from 3x + 2y = 16 and 5x − 4y = 12. The y-coefficients are 2 and −4. If you just ADD the equations as they are, what happens to y?","reveal":"You get 2y + (−4y) = −2y. Nothing fully cancels, because 2 and 4 are different sizes. Adding without scaling leaves a y term. You must first make the coefficients match in size."},{"prompt":"Multiply the FIRST equation by 2 so its y-coefficient becomes 4. What does it become?","reveal":"2 × (3x + 2y = 16) gives 6x + 4y = 32. Multiply EVERY term by 2: 2·3x = 6x, 2·2y = 4y, 2·16 = 32. Now the y-coefficients are +4 and −4."},{"prompt":"Add 6x + 4y = 32 to 5x − 4y = 12. What equation in x do you get?","reveal":"6x + 5x = 11x, 4y + (−4y) = 0, 32 + 12 = 44. So 11x = 44, giving x = 4."},{"prompt":"Substitute x = 4 into 3x + 2y = 16 to find y.","reveal":"3(4) + 2y = 16 → 12 + 2y = 16 → 2y = 4 → y = 2."},{"prompt":"Check (4, 2) in BOTH original equations.","reveal":"3(4) + 2(2) = 12 + 4 = 16 ✓. 5(4) − 4(2) = 20 − 8 = 12 ✓. The solution is (4, 2)."}]};
const WE1 = {"id":"ALG-S03-we-02","title":"Subtract equations, distributing the minus to every term: 4x + 3y = 20 and 4x + y = 12","steps":[{"prompt":"In 4x + 3y = 20 and 4x + y = 12, both x-coefficients are 4. To eliminate x, do you add or subtract?","reveal":"Subtract. When matching coefficients have the SAME sign (both +4), subtracting cancels x. Adding would give 8x and cancel nothing."},{"prompt":"Subtracting the second equation means subtracting EVERY term of it. Write (4x + 3y) − (4x + y) and 20 − 12.","reveal":"The minus distributes to all of the second equation: −(4x + y) = −4x − y. So the left side is 4x + 3y − 4x − y. The classic error is writing 4x + 3y − 4x + y — forgetting to flip the +y to −y."},{"prompt":"Combine like terms on the left, and subtract on the right.","reveal":"4x − 4x = 0, 3y − y = 2y, 20 − 12 = 8. So 2y = 8, giving y = 4."},{"prompt":"Substitute y = 4 into 4x + y = 12, then check both equations.","reveal":"4x + 4 = 12 → 4x = 8 → x = 2. Check: 4(2) + 3(4) = 8 + 12 = 20 ✓ and 4(2) + 4 = 12 ✓. The solution is (2, 4)."}]};

const bank = { id: SKILL, workedExamples: [WE0, WE1], problems: { p1, p2, p3 } };

// =========================================================================
// SELF-VERIFICATION
// =========================================================================
function verify() {
  const all = [...p1, ...p2, ...p3];
  const allowedMisc = new Set(["adds-without-scaling", "sign-error-subtracting-equations"]);

  // counts
  assert(p1.length === 28, `p1 count ${p1.length} != 28`);
  assert(p2.length === 28, `p2 count ${p2.length} != 28`);
  assert(p3.length === 6, `p3 count ${p3.length} != 6`);

  // 4-per-sport in fixed order for p1 and p2
  for (const [phase, bucket] of [[1, p1], [2, p2]]) {
    SPORTS.forEach((sport, idx) => {
      const quad = bucket.slice(idx * 4, idx * 4 + 4);
      assert(quad.length === 4, `phase ${phase} ${sport}: not 4 items`);
      quad.forEach((p, j) => {
        assert(p.sport === sport, `phase ${phase} item ${j}: sport ${p.sport} != ${sport}`);
        assert(p.id === `${SKILL}-p${phase}-${sport}-${pad2(j + 1)}`, `bad id ${p.id}`);
        assert(p.phase === phase, `phase mismatch on ${p.id}`);
      });
      const diffs = quad.map((p) => p.difficulty);
      assert(JSON.stringify(diffs) === JSON.stringify([1, 2, 2, 3]), `phase ${phase} ${sport} diff pattern ${diffs}`);
    });
  }

  // p3 all neutral, phase 3, diff pattern, ids
  p3.forEach((p, j) => {
    assert(p.sport === "neutral", `p3 item ${j} not neutral`);
    assert(p.phase === 3, `p3 item ${j} phase not 3`);
    assert(p.id === `${SKILL}-p3-neutral-${pad2(j + 1)}`, `bad p3 id ${p.id}`);
  });
  assert(JSON.stringify(p3.map((p) => p.difficulty)) === JSON.stringify([1, 2, 2, 2, 3, 3]), "p3 diff pattern");

  // unique ids
  const ids = all.map((p) => p.id);
  assert(new Set(ids).size === ids.length, "duplicate ids exist");

  // choice items: answer in choices, misc keys in choices, misc values allowed
  for (const p of all) {
    if (p.answer.kind === "choice") {
      assert(Array.isArray(p.choices), `${p.id}: choice item missing choices`);
      assert(p.choices.includes(p.answer.value), `${p.id}: answer not in choices`);
      for (const k of Object.keys(p.misconceptionMap || {})) {
        assert(p.choices.includes(k), `${p.id}: misc key not in choices: ${k}`);
      }
    }
    for (const v of Object.values(p.misconceptionMap || {})) {
      assert(allowedMisc.has(v), `${p.id}: bad misconception value ${v}`);
    }
    // hints 1-2
    assert(p.hints.length >= 1 && p.hints.length <= 2, `${p.id}: hint count ${p.hints.length}`);
  }

  // forbidden substrings in prompt/hints
  const forbidden = ["recheck", "actually", "...", "wait", "is wrong", "instead", "no:", "solution is"];
  for (const p of all) {
    const texts = [p.prompt, ...p.hints];
    for (const t of texts) {
      const low = t.toLowerCase();
      for (const f of forbidden) {
        assert(!low.includes(f), `${p.id}: forbidden substring "${f}" in: ${t}`);
      }
    }
  }

  // coordinate answers exact form "(<int>, <int>)"
  const coordRe = /^\((-?\d+), (-?\d+)\)$/;
  for (const p of all) {
    if (p.answer.kind === "coordinate") {
      assert(coordRe.test(p.answer.value), `${p.id}: bad coordinate form ${p.answer.value}`);
    }
  }

  // point-first correctness from stored numbers (not re-parsed from prompt)
  for (const r of collected) {
    assert(r.a1 * r.x0 + r.b1 * r.y0 === r.c1, `${r.id}: eq1 fails ${r.a1}*${r.x0}+${r.b1}*${r.y0}!=${r.c1}`);
    assert(r.a2 * r.x0 + r.b2 * r.y0 === r.c2, `${r.id}: eq2 fails ${r.a2}*${r.x0}+${r.b2}*${r.y0}!=${r.c2}`);
    // verify the stored answer matches the stored point
    const rec = all.find((p) => p.id === r.id);
    assert(rec.answer.value === point(r.x0, r.y0), `${r.id}: answer != stored point`);
  }

  // worked-example systems must not appear in p3 coordinate prompts
  const weSystems = ["3x + 2y = 16", "5x − 4y = 12", "4x + 3y = 20", "4x + y = 12"];
  for (const p of p3) {
    if (p.answer.kind === "coordinate") {
      for (const w of weSystems) {
        assert(!p.prompt.includes(w), `${p.id}: p3 reuses worked-example system ${w}`);
      }
    }
  }

  // number of coordinate items must match expectation: p1 14, p2 14, p3 4
  const coordCount = (b) => b.filter((p) => p.answer.kind === "coordinate").length;
  assert(coordCount(p1) === 14, `p1 coord ${coordCount(p1)}`);
  assert(coordCount(p2) === 14, `p2 coord ${coordCount(p2)}`);
  assert(coordCount(p3) === 4, `p3 coord ${coordCount(p3)}`);

  return all;
}

const all = verify();

// ---- write & report ------------------------------------------------------
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(bank), "utf8");

console.log("ALG-S03 generation OK.");
console.log(`Counts: p1=${p1.length} p2=${p2.length} p3=${p3.length} total=${all.length}`);
console.log(`Coordinate items: p1=${all.filter(p=>p.phase===1&&p.answer.kind==="coordinate").length} p2=${all.filter(p=>p.phase===2&&p.answer.kind==="coordinate").length} p3=${p3.filter(p=>p.answer.kind==="coordinate").length}`);
console.log("Sample (5 items):");
const sample = [p1[0], p1[2], p2[3], p3[2], p3[5]];
for (const p of sample) {
  console.log(`  ${p.id} [${p.answer.kind} d${p.difficulty}] -> ${p.answer.value}`);
}
console.log(`File written: ${OUT}`);
