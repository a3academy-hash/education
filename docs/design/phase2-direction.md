# Phase 2 Design Direction (pee-wee, binding) — 2026-06-10

North star: docs/reference/algebra1-platform.jsx (Matt-approved). This document is
pee-wee's binding direction for the design system, math primitives, onboarding,
and app shell. Deviations from the reference are listed in §F with reasons.
mr-gates structural conditions are recorded at the bottom.

## A. TOKENS — app/globals.css `@theme` (Tailwind 4); fonts via next/font/google in app/layout.tsx

```css
@theme {
  /* surfaces */
  --color-canvas:        #fbfbfc;   /* page background */
  --color-surface:       #ffffff;   /* cards, header */
  --color-inset:         #f7f8fa;   /* inset panels, worked-example strip */
  --color-hover:         #f3f5f8;
  --color-selected:      #f0f2f6;   /* active nav, row dividers, gridlines */
  --color-track:         #eef0f4;   /* progress track, soft borders */
  --color-chip:          #eef1f6;   /* step-number circles, x-tiles */

  /* ink ramp */
  --color-ink:           #16202e;
  --color-ink-800:       #2a3340;
  --color-ink-700:       #3a4250;
  --color-ink-500:       #5b6573;   /* muted/informational small text — AA-safe */
  --color-ink-400:       #8a93a3;   /* DECORATIVE ONLY */
  --color-ink-300:       #aab1bd;

  /* borders */
  --color-border:        #e7e9ee;
  --color-border-strong: #d7dbe2;
  --color-axis:          #c2c8d2;
  --color-axis-soft:     #cdd2db;

  /* THE accent (one, restrained) */
  --color-accent:        #2a4878;   /* slate navy */
  --color-accent-hover:  #1f3860;
  --color-accent-tint:   #f4f6fa;
  /* focus ring: rgba(42,72,120,.12) 3px box-shadow (inputs) or 2px outline (chrome) */

  /* mastery statuses (exact MasteryStatus union keys) */
  --color-status-unknown:          #9aa3b0;
  --color-status-introduced:       #6b7280;
  --color-status-developing:       #b07d00;
  --color-status-near-mastery:     #2b6cb0;
  --color-status-mastered:         #2f7d5b;   /* doubles as success */
  --color-status-needs-review:     #9a5b3f;
  --color-status-prerequisite-gap: #b4543f;   /* doubles as error */

  /* tint pairs (only two; other statuses are dot + label, no fills) */
  --color-success-bg:    #eef6f1;  --color-success-border: #d4e8db;
  --color-error-bg:      #fbf0ec;  --color-error-border:   #f0d9d1;
  --color-error-bg-soft: #fdf7f5;  --color-error-ink:      #7a4030;
}
```

Radii: --radius-sm 7 (chips), --radius-md 10 (buttons/inputs/inset), --radius-lg 14 (cards), full 999.
Borders 1px always (2px only focus + live plane line).
Shadows: --shadow-card `0 1px 2px rgba(16,24,40,.04)`; --shadow-raised `0 4px 12px rgba(16,24,40,.08)` (popovers only).
Spacing: 4-base — 4,8,12,16,20,24,28,36,48,80. Card pad 24 (compact 18, dense rows 14×18); card grid gap 20; stat grids 14.
Motion: --ease-calm `cubic-bezier(.2,.7,.2,1)` ONLY. --duration-fast 150ms (hover/select), --duration-base 250ms (reveals/fades), --duration-slow 400ms (entrance/progress). HARD CEILING 400ms. Utilities: `fade-in` (opacity 0→1 + translateY 6px→0, 400ms), `stagger` 60ms increments max 4 children. `prefers-reduced-motion: reduce` → all durations 0.01ms, no translateY.

Type — Fraunces (display, 500/600), Hanken Grotesk (UI, 400–700), Spline Sans Mono (math — math is ALWAYS mono):

