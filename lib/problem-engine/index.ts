// lib/problem-engine — problem serving by phase/sport, phase advancement,
// transfer computation, and answer checking against AnswerSpec. Pure and
// deterministic: no randomness, no IO. Normalization is CONSERVATIVE — no
// CAS; unrecognized forms are simply marked incorrect. mr-kahn gated.

import type {
  AnswerSpec,
  Phase,
  ProblemEngineConfig,
  ProblemTemplate,
  SkillNode,
  Sport,
  StudentAttempt,
  StudentSkillState,
} from "@/types";

/** Changing ANY value is a Matt human checkpoint (CLAUDE.md). */
export const PROBLEM_CONFIG: ProblemEngineConfig = {
  phaseAdvanceAccuracy: 0.8,
  phaseAdvanceMinAttempts: 4,
  probeRatio: 4,
  transferWindow: 5,
  transferRequired: 2,
};

export interface ServedProblem {
  problem: ProblemTemplate;
  /** True when this slot is an N+1-phase probe (excluded from phase-advance accuracy). */
  isProbe: boolean;
}

const PHASE_KEY: Record<Phase, "p1" | "p2" | "p3"> = { 1: "p1", 2: "p2", 3: "p3" };

/** Phase 3 is ALWAYS neutral; phases 1–2 use the student's sport. */
const sportForPhase = (phase: Phase, sport: Sport): Sport => (phase === 3 ? "neutral" : sport);

const easyToHard = (a: ProblemTemplate, b: ProblemTemplate): number =>
  a.difficulty - b.difficulty || a.id.localeCompare(b.id);

function bankFor(node: SkillNode, phase: Phase, sport: Sport): ProblemTemplate[] {
  return node.problems[PHASE_KEY[phase]]
    .filter((p) => p.sport === sportForPhase(phase, sport))
    .sort(easyToHard);
}

/**
 * The committed Phase-3 NEUTRAL bank for a node, ordered easy→hard (difficulty,
 * then id — deterministic). THIS is the exact read+sort that selectProblems uses
 * for a phase-3 slot (bankFor(node, 3, "neutral")); lib/retention calls it so the
 * retention probe is ALWAYS a member of selectProblems(node, phase-3 state,
 * sport) and therefore passes the runPracticeAttempt slot-validator unchanged.
 * One source of truth — never re-implement the bank read/sort elsewhere.
 */
export function neutralP3Bank(node: SkillNode): ProblemTemplate[] {
  return bankFor(node, 3, "neutral");
}

/**
 * Serve the current-phase bank in the student's sport, ordered easy→hard
 * (difficulty, then id — deterministic). Every probeRatio-th slot is an
 * N+1-phase probe, marked { isProbe: true }. Phase 3 has no N+1, so no
 * probes. Empty banks return an empty array — never throws.
 */
export function selectProblems(
  node: SkillNode,
  state: StudentSkillState,
  sport: Sport,
  config: ProblemEngineConfig = PROBLEM_CONFIG,
): ServedProblem[] {
  const phase = state.phase;
  const main = bankFor(node, phase, sport);
  const probes = phase < 3 ? bankFor(node, (phase + 1) as Phase, sport) : [];

  const served: ServedProblem[] = [];
  let mainIdx = 0;
  let probeIdx = 0;
  let slot = 0;
  while (mainIdx < main.length) {
    slot += 1;
    if (slot % config.probeRatio === 0 && probeIdx < probes.length) {
      served.push({ problem: probes[probeIdx], isProbe: true });
      probeIdx += 1;
    } else {
      served.push({ problem: main[mainIdx], isProbe: false });
      mainIdx += 1;
    }
  }
  return served;
}

/**
 * Phase advancement: accuracy ≥ phaseAdvanceAccuracy over ≥
 * phaseAdvanceMinAttempts NON-PROBE attempts at the current phase advances
 * exactly one phase. Never skips, never auto-regresses. Probes are excluded
 * from the denominator (StudentAttempt.isProbe).
 */
