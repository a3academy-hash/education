# M1 dossier — evidence

## components/ui/MathText.tsx — the html-only render
- `tryRender(raw, displayStyle)`:
  - `const latex = toLatex(raw, { displayStyle });` (MathText.tsx:49)
  - `const html = katex.renderToString(latex, { throwOnError:false, displayMode:false,
    output:"html" });` (MathText.tsx:50-55) ← `output:"html"` = NO MathML emitted.
  - degrade probe: `if (html.includes(KATEX_ERROR_CLASS)) return null;` (MathText.tsx:58),
    `KATEX_ERROR_CLASS = "katex-error"` (MathText.tsx:44).
- Render: math runs via `dangerouslySetInnerHTML` (MathText.tsx:97-103); prose runs as plain
  `<Fragment>{seg.text}</Fragment>` (MathText.tsx:85, accessible); degrade as raw text in a span
  (MathText.tsx:90-94, accessible).
- Header note (MathText.tsx:11): "CSS loaded once in app/layout.tsx" → katex.css present, which
  includes the `.katex-mathml` clip rules that hide MathML visually while keeping it for AT.

## KaTeX behavior (the fix rationale)
- `output:"html"`: emits `.katex-html` (marked aria-hidden by KaTeX) and NO `.katex-mathml`. Net:
  math run invisible to AT.
- `output:"htmlAndMathml"`: emits BOTH `.katex-html` (aria-hidden, identical visuals) AND
  `.katex-mathml` containing `<math>…</math>` (the AT-readable representation). katex.css clips
  `.katex-mathml` so there is no visual change.
- The `katex-error` class still appears on error in htmlAndMathml mode → the degrade probe at
  MathText.tsx:58 keeps working unchanged.

## Consumers of MathText (blast radius = visual-identical, AT-improved)
- Used across Learn / Practice / diagnostic / summary feedback to render prompts, hints, "why",
  worked examples, and live echo. All are display-only; none parse KaTeX output. The change adds
  hidden MathML to each typeset run; no consumer reads the output HTML shape, so none break.

## Ruled out
- aria-label / visually-hidden text: rejected — no math-to-speech available; raw authored text
  reads worse than MathML. MathML offloads speech to the AT (the correct, standard approach).
- Switching to `output:"mathml"` only: would drop the polished visual layer. Need BOTH → htmlAndMathml.