| token | size/line | weight/family | use |
|---|---|---|---|
| display-xl | 30/1.2, ls −0.3px | 600 Fraunces | page H1 |
| display-lg | 24/1.25 | 600 Fraunces | card H2 |
| display-md | 20/1.45 | 500 Fraunces | problem prompt |
| display-sm | 18/1.4 | 600 Fraunces | panel titles |
| body-lg | 15/1.6 | 400 HG | lede |
| body | 14/1.55 | 400/500 HG | default |
| body-sm | 13/1.5 | 400/500 HG | dense rows |
| label | 12/1.3, +0.4px, UPPERCASE | 600 HG | eyebrows (ink-500) |
| micro | 11/1.3 | 400 mono | axis ticks, coordinates |

## B. UI PRIMITIVES — /components/ui

Focus everywhere: `:focus-visible` 2px accent outline offset 2 (chrome) or accent border + 3px rgba(42,72,120,.12) ring (inputs). Never remove outlines without replacement.

- **Card**: surface bg, 1px border, radius 14, shadow-card. Padding default 24 / compact 18 / flush 0. Tones: default, error (error-bg-soft + error-border), success. No hover lift on static cards; button-cards get border-color transition 150ms only. No nested cards.
- **Button**: `primary` accent bg/white 14/600 pad 11×22 radius 10, hover accent-hover 150ms, active translateY(1px), disabled bg #c9cfd8 (no opacity trick), loading = 14px inline spinner (1.5px stroke, 600ms rotation — spinners exempt from ceiling) + disabled + label stays. `secondary` white/1px border-strong/ink 13.5–14/500. `quiet` transparent ink-500 pad 4×8 hover bg-hover. Sizes md (~40px) / sm (8×14, 13/500). ONE primary per screen. No icon-only primaries, no full-width on desktop, no uppercase labels.
- **Input**: 1px border-strong, radius 10, pad 13×15. Modes: `math` (16px mono) / `text` (15px sans). Error: prerequisite-gap-color border + 12% ring + 13px message below + aria-describedby. Disabled: inset bg, ink-400 text. Visible labels 13/500 ink-700 above; placeholder never a label; autoFocus primary input; Enter submits form.
- **Progress**: track color-track radius full; fill accent (or status color). Heights 4/6/8. Width transition 400ms ease-calm. role=progressbar + aria-valuenow/min/max. No in-bar text (numbers adjacent, mono).
- **StatusPill**: 7px status dot + 12.5/500 ink-700 label (small 11px). All 7 statuses mapped `Record<MasteryStatus, …>` with `satisfies` (build break on 8th status). Dot never sole signal.
- **Table**: header = label style + 1px border bottom; rows 14/500 ink + 12.5 ink-500 secondary, dividers 1px color-selected, pad 11×0 dense / 16×18 default; numerals right-aligned mono. No zebra, hover only on link-rows.
- **PageHeader**: eyebrow (label, ink-500) + display-xl + optional 15/1.55 ink-500 subhead max 560px. mb-28.
- **Panels**: `InsetPanel` (inset bg, 1px track border, radius 10, pad 12×14, optional micro-label — the "WHY THIS, NOW" pattern), `AlertPanel` (error-bg-soft/error-border, 8px dot, 13.5 error-ink, role=status), `LabeledSection` (micro-label + content).

## C. MATH PRIMITIVES — /components/learning (all "use client", SVG, props = pure data + callbacks; NO engine/repository imports)

Shared: dragging tracks pointer 1:1 (exempt from durations; programmatic transitions 250ms); pointer + keyboard parity; visible SVG focus ring on handles; `aria-live="polite"` hidden region announces value changes; reduced-motion = instant transitions; invalid props → render frame, suppress bad element, console.warn in dev (never blank box); math labels mono.

