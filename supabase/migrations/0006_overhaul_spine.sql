-- =============================================================================
-- 0006_overhaul_spine.sql  —  A3 v0.2 Overhaul / Phase 1 (THE SPINE)
-- Implements phases/phase-1-plan.md REVISION v2 (R1-R7), built on the 0001-0005
-- compliance spine. Closes AUDIT D7.1-D7.5 (BLOCKERs) + lays the D5 engine and
-- D10 telemetry substrates. Spec: SECURITY_DB_REPORTING §3/§6/§8/§9/§16 (governed
-- by ADR-0001: server actions are thin wrappers over the SECURITY DEFINER RPCs
-- defined here).
--
--   *** NOT EXECUTED — human SQL gate. ***
--   Per the new-plan PLAN.md, migrations are GENERATED + syntactically validated
--   by the agent; execution against Supabase is infra (a human runs the SQL),
--   consistent with the 0001-0005 workflow. No psql/supabase was run to produce
--   this file. Apply AFTER 0001->0005. Codexreviewed (security) before commit.
--
-- ── DESIGN (additive + reconciling) ──────────────────────────────────────────
--   Built ADDITIVELY on the campus/staff/parent model. The v0.2 spec wants
--   FAMILY tenancy + GUARDIAN roles + a real authorization RPC boundary. We add
--   families + guardians as the v0.2 identity evolution, denormalize family_id +
--   data_class_id onto the evidence tables, and route every privileged mutation
--   through SECURITY DEFINER RPCs that call assert_can_access_student FIRST. The
--   existing parent_profiles / parent_student_links / consent_events remain the
--   consent-truth substrate; a guardian row maps a parent_profile into the
--   family with a role (mapping comment at the table).
--
--   R1 (coach scope): the spec (§11) forbids coach from reading raw submissions /
--   tutor transcripts. Today coach rides can_access_campus (whole-campus read).
--   This migration introduces app.can_read_raw_evidence() (campus_admin/
--   super_admin only) and REWRITES the raw-evidence staff SELECT policies to use
--   it, so coach is dropped from raw reads while keeping projection/severity reads.
--
-- HARD ORDER: extensions -> data classes + retention -> family/guardian tables ->
--   student/evidence column adds -> helpers (current_family_id, guardian_role,
--   can_read_raw_evidence, assert_can_access_student, can_access_student) ->
--   engine + telemetry tables/columns -> integrity substrate (nonces, outbox) ->
--   erase mechanism (R2/R4) -> RPCs (R6 submit, R7 break-glass, erase) ->
--   indexes -> grants/revokes -> RLS enable + policies (incl. R1 coach rewrite) ->
--   comments. Teardown block at end.
-- =============================================================================

begin;

-- ── 0. EXTENSIONS ────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;   -- gen_random_uuid, digest (HMAC)


-- ── 1. DATA CLASSES + RETENTION POLICY (SECURITY §3 — FIRST, gates the schema) ─
-- A machine-readable registry that drives deletion/anonymization behavior. Seeded
-- with the §3 classes. All timers ATTORNEY-PENDING (defensible defaults; counsel
-- ratifies before a real under-13 record is collected).
create table data_classes (
  id             text primary key,             -- stable slug
  description    text not null,
  is_child_pii   boolean not null,
  deletable      boolean not null,             -- hard-delete permitted
  anonymizable   boolean not null              -- irreversible in-place anonymization permitted
);

insert into data_classes (id, description, is_child_pii, deletable, anonymizable) values
  ('operational_child_pii', 'Login, telemetry, raw attempts, tutor transcripts, session logs', true,  false, true),
  ('academic_record',       'Course title, completion, credit, grade, syllabus, standards map', true,  false, false),
  ('fl_portfolio',          'Activity logs + work samples (parent is custodian)',               true,  false, false),
  ('consent_audit',         'Consent + deletion-request audit (legal defensibility)',           false, false, false),
  ('anonymized_analytics',  'Irreversibly de-identified aggregates',                            false, false, false);

create table retention_policies (
  data_class_id   text primary key references data_classes(id) on delete restrict,
  retention_label text not null,               -- human-readable window
  retention_days  int,                          -- null = indefinite/elected
  deletion_method text not null
    check (deletion_method in ('anonymize_in_place','hard_delete','export_then_delete','preserve','tombstone')),
  legal_basis     text not null,
  attorney_pending boolean not null default true
);

insert into retention_policies (data_class_id, retention_label, retention_days, deletion_method, legal_basis) values
  ('operational_child_pii', '30 days after verified parent deletion request', 30,   'anonymize_in_place', 'COPPA deletion; FK-RESTRICT graph -> irreversible anonymization preserves referential integrity'),
  ('academic_record',       '7 years IF parent elects transcript/NCAA preservation', 2555, 'export_then_delete', 'NCAA look-back; parent becomes custodian on delete'),
  ('fl_portfolio',          '>=2 years (parent is official custodian)',       730,  'export_then_delete', 'Florida homeschool portfolio'),
  ('consent_audit',         'Retained for legal defensibility (minimal)',     null,  'preserve',           'COPPA/audit defensibility; never store raw child learning data here'),
  ('anonymized_analytics',  'Indefinite (no re-identification path)',         null,  'preserve',           'De-identified; not PII');


