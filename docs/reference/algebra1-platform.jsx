import React, { useState, useMemo } from "react";

/* =====================================================================================
   A3 ACADEMY — ALGEBRA 1 ADAPTIVE LEARNING PLATFORM (Prototype Artifact)
   -------------------------------------------------------------------------------------
   Single-file prototype demonstrating the full adaptive loop:
     Diagnostic -> Skill Graph -> Mastery State -> Visual Instruction
     -> Practice -> AI Remediation -> Updated Mastery -> Next Recommendation

   NOTE ON DATA: The production app ingests the real 65-node / 109-edge curriculum JSON.
   This prototype embeds a representative 16-node subgraph below (GRAPH). The import +
   validation layer (validateGraph) is written to accept the real file unchanged — swap
   GRAPH for the parsed JSON and everything downstream (engine, router, UI) works as-is.
   ===================================================================================== */

/* -------------------------------------------------------------------------------------
   TYPES (documented inline; production lives in /types/*.ts)
   SkillNode    : { id, title, domain, objective, prereqs[], content, problems{p1,p2,p3} }
   StudentState : { [skillId]: { mastery, status, phase, attempts, correct, hints,
                                 timeMs, lastFive[], transfer, introduced } }
   ------------------------------------------------------------------------------------- */

const DOMAINS = [
  { id: "foundations", label: "Foundations" },
  { id: "equations", label: "Equations" },
  { id: "linear", label: "Linear Functions" },
  { id: "systems", label: "Systems" },
];

/* ---- representative subgraph (source-of-truth shape mirrors the real JSON) ---- */
const GRAPH = {
  schema: { version: "1.0", course: "Algebra 1" },
  nodes: [
    // FOUNDATIONS
    { id: "F1", title: "Integer Operations", domain: "foundations", prereqs: [],
      objective: "Add, subtract, multiply, and divide signed integers fluently.",
      content: {
        concept: "Direction matters. Sign tells you which way to move on the number line; magnitude tells you how far.",
        worked: { problem: "−4 + 7", steps: ["Start at −4 on the line.", "Add 7 → move 7 units right.", "Land on +3."], result: "3" },
        baseball: "A team is 4 runs down (−4), then scores 7 (+7). Net run differential: +3.",
        neutral: "−4 + 7 = 3. Combining a negative and a larger positive yields a positive.",
        visual: "numberline",
      },
      problems: { p1: [], p2: [], p3: [] } },

    { id: "F2", title: "Order of Operations", domain: "foundations", prereqs: ["F1"],
      objective: "Evaluate expressions using PEMDAS conventions correctly.",
      content: {
        concept: "Resolve grouping and exponents before multiplication/division, and those before addition/subtraction.",
        worked: { problem: "3 + 4 × 2", steps: ["Multiplication first: 4 × 2 = 8.", "Then add: 3 + 8."], result: "11" },
        baseball: "Total bases = 3 singles + 2 doubles × 2 bases each → multiply before adding.",
        neutral: "3 + 4 × 2 = 11, not 14. Operations are not strictly left-to-right.",
        visual: null,
      },
      problems: { p1: [], p2: [], p3: [] } },

    { id: "F3", title: "Combining Like Terms", domain: "foundations", prereqs: ["F1"],
      objective: "Simplify expressions by combining terms with identical variable parts.",
      content: {
        concept: "Only terms with the same variable part combine. Coefficients add; the variable part stays.",
        worked: { problem: "5x + 3 − 2x", steps: ["Group x-terms: 5x − 2x = 3x.", "Carry the constant: + 3."], result: "3x + 3" },
        baseball: "5 at-bats + 3 walks − 2 at-bats: at-bats combine (3), walks stay separate.",
        neutral: "5x + 3 − 2x simplifies to 3x + 3.",
        visual: null,
      },
      problems: { p1: [], p2: [], p3: [] } },

    { id: "F4", title: "Distributive Property", domain: "foundations", prereqs: ["F1", "F3"],
      objective: "Apply a(b + c) = ab + ac to expand and simplify.",
      content: {
        concept: "A factor outside parentheses multiplies every term inside.",
        worked: { problem: "3(x + 4)", steps: ["Multiply 3 · x = 3x.", "Multiply 3 · 4 = 12.", "Combine."], result: "3x + 12" },
        baseball: "3 innings of (2 strikeouts + 1 walk) → distribute the 3 across each event.",
        neutral: "3(x + 4) = 3x + 12.",
        visual: null,
      },
      problems: { p1: [], p2: [], p3: [] } },

    // EQUATIONS
    { id: "E1", title: "One-Step Equations", domain: "equations", prereqs: ["F1", "F2"],
      objective: "Solve equations using a single inverse operation.",
      content: {
        concept: "Undo the operation attached to the variable to isolate it.",
        worked: { problem: "x + 7 = 12", steps: ["Subtract 7 from both sides.", "x = 5."], result: "x = 5" },
        baseball: "A hitter needs to reach 12 hits and has 7. x + 7 = 12 → 5 more hits.",
        neutral: "x + 7 = 12 → x = 5.",
        visual: null,
      },
      problems: { p1: [], p2: [], p3: [] } },

    { id: "E2", title: "Two-Step Equations", domain: "equations", prereqs: ["E1"],
      objective: "Solve equations requiring two inverse operations in order.",
      content: {
        concept: "Undo addition/subtraction first, then undo multiplication/division.",
        worked: { problem: "3x + 4 = 19", steps: ["Subtract 4: 3x = 15.", "Divide by 3: x = 5."], result: "x = 5" },
        baseball: "A player has 7 hits and adds 2 per game. 2g + 7 = 19 → reaches 19 hits in 6 games.",
        neutral: "Isolate the variable term, then divide by its coefficient.",
        visual: null,
      },
      problems: {
        p1: [
          { id: "E2-p1-a", prompt: "A player has 7 hits and gets 2 hits per game. After how many games g does he reach 19 hits?  (2g + 7 = 19)",
            answer: "6", hint: "Subtract the 7 he already has, then divide by his per-game rate.",
            explanation: "2g + 7 = 19 → 2g = 12 → g = 6 games.", misconceptions: { "12": "subtracted-not-divided", "13": "divided-first" } },
          { id: "E2-p1-b", prompt: "A pitcher allows 3 runs per game plus 2 unearned. Total runs after g games is 17:  3g + 2 = 17. Find g.",
            answer: "5", hint: "Remove the constant first, then undo the multiplication.", explanation: "3g + 2 = 17 → 3g = 15 → g = 5.", misconceptions: { "15": "subtracted-not-divided" } },
        ],
        p2: [
          { id: "E2-p2-a", prompt: "The line of total bases follows 4b + 5 = 29, where b is games. Solve for b.",
            answer: "6", hint: "Two steps: undo +5, then undo ×4.", explanation: "4b + 5 = 29 → 4b = 24 → b = 6.", misconceptions: { "24": "subtracted-not-divided" } },
        ],
        p3: [
          { id: "E2-p3-a", prompt: "Solve:  3x + 4 = 19", answer: "5", hint: "Subtract 4 from both sides, then divide by 3.",
            explanation: "3x + 4 = 19 → 3x = 15 → x = 5.", misconceptions: { "15": "subtracted-not-divided", "23": "added-instead" } },
          { id: "E2-p3-b", prompt: "Solve:  5x − 8 = 12", answer: "4", hint: "Add 8 first, then divide by 5.",
            explanation: "5x − 8 = 12 → 5x = 20 → x = 4.", misconceptions: { "20": "subtracted-not-divided", "0.8": "divided-first" } },
        ],
      } },

    { id: "E3", title: "Multi-Step Equations", domain: "equations", prereqs: ["E2", "F4"],
      objective: "Solve equations needing distribution and combining before isolating.",
      content: {
        concept: "Simplify each side (distribute, combine like terms) before applying inverse operations.",
        worked: { problem: "2(x + 3) = 14", steps: ["Distribute: 2x + 6 = 14.", "Subtract 6: 2x = 8.", "Divide by 2: x = 4."], result: "x = 4" },
        baseball: "Expand a multi-inning total, then solve for the unknown rate.",
        neutral: "2(x + 3) = 14 → x = 4.",
        visual: null,
      },
      problems: { p1: [], p2: [], p3: [] } },

    { id: "E4", title: "Variables on Both Sides", domain: "equations", prereqs: ["E3"],
      objective: "Solve equations with variable terms on both sides.",
      content: {
        concept: "Collect variables on one side, constants on the other, then isolate.",
        worked: { problem: "5x − 2 = 3x + 8", steps: ["Subtract 3x: 2x − 2 = 8.", "Add 2: 2x = 10.", "Divide: x = 5."], result: "x = 5" },
        baseball: "Two players' projected hit totals meet at the same game — solve for when.",
        neutral: "5x − 2 = 3x + 8 → x = 5.",
        visual: null,
      },
      problems: { p1: [], p2: [], p3: [] } },

    // LINEAR FUNCTIONS
    { id: "L1", title: "The Coordinate Plane", domain: "linear", prereqs: ["F1"],
      objective: "Plot and read ordered pairs across all four quadrants.",
      content: {
        concept: "An ordered pair (x, y) names a horizontal then vertical position from the origin.",
        worked: { problem: "Plot (3, 2)", steps: ["Move 3 right along x.", "Move 2 up along y.", "Mark the point."], result: "(3, 2)" },
        baseball: "A spray chart: x = how far left/right of center, y = depth into the field.",
        neutral: "(3, 2) sits 3 right and 2 up from the origin.",
        visual: "coordinate",
      },
      problems: { p1: [], p2: [], p3: [] } },

    { id: "L2", title: "Slope as Rate of Change", domain: "linear", prereqs: ["F1"],
      objective: "Interpret slope as a constant rate: change in output per unit input.",
      content: {
        concept: "Slope = rise / run = change in y divided by change in x. It is a steady rate.",
        worked: { problem: "Through (4, 6) and (10, 18)", steps: ["Rise = 18 − 6 = 12.", "Run = 10 − 4 = 6.", "Slope = 12 / 6 = 2."], result: "slope = 2" },
        baseball: "Cumulative hits over games: 6 hits at game 4, 18 hits at game 10 → 2 hits per game.",
        neutral: "Between two points, slope is the ratio of vertical change to horizontal change.",
        visual: "coordinate",
      },
      problems: {
        p1: [
          { id: "L2-p1-a", prompt: "A hitter has 6 cumulative hits after 4 games and 18 after 10 games. What is his hits-per-game rate?",
            answer: "2", hint: "Change in hits divided by change in games.", explanation: "(18 − 6)/(10 − 4) = 12/6 = 2 hits per game.", misconceptions: { "12": "forgot-denominator", "0.5": "inverted" } },
          { id: "L2-p1-b", prompt: "A pitcher's strikeout count goes from 12 (game 2) to 27 (game 7). Strikeouts per game?",
            answer: "3", hint: "Rise over run: ΔK over Δgames.", explanation: "(27 − 12)/(7 − 2) = 15/5 = 3.", misconceptions: { "15": "forgot-denominator" } },
        ],
        p2: [
          { id: "L2-p2-a", prompt: "On a graph (x = games, y = total hits), a line passes through (4, 6) and (10, 18). Find the slope.",
            answer: "2", hint: "Pick the two points; rise over run.", explanation: "Δy/Δx = (18−6)/(10−4) = 2.", misconceptions: { "0.5": "inverted" }, visual: "coordinate", pts: [[4,6],[10,18]] },
        ],
        p3: [
          { id: "L2-p3-a", prompt: "Find the slope of the line through (2, 3) and (6, 11).",
            answer: "2", hint: "(y₂ − y₁) / (x₂ − x₁).", explanation: "(11 − 3)/(6 − 2) = 8/4 = 2.", misconceptions: { "8": "forgot-denominator", "0.5": "inverted" }, visual: "coordinate", pts: [[2,3],[6,11]] },
          { id: "L2-p3-b", prompt: "Find the slope of the line through (1, 5) and (4, 14).",
            answer: "3", hint: "Change in y over change in x.", explanation: "(14 − 5)/(4 − 1) = 9/3 = 3.", misconceptions: { "9": "forgot-denominator" }, visual: "coordinate", pts: [[1,5],[4,14]] },
        ],
      } },

    { id: "L3", title: "Slope from Two Points", domain: "linear", prereqs: ["L2", "L1"],
      objective: "Compute slope from any two coordinate pairs using the formula.",
      content: {
        concept: "Apply m = (y₂ − y₁)/(x₂ − x₁) consistently in the same order.",
        worked: { problem: "(1, 2) and (5, 10)", steps: ["Δy = 10 − 2 = 8.", "Δx = 5 − 1 = 4.", "m = 8/4 = 2."], result: "m = 2" },
        baseball: "Two box-score snapshots give two points; the formula gives the rate between them.",
        neutral: "m = (y₂ − y₁)/(x₂ − x₁).",
        visual: "coordinate",
      },
      problems: { p1: [], p2: [], p3: [] } },

    { id: "L4", title: "Graphing Linear Equations", domain: "linear", prereqs: ["L1", "L2"],
      objective: "Graph a line from a point and a slope.",
      content: {
        concept: "Plot a known point, then use rise/run to step to the next point and connect.",
        worked: { problem: "y = 2x + 1", steps: ["Plot intercept (0, 1).", "Slope 2 → up 2, right 1 → (1, 3).", "Draw the line."], result: "line through (0,1),(1,3)" },
        baseball: "A projected season pace becomes a straight line you can read forward.",
        neutral: "Use the intercept and slope to generate two points.",
        visual: "coordinate",
      },
      problems: { p1: [], p2: [], p3: [] } },

    { id: "L5", title: "Slope-Intercept Form", domain: "linear", prereqs: ["L4", "E2"],
      objective: "Read slope and intercept directly from y = mx + b.",
      content: {
        concept: "In y = mx + b, m is the slope and b is where the line crosses the y-axis.",
        worked: { problem: "y = 3x − 2", steps: ["Slope m = 3.", "Intercept b = −2."], result: "m=3, b=−2" },
        baseball: "Starting total (b) plus per-game rate (m) projects a season line.",
        neutral: "y = mx + b separates rate (m) from starting value (b).",
        visual: null,
      },
      problems: { p1: [], p2: [], p3: [] } },

    { id: "L6", title: "Writing Linear Equations", domain: "linear", prereqs: ["L5", "L3"],
      objective: "Build y = mx + b from a slope and a point or two points.",
      content: {
        concept: "Find m, then solve for b using a known point.",
        worked: { problem: "slope 2 through (1, 5)", steps: ["y = 2x + b.", "5 = 2(1) + b → b = 3."], result: "y = 2x + 3" },
        baseball: "Given a player's rate and one game's total, write the full projection equation.",
        neutral: "Substitute the point to solve for b.",
        visual: null,
      },
      problems: { p1: [], p2: [], p3: [] } },

    // SYSTEMS
    { id: "S1", title: "Systems by Graphing", domain: "systems", prereqs: ["L4", "L5"],
      objective: "Find a solution as the intersection point of two lines.",
      content: {
        concept: "The solution to a system is the point both lines share.",
        worked: { problem: "y = x + 1, y = −x + 5", steps: ["Graph both.", "They cross at (2, 3)."], result: "(2, 3)" },
        baseball: "Two players' projection lines cross at the game their totals are equal.",
        neutral: "Intersection of the two lines is the solution.",
        visual: "coordinate",
      },
      problems: { p1: [], p2: [], p3: [] } },

    { id: "S2", title: "Systems by Substitution", domain: "systems", prereqs: ["E4", "L5"],
      objective: "Solve a system algebraically by substituting one equation into another.",
      content: {
        concept: "Replace a variable using one equation, then solve the resulting single-variable equation.",
        worked: { problem: "y = 2x, x + y = 9", steps: ["Substitute: x + 2x = 9.", "3x = 9 → x = 3.", "y = 6."], result: "(3, 6)" },
        baseball: "Express one stat in terms of another, then solve the combined constraint.",
        neutral: "Substitution reduces two variables to one.",
        visual: null,
      },
      problems: { p1: [], p2: [], p3: [] } },
  ],
};