- **CoordinatePlane** (crib reference anatomy: grid 1px color-selected, axes 1.5px color-axis, ticks 11 mono, line 2.5px accent round-cap, point labels mono +8/−8): draggable points — 6px filled circle (ink; accent = active) in 12px hit radius, 11px accent 25% halo on hover/focus/drag, snap prop (default 1, allow 0.5), cursor grab/grabbing. Live equation readout in fixed-height mono strip below (`m = 2 · y = 2x − 2`). Optional dashed rise/run elbow (1px color-axis, Δy/Δx labels). Keyboard: Tab cycles handles, arrows ±1 snap, Shift ±5. Sport surface = axis labels + data semantics ONLY (P1 "games"/"total hits" → P3 pure x/y); no field silhouettes/ball imagery. 320×320 default, 420 max. Empty: grid + caption "Click the plane to place a point."
- **NumberLine** (crib: line/ticks 1.5px axis-soft, 11 mono ticks at ink-500, marker 6px accent + halo): drag marker (snaps to ticks), click tick to move. Optional operation arc (1.5px accent 60%, mono label e.g. "+7") re-drawing as marker moves. Keyboard ←/→ ±1, Shift ±5. Sport: one 13px caption below in P1, gone by P3.
- **BalanceScale** (new; flat geometric, zero skeuomorphism): beam 2px ink-700, outlined fulcrum triangle, pans 1px border-strong radius 10 inset bg. Tiles 28px radius 7 — x-tiles chip bg + accent mono "x", unit tiles inset bg + ink mono "1". Solve via both-sides action row beneath (secondary buttons generated from equation state: "− 4 from both sides"). Apply → tiles fade 250ms, fixed-height mono equation readout above updates. Free-tile mode: one-side removal tilts beam 4° toward heavy side 250ms + one line: "The sides aren't equal anymore. Whatever you do to one side, do to the other." (information, not punishment; resets when corrected). Keyboard: action buttons Tab+Enter; free tiles focusable group, Enter removes. Sport in prompt framing only.
- **StepReveal** (crib worked-example anatomy: problem in mono inset strip; steps with 22px chip circles + accent 12/600 numeral + 14/1.5 ink-800 text; success-tinted result chip): steps hidden; secondary button "Show next step" reveals one (fade 250ms + 4px rise; instant reduced-motion); label → "Show result" before final; then result chip + caller's continue action. Focus stays on the button; Enter advances. `blankStepIndex` prop = completion mode: that step renders as inline math Input gating the next reveal (worked-example fade mechanism).
- **DataTable** (on Table): specified cells = math Inputs (mono, borderless till focus, inset bg). Enter checks: correct → confirmed value + 6px success dot fade; wrong → error border + caller's one-line hint below; second miss → reveal value in ink-500 + needs-review dot, move on (informs, never blocks). Tab/Enter through fillable cells. Sport = column headers only (P1 "Game"/"Total hits" → P3 "x"/"y"). Empty: headers + "Make your first prediction."

## D. ONBOARDING — /app/student/onboarding (3 screens, centered col max 620, step indicator "STEP n OF 3" + Progress h4, one primary per screen, fade-in only; register = "a serious school setting up your course"; NO exclamation points, no "fun/awesome/journey/adventure", no AI mention)

1. **Identity** — eyebrow `WELCOME TO A3 ACADEMY`; H1 `Let's set up your course.`; body `Two quick questions. They shape how Algebra 1 is taught to you — nothing here is graded.`; First name (text Input, autoFocus, helper `First name only — that's all we need.`, validate non-empty ≤30, error `Enter your first name to continue.`); Grade segmented 6/7/8 (radiogroup, arrows move, selected = accent border + ring); CTA `Continue` (disabled till valid).
2. **Sport** — eyebrow `PERSONALIZATION`; H1 `Pick the examples you want to learn through.`; body `Algebra shows up in box scores, pace charts, and season projections. Choose a sport and your early lessons use its numbers. The math is identical either way — and the examples shift to standard notation as you advance.`; 7 cards 4-col grid (4+3) gap 14: mark = single-color 1.5px-stroke top-down field/court/diamond line drawing, ink-700, 40px tall (no illustration/mascots/team colors); name 15/600; descriptor 12.5 ink-500:
   Baseball `Box scores, spray charts, season pace.` · Softball `Hit rates, run differentials, projections.` · Basketball `Shooting splits, pace, point totals.` · Soccer `Pass maps, goal differential, table math.` · Football `Yardage, drive rates, score projections.` · Volleyball `Set scores, hitting percentage, rotations.` · Straight math `Clean, classic problems from the start.` (equal peer weight). Hover border color-axis 150ms; selected = accent border + ring + 6px accent dot top-right; radiogroup semantics. CTA `Continue`; quiet `← Back`.
