// lib/math-notation/segment.ts — pure, deterministic segmentation of an authored
// plain-text string into alternating PROSE and MATH runs.
//
// WHY (Phase 8 / C render-bug fix): <MathText> previously passed the WHOLE
// string to katex.renderToString, so a word problem's prose was typeset in
// math mode — words italicised, spaces COLLAPSED, the card overflowing. The
// design (pee-wee / mr-gates) is to render prose as PLAIN host-font text and
// typeset ONLY genuine notation spans. This module decides where those spans are.
//
// CONTRACT:
//  - PURE / TOTAL / DETERMINISTIC: no IO, no React, never throws (matches the
//    to-latex.ts guarantees this feeds into).
//  - Concatenating every run's `text` reproduces the input BYTE-FOR-BYTE
//    (spaces and punctuation preserved). MathText relies on this to never lose
//    or collapse whitespace.
//  - CONSERVATIVE: when unsure, classify as PROSE. A run is MATH only when it is
//    a single whitespace-delimited token that isMathToken() accepts (the SAME
//    gate the converter uses — LONG_WORD prose rejection, the `*`/literal-input
//    grading-safety exclusion, MATH_MARKER, digit-op-digit). Whitespace is ALWAYS
//    prose, so a MATH run is always one token and can never wrap a whole clause.
//  - A lone digit adjacent to words (e.g. "has 3 rounds") is PROSE: a bare "3"
//    carries no MATH_MARKER and no digit-op-digit shape, so isMathToken rejects
//    it. Only real notation (2³, √(b²−4ac), x²+3x, 3/4) becomes a MATH run.

import { isLiteralInstruction, isMathToken } from "./to-latex";

/** One contiguous run of the input: `math:false` → plain prose, `true` → notation. */
export interface MathSegment {
  /** The exact source substring for this run (whitespace/punctuation intact). */
  text: string;
  /** True iff this run is a single math-shaped token to typeset via KaTeX. */
  math: boolean;
}

/**
 * Split `s` into contiguous PROSE vs MATH runs.
 *
 * Adjacent same-class tokens (and the whitespace between same-class neighbours)
 * are coalesced into one run so the consumer maps the minimum number of nodes.
 * Whitespace bordering a prose token stays in the prose run; whitespace between
 * two math tokens is emitted as its own prose run (keeping each math run a single
 * typeset token and the spacing visible as plain text).
 */
export function segmentMath(s: string): MathSegment[] {
  if (s === "") return [];
  // HARD EXCLUSION (grading-safety, mirrors toLatex): a literal-input instruction
  // is rendered entirely as prose so the raw checkAnswer target survives verbatim.
  if (isLiteralInstruction(s)) return [{ text: s, math: false }];

  // Split on whitespace KEEPING separators, exactly as toLatex does, so spacing
  // is preserved byte-for-byte.
  const parts = s.split(/(\s+)/u);

  // Classify each part: whitespace → prose; otherwise the shared isMathToken gate.
  type Tagged = { text: string; math: boolean };
  const tagged: Tagged[] = [];
  for (const part of parts) {
    if (part === "") continue;
    if (/^\s+$/u.test(part)) {
      tagged.push({ text: part, math: false });
      continue;
    }
    tagged.push({ text: part, math: isMathToken(part) });
  }

  // Coalesce adjacent same-class runs (whitespace is prose, so it merges with
  // neighbouring prose and never bleeds into a math run).
  const out: MathSegment[] = [];
  for (const t of tagged) {
    const last = out[out.length - 1];
    if (last && last.math === t.math) {
      last.text += t.text;
    } else {
      out.push({ text: t.text, math: t.math });
    }
  }
  return out;
}
