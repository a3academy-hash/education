-- =============================================================================
-- 0002_identity_and_roles.sql  —  A3 Virtual School / Algebra 1 / Phase 11A
-- Identity & role model (parents, the parent↔student consent relationship,
-- staff role tiers), the SECURITY DEFINER helper EVOLUTION the Phase 11 role
-- model needs, GRAPH-PROVENANCE columns on the evidence trail, and the
-- RECONCILIATION of 0001's nine JWT-'staff' SELECT policies onto the new,
-- subquery-free, non-recursive campus path.
--
--   *** NOT EXECUTED — Matt checkpoint. ***
--   Per CLAUDE.md "Any schema migration before it runs" is a human checkpoint.
--   This file touches the store of children's education records. NO agent runs
--   it. No psql / supabase / SQL was run to produce or verify this file. Read it
--   top-to-bottom; approve; THEN run via the Supabase migration tooling, AFTER
--   0001_compliance_spine.sql has been applied.
--
-- ── LAYERING (binding L1) — ADDITIVE ─────────────────────────────────────────
--   0001 is left intact. This migration is purely additive at the DDL level
--   (new tables, new columns, new helpers) EXCEPT it `drop policy; create
--   policy` for the nine staff SELECT policies 0001 created — an intentional,
--   auditable reconciliation (not a silent rewrite). The down-block RESTORES
--   0001's original nine policies so a rollback never strands those tables
--   policy-less (L5).
--
-- ── HELPER EVOLUTION (binding H1/H2/H3, L2/L4) ───────────────────────────────
--   0001 scoped staff via a JWT `role='staff'` claim + a `campus_id` claim.
--   Phase 11 backs staff with `staff_profiles` (super_admin|campus_admin|coach).
--   New helpers (all STABLE SECURITY DEFINER, pinned search_path = pg_catalog,
--   app, reading the 0001 JWT idiom verbatim):
--     - current_actor_id()       — the authenticated principal id (audit stamp).
--     - is_staff()               — any staff_profiles row for the caller.
--     - can_access_campus(uuid)  — super_admin → any; campus_admin/coach → own.
--     - is_parent_of(uuid)       — active link AND consent CURRENTLY granted.
--     - student_campus(uuid)     — a student's owning campus, RLS-bypassed.
--   `is_staff_for_campus(uuid)` is KEPT as a thin SHIM delegating to
--   can_access_campus(uuid) (L2): the name survives, the diff stays small, and
--   any not-yet-migrated caller keeps working.
--
--   RECURSION SAFETY (the A3 fix, L4): the new helpers read their OWN identity
--   tables (staff_profiles, parent_student_links, consent_events) and
--   student_profiles. Because they are SECURITY DEFINER owned by the table
--   owner, those reads BYPASS RLS and cannot re-enter a policy → no recursion.
--   Crucially, the reconciled policies call `can_access_campus(student_campus(
--   student_id))` instead of inlining `(select campus_id from student_profiles
--   ...)` — the scalar subquery against an RLS-protected table is GONE, so the
--   policies are subquery-free and faithful to 0001's stated invariant.
--
-- ── ONE CONSENT TRUTH (binding I1/I2/I3) ─────────────────────────────────────
--   consent_events (0001, append-only) remains the SOLE source of consent truth.
--   This file ADDS columns to it (consent_policy_version, consent_scope) — DDL,
--   not row mutation, so the 0001 append-only trigger is not in conflict.
--   parent_student_links carries a DERIVED pointer (current_consent_event_id) +
--   a relationship lifecycle (status/revoked_at) so the relationship renders
--   honestly active vs revoked. is_parent_of reads the pointed-to event's
--   status; there is NO independent consent enum on the link.
--
-- ── GRAPH PROVENANCE (binding G2) ────────────────────────────────────────────
--   Every evidence row pins the curriculum it was produced under. This file adds
--   graph_version (content) to student_attempts + mastery_updates and
--   engine_version to student_attempts (mastery_updates already has it). The
--   tables have never been written (0001 never ran), so we ADD the column then
--   ALTER ... SET NOT NULL — final state is NOT NULL with NO default (the writer
--   stamps it at write time from the graph the engine actually loaded; never
--   back-filled from "whatever is active now"). Writer stamping is Workstream C.
--
-- ── RLS ON NEW IDENTITY TABLES (binding C1) ──────────────────────────────────
--   The three new identity tables ship with RLS ENABLED here = a deny-all
--   baseline (RLS on + no policy = denied). Their POLICY BODIES are Workstream B
--   (0004). We deliberately do NOT add even self-read policies here, to keep the
--   gate split clean (B owns every new-table policy + the deny-case test suite).
--
-- HARD ORDER (do not reorder): table-independent helpers (current_actor_id,
-- student_campus — student_profiles exists from 0001) → identity tables
-- (parent_profiles, parent_student_links, staff_profiles) → table-dependent
-- helpers (is_staff, can_access_campus, is_parent_of read those identity tables,
-- and is_staff_for_campus shims can_access_campus, so ALL FOUR must come AFTER
-- the identity tables — `language sql` bodies are parse-checked at CREATE time,
-- so a forward table reference here is a guaranteed run-time failure) → consent
-- ALTER → evidence-provenance ALTERs → indexes → triggers (none new here) →
-- grants/revokes → RLS enable (new tables) → 0001 policy reconciliation →
-- comments.
-- =============================================================================

