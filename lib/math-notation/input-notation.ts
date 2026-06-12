// lib/math-notation/input-notation.ts — pure, deterministic TRIGGER for the math
// input keypad (Phase 8 / C-2). It answers ONE question: "does the ACCEPTED
// answer form of this item contain a notation the student would struggle to type
// on a plain keyboard?" and returns only boolean flags for those notations.
//
// HARD CONTRACT (mr-gates, non-negotiable):
//  - This NEVER ships the answer value anywhere. The server calls it with
//    problem.answer and ships ONLY the resulting flags on the DTO. The flags
//    drive which keys appear; they never reveal what to type.
//  - The keypad must emit only strings the FROZEN checkAnswer already accepts.
//    Therefore this trigger is deliberately CONSERVATIVE: it fires only for
//    answer kinds whose accepted value IS the notation (numeric / numeric-set /
//    inequality / expression). PLAIN numeric answers ("16", "64", "-7") return
//    null → NO keypad: the prompt already renders "4²" and the student types 16.
//  - choice and coordinate answers ALWAYS return null (no keypad).
//  - A LITERAL-INPUT expression (one carrying an ASCII `*` multiply, e.g.
//    "C/(2*PI)") returns null. The keypad has no `*` key and toLatex never
//    prettifies these, so the student must type the raw checkAnswer string on
//    the keyboard. Degrading to the keyboard keeps the round-trip guarantee.
//
// DETERMINISTIC: same AnswerSpec → same flags. No clock/random/IO.

import type { AnswerSpec } from "@/types";

/** Which typeable-notation keys the keypad should offer for an item. */
export interface InputNotation {
  /** Exponent present (caret `^` or a unicode superscript ²³…) → x² toggle key. */
  superscript?: boolean;
  /** Simple `a/b` fraction present → fraction key. */
  fraction?: boolean;
  /** Radical present (√ / sqrt) → √ key. */
  radical?: boolean;
  /** ± present → ± key. */
  plusminus?: boolean;
  /** π present (π / pi) → π key. */
  pi?: boolean;
}

const UNICODE_SUPERSCRIPT = /[⁰¹²³⁴-⁹]/;
const CARET = /\^/;
/** A simple a/b ratio anywhere in the string (digits or a single variable on each side). */
const SIMPLE_FRACTION = /(?:\d|[a-z])\s*\/\s*(?:-?\d|[a-z])/i;
const RADICAL = /√|sqrt/i;
const PLUSMINUS = /±/;
const PI = /π|\bpi\b/i;
/** ASCII `*` multiply marks a LITERAL-INPUT expression — degrade to the keyboard. */
const ASTERISK = /\*/;

/**
 * ROUND-TRIP SCOPE (the guarantee): the FROZEN checkAnswer compares
 * numeric/numeric-set values through parseNumeric, which accepts a/b fractions
 * but REJECTS √ ± π and superscripts (they parse to null → never correct). So
 * for those kinds we offer ONLY the fraction key — any other glyph key there
 * could not grade and would be answer-noise. expression/inequality compare the
 * normalized STRING, so √ ± π and superscripts round-trip literally and all
 * flags apply. `literalOk` selects which set is round-trippable.
 */
function flagsForValue(value: string, literalOk: boolean): InputNotation {
  const out: InputNotation = {};
  if (SIMPLE_FRACTION.test(value)) out.fraction = true;
  if (!literalOk) return out; // numeric kinds: fraction only (round-trip safe)
  if (CARET.test(value) || UNICODE_SUPERSCRIPT.test(value)) out.superscript = true;
  if (RADICAL.test(value)) out.radical = true;
  if (PLUSMINUS.test(value)) out.plusminus = true;
  if (PI.test(value)) out.pi = true;
  return out;
}

/**
 * Derive keypad flags from the ACCEPTED answer form. Returns null when no
 * typeable notation is present (→ NO keypad: plain keyboard only).
 *
 * Only numeric / numeric-set / inequality / expression answers can trigger the
 * keypad. choice and coordinate always return null. A `*`-bearing expression
 * (literal-input form) returns null so it degrades to the keyboard, preserving
 * the checkAnswer round-trip guarantee.
 */
export function inputNotation(answer: AnswerSpec): InputNotation | null {
  switch (answer.kind) {
    case "choice":
    case "coordinate":
      return null;
    case "inequality":
    case "expression": {
      if (ASTERISK.test(answer.value)) return null; // literal-input → keyboard
      const flags = flagsForValue(answer.value, true);
      return Object.keys(flags).length === 0 ? null : flags;
    }
    case "numeric": {
      if (ASTERISK.test(answer.value)) return null;
      const flags = flagsForValue(answer.value, false);
      return Object.keys(flags).length === 0 ? null : flags;
    }
    case "numeric-set": {
      if (answer.values.some((v) => ASTERISK.test(v))) return null;
      const merged: InputNotation = {};
      for (const v of answer.values) Object.assign(merged, flagsForValue(v, false));
      return Object.keys(merged).length === 0 ? null : merged;
    }
    default: {
      // Exhaustiveness guard — a new AnswerSpec kind fails the typecheck here.
      const _never: never = answer;
      return _never;
    }
  }
}
