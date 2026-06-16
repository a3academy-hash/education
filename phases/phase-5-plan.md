# phase-5-plan.md — Visual System (v2, post-review)

> **v2 supersedes v1 where they conflict.** Adversarial review (Codex informed+cold + pee-wee +
> mr-gates) and adjudication in `phase-5-review.md` / `phase-5-decisions.md`. The v1 body below is
> retained for context; the **§V2 REVISIONS** block at the end is binding.

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

# §V2 REVISIONS (binding — supersede v1 on conflict)

**R1 — Structural test firewall.** `[data-surface="test"]` CSS forces any ring fill to track color,
sets `--burst`/sweep keyframes to `none`, and neutralizes streak dots — rewards cannot leak even if a
caller forgets a prop (CLAUDE.md §13). Comment codifies §8.3: an *inactive/muted* progress instrument
is allowed; *active* rings/points/streaks/feedback/bursts are banned. `<Momentum>` streak is never
rendered under `data-surface="test"`.

**R2 — Comprehensive Focus re-scope (UNLAYERED).** The `[data-surface="focus"]` block re-scopes EVERY
semantic token a lesson descendant uses: canvas/surface/inset/hover/selected/track/chip; full ink ramp
(ink→chalk, ink-700→#CBD5E1, ink-500→#94A3B8); border/border-strong/axis→dark; accent+hover+tint→
on-dark blue; ALL `status-*`→on-dark fills; success/error bg+border+ink tint pairs→on-dark; and the
`:focus-visible` outline→`--color-focus` #3D7BF2. Kept as a PLAIN selector (NOT inside `@layer theme`)
so it beats `:root`; a comment forbids tidying it into a layer. Mechanism verified (mr-gates Tailwind v4
repro: utilities emit `var(--color-*)`).

**R3 — AA-correct token values (audit-proven).** Split text vs UI-only and pick passing values:
- on-light TEXT: mastery/success `#0F7A40`, error `#B4543F` (existing, ~4.7 passes), retrieval text
  `#B45309`; bright `#D97706`/`#E5486D` are UI/icon/large-only (≥3:1).
- `border-meaningful` darkened until ≥3:1 on white; `axis` unchanged (decorative).
- Dark: `canvas-border` lightened (~`#475569`+) until ≥3:1 vs `#0B0F17` (it's the BORDER, not the raised
  fill, that must pass non-text contrast). Highlighters already pass (spec §9).
Final hexes are whatever `scripts/contrast-audit.mjs` certifies; the build FAILS on any miss.

**R4 — contrast-audit.mjs from real tokens.** Parses tokens out of `globals.css` (`:root` +
`[data-surface="focus"]` + `[data-surface="test"]`), evaluates an explicit manifest: ink/muted as text
on each canvas (≥4.5); each action+status color as text on its surface (≥4.5) and as UI (≥3); status
colors on BOTH light and dark; error-ink + accent on dark; highlighters on dark (≥4.5); meaningful/axis
borders (≥3); focus-outline vs canvas (≥3); canvas-border vs canvas (≥3). Non-zero exit on any fail.
Wired via `package.json` `"prebuild"` + the check script.

**R5 — Chrome adapter (zero-churn, inventoried).** Factor `components/layout/Chrome.tsx`
(`role`, `eyebrow`, `nav[]`, `identity` slot, `mode?`). Adapt: `AppShell(children, displayName,
workingAs)`, `StaffShell(children)`, `ParentShell(children, parentName)` — signatures UNCHANGED; each
maps to `Chrome`. NavLink stays the only client island. Header stays Trust/white on every surface.

**R6 — FocusSurface via AppShell prop (no negative-margin hack).** `AppShell` gains
`mainSurface?: "trust"|"focus"` → sets `data-surface` on `<main>`, drops its padding + paints
`bg-canvas` when focus. `learn/[skillId]` passes `mainSurface="focus"`. No sibling-padding coupling.

**R7 — Practice stays Trust.** Only `learn/[skillId]` becomes Focus(dark). `practice/[skillId]` remains
light Trust (rewards present but calm — it is NOT a gated test). Diagnostic = `data-surface="test"`.

**R8 — Rings reconciled.** `MasteryRing` (kind focus|mastery|retrieval; goldCap; muted) + `RingTrio` =
the signature §3/§12 instrument. On `/student/momentum` the RingTrio is the hero; course-mastery / XP /
time-given-back become secondary stat cards (no competing "trio"). Mastery ring shows the gold cap at a
node lock. Gold cap = short arc at the filled-arc terminus, only when `goldCap` (locked, value≈1);
reduced-motion → static cap + number, no sweep. Burst throttle = component-local timestamp ref, single
burst on multi-lock, reduced-motion → static.

**R9 — Baseball wired, not just available.** `strikeZone` threads `ProblemVisual`→`CoordinatePlane`
and is turned ON for coordinate/slope visuals (renders on a real lesson). `StatPanel` (Plex-Mono
TrackMan readout) mounts in the lesson chrome for slope/rate context. Pinstripe Trust DNA on headers.

**R10 — Component tests.** Add `components/gamification/MasteryRing.test.tsx`(or .ts): gold cap only when
`goldCap`; `muted` suppresses fill + sets inactive ARIA; Retrieval stroke dashed; clamp01 edges;
ProgressRing butt-cap-at-0 preserved. Keep total tests above the 774 baseline.

**R11 — Deferred (logged, justified):** §8.6 Training/Boost reward-intensity → **Phase 8** (PLAN.md
assigns it there); Phase 5 ships only the persistent mode-indicator scaffold. Film-room video
annotation → P2 (external Cloudflare video; VIDEO_STYLE.md governs). Coach/parent proof-modules depth →
Phase 7. Onboarding/auth/dev keep their own chrome (Trust by default; inherit tokens+fonts, not the
Chrome refactor).

**Acceptance (v2):** all v1 §11 boxes + the audit script green (R3/R4) + structural firewall (R1) +
practice-Trust/lesson-Focus registers (R7) + RingTrio gold-cap (R8) + baseball rendered on a real
surface (R9) + tests > 774 (R10).
