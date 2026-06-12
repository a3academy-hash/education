// scripts/phase8b-visual-pass.mjs — Phase 8 / B2 content pass (deterministic, idempotent).
//
// Two jobs, NO math/answer/phase changes — only the `visual` field + an additive
// `visualSpec` + (for L16) a minimal giveaway-sentence text strip:
//   STEP 2  MECHANICAL STRIP — null drift visuals (graph/boxplot/histogram/scatter)
//           and leftover decoration (renderable visual, no spec, non-geometry answer)
//           on every NON-Wave-1 problem.
//   STEP 3  WAVE-1 AUTHORING — author visualSpec on the Wave-1 nodes where the
//           item's own prompt carries extractable geometry; null the residual
//           (un-authorable) Wave-1 items so no decoration warning remains.
//
// ANSWER-LEAK: interactive coordinate specs carry GIVEN context only, never the
// target coordinate. Display specs may show geometry that contains the answer
// only where the read-off IS the skill (S01 intersection, L01 read-coordinate,
// F09 compare-given-values). Run `npm run validate:graph` after — the committed
// validator enforces VISUAL_SPEC_MISMATCH / VISUAL_ANSWER_LEAK / drift / decoration.

import { readFileSync, writeFileSync } from "node:fs";

const GRAPH_URL = new URL("../data/algebra1-graph.json", import.meta.url);

const DRIFT_KINDS = new Set(["graph", "boxplot", "histogram", "scatter"]);
const RENDERABLE = new Set(["coordinate", "numberline", "table"]);
const STRIP_ANSWER_KINDS = new Set([
  "choice",
  "numeric",
  "expression",
  "inequality",
  "numeric-set", // non-geometry typed answer (e.g. E12 "list the range") — decoration.
]);
const WAVE1 = new Set([
  "ALG-L01", "ALG-L05", "ALG-L06", "ALG-L09", "ALG-L10", "ALG-L07",
  "ALG-S01", "ALG-L02", "ALG-L16", "ALG-L04", "ALG-D03",
  "ALG-F01", "ALG-F02", "ALG-F09",
]);

const NX = "x"; // neutral axis labels everywhere (always P3-safe).
const NY = "y";

// ---------------------------------------------------------------------------
// Pure extraction helpers (deterministic).
// ---------------------------------------------------------------------------

/** All explicit "(num, num)" ordered pairs in a string, in order. */
function extractPairs(s) {
  const re = /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g;
  const out = [];
  let m;
  while ((m = re.exec(s)) !== null) out.push({ x: Number(m[1]), y: Number(m[2]) });
  return out;
}

/** Canonical "x,y" key for an answer.value coordinate string, or null. */
function answerCoordKey(value) {
  if (typeof value !== "string") return null;
  const m = value.match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?$/);
  if (!m) return null;
  return `${Number(m[1])},${Number(m[2])}`;
}

/**
 * Parse every "<var> = <linear expr in another var>" equation in the prompt into
 * { slope, intercept }. Handles, with either variable order:
 *   y = 2x + 7 | y = -4x + 20 | y = x + 2 | y = 2x | g = 4 - 0.5d | p = 5 + 3b
 * Returns [] when nothing clean parses.
 */
function extractLines(s) {
  const lines = [];
  // <out> = <terms> where <terms> is a sum of {const} and {coef*var}.
  const eqRe = /[a-zA-Z]\s*=\s*([0-9xX.+\-*/a-zA-Z\s]+?)(?=[.,;]|$|\sand\s|\swhere\s|\)|\(|Graph|Plot|Which|What|Find|Type)/g;
  let m;
  while ((m = eqRe.exec(s)) !== null) {
    const parsed = parseLinear(m[1]);
    if (parsed) lines.push(parsed);
  }
  return lines;
}

