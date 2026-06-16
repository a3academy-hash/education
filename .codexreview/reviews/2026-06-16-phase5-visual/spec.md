# phase-5-plan.md — Visual System (v1, pre-review)

**Plan against:** `new_plan/STYLE_GUIDE.md` (all sections). Companion specs: CLAUDE.md §12 (rings =
return behavior only), DIAGNOSTIC.md §6/§9 (test affective UI), AUDIT D6 (~15–20% compliant).
**Phase gate (GOAL.md "Visual system"):** one instrument system + shared chrome; contrast passes
AA (resolve-by-surface); rings (Focus solid blue / Mastery green+gold-cap / Retrieval dashed amber;
hue+icon+pattern; ARIA); trust register for tests (rewards muted); sober severity-tiered adult
dashboards; baseball-native visuals; Source Serif 4 + Plex Sans + Plex Mono + KaTeX per surface.

---

## 0. Current state (from survey)

- **Tokens** (`app/globals.css`): light-only. No dark canvas, no on-dark fills, no highlighter set,
  no `surface-test`, no `border-meaningful`. Status hues do NOT match spec (developing=#b07d00 brown,
  near-mastery=#2b6cb0, mastered=#2f7d5b).
- **Fonts** (`app/layout.tsx`): Fraunces (display) / Hanken (body) / Spline Sans Mono. Spec wants
  Source Serif 4 / Plex Sans / Plex Mono.
- **Chrome**: 3 parallel shells (AppShell/StaffShell/ParentShell), no mode indicator, no ring strip.
- **Rings**: one generic `ProgressRing`. No 3-ring system, no gold-cap, no pattern/icon channels,
  no muting.
- **Surfaces**: everything light. No dark Focus canvas. Diagnostic uses #ffffff (not surface-test).
- **Baseball**: none. Generic CoordinatePlane/NumberLine/BalanceScale.
- **Untracked v1 to build on**: `lib/gamification/` (pure momentum derivations, tested),
  `components/gamification/ProgressRing.tsx`, `app/student/(shell)/momentum/page.tsx`, `VIDEO_STYLE.md`.

---

## 1. Architecture decision — RESOLVE-BY-SURFACE via token re-scoping (load-bearing)

The spec's core fix (§2) is "tokens have an on-light and on-dark value … resolve by surface." The
cleanest implementation that avoids per-component dark variants:

- Components keep using **semantic tokens** (`bg-surface`, `text-ink`, `border-border`,
  `--color-success`, `--color-focus`, …).
- A wrapper sets `data-surface="focus" | "test" | "trust"`. CSS **re-scopes the custom properties**
  inside that subtree:
  ```css
  [data-surface="focus"] {
    --color-canvas:  #0B0F17;  --color-surface: #1E293B;  --color-inset: #131B2A;
    --color-border:  #334155;  --color-border-strong: #475569;
    --color-ink: #F2F5F8; --color-ink-700:#CBD5E1; --color-ink-500:#94A3B8;
    --color-success: #2FBF71; --color-error:#FF4D8D; --color-focus:#3D7BF2;
    --color-mastery:#2FBF71; --color-retrieval:#D97706; --color-gold:#F4B528;
  }
  [data-surface="test"] { --color-canvas: #F8FAFC; --color-surface:#FFFFFF; }
  ```
- KaTeX styles by surface for free: `[data-surface="focus"] .katex { color: inherit }`.

This makes "one coherent skin" structural, not per-screen. Trust is the default (`:root`).

## 2. Tokens (`app/globals.css`) — exact additions

Add to `@theme` (light/default = on-light values, AA-verified in step 9):
- `--color-surface-test: #F8FAFC;` `--color-border-meaningful: #9AA8BA;`
- Semantic action (on-light): `--color-focus:#2563EB; --color-mastery:#168A4A;
  --color-retrieval:#D97706; --color-gold:#B45309; --color-success:#168A4A; --color-error:#E5486D;`
- Dark-canvas raw values (for the re-scope block, not @theme): canvas #0B0F17, raised #1E293B,
  border #334155; fills blue #3D7BF2 / green #2FBF71 / gold #F4B528 / retrieval #D97706.
- Highlighters: `--color-mark-chalk:#F2F5F8; --color-mark-cyan:#2DD4EF; --color-mark-lime:#B6F23A;
  --color-mark-amber:#FFC23D; --color-mark-magenta:#FF4D8D;`
- Reconcile status hues to spec on-light: `status-mastered/success → #168A4A`,
  `status-near-mastery → #2563EB`, `status-developing → #B45309`, keep needs-review #9a5b3f,
  `status-prerequisite-gap/error → #E5486D` (verify AA; fall back to darker if it fails normal-text).
- Add `[data-surface="focus"]`, `[data-surface="test"]` re-scope blocks + dark KaTeX + reward-burst
  keyframes (radial gold→transparent, ≤700ms, reduced-motion → none).

## 3. Typography (`app/layout.tsx`)

Swap imports (variable names unchanged so globals.css mapping is stable):
- `Fraunces` → `Source_Serif_4` (weights 500/600) → `--font-display-src`.
- `Spline_Sans_Mono` → `IBM_Plex_Mono` (400/500) → `--font-mono-src`.
- `Hanken_Grotesk` → `IBM_Plex_Sans` (400/500/600/700) → `--font-sans-src`. **Decision:** adopt the
  spec's lean (Plex Sans, system coherence with Plex Mono/TrackMan). A/B-flagged for humans (§11),
  reversible (one import line).

## 4. Chrome — one shared instrument (`components/layout/`)

- New `components/layout/Chrome.tsx`: the single shared header (brand lockup, role-scoped nav,
  identity slot, **persistent mode indicator**, optional **ring strip**). Props:
  `role: "student"|"staff"|"family"`, `eyebrow` (ADAPTIVE/STAFF/FAMILY), `nav`, identity slot,
  `mode?: "training"|"measurement"`, `rings?: RingTrioData`, `mutedRings?: boolean`.
- Mode indicator pill: "Training mode" (calm dot) / "Measurement mode — focus on accuracy" (sober).
- `AppShell`/`StaffShell`/`ParentShell` become thin wrappers over `Chrome` (preserve existing
  call sites + props → zero churn at usage sites). Header stays Trust (white) on every surface,
  including dark lessons (spec §1 "shared chrome … dark lessons still carry navy/white trust").
- Add restrained **baseball Trust DNA**: a 1px navy pinstripe accent under the header
  (`--color-accent` hairline) + A3 monogram square (exists).

## 5. Rings — three-channel mastery instrument (`components/gamification/`)

- Generalize into `MasteryRing.tsx` (keep `ProgressRing` as the primitive donut; `MasteryRing`
  wraps it with kind semantics). Props: `kind:"focus"|"mastery"|"retrieval"`, `value`, `size`,
  `goldCap?:boolean`, `muted?:boolean`, `label`, `sublabel`.
  - **Focus**: hue `--color-focus`, solid stroke, crosshair icon, ARIA "Focus ring N% — active".
  - **Mastery**: hue `--color-mastery`, solid, **gold terminal cap arc only when `goldCap`**
    (lock event), upward-track icon, ARIA "Mastery ring N% — transferring/mastered".
  - **Retrieval**: hue `--color-retrieval`, **dashed** stroke (strokeDasharray segments),
    circular-arrow icon, ARIA "Retrieval ring N% — reviewing".
  - Center % in **Plex Mono** (`font-mono`, tabular). Icon + label always present (color never sole
    signal). `muted` → track-gray fill, no animation, ARIA "(inactive during this test)".
- `RingTrio.tsx`: the three rings as the signature instrument (chrome strip + dashboard hero).
- Gold cap: render a short second arc (~6–8% of circumference) at fill end in `--color-gold` when
  `goldCap` (only on a locked node). Keeps gold potent (§3).

## 6. Surfaces / registers

- **Focus (dark) — lessons + practice**: new `components/layout/FocusSurface.tsx` =
  `<div data-surface="focus" className="-mx-7 -mt-9 min-h-[calc(100vh-60px)] bg-canvas px-7 pt-9 pb-20">`.
  Wrap `learn/[skillId]/LearnClient` and `practice/[skillId]/PracticeFlow` content. Highlighter
  feedback (lime correct / magenta misconception) on the dark canvas. Rationed reward (gold cap on
  node-master only).
- **Test (Trust, muted) — diagnostic**: wrap `diagnostic/DiagnosticFlow` in `data-surface="test"`
  (surface-test canvas), `mode="measurement"`, `mutedRings`. No fills/points/streaks/bursts; keep
  calm support copy (already present per DIAGNOSTIC §9).
- **Trust (default) — home/progress/summary/parent/admin/auth/onboarding**: unchanged canvas, gain
  the shared chrome + (where relevant) the ring strip.
- **Reward — learner dashboard (`/student/momentum`)**: keep light, add `RingTrio` + gold cap at
  lock + a throttled burst (≤700ms, ≥90s apart, reduced-motion → static).

## 7. Baseball-native visuals (§6) — restrained, gate-sufficient subset

- `components/learning/CoordinatePlane.tsx`: add `strikeZone?:boolean` → draw a strike-zone frame
  (zone rectangle + home-plate notch) behind the axes; axis numerics in Plex Mono. Off by default
  (zero behavior change to existing call sites).
- New `components/learning/StatPanel.tsx`: TrackMan-style Plex-Mono stat panel (label/value rows),
  dark-aware via tokens. For rate/slope readouts.
- Trust DNA: `components/ui/Pinstripe.tsx` (thin navy pinstripe divider) + subtle stitch texture on
  PageHeader eyebrow rule. Restrained.
- **Defer** (logged): full film-room video annotation overlay — videos are external Cloudflare
  Stream; `VIDEO_STYLE.md` governs production styling. Platform-side annotation is P2, not gate.

## 8. Files to create / modify

**Modify:** `app/globals.css`, `app/layout.tsx`, `components/layout/AppShell.tsx`,
`StaffShell.tsx`, `ParentShell.tsx`, `components/gamification/ProgressRing.tsx`,
`app/student/(shell)/learn/[skillId]/LearnClient.tsx`,
`app/student/(shell)/practice/[skillId]/PracticeFlow.tsx`,
`app/student/(shell)/diagnostic/DiagnosticFlow.tsx`, `app/student/(shell)/momentum/page.tsx`,
`components/learning/CoordinatePlane.tsx`.
**Create:** `components/layout/Chrome.tsx`, `components/layout/FocusSurface.tsx`,
`components/gamification/MasteryRing.tsx`, `components/gamification/RingTrio.tsx`,
`components/learning/StatPanel.tsx`, `components/ui/Pinstripe.tsx`,
`scripts/contrast-audit.mjs` (proves the AA gate).

## 9. Verification (phase gate)

- `scripts/contrast-audit.mjs`: compute WCAG ratios for every token pairing in STYLE_GUIDE §9
  (ink/muted on each canvas; action colors as text on their surface; highlighters on dark;
  meaningful borders ≥3:1; raised-on-canvas ≥3:1). **Fail the build if any required pairing < its
  threshold** (4.5 normal text, 3.0 large/UI). Output `phases/phase-5-contrast.md`.
- `npm run build` (tsc + next build) green; existing tests green (777+).
- Visual spot-check: dark lesson renders dark with white chrome; diagnostic shows muted rings +
  "Measurement mode"; momentum shows 3 rings w/ gold cap on a locked node.
- Acceptance → GOAL "Visual system" checkbox.

## 10. Deferred (logged, not gate-blocking)
- Body-font A/B (Plex Sans vs Hanken) — needs real users (§11).
- Film-room video annotation overlay (P2; external video).
- Coach/parent **proof modules** depth + intervention-severity dashboard polish → Phase 7 (reporting
  is Phase 7's domain; Phase 5 supplies the severity tokens + StatusPill semantics).
- `prefers-reduced-motion` already handled globally; burst respects it.

## 11. Acceptance criteria → GOAL checkboxes
- [ ] Contrast audit passes AA (script green) → "contrast passes AA".
- [ ] One shared chrome + mode indicator across student/staff/family → "one coherent enterprise skin".
- [ ] 3 rings hue+icon+pattern+ARIA, gold cap only at lock → "rings … per spec".
- [ ] Dark Focus lessons/practice; muted-reward Trust tests; sober dashboards → "registers per spec".
- [ ] Source Serif 4 + Plex Sans + Plex Mono + KaTeX-by-surface → "type system".
- [ ] Strike-zone grid + Plex-Mono stat panel + pinstripe DNA → "baseball-native visuals".

---

## APPENDIX — Binding spec context (STYLE_GUIDE.md, for the cold reviewer)

STYLE_GUIDE.md (v0.2) mandates, for an adaptive Algebra-1 platform for baseball athletes ~10-18 + parents/coaches:
- §1 ONE A3 instrument system across every surface; behavior (not visual language) separates three modes: Trust (site/tests/reports/dashboards — calm, rewards muted/absent), Focus (lessons/videos — immersive dark canvas #0B0F17, rationed reward), Reward (earned moments — celebratory, rare). Shared chrome + typography + ring instrument everywhere (muted in tests). Persistent mode indicator ("Training mode"/"Measurement mode — focus on accuracy"). Firewall: NO rings/points/streaks/celebration during a gated test — must be hardcoded, not intended.
- §2 Color tokens resolve by surface (on-light vs on-dark). Dark canvas #0B0F17, raised #1E293B, border #334155. On-light action: blue #2563EB, green #168A4A, gold #B45309, retrieval #D97706, error #E5486D. On-dark fills: blue #3D7BF2, green #2FBF71, gold #F4B528, retrieval #D97706. Highlighters on dark: chalk #F2F5F8, cyan #2DD4EF, lime #B6F23A, amber #FFC23D, magenta #FF4D8D. surface-test #F8FAFC. border-meaningful #9AA8BA (>=3:1).
- §3 Three rings differentiated on THREE channels (hue+icon+pattern): Focus #2563EB/#3D7BF2 solid crosshair; Mastery #168A4A/#2FBF71 solid + GOLD CAP ONLY AT LOCK, upward-track; Retrieval #D97706 DASHED circular-arrow. ARIA on every ring; color never sole signal; Plex-Mono %. Gold = EARNED only.
- §4 Type: Source Serif 4 (display, replaces Fraunces), IBM Plex Sans OR Hanken (body; leaning Plex Sans), IBM Plex Mono (numerics), KaTeX styled separately white-vs-dark.
- §5 Reward ethic: predictable progress, variable presentation, never variable outcomes; no loot-box. Strongest celebration tied to delayed-recheck pass. Cadence: correct→no celebration; node-mastered-after-delay→gold cap + burst; no burst >1/90s; reduced-motion→static.
- §6 Baseball-native visuals (the moat): strike-zone grids as coordinate plane, film-room annotation, Plex-Mono stat panels, TrackMan/launch-angle/velocity readouts; rings as performance gauges; Trust surfaces carry restrained navy pinstripe + stitch + A3 monogram.
- §7 8px grid; Trust generous air / Focus immersive; motion timings (trust 120-180ms, annotation 250-450ms, ring sweep 600-900ms, burst <=700ms, milestone <=1.2s); reduced-motion = instant + 150ms opacity, info never gated behind motion.
- §8 Per-surface: 8.3 tests = surface-test, same chrome, same progress instrument shown but INACTIVE, no rings/points/streaks/feedback/bursts. 8.5 learner dashboard = Trust + Reward energy; coach/parent = Trust + URGENCY (green on-track/amber watch/rose intervention) + always-present "what to do next" + proof modules. 8.6 reward intensity = student-switchable Training/Boost mode (default by age, not hard age-split).
- §9 Contrast audit: every pairing must pass AA; non-text UI >=3:1; ARIA on rings; keyboard + announcement for constructed-response + coordinate items; respect reduced motion.

GATE: contrast audit passes AA; one coherent skin; rings + registers per spec.
