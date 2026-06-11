# Phase 5 Spec — Graph Inspector + Compliance Spine (binding) — 2026-06-11

Folds mr-gates (architecture/schema/RLS — 12 changes + full schema shape) and
mr-kahn (compliance fields — 13 changes). Gates: mr-gates (everything) + mr-kahn
(compliance). NO pee-wee gate (internal tooling) but build with committed
components/ui primitives. SCOPE GUARD: migration SQL is FILES ONLY — NEVER executed
(CLAUDE.md human checkpoint). NO Supabase client wiring, NO new npm deps, NO running
SQL. dev routes notFound() in production. Do NOT touch data/algebra1-graph.json
(creditTier is DERIVED, not authored) or .authoring-tmp/.

## A. GRAPH INSPECTOR — app/dev/graph (replace placeholder)
Server component; `if (process.env.NODE_ENV === "production") notFound();` (verbatim from /dev/gallery). Read the graph JSON and call `validateGraph(graphJson)` DIRECTLY (NOT getRepository().getGraph() — that throws on invalid, so an invalid banner could never render). Render with committed ui primitives (Card, Table, StatusPill, Panels, PageHeader):
- Import-status banner: valid/invalid, schema.version, node/edge/domain counts.
- ValidationReport issues grouped by severity with specifics (cycle path, invalid edge endpoints, orphan id, missing-standards node, missing-hook node+sport, problem-mismatch, tier-mismatch, unknown-misconception-tag). Explicit "0 issues — graph valid" state, never a blank panel.
- Per-node detail: prereqs, dependents, standards (ccss + state + DERIVED creditTier), content-bank coverage (p1/p2/p3 counts per sport + workedExamples count), misconception tags, visual.
- Edge list.
- COVERAGE REPORT: node × sport × phase matrix of bank coverage (counts of contextHooks[sport] presence + problems[pX] length per node) — authoring-progress dashboard. PURE READ derived from the graph; no new engine logic, no new validation codes.
Pure read; no writes; no PII (graph only).

## B. /types ADDITIONS (additive stubs; mr-gates-approved shapes; mr-kahn fields). STUBS = types + migration tables only, NO business logic/wiring.
- types/compliance.ts (new):
  - CourseEnrollment { id; studentId; courseId; startedAt; expectedEndAt: string|null; completedAt: string|null; status: "active"|"completed"|"withdrawn"|"expired"; instructorId: string|null } — NCAA defined-timeframe pillar; the transcript references it.
  - MessageThread { id; studentId; instructorId: string|null; createdAt } ; Message { id; threadId; studentId; authorRole: "instructor"|"student"; authorId: string|null; body: string; skillId: string|null; attemptId: string|null; createdAt } — NCAA interaction; skillId+attemptId tie interaction to the student work. Append-only/edit-logged (same insert-only posture as evidence).
  - ConsentEvent { id; studentId; status: "pending"|"granted"|"revoked"; method: string|null; consentedByName: string|null; relationship: string|null; createdAt } — COPPA append-only consent audit (method specifics = needs counsel verification).
  - RecordAccessLog { id; actorId: string|null; actorRole: string; studentId; recordType: string; accessedAt } — FERPA read-audit stub (shape only, not built).
  - Transcript types: Confidenceless — StandardTranscriptRow { ccss: string; creditTier: "algebra1-credit"|"prerequisite-review"; status: MasteryStatus; componentSkillIds: string[]; masteredCount: number; totalCount: number; evidenceUpdateIds: string[] }; StudentStandardTranscript { studentId; courseId; graphSchemaVersion: string; generatedAt: string; creditBearing: StandardTranscriptRow[]; prerequisiteReview: StandardTranscriptRow[] }.
- These are additive; no `any`. Repository interface MAY gain stub read methods later — Phase 5 does NOT require new A3Repository methods (the transcript is computed from getGraph + getSkillStates; stubs are not wired).

