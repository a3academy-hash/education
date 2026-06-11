# Phase 3 Screen Direction (pee-wee, binding) — 2026-06-10

Inherits ALL Phase 2 tokens/primitives/deviations (docs/design/phase2-direction.md —
esp. §F.4 ink-500 for informational text, §F.7 no-ampersand). Layout cribs from
docs/reference/algebra1-platform.jsx (Home 645–757, Diagnostic 773–870) but tokens
+ copy from THIS doc win on conflict. Build with Phase 2 primitives only — the
reference's inline styles are layout cribs, not code.

## Reference violations corrected here (do NOT carry into build)
1. `#8a93a3` informational text → use `ink-500`. Eyebrows → `label` token (12/600 uppercase ink-500).
2. `COURSE MASTERY 74%` big percentage → REMOVED (scoreboard). Qualitative standing + per-domain bars only.
3. `QUESTION i OF N` countdown → REMOVED. Non-numeric progress rail.
4. Summary as graded % → reframed to StatusPill + confidence meter.
5. Ampersands / "Apply profile & view my path" / "Recalibrate" jargon → rewritten.
6. Inline `borderRadius:9` etc → use primitives (radius-md=10).
7. Diagnostic intro "Cancel" ghost → dropped (no half-finished state).

## Shared
Grid: container 1140, 28px gutters. Home uses full container; Diagnostic = centered
column (intro/item max-w-600, summary max-w-680, mx-auto). Primitives only. ONE
primary action per screen. Motion: fade-in on mount; stagger (≤4, 60ms) on Home hero
grid only. Keyboard-first: autoFocus the single control, Enter submits.

## SURFACE 1 — DIAGNOSTIC  app/student/(shell)/diagnostic
Sport context ABSENT on all states (neutral transfer-grade assessment).

### Intro (centered max-w-600, text-center)
- Eyebrow (label, ink-500): `PLACEMENT DIAGNOSTIC`
- H1 (display-xl Fraunces 600): `Let's find your exact starting point.`
- Lede (body-lg ink-500, max-w-480 mx-auto): `This is a short set of questions across the major skill areas of Algebra 1. It is not graded and it does not count against you. We are only measuring what you already know, so the path we build starts in exactly the right place. About ten minutes.`
- InsetPanel (no label, max-w-480, left-aligned), 3 rows each = 14px SVG check + text:
  - `One question at a time. Answer in standard math notation.`
  - `If you are unsure, give your best answer and move on.`
  - `When you finish, you go straight to your learning home.`
- Primary Button `Begin` (autoFocus). Quiet micro line below (not a button): `Nothing here is graded.`
- No countdown, no Cancel, no score preview.

### Item (centered max-w-600)
- Progress mechanism (replaces banned scoreboard): a single thin segmented `Progress` rail h-1 (4px), full column width, mb-6. NOT numbered, NO "N of M". Fill width = engine-supplied `progress: 0..1` (adaptive/variable-length → a count would be dishonest). Above the rail, left-aligned eyebrow (label, ink-500) = the SKILL AREA being probed (e.g. `FOUNDATIONS`, `LINEAR EQUATIONS`). NO timer ever.
- Card (default padding, comfortable internal py-8 px-8): prompt display-md (Fraunces 500), math expression in mono. Neutral notation.
- Interactive-visual requirement (the touchable thing), chosen by item `responseType`: slope/intercept → CoordinatePlane (draggable, neutral x/y); place-value/inequality → NumberLine (neutral); equation-solve → Input (math mode); table → DataTable (neutral headers). BalanceScale stays OUT (it teaches; we measure). Plane- and line-based items MUST be manipulable, not multiple-choice.
- Response Input (math, 16 mono), label `Your answer`, autoFocus, placeholder `Type your answer`.
- Primary Button `Submit` (not Next/Finish), disabled until non-empty, Enter submits.
- PER-ITEM FEEDBACK: SILENT. No right/wrong shown per item (this is assessment not instruction; immediate feedback contaminates the ability estimate and turns it into a quiz-show). On Submit → record, rail advances, next item fades in 250ms. No correctness signal.

