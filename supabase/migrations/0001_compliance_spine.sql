-- =============================================================================
-- 0001_compliance_spine.sql  —  A3 Virtual School / Algebra 1
-- Compliance spine: student profiles, sessions, mutable skill state, the
-- append-only EVIDENCE TRAIL (attempts + mastery updates), and the
-- NCAA/COPPA/FERPA stub tables (enrollments, messages, consent, access log).
--
--   *** NOT EXECUTED. This file is a Matt checkpoint BEFORE running. ***
--   Per CLAUDE.md "Any schema migration before it runs" is a human checkpoint.
--   No psql / supabase / SQL was run to produce or verify this file. Read it
--   top-to-bottom; approve; THEN run via the Supabase migration tooling.
--
-- CHANGELOG (pre-execution edits to this pending migration):
--   - Phase 7C: extend student_attempts.source CHECK to include 'retention'
--     (a scheduled retention probe; provenance only, never enters engine math).
--     One-line constraint + comment edit; NOT a second migration (this file has
--     not run yet).
--
-- Scope notes:
--   - No npm dependency is added by this file. `pgcrypto` is a POSTGRES
--     extension created inside this migration (for gen_random_uuid); it is not
--     a Node package.
--   - The curriculum graph lives in data/algebra1-graph.json, NOT in Postgres.
--     skill_id / problem_id columns are therefore opaque text, NOT foreign
--     keys — there is no graph table to reference. The CCSS standards explosion
--     happens in lib/transcript at read time; PG only stores the per-skill
--     projection (see the view at the end).
--
-- ── PK / FK STRATEGY (divergence from the Supabase portal default) ───────────
--   The Supabase table editor defaults new tables to `bigint generated always
--   as identity`. We DELIBERATELY diverge: every PK here is `uuid` defaulting to
--   gen_random_uuid(). Rationale:
--     1. /types models every id/`*Id` as an opaque string with no ordering or
--        parsing semantics (types/repository.ts). An opaque string in the app
--        === a uuid in PG with NO boundary translation. A bigint identity would
--        force int<->string mapping at the repository edge — exactly the leak
--        we avoid.
--     2. The app supplies ids today (crypto.randomUUID in the in-memory repo).
--        uuid PKs let inserts be app-supplied OR DB-defaulted with no schema
--        change when Supabase is wired.
--     3. Sequential bigints leak volume/ordering — undesirable for an
--        evidence trail handed to auditors. uuids do not.
--   timestamptz for every timestamp (never naive timestamp). NO bigint identity
--   anywhere on this spine.
--
-- ── INSERT-ONLY ENFORCEMENT (defense in depth — BOTH mechanisms) ─────────────
--   The evidence trail (student_attempts, mastery_updates) and the audit logs
--   (messages, consent_events, record_access_log) are APPEND-ONLY. We guard with
--   TWO independent mechanisms because each closes a different threat:
--     (a) REVOKE UPDATE, DELETE from the application roles  → blocks the normal
--         app/PostgREST path (defense against ordinary code paths and RLS gaps).
--     (b) BEFORE UPDATE OR DELETE trigger that RAISEs       → blocks ANY role
--         that still holds the privilege (table owner, a future service role,
--         a misconfigured grant). RLS WITH CHECK alone is INSUFFICIENT here —
--         the owner and SECURITY DEFINER paths bypass RLS, so the trigger is
--         the actual guarantee.
--   Each block below states which mechanism guards which threat.
--
-- ── RLS HELPERS ──────────────────────────────────────────────────────────────
--   Row policies call STABLE SECURITY DEFINER helper functions in the private
--   `app` schema, each with a PINNED search_path (SET search_path = pg_catalog,
--   app). An UNPINNED search_path on a SECURITY DEFINER function is a
--   privilege-escalation defect (a caller could shadow a referenced object) —
--   pinning is mandatory. Policies NEVER inline a subquery against an
--   RLS-protected table (that re-triggers RLS / leaks); they call the helpers.
--
-- ── REVERSIBILITY ────────────────────────────────────────────────────────────
--   A complete teardown is provided as a commented block at the END of this
--   file (or maintain as a paired 0001_down.sql). It drops in dependency order.
--   Nothing is destructive on apply; the teardown is destructive by design and
--   is itself a separate checkpoint.
--
-- HARD ORDER (do not reorder): extensions → private schema + helpers → tables →
-- indexes → triggers → grants/revokes → RLS enable + policies → view → comments.
-- =============================================================================

