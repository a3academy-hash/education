# Dossier — Phase 5 Visual System plan review

Evidence gathered while planning. Repo: a3_education, branch overhaul/v0.2. Next.js App Router +
Tailwind 4 (@theme) + TypeScript. Phases 0-4 complete (engine v2, item bank, interactivity). 774 tests green.

## Current visual state (verbatim excerpts)

`app/globals.css` — light-only `@theme`; no dark canvas, no on-dark fills, no highlighters, no surface-test:
- L20-22: `--color-ink:#16202e; ... --color-ink-500:#5b6573;`
- L33: `--color-accent:#2a4878;` (used by `:focus-visible` outline L92 — fails on a dark canvas, ~2.1:1)
- L41-44 status hues NOT matching spec: `status-developing:#b07d00`, `status-near-mastery:#2b6cb0`, `status-mastered:#2f7d5b`
- L46-52 light-only tint pairs: `success-bg:#eef6f1; error-bg:#fbf0ec; error-ink:#7a4030` (no on-dark variant)

`app/layout.tsx` L3-28: Fraunces (display) / Hanken_Grotesk (body) / Spline_Sans_Mono — variable names
`--font-display-src` / `--font-sans-src` / `--font-mono-src`, mapped in globals.css L71-73. Self-hosted via next/font (COPPA).

`components/layout/`: 3 parallel server shells (AppShell/StaffShell/ParentShell) each importing the client
`NavLink`. AppShell `<main>` = `mx-auto max-w-[1140px] px-7 pb-20 pt-9`. No mode indicator, no ring strip.

`components/gamification/ProgressRing.tsx`: one generic donut, ARIA `role=img`, butt-cap at value 0, 400ms
sweep, reduced-motion neutralized globally. No 3-ring/gold-cap/pattern/icon.

`app/student/(shell)/momentum/page.tsx`: renders THREE `ProgressRing`s for course-mastery / daily-XP /
current-skill-% — a DIFFERENT trio than the spec's §3 Focus/Mastery/Retrieval return-behavior rings.

`app/student/(shell)/practice/[skillId]/PracticeFlow.tsx`: client; renders `<Momentum streak=...>` 5-dot
streak counter; feedback uses light tint pairs `error-ink #7a4030`, `success-bg`, `error-bg-soft`.

`app/student/(shell)/learn/[skillId]/LearnClient.tsx`: client spine for the lesson (the dark-canvas target).

## Verified facts
- Tailwind 4 emits `.bg-surface{background-color:var(--color-surface)}` (live var ref). An UNLAYERED
  `[data-surface="focus"]{--color-surface:...}` block beats the `@layer theme` `:root` decl → utilities
  re-resolve inside the subtree. Confirmed by compiling a repro through this repo's @tailwindcss/postcss v4.3.
- No `.ts/.tsx` hardcodes the old status hexes; all 30 consumers use `var(--color-status-*)`.
- WCAG ratios computed (sRGB): `#E5486D` on white = 3.83 (FAIL 4.5 normal text); `#168A4A` on white = 4.40
  (FAIL marginal); `#D97706` on white = 3.19 (UI-only); `border-meaningful #9AA8BA` on white = 2.42 (FAIL 3:1);
  `canvas-border #334155` on #0B0F17 = 1.85 (FAIL 3:1); `raised #1E293B` on #0B0F17 = 1.31 (FAIL 3:1);
  `--color-accent #2a4878` on #0B0F17 = 2.10; `--color-error-ink #7a4030` on #0B0F17 = 2.38.

## Two internal gate reviews already run (pee-wee UX + mr-gates architecture), both APPROVE WITH CHANGES.
Convergent high-severity findings to corroborate or challenge: (a) test firewall must be hardcoded in CSS
under `[data-surface=test]`, not a caller prop; (b) dark Focus re-scope is INCOMPLETE — must also re-scope
accent/status/error-ink/tint-pairs or dark lessons ship invisible buttons + brown feedback text; (c) several
spec "fix" hexes still fail AA as normal text (#E5486D, #168A4A, #D97706, #9AA8BA, canvas-border) — audit
must enforce, not assume; (d) practice-as-Focus extends the spec (spec lists only lessons+videos as Focus);
(e) §8.6 Training/Boost mode omitted; (f) focus-ring on dark canvas unaudited.
