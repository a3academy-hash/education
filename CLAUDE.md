# A3 Virtual School — Algebra 1 Adaptive Platform

Enterprise-grade virtual school. First course: Algebra 1. Real-time adaptive
engine decides whether a student routes backward to fill prerequisite gaps or
accelerates past mastered material. Target: accreditation-ready (Cognia-style
standards) and NCAA nontraditional-course compliant. Audience: middle school
students (11–14), affluent families, private schools, academies.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres + RLS) — Supabase-ready from day one, mocked until wired
- Deterministic adaptive engine in /lib (no LLM in routing or mastery decisions)
- LLM used ONLY in the bounded AI-tutor layer (explain, hint, reframe)

## Operator preferences (Matt)
- Terse, action-first. One directive at a time.
- Copy-paste ready commands with full absolute paths.
- Show diffs before commits. NEVER push or commit without explicit approval.
- No Co-Authored-By trailers.
- Don't present A/B/C menus — pick the best option and proceed, state why in one line.

## Agent hierarchy (MANDATORY workflow)
Main session = orchestrator/PM. Subagents in .claude/agents/:
- mr-kahn   — curriculum, learning science, knowledge graph, accreditation/NCAA. Read-only.
- mr-gates  — architecture, DB design, cross-cutting conflicts, code review. Read + Bash.
- pee-wee   — UX direction, middle-school engagement, visual quality bar. Read-only.
- mr-grunt  — implementation. Full write access. Writes NOTHING ungated (see below).

### Change workflow
1. Main session drafts a short proposal (what, where, why) for any feature/change.
2. GATED changes require verdicts BEFORE implementation:
   - mr-kahn must APPROVE anything touching: /data/*.json, /lib/curriculum,
     /lib/mastery-engine, /lib/adaptive-router, /lib/problem-engine, lesson or
     problem content, standards mapping, anything affecting accreditation/NCAA
     posture, or any change to mastery thresholds/phase logic.
   - mr-gates must APPROVE anything touching: DB schema/migrations, RLS,
     /types, API routes, auth, or any change spanning 3+ modules.
   - pee-wee must review (APPROVE WITH NOTES allowed) any new screen, new
     interactive component, or change to the design system.
3. Only after required approvals, delegate implementation to mr-grunt.
4. After implementation, mr-gates reviews the diff. Then surface the diff to
   Matt for commit approval.
5. UNGATED (mr-grunt may proceed solo): typo fixes, copy tweaks, CSS spacing,
   refactors with zero behavior change, test additions.

Verdict format from reviewers: APPROVE | APPROVE WITH CHANGES (list) | REJECT (reason).
Two REJECTs on the same proposal → stop and escalate to Matt.

### Human checkpoints (stop and wait for Matt)
- End of every phase (see /prompts/) — demo summary + diff + open questions.
- Any schema migration before it runs.
- Any change to mastery model weights or status thresholds.
- Any new dependency added to package.json.
- Anything ambiguous about accreditation/NCAA requirements.

## Product standards (non-negotiable)
- White-background, premium, calm. Stripe/Linear/Apple-Education register.
- Desktop-first (13–16" laptops, lab workstations). Mobile secondary.
- No cartoon graphics, emoji UI, gimmick gamification, badges, mascots,
  dark gamer themes, "AI magic" language, or walls of text.
- Visual teaching first: diagrams, number lines, coordinate planes,
  manipulatives, worked-example steppers. Short text.
- Engagement comes from competence feedback, autonomy, and momentum —
  not points and confetti (see pee-wee.md for the learning-science basis).

## Adaptive engine rules
- Source of truth: /data/algebra1-graph.json (validated on import).
- Mastery and routing are DETERMINISTIC. The AI tutor never routes, never
  sets mastery, never reorders curriculum.
- Sport context is an on-ramp, not the destination. Three-phase progression:
  P1 sport context → P2 blended → P3 neutral academic. Mastery requires
  demonstrated P3 (neutral) transfer. No exceptions.
- Students select a sport at onboarding (baseball, softball, basketball,
  soccer, football, volleyball, or "no sport" neutral track). Context hooks
  are per-sport per-node; engine logic is sport-agnostic.
- Backward routing: if a prerequisite is below threshold, the engine locks
  the dependent node and routes to the weakest unblocked prerequisite,
  with a plain-language reason shown to the student.

## Compliance posture (build for it now, certify later)
- Every attempt, hint, time-on-task, and mastery change is logged immutably
  (StudentAttempt + MasteryUpdate tables) — this is the accreditation evidence trail.
- Every graph node maps to standards codes (Common Core + state placeholder field).
- Design for NCAA nontraditional-course requirements: defined scope & sequence,
  regular teacher-student interaction hooks, defined course timeframe, teacher
  access to student work. Stub the interaction surfaces now.
- Privacy: students are largely under 13 → COPPA applies (parental consent
  flow placeholder, data minimization); FERPA-aligned record handling.
  No third-party trackers in student surfaces. mr-gates enforces.

## Definition of done (per feature)
- Types in /types, logic in /lib (pure, unit-testable), UI in /components.
- Engine logic has unit tests. UI states: loading/empty/error handled.
- Passes the gates above. Diff shown to Matt. No console errors.