## C. lib/transcript (new, PURE, unit-tested) — the standards explosion
buildStandardTranscript(graph: CurriculumGraph, states: Record<skillId, StudentSkillState>, masteryUpdates: MasteryUpdate[], opts: { studentId; courseId; generatedAt }) → StudentStandardTranscript.
- creditTier(node) DERIVED: "algebra1-credit" iff any ccss code has an HS conceptual-category prefix (A-/F-/N-/S-/G-); else "prerequisite-review". Document the exact prefix rule.
- Explode each node → its ccss[] codes. Group rows by ccss code.
- Per-standard status = WEAKEST-LINK (conjunctive): "mastered" ONLY if EVERY node carrying that code is mastered (sticky ever-mastered counts); else the least-advanced contributing node's status. Show masteredCount/totalCount ("1 of 3 component skills mastered"). NEVER any-node→mastered (over-claims) and NEVER a numeric average.
- Two sections: creditBearing (algebra1-credit codes) and prerequisiteReview. Credit/NCAA claims derive ONLY from creditBearing.
- Provenance: each row carries evidenceUpdateIds = the masteredAt MasteryUpdate ids of its contributing nodes (from masteryUpdates). Regenerable view, never stored — cannot drift from the log.
- Header records graph schema.version + generatedAt.

## D. STANDARDS TRANSCRIPT surface (internal, dev/staff-gated; notFound() in prod) — app/dev/transcript (or under /dev): renders buildStandardTranscript for a given studentId (from the in-memory repo / sample). Two sections (credit-bearing vs prerequisite-review), per-standard status + N-of-M + provenance link to update ids. NEVER ships to a student bundle.

## E. INSTRUCTOR-MESSAGE placeholder surface (internal/staff; notFound() in prod) — a read-only thread render of MessageThread/Message stub data (no send wiring — interaction-layer build-next). Demonstrates the NCAA interaction surface exists.

