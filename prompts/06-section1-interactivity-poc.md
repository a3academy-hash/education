# Phase 06 — Section-1 interactivity POC + 90% mastery + Alpha-style incentive layer

> Owner directive (2026-06-15): interactivity + **90% mastery** is the top product priority; video
> is the lowest. Build a flagship, testable Section-1 experience, pilot it, then extend across the
> course. This prompt is the executable spec for the agent workflow (mr-kahn / mr-gates / pee-wee /
> mr-grunt) with Matt's human checkpoints.

## Scope (POC — one skill, end to end)
**Section 1 = `ALG-F01` "Integer Operations"** — the graph's only zero-prerequisite, tier-0 foundations
skill (visual: numberline). It already has worked examples + P1/P2/P3 problem banks + misconception
maps, and the Learn→Practice loop already renders a genuine draggable NumberLine. The POC makes it the
exemplar of "perfect interactivity + 90% mastery" and adds the incentive layer.

## What is already DONE in this branch (review, don't rebuild)
- **A. Mastery bar → 90%.** `lib/mastery-engine/index.ts`: `thresholds.mastered` 0.85 → 0.90 (transfer
  gate + `minAttempts.mastered` unchanged). Engine + walkthrough + practice-session mastery cases use
  all-correct evidence (scores ≈0.93–1.0) so they still pass; one literal `0.85` in the engine test was
  re-pointed at `MASTERY_CONFIG.thresholds.mastered`.
- **C. Incentive layer (Alpha-style, NO currency).**
  - `lib/gamification/index.ts` (+ `index.test.ts`): PURE derivations — XP = productive minutes
    (Σ per-skill `timeMs`), today's XP vs a daily goal, course-mastery fraction, **time given back**
    (mastered × baseline − productive minutes, floored), and `masteryRingFraction` (single-sourced to
    `MASTERY_CONFIG.thresholds.mastered`).
  - `components/gamification/ProgressRing.tsx`: server-safe accessible SVG donut (reduced-motion safe).
  - `app/student/(shell)/momentum/page.tsx`: new `/student/momentum` surface — course-mastery ring,
    daily XP ring, time-given-back, and a current-skill ring toward the 90% bar with a non-punitive
    focus nudge (surfaces the existing `rushing`/`stalling` timing flags).
  - `components/layout/AppShell.tsx`: added a "Momentum" nav entry.
- **D. Focus nudge.** Implemented on the momentum page from the engine's existing timing flags
  (advisory only — never gates, never enters mastery math).
- **B. Interactivity.** ALG-F01's Learn/Practice is already production-grade (LearnClient derives an
  interactive NumberLine from the node's real `visualSpec`); no changes were needed.

## Gates & checkpoints required BEFORE this ships
- **mr-kahn (mastery / curriculum):** approve the 0.85 → 0.90 bar. Decide: global (current) vs
  ALG-F01-scoped, and whether 0.85 + the P3 transfer gate was already ~90% effective. Bless the
  **"time given back" baseline assumption** (`baselineMinutesPerMasteredSkill = 180`).
- **pee-wee (UX / product standard):** the incentive layer **intentionally evolves** the standing
  "no gimmick gamification / no points / no percentages" standard (XP, rings, a mastery %). Confirm the
  tasteful bounds (no currency, no streaks, no leaderboard, no confetti) and the white/premium fit.
- **mr-gates (architecture):** XP/time-given-back are **derived** from existing `timeMs`/attempts — no
  schema or types change. Confirm no new telemetry/migration is needed; review the new files.
- **Matt checkpoint:** the mastery-threshold change and the product-standard evolution are both
  explicit stop-and-wait items — already authorized by the 2026-06-15 directive; confirm at demo.

## Verification (run these — they were NOT run in the autonomous build)
1. `npm run check` (typecheck + lint + test) — the autonomous pass could not run it (no shell).
   Expect green; pay attention to `lib/gamification/*` and the three mastery-touching test files.
2. `npm run dev` → sign in as a memory-mode/dev student (`sport: neutral`) → visit `/student/momentum`:
   - empty state (new student) renders with no stray ring artifacts;
   - after a practice session, XP/productive-minutes, course ring, and the current-skill ring update;
   - `/student/learn/ALG-F01` and `/student/practice/ALG-F01` show the interactive NumberLine;
   - mastery on ALG-F01 fires only at ≥90% + transfer + ≥3 attempts.

## Then: pilot → spec → expand
Matt pilots ALG-F01 end to end; capture friction. Update
`docs/section-1-interactivity-spec.md` (pros/cons/feature list). Extend the pattern to the rest of the
foundations domain, then the course.

## Non-goals
No currency/streaks/leaderboard/confetti. No backend changes. No video work. No full-course build yet.
