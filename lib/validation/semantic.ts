// lib/validation/semantic.ts — semantic-dedup validator rules.
// Pure TypeScript, NO runtime imports (type-only imports are erased), so this
// file runs unmodified under Node 24 type stripping via scripts/validate-graph.ts.

import type { ValidationIssue } from "../../types";

// ---------------------------------------------------------------------------
// Internal loose types — mirroring the raw graph shapes we receive.
// ---------------------------------------------------------------------------

type RawStep = { prompt?: unknown; reveal?: unknown };
type RawWE = { id?: unknown; title?: unknown; steps?: unknown };
type RawAnswer = { kind?: unknown; value?: unknown; values?: unknown };
type RawProblem = {
  id?: unknown;
  phase?: unknown;
  sport?: unknown;
  prompt?: unknown;
  answer?: unknown;
  hints?: unknown;
  misconceptionMap?: unknown;
  visual?: unknown;
  visualSpec?: unknown;
};
type RawNode = {
  id: string;
  workedExamples?: unknown;
  problems?: unknown;
};

// ---------------------------------------------------------------------------
// SPORT_LEXICON — named exported const for test use.
// Word-boundary global regex; matches singular and plural forms verbatim.
// ---------------------------------------------------------------------------

export const SPORT_LEXICON: RegExp = new RegExp(
  "\\b(?:" +
    [
      "baseball",
      "softball",
      "basketball",
      "soccer",
      "football",
      "volleyball",
      "innings?",
      "runs?",
      "pitcher",
      "reliever",
      "homestand",
      "tournament",
      "goals?",
      "points?",
      "quarter",
      "sets?",
      "match",
      "games?",
      "teams?",
      "players?",
      "season",
      "scores?(?:d)?",
      "scoreless",
      "wins?",
      "losses?",
      "yards?",
      "touchdown",
      "serves?",
      "rally",
      "kills?",
      "hits?",
      "rebounds?",
      "assists?",
      "half",
      "period",
    ].join("|") +
    ")\\b",
  "gi",
);

// ---------------------------------------------------------------------------
// Shared normalization helpers (exported for tests).
// ---------------------------------------------------------------------------