begin;

-- ── 1. EXTENSIONS ────────────────────────────────────────────────────────────
-- gen_random_uuid() lives in pgcrypto on the PG versions Supabase ships.
create extension if not exists pgcrypto;


-- ── 2. PRIVATE APP SCHEMA + SECURITY DEFINER HELPERS ─────────────────────────
-- Private schema for RLS helpers. NOT exposed via PostgREST (not in the API
-- search_path). Each helper is STABLE SECURITY DEFINER with a PINNED
-- search_path. They read the caller identity from JWT claims (request.jwt.claims)
-- so policies can scope rows WITHOUT inlining subqueries on protected tables.
create schema if not exists app;

-- The authenticated student's own profile id (uuid claim 'student_id'), or null.
create or replace function app.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, app
as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'student_id',
    ''
  )::uuid;
$$;

-- The caller's campus scope (uuid claim 'campus_id'), or null. Used for the
-- staff-by-campus policies (teacher access to student work = NCAA pillar).
create or replace function app.current_campus_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, app
as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'campus_id',
    ''
  )::uuid;
$$;

-- True when the caller is staff (role claim 'staff') scoped to the given campus.
-- Takes the row's campus_id and compares to the caller's claimed campus. A null
-- campus on either side denies (no implicit cross-campus access).
create or replace function app.is_staff_for_campus(p_campus uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, app
as $$
  select
    coalesce(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'staff',
      false
    )
    and p_campus is not null
    and p_campus = app.current_campus_id();
$$;


-- ── 3. TABLES ────────────────────────────────────────────────────────────────

-- 3.1 student_profiles — the tenant anchor for RLS (own + staff-by-campus).
create table student_profiles (
  id                            uuid primary key default gen_random_uuid(),
  -- COPPA data minimization: FIRST NAME ONLY. No surname, no free-text bio.
  display_name                  text not null,
  grade_level                   int,
  sport                         text
    check (sport in ('baseball','softball','basketball','soccer','football','volleyball','neutral')),
  -- Deferred-FK per mr-gates #8: campuses table arrives with the tenant build.
  -- uuid null now; FK added later. Comment marks the intentional gap.
  campus_id                     uuid,
  parental_consent_status       text not null default 'pending'
    check (parental_consent_status in ('pending','granted','revoked')),
  parental_consent_updated_at   timestamptz,
  created_at                    timestamptz not null default now()
);

-- 3.2 sessions — a learning/diagnostic session; attempts + updates reference it.
create table sessions (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references student_profiles(id) on delete restrict,
  started_at  timestamptz not null default now(),
  kind        text   -- e.g. 'practice' | 'diagnostic' | 'tune-up'; null = unset
);

-- 3.3 student_skill_state — MUTABLE per-skill state. NOT evidence: it is
-- derived/regenerable from the attempt + update logs, so ON DELETE CASCADE is
-- acceptable here (the durable record lives in the append-only tables).
create table student_skill_state (
  student_id      uuid not null references student_profiles(id) on delete cascade,
  -- Opaque graph node id. NOT an FK — the graph is JSON, not a PG table.
  skill_id        text not null,
  mastery         numeric not null default 0,
  status          text not null
    check (status in ('unknown','introduced','developing','near_mastery','mastered','needs_review','prerequisite_gap')),
  phase           smallint not null default 1 check (phase between 1 and 3),
  attempts        int not null default 0,
  correct         int not null default 0,
  hints           int not null default 0,
  time_ms         bigint not null default 0,
  -- Rolling recent-attempt window (cap 5, most-recent last) — see StudentSkillState.
  recent          jsonb not null default '[]'::jsonb,
  transfer        boolean not null default false,
  last_attempt_at timestamptz,
  mastered_at     timestamptz,
  primary key (student_id, skill_id)
);

-- 3.4 student_attempts — APPEND-ONLY EVIDENCE. One immutable row per attempt.
create table student_attempts (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references student_profiles(id) on delete restrict,
  skill_id           text not null,    -- opaque graph node id (not an FK)
  problem_id         text not null,    -- opaque graph problem id (not an FK)
  phase              smallint not null check (phase between 1 and 3),
  sport              text not null,
  response           text not null,    -- math-only response; NEVER free prose (privacy)
  correct            boolean not null,
  hints_used         int not null default 0,
  time_ms            bigint not null default 0,
  misconception_tags text[] not null default '{}',
  is_probe           boolean not null default false,
  -- Provenance only — NEVER enters mastery/phase math (ISOLATION RULE, /types).
  source             text not null default 'practice'
    check (source in ('practice','diagnostic','retention')),
  session_id         uuid not null references sessions(id) on delete restrict,
  created_at         timestamptz not null default now()
);

-- 3.5 mastery_updates — APPEND-ONLY EVIDENCE. One immutable row per mastery/
-- status/phase transition. attempt_id is null for decay / credit-propagation.
create table mastery_updates (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references student_profiles(id) on delete restrict,
  skill_id     text not null,    -- opaque graph node id (not an FK)
  attempt_id   uuid references student_attempts(id) on delete restrict,
  trigger      text not null
    check (trigger in ('attempt','diagnostic','decay','credit-propagation')),
  prev_mastery numeric not null,
  new_mastery  numeric not null,
  prev_status  text not null,
  new_status   text not null,
  prev_phase   smallint not null check (prev_phase between 1 and 3),
  new_phase    smallint not null check (new_phase between 1 and 3),
  reason       text not null,
  engine_version text not null,
  session_id   uuid not null references sessions(id) on delete restrict,
  created_at   timestamptz not null default now()
);

-- 3.6 course_enrollments — NCAA defined-timeframe stub (CourseEnrollment).
-- Status transitions are facts (active→completed/withdrawn/expired); a future
-- transition table can append, but the row itself is the current enrollment.
create table course_enrollments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references student_profiles(id) on delete restrict,
  course_id       text not null,
  started_at      timestamptz not null default now(),
  expected_end_at timestamptz,
  completed_at    timestamptz,
  status          text not null default 'active'
    check (status in ('active','completed','withdrawn','expired')),
  instructor_id   uuid
);

