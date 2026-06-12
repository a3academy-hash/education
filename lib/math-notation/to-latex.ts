// lib/math-notation/to-latex.ts — pure, deterministic, TOTAL converter from the
// authored plain-text math notation to a minimal KaTeX-safe LaTeX string.
//
// SCOPE (Phase 8 / C-1): the FINALIZED mapping (mr-kahn APPROVE WITH CHANGES).
// Covers the symbol/exponent/subscript/radical/fraction set the Algebra 1 graph
// actually uses. Do NOT widen this without mr-kahn approval.
//
// GUARANTEES:
//  - TOTAL: never throws on ANY input (including junk, lone backslashes,
//    unbalanced parens, control chars). Worst case it returns the input
//    unchanged or with partial conversion — it is the <MathText> degrade path,
//    not this function, that owns the final plain-text fallback.
//  - DETERMINISTIC: same input → same output, no clock/random/IO.
//  - SEGMENTING: prose is left BYTE-FOR-BYTE untouched. Only whitespace-
//    delimited runs that look like math (carry a caret / unicode superscript /
//    √ / π / ± / ≤≥≠≈ / a digit-op-digit shape) AND contain no long word
//    (≥4 ASCII letters) are converted. This reuses the gate idea from
//    lib/session-helpers/why.ts (LONG_WORD rejects word problems).
//
// HARD GRADING-SAFETY EXCLUSION (mr-kahn #4 — CRITICAL):
//  - A run that is a LITERAL-INPUT instruction is NEVER prettified, so the
//    student can reproduce the raw string the FROZEN checkAnswer expects:
//      * any token containing an ASCII `*` (asterisk multiply) → raw, verbatim.
//      * the "in the form {X}" / "exactly {X}" instruction pattern → the {X}
//        code-like token is left verbatim.
//
// MAPPINGS:
//   a^b           → a^{b}        (group the exponent run to the next op/space)
//   a^(expr)      → a^{expr}     (parens consumed; content verbatim)
//   _x            → _{x}         (ASCII subscript: underscore + single alnum)
//   ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻  → ^{...}      (unicode superscripts; runs grouped)
//   ₀₁₂₃₄₅₆₇₈₉₊₋  → _{...}      (unicode subscripts; runs grouped)
//   √n            → \sqrt{n}     (single token radicand)
//   √(...)        → \sqrt{...}   (balanced paren radicand)
//   a/b           → \tfrac{a}{b} (simple numeric ratio in prose; \dfrac if display)
//   (e)/(e)       → \frac/\dfrac (explicitly parenthesised ratio)
//   other `/`     → left literal (conservative fallback)
//   − (U+2212)    → -
//   ·             → \cdot      ×  → \times      ±  → \pm      π  → \pi
//   ≤ → \le   ≥ → \ge   ≠ → \neq   ≈ → \approx
//   |expr|        → |expr|     (verbatim — KaTeX renders single-level fine)
//   °             → left as plain text (units prose, e.g. −6°F — never mathified)
//   ✓             → plain text (never reaches KaTeX as a token)

/** A word of ≥4 ASCII letters → this run is prose, never converted. */
const LONG_WORD = /[A-Za-z]{4,}/u;

/** Unicode superscript glyphs → their base character. */
const SUPERSCRIPT_MAP: Readonly<Record<string, string>> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁺": "+",
  "⁻": "-",
};

/** Unicode subscript glyphs → their base character. */
const SUBSCRIPT_MAP: Readonly<Record<string, string>> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "₊": "+",
  "₋": "-",
};

const SUPERSCRIPT_CHARS = Object.keys(SUPERSCRIPT_MAP).join("");
const SUBSCRIPT_CHARS = Object.keys(SUBSCRIPT_MAP).join("");

/** Single-char symbol substitutions (applied verbatim, order-independent). */
const SYMBOL_MAP: ReadonlyArray<readonly [string, string]> = [
  ["−", "-"], //  − minus → hyphen-minus
  ["·", "\\cdot "], //  · → \cdot
  ["×", "\\times "], //  × → \times
  ["±", "\\pm "], //  ± → \pm
  ["π", "\\pi "], //  π → \pi
  ["≤", "\\le "], //  ≤ → \le
  ["≥", "\\ge "], //  ≥ → \ge
  ["≠", "\\neq "], //  ≠ → \neq
  ["≈", "\\approx "], //  ≈ → \approx
];