begin;

-- ── 1. TABLE-INDEPENDENT HELPERS (SECURITY DEFINER, pinned search_path) ───────
-- All helpers mirror the 0001 pattern exactly: language sql, STABLE, SECURITY
-- DEFINER, SET search_path = pg_catalog, app, JWT read via
-- current_setting('request.jwt.claims', true)::jsonb. Owned by the table owner
-- so DEFINER legitimately bypasses RLS on the identity tables it reads.
-- These two reference NO table created later (student_campus reads
-- student_profiles, which exists from 0001), so they are safe to define first.
-- The helpers that read the new identity tables (is_staff, can_access_campus,
-- is_parent_of, is_staff_for_campus) are defined in §3, AFTER §2 creates them.

-- 1.1 current_actor_id() — the authenticated principal's id for audit stamping.
-- Prefers an explicit 'actor_id' claim; falls back to the JWT 'sub'. Null when
-- neither is present (e.g. anon).
create or replace function app.current_actor_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, app
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb ->> 'actor_id',
      current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
    ),
    ''
  )::uuid;
$$;

-- 1.2 student_campus(uuid) — a student's owning campus. SECURITY DEFINER read of
-- student_profiles (RLS-bypassed) so the staff policies need NO inline subquery
-- against the RLS-protected table (L4 — the recursion fix). Null when unknown.
create or replace function app.student_campus(p_student uuid)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, app
as $$
  select campus_id from student_profiles where id = p_student;
$$;


-- ── 2. IDENTITY TABLES ───────────────────────────────────────────────────────

-- 2.1 parent_profiles — the legal account holder for an under-13 student
-- (COPPA). A parent sees a student ONLY through an active, consent-granted
-- parent_student_link. Minimal PII: a display name + contact email.
create table parent_profiles (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null,
  email        text,
  created_at   timestamptz not null default now()
);

-- 2.2 parent_student_links — the parent↔student relationship with an explicit
-- lifecycle (I3) and a DERIVED pointer to the current consent event (I1). pk is
-- (parent_id, student_id) — one link per pair. current_consent_event_id is the
-- single consent truth referent; consent STATUS is read from that event, never
-- stored here as an independent enum.
create table parent_student_links (
  parent_id                 uuid not null references parent_profiles(id) on delete restrict,
  student_id                uuid not null references student_profiles(id) on delete restrict,
  relationship              text,
  -- Relationship lifecycle, so the surface renders honestly active vs revoked.
  status                    text not null default 'active'
    check (status in ('active','revoked')),
  revoked_at                timestamptz,
  -- DERIVED pointer into consent_events (the one consent truth). is_parent_of
  -- reads the pointed-to event's status; granted required for access.
  current_consent_event_id  uuid references consent_events(id) on delete restrict,
  created_at                timestamptz not null default now(),
  primary key (parent_id, student_id)
);

