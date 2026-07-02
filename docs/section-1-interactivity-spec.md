# Section-1 Interactivity POC — Spec, Pros/Cons, Feature List

Status: **v1 built (autonomous pass, 2026-06-15), NOT yet test-run or piloted.** Target skill:
`ALG-F01` "Integer Operations". See `prompts/06-section1-interactivity-poc.md` for the build spec and
gate requirements.

## What was built
| Area | Change | Files |
|---|---|---|
| Mastery bar → 90% | `thresholds.mastered` 0.85 → 0.90 | `lib/mastery-engine/index.ts` (+ test hardened) |
| Pure incentive derivations | XP=productive minutes, today's XP, course fraction, time-given-back, ring fraction | `lib/gamification/index.ts` (+ `index.test.ts`) |
| Progress ring | server-safe accessible SVG donut | `components/gamification/ProgressRing.tsx` |
| Momentum page | `/student/momentum` — rings + XP + time-given-back + focus nudge | `app/student/(shell)/momentum/page.tsx` |
| Nav | "Momentum" entry | `components/layout/AppShell.tsx` |

## Feature list (v1)
- **Course-mastery ring** — skills mastered / total (honest count, no %).
- **Daily XP ring** — XP = minutes of active learning, vs a 120/day goal (Alpha convention).
- **Lifetime productive time** — humanized.
- **Time given back** — estimated vs traditional pace; labelled an estimate, not a graded measure.
- **Current-skill mastery ring** — % toward the **90%** bar for the recommended skill.
- **Focus nudge** — gentle, non-punitive surfacing of existing `rushing`/`stalling` timing flags.
- **Interactive lesson** (pre-existing, reused) — draggable NumberLine + worked-example StepReveal.

## Pros
- **Reuses the platform** — no duplicate engine/components; lands in the real product.
- **Additive & low-risk** — one core edit (the threshold); everything else is new files.
- **On-brand** — white/premium, real KaTeX math, calm motion, reduced-motion safe, accessible rings.
- **Competence-anchored** — rings/XP/time-back, deliberately **no** currency/streaks/leaderboard/confetti.
- **Single-sourced bar** — `masteryBar` derives from `MASTERY_CONFIG`, so it can't drift from the engine.
- **Pure, tested logic** — gamification math is pure with unit tests mirroring the engine's discipline.

## Cons / where v1 falls short (test these first)
1. **Not compiled/tested or run** — the autonomous build had no shell. `npm run check` + a manual
   `/student/momentum` walkthrough are the required first steps. This is the #1 risk.
2. **"Today" is UTC-day, not the student's local day** — evening practice in western timezones may not
   count toward "today's XP" until the caller passes a timezone-adjusted day boundary
   (`lib/gamification` is pure and already takes `nowIso`).
3. **90% bar is global** — affects every skill, not just ALG-F01; mr-kahn should confirm vs a per-skill
   bar, and whether 0.85 + the transfer gate was already ~90% effective.
4. **Product-standard reversal** — XP + a mastery % evolve the "no gamification / no percentages"
   standard; needs the pee-wee gate to bless the bounds (it is intentionally restrained).
5. **"Time given back" baseline is an assumption** (180 min/skill) — mr-kahn to set the real number.
6. **Momentum is a separate page**, not woven into the home dashboard — deliberate (additive, low-risk);
   a future pass could surface a compact momentum strip on `/student`.

## Rollout template (after pilot)
1. Pilot ALG-F01 end to end; capture friction; tune copy/goal/baseline.
2. Promote the pattern to the rest of the **foundations** domain (same components/engine, no new code).
3. Consider a home-dashboard momentum strip; consider per-skill mastery rings inline in Learn.
4. Phase 4 (future): AI-generated item banks + adaptive hints, each through the Codex math gate.