/** Parse a linear RHS like "2x + 7", "4 - 0.5d", "5 + 3b", "x", "-x + 9". */
function parseLinear(rhs) {
  const t = rhs.replace(/\s+/g, "");
  if (!/^[+\-]?[0-9.]*[a-zA-Z]?(?:[+\-][0-9.]*[a-zA-Z]?)*$/.test(t) || t === "") return null;
  // Tokenize signed terms with a non-empty match (no zero-width loop).
  const termRe = /([+\-]?)((?:\d+\.?\d*|\.\d+)?)([a-zA-Z]?)/g;
  let slope = null;
  let intercept = 0;
  let sawVar = false;
  let sawAny = false;
  for (const mm of t.matchAll(termRe)) {
    const [whole, sign, numStr, varStr] = mm;
    if (whole === "") continue; // skip the trailing zero-width match
    if (numStr === "" && varStr === "") continue; // bare sign — ignore
    sawAny = true;
    const sgn = sign === "-" ? -1 : 1;
    if (varStr) {
      const coef = numStr === "" ? 1 : Number(numStr);
      if (!Number.isFinite(coef)) return null;
      slope = (slope ?? 0) + sgn * coef;
      sawVar = true;
    } else {
      const c = Number(numStr);
      if (!Number.isFinite(c)) return null;
      intercept += sgn * c;
    }
  }
  if (!sawAny || !sawVar || slope === null) return null;
  return { slope, intercept };
}

/** Parse "x = 1,2,3,4 ... y = 2,5,8,11" → { xs:[...], ys:[...] } or null. */
function extractTableXY(s) {
  const xm = s.match(/x\s*=\s*((?:-?\d+(?:\.\d+)?\s*,\s*)+-?\d+(?:\.\d+)?)/);
  const ym = s.match(/y\s*=\s*((?:-?\d+(?:\.\d+)?\s*,\s*)+-?\d+(?:\.\d+)?)/);
  if (!xm || !ym) return null;
  const xs = xm[1].split(",").map((v) => Number(v.trim()));
  const ys = ym[1].split(",").map((v) => Number(v.trim()));
  if (xs.length !== ys.length || xs.length < 2) return null;
  if (xs.some((v) => !Number.isFinite(v)) || ys.some((v) => !Number.isFinite(v))) return null;
  return { xs, ys };
}

// ---------------------------------------------------------------------------
// Per-node authoring. Each returns true if it set a spec (or intentionally
// authored), false if the item should be left for the residual strip.
// ---------------------------------------------------------------------------

const report = {
  authored: {}, // nodeId -> count
  stripped: 0,
  drift: 0,
  l16Text: [],
  samples: {},
};

function note(nodeId, p) {
  report.authored[nodeId] = (report.authored[nodeId] || 0) + 1;
  if (!report.samples[nodeId]) report.samples[nodeId] = { id: p.id, spec: p.visualSpec };
}

function bump(p) {
  p.version = (typeof p.version === "number" ? p.version : 1) + 1;
}

/** Set a coordinate/numberline/table spec and bump version. */
function setSpec(nodeId, p, spec) {
  p.visual = spec.kind; // keep visual aligned to spec.kind (must match).
  p.visualSpec = spec;
  bump(p);
  note(nodeId, p);
}

function nullVisual(p) {
  if (p.visual !== null) {
    p.visual = null;
    bump(p);
    report.stripped += 1;
  }
}

// L01 ----------------------------------------------------------------------
function authorL01(nodeId, p) {
  const ak = p.answer?.kind;
  if (ak === "coordinate") {
    // Interactive plot — given context only (no point to show; the answer IS
    // the point). points:[] so we never leak the target.
    setSpec(nodeId, p, {
      kind: "coordinate",
      mode: "interactive",
      points: [],
      // NB: "place" is intentionally omitted. The B1 ProblemVisual adapter
      // derives Learn-explore (append-to-cap) from affordances.includes("place")
      // && interactive — including it would turn a single-answer PLOT into an
      // append-many explore (stray points). mode:"interactive" alone gives the
      // correct single-point reposition. (Flagged for mr-gates: the adapter
      // should gate explore on a Learn context, not on this affordance.)
      affordances: ["drag", "snap", "labels", "clear", "readout"],
      snap: 1,
      xLabel: NX,
      yLabel: NY,
    });
    return true;
  }
  if (ak === "choice") {
    // Quadrant items — axes only; do NOT plot the prompt's point (that gives
    // away the quadrant). Student reasons from the signs.
    setSpec(nodeId, p, {
      kind: "coordinate",
      mode: "display",
      points: [],
      xLabel: NX,
      yLabel: NY,
    });
    return true;
  }
  if (ak === "numeric") {
    // "On the grid, the point (a,b) is plotted. What is its x-coordinate?"
    // The point is STATED in the prompt → display it; answer is one coord, not
    // a leak (reading a coordinate off the grid is the skill).
    const pts = extractPairs(p.prompt);
    if (pts.length === 1) {
      setSpec(nodeId, p, {
        kind: "coordinate",
        mode: "display",
        points: [{ x: pts[0].x, y: pts[0].y, label: `(${pts[0].x}, ${pts[0].y})` }],
        xLabel: NX,
        yLabel: NY,
      });
      return true;
    }
  }
  return false;
}

