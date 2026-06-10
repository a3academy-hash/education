# PHASE 4 — Learn + Practice + Summary (paste after Phase 3 approved)

Read CLAUDE.md. Gates: mr-kahn (content fidelity), pee-wee (every screen).

1. /app/student/learn/[skillId]
   - Title, one-sentence objective, prerequisite status, mastery + phase.
   - Visual lesson area using the interactive primitives (this is the core
     of the product — diagram-first, minimal text).
   - Video panel placeholder wired to VideoAsset slots (primary, alternate,
     remediation, worked-example, external resource). No hardcoded content.
   - Worked-example StepReveal. Context bridge panel: student's selected
     sport → neutral, visibly fading by phase.
2. /app/student/practice/[skillId]
   - One problem at a time, keyboard-first input, hint button, integrated
     visual support, immediate informative feedback (what + why, marked-up
     visual), misconception classification surfaced through the bounded
     AI-tutor panel (diagnosis, sport reframe, bridge to neutral).
   - Quiet momentum indicator. Track per attempt: correct, hints, time,
     attempts, misconception tags, context phase, sport-vs-neutral source.
     Every attempt appended to the immutable StudentAttempt log.
3. /app/student/summary
   - Attempted, accuracy, hints, mastery before/after with delta, detected
     weaknesses in plain language, verdict: advance / continue / review /
     remediate, next recommendation with reason. Precise, calm, useful.

CHECKPOINT — stop for Matt: full loop demo — home → learn → practice →
summary → updated recommendation — for both a struggling and an
accelerating student.

---

# PHASE 5 — Graph Inspector + compliance spine (paste after Phase 4 approved)

Read CLAUDE.md. Gates: mr-gates (everything here), mr-kahn (compliance fields).

1. /app/dev/graph (internal)
   - Import status banner, node/edge counts, schema/cycle/orphan/invalid-edge
     warnings with specifics, node detail (prereqs, dependents, standards
     codes, content-bank coverage per sport per phase), edge list,
     coverage report: which nodes are missing hooks/problems for which sports.
2. Compliance spine
   - Supabase schema (as migration files, NOT executed — human checkpoint):
     student_profiles, student_skill_state, student_attempts (insert-only),
     mastery_updates (insert-only), sessions. RLS plans per A3 portal
     patterns. Document the evidence-trail story: how an auditor
     reconstructs any mastery decision from logs.
   - Standards transcript view (internal): per student, per standard code,
     mastery status — the artifact an accreditor or registrar would ask for.
   - Stub instructor-interaction surfaces (message thread placeholder per
     student) to preserve NCAA nontraditional-course posture.
   - Privacy checklist executed: no trackers in student routes, PII
     minimization documented, COPPA parental-consent placeholder in
     onboarding, FERPA-aligned access notes in schema comments.

CHECKPOINT — stop for Matt: inspector demo + migration SQL for approval
BEFORE anything runs + the written evidence-trail explanation.

---

# PHASE 6 — Quality pass + investor readiness (paste after Phase 5 approved)

Read CLAUDE.md.

1. pee-wee performs a screen-by-screen audit against the bans and the bar
   ("could this appear in an investor demo without apology?"). mr-grunt
   fixes APPROVE WITH NOTES items.
2. mr-kahn audits all shipped content for mathematical correctness, sport
   authenticity, reading level, and transfer-gate integrity.
3. mr-gates runs the full check suite, reviews for dead code, dependency
   hygiene, and produces a technical-debt register.
4. Produce /docs/PLATFORM.md: how JSON import works, how validation works,
   how the mastery engine works, the three-phase progression, the
   compliance posture, and the build-next list (auth + Supabase wiring,
   teacher/parent/admin credential levels, LLM tutor seam, additional
   courses, accreditation application prep).

CHECKPOINT — stop for Matt: final demo, audit reports, PLATFORM.md, and the
prioritized build-next list. Nothing is committed without Matt's approval.
