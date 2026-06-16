# Phase 0 — AUDIT — Plan (methodology)

**Per PLAN.md Phase 0.** The "plan" here is the audit *methodology*; Codex reviews the approach for
blind spots. Deliverable: `AUDIT.md` — a gap report with severity per domain, measured against the
five binding specs and the four named v0.1 failures (slow/clunky; AI-adaptive-in-name-only; AI-slop
+ duplicate questions; weak interactivity).

## Audit domains + method (each produces a section in AUDIT.md)

1. **Stack & architecture** — confirm current framework (Next.js App Router vs spec's React 19 +
   Vite), Supabase wiring, repository layer, build/test tooling, deployment target. Output: the
   stack fork stated explicitly with migration cost estimate (to adjudicate at Phase 1).

2. **Latency / speed vs <800ms (AI_ADAPTIVE §0/§9)** — inventory the answer-submit → feedback path:
   is grading server-side? any LLM on the common path? optimistic UI? async model updates? Estimate
   current loop cost; list every stall/LLM-on-common-path violation. (Static read; live profiling
   is a Phase 4 gate, but flag obvious sync waits now.)

3. **Item bank (DIAGNOSTIC §9, CLAUDE §9)** — scan `data/algebra1-graph.json`: total items;
   duplicate/near-duplicate estimate (exact + structural); how many are solver-verified (any solver
   exists?); slop indicators; current tagging coverage (node_id, difficulty_tier, misconception_map,
   response_type, calculator_flag, item_version, equivalence_class) vs required. Output counts.

4. **Lesson-atom inventory / interactivity (CLAUDE §7)** — list lesson/practice atom types; flag
   click-through (advance-without-commit) screens; count predict/construct→resolve vs select/read.
   Identify string-matched free-text grading (banned).

5. **Adaptivity reality-check (AI_ADAPTIVE §5-7)** — does a live per-node p_known exist? retention/
   decay modeling (FSRS)? damped KST propagation? rule-based selector with utility? diagnostic-seed
   init? mastery-lock-only-on-delayed-unseen? Map current `lib/` engine to the modular spec; list
   what's missing vs present.

6. **Visual / contrast / register (STYLE_GUIDE)** — current design tokens vs the spec palette;
   contrast failures (the 6 named FAILs); one-instrument-system vs fragmented; rings; baseball-native
   visuals; typography (Source Serif 4 + Plex Sans/Hanken + Plex Mono + KaTeX). Note: current is
   "white/calm Stripe/Linear"; spec wants a baseball-instrument system w/ dark Focus surfaces.

7. **Schema / RLS / identity / data-class (SECURITY §2-8/§16)** — current migrations vs the spec's
   data-class+retention-first ordering; family_id/student_id on every table; parent-root/child-
   subaccount; guardian roles; server-side grading + HMAC; audit-log-without-PII; n>=5 suppression;
   VPC flow existence. Map current Supabase schema to the §16 target; list gaps.

## Method
- Gather facts via parallel read-only Explore/analysis agents (one per domain 2-7) + direct reads;
  domain 1 by direct inspection. No code changes in Phase 0.
- Synthesize `AUDIT.md`: per domain → current state, spec target, gap list, severity
  (BLOCKER/HIGH/MED/LOW), and the phase that closes it.
- Snapshot note: the question bank backup is a Phase 2 deliverable, not Phase 0; flag it.

## Acceptance (Phase 0 gate, maps to GOAL "PROCESS done")
- `AUDIT.md` exists with a gap list + severity for all 7 domains.
- `phase-0-{plan,review,decisions,verify}.md` exist; `OVERHAUL_LOG.md` updated.
- The stack fork is explicitly stated for Phase 1 adjudication.

## Codex review ask (step 2)
Review THIS methodology for blind spots: which audit dimension, if skipped or measured wrong, would
let a fatal v0.1 failure survive into the overhaul? Is the domain list complete vs the 5 specs? Is
deferring the stack decision to Phase 1 correct, or does it bias the audit?