// Build edge list from prereqs (the real JSON ships explicit edges; we derive here)
const EDGES = GRAPH.nodes.flatMap((n) => n.prereqs.map((p) => ({ from: p, to: n.id })));

/* =====================================================================================
   VALIDATION LAYER  (lib/validation)
   Accepts the real JSON unchanged. Reports orphan nodes, invalid edges, cycles, schema.
   ===================================================================================== */
function validateGraph(graph) {
  const ids = new Set(graph.nodes.map((n) => n.id));
  const issues = { invalidEdges: [], orphans: [], cycles: [], schema: [], ok: true };

  if (!graph.schema || !graph.schema.version) issues.schema.push("Missing schema.version");
  graph.nodes.forEach((n) => {
    if (!n.id) issues.schema.push("Node missing id");
    if (!n.domain || !DOMAINS.find((d) => d.id === n.domain)) issues.schema.push(`Node ${n.id}: unknown domain "${n.domain}"`);
    if (!Array.isArray(n.prereqs)) issues.schema.push(`Node ${n.id}: prereqs not an array`);
  });

  // invalid edges: prereq pointing to non-existent node
  graph.nodes.forEach((n) =>
    n.prereqs.forEach((p) => { if (!ids.has(p)) issues.invalidEdges.push(`${p} → ${n.id} (source missing)`); })
  );

  // orphans: no prereqs AND nothing depends on it
  const hasDependents = new Set(EDGES.map((e) => e.from));
  graph.nodes.forEach((n) => {
    if (n.prereqs.length === 0 && !hasDependents.has(n.id)) issues.orphans.push(n.id);
  });

  // cycle detection (DFS)
  const adj = {}; graph.nodes.forEach((n) => (adj[n.id] = n.prereqs));
  const WHITE = 0, GRAY = 1, BLACK = 2; const color = {};
  graph.nodes.forEach((n) => (color[n.id] = WHITE));
  const dfs = (u, stack) => {
    color[u] = GRAY;
    for (const v of adj[u] || []) {
      if (!ids.has(v)) continue;
      if (color[v] === GRAY) { issues.cycles.push([...stack, u, v].join(" → ")); return; }
      if (color[v] === WHITE) dfs(v, [...stack, u]);
    }
    color[u] = BLACK;
  };
  graph.nodes.forEach((n) => { if (color[n.id] === WHITE) dfs(n.id, []); });

  issues.ok = !issues.invalidEdges.length && !issues.cycles.length && !issues.schema.length;
  return issues;
}

