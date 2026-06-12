// Pure explore-seed derivation (Phase 8 / B, Learn-explore wiring). No React,
// no IO, no engine/repository imports. The Learn lesson area shows a GENUINE
// explore manipulable — but its starting state is DERIVED from the node's own
// real data (a representative problem's authored visualSpec, or the node's
// equation parsed from a worked example / problem prompt). No new graph field
// is authored; this only READS existing content.
//
// Degrade-safe by contract: every helper returns null when no usable seed
// exists, and the caller falls back to the StepReveal manipulable.

import type {
  CoordinateSpec,
  NumberLineSpec,
  ProblemTemplate,
  WorkedExample,
} from "../../types";
import type { Equation } from "./balance-scale-math";

/** A flat list of a node's problems across all three phase banks. */
export function flattenProblems(node: {
  problems: { p1: ProblemTemplate[]; p2: ProblemTemplate[]; p3: ProblemTemplate[] };
}): ProblemTemplate[] {
  return [...node.problems.p1, ...node.problems.p2, ...node.problems.p3];
}

/**
 * Seed a coordinate explore from the node's first problem that carries a
 * coordinate visualSpec with at least two points (a representative
 * display/slope item, e.g. L05/L06). The seed becomes the explore starting
 * geometry; Reset returns to it. Returns null when no such problem exists.
 *
 * The seed carries ONLY the authored (given) geometry — points already on the
 * problem's display spec — so no withheld answer is introduced.
 */
export function coordinateSeedFromProblems(
  problems: ProblemTemplate[],
): CoordinateSpec | null {
  for (const p of problems) {
    const s = p.visualSpec;
    if (s && s.kind === "coordinate" && (s.points?.length ?? 0) >= 2) {
      return s;
    }
  }
  // Relax to a single-point coordinate spec if that is all the node offers.
  for (const p of problems) {
    const s = p.visualSpec;
    if (s && s.kind === "coordinate" && (s.points?.length ?? 0) >= 1) {
      return s;
    }
  }
  return null;
}

/**
 * Seed a numberline explore from the node's first numberline-spec problem
 * (e.g. F09). Returns null when none exists.
 *
 * When the authored spec has two markers but no operationDelta, an
 * operationDelta is DERIVED from the two real marker values (their signed
 * difference) and the live marker is placed on the second value — so the
 * explore arc spans the node's own two points and follows the drag. This reads
 * existing data only; it authors nothing.
 */
export function numberlineSeedFromProblems(
  problems: ProblemTemplate[],
): NumberLineSpec | null {
  let base: NumberLineSpec | null = null;
  for (const p of problems) {
    const s = p.visualSpec;
    if (s && s.kind === "numberline") {
      base = s;
      break;
    }
  }
  if (!base) return null;
  if (typeof base.operationDelta === "number") return base;
  const markers = base.markers ?? [];
  if (markers.length >= 2) {
    const delta = markers[1].value - markers[0].value;
    // Live marker at the second value; the arc spans marker[0] → marker[1].
    return {
      ...base,
      markers: [{ value: markers[1].value, label: markers[1].label }],
      operationDelta: delta,
    };
  }
  return base;
}

// ---------------------------------------------------------------------------
// Equation parsing for the balance explore (E01–E04 / E14). Balance has no
// visualSpec (it is excluded from the renderable VisualSpec union), so the
// seed is parsed from the node's REAL equation text: the first worked-example
// step or problem prompt that contains a clean linear equation `ax ± b = cx ± d`.
// Forms with parentheses / division / non-linear text do not parse → null →
// the caller degrades to StepReveal. This never fabricates an equation.
// ---------------------------------------------------------------------------

interface LinearSide {
  x: number;
  c: number;
}