// L05 / L06 ----------------------------------------------------------------
function authorSlope(nodeId, p) {
  // Display: render the item's REAL two points + the line through them.
  const pts = extractPairs(p.prompt);
  if (pts.length >= 2) {
    const a = pts[0];
    const b = pts[1];
    setSpec(nodeId, p, {
      kind: "coordinate",
      mode: "display",
      points: [
        { x: a.x, y: a.y, label: `(${a.x}, ${a.y})` },
        { x: b.x, y: b.y, label: `(${b.x}, ${b.y})` },
      ],
      lines: [{ through: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }], style: "solid" }],
      xLabel: NX,
      yLabel: NY,
    });
    return true;
  }
  return false;
}

// L09 ----------------------------------------------------------------------
function authorL09(nodeId, p) {
  if (p.answer?.kind !== "coordinate") return false;
  // Interactive plot. May show a PRIOR point only when the prompt states it,
  // and never the answer coordinate.
  const target = answerCoordKey(p.answer.value);
  const given = extractPairs(p.prompt).filter((pt) => `${pt.x},${pt.y}` !== target);
  setSpec(nodeId, p, {
    kind: "coordinate",
    mode: "interactive",
    points: given.map((pt) => ({ x: pt.x, y: pt.y, label: `(${pt.x}, ${pt.y})` })),
    affordances: ["drag", "snap", "labels", "clear", "readout"], // see L01 note: "place" omitted (adapter explore trigger)
    snap: 1,
    xLabel: NX,
    yLabel: NY,
  });
  return true;
}

// L10 ----------------------------------------------------------------------
function authorL10(nodeId, p) {
  // Coordinate-answer items ONLY → interactive plot (points:[] — answer withheld).
  // numeric/choice items are stripped (compute-from-given-equation).
  if (p.answer?.kind !== "coordinate") return false;
  setSpec(nodeId, p, {
    kind: "coordinate",
    mode: "interactive",
    points: [],
    affordances: ["drag", "snap", "labels", "clear", "readout"], // see L01 note: "place" omitted (adapter explore trigger)
    snap: 1,
    xLabel: NX,
    yLabel: NY,
  });
  return true;
}

// L07 ----------------------------------------------------------------------
function authorL07(nodeId, p) {
  const ak = p.answer?.kind;
  const tbl = extractTableXY(p.prompt);
  if (ak === "coordinate") {
    // Plot-a-row → interactive plot. Show the OTHER table rows as context but
    // never the answer row.
    const target = answerCoordKey(p.answer.value);
    const ctx = tbl
      ? tbl.xs.map((x, i) => ({ x, y: tbl.ys[i] })).filter((pt) => `${pt.x},${pt.y}` !== target)
      : [];
    setSpec(nodeId, p, {
      kind: "coordinate",
      mode: "interactive",
      points: ctx.map((pt) => ({ x: pt.x, y: pt.y, label: `(${pt.x}, ${pt.y})` })),
      // NB: "place" is intentionally omitted. The B1 ProblemVisual adapter
      // derives Learn-explore (append-to-cap) from affordances.includes("place")
      // && interactive — including it would turn a single-answer PLOT into an
      // append-many explore (stray points). mode:"interactive" alone gives the
      // correct single-point reposition. (Flagged for mr-gates: the adapter
      // should gate explore on a Learn context, not on this affordance.)
      affordances: ["drag", "snap", "labels", "clear", "readout"],
      snap: 1,
      xLabel: NX,
      yLabel: NY,
    });
    return true;
  }
  if ((ak === "numeric" || ak === "choice") && tbl) {
    // Display table of the actual rows.
    setSpec(nodeId, p, {
      kind: "table",
      mode: "display",
      headers: ["x", "y"],
      rows: tbl.xs.map((x, i) => [String(x), String(tbl.ys[i])]),
    });
    return true;
  }
  return false;
}