/* =====================================================================================
   MASTERY ENGINE  (lib/mastery-engine)
   Deterministic mastery score + status from attempt evidence and prerequisite state.
   ===================================================================================== */
const STATUS = {
  unknown: { label: "Unknown", color: "#9aa3b0" },
  introduced: { label: "Introduced", color: "#6b7280" },
  developing: { label: "Developing", color: "#b07d00" },
  near: { label: "Near Mastery", color: "#2b6cb0" },
  mastered: { label: "Mastered", color: "#2f7d5b" },
  review: { label: "Needs Review", color: "#9a5b3f" },
  gap: { label: "Prerequisite Gap", color: "#b4543f" },
};

function recentAccuracy(s) {
  if (!s.lastFive.length) return 0;
  return s.lastFive.reduce((a, b) => a + (b ? 1 : 0), 0) / s.lastFive.length;
}
function overallAccuracy(s) { return s.attempts ? s.correct / s.attempts : 0; }
function consistency(s) {
  if (s.lastFive.length < 2) return 0.5;
  const m = recentAccuracy(s);
  const v = s.lastFive.reduce((a, b) => a + Math.pow((b ? 1 : 0) - m, 2), 0) / s.lastFive.length;
  return 1 - Math.min(v * 2, 1); // lower variance -> higher consistency
}

function computeMastery(state, skillId, allMastery) {
  const s = state[skillId];
  const node = GRAPH.nodes.find((n) => n.id === skillId);

  // prerequisite gate
  const gapPrereq = node.prereqs.find((p) => (allMastery[p] ?? 0) < 0.7);
  if (gapPrereq) return { score: s.mastery ?? 0, status: "gap", blockedBy: gapPrereq };

  if (!s.attempts && !s.introduced) return { score: 0, status: "unknown" };
  if (s.attempts < 2) return { score: s.mastery ?? 0.1, status: "introduced" };

  const ra = recentAccuracy(s);
  const oa = overallAccuracy(s);
  const hintPenalty = Math.min(0.05 * (s.hints / Math.max(s.attempts, 1)), 0.15);
  const transferComp = s.transfer ? 0.15 : 0; // phase-3 neutral demonstrated
  const raw = 0.5 * ra + 0.2 * oa + 0.15 * consistency(s) + transferComp - hintPenalty;
  const score = Math.max(0, Math.min(1, raw));

  let status;
  if (score >= 0.85 && s.transfer) status = "mastered";
  else if (score >= 0.7) status = "near";
  else if (score >= 0.45) status = "developing";
  else status = "introduced";

  // decay: was strong, recent dip
  if (s.wasMastered && ra < 0.6) status = "review";

  return { score, status };
}

/* =====================================================================================
   ADAPTIVE ROUTER  (lib/adaptive-router)
   Deterministic next-skill selection. Routes backward on prerequisite gaps.
   ===================================================================================== */
function masteryMap(state) {
  const m = {};
  // first pass: raw scores
  GRAPH.nodes.forEach((n) => (m[n.id] = state[n.id]?.mastery ?? 0));
  return m;
}

function recommend(state) {
  const mm = masteryMap(state);
  const evals = {};
  GRAPH.nodes.forEach((n) => (evals[n.id] = computeMastery(state, n.id, mm)));

  // 1) find an unmet prerequisite blocking a near-ready skill -> route backward
  const blocked = GRAPH.nodes
    .map((n) => ({ n, e: evals[n.id] }))
    .filter((x) => x.e.status === "gap");
  if (blocked.length) {
    // recommend the weakest blocking prerequisite that itself is unblocked
    const blockers = blocked.map((b) => b.e.blockedBy);
    const target = blockers
      .map((id) => ({ id, e: evals[id] }))
      .filter((x) => x.e.status !== "gap" && x.e.status !== "mastered")
      .sort((a, b) => a.e.score - b.e.score)[0];
    if (target) {
      const blockedTitle = GRAPH.nodes.find((n) => n.id === blocked.find((x) => x.e.blockedBy === target.id).n.id).title;
      return {
        skillId: target.id,
        reason: `${blockedTitle} is blocked. Strengthen its prerequisite first so the path opens cleanly.`,
        kind: "remediate",
        alert: blockedTitle,
      };
    }
  }

  // 2) among unblocked, not-yet-mastered skills, pick lowest mastery (earliest domain breaks ties)
  const order = DOMAINS.map((d) => d.id);
  const candidates = GRAPH.nodes
    .map((n) => ({ n, e: evals[n.id] }))
    .filter((x) => x.e.status !== "gap" && x.e.status !== "mastered")
    .sort((a, b) => (a.e.score - b.e.score) || (order.indexOf(a.n.domain) - order.indexOf(b.n.domain)));

  if (!candidates.length) return { skillId: null, reason: "Every skill in the current map is mastered. Excellent.", kind: "advance" };

  const top = candidates[0];
  const reason =
    top.e.status === "review"
      ? "Recent accuracy dipped on a previously strong skill. A short review will restore it."
      : `Lowest mastery among skills you're ready for. Building it strengthens the ${DOMAINS.find((d) => d.id === top.n.domain).label} domain.`;
  return { skillId: top.n.id, reason, kind: top.e.status === "developing" || top.e.status === "introduced" ? "continue" : "review" };
}

/* =====================================================================================
   MOCK STUDENT STATE  (Supabase-ready; replace with fetched StudentSkillState rows)
   ===================================================================================== */
const blank = () => ({ mastery: 0, status: "unknown", phase: 1, attempts: 0, correct: 0, hints: 0, timeMs: 0, lastFive: [], transfer: false, introduced: false, wasMastered: false });

function seedStudent() {
  const st = {};
  GRAPH.nodes.forEach((n) => (st[n.id] = blank()));
  const set = (id, o) => (st[id] = { ...st[id], ...o, introduced: true });
  // Foundations + one-step: mastered
  ["F1", "F2", "F3", "F4", "E1", "L1"].forEach((id) =>
    set(id, { mastery: 0.92, status: "mastered", phase: 3, attempts: 8, correct: 8, hints: 1, lastFive: [true, true, true, true, true], transfer: true, wasMastered: true })
  );
  // Two-step: developing, phase 2
  set("E2", { mastery: 0.52, status: "developing", phase: 2, attempts: 6, correct: 4, hints: 3, lastFive: [false, true, true, false, true], transfer: false });
  // Slope: developing, phase 1  (recommended next)
  set("L2", { mastery: 0.46, status: "developing", phase: 1, attempts: 4, correct: 2, hints: 2, lastFive: [true, false, false, true], transfer: false });
  return st;
}

/* =====================================================================================
   SMALL UI PRIMITIVES
   ===================================================================================== */
function StatusPill({ status, small }) {
  const s = STATUS[status] || STATUS.unknown;
  return (
    <span className="inline-flex items-center gap-1.5" style={{ fontSize: small ? 11 : 12.5 }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: s.color, display: "inline-block" }} />
      <span style={{ color: "#3a4250", fontWeight: 500, letterSpacing: 0.1 }}>{s.label}</span>
    </span>
  );
}