-- 2.3 staff_profiles — staff role tiers. The I4 CHECK forbids a "coach of
-- nowhere": super_admin has NO campus (reaches all), campus_admin/coach MUST
-- have one. Coach-vs-campus_admin permission scope is a Workstream B/UI concern.
create table staff_profiles (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null,
  role         text not null
    check (role in ('super_admin','campus_admin','coach')),
  campus_id    uuid,
  created_at   timestamptz not null default now(),
  constraint staff_profiles_role_campus_ck check (
    (role = 'super_admin' and campus_id is null)
    or (role in ('campus_admin','coach') and campus_id is not null)
  )
);


-- ── 3. TABLE-DEPENDENT HELPERS (read the §2 identity tables) ─────────────────
-- These MUST be created after §2: `language sql` bodies are parse-checked at
-- CREATE FUNCTION time, so referencing staff_profiles / parent_student_links
-- before they exist raises `relation ... does not exist` and aborts the run.
-- Same 0001 pattern (language sql, STABLE, SECURITY DEFINER, pinned search_path).

-- 3.1 is_staff() — true when ANY staff_profiles row exists for the caller
-- (current_actor_id). Role-tier scoping is done by can_access_campus, not here.
create or replace function app.is_staff()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, app
as $$
  select exists (
    select 1 from staff_profiles s where s.id = app.current_actor_id()
  );
$$;

