# PHASE 7 — Trust & Credit Layer (paste after Phase 6 approved)

Read CLAUDE.md. This phase answers three operator questions: (1) is the child
actually learning, (2) can an admin/parent see what the AI is doing and why,
(3) how does the course produce a defensible Florida grade. Four workstreams,
each gated per CLAUDE.md.

## MODEL PLAN (run /model at each switch; cheapest model that handles the job)
- Workstream A (admin views):        OPUS  — read-only UI over existing logs.
- Workstream B (parent digest):      OPUS  — rendering + copy; pee-wee gates quality.
- Workstream C (retention probes):   FABLE — engine-adjacent scheduling logic;
  one wrong interaction with decay/routing cascades. Switch to Fable for the
  DESIGN + gate reviews + implementation; back to Opus for test cleanup.
- Workstream D (summative/grading):  SPLIT —
    - FABLE for: blueprint design, seeded form-assembly algorithm, grade-
      composition logic, held-out integrity validator rule (checkpoint 3 and
      everything before it).
    - OPUS for: assessment bank authoring batches (templated content — same
      job the practice banks used Opus for) and the docs/compliance write-ups.
- Order the work A → B → C → D so the Opus stretch runs first and the Fable
  budget concentrates where reasoning density is highest.

Hard constraint for the whole phase: NOTHING here changes how mastery is
computed or how routing decides. Workstreams A and B are read-only views over
the existing evidence logs. Workstream C adds probe SCHEDULING only — probes
are served and scored through the existing engine unchanged. Workstream D is
a separate grading layer downstream of mastery. mr-kahn rejects any design
that lets reporting or grading leak back into the adaptive loop.

---

## A. Admin Decision Log & Student Insight (per-student "what is the AI doing")

Route: /admin/students/[studentId] (staff-only; reuse Phase 5 RLS posture —
students/parents can never reach it).

1. DECISION TIMELINE — the centerpiece. A reverse-chronological narrative
   rendered from existing immutable logs (mastery_updates.reason,
   student_attempts, recommendation history). Each entry reads as a sentence
   an academic director would write:
   "Jun 10 — Detected prerequisite gap in Rational Number Operations while
   attempting Multi-Step Equations. Routed backward. 3 sessions, 14 attempts,
   transfer proven Jun 14. Resumed Multi-Step Equations."
   Group consecutive attempts into session-level entries; expandable to the
   raw attempt rows (the audit view). Every entry links the evidence:
   attemptIds, masteryUpdate ids, engineVersion.
2. LIVE MASTERY MAP — the student's overlay rendered visually: per-domain
   bars, per-node status chips, current recommendation + its reason, locked
   nodes with what blocks them, diagnostic-credited nodes marked as such.
3. FLAGS PANEL — deterministic, rule-based (no LLM judgments): stalled node
   (≥3 sessions without status improvement), high hint dependence, rushing
   (time-on-task floor breaches), decayed-mastery review queue, retention
   probes due (workstream C), days since last session.
4. ROSTER VIEW — /admin/students: one row per student — current node, status,
   last active, open flags count. Sortable. This is the "is the AI working
   across the whole school" screen.

Gates: mr-gates (read-model + RLS), pee-wee (admin screens are internal but
must still be calm and scannable), mr-kahn (the narrative templates must be
faithful to what the engine actually did — no editorializing).

---

## B. Parent/Student Progress Digest

Route: /student/progress (student + parent visible; self-scoped).

1. WEEKLY DIGEST VIEW — plain-language, grades-6-8-parent register:
   skills mastered this week (with what they unlock), current focus and the
   engine's reason in one sentence, time on task, and "what's next." No
   percentages on unmeasured domains (carry the Phase 3 honesty rule).
2. MASTERY TRANSCRIPT (family view) — the per-standard credit artifact from
   Phase 5, rendered readable: standard code → plain-language description →
   status → date proven. This is what a parent shows a receiving school.