function Progress({ value, color = "#2a4878", height = 6 }) {
  return (
    <div style={{ background: "#eef0f4", borderRadius: 99, height, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${Math.round(value * 100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width .6s cubic-bezier(.2,.7,.2,1)" }} />
    </div>
  );
}

function Card({ children, style, className = "" }) {
  return (
    <div className={className} style={{ background: "#fff", border: "1px solid #e7e9ee", borderRadius: 14, boxShadow: "0 1px 2px rgba(16,24,40,.04)", ...style }}>
      {children}
    </div>
  );
}

function MathExpr({ children }) {
  return <span className="font-mono" style={{ color: "#16202e", fontSize: "1.02em", letterSpacing: 0.2 }}>{children}</span>;
}

/* Number line SVG */
function NumberLine({ from = -6, to = 6, mark }) {
  const W = 460, pad = 24, y = 34;
  const span = to - from;
  const xOf = (n) => pad + ((n - from) / span) * (W - 2 * pad);
  const ticks = []; for (let i = from; i <= to; i++) ticks.push(i);
  return (
    <svg viewBox={`0 0 ${W} 64`} width="100%" style={{ maxWidth: W }}>
      <line x1={pad} y1={y} x2={W - pad} y2={y} stroke="#cdd2db" strokeWidth="1.5" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={xOf(t)} y1={y - 4} x2={xOf(t)} y2={y + 4} stroke="#cdd2db" strokeWidth="1.5" />
          <text x={xOf(t)} y={y + 18} textAnchor="middle" fontSize="11" fill="#8a93a3" className="font-mono">{t}</text>
        </g>
      ))}
      {typeof mark === "number" && (
        <g>
          <circle cx={xOf(mark)} cy={y} r="6" fill="#2a4878" />
          <circle cx={xOf(mark)} cy={y} r="11" fill="none" stroke="#2a4878" strokeOpacity="0.25" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

/* Coordinate plane SVG with optional line through 2 points */
function CoordinatePlane({ pts = [], showLine = true, range = 12 }) {
  const S = 280, pad = 28, gridMax = range;
  const unit = (S - 2 * pad) / (gridMax + 2);
  const ox = pad, oy = S - pad; // origin (bottom-left-ish, x→right y→up)
  const px = (x) => ox + (x + 1) * unit;
  const py = (y) => oy - (y + 1) * unit;
  const lines = [];
  for (let i = 0; i <= gridMax + 1; i++) lines.push(i);
  let lineEls = null;
  if (showLine && pts.length === 2) {
    const [a, b] = pts;
    const m = (b[1] - a[1]) / (b[0] - a[0]);
    const yAt = (x) => a[1] + m * (x - a[0]);
    lineEls = <line x1={px(0)} y1={py(yAt(0))} x2={px(gridMax)} y2={py(yAt(gridMax))} stroke="#2a4878" strokeWidth="2.5" strokeLinecap="round" />;
  }
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ maxWidth: S }}>
      {lines.map((i) => (
        <g key={i}>
          <line x1={px(i)} y1={py(0)} x2={px(i)} y2={py(gridMax)} stroke="#f0f2f6" strokeWidth="1" />
          <line x1={px(0)} y1={py(i)} x2={px(gridMax)} y2={py(i)} stroke="#f0f2f6" strokeWidth="1" />
        </g>
      ))}
      <line x1={px(0)} y1={py(0)} x2={px(gridMax)} y2={py(0)} stroke="#c2c8d2" strokeWidth="1.5" />
      <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(gridMax)} stroke="#c2c8d2" strokeWidth="1.5" />
      {lineEls}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={px(p[0])} cy={py(p[1])} r="5" fill="#16202e" />
          <text x={px(p[0]) + 8} y={py(p[1]) - 8} fontSize="11" fill="#16202e" className="font-mono">({p[0]}, {p[1]})</text>
        </g>
      ))}
    </svg>
  );
}

/* =====================================================================================
   AI TUTOR  (lib/ai-tutor) — bounded helper. Explains, hints, reframes. Never routes.
   Deterministic rule-based stand-in for the production model call.
   ===================================================================================== */
function tutorRemediation(misconception, node) {
  const map = {
    "subtracted-not-divided": "You undid the addition but stopped there — the variable still has a coefficient. Divide both sides by it as the final step.",
    "divided-first": "Order matters: undo addition/subtraction before dividing. Clear the constant, then divide.",
    "forgot-denominator": "Slope is a ratio. You found the rise but didn't divide by the run. Divide the change in y by the change in x.",
    "inverted": "Check your ratio orientation: slope is rise over run (Δy / Δx), not run over rise.",
    "added-instead": "Re-read the operation. The constant is added to the variable term, so you subtract it to isolate.",
  };
  const base = map[misconception] || "Walk back through the worked example one line at a time and compare each step to your work.";
  return {
    diagnosis: base,
    reframe: node.content.baseball,
    bridge: "Once it clicks in the baseball framing, re-solve the neutral version to confirm the idea transfers.",
  };
}

/* =====================================================================================
   APPLICATION SHELL + ROUTER
   ===================================================================================== */
const ACCENT = "#2a4878";

