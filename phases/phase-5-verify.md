# phase-5-verify.md — Visual System acceptance

**Result: PASS** (build-and-test level; live screenshot deferred — see Residual).

## Gate checks (PLAN.md Phase 5 + GOAL.md "Visual system")

| Acceptance | Evidence | Status |
|------------|----------|--------|
| Contrast audit passes AA (resolve-by-surface) | `scripts/contrast-audit.mjs` parses real tokens (incl. `var()` resolution) → **39/39 pairings pass**; wired as `prebuild` (build fails on any miss) | ✅ |
| One coherent skin / shared chrome | `Chrome.tsx` is the single header; AppShell/StaffShell/ParentShell are thin adapters (signatures unchanged → zero call-site churn); navy pinstripe Trust DNA | ✅ |
| Persistent mode indicator | `ModeIndicator.tsx` (pathname-driven): "Measurement mode — focus on accuracy" on /student/diagnostic, "Training mode" elsewhere | ✅ |
| Rings: hue+icon+pattern+ARIA, gold cap only at lock | `MasteryRing.tsx` (focus solid+crosshair / mastery solid+up-track+gold-cap / retrieval dashed+recall-arrow), Plex-Mono %, ARIA per kind; `RingTrio.tsx`; 7 unit tests | ✅ |
| Trust register for tests (rewards muted) | diagnostic wrapped `data-surface="test"`; CSS firewall backstop forces ring fill→track + hides `.a3-reward/.a3-burst/.a3-streak` even if a caller forgets `muted` (structural, not intent) | ✅ |
| Dark Focus register for lessons | `learn/[skillId]` wrapped in `SurfacePanel surface="focus"` (#0B0F17), full comprehensive token re-scope; practice stays Trust (spec §1) | ✅ |
| Baseball-native visuals | `CoordinatePlane` strike-zone overlay (wired ON via ProblemVisual in Learn/explore — renders on real coordinate lessons); `StatPanel` live launch/slope readout in the coordinate explore; pinstripe DNA | ✅ |
| Type system | Source Serif 4 (display) + IBM Plex Sans (body) + IBM Plex Mono (numerics) via next/font; KaTeX styled per surface (`[data-surface="focus"] .katex`) | ✅ |
| Build + tests green | `npm run build` ✅ (20/20 routes, prebuild contrast gate passed); `tsc --noEmit` clean; **781 tests pass** (was 774; +7 MasteryRing) | ✅ |

## Loop artifacts
- phase-5-plan.md (v2, post-review) · phase-5-review.md · phase-5-decisions.md · this file.
- codexreview audit trail: `.codexreview/reviews/2026-06-16-phase5-visual/` (plan: informed+cold; diff: informed) + round-1 adjudications.
- Gates: pee-wee APPROVE-WITH-CHANGES (all adopted), mr-gates APPROVE-WITH-CHANGES on plan AND diff (all adopted), Codex plan (3 blocking + highs, all adopted) + diff (2 medium, both adopted/noted).

## Diff-review fixes applied (post-implementation)
- `overflow-x:hidden` on html (SurfacePanel `w-screen` scrollbar guard — mr-gates #1).
- SurfacePanel `min-h-[calc(100vh-62px)]` (60px bar + 2px pinstripe — mr-gates #2).
- momentum retrieval-reps tightened to `createdAt > masteredAt` (mr-gates #4).
- contrast-audit resolves `var()` indirection so the test surface audits #f8fafc, not the base canvas (Codex `contrast-var-token-skip`).
- StatPanel wired into the coordinate explore (was dead code — mr-gates #3 / Codex `baseball-not-wired`).

## Residual / deferred (logged, not gate-blocking)
- **Live visual spot-check** via chrome-devtools deferred (memory/dev student-cookie setup); static gates (build/tests/audit/tsc) are green and the system is token-driven. Recommend a quick manual pass when convenient.
- §8.6 Training/Boost reward-intensity → **Phase 8** (PLAN.md owns it there). Mode-indicator scaffold shipped.
- Film-room video annotation overlay → P2 (external Cloudflare video; VIDEO_STYLE.md governs).
- Coach/parent intervention-severity dashboard + proof modules depth → **Phase 7** (reporting domain).

## COMMIT NOTE (human checkpoint — not auto-committed)
The working tree contains UNRELATED parallel/Phase-4 work (`scripts/*-banks.mjs`, `merge-*`, `validate-*`,
`alg-f01-worked-interactions.ts`, `learn-explore-seed.*`, `step-reveal-logic.*`, `lib/mastery-engine`
edits, etc.). Per the "never git add -A" standing rule, Phase 5 must be committed with ONLY this file set:
`app/globals.css`, `app/layout.tsx`, `app/student/(shell)/diagnostic/page.tsx`,
`app/student/(shell)/learn/[skillId]/page.tsx` + `LearnClient.tsx`, `app/student/(shell)/momentum/page.tsx`,
`components/layout/{Chrome,ModeIndicator,SurfacePanel,AppShell,StaffShell,ParentShell}.tsx`,
`components/gamification/{MasteryRing,MasteryRing.test,RingTrio,ProgressRing}.tsx`,
`components/learning/{CoordinatePlane,ProblemVisual,StatPanel}.tsx`, `scripts/contrast-audit.mjs`,
`package.json`, `vitest.config.ts`, `phases/phase-5-*`, `.codexreview/`.
(ProgressRing.tsx + momentum/page.tsx are the untracked v1 this phase builds on — include them so the
Momentum nav link is not dangling, per Codex `momentum-route-not-in-diff`.)