3. Architecture: render-on-demand from logs now; structure the digest query
   so a later email job (Resend, like the GameChanger pipeline) can reuse it
   unchanged. Do NOT build email sending in this phase.

Gates: pee-wee (this is a paying-family surface — full quality bar),
mr-kahn (claims must be evidence-backed; no inflated language).

---

## C. Retention Probes (closing the "proved it in September, never re-checked" gap)

Engine change — mr-kahn + mr-gates both gate the design before any code.

1. Scheduling rule (deterministic, config-driven in MASTERY_CONFIG):
   every mastered node accrues a retention-check due date — first probe at
   +21 days, then +60, then +120 (config values; changing them is a human
   checkpoint). Diagnostic-credited nodes get FIRST priority — they were
   never directly taught here, so their first probe lands at +14 days.
2. Serving rule: at most ONE retention probe injected per practice session,
   drawn from the node's P3 (neutral) bank, items the student has never seen
   (held-out-aware once workstream D lands). Framed in UI exactly as
   pee-wee's "90-second tune-up" — a feature, not remedial punishment.
3. Outcome: correct → masteredAt-style retention timestamp advances, next
   probe pushed to the next interval. Incorrect → existing decay/needs_review
   machinery takes over (NO new demotion path — reuse what Phase 1 built).
4. Tests: probe scheduling determinism, one-per-session cap, credited-node
   priority, correct/incorrect outcome wiring, and an isolation test proving
   probe scheduling never alters recommendation order for non-due students.

---

## D. Summative Assessment & Florida-Defensible Grading

This is the credit layer. mr-kahn gates everything; mr-gates gates the
held-out-bank integrity model.

1. HELD-OUT QUESTION BANKS — new per-node assessment banks (a1/a2/a3 forms),
   authored by mr-kahn via the batch process, P3-NEUTRAL ONLY, standards-
   mapped per item, structurally validated like practice banks. Hard
   invariant, enforced by validator rule: zero overlap with practice banks
   and worked examples (the F11 transfer-dup lesson, made law). Practice
   serving must never draw from assessment banks.
2. SUMMATIVE ENGINE — lib/summative: deterministic per-student form assembly
   (seeded randomization from studentId + formId so every student gets a
   different but equivalent form; reproducible for audit), blueprint-driven
   (N items per domain weighted by standards coverage), timed, one sitting,
   no hints, no AI tutor. Results logged to the immutable spine with
   source:"summative".
3. GRADE COMPOSITION — config-driven, default: mastery transcript 70%
   (percent of standards at mastered, from the engine) + proctored summative
   30%. Output: a course grade artifact (letter + percent + per-standard
   breakdown) attached to the Phase 5 transcript view. The artifact must
   state its own methodology — that's what a registrar or NCAA reviewer
   reads.
4. PROCTORING POSTURE — stub only: a session record carries proctorId,
   location, attestation. No video/lockdown tooling in this phase; document
   the gap in docs/compliance/ as a certification-time item.
5. EOC ALIGNMENT NOTE — docs/compliance/florida-credit.md: how the grade
   artifact + voluntary B.E.S.T. Algebra 1 EOC participation protects
   transfer students under F.S. 1003.4282, and the open counsel questions
   (whether our summative qualifies as the transferring-entity assessment
   exception; FDOE survey registration; accreditation path). Mark every
   jurisdiction-specific claim "verify with counsel."

---

## CHECKPOINTS (stop for Matt)
1. After A+B designs are gated, before implementation (screens + read models).
2. After C's scheduling design is gated, before any engine-adjacent code.
3. After D's blueprint + grade-composition config — BEFORE any assessment
   bank authoring begins (the banks are expensive; the blueprint must be
   right first).
4. End of phase: full demo — admin timeline for a simulated student showing
   gap→remediation→retention probe→summative→grade artifact, plus the parent
   digest for the same student.
