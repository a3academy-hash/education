# M1 — Math notation has no accessibility text — Fix Spec

## Problem (observed live via the a11y tree)
KaTeX-rendered notation (2³, 5³, x², √…) renders visually but is ABSENT from the accessibility
tree across Learn, Practice, and the diagnostic. A screen reader hears broken sentences:
"What  Really Means", "Evaluate ", "Why it works:  means 2·2·2". WCAG failure (math content is
not perceivable to AT users).

## Root cause (verified)
`components/ui/MathText.tsx` renders each MATH run with `katex.renderToString(latex, { ...,
output: "html" })` (MathText.tsx:50-55). In `output: "html"` mode KaTeX emits ONLY the visual
`.katex-html` span, which it marks `aria-hidden="true"`, and NO MathML. With no MathML companion,
the math run is fully hidden from assistive tech → the gaps in the a11y tree. PROSE runs render as
plain text (already accessible); the DEGRADE path renders raw text (already accessible). So the gap
is exactly the successfully-typeset math runs.

## Design (best solution — standard KaTeX a11y, no new dependency)
Change the KaTeX output mode from `"html"` to `"htmlAndMathml"` in `tryRender` (MathText.tsx:54).
KaTeX then emits, per math run:
- the visual `.katex-html` span (aria-hidden, unchanged appearance), AND
- a `.katex-mathml` span containing a `<math>` MathML representation that assistive tech reads
  (e.g. `x²` → "x squared"). katex.css (already loaded once in app/layout.tsx) visually clips
  `.katex-mathml` so there is ZERO visual change.
This is KaTeX's documented accessibility path; MathML is the readable alternative (the AT does the
math-to-speech, which a hand-rolled aria-label cannot do well). No new dependency, no extra fetch,
no API/route/engine/RLS change.

### Why not the alternatives
- aria-label with a text version of the expression: we have no math-to-speech; the raw authored
  string ("2^3", "5*5*5") would read worse ("two caret three"). MathML is strictly better.
- A separate visually-hidden text node: same problem (no good text form) and duplicates content.

## Scope / invariants
- ONLY the `output` option changes (one argument). The visual rendering, the degrade probe
  (`html.includes("katex-error")` still fires on error — the error class still appears in
  htmlAndMathml output), inheritance of size/color, inline rendering (displayMode:false), and the
  prose/degrade paths are all unchanged.
- No graph/engine/evidence/RLS/SQL change. No new dependency. CSS already loaded.
- Bundle: htmlAndMathml adds a small MathML string per rendered run to the HTML output; negligible,
  no new JS.

## Tests
- A pure assertion at the render boundary: a small test that calls
  `katex.renderToString(toLatex("x^2"), { throwOnError:false, displayMode:false,
  output:"htmlAndMathml" })` and asserts the output contains `"katex-mathml"` and `"<math"` (proves
  the accessible node is emitted) — OR, preferably, refactor so the output mode is testable without
  duplicating the call. The repo has NO jsdom/RTL, so a full component render test is out of scope;
  the authoritative verification is the live a11y-tree check (the method that FOUND the bug):
  re-inspect Learn/Practice math in the chrome-devtools accessibility tree and confirm the math
  content now appears (no more empty gaps). Full unit suite stays green.

## Gates
- **pee-wee:** confirm ZERO visual change (math still inherits size/color, inline, degrades the
  same) — this is an AT-only addition; the visual layer is untouched.
- **mr-gates (light):** confirm the one-option change has no bundle/dependency/CSS implication
  (katex.css already clips .katex-mathml), the degrade probe still works, and nothing else depends
  on the html-only output shape.

---

## REVISION (codexreview round 1 — BINDING; supersedes conflicting text above)
informed + cold reviewers. Implement to this section.

### R1 — Test the PRODUCTION render path (concern: test-production-path / test-does-not-test-component)
Refactor so the test exercises the real code, not a duplicated KaTeX call:
- In components/ui/MathText.tsx, export `export const KATEX_OUTPUT_MODE = "htmlAndMathml" as const;`
  and export a pure `renderMathRun(raw: string, displayStyle: boolean): string | null` = the
  CURRENT `tryRender` body (toLatex → katex.renderToString with KATEX_OUTPUT_MODE → degrade probe).
  MathText calls `renderMathRun` internally (behavior identical; just named + exported).
- Migrate lib/math-notation/segment.test.ts `renderLikeMathText` to call the exported
  `renderMathRun` (prose → seg.text; math → `renderMathRun(seg.text,false) ?? seg.text`) so it
  tests the real path. Its existing assertions (`class="katex"` present for 4², absent for prose)
  still hold under htmlAndMathml (the `<span class="katex">` wrapper persists).
- ADD an a11y assertion: `renderMathRun("x^2", false)` (or via the migrated helper) CONTAINS
  `"katex-mathml"` AND `"<math"` — proving the accessible node is emitted by production.

### R2 — Claim scope + target (concern: at-mathml-support)
The verified claim is: math is EXPOSED TO THE ACCESSIBILITY TREE via MathML (KaTeX's standard a11y
path). Target = modern Chromium (Chrome/Edge — the desktop-first product target) + current
NVDA/JAWS/VoiceOver (all support MathML). Residual risk (documented, not blocking): older AT/browser
combos have weaker MathML; if a target AT proves deficient, a future enhancement adds a
speakable-text fallback. Authoritative verification HERE = Chrome accessibility tree (the method
that found the bug); a real-AT pass is a manual QA-matrix item, not a code gate.

### R3 — Zero-visual-change is provable (concern: css-context-unproven — REBUTTED)
katex.css is a GLOBAL root import (app/layout.tsx:4). It wraps every student surface, and the
EXISTING visual KaTeX rendering already depends on it (and works on Learn/Practice/diagnostic,
verified live). The same stylesheet clips `.katex-mathml`. So MathML is hidden visually on every
surface → zero visual change. No per-surface gate needed.

### R4 — No downstream shape dependency (concern: downstream-html-shape — REBUTTED)
Audit (grep katex-html|katex-mathml|querySelector|.katex|toMatchSnapshot|childElementCount|
children.length across **/*.{ts,tsx}): the ONLY inspector of KaTeX output is segment.test.ts
(`class="katex"`), which still passes under htmlAndMathml and is migrated to the production helper
in R1. No production consumer (component/sanitizer/parser/hydration) reads the output shape; no
snapshot tests exist.