-- 3.7 message_threads — NCAA interaction grouping (MessageThread).
create table message_threads (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references student_profiles(id) on delete restrict,
  instructor_id uuid,
  created_at    timestamptz not null default now()
);

-- 3.8 messages — APPEND-ONLY interaction record (Message). skill_id/attempt_id
-- tie the message to the concrete student work it concerns.
create table messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references message_threads(id) on delete restrict,
  student_id  uuid not null references student_profiles(id) on delete restrict,
  author_role text not null check (author_role in ('instructor','student')),
  author_id   uuid,
  body        text not null,
  skill_id    text,                                              -- opaque graph id
  attempt_id  uuid references student_attempts(id) on delete restrict,
  created_at  timestamptz not null default now()
);

-- 3.9 consent_events — APPEND-ONLY COPPA consent audit (ConsentEvent). Every
-- transition is a new row; method specifics NEED COUNSEL before wiring.
create table consent_events (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references student_profiles(id) on delete restrict,
  status            text not null check (status in ('pending','granted','revoked')),
  method            text,
  consented_by_name text,
  relationship      text,
  created_at        timestamptz not null default now()
);

-- 3.10 record_access_log — APPEND-ONLY FERPA read-audit stub (RecordAccessLog).
create table record_access_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  actor_role  text not null,
  student_id  uuid not null references student_profiles(id) on delete restrict,
  record_type text not null,
  accessed_at timestamptz not null default now()
);


-- ── 4. INDEXES ───────────────────────────────────────────────────────────────
create index student_attempts_student_skill_created_idx
  on student_attempts (student_id, skill_id, created_at);
create index student_attempts_session_idx
  on student_attempts (session_id);

create index mastery_updates_student_skill_created_idx
  on mastery_updates (student_id, skill_id, created_at);