export default function App() {
  const [view, setView] = useState("home"); // home | diagnostic | learn | practice | summary | dev
  const [student, setStudent] = useState(seedStudent);
  const [activeSkill, setActiveSkill] = useState(null);
  const [sessionResult, setSessionResult] = useState(null);

  const validation = useMemo(() => validateGraph(GRAPH), []);
  const rec = useMemo(() => recommend(student), [student]);
  const recNode = rec.skillId ? GRAPH.nodes.find((n) => n.id === rec.skillId) : null;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500&display=swap');
    * { box-sizing: border-box; }
    .app-root { font-family: 'Hanken Grotesk', sans-serif; color: #16202e; -webkit-font-smoothing: antialiased; }
    .font-display { font-family: 'Fraunces', serif; }
    .font-mono { font-family: 'Spline Sans Mono', monospace; }
    .fade-in { animation: fadeIn .45s cubic-bezier(.2,.7,.2,1) both; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .stagger > * { animation: fadeIn .5s cubic-bezier(.2,.7,.2,1) both; }
    .stagger > *:nth-child(1){animation-delay:.04s}
    .stagger > *:nth-child(2){animation-delay:.10s}
    .stagger > *:nth-child(3){animation-delay:.16s}
    .stagger > *:nth-child(4){animation-delay:.22s}
    .nav-btn { transition: background .15s, color .15s; }
    .nav-btn:hover { background: #f3f5f8; }
    .primary-btn { transition: background .15s, transform .05s; }
    .primary-btn:hover { background: #1f3860; }
    .primary-btn:active { transform: translateY(1px); }
    .ghost-btn:hover { background: #f3f5f8; }
    input:focus { outline: none; border-color: ${ACCENT} !important; box-shadow: 0 0 0 3px rgba(42,72,120,.12); }
  `;

  const navItems = [
    { id: "home", label: "Learning Home" },
    { id: "diagnostic", label: "Diagnostic" },
    { id: "dev", label: "Graph Inspector" },
  ];

  const startSession = (skillId) => { setActiveSkill(skillId); setView("learn"); };

  return (
    <div className="app-root" style={{ background: "#fbfbfc", minHeight: "100vh" }}>
      <style>{css}</style>

      {/* Top bar */}
      <header style={{ borderBottom: "1px solid #e7e9ee", background: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="font-display" style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>A</span>
            </div>
            <div>
              <div className="font-display" style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1 }}>Algebra 1</div>
              <div style={{ fontSize: 11, color: "#8a93a3", letterSpacing: 0.3, marginTop: 2 }}>A3 ACADEMY · ADAPTIVE</div>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 4 }}>
            {navItems.map((it) => (
              <button key={it.id} onClick={() => setView(it.id)} className="nav-btn"
                style={{ border: "none", background: view === it.id ? "#f0f2f6" : "transparent", color: view === it.id ? "#16202e" : "#5b6573",
                  padding: "8px 14px", borderRadius: 8, fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                {it.label}
              </button>
            ))}
            <div style={{ width: 1, background: "#e7e9ee", margin: "8px 8px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 9, paddingLeft: 4 }}>
              <div style={{ width: 30, height: 30, borderRadius: 99, background: "#eef0f4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 600, color: "#5b6573" }}>JM</div>
            </div>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1140, margin: "0 auto", padding: "36px 28px 80px" }}>
        {view === "home" && <Home student={student} rec={rec} recNode={recNode} onStart={startSession} onDiagnostic={() => setView("diagnostic")} />}
        {view === "diagnostic" && <Diagnostic onComplete={(st, start) => { setStudent(st); setView("home"); }} onCancel={() => setView("home")} />}
        {view === "learn" && activeSkill && <Learn skillId={activeSkill} student={student} onPractice={() => setView("practice")} onBack={() => setView("home")} />}
        {view === "practice" && activeSkill && (
          <Practice skillId={activeSkill} student={student}
            onComplete={(updatedStudent, result) => { setStudent(updatedStudent); setSessionResult(result); setView("summary"); }}
            onBack={() => setView("learn")} />
        )}
        {view === "summary" && sessionResult && (
          <Summary result={sessionResult} student={student}
            onNext={() => { const r = recommend(student); if (r.skillId) { setActiveSkill(r.skillId); setView("learn"); } else setView("home"); }}
            onHome={() => setView("home")} />
        )}
        {view === "dev" && <DevGraph validation={validation} />}
      </main>
    </div>
  );
}

/* =====================================================================================
   SCREEN 1 — STUDENT LEARNING HOME
   ===================================================================================== */
function Home({ student, rec, recNode, onStart, onDiagnostic }) {
  const mm = masteryMap(student);
  const domainProgress = DOMAINS.map((d) => {
    const nodes = GRAPH.nodes.filter((n) => n.domain === d.id);
    const avg = nodes.reduce((a, n) => a + (student[n.id]?.mastery ?? 0), 0) / nodes.length;
    const mastered = nodes.filter((n) => computeMastery(student, n.id, mm).status === "mastered").length;
    return { ...d, avg, mastered, total: nodes.length };
  });
  const overall = domainProgress.reduce((a, d) => a + d.avg, 0) / domainProgress.length;
  const recStatus = recNode ? computeMastery(student, recNode.id, mm) : null;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12.5, color: "#8a93a3", letterSpacing: 0.4, marginBottom: 6 }}>WELCOME BACK</div>
        <h1 className="font-display" style={{ fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: -0.3 }}>Here's exactly where you are.</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 20 }} className="stagger">
        {/* Recommended next */}
        <Card style={{ padding: 26 }}>
          <div style={{ fontSize: 12, color: ACCENT, letterSpacing: 0.5, fontWeight: 600, marginBottom: 14 }}>RECOMMENDED NEXT</div>
          {recNode ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                <h2 className="font-display" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{recNode.title}</h2>
                {recStatus && <StatusPill status={recStatus.status} />}
              </div>
              <p style={{ color: "#5b6573", fontSize: 14.5, lineHeight: 1.55, margin: "12px 0 18px", maxWidth: 460 }}>{recNode.objective}</p>

              <div style={{ background: "#f7f8fa", border: "1px solid #eef0f4", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
                <div style={{ fontSize: 11.5, color: "#8a93a3", letterSpacing: 0.3, marginBottom: 4 }}>WHY THIS, NOW</div>
                <div style={{ fontSize: 13.5, color: "#3a4250", lineHeight: 1.5 }}>{rec.reason}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button onClick={() => onStart(recNode.id)} className="primary-btn"
                  style={{ background: ACCENT, color: "#fff", border: "none", padding: "11px 22px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Start learning session
                </button>
                <div style={{ fontSize: 12.5, color: "#8a93a3" }}>Current phase: <span style={{ color: "#3a4250", fontWeight: 500 }}>{phaseLabel(student[recNode.id]?.phase)}</span></div>
              </div>
            </>
          ) : (
            <div style={{ color: "#5b6573" }}>{rec.reason}</div>
          )}
        </Card>

        {/* Mastery overview */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#8a93a3", letterSpacing: 0.5, fontWeight: 600 }}>COURSE MASTERY</div>
            <div className="font-display" style={{ fontSize: 26, fontWeight: 600, color: ACCENT }}>{Math.round(overall * 100)}%</div>
          </div>
          <Progress value={overall} height={7} />
          <div style={{ marginTop: 22, display: "grid", gap: 16 }}>
            {domainProgress.map((d) => (
              <div key={d.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#3a4250" }}>{d.label}</span>
                  <span style={{ fontSize: 12, color: "#8a93a3" }} className="font-mono">{d.mastered}/{d.total}</span>
                </div>
                <Progress value={d.avg} height={5} color={d.avg > 0.8 ? "#2f7d5b" : ACCENT} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Prerequisite alert */}
      {rec.alert && (
        <Card style={{ padding: "16px 20px", marginTop: 20, borderColor: "#f0d9d1", background: "#fdf7f5", display: "flex", alignItems: "center", gap: 14 }} className="fade-in">
          <div style={{ width: 8, height: 8, borderRadius: 99, background: "#b4543f", flexShrink: 0 }} />
          <div style={{ fontSize: 13.5, color: "#7a4030" }}>
            <strong style={{ fontWeight: 600 }}>{rec.alert}</strong> is currently locked. The adaptive engine is routing you to its prerequisite before unlocking it — no wasted effort on something you're not ready for.
          </div>
        </Card>
      )}

      {/* Session history + diagnostic */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 12, color: "#8a93a3", letterSpacing: 0.5, fontWeight: 600, marginBottom: 16 }}>RECENT ACTIVITY</div>
          {[
            { s: "Two-Step Equations", d: "6 problems · 67% accuracy", t: "Yesterday" },
            { s: "Slope as Rate of Change", d: "4 problems · introduced", t: "2 days ago" },
            { s: "The Coordinate Plane", d: "Mastered", t: "Last week" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderTop: i ? "1px solid #f0f2f6" : "none" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{r.s}</div>
                <div style={{ fontSize: 12.5, color: "#8a93a3", marginTop: 2 }}>{r.d}</div>
              </div>
              <div style={{ fontSize: 12, color: "#aab1bd" }}>{r.t}</div>
            </div>
          ))}
        </Card>

        <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, color: "#8a93a3", letterSpacing: 0.5, fontWeight: 600, marginBottom: 10 }}>PLACEMENT</div>
            <div className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Recalibrate your starting point</div>
            <p style={{ fontSize: 13.5, color: "#5b6573", lineHeight: 1.55, margin: 0 }}>A short adaptive diagnostic re-estimates your mastery across every skill cluster and resets the recommended path.</p>
          </div>
          <button onClick={onDiagnostic} className="ghost-btn"
            style={{ marginTop: 18, alignSelf: "flex-start", background: "#fff", border: "1px solid #d7dbe2", color: "#16202e", padding: "9px 18px", borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}>
            Take the diagnostic
          </button>
        </Card>
      </div>
    </div>
  );
}

function phaseLabel(p) { return p === 3 ? "Neutral transfer" : p === 2 ? "Blended" : "Sports context"; }

/* =====================================================================================
   SCREEN 2 — DIAGNOSTIC FLOW
   ===================================================================================== */
const DIAG = [
  { cluster: "foundations", prompt: "Simplify:  5x + 3 − 2x", answer: "3x+3", accept: ["3x+3", "3x + 3"] },
  { cluster: "equations", prompt: "Solve:  x + 7 = 12", answer: "5", accept: ["5", "x=5"] },
  { cluster: "equations", prompt: "Solve:  3x + 4 = 19", answer: "5", accept: ["5", "x=5"] },
  { cluster: "linear", prompt: "Slope through (2, 3) and (6, 11)?", answer: "2", accept: ["2"] },
  { cluster: "linear", prompt: "In  y = 3x − 2,  what is the slope?", answer: "3", accept: ["3"] },
  { cluster: "systems", prompt: "If y = 2x and x + y = 9, find x.", answer: "3", accept: ["3", "x=3"] },
];

function Diagnostic({ onComplete, onCancel }) {
  const [i, setI] = useState(-1);
  const [val, setVal] = useState("");
  const [results, setResults] = useState({});

  if (i === -1) {
    return (
      <div className="fade-in" style={{ maxWidth: 620, margin: "20px auto 0", textAlign: "center" }}>
        <div style={{ fontSize: 12.5, color: "#8a93a3", letterSpacing: 0.4, marginBottom: 10 }}>ADAPTIVE DIAGNOSTIC</div>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 14px" }}>Let's find your starting point.</h1>
        <p style={{ color: "#5b6573", fontSize: 15, lineHeight: 1.6, maxWidth: 500, margin: "0 auto 28px" }}>
          A short set of questions across the major skill clusters. There's no celebration and no penalty — we're only measuring so the path ahead fits you precisely.
        </p>
        <button onClick={() => setI(0)} className="primary-btn" style={{ background: ACCENT, color: "#fff", border: "none", padding: "11px 26px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Begin</button>
        <div><button onClick={onCancel} style={{ marginTop: 16, background: "none", border: "none", color: "#8a93a3", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button></div>
      </div>
    );
  }

  if (i >= DIAG.length) {
    // bucket clusters
    const byCluster = {};
    DOMAINS.forEach((d) => (byCluster[d.id] = { correct: 0, total: 0 }));
    DIAG.forEach((q, idx) => { byCluster[q.cluster].total++; if (results[idx]) byCluster[q.cluster].correct++; });

    const summary = DOMAINS.map((d) => {
      const c = byCluster[d.id]; const r = c.total ? c.correct / c.total : 0;
      const conf = r >= 0.8 ? "mastered" : r >= 0.5 ? "developing" : r > 0 ? "weak prerequisite" : "unknown";
      return { ...d, ratio: r, conf };
    });

    const buildStudent = () => {
      const st = {}; GRAPH.nodes.forEach((n) => (st[n.id] = blank()));
      summary.forEach((s) => {
        const nodes = GRAPH.nodes.filter((n) => n.domain === s.id);
        nodes.forEach((n) => {
          if (s.conf === "mastered") st[n.id] = { ...blank(), mastery: 0.9, status: "mastered", phase: 3, attempts: 6, correct: 6, lastFive: [true, true, true, true, true], transfer: true, introduced: true, wasMastered: true };
          else if (s.conf === "developing") st[n.id] = { ...blank(), mastery: 0.5, status: "developing", phase: 1, attempts: 3, correct: 2, lastFive: [true, false, true], introduced: true };
          else if (s.conf === "weak prerequisite") st[n.id] = { ...blank(), mastery: 0.25, status: "introduced", phase: 1, attempts: 2, correct: 0, lastFive: [false, false], introduced: true };
        });
      });
      return st;
    };

    return (
      <div className="fade-in" style={{ maxWidth: 680, margin: "10px auto 0" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 12.5, color: "#8a93a3", letterSpacing: 0.4, marginBottom: 8 }}>DIAGNOSTIC COMPLETE</div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>Your estimated profile</h1>
        </div>
        <Card style={{ padding: 8 }}>
          {summary.map((s, idx) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: idx ? "1px solid #f0f2f6" : "none" }}>
              <div style={{ fontSize: 14.5, fontWeight: 500 }}>{s.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 18, width: 280, justifyContent: "flex-end" }}>
                <div style={{ width: 120 }}><Progress value={s.ratio} height={5} color={s.ratio > 0.8 ? "#2f7d5b" : ACCENT} /></div>
                <span style={{ fontSize: 12.5, color: "#5b6573", width: 130, textAlign: "right", textTransform: "capitalize" }}>{s.conf}</span>
              </div>
            </div>
          ))}
        </Card>
        <div style={{ textAlign: "center", marginTop: 26 }}>
          <button onClick={() => onComplete(buildStudent(), null)} className="primary-btn" style={{ background: ACCENT, color: "#fff", border: "none", padding: "11px 24px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Apply profile & view my path
          </button>
        </div>
      </div>
    );
  }

  const q = DIAG[i];
  const submit = () => {
    const norm = val.trim().toLowerCase().replace(/\s+/g, "");
    const ok = q.accept.some((a) => a.toLowerCase().replace(/\s+/g, "") === norm);
    setResults((r) => ({ ...r, [i]: ok }));
    setVal(""); setI(i + 1);
  };

  return (
    <div className="fade-in" style={{ maxWidth: 600, margin: "20px auto 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <span style={{ fontSize: 12.5, color: "#8a93a3", letterSpacing: 0.3 }}>QUESTION {i + 1} OF {DIAG.length}</span>
        <span style={{ fontSize: 12.5, color: "#8a93a3", textTransform: "capitalize" }}>{DOMAINS.find((d) => d.id === q.cluster).label}</span>
      </div>
      <div style={{ marginBottom: 26 }}><Progress value={(i) / DIAG.length} height={4} /></div>
      <Card style={{ padding: 34 }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 500, marginBottom: 26, lineHeight: 1.4 }}>{q.prompt}</div>
        <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && val.trim() && submit()}
          placeholder="Your answer" className="font-mono"
          style={{ width: "100%", border: "1px solid #d7dbe2", borderRadius: 10, padding: "13px 15px", fontSize: 16, fontFamily: "'Spline Sans Mono', monospace", color: "#16202e" }} />
        <button onClick={submit} disabled={!val.trim()} className="primary-btn"
          style={{ marginTop: 16, background: val.trim() ? ACCENT : "#c9cfd8", color: "#fff", border: "none", padding: "11px 22px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: val.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
          {i + 1 === DIAG.length ? "Finish" : "Next"}
        </button>
      </Card>
    </div>
  );
}

/* =====================================================================================
   SCREEN 3 — SKILL LEARNING SCREEN
   ===================================================================================== */
function Learn({ skillId, student, onPractice, onBack }) {
  const node = GRAPH.nodes.find((n) => n.id === skillId);
  const s = student[skillId];
  const mm = masteryMap(student);
  const ev = computeMastery(student, skillId, mm);
  const prereqs = node.prereqs.map((p) => ({ node: GRAPH.nodes.find((n) => n.id === p), ev: computeMastery(student, p, mm) }));

  return (
    <div className="fade-in">
      <button onClick={onBack} className="ghost-btn" style={{ background: "none", border: "none", color: "#8a93a3", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 18, padding: "4px 0" }}>← Learning home</button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 12, color: "#8a93a3", letterSpacing: 0.4, marginBottom: 8 }}>{DOMAINS.find((d) => d.id === node.domain).label.toUpperCase()}</div>
          <h1 className="font-display" style={{ fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: -0.3 }}>{node.title}</h1>
          <p style={{ color: "#5b6573", fontSize: 15, lineHeight: 1.55, margin: "12px 0 0", maxWidth: 560 }}>{node.objective}</p>
        </div>
        <Card style={{ padding: 18, width: 200, flexShrink: 0 }}>
          <div style={{ fontSize: 11.5, color: "#8a93a3", letterSpacing: 0.3, marginBottom: 8 }}>MASTERY</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <span className="font-display" style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(ev.score * 100)}%</span>
            <StatusPill status={ev.status} small />
          </div>
          <Progress value={ev.score} height={5} color={STATUS[ev.status].color} />
          <div style={{ marginTop: 14, fontSize: 11.5, color: "#8a93a3" }}>Context phase</div>
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{phaseLabel(s.phase)}</div>
        </Card>
      </div>

      {/* Prerequisite status */}
      {prereqs.length > 0 && (
        <Card style={{ padding: "14px 18px", marginBottom: 20, display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#8a93a3", letterSpacing: 0.3 }}>PREREQUISITES</span>
          {prereqs.map((p) => (
            <div key={p.node.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>{p.node.title}</span>
              <StatusPill status={p.ev.status} small />
            </div>
          ))}
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        {/* Visual concept + worked example */}
        <div style={{ display: "grid", gap: 20 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 12, color: ACCENT, letterSpacing: 0.5, fontWeight: 600, marginBottom: 12 }}>CONCEPT</div>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#2a3340", margin: "0 0 18px" }}>{node.content.concept}</p>
            {node.content.visual === "numberline" && <NumberLine mark={3} />}
            {node.content.visual === "coordinate" && <CoordinatePlane pts={[[4, 6], [10, 18]]} range={20} />}
          </Card>

          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 12, color: ACCENT, letterSpacing: 0.5, fontWeight: 600, marginBottom: 16 }}>WORKED EXAMPLE</div>
            <div style={{ background: "#f7f8fa", borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
              <MathExpr>{node.content.worked.problem}</MathExpr>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {node.content.worked.steps.map((st, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 99, background: "#eef1f6", color: ACCENT, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ fontSize: 14, color: "#2a3340", lineHeight: 1.5 }}>{st}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #f0f2f6", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12.5, color: "#8a93a3" }}>Result</span>
              <span style={{ background: "#eef6f1", color: "#2f7d5b", padding: "4px 12px", borderRadius: 7, fontSize: 14, fontWeight: 600 }} className="font-mono">{node.content.worked.result}</span>
            </div>
          </Card>
        </div>

        {/* Right rail: video, context, tutor */}
        <div style={{ display: "grid", gap: 20 }}>
          {/* Lesson video placeholder architecture */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ aspectRatio: "16/9", background: "linear-gradient(180deg,#1f2937,#111827)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ width: 46, height: 46, borderRadius: 99, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,.2)" }}>
                <div style={{ width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "13px solid #fff", marginLeft: 3 }} />
              </div>
              <div style={{ color: "rgba(255,255,255,.6)", fontSize: 12, letterSpacing: 0.3 }}>Primary lesson video</div>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Alternate explanation", "Remediation clip", "Worked example", "Trusted resource ↗"].map((v) => (
                <span key={v} style={{ fontSize: 11.5, color: "#5b6573", background: "#f3f5f8", border: "1px solid #eef0f4", padding: "4px 10px", borderRadius: 7 }}>{v}</span>
              ))}
            </div>
          </Card>

          {/* Context bridge: sports -> neutral */}
          <Card style={{ padding: 22 }}>
            <div style={{ fontSize: 12, color: ACCENT, letterSpacing: 0.5, fontWeight: 600, marginBottom: 14 }}>CONTEXT BRIDGE</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11.5, color: "#8a93a3", letterSpacing: 0.2, marginBottom: 5 }}>SPORTS CONTEXT</div>
              <div style={{ fontSize: 13.5, color: "#2a3340", lineHeight: 1.5 }}>{node.content.baseball}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0", color: "#c2c8d2" }}>
              <div style={{ flex: 1, height: 1, background: "#eef0f4" }} /><span style={{ fontSize: 11 }}>transfers to</span><div style={{ flex: 1, height: 1, background: "#eef0f4" }} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "#8a93a3", letterSpacing: 0.2, marginBottom: 5 }}>NEUTRAL ACADEMIC</div>
              <div style={{ fontSize: 13.5, color: "#2a3340", lineHeight: 1.5 }}>{node.content.neutral}</div>
            </div>
          </Card>
        </div>
      </div>

      <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onPractice} className="primary-btn"
          style={{ background: ACCENT, color: "#fff", border: "none", padding: "12px 26px", borderRadius: 9, fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          Start practice →
        </button>
        <span style={{ fontSize: 13, color: "#8a93a3" }}>
          {node.problems[`p${s.phase}`]?.length ? `${node.problems[`p${s.phase}`].length} problems in this phase` : "Practice set in development for this node"}
        </span>
      </div>
    </div>
  );
}

/* =====================================================================================
   SCREEN 4 — PRACTICE SESSION
   ===================================================================================== */
function Practice({ skillId, student, onComplete, onBack }) {
  const node = GRAPH.nodes.find((n) => n.id === skillId);
  const s = student[skillId];

  // collect problems across phases starting at current phase to demonstrate transfer
  const queue = useMemo(() => {
    const q = [];
    [s.phase, Math.min(s.phase + 1, 3)].forEach((ph) => (node.problems[`p${ph}`] || []).forEach((pr) => q.push({ ...pr, phase: ph })));
    if (!q.length) (node.problems.p3 || node.problems.p1 || []).forEach((pr) => q.push({ ...pr, phase: 3 }));
    return q.slice(0, 4);
  }, [skillId]);

  const [idx, setIdx] = useState(0);
  const [val, setVal] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState(null); // { correct, misconception }
  const [log, setLog] = useState([]); // {correct, hint, phase, misconception, ms}
  const [startMs] = useState(Date.now());
  const [qStart, setQStart] = useState(Date.now());

  if (!queue.length) {
    return (
      <div className="fade-in" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
        <Card style={{ padding: 32 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, margin: "0 0 10px" }}>Practice set in development</h2>
          <p style={{ color: "#5b6573", fontSize: 14, lineHeight: 1.6 }}>This node's full three-phase problem bank isn't authored yet in the prototype. Two-Step Equations and Slope as Rate of Change are fully playable end-to-end.</p>
          <button onClick={onBack} className="primary-btn" style={{ marginTop: 18, background: ACCENT, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Back to lesson</button>
        </Card>
      </div>
    );
  }

  const q = queue[idx];
  const momentum = log.length ? log.filter((l) => l.correct).length / log.length : 0;

  const submit = () => {
    const norm = val.trim().toLowerCase().replace(/\s+/g, "");
    const correct = norm === String(q.answer).toLowerCase();
    const misconception = !correct ? (q.misconceptions?.[norm] || "general") : null;
    setFeedback({ correct, misconception });
    setLog((l) => [...l, { correct, hint: showHint, phase: q.phase, misconception, ms: Date.now() - qStart }]);
  };

  const next = () => {
    if (idx + 1 >= queue.length) {
      // compute mastery update
      const correctCount = log.filter((l) => l.correct).length;
      const hintsUsed = log.filter((l) => l.hint).length;
      const phase3Correct = log.some((l) => l.phase === 3 && l.correct);
      const newAttempts = s.attempts + log.length;
      const newCorrect = s.correct + correctCount;
      const lastFive = [...s.lastFive, ...log.map((l) => l.correct)].slice(-5);
      const maxPhase = Math.max(...log.map((l) => l.phase));
      const sessionAcc = log.length ? correctCount / log.length : 0;
      const newPhase = sessionAcc >= 0.6 ? Math.min(maxPhase + (maxPhase < 3 ? 1 : 0), 3) : s.phase;

      const updatedSkill = {
        ...s, attempts: newAttempts, correct: newCorrect, hints: s.hints + hintsUsed,
        timeMs: s.timeMs + (Date.now() - startMs), lastFive, phase: newPhase,
        transfer: s.transfer || phase3Correct, introduced: true,
      };
      const before = computeMastery(student, skillId, masteryMap(student));
      const tmp = { ...student, [skillId]: updatedSkill };
      const mmTmp = masteryMap(tmp); mmTmp[skillId] = updatedSkill.mastery; // will recompute below
      const after = computeMastery(tmp, skillId, masteryMap(tmp));
      updatedSkill.mastery = after.score; updatedSkill.status = after.status;
      const finalStudent = { ...student, [skillId]: updatedSkill };

      onComplete(finalStudent, {
        skillId, before: before.score, beforeStatus: before.status,
        after: after.score, afterStatus: after.status,
        attempted: log.length, correct: correctCount, hintsUsed,
        misconceptions: [...new Set(log.filter((l) => l.misconception).map((l) => l.misconception))],
        phaseReached: maxPhase, transfer: updatedSkill.transfer, log,
      });
      return;
    }
    setIdx(idx + 1); setVal(""); setShowHint(false); setFeedback(null); setQStart(Date.now());
  };

  const tutor = feedback && !feedback.correct ? tutorRemediation(feedback.misconception, node) : null;

  return (
    <div className="fade-in" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={onBack} className="ghost-btn" style={{ background: "none", border: "none", color: "#8a93a3", fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}>← {node.title}</button>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12.5, color: "#8a93a3" }}>{phaseLabel(q.phase)}</span>
          <span style={{ fontSize: 12.5, color: "#8a93a3" }} className="font-mono">{idx + 1} / {queue.length}</span>
        </div>
      </div>
      <div style={{ marginBottom: 22 }}><Progress value={idx / queue.length} height={4} /></div>

      <Card style={{ padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, color: "#8a93a3", letterSpacing: 0.4 }}>PROBLEM {idx + 1}</div>
          {/* momentum indicator */}
          <div style={{ display: "flex", gap: 4 }}>
            {log.map((l, i) => (<div key={i} style={{ width: 8, height: 8, borderRadius: 99, background: l.correct ? "#2f7d5b" : "#d6a99c" }} />))}
            {Array.from({ length: queue.length - log.length }).map((_, i) => (<div key={`e${i}`} style={{ width: 8, height: 8, borderRadius: 99, background: "#e7e9ee" }} />))}
          </div>
        </div>

        <div className="font-display" style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.5, marginBottom: 22 }}>{q.prompt}</div>

        {q.visual === "coordinate" && q.pts && (
          <div style={{ marginBottom: 22, display: "flex", justifyContent: "center", background: "#fbfbfc", borderRadius: 10, padding: 12, border: "1px solid #f0f2f6" }}>
            <CoordinatePlane pts={q.pts} range={Math.max(...q.pts.flat()) + 2} />
          </div>
        )}

        {!feedback && (
          <>
            <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && val.trim() && submit()}
              placeholder="Enter your answer" className="font-mono"
              style={{ width: "100%", border: "1px solid #d7dbe2", borderRadius: 10, padding: "13px 15px", fontSize: 16, fontFamily: "'Spline Sans Mono', monospace", color: "#16202e" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <button onClick={submit} disabled={!val.trim()} className="primary-btn"
                style={{ background: val.trim() ? ACCENT : "#c9cfd8", color: "#fff", border: "none", padding: "11px 22px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: val.trim() ? "pointer" : "default", fontFamily: "inherit" }}>Submit</button>
              {!showHint && <button onClick={() => setShowHint(true)} className="ghost-btn" style={{ background: "#fff", border: "1px solid #d7dbe2", color: "#5b6573", padding: "11px 18px", borderRadius: 9, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}>Need a hint</button>}
            </div>
            {showHint && (
              <div style={{ marginTop: 16, background: "#f7f8fa", border: "1px solid #eef0f4", borderRadius: 10, padding: "12px 14px", fontSize: 13.5, color: "#3a4250", lineHeight: 1.5 }}>
                <span style={{ color: "#8a93a3", fontSize: 11.5, letterSpacing: 0.3, display: "block", marginBottom: 4 }}>HINT</span>{q.hint}
              </div>
            )}
          </>
        )}

        {feedback && (
          <div className="fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 22, height: 22, borderRadius: 99, background: feedback.correct ? "#eef6f1" : "#fbf0ec", color: feedback.correct ? "#2f7d5b" : "#b4543f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{feedback.correct ? "✓" : "×"}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: feedback.correct ? "#2f7d5b" : "#b4543f" }}>{feedback.correct ? "Correct" : "Not quite"}</span>
            </div>
            <div style={{ background: "#f7f8fa", borderRadius: 10, padding: "14px 16px", fontSize: 14, color: "#2a3340", lineHeight: 1.55 }}>
              <span style={{ color: "#8a93a3", fontSize: 11.5, letterSpacing: 0.3, display: "block", marginBottom: 4 }}>EXPLANATION</span>{q.explanation}
            </div>

            {/* AI tutor remediation — bounded */}
            {tutor && (
              <div style={{ marginTop: 14, border: "1px solid #e3e8f0", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: "#f4f6fa", padding: "8px 14px", fontSize: 11.5, letterSpacing: 0.3, color: ACCENT, fontWeight: 600 }}>AI TUTOR</div>
                <div style={{ padding: "14px 16px", display: "grid", gap: 10 }}>
                  <div style={{ fontSize: 13.5, color: "#2a3340", lineHeight: 1.5 }}><strong style={{ fontWeight: 600 }}>What happened:</strong> {tutor.diagnosis}</div>
                  <div style={{ fontSize: 13.5, color: "#5b6573", lineHeight: 1.5 }}><strong style={{ fontWeight: 600, color: "#2a3340" }}>In context:</strong> {tutor.reframe}</div>
                  <div style={{ fontSize: 12.5, color: "#8a93a3", lineHeight: 1.5 }}>{tutor.bridge}</div>
                </div>
              </div>
            )}

            <button onClick={next} className="primary-btn"
              style={{ marginTop: 18, background: ACCENT, color: "#fff", border: "none", padding: "11px 24px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {idx + 1 >= queue.length ? "Finish session" : "Next problem"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

/* =====================================================================================
   SCREEN 5 — SESSION SUMMARY
   ===================================================================================== */
function Summary({ result, student, onNext, onHome }) {
  const node = GRAPH.nodes.find((n) => n.id === result.skillId);
  const delta = result.after - result.before;
  const acc = result.attempted ? result.correct / result.attempted : 0;
  const verdict = result.afterStatus === "mastered" ? { label: "Advance", color: "#2f7d5b", note: "Mastery confirmed, including neutral transfer. Moving you to the next skill." }
    : delta > 0.02 ? { label: "Continue", color: ACCENT, note: "Solid progress. One more focused session should push this toward mastery." }
    : { label: "Review", color: "#9a5b3f", note: "The core idea needs reinforcement before advancing. A short review is recommended." };
  const rec = recommend(student);
  const nextNode = rec.skillId ? GRAPH.nodes.find((n) => n.id === rec.skillId) : null;

  const miscLabels = {
    "subtracted-not-divided": "Stopped before dividing by the coefficient",
    "divided-first": "Applied inverse operations out of order",
    "forgot-denominator": "Computed rise but not the ratio",
    "inverted": "Inverted the slope ratio",
    "added-instead": "Used the wrong inverse operation",
    "general": "Mixed procedural errors",
  };

  return (
    <div className="fade-in" style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12.5, color: "#8a93a3", letterSpacing: 0.4, marginBottom: 8 }}>SESSION SUMMARY · {node.title.toUpperCase()}</div>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Here's what changed.</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }} className="stagger">
        {[
          { k: "Problems", v: result.attempted },
          { k: "Accuracy", v: `${Math.round(acc * 100)}%` },
          { k: "Hints used", v: result.hintsUsed },
          { k: "Phase reached", v: phaseLabel(result.phaseReached) },
        ].map((m) => (
          <Card key={m.k} style={{ padding: 18 }}>
            <div style={{ fontSize: 11.5, color: "#8a93a3", letterSpacing: 0.3, marginBottom: 8 }}>{m.k.toUpperCase()}</div>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 600 }}>{m.v}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        <Card style={{ padding: 26 }}>
          <div style={{ fontSize: 12, color: "#8a93a3", letterSpacing: 0.5, fontWeight: 600, marginBottom: 18 }}>MASTERY CHANGE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
            <div style={{ textAlign: "center" }}>
              <div className="font-display" style={{ fontSize: 26, color: "#8a93a3" }}>{Math.round(result.before * 100)}%</div>
              <div style={{ fontSize: 11, color: "#aab1bd", marginTop: 2 }}>BEFORE</div>
            </div>
            <div style={{ flex: 1 }}>
              <Progress value={result.after} height={8} color={STATUS[result.afterStatus].color} />
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 12.5, color: delta >= 0 ? "#2f7d5b" : "#b4543f", fontWeight: 600 }}>{delta >= 0 ? "+" : ""}{Math.round(delta * 100)} pts</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="font-display" style={{ fontSize: 26, color: STATUS[result.afterStatus].color }}>{Math.round(result.after * 100)}%</div>
              <div style={{ fontSize: 11, color: "#aab1bd", marginTop: 2 }}>AFTER</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}><StatusPill status={result.afterStatus} /></div>

          {result.misconceptions.length > 0 && (
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #f0f2f6" }}>
              <div style={{ fontSize: 11.5, color: "#8a93a3", letterSpacing: 0.3, marginBottom: 10 }}>DETECTED WEAKNESSES</div>
              {result.misconceptions.map((m) => (
                <div key={m} style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 7 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: "#b4543f" }} />
                  <span style={{ fontSize: 13.5, color: "#3a4250" }}>{miscLabels[m] || m}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card style={{ padding: 26, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${verdict.color}14`, color: verdict.color, padding: "5px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
              RECOMMENDATION · {verdict.label.toUpperCase()}
            </div>
            <p style={{ fontSize: 14, color: "#2a3340", lineHeight: 1.6, margin: "0 0 18px" }}>{verdict.note}</p>
            {nextNode && (
              <div style={{ background: "#f7f8fa", border: "1px solid #eef0f4", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11.5, color: "#8a93a3", letterSpacing: 0.3, marginBottom: 5 }}>NEXT SKILL</div>
                <div className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{nextNode.title}</div>
                <div style={{ fontSize: 12.5, color: "#5b6573", lineHeight: 1.45 }}>{rec.reason}</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={onNext} className="primary-btn" style={{ flex: 1, background: ACCENT, color: "#fff", border: "none", padding: "11px 18px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Continue path</button>
            <button onClick={onHome} className="ghost-btn" style={{ background: "#fff", border: "1px solid #d7dbe2", color: "#16202e", padding: "11px 18px", borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}>Home</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =====================================================================================
   SCREEN 6 — DEVELOPER / ADMIN GRAPH INSPECTOR
   ===================================================================================== */
function DevGraph({ validation }) {
  const [sel, setSel] = useState(GRAPH.nodes[0].id);
  const node = GRAPH.nodes.find((n) => n.id === sel);
  const dependents = GRAPH.nodes.filter((n) => n.prereqs.includes(sel));

  const Stat = ({ label, value, tone }) => (
    <div style={{ flex: 1, padding: "12px 14px", border: "1px solid #e7e9ee", borderRadius: 9, background: "#fff" }}>
      <div style={{ fontSize: 11, color: "#8a93a3", letterSpacing: 0.3 }}>{label}</div>
      <div className="font-mono" style={{ fontSize: 18, fontWeight: 600, color: tone || "#16202e", marginTop: 3 }}>{value}</div>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: "#8a93a3", letterSpacing: 0.4, marginBottom: 6 }}>INTERNAL · DEVELOPER</div>
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Curriculum Graph Inspector</h1>
      </div>

      {/* import + validation banner */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Stat label="NODES" value={GRAPH.nodes.length} />
        <Stat label="EDGES" value={EDGES.length} />
        <Stat label="SCHEMA" value={validation.schema.length ? `${validation.schema.length} issues` : "valid"} tone={validation.schema.length ? "#b4543f" : "#2f7d5b"} />
        <Stat label="CYCLES" value={validation.cycles.length ? validation.cycles.length : "none"} tone={validation.cycles.length ? "#b4543f" : "#2f7d5b"} />
        <Stat label="ORPHANS" value={validation.orphans.length || "none"} tone={validation.orphans.length ? "#b07d00" : "#2f7d5b"} />
        <Stat label="INVALID EDGES" value={validation.invalidEdges.length || "none"} tone={validation.invalidEdges.length ? "#b4543f" : "#2f7d5b"} />
      </div>

      <div style={{ background: validation.ok ? "#f1f7f3" : "#fbf0ec", border: `1px solid ${validation.ok ? "#d4e8db" : "#f0d9d1"}`, borderRadius: 9, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: validation.ok ? "#2f7d5b" : "#b4543f", fontWeight: 500 }} className="font-mono">
        {validation.ok ? "✓ JSON import OK — graph passed schema, edge, and cycle validation." : "✗ Validation found issues — see warnings below."}
        {validation.orphans.length > 0 && <div style={{ color: "#b07d00", marginTop: 4 }}>⚠ Orphan nodes: {validation.orphans.join(", ")}</div>}
        {validation.invalidEdges.map((e, i) => <div key={i} style={{ color: "#b4543f", marginTop: 4 }}>⚠ {e}</div>)}
        {validation.cycles.map((c, i) => <div key={i} style={{ color: "#b4543f", marginTop: 4 }}>⚠ cycle: {c}</div>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        {/* node list */}
        <Card style={{ padding: 8, maxHeight: 520, overflowY: "auto" }}>
          {DOMAINS.map((d) => (
            <div key={d.id}>
              <div style={{ fontSize: 10.5, color: "#aab1bd", letterSpacing: 0.4, padding: "10px 10px 5px" }}>{d.label.toUpperCase()}</div>
              {GRAPH.nodes.filter((n) => n.domain === d.id).map((n) => (
                <button key={n.id} onClick={() => setSel(n.id)}
                  style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: sel === n.id ? "#f0f2f6" : "transparent", padding: "8px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", marginBottom: 1 }}>
                  <span className="font-mono" style={{ fontSize: 11, color: "#aab1bd", marginRight: 8 }}>{n.id}</span>
                  <span style={{ fontSize: 13, color: "#16202e", fontWeight: sel === n.id ? 600 : 400 }}>{n.title}</span>
                </button>
              ))}
            </div>
          ))}
        </Card>

        {/* node detail */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <span className="font-mono" style={{ fontSize: 13, color: "#aab1bd" }}>{node.id}</span>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{node.title}</h2>
          </div>
          <div style={{ fontSize: 12.5, color: "#8a93a3", marginBottom: 18, textTransform: "capitalize" }}>{node.domain} domain</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11.5, color: "#8a93a3", letterSpacing: 0.3, marginBottom: 8 }}>PREREQUISITES ({node.prereqs.length})</div>
              {node.prereqs.length ? node.prereqs.map((p) => (
                <div key={p} className="font-mono" style={{ fontSize: 13, padding: "4px 0", color: "#3a4250" }}>← {p} · {GRAPH.nodes.find((n) => n.id === p)?.title}</div>
              )) : <div style={{ fontSize: 13, color: "#aab1bd" }}>none (entry node)</div>}
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "#8a93a3", letterSpacing: 0.3, marginBottom: 8 }}>UNLOCKS ({dependents.length})</div>
              {dependents.length ? dependents.map((d) => (
                <div key={d.id} className="font-mono" style={{ fontSize: 13, padding: "4px 0", color: "#3a4250" }}>→ {d.id} · {d.title}</div>
              )) : <div style={{ fontSize: 13, color: "#aab1bd" }}>terminal node</div>}
            </div>
          </div>

          <div style={{ paddingTop: 16, borderTop: "1px solid #f0f2f6" }}>
            <div style={{ fontSize: 11.5, color: "#8a93a3", letterSpacing: 0.3, marginBottom: 8 }}>CONTENT BANK</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["objective", !!node.objective],
                ["concept", !!node.content.concept],
                ["worked example", !!node.content.worked],
                ["baseball ctx", !!node.content.baseball],
                ["neutral transfer", !!node.content.neutral],
                [`p1 (${node.problems.p1.length})`, node.problems.p1.length > 0],
                [`p2 (${node.problems.p2.length})`, node.problems.p2.length > 0],
                [`p3 (${node.problems.p3.length})`, node.problems.p3.length > 0],
              ].map(([k, ok]) => (
                <span key={k} className="font-mono" style={{ fontSize: 11.5, padding: "4px 9px", borderRadius: 6, background: ok ? "#eef6f1" : "#f7f8fa", color: ok ? "#2f7d5b" : "#aab1bd", border: `1px solid ${ok ? "#d4e8db" : "#eef0f4"}` }}>
                  {ok ? "✓" : "○"} {k}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