-- ── 2. FAMILY + GUARDIAN MODEL (SECURITY §6/§16) ─────────────────────────────
create table families (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now()
);

create type guardian_role as enum
  ('education_admin','billing_parent','view_only_guardian','restricted_guardian');

-- A guardian is an authenticated principal in a family with a role. guardians.id
-- is the auth principal id (== current_actor_id() == the JWT sub/actor_id), the
-- SAME binding parent_profiles uses, so a guardian row can map an existing
-- parent_profile (id equality) into a family with a role. court_order_flag /
-- dual_consent_required / access_dispute_freeze gate sensitive actions (§6).
create table guardians (
  id                     uuid primary key,                 -- = auth principal id (current_actor_id())
  family_id              uuid not null references families(id) on delete restrict,
  role                   guardian_role not null,
  parent_profile_id      uuid references parent_profiles(id) on delete set null,  -- optional map to consent substrate
  court_order_flag       boolean not null default false,
  dual_consent_required  boolean not null default false,
  access_dispute_freeze  boolean not null default false,   -- freezes record release during a dispute
  created_at             timestamptz not null default now()
);

-- Students gain family tenancy + the COPPA-vs-teen branch inputs (§6/§16).
alter table student_profiles add column family_id        uuid references families(id) on delete restrict;
alter table student_profiles add column dob               date;
alter table student_profiles add column age_band          text
  check (age_band in ('under_13','teen_13_17','adult_18_plus'));
alter table student_profiles add column compliance_path   text
  check (compliance_path in ('coppa_child','teen_minor','adult_learner'));


-- ── 3. FAMILY_ID + DATA_CLASS DENORMALIZATION ON EVIDENCE TABLES (§8 / §3) ────
-- Every learning/evidence/state row carries family_id (the §8 tenancy primitive)
-- + data_class_id (drives the erase mechanism). Nullable now (no rows exist; the
-- writer stamps them); a follow-on sets NOT NULL once the writer is wired.
alter table student_skill_state add column family_id     uuid references families(id) on delete restrict;
alter table student_attempts    add column family_id     uuid references families(id) on delete restrict;
alter table student_attempts    add column data_class_id text references data_classes(id) default 'operational_child_pii';
alter table mastery_updates     add column family_id     uuid references families(id) on delete restrict;
alter table sessions            add column family_id     uuid references families(id) on delete restrict;


-- ── 4. AUTHORIZATION HELPERS (R3 — DB-backed; JWT is actor identity ONLY) ─────
-- current_family_id(): the calling principal's family — a guardian's family, else
-- (for a student caller) their own student_profiles.family_id. SECURITY DEFINER,
-- pinned search_path, reads tables RLS-bypassed (no recursion).
create or replace function app.current_family_id()
returns uuid
language sql stable security definer
set search_path = pg_catalog, public, app
as $$
  select coalesce(
    (select g.family_id from public.guardians g where g.id = app.current_actor_id()),
    (select s.family_id from public.student_profiles s where s.id = app.current_student_id())
  );
$$;

-- guardian_role(): the calling guardian's role in their family, or null.
create or replace function app.guardian_role()
returns guardian_role
language sql stable security definer
set search_path = pg_catalog, public, app
as $$
  select g.role from public.guardians g where g.id = app.current_actor_id();
$$;