create index mastery_updates_attempt_idx
  on mastery_updates (attempt_id);

create index sessions_student_idx           on sessions (student_id);
create index course_enrollments_student_idx on course_enrollments (student_id);
create index message_threads_student_idx    on message_threads (student_id);
create index messages_thread_idx            on messages (thread_id);
create index messages_student_idx           on messages (student_id);
create index consent_events_student_idx     on consent_events (student_id);
create index record_access_log_student_idx  on record_access_log (student_id);


-- ── 5. TRIGGERS — APPEND-ONLY GUARANTEE (mechanism (b)) ──────────────────────
-- Threat closed here: ANY role that still holds UPDATE/DELETE (owner, a future
-- service role, a misconfigured grant, a SECURITY DEFINER path that bypasses
-- RLS). This is the actual immutability guarantee; the REVOKEs below are the
-- first line for ordinary app paths.
-- SECURITY INVOKER (default): this trigger only RAISEs and touches no objects, so
-- DEFINER would needlessly widen the privileged surface. Triggers are NOT bypassed
-- by table ownership the way RLS is, so the append-only guarantee holds for every
-- role including the owner. search_path is still pinned as a hardening default.
create or replace function app.forbid_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, app
as $$
begin
  raise exception 'append-only: % on % forbidden', tg_op, tg_table_name
    using errcode = 'restrict_violation';
end;
$$;

create trigger student_attempts_append_only
  before update or delete on student_attempts
  for each row execute function app.forbid_mutation();

create trigger mastery_updates_append_only
  before update or delete on mastery_updates
  for each row execute function app.forbid_mutation();

create trigger messages_append_only
  before update or delete on messages
  for each row execute function app.forbid_mutation();

create trigger consent_events_append_only
  before update or delete on consent_events
  for each row execute function app.forbid_mutation();

create trigger record_access_log_append_only
  before update or delete on record_access_log
  for each row execute function app.forbid_mutation();


-- ── 6. GRANTS / REVOKES — APPEND-ONLY (mechanism (a)) ────────────────────────
-- Threat closed here: ordinary application code paths (authenticated/anon via
-- PostgREST). Revoke UPDATE/DELETE so the normal API cannot mutate evidence even
-- before RLS is consulted. The trigger above backs this for privileged roles.
-- (Supabase predefines the `authenticated` and `anon` roles.)
revoke update, delete on student_attempts  from authenticated, anon;
revoke update, delete on mastery_updates    from authenticated, anon;
revoke update, delete on messages           from authenticated, anon;
revoke update, delete on consent_events     from authenticated, anon;
revoke update, delete on record_access_log  from authenticated, anon;

-- student_skill_state is mutable but writes are service-role only (the engine
-- writes it). Students never UPDATE it directly via the API.
revoke insert, update, delete on student_skill_state from authenticated, anon;


-- ── 7. RLS ENABLE + POLICIES ─────────────────────────────────────────────────
-- Per mr-gates #3 sketch:
--   students SELECT their OWN rows; INSERT WITH CHECK own on the log tables;
--   NO update/delete policy exists at all (append-only is also expressed as the
--   absence of any mutating policy — the trigger + revokes are the hard guard).
--   staff SELECT by campus (teacher access to student work = NCAA).
--   skill_state writes are service-role only (no student write policy).
-- Policies reference the app.* helpers; they NEVER inline a subquery against an
-- RLS-protected table.

alter table student_profiles    enable row level security;
alter table sessions            enable row level security;
alter table student_skill_state enable row level security;
alter table student_attempts    enable row level security;
alter table mastery_updates     enable row level security;
alter table course_enrollments  enable row level security;
alter table message_threads     enable row level security;
alter table messages            enable row level security;
alter table consent_events      enable row level security;
alter table record_access_log   enable row level security;

-- 7.1 student_profiles: own row + staff-by-campus read.
create policy student_profiles_select_own on student_profiles
  for select using (id = app.current_student_id());
create policy student_profiles_select_staff on student_profiles
  for select using (app.is_staff_for_campus(campus_id));

-- 7.2 sessions: own + staff. INSERT own (a student starts their own session).
create policy sessions_select_own on sessions
  for select using (student_id = app.current_student_id());