export function advancePhase(
  sessionAttempts: StudentAttempt[],
  currentPhase: Phase,
  config: ProblemEngineConfig = PROBLEM_CONFIG,
): Phase {
  if (currentPhase === 3) return 3;
  const scored = sessionAttempts.filter((a) => a.phase === currentPhase && !a.isProbe);
  if (scored.length < config.phaseAdvanceMinAttempts) return currentPhase;
  const accuracy = scored.filter((a) => a.correct).length / scored.length;
  if (accuracy < config.phaseAdvanceAccuracy) return currentPhase;
  return (currentPhase + 1) as Phase;
}

/**
 * Transfer: ≥ transferRequired correct among the most recent transferWindow
 * phase-3 (neutral) attempts. Chronological by createdAt, ties by id —
 * reconstructable from the immutable attempt log.
 */
export function computeTransfer(
  attempts: StudentAttempt[],
  config: ProblemEngineConfig = PROBLEM_CONFIG,
): boolean {
  const p3 = attempts
    .filter((a) => a.phase === 3)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    .slice(-config.transferWindow);
  return p3.filter((a) => a.correct).length >= config.transferRequired;
}

// ---------------------------------------------------------------------------
// Answer checking — conservative normalization, NO CAS.
// ---------------------------------------------------------------------------

const stripSpace = (s: string): string =>
  s.replace(/−/g, "-").replace(/\s+/g, "").toLowerCase();

/**
 * Parse a numeric token: strips "x=" prefixes and whitespace, accepts
 * fractions ("1/2") and decimals ("0.50" — trailing zeros are irrelevant
 * after parsing). Returns null for anything unrecognized.
 */
function parseNumeric(raw: string): number | null {
  let s = stripSpace(raw);
  s = s.replace(/^[a-z]=/, "");
  const frac = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(s);
  if (frac) {
    const den = Number(frac[2]);
    if (den === 0) return null;
    return Number(frac[1]) / den;
  }
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(s)) return null;
  return Number(s);
}

const numericEqual = (a: number, b: number, tolerance?: number): boolean =>
  tolerance !== undefined ? Math.abs(a - b) <= tolerance : a === b;

/** Split on '+' at parenthesis depth 0 (commutative-sum canonicalization). */
function splitTopLevelPlus(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "+" && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts;
}

function normalizeExpression(raw: string, acceptEquivalent: boolean): string {
  const s = stripSpace(raw);
  if (!acceptEquivalent) return s;
  return splitTopLevelPlus(s).sort().join("+");
}

/**
 * Canonicalize an inequality to all-< / <= direction with the chain reversed
 * when needed ("x>5" → "5<x"; "4>=x>-3" → "-3<x<=4"). Numeric operands are
 * canonicalized through parseNumeric. Returns null when unparseable.
 */
function normalizeInequality(raw: string): string | null {
  const s = stripSpace(raw).replace(/≤/g, "<=").replace(/≥/g, ">=");
  const tokens = s.split(/(<=|>=|<|>)/).filter((t) => t !== "");
  if (tokens.length < 3 || tokens.length % 2 === 0) return null;
  const operands = tokens.filter((_, i) => i % 2 === 0);
  const ops = tokens.filter((_, i) => i % 2 === 1);
  const hasLt = ops.some((o) => o.startsWith("<"));
  const hasGt = ops.some((o) => o.startsWith(">"));
  if (hasLt && hasGt) return null; // mixed directions — not a normal chain
  let normOperands = operands;
  let normOps = ops;
  if (hasGt) {
    normOperands = [...operands].reverse();
    normOps = [...ops].reverse().map((o) => (o === ">" ? "<" : "<="));
  }
  const canon = normOperands.map((o) => {
    const n = parseNumeric(o);
    return n === null ? o : String(n);
  });
  return canon.map((o, i) => (i < normOps.length ? o + normOps[i] : o)).join("");
}

/** Parse "(a, b)"-style coordinate forms into numeric components. */
function parseCoordinate(raw: string): number[] | null {
  let s = stripSpace(raw);
  if (s.startsWith("(") && s.endsWith(")")) s = s.slice(1, -1);
  const parts = s.split(",");
  if (parts.length < 2) return null;
  const nums = parts.map(parseNumeric);
  return nums.every((n): n is number => n !== null) ? (nums as number[]) : null;
}