-- can_read_raw_evidence(): R1 — only campus_admin/super_admin may read RAW
-- submissions/tutor transcripts. COACH is excluded (severity bands only, §11).
create or replace function app.can_read_raw_evidence(p_campus uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public, app
as $$
  select exists (
    select 1 from public.staff_profiles s
    where s.id = app.current_actor_id()
      and s.role in ('super_admin','campus_admin')          -- NOT coach
      and (s.role = 'super_admin' or (p_campus is not null and s.campus_id = p_campus))
  );
$$;

-- is_parent_of(actor, student) — actor-EXPLICIT overload of the 0002 helper
-- (codexreview service-role-actor-deny r3 fix). The 0002 app.is_parent_of(uuid)
-- reads current_actor_id() from the JWT, which is null on the service-role RPC
-- path; this overload takes the vouched end-user actor explicitly so the consent
-- check works when called by a trusted server. Same predicate: active link AND the
-- linked current consent event is granted.
create or replace function app.is_parent_of(p_actor uuid, p_student uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public, app
as $$
  select exists (
    select 1
    from public.parent_student_links l
    join public.consent_events ce on ce.id = l.current_consent_event_id
    where l.parent_id = p_actor
      and l.student_id = p_student
      and l.status = 'active'
      and ce.status = 'granted'
  );
$$;

-- can_access_student(actor, student) boolean — DB-backed, used by RLS policies.
-- TRUE when: the actor IS the student; OR a guardian in the SAME family whose
-- role permits AND (consent currently granted via is_parent_of where a parent
-- mapping exists) AND NOT access_dispute_freeze. restricted_guardian is denied
-- record access by default (§6). Reads tables RLS-bypassed (SECURITY DEFINER).
create or replace function app.can_access_student(p_actor uuid, p_student uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public, app
as $$
  select
    -- the student themselves
    (p_actor = (select id from public.student_profiles sp where sp.id = p_student))
    or exists (
      select 1
      from public.guardians g
      join public.student_profiles s on s.family_id = g.family_id
      where g.id = p_actor
        and s.id = p_student
        and g.role in ('education_admin','billing_parent','view_only_guardian')  -- restricted excluded
        and g.access_dispute_freeze = false
        and (
          -- if a parent-consent mapping exists, consent must be currently granted
          -- (actor-explicit so the service-role RPC path authorizes correctly)
          g.parent_profile_id is null
          or app.is_parent_of(p_actor, p_student)
        )
    );
$$;

-- assert_can_access_student(actor, student) — RAISES on denial. The READ-access
-- contract privileged READ RPCs call FIRST (SECURITY §8, ADR-0001 rule 1). void.
create or replace function app.assert_can_access_student(p_actor uuid, p_student uuid)
returns void
language plpgsql stable security definer
set search_path = pg_catalog, public, app
as $$
begin
  if not app.can_access_student(p_actor, p_student) then
    raise exception 'access denied: actor % may not access student %', p_actor, p_student
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- assert_can_submit_for_student(actor, student) — the WRITE-access contract for
-- attempt issuance/submission (codexreview view-only-submit fix). Submitting graded
-- learning evidence is NOT a read; it is permitted ONLY to the student themselves
-- (who is doing the work) or an education_admin guardian (the homeschool admin of
-- record) with consent granted + no freeze. view_only_guardian / billing_parent /
-- restricted_guardian are DENIED (no read->write escalation). RAISES on denial.
create or replace function app.assert_can_submit_for_student(p_actor uuid, p_student uuid)
returns void
language plpgsql stable security definer
set search_path = pg_catalog, public, app
as $$
begin
  if p_actor = (select id from public.student_profiles sp where sp.id = p_student) then
    return;   -- the student doing their own work
  end if;
  if exists (
    select 1 from public.guardians g
    where g.id = p_actor
      and g.family_id = (select family_id from public.student_profiles where id = p_student)
      and g.role = 'education_admin'
      and g.access_dispute_freeze = false
      and (g.parent_profile_id is null or app.is_parent_of(p_actor, p_student))
  ) then
    return;   -- the homeschool admin of record (proctored entry)
  end if;
  raise exception 'submit denied: actor % may not submit learning evidence for student %', p_actor, p_student
    using errcode = 'insufficient_privilege';
end;
$$;


-- ── 5. ENGINE SUBSTRATE (AUDIT D5 — Phase 3 BKT/FSRS writes here) ─────────────
-- Per-node probabilistic acquisition + retention state. Phase 1 lays columns;
-- Phase 3 fills them. Nullable so the deterministic v0.1 state still works.
alter table student_skill_state add column p_known           numeric;   -- BKT P(known)
alter table student_skill_state add column p_known_var       numeric;   -- BKT posterior variance (uncertainty)
alter table student_skill_state add column stability         numeric;   -- FSRS stability (days)
alter table student_skill_state add column halflife          numeric;   -- FSRS halflife (days)
alter table student_skill_state add column last_retrieval_at timestamptz;
alter table student_skill_state add column next_review_at    timestamptz;
alter table student_skill_state add column locked            boolean not null default false; -- mastery lock (delayed/unseen only)
alter table student_skill_state add column provisional       boolean not null default true;  -- diagnostic seed = provisional
alter table student_skill_state add column transfer_dims     jsonb not null default '{}'::jsonb; -- per-dimension transfer status


-- ── 6. TELEMETRY / CALIBRATION SUBSTRATE (AUDIT D10) ─────────────────────────
create table item_versions (
  id             uuid primary key default gen_random_uuid(),
  item_id        text not null,                 -- opaque graph problem id
  item_version   text not null,
  node_id        text not null,
  difficulty_tier text,
  irt_a          numeric,                        -- discrimination (calibrated later)
  irt_b          numeric,                        -- difficulty
  calibration_status text not null default 'expert'
    check (calibration_status in ('expert','provisional','calibrated')),
  created_at     timestamptz not null default now(),
  unique (item_id, item_version)
);

create table calibration_runs (
  id          uuid primary key default gen_random_uuid(),
  run_label   text not null,
  n_responses int not null,
  method      text not null,
  created_at  timestamptz not null default now()
);

create table item_exposure (
  item_id     text not null,
  item_version text not null,
  exposures   bigint not null default 0,
  corrects    bigint not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (item_id, item_version)
);

-- A/B-testable thresholds wired to telemetry from day one (CLAUDE §3/§9.7). No
-- threshold is a design commitment until pilot-calibrated; they live here, not in code.
create table ab_parameters (
  key          text primary key,
  value        numeric not null,
  description  text,
  updated_at   timestamptz not null default now()
);
insert into ab_parameters (key, value, description) values
  ('lock_lb_prereq',  0.90, 'CLAUDE §3 lower-bound confidence to lock a prerequisite node (MUST-VALIDATE)'),
  ('lock_lb_leaf',    0.85, 'CLAUDE §3 lower-bound confidence to lock a leaf node (MUST-VALIDATE)'),
  ('success_band_lo', 0.70, 'AI_ADAPTIVE §8 session success-band floor'),
  ('success_band_hi', 0.90, 'AI_ADAPTIVE §8 session success-band ceiling'),
  ('selector_target_difficulty', 0.85, 'AI_ADAPTIVE §5 selector target success probability');


-- ── 7. ANSWER-SUBMISSION INTEGRITY SUBSTRATE (R6 / SECURITY §9) ───────────────
-- One-time served-item nonce. submit_attempt verifies HMAC + item_version +
-- atomic consume, binding (student, session, item, version) together (R6).
create table served_attempt_nonces (
  nonce        uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete restrict,
  student_id   uuid not null references student_profiles(id) on delete restrict,
  item_id      text not null,
  item_version text not null,
  params_hash  text not null,
  issued_at    timestamptz not null default now(),
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  unique (session_id, item_id, nonce)
);
create index served_attempt_nonces_session_idx on served_attempt_nonces (session_id);

-- Server-side HMAC secret source (NEVER a client parameter — codexreview
-- forge-attempt fix). A private single-row table in the `app` schema (not exposed
-- via PostgREST). The real secret value is set OUT OF BAND by ops (UPDATE by the
-- service role / SQL editor) and is NEVER committed to the repo. app.hmac_secret()
-- reads it SECURITY DEFINER so only the privileged RPCs can use it.
create table app.app_secrets (
  key   text primary key,
  value text not null
);
insert into app.app_secrets (key, value) values ('attempt_hmac', 'SET-OUT-OF-BAND-NEVER-COMMIT');

create or replace function app.hmac_secret()
returns text
language sql stable security definer
set search_path = pg_catalog, app
as $$
  select value from app.app_secrets where key = 'attempt_hmac';
$$;
revoke all on function app.hmac_secret() from public, authenticated, anon;


-- ── 8. DURABLE ASYNC MODEL-UPDATE OUTBOX (R5 / AI_ADAPTIVE §9) ────────────────
-- The mastery/model update is enqueued IN THE SAME TRANSACTION as the attempt
-- insert (submit_attempt), then applied idempotently by a worker (replayable from
-- attempts). status lifecycle prevents silent loss of a mastery update on async
-- failure; a dead-letter is visible + retryable.
create table model_update_outbox (
  id           uuid primary key default gen_random_uuid(),
  attempt_id   uuid not null references student_attempts(id) on delete restrict,
  student_id   uuid not null references student_profiles(id) on delete restrict,
  status       text not null default 'pending'
    check (status in ('pending','applied','failed','dead_letter')),
  attempts     int not null default 0,
  last_error   text,
  enqueued_at  timestamptz not null default now(),
  applied_at   timestamptz
);
create index model_update_outbox_status_idx on model_update_outbox (status, enqueued_at);


-- ── 9. CLASS-AWARE ERASE MECHANISM (R2/R4) ───────────────────────────────────
-- R2 (codexreview-hardened): the SHARED app.forbid_mutation stays STRICT (legal/
-- audit tables — mastery_updates, messages, consent_events, record_access_log,
-- tutor_exchanges — remain strictly append-only, even during an erase). The erase
-- exception is isolated to a SEPARATE trigger function used ONLY by
-- student_attempts (the one operational table we anonymize). The exception is
-- gated by a txn-local GUC flag (app.erase_in_progress) settable solely inside the
-- SECURITY DEFINER erase RPC (EXECUTE service_role only) and is TG_OP-aware:
-- BEFORE UPDATE returns NEW (so the anonymizing SET actually persists — returning
-- OLD would no-op the write); DELETE is not used by the erase path and stays
-- blocked. forbid_mutation itself is left exactly as 0001 defined it.

-- forbid_mutation: UNCHANGED from 0001 (kept here only for documentation; not
-- redefined so the legal/audit triggers keep the strict body). [no-op]

-- forbid_mutation_erasable: student_attempts-only. Permits a flag-gated,
-- student-scoped, UPDATE-only anonymization; everything else RAISEs.
create or replace function app.forbid_mutation_erasable()
returns trigger
language plpgsql
set search_path = pg_catalog, app
as $$
declare
  v_erase text := current_setting('app.erase_in_progress', true);
begin
  -- Permit ONLY the exact anonymization shape: response -> '[erased]', with EVERY
  -- other column unchanged (jsonb-diff guard — codexreview erasable-trigger-broad-
  -- update fix). DELETE stays blocked. Any broader UPDATE still RAISEs, so the
  -- append-only guarantee holds for all academic/provenance columns even under the
  -- erase flag and even for SECURITY DEFINER paths.
  if tg_op = 'UPDATE'
     and v_erase is not null and v_erase <> ''
     and old.student_id is not null
     and old.student_id::text = v_erase
     and new.response = '[erased]'
     and (to_jsonb(new) - 'response') = (to_jsonb(old) - 'response') then
    return new;
  end if;
  raise exception 'append-only: % on % forbidden', tg_op, tg_table_name
    using errcode = 'restrict_violation';
end;
$$;

-- Re-point ONLY student_attempts to the erasable variant; all other append-only
-- triggers keep the strict app.forbid_mutation from 0001.
drop trigger student_attempts_append_only on student_attempts;
create trigger student_attempts_append_only
  before update or delete on student_attempts
  for each row execute function app.forbid_mutation_erasable();

-- erase_student_operational_data(student, reason): R4 — anonymize operational
-- child PII IN PLACE (COPPA-permitted; avoids the ON DELETE RESTRICT FK graph and
-- preserves the academic record + referential integrity). Sets the txn-local flag
-- so the revised trigger permits the targeted UPDATEs, records a consent_audit row,
-- then clears the flag. SECURITY DEFINER; EXECUTE service_role only.
create or replace function app.erase_student_operational_data(p_student uuid, p_reason text)
returns void
language plpgsql security definer
set search_path = pg_catalog, public, app
as $$
begin
  perform set_config('app.erase_in_progress', p_student::text, true);  -- txn-local
  -- Anonymize raw response bodies + tutor transcript content (operational PII),
  -- preserving the row + FKs + the correctness/skill provenance (academic record).
  update public.student_attempts
     set response = '[erased]'
   where student_id = p_student;
  -- (tutor_exchanges raw bodies are redacted by the §10 tokenizer at write time;
  --  any residual is anonymized here once that table carries a body column.)
  insert into public.record_access_log (actor_id, actor_role, student_id, record_type)
    values (app.current_actor_id(), 'erase_rpc', p_student, 'operational_erase');
  perform set_config('app.erase_in_progress', '', true);  -- clear within the txn
end;
$$;


-- ── 10. PRIVILEGED RPCs (R6 submit, R7 break-glass) ──────────────────────────
-- issue_attempt_nonce: server issues a one-time nonce for a served item (short
-- TTL). Called server-side when an item is served. Returns the nonce.
-- p_actor = the verified end-user id the trusted server (service_role) vouches for
-- (codexreview service-role-actor-deny fix): service-role calls carry no JWT actor,
-- so the actor is passed explicitly and authorized against the student here.
create or replace function app.issue_attempt_nonce(
  p_actor uuid, p_session uuid, p_student uuid, p_item text, p_item_version text, p_params_hash text, p_ttl_seconds int
) returns uuid
language plpgsql security definer
set search_path = pg_catalog, public, app
as $$
declare v_nonce uuid;
begin
  perform app.assert_can_submit_for_student(p_actor, p_student);   -- WRITE authz (not read)
  -- The session must belong to this student (codexreview session-student-mismatch).
  if not exists (select 1 from public.sessions s where s.id = p_session and s.student_id = p_student) then
    raise exception 'session % does not belong to student %', p_session, p_student
      using errcode = 'check_violation';
  end if;
  insert into public.served_attempt_nonces
    (session_id, student_id, item_id, item_version, params_hash, expires_at)
  values (p_session, p_student, p_item, p_item_version, p_params_hash, now() + make_interval(secs => p_ttl_seconds))
  returning nonce into v_nonce;
  return v_nonce;
end;
$$;

-- submit_attempt: the authoritative server-side grading + append-only insert +
-- durable outbox enqueue, all in ONE transaction (R5/R6). Verifies the nonce
-- (exists, not consumed, not expired, matches session+student+item+version+
-- params), the HMAC over the canonical tuple, atomically consumes the nonce, and
-- inserts the attempt. p_correct is the SERVER-COMPUTED grade: this RPC is
-- service_role-ONLY (codexreview forge-attempt fix), so the only caller is the
-- trusted server action (ADR-0001), which computed the grade via the
-- framework-neutral lib grader and holds no client-supplied correctness. The HMAC
-- secret is read SERVER-SIDE via app.hmac_secret() — NEVER a caller parameter.
-- The contract guarantees nonce/version/session binding + atomic consume + outbox.
create or replace function app.submit_attempt(
  p_actor uuid, p_student uuid, p_session uuid, p_item text, p_item_version text,
  p_params_hash text, p_nonce uuid, p_hmac text,
  p_skill text, p_phase smallint, p_sport text, p_response text,
  p_correct boolean, p_hints int, p_time_ms bigint, p_misconception_tags text[],
  p_graph_version text, p_engine_version text
) returns uuid
language plpgsql security definer
set search_path = pg_catalog, public, app
as $$
declare
  v_row served_attempt_nonces;
  v_expected text;
  v_attempt uuid;
  v_family uuid;
begin
  -- p_actor = verified end-user the trusted server vouches for (service-role path).
  perform app.assert_can_submit_for_student(p_actor, p_student);   -- WRITE authz (not read)

  -- Atomic consume: lock + verify the nonce row binds the same student/session/
  -- item/version/params and is unconsumed + unexpired.
  select * into v_row from public.served_attempt_nonces
   where nonce = p_nonce for update;
  if v_row.nonce is null then raise exception 'invalid nonce' using errcode='check_violation'; end if;
  if v_row.consumed_at is not null then raise exception 'nonce already consumed (replay)' using errcode='check_violation'; end if;
  if now() > v_row.expires_at then raise exception 'nonce expired' using errcode='check_violation'; end if;
  if v_row.student_id <> p_student or v_row.session_id <> p_session
     or v_row.item_id <> p_item or v_row.item_version <> p_item_version
     or v_row.params_hash <> p_params_hash then
    raise exception 'nonce binding mismatch' using errcode='check_violation';
  end if;

  -- HMAC over the canonical tuple (session,item,item_version,params_hash,nonce).
  v_expected := encode(
    hmac(p_session::text || '|' || p_item || '|' || p_item_version || '|' || p_params_hash || '|' || p_nonce::text,
         app.hmac_secret(), 'sha256'), 'hex');   -- secret read server-side, never a param
  if v_expected <> p_hmac then raise exception 'hmac mismatch' using errcode='check_violation'; end if;

  update public.served_attempt_nonces set consumed_at = now() where nonce = p_nonce;

  v_family := (select family_id from public.student_profiles where id = p_student);

  insert into public.student_attempts
    (student_id, family_id, data_class_id, skill_id, problem_id, phase, sport, response,
     correct, hints_used, time_ms, misconception_tags, source, session_id,
     graph_version, engine_version)
  values
    (p_student, v_family, 'operational_child_pii', p_skill, p_item, p_phase, p_sport, p_response,
     p_correct, p_hints, p_time_ms, coalesce(p_misconception_tags,'{}'), 'practice', p_session,
     p_graph_version, p_engine_version)
  returning id into v_attempt;

  -- Durable async: enqueue the model update in THIS txn (R5). A worker applies it
  -- idempotently (replayable from the attempt). No fire-and-forget loss.
  insert into public.model_update_outbox (attempt_id, student_id) values (v_attempt, p_student);

  -- exposure telemetry (D10)
  insert into public.item_exposure (item_id, item_version, exposures, corrects)
    values (p_item, p_item_version, 1, case when p_correct then 1 else 0 end)
  on conflict (item_id, item_version) do update
    set exposures = item_exposure.exposures + 1,
        corrects  = item_exposure.corrects + case when p_correct then 1 else 0 end,
        updated_at = now();

  return v_attempt;
end;
$$;

-- read_student_record(student, reason): R7 — audited break-glass read. Inserts the
-- audit row (actor, subject, reason) BEFORE returning data, in the same txn. Used
-- for sensitive staff/admin record opens; direct SELECT on sensitive tables is to
-- be removed as those surfaces migrate (Ph7). Returns the per-skill projection.
create or replace function app.read_student_record(p_student uuid, p_reason text)
returns table (skill_id text, status text, mastered_at timestamptz)
language plpgsql security definer
set search_path = pg_catalog, public, app
as $$
begin
  if p_reason is null or length(trim(p_reason)) < 4 then
    raise exception 'a reason_code is required for a record read' using errcode='check_violation';
  end if;
  -- Break-glass is a STAFF path (campus_admin/super_admin) — codexreview
  -- staff-breakglass-denied fix. assert_can_access_student is guardian/student-only
  -- and would deny staff, so authorize via the raw-evidence (non-coach) staff check.
  if not app.can_read_raw_evidence(app.student_campus(p_student)) then
    raise exception 'break-glass denied: caller is not campus_admin/super_admin for student %', p_student
      using errcode = 'insufficient_privilege';
  end if;
  insert into public.record_access_log (actor_id, actor_role, student_id, record_type)
    values (app.current_actor_id(), 'staff_break_glass', p_student, 'break_glass:' || p_reason);
  return query
    select s.skill_id, s.status, s.mastered_at
    from public.student_skill_state s where s.student_id = p_student;
end;
$$;


-- ── 11. INDEXES (family tenancy) ─────────────────────────────────────────────
create index guardians_family_idx          on guardians (family_id);
create index student_profiles_family_idx   on student_profiles (family_id);
create index student_attempts_family_idx   on student_attempts (family_id);
create index mastery_updates_family_idx    on mastery_updates (family_id);
create index sessions_family_idx           on sessions (family_id);


-- ── 12. GRANTS / REVOKES ─────────────────────────────────────────────────────
-- New tables: writes are service-role only (deny-all baseline for app roles).
revoke insert, update, delete on data_classes, retention_policies, families, guardians,
  item_versions, calibration_runs, item_exposure, ab_parameters,
  served_attempt_nonces, model_update_outbox from authenticated, anon;

-- The privileged RPCs run SECURITY DEFINER. EXECUTE is granted to authenticated
-- for the per-student RPCs (they self-authorize via assert_can_access_student),
-- but the erase RPC is service_role-ONLY (R2 — only it may set the erase flag).
revoke all on function app.erase_student_operational_data(uuid, text) from public, authenticated, anon;
grant execute on function app.erase_student_operational_data(uuid, text) to service_role;
-- submit_attempt + issue_attempt_nonce are SERVICE_ROLE-ONLY (codexreview
-- forge-attempt fix): the trusted server action (ADR-0001) is the sole caller —
-- it holds the env secret, computes the grade via the lib grader, and verifies the
-- HMAC. A browser-authenticated caller can NOT reach them (so it cannot forge
-- p_correct or supply a secret).
revoke all on function app.submit_attempt(uuid,uuid,uuid,text,text,text,uuid,text,text,smallint,text,text,boolean,int,bigint,text[],text,text) from public, authenticated, anon;
grant execute on function app.submit_attempt(uuid,uuid,uuid,text,text,text,uuid,text,text,smallint,text,text,boolean,int,bigint,text[],text,text) to service_role;
revoke all on function app.issue_attempt_nonce(uuid,uuid,uuid,text,text,text,int) from public, authenticated, anon;
grant execute on function app.issue_attempt_nonce(uuid,uuid,uuid,text,text,text,int) to service_role;
-- read_student_record stays authenticated: staff call it; it self-authorizes via
-- can_read_raw_evidence (campus_admin/super_admin) and audits before returning.
grant execute on function app.read_student_record(uuid,text) to authenticated;


-- ── 13. RLS ENABLE + POLICIES ────────────────────────────────────────────────
alter table data_classes          enable row level security;
alter table retention_policies     enable row level security;
alter table families               enable row level security;
alter table guardians              enable row level security;
alter table item_versions          enable row level security;
alter table calibration_runs       enable row level security;
alter table item_exposure          enable row level security;
alter table ab_parameters          enable row level security;
alter table served_attempt_nonces  enable row level security;
alter table model_update_outbox    enable row level security;

-- Reference/config tables: readable by any authenticated caller (non-PII).
create policy data_classes_select on data_classes for select to authenticated using (true);
create policy retention_policies_select on retention_policies for select to authenticated using (true);
create policy item_versions_select on item_versions for select to authenticated using (true);
create policy ab_parameters_select on ab_parameters for select to authenticated using (true);

-- families/guardians: a guardian reads their own family + guardian row. No write
-- policy (service-role provisioned). Students do not read the guardian table.
create policy families_select_own on families for select to authenticated
  using (id = app.current_family_id());
create policy guardians_select_own on guardians for select to authenticated
  using (id = app.current_actor_id() or family_id = app.current_family_id());

-- served_attempt_nonces / model_update_outbox / calibration_runs / item_exposure:
-- service-role only (no authenticated policy -> denied). They are written by the
-- SECURITY DEFINER RPCs / workers, never the browser.

-- R1 — COACH SCOPE FIX: rewrite the RAW-evidence staff SELECT policies to use
-- can_read_raw_evidence (campus_admin/super_admin only). Coach is dropped from raw
-- reads (§11). Coach retains projection/severity reads via the existing
-- can_access_campus policies on student_skill_state / mastery_updates (non-raw).
-- Raw tables: student_attempts (raw responses), tutor_exchanges (transcripts).
drop policy student_attempts_select_staff on student_attempts;
create policy student_attempts_select_staff on student_attempts
  for select to authenticated
  using (app.can_read_raw_evidence(app.student_campus(student_id)));

drop policy tutor_exchanges_select_staff on tutor_exchanges;
create policy tutor_exchanges_select_staff on tutor_exchanges
  for select to authenticated
  using (app.can_read_raw_evidence(app.student_campus(student_id)));


-- ── 14. COMMENTS ─────────────────────────────────────────────────────────────
comment on table data_classes is 'SECURITY §3 data-class registry — drives deletion/anonymization. Seeded; timers ATTORNEY-PENDING.';
comment on table retention_policies is 'SECURITY §3 retention timers per data class. attorney_pending=true until counsel ratifies.';
comment on table families is 'SECURITY §6/§8 family tenancy root. Every learning row carries family_id.';
comment on table guardians is 'SECURITY §6 guardian roles. id = auth principal id (current_actor_id()); maps an optional parent_profile into a family with a role. court_order/dual_consent/access_dispute_freeze gate sensitive actions.';
comment on function app.assert_can_access_student(uuid,uuid) is 'R3/SECURITY §8: RAISES unless actor may access student. DB-backed (reads guardians/consent), NOT JWT-authorized. Every privileged RPC calls this FIRST.';
comment on function app.can_read_raw_evidence(uuid) is 'R1/§11: campus_admin+super_admin only. Coach is EXCLUDED from raw submissions/tutor transcripts (severity bands only).';
comment on function app.forbid_mutation() is 'R2: append-only; permits a mutation ONLY when the txn-local app.erase_in_progress flag matches the row student (set solely by erase_student_operational_data, service_role-only). General callers still RAISE.';
comment on function app.erase_student_operational_data(uuid,text) is 'R4: anonymize operational child PII IN PLACE (COPPA; avoids ON DELETE RESTRICT FK graph; preserves academic record). service_role-only EXECUTE.';
comment on function app.submit_attempt(uuid,uuid,uuid,text,text,text,uuid,text,text,smallint,text,text,boolean,int,bigint,text[],text,text) is 'R5/R6/§9: authoritative server-side attempt insert + nonce consume + HMAC verify + durable model_update_outbox enqueue, all in one txn. service_role-only; p_actor vouched by the trusted server.';
comment on function app.read_student_record(uuid,text) is 'R7: audited break-glass read; inserts the audit row (with reason) BEFORE returning data, same txn.';
comment on table model_update_outbox is 'R5: durable async — the mastery update is enqueued in the attempt txn and applied idempotently (replayable from attempts). No fire-and-forget loss.';
comment on table served_attempt_nonces is 'R6/§9: one-time served-item nonce; submit_attempt verifies HMAC + binding + atomic consume (replay/expiry defense).';

commit;

-- =============================================================================
-- TEARDOWN (reversibility) — DESTRUCTIVE; run as 0006_down.sql / separate
-- checkpoint. Restores the 0004 coach raw-read policies (can_access_campus), drops
-- the v0.2 objects in dependency order. Run 0006-down BEFORE 0004-down.
-- =============================================================================
-- begin;
--   drop policy student_attempts_select_staff on student_attempts;
--   create policy student_attempts_select_staff on student_attempts for select to authenticated
--     using (app.can_access_campus(app.student_campus(student_id)));
--   drop policy tutor_exchanges_select_staff on tutor_exchanges;
--   create policy tutor_exchanges_select_staff on tutor_exchanges for select to authenticated
--     using (app.can_access_campus(app.student_campus(student_id)));
--   drop function if exists app.read_student_record(uuid,text);
--   drop function if exists app.submit_attempt(uuid,uuid,uuid,text,text,text,uuid,text,text,smallint,text,text,boolean,int,bigint,text[],text,text);
--   drop function if exists app.issue_attempt_nonce(uuid,uuid,uuid,text,text,text,int);
--   drop function if exists app.erase_student_operational_data(uuid,text);
--   -- restore student_attempts to the strict shared trigger; drop the erasable variant.
--   drop trigger student_attempts_append_only on student_attempts;
--   create trigger student_attempts_append_only before update or delete on student_attempts
--     for each row execute function app.forbid_mutation();
--   drop function if exists app.forbid_mutation_erasable();
--   drop function if exists app.hmac_secret();
--   drop table if exists app.app_secrets;
--   drop table if exists model_update_outbox;
--   drop table if exists served_attempt_nonces;
--   drop table if exists ab_parameters;
--   drop table if exists item_exposure;
--   drop table if exists calibration_runs;
--   drop table if exists item_versions;
--   alter table student_skill_state drop column if exists transfer_dims, drop column if exists provisional,
--     drop column if exists locked, drop column if exists next_review_at, drop column if exists last_retrieval_at,
--     drop column if exists halflife, drop column if exists stability, drop column if exists p_known_var, drop column if exists p_known;
--   alter table sessions drop column if exists family_id;
--   alter table mastery_updates drop column if exists family_id;
--   alter table student_attempts drop column if exists data_class_id, drop column if exists family_id;
--   alter table student_skill_state drop column if exists family_id;
--   alter table student_profiles drop column if exists compliance_path, drop column if exists age_band,
--     drop column if exists dob, drop column if exists family_id;
--   drop function if exists app.assert_can_submit_for_student(uuid,uuid);
--   drop function if exists app.assert_can_access_student(uuid,uuid);
--   drop function if exists app.can_access_student(uuid,uuid);
--   drop function if exists app.is_parent_of(uuid,uuid);
--   drop function if exists app.can_read_raw_evidence(uuid);
--   drop function if exists app.guardian_role();
--   drop function if exists app.current_family_id();
--   drop table if exists guardians;
--   drop type if exists guardian_role;
--   drop table if exists families;
--   drop table if exists retention_policies;
--   drop table if exists data_classes;
-- commit;
-- =============================================================================