/** Normalize unicode minus / multiplication and collapse whitespace. */
function normalize(text: string): string {
  return text
    .replace(/−/g, "-") // − → -
    .replace(/×/g, "*") // × → *
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse ONE side of a linear equation: a sum of an optional `ax` term and an
 * optional constant, with a single variable letter. Returns null on anything
 * unexpected (extra variables, parentheses, division, etc.).
 */
function parseSide(raw: string, variable: string): LinearSide | null {
  const side = raw.replace(/\s+/g, "");
  if (side.length === 0) return null;
  // Disallow parentheses, division, exponents, or a second variable letter.
  if (/[()/^]/.test(side)) return null;
  for (const ch of side) {
    if (/[a-zA-Z]/.test(ch) && ch.toLowerCase() !== variable) return null;
  }
  // Tokenize into signed terms.
  const terms = side.match(/[+-]?[^+-]+/g);
  if (!terms) return null;
  let x = 0;
  let c = 0;
  for (const t of terms) {
    const sign = t.startsWith("-") ? -1 : 1;
    const body = t.replace(/^[+-]/, "");
    if (body.toLowerCase().endsWith(variable)) {
      const coefStr = body.slice(0, -1);
      const coef = coefStr === "" ? 1 : Number(coefStr);
      if (!Number.isFinite(coef)) return null;
      x += sign * coef;
    } else {
      const num = Number(body);
      if (!Number.isFinite(num)) return null;
      c += sign * num;
    }
  }
  return { x, c };
}

/**
 * Extract the first clean linear equation from free text and return it as a
 * BalanceScale Equation (leftX/leftC = rightX/rightC). Returns null when no
 * parseable linear equation is present.
 *
 * Strategy: find each `=`, walk outward from it collecting ONLY equation-grammar
 * characters (digits, a single variable letter, +, -, ., spaces) and stopping at
 * the first character outside that grammar. The two collected sides are then
 * parsed as linear terms. The variable is whichever letter appears adjacent to
 * the equation; parentheses, division and second variables disqualify the side.
 */
export function parseEquation(text: string): Equation | null {
  const norm = normalize(text);
  for (let i = 0; i < norm.length; i++) {
    if (norm[i] !== "=") continue;
    const variable = nearestVariable(norm, i);
    if (!variable) continue;
    const left = collectSide(norm, i - 1, -1, variable);
    const right = collectSide(norm, i + 1, 1, variable);
    if (left === null || right === null) continue;
    const l = parseSide(left, variable);
    const r = parseSide(right, variable);
    if (!l || !r) continue;
    if (l.x === 0 && r.x === 0) continue; // not a genuine equation in x
    return { leftX: l.x, leftC: l.c, rightX: r.x, rightC: r.c };
  }
  return null;
}

/** The single variable letter adjacent to an `=`, or null if none is nearby. */
function nearestVariable(s: string, eqIdx: number): string | null {
  // Scan a small window on each side for the first alphabetic character that is
  // part of the equation grammar (letters embedded in the term sequence).
  const window = 24;
  const collect = (start: number, dir: number) => {
    for (let k = 0; k < window; k++) {
      const idx = start + dir * k;
      if (idx < 0 || idx >= s.length) break;
      const ch = s[idx];
      if (/[a-zA-Z]/.test(ch)) return ch.toLowerCase();
      if (!/[0-9+\-. ]/.test(ch)) break; // left the equation grammar
    }
    return null;
  };
  return collect(eqIdx - 1, -1) ?? collect(eqIdx + 1, 1);
}

/**
 * Walk outward from an index collecting equation-grammar characters into a
 * side string. Returns null if no usable characters were collected.
 */
function collectSide(
  s: string,
  start: number,
  dir: number,
  variable: string,
): string | null {
  const chars: string[] = [];
  for (let idx = start; idx >= 0 && idx < s.length; idx += dir) {
    const ch = s[idx];
    const isVar = ch.toLowerCase() === variable;
    if (/[0-9+\-. ]/.test(ch) || isVar) {
      chars.push(ch);
    } else {
      break;
    }
  }
  if (dir < 0) chars.reverse();
  const side = chars.join("").trim();
  return side.length > 0 ? side : null;
}

/**
 * Derive a balance-scale equation seed from the node's real content: scan the
 * first worked example's step prompts, then the problem prompts, returning the
 * first clean linear equation found. Null when nothing parses (degrade-safe).
 */
export function equationSeedFromNode(
  workedExamples: WorkedExample[],
  problems: ProblemTemplate[],
): Equation | null {
  const we = workedExamples[0];
  if (we) {
    for (const step of we.steps) {
      const eq = parseEquation(step.prompt) ?? parseEquation(step.reveal);
      if (eq) return eq;
    }
  }
  for (const p of problems) {
    const eq = parseEquation(p.prompt);
    if (eq) return eq;
  }
  return null;
}
