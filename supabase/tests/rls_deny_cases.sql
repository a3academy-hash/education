-- =============================================================================
-- rls_deny_cases.sql  —  A3 Virtual School / Algebra 1 / Phase 11B
-- RUNNABLE RLS deny-case assertion suite (binding B15). PROVES the locks in
-- 0004 hold: default-deny, cross-student isolation, append-only, parent gating
-- (projection-only, consent-precise, revocation-immediate), staff campus
-- scoping, anon-locked, and the transcript-view non-leak.
--
--   *** NOT EXECUTED — Matt runs this AFTER applying 0001→0004. ***
--   No psql / supabase / SQL was run to produce or verify this file.
--
-- ── HOW TO RUN ───────────────────────────────────────────────────────────────
--   PRECONDITION: the suite assumes the `anon` and `authenticated` roles already
--   exist and the runner can `set role` to them (true on Supabase out of the box;
--   bare Postgres would need `create role anon;` / `create role authenticated;`
--   first, and the runner granted membership to set role to them).
--   1. Apply migrations 0001, 0002, 0003, 0004 to a Postgres that matches the
--      Supabase setup (the `authenticated`/`anon` roles + the request.jwt.claims
--      GUC convention the app.* helpers read).
--   2. Run this whole file in one psql session AS A ROLE SUBJECT TO RLS — i.e.
--      `set role authenticated;` is issued in the preamble. (The migration OWNER
--      bypasses RLS, so running as the owner would FALSE-PASS every read test.)
--   3. The script raises an exception and aborts at the FIRST failed assertion
--      (assert_count / the savepoint-wrapped expected-raise checks). A clean run
--      that reaches "ALL DENY CASES PASSED" with no raise = all assertions held.
--
-- ── SEED MODEL (self-contained, rolled back) ─────────────────────────────────
--   The WHOLE script runs inside ONE transaction that ROLLS BACK at the end, so
--   it leaves NO rows behind. The seed is inserted as the table OWNER context
--   BEFORE `set role authenticated`, because the app revokes/RLS would otherwise
--   block the seed inserts themselves. Minimal fixture (fixed uuids so the
--   set-claims JWTs can reference them):
--     Campus X = 11111111-...-0001 ; Campus Y = 11111111-...-0002
--     Student A (campus X) = aaaaaaaa-...-000a
--     Student B (campus Y) = bbbbbbbb-...-000b
--     Parent P  (linked→A, consent GRANTED)            = cccccccc-...-000c
--     Parent Q  (linked→A, consent PENDING)            = dddddddd-...-000d
--     Parent R  (linked→A, link REVOKED, consent granted event) = eeeeeeee-...-000e
--     Coach CX (campus X)        = f0000000-...-00cx
--     Admin AX (campus_admin, X) = f0000000-...-00ax
--     Super S  (super_admin)     = f0000000-...-00ss
--   Each principal is impersonated with
--     set local request.jwt.claims = '{ "sub": "...", "student_id": "...",
--       "actor_id": "...", "campus_id": "..." }';
--   The student JWT carries student_id (read by current_student_id); staff/parent
--   JWTs carry actor_id (read by current_actor_id). claims are RESET to '{}'
--   between principals (NIT, binding B15).
--
-- ── ASSERTION HELPERS ────────────────────────────────────────────────────────
--   assert_count(sql, expected) — runs a scalar count query, raises on mismatch.
--   Expected-RAISE tests (insert spoof / append-only mutate) are wrapped in a
--   SAVEPOINT so the expected exception does not abort the whole script (B15 NIT);
--   the handler asserts an exception DID occur and rolls back to the savepoint.
--
-- ── COVERAGE (binding B15) ───────────────────────────────────────────────────
--   Original 7: cross-student read isolation; client mutate denied; parent
--   linked/consent gating; staff campus scoping + super_admin cross; student
--   cannot read others' staff/parent profiles; anon locked; curriculum/video
--   readable-not-writable.
--   M-1  cross-student INSERT spoofing rejected by with check.
--   M-2  authenticated cannot insert grade_artifacts.
--   M-3  authenticated cannot insert curriculum_graphs/activations/video_assets.
--   M-4  consent precision: linked+pending → 0; link-revoked+consent-granted → 0.
--   M-5  campus_admin cannot read another campus's identity; super_admin can.
--   M-6  coach (campus X) gets 0 on parent_student_links for a campus-Y student
--        WHOSE LINK ACTUALLY EXISTS in the seed → proves campus scoping, not absence.
--   M-7  anon on curriculum/video → 0/denied.
--   M-8  transcript view leak: student B reading A's transcript → 0.
--   M-9  linked+granted parent gets 0 on record_access_log.
--   M-10 revocation WITHOUT re-auth: granted parent N → repoint consent to
--        revoked, SAME JWT → 0.
-- =============================================================================