3. **Confirmation** — eyebrow `YOU'RE SET`; H1 `Here's your setup, {name}.`; compact table rows Name/Grade/Examples each with quiet `Change`; body `Next, a short diagnostic finds your exact starting point — what you already know, and the one place to begin. It takes about ten minutes, and nothing is graded.`; CTA `Go to your learning home` → server action persists StudentProfile → /student.

## E. APP SHELL

Header 60px white sticky, 1px bottom border: left 28px accent square (radius 7, Fraunces "A") + "Algebra 1" 16.5 Fraunces 600 over "A3 ACADEMY · ADAPTIVE" 11 tracked ink-500; right nav buttons 13.5/500 radius 7 (active selected-bg + ink; inactive ink-500; hover bg-hover), 1px divider, first name 13.5/500 ink-700 + 30px initials avatar (track bg, 12.5/600 ink-500). Phase 2 nav: Learning Home only. Container max 1140, 28px gutters, main pad 36 top / 80 bottom. Column patterns: hero 1.55fr/1fr gap 20; pairs 1fr/1fr; lesson 1.5fr/1fr; stats repeat(4,1fr) gap 14. <1024px stack — no mobile-app patterns. No mastery in the chrome. Body bg = canvas.

## F. MANDATORY DEVIATIONS FROM REFERENCE

1. Google Fonts @import → next/font/google self-host (COPPA/no third-party requests).
2. Motion clamped to ≤400ms ease-calm (reference had 450/500/600).
3. Graph Inspector OUT of student nav (dev-only route).
4. #8a93a3 demoted to decorative-only; informational small text uses ink-500 (AA).
5. Raw unicode glyphs (✓ × ⚠ ○) → 14px inline SVG strokes (1.5px, currentColor, aria-hidden) + adjacent text.
6. Reference NumberLine/CoordinatePlane are render-only cribs — Phase 2 versions implement full §C interaction.
7. No ampersands in student copy ("and").
8. BalanceScale built LAST (interaction patterns established by plane/line first).

## mr-gates structural conditions (Phase 2)

1. Repository singleton in a server-only module (lib/repository/server.ts), NOT re-exported from the barrel; header comment "server-only — never import from client components". (Client-bundle leak guard: graph JSON must never ship to browser.)
2. Dev-singleton on globalThis (typed, keyed) so in-memory data survives HMR; keep honest-ephemerality doc comment.
3. Identity carry: server action sets httpOnly cookie with opaque student id only (no PII); Phase 3 home reads it.
4. Route group: app/student/(shell)/layout.tsx carries AppShell; onboarding/ sits OUTSIDE the group (no nullable-student shell).
5. Server action validates sport against Sport union + grade range server-side; supplies campusId: null and parentalConsent {status:"pending", updatedAt:null} itself.
6. StatusPill mapping = Record<MasteryStatus,…> satisfies (exhaustive).
7. /dev/gallery and /dev/graph return notFound() when NODE_ENV === "production".
8. Math helpers co-located with components (components/learning/*-math.ts), NOT in /lib (kahn-gate boundary stays crisp); vitest tests on the pure helpers.
9. No @testing-library (new-dep checkpoint deferred to Phase 3 trigger).