## F. MIGRATION SQL — supabase/migrations/0001_compliance_spine.sql — FILES ONLY, NOT EXECUTED
Header block: "NOT executed — Matt checkpoint before running"; uuid-PK divergence-from-portal rationale; insert-only mechanism (revoke+trigger); reversibility (paired down/teardown as commented block or 0001_down). Hard order: extensions (pgcrypto) → private app schema + SECURITY DEFINER helpers → tables → indexes → triggers → grants/revokes → RLS enable + policies → view → comments.
PK/FK strategy: uuid PKs default gen_random_uuid(), app-supplied (opaque string in /types === uuid in PG, no boundary translation). timestamptz timestamps. NO bigint identity on this spine. campus_id uuid null (deferred-FK per mr-gates #8; comment).
Tables (mr-gates specified columns):
- student_profiles (id uuid pk, display_name text not null [first-name-only COPPA comment], grade_level int, sport text check(7 sports), campus_id uuid null, parental_consent_status text check(pending/granted/revoked), parental_consent_updated_at timestamptz null, created_at). RLS: own + staff-by-campus.
- sessions (id uuid pk, student_id uuid not null → profiles on delete restrict, started_at, kind text null). RLS own + staff.
- student_skill_state (student_id → profiles ON DELETE CASCADE [derived/regenerable; comment], skill_id text [opaque graph id, NOT an FK — graph in JSON; comment], mastery numeric, status text check, phase smallint check(1..3), attempts/correct/hints int, time_ms bigint, recent jsonb not null default '[]', transfer boolean, last_attempt_at timestamptz null, mastered_at timestamptz null, PK(student_id, skill_id)). Mutable (not evidence). RLS student SELECT own, writes service-role.
- student_attempts (INSERT-ONLY): id uuid pk, student_id → profiles ON DELETE RESTRICT, skill_id text, problem_id text, phase smallint check(1..3), sport text, response text, correct boolean, hints_used int, time_ms bigint, misconception_tags text[] default '{}', is_probe boolean default false, source text default 'practice' check(practice/diagnostic), session_id uuid not null → sessions(id) on delete restrict, created_at. Indexes (student_id,skill_id,created_at),(session_id).
- mastery_updates (INSERT-ONLY): id uuid pk, student_id → profiles ON DELETE RESTRICT, skill_id text, attempt_id uuid null → student_attempts(id) on delete restrict, trigger text check(attempt/diagnostic/decay/credit-propagation), prev_mastery/new_mastery numeric, prev_status/new_status text, prev_phase/new_phase smallint, reason text, engine_version text, session_id uuid not null → sessions(id) on delete restrict, created_at. Indexes (student_id,skill_id,created_at),(attempt_id).
- STUB tables (insert-only where evidence): course_enrollments, message_threads, messages (insert-only + skill_id/attempt_id ref cols), consent_events (insert-only), record_access_log (insert-only). Columns mirror the /types stubs.
INSERT-ONLY enforcement (BOTH): REVOKE UPDATE, DELETE on student_attempts + mastery_updates + messages + consent_events + record_access_log FROM app roles; AND a BEFORE UPDATE OR DELETE trigger RAISE EXCEPTION 'append-only: % on % forbidden'. RLS WITH CHECK alone is insufficient (owner/service bypasses) — trigger is the guarantee. Comment which mechanism guards which threat.
RLS: SECURITY DEFINER helpers in private schema, all STABLE SECURITY DEFINER SET search_path = pg_catalog, app (pinned — unpinned = privilege-escalation reject): app.current_student_id(), app.current_campus_id(), app.is_staff_for_campus(campus). Policies reference helpers, NEVER inline subqueries against RLS-protected tables. Per mr-gates #3 sketch: students SELECT own / INSERT WITH CHECK own on logs (NO update/delete policy at all); staff SELECT by campus (teacher access to student work = NCAA); skill_state writes service-role only.
VIEW student_standard_transcript: per-skill projection (student_id, skill_id, status, mastered_at) — the durable projection; CCSS explosion happens in lib/transcript (graph not in PG). Comment this split.

## G. DOCS (docs/compliance/)
privacy-checklist.md (EXECUTED, not aspirational): no trackers in student routes — VERIFIED (mr-gates + mr-kahn both scanned app/ for gtag/analytics/segment/mixpanel/hotjar/fbq/posthog — zero real hits; the "Segmented"/"segments" matches are UI/comments). PII minimization (displayName first-name-only sole student-facing PII; StudentAttempt.response is math-only — flag any future free-text surface for re-review). COPPA parental-consent placeholder in onboarding. FERPA-aligned access notes (RecordAccessLog stub). needs-counsel flags listed.
evidence-trail.md: walk ONE concrete reconstruction (MasteryUpdate.attemptId → StudentAttempt[source,isProbe,sessionId] → session_id scoping → engineVersion/trigger/reason = full chain). State the INVARIANTS (mr-kahn): (1) decay/credit updates have attemptId null and are evaluated at write time — createdAt IS the nowIso an auditor replays with; (2) trigger:"attempt" updates MUST carry attemptId (a null one is an auditability defect; practice action already stamps it per Phase 4 §H); (3) engineVersion ("1.0.0") and graph schema.version ("1.7.x") are INDEPENDENT version lines — name where the engine changelog lives. Cover every transition type: fresh mastery, restoration, dip-demotion, decay-demotion, diagnostic credit, credit-propagation.
NCAA/COPPA/FERPA needs-counsel items explicitly flagged (consent method, school-consent-as-agent, state privacy statutes, current NCAA checklist).

## H. OPTIONAL (SHOULD, flag not block) — diagnostic attemptId enhancement (mr-kahn #6 recommend)
Populate MasteryUpdate.attemptId on trigger:"diagnostic" with the demonstrated node's neutral-P3 attempt id (leave null only for pure credit-propagation ancestors). Touches the committed diagnostic action — if it complicates, the evidence-trail doc invariant suffices for Phase 5; flag for a follow-up.

## I. TESTS
lib/transcript: creditTier prefix rule; weakest-link roll-up (all-mastered → mastered; one-unmastered → least-advanced + N-of-M); two-section split; provenance update-id wiring; header schema.version. Inspector: validateGraph-direct renders valid AND invalid (a crafted invalid graph → invalid banner + issues). No new deps; typecheck/lint/test/build green.

## J. CHECKPOINT (Matt)
Inspector demo + the migration SQL for approval BEFORE anything runs + the written evidence-trail explanation. Migration is NOT executed. Nothing committed without Matt.
