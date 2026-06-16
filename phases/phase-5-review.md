# phase-5-review.md — Adversarial review of the Visual System plan

Four independent reviewers run on `phase-5-plan.md` (v1): **Codex informed** (repo access) + **Codex
cold** (sealed, premises-only) via the codexreview chain, plus the two CLAUDE.md gates **pee-wee**
(UX/design-system) and **mr-gates** (architecture, 3+ modules). Raw Codex JSON +
prompts preserved under `.codexreview/reviews/2026-06-16-phase5-visual/`. All four: **APPROVE WITH
CHANGES** — no REJECT. Strong convergence; treated as high-weight signal.

## Concern union (deduped, by severity)

| # | id | sev | source(s) | claim |
|---|----|-----|-----------|-------|
| 1 | test-firewall | **blocking** | codex-informed (mode-firewall-path), codex-cold (test-ring-firewall), pee-wee #1 | Test reward firewall is a caller-passed prop (`mutedRings`), not a hardcoded surface rule — a forgotten prop leaks a reward into a gated test. Also: §8.3 "instrument shown but INACTIVE" vs "no rings" reads as a contradiction that must be codified (inactive instrument allowed; active rings/points/streaks/bursts banned). |
| 2 | focus-token-scope | **blocking/high** | codex-informed, codex-cold (token-rescope-utilities), mr-gates #4, pee-wee #4 | Focus re-scope block is incomplete: accent/accent-hover/accent-tint, full status-*, error-ink, success/error bg+border tint pairs, track/inset/hover/selected/chip, axis, focus-outline all unre-scoped → invisible buttons + brown feedback text on #0B0F17. (Tailwind var-backing + unlayered-rescope mechanism empirically PROVEN by mr-gates repro.) |
| 3 | contrast-token-fails | **high** | codex-informed, mr-gates #6 | Spec "fix" hexes fail their own AA thresholds as normal text/UI: #E5486D 3.83, #168A4A 4.40, #D97706 3.19, #9AA8BA 2.42, canvas-border #334155 1.85, raised #1E293B 1.31. Gate is internally inconsistent unless alternatives chosen. |
| 4 | contrast-script-coverage | **high** | codex-cold, mr-gates #7 | Hand-maintained audit can pass while missing real combinations. Need an explicit pairing manifest driven off the actual tokens in globals.css; status colors on both surfaces; error-ink/accent/focus-ring on dark. |
| 5 | zero-churn-shells | **high** | codex-cold, mr-gates #2 | Shell→Chrome "zero churn" is an unproven migration premise — need per-shell prop inventory + adapter mapping. (mr-gates confirmed the client/server NavLink boundary is sound.) |
| 6 | focussurface-bleed | high | mr-gates #3 | `-mx-7 -mt-9` negative-margin bleed keyed to AppShell padding is fragile; `pb-20` left uncancelled → light strip at page bottom. |
| 7 | practice-surface | high | pee-wee #3/#4, codex-informed | Plan makes practice Focus(dark), but spec §1 lists only lessons+videos as Focus; the feedback moment is high-load and uses light tint pairs. |
| 8 | momentum-ring-conflict | high | pee-wee #3 | Momentum page already renders a different "three rings" (course/XP/time) — would ship two conflicting three-ring concepts. |
| 9 | baseball-not-wired | medium | codex-informed, pee-wee #5 | strikeZone/StatPanel are optional props never wired into ProblemVisual→CoordinatePlane → acceptance passes in code while no real surface shows them. pee-wee: add ≥1 structural baseball instrument, not just trim. |
| 10 | training-boost | high(UX) | pee-wee #6 | §8.6 Training/Boost reward-intensity mode omitted. |
| 11 | gold-cap-geometry | medium | pee-wee #2 | Gold-cap arc underspecified; must sit at filled-arc terminus, appear only when locked, degrade to static under reduced-motion. |
| 12 | focus-ring-dark | medium | pee-wee #7, mr-gates | `--color-accent` outline ~2.1:1 on dark canvas; re-scope focus outline + audit it. |
| 13 | reward-throttle-state | medium | codex-cold | Burst 1/90s throttle: state location/persistence + multi-lock behavior unspecified. |
| 14 | ring-component-tests | medium | mr-gates #9 | New MasteryRing/RingTrio need unit tests (gold-cap only when locked, muted suppresses fill+ARIA, dashed on retrieval). |
| 15 | audit-build-hook | medium | mr-gates #8 | `next build` has no hook running the audit — needs a `prebuild`/check wiring. |
| 16 | chrome-scope-boundary | low | mr-gates #2 | State that onboarding/auth/dev keep their own chrome and are Trust by default (in scope for token coherence, out for the Chrome refactor). |

Single thing most-likely-fatal (reviewer consensus): **#2/#3 together** — shipping the dark Focus
surface with an incomplete re-scope and AA-failing "fix" hexes would ship visible contrast
regressions while the gate reports green. Both are accepted and fixed in plan v2.