begin;

-- ── 0. ASSERTION HELPERS (temp, dropped with the rollback) ───────────────────
create or replace function pg_temp.assert_count(p_sql text, p_expected bigint, p_label text)
returns void
language plpgsql
as $$
declare
  v_actual bigint;
begin
  execute 'select count(*) from (' || p_sql || ') _q' into v_actual;
  if v_actual is distinct from p_expected then
    raise exception 'DENY-CASE FAIL [%]: expected % rows, got %', p_label, p_expected, v_actual;
  end if;
  raise notice 'PASS [%]: % rows', p_label, v_actual;
end;
$$;


-- ── 1. SEED (as the migration owner, BEFORE set role authenticated) ───────────
-- These inserts run with owner privileges (RLS-bypassed) so the fixture lands
-- regardless of the policies under test. Fixed uuids keep the JWTs readable.
insert into student_profiles (id, display_name, grade_level, sport, campus_id, parental_consent_status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','Ada', 7,'neutral','11111111-1111-1111-1111-111111110001','granted'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b','Ben', 7,'soccer', '11111111-1111-1111-1111-111111110002','granted');

insert into sessions (id, student_id, kind)
values
  ('a5e55101-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','diagnostic'),
  ('a5e55101-0000-0000-0000-0000000000b1','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b','diagnostic');

insert into student_skill_state (student_id, skill_id, mastery, status, phase)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','N-FOUND-01', 0.9,'mastered',3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b','N-FOUND-01', 0.4,'developing',1);

insert into student_attempts
  (id, student_id, skill_id, problem_id, phase, sport, response, correct, session_id, graph_version, engine_version)
values
  ('a77e3401-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','N-FOUND-01','p1',3,'neutral','42',true ,'a5e55101-0000-0000-0000-0000000000a1','v1','e1'),
  ('a77e3401-0000-0000-0000-0000000000b1','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b','N-FOUND-01','p1',1,'soccer','7' ,false,'a5e55101-0000-0000-0000-0000000000b1','v1','e1');

insert into mastery_updates
  (id, student_id, skill_id, attempt_id, trigger, prev_mastery, new_mastery, prev_status, new_status, prev_phase, new_phase, reason, engine_version, session_id, graph_version)
values
  ('a409da7e-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','N-FOUND-01','a77e3401-0000-0000-0000-0000000000a1','attempt',0.8,0.9,'near_mastery','mastered',3,3,'correct neutral transfer','e1','a5e55101-0000-0000-0000-0000000000a1','v1');

insert into course_enrollments (id, student_id, course_id)
values ('c0073501-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','algebra-1');

insert into message_threads (id, student_id)
values ('17e0ad01-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a');

insert into messages (id, thread_id, student_id, author_role, body)
values ('13e55a01-0000-0000-0000-0000000000a1','17e0ad01-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','instructor','Nice work on N-FOUND-01.');

-- consent events for Student A (one granted, one revoked — links point at these).
insert into consent_events (id, student_id, status, method, consented_by_name, relationship)
values
  ('c0d5e401-0000-0000-0000-00000000a001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','granted','email','Parent P','parent'),
  ('c0d5e401-0000-0000-0000-00000000a002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','revoked','email','Parent P','parent'),
  ('c0d5e401-0000-0000-0000-00000000a003','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','pending','email','Parent Q','parent'),
  ('c0d5e401-0000-0000-0000-00000000a004','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','granted','email','Parent R','parent');

-- diagnostic_estimates + summative + grade + tutor + video for read/insert tests.
insert into diagnostic_estimates
  (id, session_id, student_id, skill_id, confidence, evidence_kind, credited, graph_version, engine_version)
values
  ('d1a93e01-0000-0000-0000-0000000000a1','a5e55101-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','N-FOUND-01','high','directly-probed',true,'v1','e1');

insert into summative_results (id, student_id, course_id, form_id, score, graph_version, engine_version)
values ('50133a01-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','algebra-1','form-1',88,'v1','e1');