// S01 ----------------------------------------------------------------------
function authorS01(nodeId, p) {
  // Display BOTH real lines; the intersection (answer) is geometrically present
  // = the extraction skill, not a leak.
  const eqs = extractLines(p.prompt);
  if (eqs.length >= 2) {
    setSpec(nodeId, p, {
      kind: "coordinate",
      mode: "display",
      lines: [
        { slope: eqs[0].slope, intercept: eqs[0].intercept, style: "solid" },
        { slope: eqs[1].slope, intercept: eqs[1].intercept, style: "solid" },
      ],
      xLabel: NX,
      yLabel: NY,
    });
    return true;
  }
  return false;
}

// L02 ----------------------------------------------------------------------
function authorL02(nodeId, p) {
  // Vertical-line-test point sets → display the points. Only author when the
  // prompt carries a clean numeric point set; prose function items are stripped.
  const pts = extractPairs(p.prompt);
  if (p.answer?.kind === "choice" && pts.length >= 2) {
    setSpec(nodeId, p, {
      kind: "coordinate",
      mode: "display",
      points: pts.map((pt) => ({ x: pt.x, y: pt.y, label: `(${pt.x}, ${pt.y})` })),
      xLabel: NX,
      yLabel: NY,
    });
    return true;
  }
  return false;
}

// L16 ----------------------------------------------------------------------
const L16_GIVEAWAY = [
  /,?\s*so the dots slope upward\b/gi,
  /,?\s*so the dots slope downward\b/gi,
  /,?\s*and the dots slope upward\b/gi,
  /,?\s*and the dots slope downward\b/gi,
  /\s*The dots slope upward\.?/gi,
  /\s*The dots slope downward\.?/gi,
];
function authorL16(nodeId, p) {
  // Minimal giveaway-sentence strip on L16 prompts (mr-kahn-flagged).
  let before = p.prompt;
  let after = before;
  for (const re of L16_GIVEAWAY) after = after.replace(re, "");
  after = after.replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").trim();
  if (after !== before) {
    p.prompt = after;
    bump(p);
    report.l16Text.push({ id: p.id, before, after });
  }
  // L16 items describe a scatter in words / a trend line in words; there is no
  // explicit point cloud in the data to render. Strip the decorative coordinate
  // visual (answerable as shipped) rather than fabricate a cloud.
  return false;
}

// L04 ----------------------------------------------------------------------
function authorL04(nodeId, p) {
  // Domain & Range: display the actual table of points when present.
  const pts = extractPairs(p.prompt);
  if (pts.length >= 2 && (p.answer?.kind === "choice" || p.answer?.kind === "numeric-set")) {
    setSpec(nodeId, p, {
      kind: "table",
      mode: "display",
      headers: ["x", "y"],
      rows: pts.map((pt) => [String(pt.x), String(pt.y)]),
    });
    return true;
  }
  return false;
}

// D03 ----------------------------------------------------------------------
function authorD03(nodeId, p) {
  // Two-way table: render the actual 2×2 cells. Parse "<a> & <b> = N" quadruples.
  const cellRe = /([A-Za-z][A-Za-z\s-]*?)\s*&\s*([A-Za-z][A-Za-z\s-]*?)\s*=\s*(\d+)/g;
  const cells = [];
  let m;
  let scan = p.prompt;
  while ((m = cellRe.exec(scan)) !== null) {
    cells.push({ row: m[1].trim(), col: m[2].trim(), n: Number(m[3]) });
  }
  if (cells.length === 4) {
    const rowKeys = [...new Set(cells.map((c) => c.row))];
    const colKeys = [...new Set(cells.map((c) => c.col))];
    if (rowKeys.length === 2 && colKeys.length === 2) {
      const cellOf = (r, c) => {
        const f = cells.find((x) => x.row === r && x.col === c);
        return f ? String(f.n) : "";
      };
      setSpec(nodeId, p, {
        kind: "table",
        mode: "display",
        headers: ["", colKeys[0], colKeys[1]],
        rows: rowKeys.map((r) => [r, cellOf(r, colKeys[0]), cellOf(r, colKeys[1])]),
      });
      return true;
    }
  }
  return false;
}

