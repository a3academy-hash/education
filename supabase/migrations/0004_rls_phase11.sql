-- =============================================================================
-- 0004_rls_phase11.sql  —  A3 Virtual School / Algebra 1 / Phase 11B
-- RLS POLICY BODIES for the deny-all-baseline tables shipped by 0002 (identity)
-- and 0003 (curriculum/assessment/video/tutor), PLUS the parent-projection read
-- policies across the 0001 evidence tables, the transcript-view hardening, the
-- sessions staff reconciliation, and the record_access_log insert tightening.
-- This file writes ONLY policies (and one view ALTER) — no tables, no columns.
--
--   *** NOT EXECUTED — Matt checkpoint. ***
--   Per CLAUDE.md "Any schema migration before it runs" is a human checkpoint.
--   This file governs read access to the store of children's education records.
--   NO agent runs it. No psql / supabase / SQL was run to produce or verify this
--   file. Read it top-to-bottom; approve; THEN run via the Supabase migration
--   tooling, AFTER 0001, 0002, and 0003 have been applied.
--
-- ── SOURCE OF TRUTH ──────────────────────────────────────────────────────────
--   Authoritative spec: docs/design/phase11b-rls-spec.md, "GATE RESOLUTIONS —
--   BINDING" items B1–B15 + E1. Where this file and the spec body disagree, the
--   BINDING block wins (it supersedes the spec body). Binding item ids are cited
--   inline so the diff is auditable against the gate verdicts.
--
-- ── POLICY MECHANICS (binding B2/B3/B6) ──────────────────────────────────────
--   - EVERY policy is `TO authenticated` (never PUBLIC/anon). anon has no JWT and
--     no policy admits it → anon is denied everywhere (deny-case M-7 proves it).
--   - super_admin-all is expressed as `app.can_access_campus(null)` (binding B2):
--     the helper returns true for super_admin regardless of the target campus. No
--     new is_super_admin() helper is invented.
--   - NO policy inlines a subquery against an RLS-protected table (binding B6).
--     ALL scoping goes through the 0001/0002 SECURITY DEFINER helpers
--     (current_actor_id, current_student_id, can_access_campus, student_campus,
--     is_parent_of) which read their tables RLS-bypassed → no recursion.
--   - Curriculum + video reads use `using (true)` (binding B3): non-PII
--     curriculum metadata, readable by any authenticated caller. This is the ONLY
--     true-predicate read here besides the record_access_log insert tightening.
--
-- ── SERVICE-ROLE WRITES (binding B4/B5) ──────────────────────────────────────
--   Engine, curriculum-publish, grade-issuance, and video-upload WRITES go
--   through the Supabase `service_role` (RLS-BYPASSING, server-side ONLY —
--   Workstream C/D), NEVER the browser. Therefore there is deliberately NO app
--   write policy on: student_skill_state, grade_artifacts, curriculum_graphs,
--   curriculum_graph_activations, video_assets. RLS-on + no INSERT policy =
--   denied for authenticated/anon; the service_role bypasses RLS entirely. Where
--   a sibling table (video_assets read vs write; grade_artifacts read vs insert)
--   has an asymmetry, it is commented at the policy so nobody "helpfully" adds a
--   client write path.
--
-- ── PARENT READ GRANULARITY (binding E1 — MATT RULED (b) PROJECTION ONLY) ─────
--   Parent SELECT (via app.is_parent_of(student_id), which requires an ACTIVE
--   link AND currently-granted consent) is added to ONLY the projection tables:
--     student_profiles, student_skill_state, mastery_updates, course_enrollments,
--     consent_events, message_threads, messages, grade_artifacts.
--   NO parent SELECT on raw telemetry / non-projection tables:
--     student_attempts, diagnostic_estimates, tutor_exchanges, summative_results,
--     sessions, record_access_log.
--   (grade_artifacts is the credential the guardian is entitled to — a
--   projection-level record — so it gets parent read; summative_results is NOT in
--   the parent projection list → staff + own only.) Any raw read the parent
--   digest needs runs service_role server-side (Workstream C).
--
-- ── READ-ONLY INVARIANT (binding B9) — HARD ──────────────────────────────────
--   NO parent or staff INSERT/UPDATE/DELETE policy on ANY evidence or consent
--   table anywhere in this file. Parent and staff are READ-ONLY across the board.
--   The only INSERT policies here are own-row student inserts
--   (diagnostic_estimates, summative_results, tutor_exchanges) and the
--   actor-bound record_access_log insert. No UPDATE/DELETE policy exists anywhere
--   (append-only = the absence of any mutating policy + the 0001/0003 trigger +
--   revoke guards).
--
-- ── FERPA READ-AUDIT (binding B10/B11/B12) — PRODUCTION LAUNCH BLOCKER ────────
--   This file TIGHTENS the 0001 record_access_log_insert stub from
--   `with check (true)` to `with check (actor_id = app.current_actor_id())` so an
--   audit row cannot be spoofed under another actor's id. record_access_log gets
--   NO parent read policy (staff/audit surface only — binding B10; deny-case
--   M-9 proves it).
--   >>> DEFERRED, TRACKED, PRODUCTION LAUNCH BLOCKER (binding B12): the FERPA
--   read-audit WIRING — inserting a record_access_log row on EVERY staff/parent
--   SELECT of a student record — is NOT built in this file. May ship to STAGING
--   without it. MUST NOT certify / go to PRODUCTION with cross-record read open
--   and the read-audit unwired. Owner: interaction-layer build. <<<
--
-- ── TRANSCRIPT VIEW (binding B7) ─────────────────────────────────────────────
--   student_standard_transcript (0001) is set security_invoker = true so it runs
--   with the CALLER's privileges and is gated through its base table's RLS
--   (student_skill_state). This file adds parent + staff SELECT to
--   student_skill_state (0001 had own only) so the view is correctly scoped for
--   all three personas. Deny-case M-8 proves a student cannot read another
--   student's transcript via the view.
--
-- ── SESSIONS STAFF RECONCILE (binding B8) ────────────────────────────────────
--   0002 already reconciled sessions_select_staff to the campus path. This file
--   re-asserts the canonical body (drop+recreate) so 0004 is self-contained and
--   the down-block restores 0002's body. No parent sessions policy (scoped out).
--
-- ── PERSONA HONESTY (binding B13/B14) ────────────────────────────────────────
--   B13: a parent reads their OWN parent_student_links + current consent status
--   EVEN WHEN consent is revoked, so the UI renders "access paused" not "no
--   records." That link/consent read is gated by `parent_id =
--   app.current_actor_id()` — NOT by is_parent_of (which is false once revoked).
--   B14: coach AND campus_admin both get whole-campus READ via can_access_campus
--   (they differ in WRITE/admin power, not read scope). A roster-scoped coach
--   (coach↔student link) is a FUTURE model addition (backlog); the eventual
--   coach screen must not say "your roster" while showing the whole campus.
--
-- HARD ORDER (do not reorder): identity-table policies (0002) → curriculum/video
-- reads (0003) → student evidence/state policies (0003 new) → parent-projection
-- adds on the 0001 evidence tables → transcript view security_invoker → sessions
-- staff reconcile → record_access_log insert tighten → comments.
-- =============================================================================

begin;

-- ── 1. IDENTITY-TABLE POLICIES (0002 tables — deny-all baseline today) ────────

-- 1.1 parent_profiles — SELECT own (the parent's own profile row) + super_admin.
-- No INSERT/UPDATE/DELETE policy: parent rows are service-role provisioned (B4).
create policy parent_profiles_select_own on parent_profiles
  for select to authenticated
  using (id = app.current_actor_id());
create policy parent_profiles_select_super_admin on parent_profiles
  for select to authenticated
  using (app.can_access_campus(null));   -- B2: true only for super_admin

-- 1.2 staff_profiles — SELECT own + SELECT by campus. can_access_campus(campus_id)
-- already grants super_admin every campus AND campus_admin/coach their own, so a
-- separate super_admin policy is unnecessary here. Write = service-role (B4).
create policy staff_profiles_select_own on staff_profiles
  for select to authenticated
  using (id = app.current_actor_id());
create policy staff_profiles_select_campus on staff_profiles
  for select to authenticated
  using (app.can_access_campus(campus_id));

-- 1.3 parent_student_links — SELECT own (B13: gated by parent_id match, NOT
-- is_parent_of, so the link/consent status stays readable EVEN WHEN consent is
-- revoked — the UI shows "access paused", not "no records") + SELECT staff by the
-- student's campus. Write = service-role / future admin surface (B4); no student
-- or parent write policy.
create policy parent_student_links_select_own on parent_student_links
  for select to authenticated
  using (parent_id = app.current_actor_id());   -- B13: NOT is_parent_of
create policy parent_student_links_select_staff on parent_student_links
  for select to authenticated
  using (app.can_access_campus(app.student_campus(student_id)));


-- ── 2. CURRICULUM + VIDEO READS (0003 — non-PII curriculum metadata, B3) ──────

-- 2.1 curriculum_graphs / activations — readable by any authenticated caller
-- (curriculum metadata, no PII). NO write policy: publish path is service-role
-- (B4) and 0003 already revoked insert/update/delete from app roles.
create policy curriculum_graphs_select_authenticated on curriculum_graphs
  for select to authenticated
  using (true);
create policy curriculum_graph_activations_select_authenticated on curriculum_graph_activations
  for select to authenticated
  using (true);

-- 2.2 video_assets — readable by any authenticated caller (curriculum metadata,
-- not PII; the student then requests a SIGNED playback URL server-side). NO write
-- policy: video upload is service-role / server-side (Workstream D, B5). ASYMMETRY
-- (intentional): READ is wide-open-authenticated because the row is non-PII;
-- WRITE is service-role-only because issuing playable assets is a privileged,
-- server-side act. Do NOT add a client INSERT/UPDATE policy here.
create policy video_assets_select_authenticated on video_assets
  for select to authenticated
  using (true);


-- ── 3. STUDENT EVIDENCE & STATE POLICIES (0003 new tables) ────────────────────

-- 3.1 diagnostic_estimates — SELECT own + staff by campus; INSERT own (with check
-- on the denormalized student_id added in 0003, binding B1). NO parent policy
-- (E1 = (b): raw telemetry is NOT in the parent projection). NO update/delete
-- policy (0003 trigger + revoke enforce append-only).
create policy diagnostic_estimates_select_own on diagnostic_estimates
  for select to authenticated
  using (student_id = app.current_student_id());
create policy diagnostic_estimates_select_staff on diagnostic_estimates
  for select to authenticated
  using (app.can_access_campus(app.student_campus(student_id)));
create policy diagnostic_estimates_insert_own on diagnostic_estimates
  for insert to authenticated
  with check (student_id = app.current_student_id());   -- M-1: spoofing B → rejected

-- 3.2 summative_results — SELECT own + staff by campus; INSERT own. NO parent
-- policy: summative_results is NOT in the E1=(b) parent projection list (the
-- parent projection is profile/skill_state/mastery_updates/transcript/enrollments/
-- consent/messages + grade_artifacts) → staff + own only. Append-only via 0003.
create policy summative_results_select_own on summative_results
  for select to authenticated
  using (student_id = app.current_student_id());
create policy summative_results_select_staff on summative_results
  for select to authenticated
  using (app.can_access_campus(app.student_campus(student_id)));
create policy summative_results_insert_own on summative_results
  for insert to authenticated
  with check (student_id = app.current_student_id());

-- 3.3 grade_artifacts — SELECT own + staff by campus + PARENT (is_parent_of): the
-- grade artifact IS the credential the legal guardian is entitled to — a
-- projection-level record, not raw telemetry — so it gets parent read even under
-- E1=(b). NO INSERT policy: grade issuance is service-role (the grade engine
-- issues these, server-side; B4). ASYMMETRY vs video_assets (intentional): video
-- WRITE is denied via "no policy + revoke"; grade_artifacts WRITE is likewise
-- denied via "no policy" (0003 revoked update/delete; insert is simply never
-- granted a policy). Do NOT add a client INSERT policy here (deny-case M-2).
create policy grade_artifacts_select_own on grade_artifacts
  for select to authenticated
  using (student_id = app.current_student_id());
create policy grade_artifacts_select_staff on grade_artifacts
  for select to authenticated
  using (app.can_access_campus(app.student_campus(student_id)));
create policy grade_artifacts_select_parent on grade_artifacts
  for select to authenticated
  using (app.is_parent_of(student_id));   -- credential the guardian is entitled to

-- 3.4 tutor_exchanges — SELECT own + staff by campus; INSERT own. NO parent
-- policy (E1 = (b): raw tutor telemetry is NOT in the parent projection).
-- Append-only via 0003.
create policy tutor_exchanges_select_own on tutor_exchanges
  for select to authenticated
  using (student_id = app.current_student_id());
create policy tutor_exchanges_select_staff on tutor_exchanges
  for select to authenticated
  using (app.can_access_campus(app.student_campus(student_id)));
create policy tutor_exchanges_insert_own on tutor_exchanges
  for insert to authenticated
  with check (student_id = app.current_student_id());


-- ── 4. PARENT-PROJECTION READ POLICIES (binding E1 = (b)) ─────────────────────
-- Parent SELECT (via is_parent_of: active link AND consent currently granted —
-- revocation immediately denies, M-10) is ADDED to ONLY the projection tables.
-- Each is a READ policy only (B9: parent is never granted insert/update/delete).
-- 0001/0002 already gave these tables own + staff SELECT; this layers parent read
-- ON TOP (Postgres OR-combines permissive policies). The non-projection tables
-- (student_attempts, diagnostic_estimates, tutor_exchanges, summative_results,
-- sessions, record_access_log) DELIBERATELY get NO parent policy.

-- 4.1 student_profiles (projection).
create policy student_profiles_select_parent on student_profiles
  for select to authenticated
  using (app.is_parent_of(id));   -- the linked student's own profile row

-- 4.2 student_skill_state (projection) — ALSO the transcript view's base table.
-- 0001 shipped only own SELECT here; add parent + staff so the security_invoker
-- view (§5) is correctly gated for all three personas (B7).
create policy student_skill_state_select_parent on student_skill_state
  for select to authenticated
  using (app.is_parent_of(student_id));
create policy student_skill_state_select_staff on student_skill_state
  for select to authenticated
  using (app.can_access_campus(app.student_campus(student_id)));

-- 4.3 mastery_updates (projection).
create policy mastery_updates_select_parent on mastery_updates
  for select to authenticated
  using (app.is_parent_of(student_id));

-- 4.4 course_enrollments (projection).
create policy course_enrollments_select_parent on course_enrollments
  for select to authenticated
  using (app.is_parent_of(student_id));

-- 4.5 consent_events (projection).
create policy consent_events_select_parent on consent_events
  for select to authenticated
  using (app.is_parent_of(student_id));

-- 4.6 message_threads (projection).
create policy message_threads_select_parent on message_threads
  for select to authenticated
  using (app.is_parent_of(student_id));

-- 4.7 messages (projection).
create policy messages_select_parent on messages
  for select to authenticated
  using (app.is_parent_of(student_id));


-- ── 5. TRANSCRIPT VIEW — SECURITY INVOKER (binding B7) ────────────────────────
-- Default Postgres views run SECURITY DEFINER (the view OWNER's privileges),
-- which would BYPASS RLS on student_skill_state and leak every student's
-- transcript. PG15+ security_invoker = true makes the view run with the CALLER's
-- privileges so it is gated through student_skill_state's RLS (own + parent +
-- staff added above). Deny-case M-8 proves student B cannot read A's transcript.
alter view student_standard_transcript set (security_invoker = true);


-- ── 6. SESSIONS STAFF RECONCILE (binding B8) ─────────────────────────────────
-- Re-assert the canonical staff sessions read (0001 shipped a where-false
-- placeholder; 0002 reconciled it to the campus path). Drop+recreate so 0004 is
-- self-contained; the down-block restores 0002's body. NO parent sessions policy
-- (scoped out — B8). NO student INSERT change (0001 sessions_insert_own stands).
-- NOTE: this redo ALSO tightens the role from PUBLIC (0002's body omitted a role
-- clause → defaulted PUBLIC) to `to authenticated` — a real B3 fix, not just a
-- self-contained re-assert of the same body.
drop policy sessions_select_staff on sessions;
create policy sessions_select_staff on sessions
  for select to authenticated
  using (app.can_access_campus(app.student_campus(student_id)));


-- ── 7. RECORD_ACCESS_LOG INSERT TIGHTEN (binding B10/B11/B12) ─────────────────
-- Tighten the 0001 stub `with check (true)` to bind the audit row to the JWT
-- actor so an audit entry cannot be spoofed under another actor's id. Drop+
-- recreate; the down-block restores the 0001 `with check (true)` body. NO parent
-- read policy on record_access_log (staff/audit surface only — B10; deny-case
-- M-9). The 0002-reconciled record_access_log_select_staff stands unchanged.
-- PRODUCTION LAUNCH BLOCKER (B12): the FERPA read-audit WIRING (insert on every
-- staff/parent read of a student record) is DEFERRED — see header. Staging-OK;
-- NOT production/certification-OK while unwired.
drop policy record_access_log_insert on record_access_log;
create policy record_access_log_insert on record_access_log
  for insert to authenticated   -- B2/B3 invariant: EVERY policy TO authenticated (no behavior change — the actor-bound with check already excludes anon, which has no actor_id)
  with check (actor_id = app.current_actor_id());


-- ── 8. COMMENTS (carry the 0004 rationale into the live catalog) ──────────────
comment on policy parent_student_links_select_own on parent_student_links is
  'B13: gated by parent_id = current_actor_id() (NOT is_parent_of) so the link + consent status stays readable even when consent is revoked — UI renders "access paused", not "no records".';
comment on policy video_assets_select_authenticated on video_assets is
  'B3/B5 asymmetry: READ is authenticated-wide (non-PII metadata); WRITE is service-role only (no client write policy). Do not add a client INSERT/UPDATE policy.';
comment on policy grade_artifacts_select_parent on grade_artifacts is
  'E1=(b) exception: the credential the legal guardian is entitled to (projection-level), so parent read is granted. Issuance is service-role (no client INSERT policy — B4/M-2).';
comment on policy diagnostic_estimates_insert_own on diagnostic_estimates is
  'B1: with check binds the row to current_student_id() so a student cannot forge an estimate for another student (deny-case M-1).';
comment on policy record_access_log_insert on record_access_log is
  'B11: tightened from the 0001 with-check(true) stub to actor_id = current_actor_id() (no spoofing). B12: read-audit WIRING (insert on every read) is DEFERRED — PRODUCTION LAUNCH BLOCKER.';

commit;


-- =============================================================================
-- TEARDOWN (reversibility) — DESTRUCTIVE. Run as 0004_down.sql / separate
-- checkpoint. Reverses 0004 in dependency order: drops all 0004 policies; then
-- RESTORES the upstream bodies this file replaced — sessions_select_staff back to
-- 0002's campus body (NOT 0001's where-false; rolling back 0004 must not strand
-- it on the 0001 placeholder while 0002 is still applied), record_access_log_insert
-- back to the 0001 with-check(true) stub, and the transcript view back to the
-- default (security_invoker off). NOT part of the apply above.
--
-- ROLLBACK ORDER (HARD): run 0004-down BEFORE 0002-down. 0004-down restores
-- 0002's policy bodies (sessions_select_staff → 0002's campus body;
-- record_access_log_insert → the 0001 with-check(true) stub that 0002 left in
-- place). Running 0002-down FIRST strands sessions_select_staff /
-- record_access_log_insert on the wrong upstream body. Always: 0004-down, then
-- 0002-down.
-- =============================================================================
-- begin;
--   -- 7'. Restore the 0001 record_access_log_insert stub body.
--   drop policy record_access_log_insert on record_access_log;
--   create policy record_access_log_insert on record_access_log
--     for insert with check (true);
--
--   -- 6'. Restore the 0002 sessions_select_staff campus body (NOT 0001's where-false;
--   --     0002 remains applied beneath 0004). DELIBERATELY restores the PUBLIC-role
--   --     0002 body (no role clause → PUBLIC): rolling back 0004 must hand the
--   --     policy back exactly as 0002 left it; the PUBLIC→authenticated tightening
--   --     is 0004's, so it is correctly undone here.
--   drop policy sessions_select_staff on sessions;
--   create policy sessions_select_staff on sessions
--     for select using (app.can_access_campus(app.student_campus(student_id)));
--
--   -- 5'. Revert the transcript view to default (definer) semantics.
--   alter view student_standard_transcript reset (security_invoker);
--
--   -- 4'. Drop the parent-projection read policies.
--   drop policy messages_select_parent            on messages;
--   drop policy message_threads_select_parent     on message_threads;
--   drop policy consent_events_select_parent      on consent_events;
--   drop policy course_enrollments_select_parent  on course_enrollments;
--   drop policy mastery_updates_select_parent     on mastery_updates;
--   drop policy student_skill_state_select_staff  on student_skill_state;
--   drop policy student_skill_state_select_parent on student_skill_state;
--   drop policy student_profiles_select_parent    on student_profiles;
--
--   -- 3'. Drop the 0003 student evidence/state policies.
--   drop policy tutor_exchanges_insert_own        on tutor_exchanges;
--   drop policy tutor_exchanges_select_staff      on tutor_exchanges;
--   drop policy tutor_exchanges_select_own        on tutor_exchanges;
--   drop policy grade_artifacts_select_parent     on grade_artifacts;
--   drop policy grade_artifacts_select_staff      on grade_artifacts;
--   drop policy grade_artifacts_select_own        on grade_artifacts;
--   drop policy summative_results_insert_own      on summative_results;
--   drop policy summative_results_select_staff    on summative_results;
--   drop policy summative_results_select_own      on summative_results;
--   drop policy diagnostic_estimates_insert_own   on diagnostic_estimates;
--   drop policy diagnostic_estimates_select_staff on diagnostic_estimates;
--   drop policy diagnostic_estimates_select_own   on diagnostic_estimates;
--
--   -- 2'. Drop the curriculum/video read policies.
--   drop policy video_assets_select_authenticated on video_assets;
--   drop policy curriculum_graph_activations_select_authenticated on curriculum_graph_activations;
--   drop policy curriculum_graphs_select_authenticated on curriculum_graphs;
--
--   -- 1'. Drop the identity-table policies.
--   drop policy parent_student_links_select_staff on parent_student_links;
--   drop policy parent_student_links_select_own  on parent_student_links;
--   drop policy staff_profiles_select_campus     on staff_profiles;
--   drop policy staff_profiles_select_own        on staff_profiles;
--   drop policy parent_profiles_select_super_admin on parent_profiles;
--   drop policy parent_profiles_select_own       on parent_profiles;
-- commit;
-- =============================================================================