### Summary (centered max-w-680)
- Eyebrow (label ink-500): `DIAGNOSTIC COMPLETE`
- H1 (display-lg/xl): `Here's what we found.`
- Sub-lede (body ink-500 max-w-520, growth-framed): `Nothing here is a grade. This is a snapshot of where you are today, so we know exactly where to begin and what to skip.`
- Per-cluster card (flush padding, one row per domain, divider border-selected after first; px-18 py-4 flex justify-between items-center). Each row L→R: (1) cluster label (body 14.5/500 ink); (2) StatusPill = real estimated MasteryStatus (committed exhaustive mapping); (3) CONFIDENCE meter — NOT a %, NOT a mastery bar: three 4px×18px rounded segments, filled=ink-700 / empty=track, Low/Med/High = 1/2/3 filled, + 12.5/500 ink-500 word `Low/Medium/High confidence`. (Confidence = about the measurement, non-comparable between students.) Domains the diagnostic could not probe (empty p3 banks) render `unknown` status + 0 filled segments + `Not yet measured`.
- InsetPanel (label `WHERE WE'LL START`): `We're starting you at <strong>{startSkillTitle}</strong> — {oneSentenceReason}.` (reason from recommend()).
- Primary Button `Go to my learning home` (autoFocus) → persist via server action → /student.
- NO confetti, NO "Great job", NO overall %, NO score.

### Diagnostic edge states
- No-student cookie: calm Card — H2 `Let's set up your course first.` + body `The diagnostic needs your course profile. It takes about a minute to set up.` + secondary Button `Set up your course` → /student/onboarding.
- Persist failure on summary: primary enters loading; on failure AlertPanel BELOW button: `Something went wrong saving your profile. Your answers are safe — try that button once more.` Button re-enables. Never lose result.
- Item render failure: math primitives degrade (frame + warn), Input still answerable. No screen error.
- All-correct / all-incorrect: same screen, no celebration/commiseration branch; pills + neutral sub-lede carry it.

## SURFACE 2 — LEARNING HOME  app/student/(shell)/page.tsx (replaces placeholder)
Full container 1140. fade-in root; stagger hero grid. Server component (reads cookie→repo→engine once/request).

### Header (PageHeader)
- Eyebrow (label ink-500): `YOUR COURSE`
- H1 (display-xl): `Here's exactly where you are.` (omit subhead)

