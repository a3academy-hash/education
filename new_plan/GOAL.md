# GOAL.md — A3 Adaptive Algebra 1 Course: Full Overhaul Definition of Done

**For:** Claude Code (self-driving overhaul run).
**Source of truth:** the five v0.2 spec docs in this project —
`CLAUDE.md`, `DIAGNOSTIC.md`, `AI_ADAPTIVE.md`, `STYLE_GUIDE.md`, `SECURITY_DB_REPORTING.md`.
**Read those five FIRST and treat them as binding.** This file defines DONE; PLAN.md defines the
self-driving path (plan -> Codex review -> autonomous adjudication -> execute -> verify, per phase).

---

## The one-sentence goal
Transform the existing v0.1 course (4,000+ question bank, "AI adaptive" in name only, clunky,
slow, AI-slop + duplicate questions, weak interactivity) into a best-in-class adaptive Algebra 1
course that is **fast and fluid, genuinely adaptive, clean of slop, beautifully consistent, and
compliance-safe** — fully conformant to the five spec docs — without human intervention.

---

## PROCESS done (the loop must have actually run)
For EVERY phase, the following artifacts must exist as evidence the self-driving loop ran:
- [ ] `phases/phase-<N>-plan.md` — code-level plan against the named spec sections.
- [ ] `phases/phase-<N>-review.md` — Codex adversarial review (or the red-team fallback).
- [ ] `phases/phase-<N>-decisions.md` — Claude's autonomous adopt/reject/add/subtract + rationale.
- [ ] `phases/phase-<N>-verify.md` — passing acceptance + GOAL checkbox + build/test results.
- [ ] `OVERHAUL_LOG.md` — continuous record; proves the run was resumable and unbroken.

---

## Non-negotiables (if any fail, NOT done)
1. **FAST, never clunky** — normal loop <800ms; no LLM on common path; async updates + optimistic
   UI. Only the thinking is slow, never the system. (AI_ADAPTIVE §0, §9)
2. **No AI slop, no duplicates** — every item solver-verified, deduped, misconception-mapped,
   node-tagged, certified. (DIAGNOSTIC §9, CLAUDE §9)
3. **Genuinely adaptive** — live knowledge graph (BKT/KST + FSRS-style decay), rule-based
   selector, diagnostic-seeded, LLM advisory only; mastery time-varying, locked only on delayed
   unseen retrieval. (AI_ADAPTIVE §5-7)
4. **Real interactivity** — every atom predict/construct -> resolve; no click-through. (CLAUDE §7)
5. **One coherent enterprise skin** — single instrument system; WCAG-AA contrast; baseball-native;
   trust/focus/reward registers. (STYLE_GUIDE)
6. **Compliance built, launch-gated (not build-gated)** — data-class/retention schema; RLS
   isolation; parent-root/child-subaccount; the VPC consent flow built + passing tests. All
   current data is test data, so build/test freely and destructively; these are SHIP gates before
   any real user, never mid-build pauses. (SECURITY_DB_REPORTING §2-8)

---

## Definition of DONE, by domain (measurable)

**Item bank:** 0 duplicates above threshold; 100% live items solver-verified; all tagged
(node_id, difficulty_tier, misconception_map, response_type, calculator_flag, item_version); slop
removed; structured/numeric/construct responses (no string-matched free text); certification
pipeline gates new items.

**Adaptive engine:** knowledge graph (nodes+edges+CCSS+5-10 clusters); per-node p_known + retention
state + confidence; modular layers w/ explicit interaction rule; damped KST; selector
(acquire+resolve+maintain); diagnostic-seed init; mastery locks only on delayed unseen.

**Speed:** measured loop <800ms under load; no LLM on common path (only stuck states); async
updates + optimistic UI; graceful non-LLM fallback; zero UI stalls.

**Interactivity:** every atom predict/construct -> resolve; construct/structured input for
symbolic+graph; predict-then-reveal on simulations.

**Visual system:** one instrument system + shared chrome; contrast passes AA (resolve-by-surface);
rings (Focus solid blue / Mastery green+gold-cap / Retrieval dashed amber; hue+icon+pattern);
trust register for tests (rewards muted); sober adult dashboards; baseball-native visuals;
Source Serif 4 + (Plex Sans|Hanken) + Plex Mono + KaTeX.

**Diagnostic:** structured multistage routing; high-impact nodes tested directly; KST routing;
outputs four labels + remediation + entry frontier; writes provisional seed; finds the 5-10
break-Algebra-1 gaps.

**Reporting + compliance:** data-class/retention enforced in schema; RLS on every table; parent-
root/child-subaccount + VPC + parent access/delete; parent dashboard (course-progress ring,
overall mastery, 5-10 subject masteries, proof modules); admin/teacher + coach reporting (pace vs
plan, severity + next-step, n>=5 suppression); NCAA export + 70/20/10 grade rubric; server-side
grading; signed submissions; audit log without PII bodies.

**Engagement guardrails:** 70-90% success band; capped review burden; "fast but fragile" flag;
visible retained-mastery; frustration fallback; rings never in mastery math; no rewards in tests;
Training/Boost mode.

---

## DONE = every domain checkbox true AND every phase's loop artifacts exist AND
`npm run build` + tests pass AND the performance, contrast, dedup, solver, accessibility, and
end-to-end verification reports are clean. The loop runs unattended through all phases (test data
is freely destructible; the question bank is snapshotted once before purge). Stop only at DONE.
Compliance items are SHIP gates, not build pauses.