/** Glyphs that, alone, mark a token as math-shaped (| is single-level abs). */
const MATH_MARKER = new RegExp(
  `[\\^_|\\u221A\\u03C0\\u00B1\\u2264\\u2265\\u2260\\u2248${SUPERSCRIPT_CHARS}${SUBSCRIPT_CHARS}]`,
  "u",
);

/** digit-operator-digit shape (e.g. "3/4", "2+2", "4^2"), spanning unicode sup/sub. */
const DIGIT_OP_DIGIT = new RegExp(
  `[0-9${SUPERSCRIPT_CHARS}${SUBSCRIPT_CHARS}]\\s*[+\\-/^\\u2212\\u00B7\\u00D7]\\s*[0-9(${SUPERSCRIPT_CHARS}${SUBSCRIPT_CHARS}]`,
  "u",
);

/**
 * Literal-input instruction pattern (HARD EXCLUSION, mr-kahn #4): a phrase like
 * 'Type ... in the form c/(2*pi)' or '... exactly 3x+2'. When present we DO NOT
 * mathify — the whole string passes verbatim so the student reproduces the raw
 * checkAnswer string. We keep this string-level (cheap, robust) and pair it with
 * the token-level `*` rule below.
 */
const LITERAL_INSTRUCTION = /\b(?:in the form|exactly|type[^.]*\bas\b)\b/iu;

/** A token is RAW-INPUT (never mathified) if it carries an ASCII `*` multiply. */
function isRawInputToken(token: string): boolean {
  return token.includes("*");
}

/**
 * True iff `token` looks like math we should convert (and is not prose/raw).
 *
 * Exported so the MathText segmenter (lib/math-notation/segment.ts) classifies
 * runs with the IDENTICAL gate the converter uses — LONG_WORD prose rejection,
 * the `*`/literal-input grading-safety exclusion, MATH_MARKER, and the
 * digit-op-digit shape. One source of truth for "is this run math?".
 */
export function isMathToken(token: string): boolean {
  if (isRawInputToken(token)) return false; // grading-safety: literal-input run
  if (LONG_WORD.test(token)) return false;
  if (MATH_MARKER.test(token)) return true;
  return DIGIT_OP_DIGIT.test(token);
}

/**
 * True iff `s` is a literal-input instruction string (e.g. '... in the form
 * c/(2*pi)'). Exported for the segmenter: such a string is NEVER mathified, so
 * the raw checkAnswer target survives verbatim. Mirrors the toLatex() guard.
 */
export function isLiteralInstruction(s: string): boolean {
  return LITERAL_INSTRUCTION.test(s);
}

/**
 * Characters that TERMINATE a caret exponent / single-token radicand run:
 * ASCII operators, grouping, space, comparators, AND the unicode math operators
 * (− · × ± and the comparators) so an exponent binds to exactly one token
 * (mr-kahn #6 conservative grouping).
 */
const EXPONENT_TERMINATOR = /[+\-*/^()\s=<>,−·×±≤≥≠≈]/u;

/**
 * Convert caret exponents:
 *   a^(expr) → a^{expr}  (consume the balanced paren group; content verbatim)
 *   a^b      → a^{b}     (group the exponent run up to the next op/grouping/space)
 * A caret already followed by `{` is left alone (pre-grouped). A trailing caret
 * with nothing after it is emitted verbatim (TOTAL: no throw).
 */
function convertCarets(token: string): string {
  let out = "";
  let i = 0;
  while (i < token.length) {
    const ch = token[i];
    if (ch !== "^") {
      out += ch;
      i += 1;
      continue;
    }
    // ch === "^"
    const next = token[i + 1];
    if (next === undefined) {
      out += "^"; // dangling caret — leave it
      i += 1;
      continue;
    }
    if (next === "{") {
      out += "^"; // already grouped — pass through
      i += 1;
      continue;
    }
    if (next === "(") {
      // Parenthesised exponent: consume the balanced group, content verbatim.
      const group = readParenGroup(token, i + 1);
      if (group) {
        out += `^{${group.inner}}`;
        i = group.end;
        continue;
      }
      // Unbalanced — degrade: emit the caret verbatim, continue past it.
      out += "^";
      i += 1;
      continue;
    }
    // Gather the exponent run.
    let j = i + 1;
    let run = "";
    while (j < token.length && !EXPONENT_TERMINATOR.test(token[j])) {
      run += token[j];
      j += 1;
    }
    if (run === "") {
      out += "^"; // e.g. "a^^" — degrade gracefully
      i += 1;
      continue;
    }
    out += `^{${run}}`;
    i = j;
  }
  return out;
}