### Hero row  grid-cols-[1.55fr_1fr] gap-5 (stacks <1024)
LEFT — Recommended-next Card (padding 24):
- Eyebrow (label, ACCENT color — the one allowed accent eyebrow): `RECOMMENDED NEXT`
- Row: skill title display-lg + its StatusPill (right, baseline-aligned)
- Objective sentence body 14.5/1.55 ink-500 max-w-460 my-3 mb-18
- InsetPanel (label `WHY THIS, NOW`) = engine rec.reason (one sentence, ink-700)
- Action row (flex items-center gap-3.5): Primary Button `Start learning session` (screen's one primary; routes to engine-recommended learn/[skillId]). Right of it, quiet ink-500 `Current phase: ` + ink-700 {phaseLabel} (Sports context / Blended / Neutral transfer).

RIGHT — Course standing Card (padding 24), NO percentage:
- Eyebrow (label ink-500): `COURSE STANDING`
- Qualitative line (body ink-700) by avg band: <0.25 `Just getting started` / 0.25–0.5 `Building your foundation` / 0.5–0.8 `Making strong progress` / >0.8 `Nearly there`. Below: thin overall Progress h-1.5 accent, NO % label.
- Per-domain rows (mt-5 grid gap-4): domain label 13/500 ink-700 left; mono `{mastered}/{total}` count ink-500 right; below each a Progress h-1.5, color status-mastered green when avg>0.8 else accent.

### Prerequisite-lock alert (full width, between rows, only when rec.alert)
AlertPanel primitive (role=status built in), mt-5: `<strong>{blockedSkillTitle}</strong> is locked for now. We're routing you to the skill it depends on first, so you're never stuck on something you haven't been set up for.`

### Acceleration callout (under hero row, when engine skipped mastered material)
NOT AlertPanel (that's the error channel). Success-toned strip full width mt-5: bg success-bg, 1px success-border, radius 10, padding 16×20. Left: 14px SVG check. Eyebrow inside (label, status-mastered green): `MOVED YOU FORWARD`. Body (body 13.5/1.5 ink-700): `You proved {provenSkillTitle} in the diagnostic. We're not going to waste your time re-teaching it — you're starting further along.` (multi: `You proved {n} skills in the diagnostic — including {topSkillTitle}. We're not re-teaching what you already know; you're starting further along.`) No badge, no "level up", no time-saved %, no confetti.

### Lower row  grid-cols-[1fr_1fr] gap-5 mt-5 (stacks <1024)
LEFT — Recent activity Card (padding 24): eyebrow (label ink-500) `RECENT ACTIVITY`. Rows (real history, mock until wired): flex justify-between py-11, divider border-selected after first. Left: skill title 14/500 ink + detail 12.5 ink-500 (e.g. `6 problems · 67% accuracy` — per-session private record is allowed, it's a log not a leaderboard). Right: relative time 12 ink-500. Empty state: eyebrow + InsetPanel `No sessions yet. Your first learning session will show up here — including a quick way to revisit it later.`
RIGHT — Quick review Card (padding 24, flex-col justify-between): eyebrow (label ink-500) `QUICK REVIEW`; title display-sm `90-second tune-up`; body 13.5/1.55 ink-500 `Revisit a skill you mastered a while ago. A short refresher keeps it sharp — it's a feature, not a step back.`; secondary Button `Start a tune-up` (NOT primary); below, quiet Button `Retake the placement diagnostic` → /student/diagnostic.

### Home edge states
- No cookie: keep committed placeholder — PageHeader + Card with InsetPanel (label `GET STARTED`) `You haven't set up your course yet.` + accent link `Set up your course` → /student/onboarding.
- Student but no diagnostic taken: recommended card still renders (engine from seed); first-visit InsetPanel above hero (full width, label `BEFORE YOU START`) `For the most accurate starting point, take the ten-minute diagnostic first.` + quiet link → /student/diagnostic. No nag/modal/countdown.
- recommend returns `complete`: recommended card H2 `You've mastered the current map.` + ink-500 `Every skill we've mapped is solid. New material unlocks as the course expands.` Primary hidden; show secondary `Start a tune-up`.
- Data/load error: single AlertPanel top of content `We couldn't load your dashboard just now. Refresh to try again.` Never render half a dashboard.

## Responsive (desktop-first)
≥1024: grids as specified. <1024: both Home rows stack single-column (hero-left, standing, alert, activity, review). Diagnostic stays centered 600/680 at all widths. No mobile-app patterns (no tab bars/swipe/hamburger). Touch targets ≥40px.

## A11y (binding)
All informational text ink-500+ (no ink-400/300 for read content). Every interactive element shows committed focus-visible ring. Diagnostic: focus → response Input on each item mount; after Submit focus moves to next item's input (managed); summary focus → primary. Home focus order: recommended title → Start learning session → standing → alert → activity → review. Enter submits diagnostic item form. Reduced-motion honored (progress rail transition instant). AlertPanel role=status. Math primitives aria-live per Phase 2 §C. No emoji, no icon-only controls, no color-only meaning.

## Data contract pee-wee depends on (from mr-kahn/mr-gates)
- Per item: `responseType` (input|plane|line|table) + cluster label + `progress: 0..1`.
- On completion: per-cluster `{ status: MasteryStatus, confidence: low|medium|high }` (or unknown/not-measured) + recommendedStartSkillTitle + one-sentence reason.
- Home recommend output shape: `{ skillId, skillTitle, objective, status, phaseLabel, reason, alert?, accelerated?: { provenSkillTitle, count } }`. `accelerated` drives the strip; absent → strip doesn't render.