const SUP_CHARS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** Canonical form: lowercase, superscripts→^n, math symbols normalized, whitespace collapsed. */
export function canon(s: string): string {
  let out = "";
  for (const ch of s) {
    const i = SUP_CHARS.indexOf(ch);
    if (i >= 0) {
      out += "^" + i;
    } else {
      out += ch;
    }
  }
  // lowercase
  out = out.toLowerCase();
  // U+2212 MINUS SIGN → hyphen-minus
  out = out.replace(/−/g, "-");
  // multiplication variants → *
  out = out.replace(/[·×⋅]/g, "*");
  // division → /
  out = out.replace(/÷/g, "/");
  // collapse whitespace
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

/** All decimal numerals in canon output, in order. */
export function numerals(s: string): string[] {
  return s.match(/\d+(?:\.\d+)?/g) ?? [];
}

/** Sorted join of all numerals — the operand fingerprint. */
export function numeralMultiset(s: string): string {
  return numerals(s).sort().join(",");
}

/** Which of + - * / ^ = occur in s (in that fixed order). */
export function opSet(s: string): string {
  let r = "";
  if (/\+/.test(s)) r += "+";
  if (/-/.test(s)) r += "-";
  if (/\*/.test(s)) r += "*";
  if (/\//.test(s)) r += "/";
  if (/\^/.test(s)) r += "^";
  if (/=/.test(s)) r += "=";
  return r;
}

/**
 * Structural skeleton of a prompt:
 * 1. canon(prompt)
 * 2. every numeral → "#"
 * 3. every SPORT_LEXICON word → "@"
 */
export function skeleton(prompt: string): string {
  let s = canon(prompt);
  s = s.replace(/\d+(?:\.\d+)?/g, "#");
  // Reset lastIndex between uses; the SPORT_LEXICON regex has the 'g' flag.
  SPORT_LEXICON.lastIndex = 0;
  s = s.replace(SPORT_LEXICON, "@");
  return s;
}

// ---------------------------------------------------------------------------
// Type guards and extractors.
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strOrEmpty(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// ---------------------------------------------------------------------------
// RULE 1 — DUP_WORKED_EXAMPLE
// ---------------------------------------------------------------------------

function rule1DupWorkedExample(node: RawNode): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!Array.isArray(node.workedExamples)) return issues;

  const wes = node.workedExamples as RawWE[];

  // --- Tier B: full-trace collision (error) ---
  const tierBMap = new Map<string, string>(); // key → first we.id
  for (const we of wes) {
    const weId = str(we.id);
    if (!weId) continue;
    const steps = Array.isArray(we.steps) ? (we.steps as RawStep[]) : [];
    const allText = steps.map((s) => strOrEmpty(s.prompt) + " " + strOrEmpty(s.reveal)).join(" ");
    const c = canon(allText);
    const key = numeralMultiset(c) + "|" + opSet(c);
    const prev = tierBMap.get(key);
    if (prev !== undefined) {
      const items = [prev, weId].sort();
      issues.push({
        severity: "error",
        code: "DUP_WORKED_EXAMPLE",
        nodeId: node.id,
        items,
        message: `worked examples ${items[0]} and ${items[1]} share the same operand signature [${key}]`,
      });
    } else {
      tierBMap.set(key, weId);
    }
  }

  // --- Tier A: setup-operand collision (warning) ---
  const tierAMap = new Map<string, string>(); // key → first we.id
  for (const we of wes) {
    const weId = str(we.id);
    if (!weId) continue;
    const steps = Array.isArray(we.steps) ? (we.steps as RawStep[]) : [];
    const firstPrompt = steps.length > 0 ? strOrEmpty(steps[0].prompt) : "";
    const titlePlusFirst = strOrEmpty(we.title) + " " + firstPrompt;
    const key = numeralMultiset(canon(titlePlusFirst));
    if (!key) continue; // skip if no numerals
    const prev = tierAMap.get(key);
    if (prev !== undefined) {
      const items = [prev, weId].sort();
      issues.push({
        severity: "warning",
        code: "DUP_WORKED_EXAMPLE",
        nodeId: node.id,
        items,
        message: `worked examples ${items[0]} and ${items[1]} share the same operand signature [${key}]`,
      });
    } else {
      tierAMap.set(key, weId);
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// RULE 2 — NEAR_DUP_PROMPT
// ---------------------------------------------------------------------------

function rule2NearDupPrompt(node: RawNode): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(node.problems)) return issues;

  interface ProblemEntry {
    id: string;
    sport: string;
    phase: number;
    prompt: string;
  }

  const problems: ProblemEntry[] = [];
  for (const bucket of ["p1", "p2", "p3"] as const) {
    const list = (node.problems as Record<string, unknown>)[bucket];
    if (!Array.isArray(list)) continue;
    for (const p of list as RawProblem[]) {
      const id = str(p.id);
      const sport = str(p.sport);
      const phase = typeof p.phase === "number" ? p.phase : 0;
      const prompt = str(p.prompt);
      if (!id || !prompt) continue;
      problems.push({ id, sport, phase, prompt });
    }
  }

  // Group by composite key
  const keyMap = new Map<string, ProblemEntry[]>();
  for (const p of problems) {
    const c = canon(p.prompt);
    const key = numeralMultiset(c) + "|" + skeleton(p.prompt);
    const group = keyMap.get(key);
    if (group) {
      group.push(p);
    } else {
      keyMap.set(key, [p]);
    }
  }

  // Find same-sport pairs within each group
  for (const [key, group] of keyMap) {
    if (group.length < 2) continue;
    const numeralsPart = key.split("|")[0];
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (a.sport !== b.sport) continue; // cross-sport: exempt
        const items = [a.id, b.id].sort();
        // Put in lexicographic order for message
        const [idA, idB] = items;
        const pa = a.id === idA ? a : b;
        const pb = a.id === idA ? b : a;
        issues.push({
          severity: "warning",
          code: "NEAR_DUP_PROMPT",
          nodeId: node.id,
          items,
          message: `problems ${idA} (p${pa.phase}/${pa.sport}) and ${idB} (p${pb.phase}/${pb.sport}) share numerals [${numeralsPart}] and an identical structural skeleton`,
        });
      }
    }
  }

  // Sort issues by items[0] for determinism
  issues.sort((a, b) => (a.items?.[0] ?? "").localeCompare(b.items?.[0] ?? ""));

  return issues;
}