/** Closing bracket required for each opener — only MATCHED pairs are stripped. */
const SET_BRACKETS: Record<string, string> = { "{": "}", "[": "]", "(": ")" };

/** Parse a comma-separated numeric multiset ("{1, 3}", "3,1"). */
function parseNumericSet(raw: string): number[] | null {
  let s = stripSpace(raw);
  // Strip only a MATCHED bracket pair — "{1,3)" must not parse as a clean set.
  const close = SET_BRACKETS[s.charAt(0)];
  if (close !== undefined && s.endsWith(close)) s = s.slice(1, -1);
  if (s === "") return null;
  const nums = s.split(",").map(parseNumeric);
  return nums.every((n): n is number => n !== null)
    ? (nums as number[]).slice().sort((a, b) => a - b)
    : null;
}

function assertNever(x: never): never {
  throw new Error(`Unhandled answer kind: ${JSON.stringify(x)}`);
}

/** Kind-aware canonical string — applied to both wrong responses and misconceptionMap keys. */
function canonicalForKind(spec: AnswerSpec, raw: string): string {
  switch (spec.kind) {
    case "numeric": {
      const n = parseNumeric(raw);
      return n === null ? stripSpace(raw) : String(n);
    }
    case "expression":
      return normalizeExpression(raw, spec.acceptEquivalent ?? false);
    case "inequality":
      return normalizeInequality(raw) ?? stripSpace(raw).replace(/≤/g, "<=").replace(/≥/g, ">=");
    case "numeric-set": {
      const set = parseNumericSet(raw);
      return set === null ? stripSpace(raw) : set.join(",");
    }
    case "coordinate": {
      const c = parseCoordinate(raw);
      return c === null ? stripSpace(raw) : `(${c.join(",")})`;
    }
    case "choice":
      return raw.trim();
    default:
      return assertNever(spec);
  }
}

function isCorrect(spec: AnswerSpec, response: string): boolean {
  // EXHAUSTIVE over all AnswerSpec kinds — the `never` default makes the
  // typecheck fail if a kind is ever added without handling it here.
  switch (spec.kind) {
    case "numeric": {
      const got = parseNumeric(response);
      const want = parseNumeric(spec.value);
      return got !== null && want !== null && numericEqual(got, want, spec.tolerance);
    }
    case "expression":
      return (
        normalizeExpression(response, spec.acceptEquivalent ?? false) ===
        normalizeExpression(spec.value, spec.acceptEquivalent ?? false)
      );
    case "inequality": {
      const got = normalizeInequality(response);
      const want = normalizeInequality(spec.value);
      return got !== null && want !== null && got === want;
    }
    case "numeric-set": {
      const got = parseNumericSet(response);
      const want = spec.values.map(parseNumeric);
      if (got === null || !want.every((n): n is number => n !== null)) return false;
      const wantSorted = (want as number[]).slice().sort((a, b) => a - b);
      return (
        got.length === wantSorted.length && got.every((n, i) => n === wantSorted[i])
      );
    }
    case "coordinate": {
      const got = parseCoordinate(response);
      const want = parseCoordinate(spec.value);
      return (
        got !== null &&
        want !== null &&
        got.length === want.length &&
        got.every((n, i) => numericEqual(n, want[i], spec.tolerance))
      );
    }
    case "choice":
      return response.trim() === spec.value;
    default:
      return assertNever(spec);
  }
}

/**
 * Check a response against the problem's AnswerSpec. On a wrong answer, the
 * normalized response is looked up in misconceptionMap (keys normalized the
 * same way) — no match means NO tag; the engine never guesses.
 */
export function checkAnswer(
  problem: ProblemTemplate,
  response: string,
): { correct: boolean; misconceptionTag?: string } {
  if (isCorrect(problem.answer, response)) return { correct: true };
  const map = problem.misconceptionMap;
  if (!map) return { correct: false };
  const normalized = canonicalForKind(problem.answer, response);
  for (const [key, tag] of Object.entries(map)) {
    if (canonicalForKind(problem.answer, key) === normalized) {
      return { correct: false, misconceptionTag: tag };
    }
  }
  return { correct: false };
}
