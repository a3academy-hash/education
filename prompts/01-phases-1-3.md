# PHASE 1 — Deterministic adaptive engine (paste after Phase 0 approved)

Read CLAUDE.md. Gated by mr-kahn (logic) and mr-gates (architecture).

Build, as pure unit-tested TypeScript in /lib:

1. /lib/mastery-engine
   - computeMastery(state, skillId, graph) → { score 0–1, status }
   - Inputs: accuracy (recent-weighted), overall accuracy, attempts, hint
     usage (penalty), time-on-task (flag rushing and stalling, don't punish),
     consistency (variance of recent results), prerequisite status,
     Phase-3 transfer success, recency/decay.
   - Statuses: unknown, introduced, developing, near_mastery, mastered,
     needs_review, prerequisite_gap.
   - HARD RULE: mastered requires demonstrated Phase-3 neutral transfer.
   - HARD RULE: any prerequisite below threshold → prerequisite_gap, which
     overrides everything.
   - needs_review: previously mastered + recent accuracy dip (decay rule).
   - All weights/thresholds in one exported config object (single place for
     Matt-approved tuning — changing them is a human checkpoint).

2. /lib/adaptive-router
   - recommend(studentState, graph) → AdaptiveRecommendation
     { skillId, kind: remediate|continue|review|accelerate|complete,
       reason (one plain sentence a 12-year-old understands), blockedSkill? }
   - Backward routing: locked dependents route to weakest unblocked prereq.
   - ACCELERATION: if diagnostic or session evidence shows a node is already
     mastered, mark it and skip it — explicitly test that strong students
     are moved forward without busywork.
   - Deterministic tie-breaking (document it). Same inputs → same output, always.

3. /lib/problem-engine
   - Serves problems by node + student's current context phase + selected
     sport. Pulls Phase N and N+1 to probe transfer. Phase advances at
     session accuracy ≥ threshold. Answer checking supports an equivalence
     class of accepted answers (e.g., "5", "x=5", "x = 5").
   - Misconception classification from wrong-answer patterns → tags.

4. /lib/ai-tutor (bounded)
   - tutorRemediation(misconceptionTag, node, sport) → { diagnosis, reframe
     in the student's sport, bridge-to-neutral nudge }.
   - Rule-based now; one clearly marked seam where an LLM call plugs in later.
   - The tutor NEVER routes, never sets mastery, never reorders curriculum —
     enforce by type signature (it returns text, not decisions).

Tests: full coverage of status transitions, gap override, transfer gate,
acceleration path, decay, deterministic tie-breaks, phase advancement.

CHECKPOINT — stop for Matt: engine test results + a written walkthrough of
one simulated student (diagnostic → gap → remediation → transfer → mastery →
acceleration past the next node).

---

# PHASE 2 — Design system + onboarding (paste after Phase 1 approved)

Read CLAUDE.md. pee-wee directs this phase; mr-gates reviews structure.

1. Design system in /components/ui: tokens (type scale, spacing, color —
   white-first, one accent), Card, Button, Input, Progress, StatusPill,
   Table, PageHeader, panel primitives. Calm motion utilities.
2. Math visual primitives in /components/learning: NumberLine,
   CoordinatePlane (supports draggable points + live line), BalanceScale
   (equation model), StepReveal (worked-example stepper), DataTable.
   These must be interactive — pee-wee's bar: every lesson screen has at
   least one thing the student can touch that changes the math.
3. /app/student/onboarding: name + grade + SPORT SELECTION (six sports +
   neutral), framed as personalization, not a game. Selection stored on
   StudentProfile and flows through problem-engine and context hooks.
4. App shell: top nav, student identity, calm layout grid, desktop-first.

CHECKPOINT — stop for Matt: rendered screenshots/storybook of every
primitive + the onboarding flow. pee-wee final pass verdict included.

---

# PHASE 3 — Diagnostic + Student Home (paste after Phase 2 approved)

Read CLAUDE.md. Gates: mr-kahn (diagnostic logic), pee-wee (screens).

1. /app/student/diagnostic
   - Professional intro (what it measures, why, no quiz-show feel).
   - Adaptive sequence: start mid-graph per domain; correct → probe deeper
     prerequisite-descendants get credited; incorrect → probe prerequisites.
     Target ≤ 15 items by exploiting graph structure (test this).
   - Output: per-node estimated status + confidence by cluster + recommended
     starting point. Clean completion summary, no celebration theatrics.
2. /app/student (Learning Home)
   - Recommended next skill + the engine's plain-language reason.
   - Course + per-domain mastery, prerequisite-lock alert when applicable,
     recent session history, one primary action: Start learning session.
   - Quiet acceleration callout when the engine skipped mastered material
     ("You proved X in the diagnostic — we're not going to waste your time
     re-teaching it.").

CHECKPOINT — stop for Matt: clickable diagnostic → home flow, with one
simulated weak student and one simulated advanced student showing backward
routing AND acceleration respectively.