insert into grade_artifacts (id, student_id, course_id, version, letter, percent, composition, graph_version, engine_version)
values ('64adea01-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','algebra-1',1,'B+',88,
        '{"credited_skill_count":40,"total_skill_count":74}'::jsonb,'v1','e1');

insert into tutor_exchanges (id, student_id, role, prompt)
values ('70704e01-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','hint','How do I start?');

insert into curriculum_graphs (graph_version, schema_version, graph)
values ('v1','1.0','{}'::jsonb);
insert into curriculum_graph_activations (id, graph_version)
values ('ac718e01-0000-0000-0000-0000000000a1','v1');

insert into video_assets (id, skill_id, playback_id, kind)
values ('71de0a01-0000-0000-0000-0000000000a1','N-FOUND-01','pb-1','lesson');

insert into record_access_log (id, actor_id, actor_role, student_id, record_type)
values ('a00e5501-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-0000000000ax','campus_admin','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','student_profiles');

-- identity rows.
insert into parent_profiles (id, display_name, email)
values
  ('cccccccc-cccc-cccc-cccc-cccccccc000c','Parent P','p@ex.com'),
  ('dddddddd-dddd-dddd-dddd-dddddddd000d','Parent Q','q@ex.com'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeee000e','Parent R','r@ex.com');

insert into staff_profiles (id, display_name, role, campus_id)
values
  ('f0000000-0000-0000-0000-0000000000cx','Coach X','coach','11111111-1111-1111-1111-111111110001'),
  ('f0000000-0000-0000-0000-0000000000ax','Admin X','campus_admin','11111111-1111-1111-1111-111111110001'),
  ('f0000000-0000-0000-0000-0000000000ss','Super S','super_admin',null);

-- links: P granted (→granted event), Q pending (→pending event), R revoked link
-- (status revoked) but its consent pointer is a GRANTED event (proves the link
-- lifecycle, not just the event status, must be active — M-4 / B13).
-- Plus ONE campus-Y link (Parent P → Student B, campus Y) that genuinely EXISTS,
-- so M-6 proves campus SCOPING (coach X gets 0 rows for a real campus-Y link),
-- not merely the absence of any campus-Y link row.
insert into parent_student_links (parent_id, student_id, relationship, status, current_consent_event_id)
values
  ('cccccccc-cccc-cccc-cccc-cccccccc000c','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','parent','active','c0d5e401-0000-0000-0000-00000000a001'),
  ('dddddddd-dddd-dddd-dddd-dddddddd000d','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','parent','active','c0d5e401-0000-0000-0000-00000000a003'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeee000e','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','parent','revoked','c0d5e401-0000-0000-0000-00000000a004'),
  ('cccccccc-cccc-cccc-cccc-cccccccc000c','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b','parent','active','c0d5e401-0000-0000-0000-00000000a001');


-- ── 2. ENTER RLS-SUBJECT CONTEXT ─────────────────────────────────────────────
-- Everything below runs as `authenticated` (RLS enforced). The owner bypass that
-- let the seed land no longer applies.
set role authenticated;


-- =============================================================================
-- ORIGINAL 7 + M-series. claims reset to '{}' between principals (B15 NIT).
-- =============================================================================

-- ── O1 + 5: STUDENT B impersonation — cross-student read isolation ────────────
-- Student B must see ZERO of Student A's rows across every evidence/projection
-- table, and zero staff/parent profile rows that are not B's own actor.
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b","student_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b","actor_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b"}';

select pg_temp.assert_count($$select 1 from student_profiles    where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,                0,'O1 B reads A profile');
select pg_temp.assert_count($$select 1 from student_skill_state where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,        0,'O1 B reads A skill_state');
select pg_temp.assert_count($$select 1 from student_attempts    where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,        0,'O1 B reads A attempts');
select pg_temp.assert_count($$select 1 from mastery_updates     where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,        0,'O1 B reads A mastery_updates');
select pg_temp.assert_count($$select 1 from diagnostic_estimates where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,       0,'O1 B reads A diagnostic_estimates');
select pg_temp.assert_count($$select 1 from summative_results   where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,        0,'O1 B reads A summative_results');
select pg_temp.assert_count($$select 1 from grade_artifacts     where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,        0,'O1 B reads A grade_artifacts');
select pg_temp.assert_count($$select 1 from tutor_exchanges     where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,        0,'O1 B reads A tutor_exchanges');
select pg_temp.assert_count($$select 1 from sessions           where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,        0,'O1 B reads A sessions');
-- O5: a student sees NO staff/parent profile rows (none are their own actor).
select pg_temp.assert_count($$select 1 from staff_profiles$$,  0,'O5 B reads staff_profiles');
select pg_temp.assert_count($$select 1 from parent_profiles$$, 0,'O5 B reads parent_profiles');
-- sanity: B CAN read B's own profile (positive control).
select pg_temp.assert_count($$select 1 from student_profiles where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b'$$, 1,'O1 B reads B own profile');

-- ── M-8: transcript view leak — B reading A's transcript rows → 0 ─────────────
select pg_temp.assert_count($$select 1 from student_standard_transcript where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 0,'M-8 B reads A transcript view');
select pg_temp.assert_count($$select 1 from student_standard_transcript where student_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b'$$, 1,'M-8 B reads B own transcript (control)');

reset request.jwt.claims;


-- ── O2 + M-1: STUDENT A — append-only mutate denied + cross-student INSERT spoof
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a","student_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a","actor_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a"}';

-- O2: client cannot UPDATE/DELETE evidence (revoke + append-only trigger fire).
savepoint sp_o2a;
do $$ begin
  update student_attempts set correct=false where id='a77e3401-0000-0000-0000-0000000000a1';
  raise exception 'DENY-CASE FAIL [O2 update attempt]: update was permitted';
exception when others then
  if sqlerrm like 'DENY-CASE FAIL%' then raise; end if;
  raise notice 'PASS [O2 update attempt]: rejected (%).', sqlerrm;
end $$;
rollback to savepoint sp_o2a;

savepoint sp_o2b;
do $$ begin
  delete from mastery_updates where id='a409da7e-0000-0000-0000-0000000000a1';
  raise exception 'DENY-CASE FAIL [O2 delete mastery_update]: delete was permitted';
exception when others then
  if sqlerrm like 'DENY-CASE FAIL%' then raise; end if;
  raise notice 'PASS [O2 delete mastery_update]: rejected (%).', sqlerrm;
end $$;
rollback to savepoint sp_o2b;

-- B9: client cannot UPDATE consent_events (read-only invariant on consent).
savepoint sp_b9;
do $$ begin
  update consent_events set status='granted' where id='c0d5e401-0000-0000-0000-00000000a002';
  raise exception 'DENY-CASE FAIL [B9 update consent]: update was permitted';
exception when others then
  if sqlerrm like 'DENY-CASE FAIL%' then raise; end if;
  raise notice 'PASS [B9 update consent]: rejected (%).', sqlerrm;
end $$;
rollback to savepoint sp_b9;

-- M-1: Student A inserts a diagnostic_estimate spoofing student_id = B → with
-- check rejects. (A's own session is reused; the with check is on student_id.)
savepoint sp_m1;
do $$ begin
  insert into diagnostic_estimates
    (session_id, student_id, skill_id, confidence, evidence_kind, credited, graph_version, engine_version)
  values
    ('a5e55101-0000-0000-0000-0000000000a1','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b','N-FOUND-01','high','directly-probed',true,'v1','e1');
  raise exception 'DENY-CASE FAIL [M-1 spoof insert]: insert as student B was permitted';
exception when others then
  if sqlerrm like 'DENY-CASE FAIL%' then raise; end if;
  raise notice 'PASS [M-1 spoof insert]: rejected (%).', sqlerrm;
end $$;
rollback to savepoint sp_m1;

-- M-1 positive control: A CAN insert its own diagnostic_estimate.
savepoint sp_m1ok;
insert into diagnostic_estimates
  (session_id, student_id, skill_id, confidence, evidence_kind, credited, graph_version, engine_version)
values
  ('a5e55101-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','N-FOUND-01','high','directly-probed',true,'v1','e1');
rollback to savepoint sp_m1ok;

-- M-2: authenticated cannot insert grade_artifacts (no INSERT policy → denied).
savepoint sp_m2;
do $$ begin
  insert into grade_artifacts (student_id, course_id, version, composition, graph_version, engine_version)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a','algebra-1',2,'{}'::jsonb,'v1','e1');
  raise exception 'DENY-CASE FAIL [M-2 grade insert]: insert was permitted';
exception when others then
  if sqlerrm like 'DENY-CASE FAIL%' then raise; end if;
  raise notice 'PASS [M-2 grade insert]: rejected (%).', sqlerrm;
end $$;
rollback to savepoint sp_m2;

-- M-3: authenticated cannot insert curriculum/video (revoke path → denied).
savepoint sp_m3a;
do $$ begin
  insert into curriculum_graphs (graph_version, schema_version, graph) values ('v2','1.0','{}'::jsonb);
  raise exception 'DENY-CASE FAIL [M-3 curriculum_graphs insert]: insert was permitted';
exception when others then
  if sqlerrm like 'DENY-CASE FAIL%' then raise; end if;
  raise notice 'PASS [M-3 curriculum_graphs insert]: rejected (%).', sqlerrm;
end $$;
rollback to savepoint sp_m3a;

savepoint sp_m3b;
do $$ begin
  insert into curriculum_graph_activations (graph_version) values ('v1');
  raise exception 'DENY-CASE FAIL [M-3 activations insert]: insert was permitted';
exception when others then
  if sqlerrm like 'DENY-CASE FAIL%' then raise; end if;
  raise notice 'PASS [M-3 activations insert]: rejected (%).', sqlerrm;
end $$;
rollback to savepoint sp_m3b;

savepoint sp_m3c;
do $$ begin
  insert into video_assets (skill_id, playback_id) values ('N-FOUND-01','pb-x');
  raise exception 'DENY-CASE FAIL [M-3 video insert]: insert was permitted';
exception when others then
  if sqlerrm like 'DENY-CASE FAIL%' then raise; end if;
  raise notice 'PASS [M-3 video insert]: rejected (%).', sqlerrm;
end $$;
rollback to savepoint sp_m3c;

-- O7: curriculum/video READABLE by an authenticated student (non-PII).
select pg_temp.assert_count($$select 1 from curriculum_graphs where graph_version='v1'$$, 1,'O7 student reads curriculum_graphs');
select pg_temp.assert_count($$select 1 from video_assets    where playback_id='pb-1'$$,   1,'O7 student reads video_assets');

reset request.jwt.claims;


-- ── O3 + M-4 + M-9 + M-10: PARENT impersonations (consent precision) ──────────

-- Parent P (linked + consent GRANTED) — sees A's PROJECTION rows (E1=(b)).
set local request.jwt.claims = '{"sub":"cccccccc-cccc-cccc-cccc-cccccccc000c","actor_id":"cccccccc-cccc-cccc-cccc-cccccccc000c"}';
select pg_temp.assert_count($$select 1 from student_profiles    where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,         1,'O3 P reads A profile (granted)');
select pg_temp.assert_count($$select 1 from student_skill_state where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 1,'O3 P reads A skill_state');
select pg_temp.assert_count($$select 1 from mastery_updates     where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,  1,'O3 P reads A mastery_updates');
select pg_temp.assert_count($$select 1 from course_enrollments  where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,  1,'O3 P reads A enrollments');
select pg_temp.assert_count($$select 1 from consent_events      where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,  4,'O3 P reads A consent_events');
select pg_temp.assert_count($$select 1 from messages           where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,  1,'O3 P reads A messages');
select pg_temp.assert_count($$select 1 from grade_artifacts     where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,  1,'O3 P reads A grade_artifacts (credential)');
select pg_temp.assert_count($$select 1 from student_standard_transcript where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 1,'O3 P reads A transcript view');
-- E1=(b): parent gets NOTHING on raw telemetry / non-projection tables.
select pg_temp.assert_count($$select 1 from student_attempts    where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,  0,'E1 P denied A attempts (raw)');
select pg_temp.assert_count($$select 1 from diagnostic_estimates where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 0,'E1 P denied A diagnostic_estimates (raw)');
select pg_temp.assert_count($$select 1 from tutor_exchanges     where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,  0,'E1 P denied A tutor_exchanges (raw)');
select pg_temp.assert_count($$select 1 from summative_results   where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,  0,'E1 P denied A summative_results (not in projection)');
select pg_temp.assert_count($$select 1 from sessions           where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,  0,'E1 P denied A sessions (scoped out)');
-- M-9: linked+granted parent gets 0 on record_access_log (B10 audit surface).
select pg_temp.assert_count($$select 1 from record_access_log   where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$,  0,'M-9 P denied A record_access_log');
-- B13: P reads its OWN link rows (gated by parent_id, not is_parent_of). P holds
-- two links in the seed (→A campus X granted, →B campus Y for the M-6 scoping
-- fixture); both are P's own, so both are visible under the own-row gate.
select pg_temp.assert_count($$select 1 from parent_student_links where parent_id='cccccccc-cccc-cccc-cccc-cccccccc000c'$$, 2,'B13 P reads own links');
reset request.jwt.claims;

-- M-4a: Parent Q (linked + consent PENDING) → 0 on the child's records.
set local request.jwt.claims = '{"sub":"dddddddd-dddd-dddd-dddd-dddddddd000d","actor_id":"dddddddd-dddd-dddd-dddd-dddddddd000d"}';
select pg_temp.assert_count($$select 1 from student_profiles where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 0,'M-4 Q (pending) denied A profile');
select pg_temp.assert_count($$select 1 from mastery_updates  where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 0,'M-4 Q (pending) denied A mastery_updates');
-- B13: Q still reads its OWN link/consent status (renders "consent pending").
select pg_temp.assert_count($$select 1 from parent_student_links where parent_id='dddddddd-dddd-dddd-dddd-dddddddd000d'$$, 1,'B13 Q reads own link (pending)');
reset request.jwt.claims;

-- M-4b: Parent R (link REVOKED, but its consent pointer is a GRANTED event) → 0.
-- Proves the link STATUS gate (status='active' in is_parent_of), not just event.
set local request.jwt.claims = '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeee000e","actor_id":"eeeeeeee-eeee-eeee-eeee-eeeeeeee000e"}';
select pg_temp.assert_count($$select 1 from student_profiles where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 0,'M-4 R (link revoked) denied A profile');
select pg_temp.assert_count($$select 1 from grade_artifacts  where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 0,'M-4 R (link revoked) denied A grade_artifacts');
-- B13: R still reads its OWN link (renders "access paused").
select pg_temp.assert_count($$select 1 from parent_student_links where parent_id='eeeeeeee-eeee-eeee-eeee-eeeeeeee000e'$$, 1,'B13 R reads own link (revoked)');

-- M-3 parent control: a parent NOT linked sees 0 (R is linked-but-revoked; use Q
-- pattern already covered). Cross-family check: R sees 0 of B's rows regardless.
select pg_temp.assert_count($$select 1 from student_profiles where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b'$$, 0,'O3 R denied unrelated student B');
reset request.jwt.claims;

-- M-10: revocation WITHOUT re-auth. Parent P currently sees A (granted). Repoint
-- P's link to the REVOKED consent event using the SAME JWT (no re-auth), then
-- assert P now sees 0. The repoint runs in a temporary owner-context block so the
-- link update lands despite the link table's read-only API posture, then we
-- switch back to authenticated WITHOUT changing claims.
set local request.jwt.claims = '{"sub":"cccccccc-cccc-cccc-cccc-cccccccc000c","actor_id":"cccccccc-cccc-cccc-cccc-cccccccc000c"}';
select pg_temp.assert_count($$select 1 from student_profiles where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 1,'M-10 P sees A before revoke');
-- repoint as owner (RLS/append-only do not guard parent_student_links — it is a
-- mutable relationship row, not an append-only evidence table).
reset role;
update parent_student_links
  set current_consent_event_id='c0d5e401-0000-0000-0000-00000000a002', status='active'
  where parent_id='cccccccc-cccc-cccc-cccc-cccccccc000c'
    and student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a';
set role authenticated;
-- SAME claims still in effect (set local persists in this txn); no re-auth.
select pg_temp.assert_count($$select 1 from student_profiles where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 0,'M-10 P sees 0 after revoke (same JWT)');
reset request.jwt.claims;


-- ── O4 + M-5 + M-6: STAFF impersonations (campus scoping) ─────────────────────

-- Coach X (campus X) — reads A (campus X) across staff-visible tables; 0 for B.
set local request.jwt.claims = '{"sub":"f0000000-0000-0000-0000-0000000000cx","actor_id":"f0000000-0000-0000-0000-0000000000cx","campus_id":"11111111-1111-1111-1111-111111110001"}';
select pg_temp.assert_count($$select 1 from student_profiles where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 1,'O4 coachX reads A (own campus)');
select pg_temp.assert_count($$select 1 from student_attempts where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 1,'O4 coachX reads A attempts (own campus)');
select pg_temp.assert_count($$select 1 from student_profiles where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b'$$, 0,'O4 coachX denied B (other campus)');
-- M-6: coach X gets 0 on parent_student_links for a campus-Y student EVEN THOUGH a
-- campus-Y link genuinely EXISTS in the seed (Parent P → Student B, campus Y). This
-- proves campus SCOPING (the staff-by-campus predicate filters it out), not merely
-- the absence of any campus-Y row. The own-campus links for A ARE visible to
-- staff-by-campus (control below).
select pg_temp.assert_count($$select 1 from parent_student_links where student_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b'$$, 0,'M-6 coachX denied campusY links (link exists, scoped out)');
select pg_temp.assert_count($$select 1 from parent_student_links where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 3,'O4 coachX reads campusX links (control)');
reset request.jwt.claims;

-- M-5: campus_admin X cannot read campus-Y identity; CAN read campus-X.
set local request.jwt.claims = '{"sub":"f0000000-0000-0000-0000-0000000000ax","actor_id":"f0000000-0000-0000-0000-0000000000ax","campus_id":"11111111-1111-1111-1111-111111110001"}';
select pg_temp.assert_count($$select 1 from student_profiles where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b'$$, 0,'M-5 adminX denied B profile (other campus)');
select pg_temp.assert_count($$select 1 from staff_profiles  where campus_id='11111111-1111-1111-1111-111111110002'$$, 0,'M-5 adminX denied campusY staff');
select pg_temp.assert_count($$select 1 from student_profiles where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 1,'M-5 adminX reads A (own campus, control)');
reset request.jwt.claims;

-- M-5 + O4: super_admin reads ACROSS campuses.
set local request.jwt.claims = '{"sub":"f0000000-0000-0000-0000-0000000000ss","actor_id":"f0000000-0000-0000-0000-0000000000ss"}';
select pg_temp.assert_count($$select 1 from student_profiles where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 1,'M-5 super reads A');
select pg_temp.assert_count($$select 1 from student_profiles where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb000b'$$, 1,'M-5 super reads B (cross-campus)');
select pg_temp.assert_count($$select 1 from parent_profiles$$, 3,'M-5 super reads all parent_profiles');
select pg_temp.assert_count($$select 1 from record_access_log where student_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa000a'$$, 1,'O4 super reads record_access_log (staff audit)');
reset request.jwt.claims;


-- ── O6 + M-7: ANON (no JWT) sees nothing ─────────────────────────────────────
-- No claims set (reset above) → current_actor_id / current_student_id are null →
-- every policy predicate is false (and curriculum/video reads are TO authenticated,
-- but anon also lacks the role). Assert zero on a representative spread.
set local request.jwt.claims = '{}';
select pg_temp.assert_count($$select 1 from student_profiles$$,  0,'O6 anon student_profiles');
select pg_temp.assert_count($$select 1 from student_attempts$$,  0,'O6 anon student_attempts');
select pg_temp.assert_count($$select 1 from grade_artifacts$$,   0,'O6 anon grade_artifacts');
select pg_temp.assert_count($$select 1 from parent_student_links$$, 0,'O6 anon parent_student_links');
select pg_temp.assert_count($$select 1 from student_standard_transcript$$, 0,'O6 anon transcript view');
-- M-7: an empty-claims caller in the authenticated role can still read the
-- non-PII curriculum/video (these are TO authenticated using(true)); a TRUE anon
-- role (separate connection) is denied by role. The authoritative anon-role test
-- requires `set role anon` — included as a final guarded block below.
reset request.jwt.claims;

-- M-7 (true anon role): switch to the anon role and confirm curriculum/video deny.
reset role;            -- back to owner so we may set role anon
set role anon;
set local request.jwt.claims = '{}';
select pg_temp.assert_count($$select 1 from curriculum_graphs$$, 0,'M-7 anon role curriculum_graphs');
select pg_temp.assert_count($$select 1 from video_assets$$,      0,'M-7 anon role video_assets');
reset request.jwt.claims;
reset role;


do $$ begin raise notice '================ ALL DENY CASES PASSED ================'; end $$;


-- The whole suite is non-destructive: rollback discards the seed + every probe.
rollback;
-- =============================================================================
-- END rls_deny_cases.sql — NOT EXECUTED here; Matt runs after applying 0001→0004.
-- =============================================================================
