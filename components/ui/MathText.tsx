// components/ui/MathText.tsx — inline math renderer (Phase 8 / C).
//
// ARCHITECTURE (mr-gates / pee-wee): SEGMENT-THEN-RENDER. The authored string is
// split (pure segmentMath) into alternating PROSE and MATH runs. PROSE runs render
// as PLAIN React text in the host font (size/weight/color inherited, spaces intact).
// Only MATH runs — genuine notation like 2³, √(b²−4ac), x²+3x, 3/4 — are typeset via
// katex.renderToString(toLatex(run)). This fixes the render bug where a whole word
// problem was passed to KaTeX as one expression: words italicised, spaces collapsed,
// the card overflowing. A whole sentence is NEVER wrapped in a single KaTeX render.
//
// katex is imported ONLY here (code-splitting; CSS loaded once in app/layout.tsx).
// The plain-text → LaTeX step is the pure, total toLatex() in lib/math-notation.
// This component performs NO grading and holds NO state — it is display-only.
//
// KaTeX output is "htmlAndMathml" (not "html"): alongside the visual .katex-html
// span (aria-hidden) KaTeX emits a .katex-mathml <math> node that assistive tech
// reads aloud (a11y). katex.css already clips .katex-mathml, so ZERO visual change.
//
// DEGRADE (pee-wee, NON-NEGOTIABLE): if KaTeX throws OR returns its error markup
// for a math run, that run renders as its RAW ORIGINAL text in the host font
// (inherit), ink-colored. NEVER a red error, NEVER KaTeX error text, NEVER visible
// $/\( delimiters. throwOnError:false is belt; the error-class probe is suspenders.
//
// SIZE/COLOR INHERIT (pee-wee): the host span and each rendered math run force
// font-size: inherit and color: inherit so math matches the surrounding prose.
// Inline, baseline-aligned (displayMode:false).

import { Fragment } from "react";
import katex from "katex";
import { toLatex } from "../../lib/math-notation/to-latex";
import { segmentMath } from "../../lib/math-notation/segment";

export interface MathTextProps {
  /** The authored plain-text math/prose. Segmented, then rendered. */
  children: string;
  /** Optional extra classes on the host span. */
  className?: string;
  /**
   * Display-style math (standalone worked-example equations): requests \dfrac
   * and tall radicals from toLatex. Presentation-only; STILL inline-rendered
   * (displayMode stays false so it sits in flow without forced centering).
   * Default false (inline \tfrac).
   */
  displayStyle?: boolean;
}

/** KaTeX leaves this class on its output when throwOnError:false swallows an error. */
const KATEX_ERROR_CLASS = "katex-error";

/**
 * KaTeX output mode. "htmlAndMathml" emits the visual .katex-html span AND a
 * .katex-mathml <math> node for assistive tech (a11y). katex.css visually clips
 * the MathML, so there is ZERO visual change versus the old "html"-only mode.
 */
export const KATEX_OUTPUT_MODE = "htmlAndMathml" as const;

/** Attempt a render of ONE math run; return KaTeX HTML, or null to degrade to plain. */
export function renderMathRun(raw: string, displayStyle: boolean): string | null {
  try {
    const latex = toLatex(raw, { displayStyle });
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      // Keep output strictly inline; do not let KaTeX color/scale globally.
      output: KATEX_OUTPUT_MODE,
    });
    // Suspenders: if throwOnError:false produced error markup, degrade instead
    // of surfacing red/parse text to a student.
    if (html.includes(KATEX_ERROR_CLASS)) return null;
    return html;
  } catch {
    return null;
  }
}

/**
 * Render authored text as readable prose with only genuine notation typeset.
 * Prose runs are plain inherited-font text; each math run is rendered via KaTeX
 * and degrades to its raw text on any failure — never a red KaTeX error.
 */
export function MathText({
  children,
  className = "",
  displayStyle = false,
}: MathTextProps) {
  const segments = segmentMath(children);

  return (
    <span
      className={`a3-mathtext ${className}`.trim()}
      style={{ fontSize: "inherit", color: "inherit" }}
    >
      {segments.map((seg, i) => {
        if (!seg.math) {
          // PROSE: plain host-font text, spaces and weight intact, no KaTeX.
          return <Fragment key={i}>{seg.text}</Fragment>;
        }
        const html = renderMathRun(seg.text, displayStyle);
        if (html === null) {
          // DEGRADE: raw run text, host font + ink color, no delimiters, no red.
          return (
            <span key={i} style={{ fontSize: "inherit", color: "inherit" }}>
              {seg.text}
            </span>
          );
        }
        // Force inherit so rendered math matches surrounding text size and color.
        return (
          <span
            key={i}
            style={{ fontSize: "inherit", color: "inherit" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}