create policy sessions_select_staff on sessions
  for select using (
    student_id in (select id from student_profiles where false)  -- placeholder; see note
  );
-- NOTE: staff session access is scoped through the student's campus. To avoid a
-- subquery against the RLS-protected student_profiles, wire a campus_id onto
-- sessions when the tenant build lands, then mirror the is_staff_for_campus
-- pattern. Until then staff read sessions via the profile/attempt joins they are
-- already permitted. The placeholder above intentionally grants nothing.
create policy sessions_insert_own on sessions
  for insert with check (student_id = app.current_student_id());

-- 7.3 student_skill_state: students SELECT own; writes are service-role only
-- (no insert/update policy → the revoke above plus absent policy = no API write).
create policy student_skill_state_select_own on student_skill_state
  for select using (student_id = app.current_student_id());

-- 7.4 student_attempts (append-only evidence): SELECT own + staff-by-campus;
-- INSERT WITH CHECK own. NO update/delete policy.
create policy student_attempts_select_own on student_attempts
  for select using (student_id = app.current_student_id());
create policy student_attempts_select_staff on student_attempts
  for select using (
    app.is_staff_for_campus(
      (select campus_id from student_profiles p where p.id = student_attempts.student_id)
    )
  );
create policy student_attempts_insert_own on student_attempts
  for insert with check (student_id = app.current_student_id());

-- 7.5 mastery_updates (append-only evidence): SELECT own + staff; INSERT own.
create policy mastery_updates_select_own on mastery_updates
  for select using (student_id = app.current_student_id());
create policy mastery_updates_select_staff on mastery_updates
  for select using (
    app.is_staff_for_campus(
      (select campus_id from student_profiles p where p.id = mastery_updates.student_id)
    )
  );
create policy mastery_updates_insert_own on mastery_updates
  for insert with check (student_id = app.current_student_id());

-- 7.6 course_enrollments: SELECT own + staff.
create policy course_enrollments_select_own on course_enrollments
  for select using (student_id = app.current_student_id());
create policy course_enrollments_select_staff on course_enrollments
  for select using (
    app.is_staff_for_campus(
      (select campus_id from student_profiles p where p.id = course_enrollments.student_id)
    )
  );

-- 7.7 message_threads: SELECT own + staff.
create policy message_threads_select_own on message_threads
  for select using (student_id = app.current_student_id());
create policy message_threads_select_staff on message_threads
  for select using (
    app.is_staff_for_campus(
      (select campus_id from student_profiles p where p.id = message_threads.student_id)
    )
  );

-- 7.8 messages (append-only): SELECT own + staff; INSERT own.
create policy messages_select_own on messages
  for select using (student_id = app.current_student_id());
create policy messages_select_staff on messages
  for select using (
    app.is_staff_for_campus(
      (select campus_id from student_profiles p where p.id = messages.student_id)
    )
  );
create policy messages_insert_own on messages
  for insert with check (student_id = app.current_student_id());

-- 7.9 consent_events (append-only): SELECT own + staff; INSERT own.
create policy consent_events_select_own on consent_events
  for select using (student_id = app.current_student_id());
create policy consent_events_select_staff on consent_events
  for select using (
    app.is_staff_for_campus(
      (select campus_id from student_profiles p where p.id = consent_events.student_id)
    )
  );
create policy consent_events_insert_own on consent_events
  for insert with check (student_id = app.current_student_id());

-- 7.10 record_access_log (append-only): staff SELECT by campus; INSERT by any
-- authenticated actor recording an access (the actor is stamped on the row).
create policy record_access_log_select_staff on record_access_log
  for select using (
    app.is_staff_for_campus(
      (select campus_id from student_profiles p where p.id = record_access_log.student_id)
    )
  );
-- Phase-5 stub: with check (true) lets any authenticated caller write an audit
-- row. SHAPE ONLY. When the FERPA read-audit is wired (interaction-layer build),
-- bind the actor to the JWT identity so the audit cannot be spoofed, e.g.
--   with check (actor_id = app.current_actor_id())
-- This policy MUST NOT ship to production unwired.
create policy record_access_log_insert on record_access_log
  for insert with check (true);