// F09 ----------------------------------------------------------------------
function authorF09(nodeId, p) {
  // Read-a-numberline: when the prompt names explicit signed values to compare,
  // mark those GIVEN values (they are the context the student reads; comparing
  // them is the skill). Never invent a landing/result marker.
  const re = /([+\-]\s?\d+(?:\.\d+)?)/g;
  const vals = [];
  let m;
  while ((m = re.exec(p.prompt)) !== null) {
    const v = Number(m[1].replace(/\s/g, ""));
    if (Number.isFinite(v)) vals.push(v);
  }
  const uniq = [...new Set(vals)];
  if (uniq.length >= 2 && uniq.length <= 3) {
    const min = Math.min(0, ...uniq);
    const max = Math.max(0, ...uniq);
    const pad = Math.max(1, Math.ceil((max - min) * 0.15));
    setSpec(nodeId, p, {
      kind: "numberline",
      mode: "display",
      range: { min: min - pad, max: max + pad },
      markers: uniq.map((v) => ({ value: v, label: String(v) })),
    });
    return true;
  }
  return false;
}

const AUTHORS = {
  "ALG-L01": authorL01,
  "ALG-L05": authorSlope,
  "ALG-L06": authorSlope,
  "ALG-L09": authorL09,
  "ALG-L10": authorL10,
  "ALG-L07": authorL07,
  "ALG-S01": authorS01,
  "ALG-L02": authorL02,
  "ALG-L16": authorL16,
  "ALG-L04": authorL04,
  "ALG-D03": authorD03,
  "ALG-F09": authorF09,
  // F01/F02 per-item numberlines have no reliably-extractable START value
  // (prose-embedded, and the landing value is the answer — marking the wrong
  // one leaks). They are stripped; the F09/lesson numberline carries the kind.
  "ALG-F01": () => false,
  "ALG-F02": () => false,
};

// ---------------------------------------------------------------------------
// Main pass.
// ---------------------------------------------------------------------------

const graph = JSON.parse(readFileSync(GRAPH_URL, "utf8"));

for (const node of graph.nodes) {
  const buckets = node.problems || {};
  for (const key of ["p1", "p2", "p3"]) {
    const list = buckets[key];
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      const visual = typeof p.visual === "string" ? p.visual : null;

      // STEP 2a — DRIFT: always null (no primitive built in B). Idempotent.
      if (visual !== null && DRIFT_KINDS.has(visual)) {
        report.drift += 1;
        nullVisual(p);
        continue;
      }

      // Idempotent: a spec already present means this item is authored — skip.
      if (p.visualSpec) continue;

      const isWave1 = WAVE1.has(node.id);

      if (isWave1) {
        // STEP 3 — author where geometry is extractable; null the residual.
        const authored = AUTHORS[node.id](node.id, p);
        if (!authored) {
          // Residual Wave-1 item: only null if it is a renderable decoration
          // (renderable visual + non-geometry answer). Coordinate-answer items
          // we couldn't author are left as-is (they carry a geometry answer).
          if (
            visual !== null &&
            RENDERABLE.has(visual) &&
            p.answer?.kind !== "coordinate"
          ) {
            nullVisual(p);
          }
        }
        continue;
      }

      // STEP 2b — DECORATION strip on non-Wave-1 nodes.
      const answerKind = p.answer?.kind;
      if (
        visual !== null &&
        RENDERABLE.has(visual) &&
        STRIP_ANSWER_KINDS.has(answerKind)
      ) {
        nullVisual(p);
      }
      // balance / area-model are left as-is (valid kind, warning-only, acceptable).
    }
  }
}

writeFileSync(GRAPH_URL, JSON.stringify(graph, null, 2) + "\n", "utf8");

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
const authoredTotal = Object.values(report.authored).reduce((s, v) => s + v, 0);
console.log("Phase 8 / B2 visual pass complete.");
console.log(`Drift nulled:      ${report.drift}`);
console.log(`Decoration nulled: ${report.stripped - report.drift} (strip+residual, excl. drift)`);
console.log(`Total nulled:      ${report.stripped}`);
console.log(`Specs authored:    ${authoredTotal}`);
console.log("Authored by node:");
for (const [id, n] of Object.entries(report.authored).sort()) {
  console.log(`  ${id}: ${n}`);
}
console.log(`L16 text edits:    ${report.l16Text.length}`);
for (const e of report.l16Text.slice(0, 3)) {
  console.log(`  ${e.id}\n    before: ${e.before}\n    after:  ${e.after}`);
}