/**
 * ASCII subscript rule (mr-kahn #1): `_x` (underscore + single alphanumeric) →
 * `_{x}` (covers a_n, a_1, a_6 in sequence nodes). An underscore already followed
 * by `{` passes through; an underscore not followed by a single alnum is emitted
 * verbatim. Math segments only (this runs inside convertToken).
 */
function convertAsciiSubscripts(token: string): string {
  let out = "";
  let i = 0;
  while (i < token.length) {
    const ch = token[i];
    if (ch !== "_") {
      out += ch;
      i += 1;
      continue;
    }
    const next = token[i + 1];
    if (next === "{") {
      out += "_"; // already grouped
      i += 1;
      continue;
    }
    if (next !== undefined && /[A-Za-z0-9]/u.test(next)) {
      out += `_{${next}}`;
      i += 2;
      continue;
    }
    out += "_"; // bare underscore — leave it
    i += 1;
  }
  return out;
}

/**
 * Collapse runs of unicode superscript / subscript glyphs into `^{...}` / `_{...}`,
 * translating each glyph to its base character. Mixed adjacent runs are grouped
 * separately (a superscript run, then a subscript run).
 */
function convertUnicodeScripts(token: string): string {
  let out = "";
  let i = 0;
  while (i < token.length) {
    const ch = token[i];
    if (ch in SUPERSCRIPT_MAP) {
      let run = "";
      while (i < token.length && token[i] in SUPERSCRIPT_MAP) {
        run += SUPERSCRIPT_MAP[token[i]];
        i += 1;
      }
      out += `^{${run}}`;
      continue;
    }
    if (ch in SUBSCRIPT_MAP) {
      let run = "";
      while (i < token.length && token[i] in SUBSCRIPT_MAP) {
        run += SUBSCRIPT_MAP[token[i]];
        i += 1;
      }
      out += `_{${run}}`;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * Read a balanced parenthesised group starting at `open` (which must index a
 * `(`). Returns the inner content (parens stripped at the outermost level) and
 * the index just past the closing paren, or null if unbalanced.
 */
function readParenGroup(
  s: string,
  open: number,
): { inner: string; end: number } | null {
  if (s[open] !== "(") return null;
  let depth = 0;
  let inner = "";
  for (let j = open; j < s.length; j += 1) {
    const c = s[j];
    if (c === "(") {
      depth += 1;
      if (depth === 1) continue; // skip the outermost opening paren
    } else if (c === ")") {
      depth -= 1;
      if (depth === 0) return { inner, end: j + 1 };
    }
    inner += c;
  }
  return null;
}

/**
 * Convert √ radicals (mr-kahn #6 conservative grouping):
 *   √(...) → \sqrt{...}  (balance the paren run; unbalanced → degrade verbatim)
 *   √x     → \sqrt{x}    (binds to exactly ONE following token up to next op/space)
 */
function convertRadicals(token: string): string {
  let out = "";
  let i = 0;
  while (i < token.length) {
    const ch = token[i];
    if (ch !== "√") {
      out += ch;
      i += 1;
      continue;
    }
    const next = token[i + 1];
    if (next === undefined) {
      out += "√"; // dangling √ — leave it
      i += 1;
      continue;
    }
    if (next === "(") {
      const group = readParenGroup(token, i + 1);
      if (group) {
        out += `\\sqrt{${group.inner}}`;
        i = group.end;
        continue;
      }
      // Unbalanced — degrade: emit the √ verbatim and continue past it.
      out += "√";
      i += 1;
      continue;
    }
    // Single-token radicand: gather up to the next operator / space.
    let j = i + 1;
    let run = "";
    while (j < token.length && !EXPONENT_TERMINATOR.test(token[j])) {
      run += token[j];
      j += 1;
    }
    if (run === "") {
      out += "√";
      i += 1;
      continue;
    }
    out += `\\sqrt{${run}}`;
    i = j;
  }
  return out;
}

/** Apply the single-char symbol substitutions. */
function convertSymbols(token: string): string {
  let out = token;
  for (const [from, to] of SYMBOL_MAP) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

// --- Fractions (mr-kahn ruling) ----------------------------------------------
// A whole token is a recognised ratio when it is exactly NUMERATOR `/` DENOMINATOR,
// where each side is EITHER a balanced (expr) group OR a simple token
// (alnum/±/./− run, no `/`, no space, no paren). Recognised → \tfrac (inline) or
// \dfrac (displayStyle). Anything else with a `/` is left LITERAL (conservative
// fallback — e.g. a/b/c, dates, units).
//   token/token        → \tfrac{a}{b}
//   (expr)/(expr)      → \tfrac{a}{b}
//   (expr)/token       → \tfrac{a}{b}
//   token/(expr)       → \tfrac{a}{b}

/** A simple ratio operand: alnum / decimal / ±, plus unicode minus. No slash, paren, or space. */
const SIMPLE_OPERAND = /[A-Za-z0-9.±−+]/u;

/**
 * Read one ratio operand starting at `start`: a balanced (expr) group, or a
 * simple-operand run. Returns the raw operand text and the index just past it,
 * or null if neither shape is present.
 */
function readOperand(
  token: string,
  start: number,
): { text: string; end: number } | null {
  if (token[start] === "(") {
    const g = readParenGroup(token, start);
    return g ? { text: g.inner, end: g.end } : null;
  }
  let j = start;
  let run = "";
  while (j < token.length && SIMPLE_OPERAND.test(token[j])) {
    run += token[j];
    j += 1;
  }
  return run === "" ? null : { text: run, end: j };
}

/**
 * Convert a recognised fraction shape on the WHOLE token. The numerator and
 * denominator are recursively run through convertToken. Returns null when the
 * token is not exactly operand `/` operand (caller leaves it literal).
 */
function convertFraction(token: string, fracCmd: string): string | null {
  const num = readOperand(token, 0);
  if (!num) return null;
  if (token[num.end] !== "/") return null;
  const den = readOperand(token, num.end + 1);
  if (!den) return null;
  if (den.end !== token.length) return null; // must be the WHOLE token
  return `\\${fracCmd}{${convertToken(num.text)}}{${convertToken(den.text)}}`;
}

/** Convert a single math-shaped token. Pipeline order is significant. */
function convertToken(token: string): string {
  // 1. Radicals first (they consume paren/run groups before symbol rewrites).
  let t = convertRadicals(token);
  // 2. Caret exponents (group runs/paren-groups before unicode scripts run).
  t = convertCarets(t);
  // 3. ASCII subscripts `_x` → `_{x}`.
  t = convertAsciiSubscripts(t);
  // 4. Unicode super/subscripts → ^{...}/_{...}.
  t = convertUnicodeScripts(t);
  // 5. Single-char symbols (−, ·, ×, ±, π, ≤, ≥, ≠, ≈).
  t = convertSymbols(t);
  return t;
}

export interface ToLatexOptions {
  /**
   * Display mode: standalone worked-example steps request \dfrac (and KaTeX
   * display sizing at the MathText layer). Running prose stays inline \tfrac.
   * Default false (inline).
   */
  displayStyle?: boolean;
}

/**
 * Convert plain-text math notation to a minimal KaTeX-safe LaTeX string.
 *
 * TOTAL: never throws. Prose runs (and any run carrying a ≥4-letter word, an
 * ASCII `*`, or sitting under a literal-input instruction) pass through
 * byte-for-byte; only math-shaped runs are converted. Whitespace between runs is
 * preserved exactly.
 */
export function toLatex(s: string, options: ToLatexOptions = {}): string {
  try {
    if (s === "") return "";
    // HARD EXCLUSION: a literal-input instruction string is never mathified, so
    // the raw checkAnswer target survives verbatim for the student to copy.
    if (LITERAL_INSTRUCTION.test(s)) return s;

    const fracCmd = options.displayStyle ? "dfrac" : "tfrac";
    // Split on whitespace while KEEPING the whitespace separators so prose
    // spacing is preserved byte-for-byte.
    const parts = s.split(/(\s+)/u);
    let out = "";
    for (const part of parts) {
      if (part === "" || /^\s+$/u.test(part)) {
        out += part; // whitespace separator — untouched
        continue;
      }
      if (!isMathToken(part)) {
        out += part; // prose / raw-input token — verbatim
        continue;
      }
      // Try a recognised fraction shape first (whole-token), else token rewrite.
      const frac = part.includes("/") ? convertFraction(part, fracCmd) : null;
      out += frac ?? convertToken(part);
    }
    return out;
  } catch {
    // TOTAL contract: any unforeseen failure degrades to the raw input.
    return s;
  }
}