-- 3.2 can_access_campus(uuid) — super_admin reaches ANY campus; campus_admin and
-- coach reach ONLY their own staff_profiles.campus_id. A null target campus, or
-- a non-staff caller, denies (no implicit cross-campus access). This REPLACES
-- the 0001 JWT-'staff' check as the single staff-scoping primitive.
create or replace function app.can_access_campus(p_campus uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, app
as $$
  select exists (
    select 1
    from staff_profiles s
    where s.id = app.current_actor_id()
      and (
        s.role = 'super_admin'
        or (p_campus is not null and s.campus_id = p_campus)
      )
  );
$$;

-- 3.3 is_parent_of(uuid) — true ONLY when an ACTIVE parent_student_link exists
-- for the caller's parent id AND consent is CURRENTLY granted (binding H3). A
-- revoked/pending link, or a current consent event whose status is not
-- 'granted', returns false → revocation immediately revokes read access
-- (FERPA/COPPA). Consent status is read from the link's derived pointer into
-- consent_events (the one consent truth, I1) — never an independent enum.
-- WORKSTREAM C BINDING (mirrors the staff binding): the caller's
-- current_actor_id() — the JWT actor_id, else sub — is matched against
-- parent_student_links.parent_id, which FKs parent_profiles(id). Workstream C
-- MUST mint the parent's JWT so actor_id (or sub) EQUALS parent_profiles.id;
-- otherwise this returns false and the parent cannot reach the child's records.
-- This binding gates a parent's access to a child's records (COPPA/FERPA).
create or replace function app.is_parent_of(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, app
as $$
  select exists (
    select 1
    from parent_student_links l
    join consent_events ce on ce.id = l.current_consent_event_id
    where l.parent_id = app.current_actor_id()
      and l.student_id = p_student
      and l.status = 'active'
      and ce.status = 'granted'
  );
$$;

-- 3.4 is_staff_for_campus(uuid) — SHIM (binding L2). The 0001 name survives; it
-- now delegates to can_access_campus so any caller still referencing it routes
-- through the staff_profiles-backed check. New code should call
-- can_access_campus directly. (Defined here because can_access_campus, which it
-- calls, is defined just above and reads staff_profiles.)
create or replace function app.is_staff_for_campus(p_campus uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, app
as $$
  select app.can_access_campus(p_campus);
$$;


-- ── 4. CONSENT EVOLUTION (binding I2) — ADD COLUMNS to consent_events ─────────
-- consent_events is append-only (0001 revoke + trigger guards ROW mutation, not
-- DDL). Recording WHAT was consented to lets the consent screen show honestly
-- "on [date] you consented to [disclosure vX]"; a later policy-wording change
-- cannot silently rewrite prior consents (each event froze its own scope).
alter table consent_events add column consent_policy_version text;
alter table consent_events add column consent_scope jsonb;


-- ── 5. GRAPH PROVENANCE ON THE EVIDENCE TRAIL (binding G2) ────────────────────
-- Every evidence row pins the curriculum it was produced under. Tables are
-- empty (0001 never ran), so ADD COLUMN then SET NOT NULL is safe and the final
-- state is NOT NULL with NO default — the writer (Workstream C) stamps the value
-- the engine actually loaded; it is never back-filled from the active version.
alter table student_attempts add column graph_version  text;
alter table student_attempts add column engine_version text;
alter table mastery_updates  add column graph_version  text;

alter table student_attempts alter column graph_version  set not null;
alter table student_attempts alter column engine_version set not null;
alter table mastery_updates  alter column graph_version  set not null;


-- ── 6. INDEXES (new identity tables) ─────────────────────────────────────────
create index parent_student_links_student_idx on parent_student_links (student_id);
create index parent_student_links_consent_idx on parent_student_links (current_consent_event_id);
create index staff_profiles_campus_idx        on staff_profiles (campus_id);


-- ── 7. GRANTS / REVOKES (new identity tables) ────────────────────────────────
-- Identity rows are administered by privileged/service paths, not by ordinary
-- student/anon API callers. Revoke all write verbs from authenticated/anon so
-- the deny-all RLS baseline below is backstopped at the privilege layer too.
-- (Real write policies, if any are exposed to the API, arrive in Workstream B.)
revoke insert, update, delete on parent_profiles       from authenticated, anon;
revoke insert, update, delete on parent_student_links  from authenticated, anon;
revoke insert, update, delete on staff_profiles        from authenticated, anon;


-- ── 8. RLS ENABLE — DENY-ALL BASELINE (binding C1) ───────────────────────────
-- RLS on + no policy = denied. The POLICY BODIES for these three tables are
-- Workstream B (0004); no self-read is added here, to keep the gate split clean.
alter table parent_profiles      enable row level security;
alter table parent_student_links enable row level security;
alter table staff_profiles       enable row level security;


-- ── 9. RECONCILE 0001 STAFF SELECT POLICIES (binding L3/L4) ──────────────────
-- The nine staff SELECT policies 0001 created read JWT role='staff' (eight of
-- them via inline scalar subqueries against the RLS-protected student_profiles,
-- one — sessions — as a where-false placeholder). We DROP and RECREATE all nine
-- so they route through the staff_profiles-backed campus path
-- `can_access_campus(student_campus(...))` — subquery-free and non-recursive
-- (the A3 recursion fix, L4). These supersede the 0001 definitions; the 0002
-- down-block RESTORES the 0001 originals (L5).

-- 9.1 student_profiles — campus is on the row itself (no student_campus needed).
drop policy student_profiles_select_staff on student_profiles;
create policy student_profiles_select_staff on student_profiles
  for select using (app.can_access_campus(campus_id));

-- 9.2 sessions — 0001 left this a where-false placeholder (granted nothing).
-- Wire it via the campus path now: staff read a session when they can access the
-- owning student's campus. No subquery against the protected table (helper does
-- the RLS-bypassed read).
drop policy sessions_select_staff on sessions;
create policy sessions_select_staff on sessions
  for select using (app.can_access_campus(app.student_campus(student_id)));

-- 9.3 student_attempts
drop policy student_attempts_select_staff on student_attempts;
create policy student_attempts_select_staff on student_attempts
  for select using (app.can_access_campus(app.student_campus(student_id)));

-- 9.4 mastery_updates
drop policy mastery_updates_select_staff on mastery_updates;
create policy mastery_updates_select_staff on mastery_updates
  for select using (app.can_access_campus(app.student_campus(student_id)));

-- 9.5 course_enrollments
drop policy course_enrollments_select_staff on course_enrollments;
create policy course_enrollments_select_staff on course_enrollments
  for select using (app.can_access_campus(app.student_campus(student_id)));

-- 9.6 message_threads
drop policy message_threads_select_staff on message_threads;
create policy message_threads_select_staff on message_threads
  for select using (app.can_access_campus(app.student_campus(student_id)));

-- 9.7 messages
drop policy messages_select_staff on messages;
create policy messages_select_staff on messages
  for select using (app.can_access_campus(app.student_campus(student_id)));

-- 9.8 consent_events
drop policy consent_events_select_staff on consent_events;
create policy consent_events_select_staff on consent_events
  for select using (app.can_access_campus(app.student_campus(student_id)));

-- 9.9 record_access_log
drop policy record_access_log_select_staff on record_access_log;
create policy record_access_log_select_staff on record_access_log
  for select using (app.can_access_campus(app.student_campus(student_id)));


-- ── 10. COMMENTS (carry the rationale into the live catalog) ─────────────────
comment on function app.current_actor_id() is 'Authenticated principal id (JWT actor_id, else sub) for audit stamping. SECURITY DEFINER, pinned search_path.';
comment on function app.student_campus(uuid) is 'A student''s owning campus, RLS-bypassed (SECURITY DEFINER) so staff policies need no inline subquery against student_profiles (A3 recursion fix).';
comment on function app.is_staff() is 'True when any staff_profiles row exists for the caller. Tier scoping is can_access_campus, not here.';
comment on function app.can_access_campus(uuid) is 'super_admin → any campus; campus_admin/coach → own staff_profiles.campus_id. Null target or non-staff denies. Single staff-scoping primitive (replaces JWT role=staff).';
comment on function app.is_parent_of(uuid) is 'True ONLY when an active parent_student_link exists AND the linked current consent event is granted. Revoked/pending consent denies (FERPA/COPPA immediate revocation).';
comment on function app.is_staff_for_campus(uuid) is 'SHIM (binding L2): delegates to can_access_campus. 0001 name preserved; new code should call can_access_campus.';

comment on table parent_profiles is 'COPPA legal account holder for under-13. Sees a student only via an active, consent-granted parent_student_link.';
comment on table parent_student_links is 'Parent↔student relationship. status lifecycle (I3); current_consent_event_id is the DERIVED pointer into consent_events — the one consent truth (I1). No independent consent enum here.';
comment on column parent_student_links.parent_id is 'Workstream C binding (mirrors the staff binding): must equal the parent caller''s JWT actor_id (else sub) = parent_profiles.id, since is_parent_of matches this against current_actor_id(). This gates a parent''s access to a child''s records (COPPA/FERPA).';
comment on column parent_student_links.current_consent_event_id is 'Derived pointer to the current consent_events row; is_parent_of reads its status (granted required). Consent truth = consent_events, never duplicated.';
comment on table staff_profiles is 'Staff role tiers. CHECK forbids coach/campus_admin without a campus and super_admin with one (no limbo). Coach-vs-admin scope = Workstream B/UI.';
comment on column consent_events.consent_policy_version is 'Disclosure/policy wording version frozen at consent time (I2) — a later wording change cannot rewrite prior consents.';
comment on column consent_events.consent_scope is 'Structured record of WHAT was consented to (I2), so the consent screen renders honestly.';
comment on column student_attempts.graph_version is 'Curriculum content version the engine loaded when this attempt was scored (G2). NOT NULL, no default; stamped at write time (Workstream C), never back-filled.';
comment on column student_attempts.engine_version is 'Engine version that produced this attempt row (G2). NOT NULL, no default; stamped at write time.';
comment on column mastery_updates.graph_version is 'Curriculum content version the engine loaded when this update was produced (G2). NOT NULL, no default; stamped at write time, never back-filled.';

commit;


-- =============================================================================
-- TEARDOWN (reversibility) — DESTRUCTIVE. Run as 0002_down.sql / separate
-- checkpoint. Reverses 0002 in dependency order AND restores 0001's original
-- nine staff SELECT policies (L5) so a rollback never strands 0001 tables
-- policy-less. NOT part of the apply above.
-- =============================================================================
-- begin;
--   -- 9'. RESTORE 0001's original staff policies (drop the reconciled ones first).
--   drop policy student_profiles_select_staff   on student_profiles;
--   drop policy sessions_select_staff           on sessions;
--   drop policy student_attempts_select_staff   on student_attempts;
--   drop policy mastery_updates_select_staff    on mastery_updates;
--   drop policy course_enrollments_select_staff on course_enrollments;
--   drop policy message_threads_select_staff    on message_threads;
--   drop policy messages_select_staff           on messages;
--   drop policy consent_events_select_staff     on consent_events;
--   drop policy record_access_log_select_staff  on record_access_log;
--
--   create policy student_profiles_select_staff on student_profiles
--     for select using (app.is_staff_for_campus(campus_id));
--   create policy sessions_select_staff on sessions
--     for select using (
--       student_id in (select id from student_profiles where false)  -- 0001 placeholder
--     );
--   create policy student_attempts_select_staff on student_attempts
--     for select using (
--       app.is_staff_for_campus(
--         (select campus_id from student_profiles p where p.id = student_attempts.student_id)
--       )
--     );
--   create policy mastery_updates_select_staff on mastery_updates
--     for select using (
--       app.is_staff_for_campus(
--         (select campus_id from student_profiles p where p.id = mastery_updates.student_id)
--       )
--     );
--   create policy course_enrollments_select_staff on course_enrollments
--     for select using (
--       app.is_staff_for_campus(
--         (select campus_id from student_profiles p where p.id = course_enrollments.student_id)
--       )
--     );
--   create policy message_threads_select_staff on message_threads
--     for select using (
--       app.is_staff_for_campus(
--         (select campus_id from student_profiles p where p.id = message_threads.student_id)
--       )
--     );
--   create policy messages_select_staff on messages
--     for select using (
--       app.is_staff_for_campus(
--         (select campus_id from student_profiles p where p.id = messages.student_id)
--       )
--     );
--   create policy consent_events_select_staff on consent_events
--     for select using (
--       app.is_staff_for_campus(
--         (select campus_id from student_profiles p where p.id = consent_events.student_id)
--       )
--     );
--   create policy record_access_log_select_staff on record_access_log
--     for select using (
--       app.is_staff_for_campus(
--         (select campus_id from student_profiles p where p.id = record_access_log.student_id)
--       )
--     );
--
--   -- 5'. Drop the provenance columns.
--   alter table mastery_updates  drop column graph_version;
--   alter table student_attempts drop column engine_version;
--   alter table student_attempts drop column graph_version;
--
--   -- 4'. Drop the consent columns.
--   alter table consent_events drop column consent_scope;
--   alter table consent_events drop column consent_policy_version;
--
--   -- 2'. Drop identity tables (children first).
--   drop table if exists parent_student_links;
--   drop table if exists staff_profiles;
--   drop table if exists parent_profiles;
--
--   -- 1'. Restore the 0001 is_staff_for_campus body; drop the new helpers.
--   create or replace function app.is_staff_for_campus(p_campus uuid)
--   returns boolean language sql stable security definer
--   set search_path = pg_catalog, app as $$
--     select
--       coalesce(
--         (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'staff',
--         false
--       )
--       and p_campus is not null
--       and p_campus = app.current_campus_id();
--   $$;
--   drop function if exists app.is_parent_of(uuid);
--   drop function if exists app.can_access_campus(uuid);
--   drop function if exists app.is_staff();
--   drop function if exists app.student_campus(uuid);
--   drop function if exists app.current_actor_id();
-- commit;
-- =============================================================================
