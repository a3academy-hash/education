// components/learning/math-keypad-hint.ts — pure copy helper for the keypad's
// format hint (Phase 8 / C-2). No engine, no IO. Returns a helperText string
// plus an inline rendered example (the example is run through <MathText> by the
// caller). Copy rules (pee-wee §C): no exclamation, "and" not "&".
//
// Priority when several notations apply: superscript → fraction → radical →
// plusminus → pi. The expression-style "type your expression" hint is used when
// superscript appears ALONGSIDE another notation (a multi-notation expression).

import type { InputNotation } from "../../lib/math-notation/input-notation";

export interface KeypadHint {
  /** Plain helperText (rendered by Input.helperText; no math markup needed). */
  text: string;
  /** One small example to render via <MathText> beside/within the hint. */
  example: string;
}

export function keypadHint(notation: InputNotation): KeypadHint {
  const multi =
    Object.values(notation).filter(Boolean).length > 1 && notation.superscript;
  if (multi) {
    return {
      text: "Type your expression — use the keys for exponents and roots. For example, ",
      example: "x²+3x",
    };
  }
  if (notation.superscript) {
    return {
      text: "Type the base, then tap x² for the exponent — like ",
      example: "4²",
    };
  }
  if (notation.fraction) {
    return { text: "Use the fraction key — like ", example: "3/4" };
  }
  if (notation.radical) {
    return { text: "Use √ for roots — like ", example: "2√13" };
  }
  if (notation.plusminus) {
    return { text: "Use the ± key — like ", example: "±5" };
  }
  if (notation.pi) {
    return { text: "Use the π key — like ", example: "3π" };
  }
  return { text: "Use the keys for math notation.", example: "" };
}