-- NOTE on the (select campus_id from student_profiles ...) sub-selects above:
-- these read a SINGLE scalar (the row's owning campus) to feed is_staff_for_campus
-- and are NOT an RLS-recursion hazard the way a set-returning IN (...) against
-- the protected table would be. When campus_id is denormalized onto the child
-- tables (tenant build), replace these scalar sub-selects with a direct
-- app.is_staff_for_campus(campus_id) for a cleaner, subquery-free policy.


-- ── 8. VIEW — durable per-skill transcript projection ────────────────────────
-- The DURABLE projection PG can serve: per-skill (student_id, skill_id, status,
-- mastered_at). The CCSS standards EXPLOSION (one node → many standards, the
-- weakest-link roll-up, the credit-tier split) happens in lib/transcript at read
-- time because the graph (node → ccss[] mapping) lives in JSON, not PG. This
-- split is intentional: PG owns the per-skill truth; the app owns the graph and
-- the roll-up. The view is a stable read target for that roll-up to join against.
create view student_standard_transcript as
  select
    student_id,
    skill_id,
    status,
    mastered_at
  from student_skill_state;


-- ── 9. COMMENTS (carry the rationale into the live catalog) ──────────────────
comment on schema app is 'Private schema for RLS SECURITY DEFINER helpers; not exposed via PostgREST.';
comment on table student_profiles is 'Tenant anchor for RLS. display_name is FIRST-NAME-ONLY (COPPA minimization).';
comment on column student_profiles.campus_id is 'Deferred-FK (mr-gates #8): campuses table arrives with the tenant build.';
comment on table student_skill_state is 'MUTABLE, derived/regenerable from the append-only logs (ON DELETE CASCADE OK). Writes are service-role only.';
comment on column student_skill_state.skill_id is 'Opaque graph node id; NOT an FK (graph lives in data/algebra1-graph.json).';
comment on table student_attempts is 'APPEND-ONLY evidence trail (accreditation). Guarded by revoke (app paths) + trigger (privileged roles).';
comment on column student_attempts.response is 'Math-only response; never free prose (privacy). Re-review if a free-text surface is ever added.';
comment on column student_attempts.source is 'Provenance only; NEVER enters mastery/phase math (ISOLATION RULE). One of practice|diagnostic|retention (retention = scheduled retention probe, Phase 7C).';
comment on table mastery_updates is 'APPEND-ONLY evidence trail. attempt_id null for decay/credit-propagation; createdAt is the replayable nowIso.';
comment on table course_enrollments is 'NCAA defined-course-timeframe stub (not yet wired).';
comment on table messages is 'APPEND-ONLY NCAA interaction record; skill_id/attempt_id tie interaction to student work.';
comment on table consent_events is 'APPEND-ONLY COPPA consent audit; method specifics NEED COUNSEL.';
comment on table record_access_log is 'APPEND-ONLY FERPA read-audit stub (shape only in Phase 5).';
comment on view student_standard_transcript is 'Durable per-skill projection; CCSS explosion happens in lib/transcript (graph is JSON, not PG).';

commit;


-- =============================================================================
-- TEARDOWN (reversibility) — DESTRUCTIVE. Run as 0001_down.sql / separate
-- checkpoint. Drops in reverse dependency order. NOT part of the apply above.
-- =============================================================================
-- begin;
--   drop view if exists student_standard_transcript;
--
--   drop table if exists record_access_log;
--   drop table if exists consent_events;
--   drop table if exists messages;
--   drop table if exists message_threads;
--   drop table if exists course_enrollments;
--   drop table if exists mastery_updates;
--   drop table if exists student_attempts;
--   drop table if exists student_skill_state;
--   drop table if exists sessions;
--   drop table if exists student_profiles;
--
--   drop function if exists app.forbid_mutation();
--   drop function if exists app.is_staff_for_campus(uuid);
--   drop function if exists app.current_campus_id();
--   drop function if exists app.current_student_id();
--   drop schema if exists app;
--   -- pgcrypto left in place (other objects may depend on it):
--   -- drop extension if exists pgcrypto;
-- commit;
-- =============================================================================