// ---------------------------------------------------------------------------
// RULE 3 — REUSED_TEXT (graph-wide; called once with all nodes)
// ---------------------------------------------------------------------------

const CONCEPT_CONSTANTS = new Set(["0", "1", "100"]);

interface HintEntry {
  problemId: string;
  nodeId: string;
  prompt: string;
  answer: RawAnswer | null;
  misconceptionMap: Record<string, unknown> | null;
}

interface RevealEntry {
  weId: string;
  nodeId: string;
}

function rule3ReusedText(nodes: RawNode[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Build hint pool
  const hintPool = new Map<string, HintEntry[]>(); // canon(hint) → entries
  for (const node of nodes) {
    if (!isRecord(node.problems)) continue;
    for (const bucket of ["p1", "p2", "p3"]) {
      const list = (node.problems as Record<string, unknown>)[bucket];
      if (!Array.isArray(list)) continue;
      for (const p of list as RawProblem[]) {
        const pid = str(p.id);
        if (!pid) continue;
        const hints = Array.isArray(p.hints) ? (p.hints as unknown[]) : [];
        const answer = isRecord(p.answer) ? (p.answer as RawAnswer) : null;
        const misconceptionMap =
          isRecord(p.misconceptionMap) ? (p.misconceptionMap as Record<string, unknown>) : null;
        for (const h of hints) {
          if (typeof h !== "string" || !h) continue;
          const k = canon(h);
          const entry: HintEntry = {
            problemId: pid,
            nodeId: node.id,
            prompt: str(p.prompt),
            answer,
            misconceptionMap,
          };
          const arr = hintPool.get(k);
          if (arr) {
            arr.push(entry);
          } else {
            hintPool.set(k, [entry]);
          }
        }
      }
    }
  }

  // Build reveal pool
  const revealPool = new Map<string, RevealEntry[]>(); // canon(reveal) → entries
  for (const node of nodes) {
    if (!Array.isArray(node.workedExamples)) continue;
    for (const we of node.workedExamples as RawWE[]) {
      const weId = str(we.id);
      if (!weId) continue;
      const steps = Array.isArray(we.steps) ? (we.steps as RawStep[]) : [];
      for (const step of steps) {
        const reveal = str(step.reveal);
        if (!reveal) continue;
        const k = canon(reveal);
        const entry: RevealEntry = { weId, nodeId: node.id };
        const arr = revealPool.get(k);
        if (arr) {
          arr.push(entry);
        } else {
          revealPool.set(k, [entry]);
        }
      }
    }
  }

  // Process hints (iterate nodes in graph order for determinism)
  for (const node of nodes) {
    if (!isRecord(node.problems)) continue;
    for (const bucket of ["p1", "p2", "p3"]) {
      const list = (node.problems as Record<string, unknown>)[bucket];
      if (!Array.isArray(list)) continue;
      for (const p of list as RawProblem[]) {
        const pid = str(p.id);
        if (!pid) continue;
        const hints = Array.isArray(p.hints) ? (p.hints as unknown[]) : [];
        for (const h of hints) {
          if (typeof h !== "string" || !h) continue;
          const k = canon(h);
          const entries = hintPool.get(k);
          if (!entries || entries.length < 2) continue;

          // Check distinct problems
          const distinctProblemIds = [...new Set(entries.map((e) => e.problemId))];
          if (distinctProblemIds.length < 2) continue;

          // This problem is the host; check it
          const hostEntry = entries.find((e) => e.problemId === pid);
          if (!hostEntry) continue;

          // Genericity exemption
          const hintNums = numerals(k).filter((x) => !CONCEPT_CONSTANTS.has(x));
          if (hintNums.length === 0) continue;

          // Build host numeral set from prompt + answer + misconceptionMap keys
          const hostNumeralSet = new Set<string>();
          numerals(canon(hostEntry.prompt)).forEach((x) => hostNumeralSet.add(x));
          if (hostEntry.answer) {
            const ansValues = hostEntry.answer.values;
            const ansValue = hostEntry.answer.value;
            if (Array.isArray(ansValues)) {
              for (const v of ansValues as unknown[]) {
                if (typeof v === "string") numerals(canon(v)).forEach((x) => hostNumeralSet.add(x));
              }
            } else if (typeof ansValue === "string") {
              numerals(canon(ansValue)).forEach((x) => hostNumeralSet.add(x));
            }
          }
          if (hostEntry.misconceptionMap) {
            for (const mk of Object.keys(hostEntry.misconceptionMap)) {
              numerals(canon(mk)).forEach((x) => hostNumeralSet.add(x));
            }
          }

          // Flag if none of the hint's operand numerals appear in the host
          const intersects = hintNums.some((hn) => hostNumeralSet.has(hn));
          if (!intersects) {
            const otherIds = distinctProblemIds
              .filter((id) => id !== pid)
              .sort()
              .slice(0, 5); // cap at 5 others → items capped at 6 total
            const items = [pid, ...otherIds];
            const display = h.length > 80 ? h.slice(0, 80) : h;
            issues.push({
              severity: "warning",
              code: "REUSED_TEXT",
              nodeId: node.id,
              items,
              message: `hint "${display}" is shared verbatim by ${distinctProblemIds.length} problems but none of its numerals appear in ${pid}`,
            });
          }
        }
      }
    }
  }

  // Process reveals (graph-wide; emit once per colliding canon key)
  // Emit with nodeId of the first WE's owning node (graph order)
  const emittedRevealKeys = new Set<string>();
  for (const node of nodes) {
    if (!Array.isArray(node.workedExamples)) continue;
    for (const we of node.workedExamples as RawWE[]) {
      const weId = str(we.id);
      if (!weId) continue;
      const steps = Array.isArray(we.steps) ? (we.steps as RawStep[]) : [];
      for (const step of steps) {
        const reveal = str(step.reveal);
        if (!reveal) continue;
        const k = canon(reveal);
        if (emittedRevealKeys.has(k)) continue;
        const entries = revealPool.get(k);
        if (!entries) continue;
        const distinctWEIds = [...new Set(entries.map((e) => e.weId))];
        if (distinctWEIds.length < 2) continue;
        emittedRevealKeys.add(k);
        const items = distinctWEIds.sort().slice(0, 6);
        const display = reveal.length > 80 ? reveal.slice(0, 80) : reveal;
        issues.push({
          severity: "warning",
          code: "REUSED_TEXT",
          nodeId: node.id,
          items,
          message: `reveal "${display}" is shared verbatim across ${distinctWEIds.length} worked examples`,
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// RULE 4 — VISUAL SPEC RULES (Phase 8 / B §G; regression guard).
//
// Operates on every authored problem across p1/p2/p3:
//   (1) VISUAL_SPEC_MISMATCH (error)  — spec present ⇒ spec.kind === visual.
//   (2) VISUAL_KIND_DRIFT    (warning)— `visual` must be in the supported set
//        {coordinate,numberline,table,balance,area-model} ∪ null; the drift
//        values graph/boxplot/histogram/scatter are flagged (being nulled).
//   (3) VISUAL_ANSWER_LEAK   (error)  — interactive coordinate spec ⇒ its
//        `points` must not contain the answer coordinate (the target).
//   (4) VISUAL_DECORATION    (warning)— a coordinate/numberline/table visual
//        with NO visualSpec and a non-geometry answer = leftover decoration.
// ---------------------------------------------------------------------------

const SUPPORTED_VISUAL_KINDS = new Set([
  "coordinate",
  "numberline",
  "table",
  "balance",
  "area-model",
]);
const RENDERABLE_VISUAL_KINDS = new Set(["coordinate", "numberline", "table"]);

/** Parse "(x, y)" → "x,y" canonical, or null when it isn't a coordinate pair. */
function coordKey(raw: string): string | null {
  const c = canon(raw);
  const m = c.match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?$/);
  if (!m) return null;
  return `${Number(m[1])},${Number(m[2])}`;
}

function eachProblem(node: RawNode, fn: (p: RawProblem) => void): void {
  if (!isRecord(node.problems)) return;
  for (const bucket of ["p1", "p2", "p3"]) {
    const list = (node.problems as Record<string, unknown>)[bucket];
    if (!Array.isArray(list)) continue;
    for (const p of list as RawProblem[]) fn(p);
  }
}

function rule4VisualSpec(node: RawNode): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  eachProblem(node, (p) => {
    const pid = str(p.id) || "<no id>";
    const visual = typeof p.visual === "string" ? p.visual : null;
    const spec = isRecord(p.visualSpec) ? p.visualSpec : null;
    const answer = isRecord(p.answer) ? (p.answer as RawAnswer) : null;
    const answerKind = answer && typeof answer.kind === "string" ? answer.kind : null;

    // (2) VISUAL_KIND_DRIFT — unsupported kind (warning). null is allowed.
    if (visual !== null && !SUPPORTED_VISUAL_KINDS.has(visual)) {
      issues.push({
        severity: "warning",
        code: "VISUAL_KIND_DRIFT",
        nodeId: node.id,
        items: [pid],
        message: `problem ${pid} has visual "${visual}" which is not a supported kind — null it or author a primitive`,
      });
    }

    if (spec) {
      const specKind = typeof spec.kind === "string" ? spec.kind : null;
      const specMode = typeof spec.mode === "string" ? spec.mode : null;

      // (1) VISUAL_SPEC_MISMATCH — spec.kind must equal the declared visual.
      if (specKind !== visual) {
        issues.push({
          severity: "error",
          code: "VISUAL_SPEC_MISMATCH",
          nodeId: node.id,
          items: [pid],
          message: `problem ${pid} visualSpec.kind "${String(specKind)}" does not match visual "${String(visual)}"`,
        });
      }

      // (3) VISUAL_ANSWER_LEAK — interactive coordinate must not plot the target.
      if (
        specKind === "coordinate" &&
        specMode === "interactive" &&
        answerKind === "coordinate" &&
        typeof answer?.value === "string"
      ) {
        const target = coordKey(answer.value);
        const specPoints = Array.isArray(spec.points) ? spec.points : [];
        if (target) {
          for (const sp of specPoints) {
            if (!isRecord(sp)) continue;
            const sx = typeof sp.x === "number" ? sp.x : NaN;
            const sy = typeof sp.y === "number" ? sp.y : NaN;
            if (`${sx},${sy}` === target) {
              issues.push({
                severity: "error",
                code: "VISUAL_ANSWER_LEAK",
                nodeId: node.id,
                items: [pid],
                message: `problem ${pid} interactive coordinate spec plots the answer point (${target}) — that leaks the target`,
              });
              break;
            }
          }
        }
      }
    } else {
      // (4) VISUAL_DECORATION — a renderable visual with no spec and a
      // non-geometry answer is leftover decoration.
      const geometryAnswer = answerKind === "coordinate";
      if (visual !== null && RENDERABLE_VISUAL_KINDS.has(visual) && !geometryAnswer) {
        issues.push({
          severity: "warning",
          code: "VISUAL_DECORATION",
          nodeId: node.id,
          items: [pid],
          message: `problem ${pid} declares visual "${visual}" with no visualSpec and a ${String(answerKind)} answer — leftover decoration; null the visual or author a spec`,
        });
      }
    }
  });

  return issues;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function validateSemantics(nodes: RawNode[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Per-node rules (iterate in graph order)
  for (const node of nodes) {
    issues.push(...rule1DupWorkedExample(node));
    issues.push(...rule2NearDupPrompt(node));
    issues.push(...rule4VisualSpec(node));
  }

  // Graph-wide rules
  issues.push(...rule3ReusedText(nodes));

  return issues;
}
