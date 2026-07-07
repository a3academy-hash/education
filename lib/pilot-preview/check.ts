// lib/pilot-preview/check.ts — client-side deterministic answer checking for
// the DEV-ONLY pilot preview. Mirrors lib/problem-engine's EXACT-EQUALITY pin:
// parseNumeric accepts plain numbers and a/b fractions, comparison is strict
// === with NO float tolerance. Fraction/decimal equivalence beyond that comes
// only from acceptedEquivalents list membership. Pure; no React, no IO, no
// network — the never-LLM list applies.

import type { MisconceptionMapEntry, PartAnswerType } from "./types";

const stripSpace = (s: string): string => s.replace(/\s+/g, "");

/** Mirrors lib/problem-engine parseNumeric: plain number or a/b fraction. */
export function parseNumericExact(raw: string): number | null {
  let s = stripSpace(raw);
  s = s.replace(/^[a-z]=/i, "");
  // Authoring uses the unicode minus in some copy; accept it as "-".
  s = s.replace(/−/g, "-");
  const frac = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(s);
  if (frac) {
    const den = Number(frac[2]);
    if (den === 0) return null;
    return Number(frac[1]) / den;
  }
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(s)) return null;
  return Number(s);
}

/** Exact match: trimmed-string equality OR parsed-numeric strict equality. */
export function numericMatches(response: string, target: string): boolean {
  if (stripSpace(response) === stripSpace(target)) return true;
  const a = parseNumericExact(response);
  const b = parseNumericExact(target);
  return a !== null && b !== null && a === b;
}

/**
 * Check a numeric response against the correct answer plus the item's
 * acceptedEquivalents list. No tolerance — exact-equality semantics only.
 */
export function checkNumeric(
  response: string,
  correctAnswer: string,
  acceptedEquivalents: string[] = [],
): boolean {
  if (numericMatches(response, correctAnswer)) return true;
  return acceptedEquivalents.some((eq) => numericMatches(response, eq));
}

/** Choice answers compare the exact option id. */
export function checkChoice(response: string, correctAnswer: string): boolean {
  return response.trim() === correctAnswer.trim();
}

/**
 * Match a WRONG response against misconceptionMap triggers. `prefix` handles
 * part/question-prefixed item-level triggers ("c:20", "diagnose:A"); when
 * given, only entries with that prefix are considered and the prefix is
 * stripped before comparison. No match returns null — never guess a tag.
 */
export function matchTrigger(
  response: string,
  answerType: PartAnswerType,
  entries: MisconceptionMapEntry[],
  prefix?: string,
): MisconceptionMapEntry | null {
  for (const entry of entries) {
    let trigger = entry.trigger;
    if (prefix !== undefined) {
      if (!trigger.startsWith(`${prefix}:`)) continue;
      trigger = trigger.slice(prefix.length + 1);
    }
    const hit =
      answerType === "choice"
        ? trigger.trim() === response.trim()
        : numericMatches(response, trigger);
    if (hit) return entry;
  }
  return null;
}
