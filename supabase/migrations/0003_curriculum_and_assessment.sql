-- =============================================================================
-- 0003_curriculum_and_assessment.sql  —  A3 Virtual School / Algebra 1 / Phase 11A
-- The versioned curriculum SNAPSHOT (audit referent for skill_ids; the graph
-- stays JSON source of truth at runtime), diagnostic PROVENANCE (explanation,
-- never authority), the STUBBED assessment surface (summative results + the
-- immutable+versioned grade artifact), a proctor stub on sessions, video
-- metadata, and the Phase-10C tutor-exchange shape. TABLES ONLY: every new
-- table ships RLS-enabled (deny-all baseline) + its append-only guards in THIS
-- file; the policy BODIES are Workstream B (0004).
--
--   *** NOT EXECUTED — Matt checkpoint. ***
--   Per CLAUDE.md "Any schema migration before it runs" is a human checkpoint.
--   This file touches the store of children's education records. NO agent runs
--   it. No psql / supabase / SQL was run to produce or verify this file. Read it
--   top-to-bottom; approve; THEN run via the Supabase migration tooling, AFTER
--   0001_compliance_spine.sql and 0002_identity_and_roles.sql have been applied.
--
-- ── CURRICULUM SNAPSHOT (binding G1) — IMMUTABLE per version ──────────────────
--   curriculum_graphs holds the validated graph as ONE jsonb row per version: a
--   durable, auditable snapshot of EXACTLY what a cohort was assessed against
--   (the git repo is NOT the compliance record; the DB is). It is IMMUTABLE
--   (revoke update/delete + app.forbid_mutation trigger). The active version is
--   DERIVED from a SEPARATE append-only curriculum_graph_activations log (active
--   = latest activation) — NOT a mutable is_active bit. The 4,588 problems are
--   NOT exploded into rows; skill_id/problem_id remain opaque text everywhere.
--
-- ── DIAGNOSTIC PROVENANCE (binding DX1) — explanation, never authority ────────
--   diagnostic_estimates EXPLAINS the diagnostic engine's per-node estimate and
--   records the audit-critical "declined credit despite correct" flag. It does
--   NOT carry prev/new_mastery — that would FORK the credit truth. Committed
--   credit derives SOLELY from mastery_updates (the one source of truth). The
--   confidence/evidence_kind enums mirror lib/diagnostic-engine exactly.
--
-- ── ASSESSMENT (binding S1/S2/S3) — STUBBED, Phase 7D deferred ────────────────
--   summative_results: APPEND-ONLY evidence; a re-sit appends a new row.
--   grade_artifacts: IMMUTABLE + VERSIONED — a regrade APPENDS a new version,
--     the issued one is preserved (a credential handed to a registrar must not
--     mutate). composition jsonb is FROZEN at issuance and carries STRUCTURED
--     renderable keys (credited-vs-practiced honesty — trust-layer integrity).
--   sessions: nullable proctor stub fields (only summative sessions populate).
--
-- ── CROSS-CUTTING (binding C1/C2) ────────────────────────────────────────────
--   Every new table: uuid PK gen_random_uuid(), timestamptz, opaque-text skill
--   ids (no FK to the JSON graph), RLS ENABLED here (deny-all baseline; policy
--   bodies = Workstream B 0004). Each APPEND-ONLY table ships BOTH guards
--   (revoke update/delete from app roles + a BEFORE UPDATE/DELETE trigger) in
--   THIS file, never deferred — matching 0001's defense-in-depth.
--   graph_version + engine_version pinned on every evidence row (G2).
--
-- HARD ORDER (do not reorder): tables → indexes → triggers (append-only) →
-- grants/revokes (append-only + identity) → RLS enable (deny-all) → comments.
-- =============================================================================

begin;

-- ── 1. TABLES ────────────────────────────────────────────────────────────────

-- 1.1 curriculum_graphs — IMMUTABLE versioned snapshot of the validated graph.
-- One jsonb row per content version. The app still LOADS the graph from the
-- bundled JSON at runtime; this row is the audit snapshot + the FK-less referent
-- for the opaque skill_ids stamped on evidence rows. graph_version is the
-- primary key (the same string stamped on evidence rows via G2). Immutability is
-- enforced below (revoke + trigger) — there is no UPDATE/DELETE path.
create table curriculum_graphs (
  graph_version  text primary key,
  schema_version text not null,
  graph          jsonb not null,
  published_at   timestamptz not null default now()
);

-- 1.2 curriculum_graph_activations — APPEND-ONLY activation log. The ACTIVE
-- curriculum version is DERIVED (the row with the greatest activated_at), not a
-- mutable is_active flag (G1) — so "what was active when" is reconstructable and
-- activation is itself an audit fact, never an in-place overwrite.
create table curriculum_graph_activations (
  id            uuid primary key default gen_random_uuid(),
  graph_version text not null references curriculum_graphs(graph_version) on delete restrict,
  activated_at  timestamptz not null default now()
);

-- 1.3 diagnostic_estimates — APPEND-ONLY diagnostic PROVENANCE (DX1). EXPLAINS
-- the per-node estimate and records declined-credit; it is NOT the credit truth
-- (no prev/new_mastery — committed credit derives SOLELY from mastery_updates).
-- confidence + evidence_kind enums mirror lib/diagnostic-engine. skill_id is
-- opaque text (no FK). evidence_attempt_ids points at the student_attempts that
-- evidenced the estimate (audit reconstructability).
create table diagnostic_estimates (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references sessions(id) on delete restrict,
  -- Denormalized owner (Phase 11B / binding B1). Own-row RLS needs a direct
  -- student_id so the policy is `student_id = app.current_student_id()` and stays
  -- subquery-free (scoping via the RLS-protected sessions would re-trigger RLS /
  -- recurse — the 0001 invariant forbids it). The writer (Workstream C) stamps
  -- student_id from the SAME session this row references; the two must agree.
  student_id          uuid not null references student_profiles(id) on delete restrict,
  skill_id            text not null,                 -- opaque graph node id (not an FK)
  estimate_status     text,                          -- engine MasteryStatus estimate (mastered/near_mastery/developing/unknown ...)
  confidence          text not null
    check (confidence in ('high','medium','low','unknown')),
  evidence_kind       text not null
    check (evidence_kind in ('directly-probed','inferred-from-descendant','descended-past','untouched')),
  evidence_attempt_ids uuid[] not null default '{}',
  -- The audit-critical flag: correct-but-DECLINED credit (e.g. unconfirmed
  -- chain). credited=false despite a correct probe is the integrity signal.
  credited            boolean not null,
  graph_version       text not null,                 -- pinned at write time (G2)
  engine_version      text not null,                 -- pinned at write time (G2)
  created_at          timestamptz not null default now()
);

-- 1.4 summative_results — APPEND-ONLY summative evidence (S1), STUBBED (Phase 7D
-- deferred). One row per scored summative form; a re-sit APPENDS a new row.
-- source is fixed 'summative'. per-standard breakdown is jsonb. graph_version +
-- engine_version pinned (G2). course_id/form_id are opaque text.
create table summative_results (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references student_profiles(id) on delete restrict,
  course_id      text not null,                      -- opaque course id (not an FK)
  form_id        text not null,                      -- seeded summative form id (opaque)
  score          numeric,
  breakdown      jsonb,                              -- per-standard breakdown
  source         text not null default 'summative'
    check (source = 'summative'),
  graph_version  text not null,                      -- pinned at write time (G2)
  engine_version text not null,                      -- pinned at write time (G2)
  created_at     timestamptz not null default now()
);

-- 1.5 grade_artifacts — IMMUTABLE + VERSIONED credential (S2), STUBBED. A
-- regrade APPENDS a new version; the issued one is preserved (a credential
-- handed to a registrar must not mutate). composition jsonb is FROZEN at
-- issuance and MUST carry STRUCTURED renderable keys (documented below), not
-- prose, so the credential renders honest credited-vs-practiced (trust-layer
-- integrity). issued_to/purpose form the FERPA disclosure trail.
create table grade_artifacts (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references student_profiles(id) on delete restrict,
  course_id      text not null,                      -- opaque course id (not an FK)
  version        int not null,                       -- monotonic per (student_id, course_id)
  letter         text,
  percent        numeric,
  -- FROZEN at issuance. Required structured keys (so the credential renders
  -- honest credited-vs-practiced, not prose):
  --   credited_skill_count, total_skill_count,
  --   summative_contribution, practice_contribution, weighting, graph_version.
  composition    jsonb not null,
  graph_version  text not null,                      -- pinned at write time (G2)
  engine_version text not null,                      -- pinned at write time (G2)
  issued_to      text,                               -- FERPA disclosure trail
  purpose        text,                               -- FERPA disclosure trail
  generated_at   timestamptz not null default now(),
  unique (student_id, course_id, version)
);

-- 1.6 video_assets — METADATA ONLY (V1). Files live on Cloudflare Stream; this
-- row carries no raw playable URL — the playback URL is a SIGNED, server-minted
-- token (Workstream D). skill_id is opaque text (no FK). READ SCOPE (for
-- Workstream B): any authenticated student may read the metadata (curriculum
-- info, not PII) to request a signed URL server-side; staff write.
create table video_assets (
  id               uuid primary key default gen_random_uuid(),
  skill_id         text not null,                    -- opaque graph node id (not an FK)
  provider         text not null default 'cloudflare-stream',
  playback_id      text not null,
  kind             text,                             -- e.g. lesson | worked-example | explain
  duration_seconds int,
  captions_url     text,
  created_at       timestamptz not null default now()
);

-- 1.7 tutor_exchanges — APPEND-ONLY shape ONLY (V2). Phase 10C not built — this
-- is forward-compat shape so the schema is coherent and RLS covers it. The
-- append-only posture matches the other logs (the AI tutor's exchanges are an
-- audit record). skill_id is opaque text (no FK).
create table tutor_exchanges (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references student_profiles(id) on delete restrict,
  role        text not null,                         -- e.g. explain | hint | reframe (10C)
  prompt      text not null,
  response    jsonb,
  skill_id    text,                                  -- opaque graph node id (not an FK)
  created_at  timestamptz not null default now()
);


-- ── 2. SESSIONS PROCTOR STUB (binding S3) ────────────────────────────────────
-- Nullable; only summative sessions populate these. proctor_id is a deferred-FK
-- (a proctors table arrives with the assessment build) — bare uuid until then.
alter table sessions add column proctor_id          uuid;
alter table sessions add column proctor_location    text;
alter table sessions add column proctor_attestation text;


-- ── 3. INDEXES ───────────────────────────────────────────────────────────────
create index curriculum_graph_activations_version_idx
  on curriculum_graph_activations (graph_version);
create index curriculum_graph_activations_activated_idx
  on curriculum_graph_activations (activated_at);

create index diagnostic_estimates_session_idx on diagnostic_estimates (session_id);
create index diagnostic_estimates_student_idx  on diagnostic_estimates (student_id);
create index diagnostic_estimates_skill_idx   on diagnostic_estimates (skill_id);

create index summative_results_student_course_idx on summative_results (student_id, course_id);

create index grade_artifacts_student_course_idx on grade_artifacts (student_id, course_id);

create index video_assets_skill_idx on video_assets (skill_id);

create index tutor_exchanges_student_idx on tutor_exchanges (student_id);
create index tutor_exchanges_skill_idx   on tutor_exchanges (skill_id);


-- ── 4. TRIGGERS — APPEND-ONLY / IMMUTABILITY (mechanism (b)) ─────────────────
-- Reuses app.forbid_mutation() from 0001 (BEFORE UPDATE OR DELETE → RAISE). The
-- actual immutability guarantee for ANY role including the owner; the REVOKEs
-- below are the first line for ordinary app paths. curriculum_graphs is
-- immutable-once-published; the activation log, diagnostic estimates, summative
-- results, grade artifacts, and tutor exchanges are append-only evidence.
create trigger curriculum_graphs_append_only
  before update or delete on curriculum_graphs
  for each row execute function app.forbid_mutation();

create trigger curriculum_graph_activations_append_only
  before update or delete on curriculum_graph_activations
  for each row execute function app.forbid_mutation();

create trigger diagnostic_estimates_append_only
  before update or delete on diagnostic_estimates
  for each row execute function app.forbid_mutation();

create trigger summative_results_append_only
  before update or delete on summative_results
  for each row execute function app.forbid_mutation();

create trigger grade_artifacts_append_only
  before update or delete on grade_artifacts
  for each row execute function app.forbid_mutation();

create trigger tutor_exchanges_append_only
  before update or delete on tutor_exchanges
  for each row execute function app.forbid_mutation();


-- ── 5. GRANTS / REVOKES (mechanism (a)) ──────────────────────────────────────
-- Append-only / immutable tables: revoke UPDATE/DELETE from the app roles so the
-- normal API cannot mutate them even before RLS is consulted (the triggers above
-- back this for privileged roles). curriculum_graphs/activations are
-- service-administered (the publish path), so INSERT is revoked from app roles
-- too. video_assets is staff-written (Workstream B exposes any write policy);
-- revoke write verbs from app roles as the deny baseline.
revoke update, delete on curriculum_graphs              from authenticated, anon;
revoke insert, update, delete on curriculum_graphs      from authenticated, anon;
revoke insert, update, delete on curriculum_graph_activations from authenticated, anon;
revoke update, delete on diagnostic_estimates           from authenticated, anon;
revoke update, delete on summative_results              from authenticated, anon;
revoke update, delete on grade_artifacts                from authenticated, anon;
revoke insert, update, delete on video_assets           from authenticated, anon;
revoke update, delete on tutor_exchanges                from authenticated, anon;


-- ── 6. RLS ENABLE — DENY-ALL BASELINE (binding C1) ───────────────────────────
-- RLS on + no policy = denied. The POLICY BODIES for every table here are
-- Workstream B (0004). No table is left readable without a policy.
alter table curriculum_graphs             enable row level security;
alter table curriculum_graph_activations  enable row level security;
alter table diagnostic_estimates          enable row level security;
alter table summative_results             enable row level security;
alter table grade_artifacts               enable row level security;
alter table video_assets                  enable row level security;
alter table tutor_exchanges               enable row level security;


-- ── 7. COMMENTS (carry the rationale into the live catalog) ──────────────────
comment on table curriculum_graphs is 'IMMUTABLE versioned snapshot of the validated graph (one jsonb row per version). The DB — not git — is the compliance record. Graph still LOADED from JSON at runtime; this is the audit referent for opaque skill_ids. Guarded by revoke + app.forbid_mutation.';
comment on column curriculum_graphs.graph_version is 'Content version; same string stamped on evidence rows (G2).';
comment on table curriculum_graph_activations is 'APPEND-ONLY activation log. Active version is DERIVED (greatest activated_at), never a mutable is_active bit (G1).';
comment on table diagnostic_estimates is 'APPEND-ONLY diagnostic PROVENANCE. EXPLAINS estimates + records declined-credit; NOT the credit truth (no prev/new_mastery). Committed credit derives SOLELY from mastery_updates.';
comment on column diagnostic_estimates.student_id is 'Denormalized owner (binding B1). Enables subquery-free own-row RLS (student_id = app.current_student_id()). Writer (Workstream C) stamps it from the SAME session this row references.';
comment on column diagnostic_estimates.credited is 'Audit-critical: false despite a correct probe = credit DECLINED (e.g. unconfirmed chain). The integrity signal.';
comment on column diagnostic_estimates.evidence_kind is 'Mirrors lib/diagnostic-engine: directly-probed | inferred-from-descendant | descended-past | untouched.';
comment on column diagnostic_estimates.confidence is 'Mirrors lib/diagnostic-engine ConfidenceLevel: high | medium | low | unknown.';
comment on table summative_results is 'APPEND-ONLY summative evidence (STUBBED, Phase 7D deferred). A re-sit appends a new row; source fixed ''summative''; graph_version + engine_version pinned (G2).';
comment on table grade_artifacts is 'IMMUTABLE + VERSIONED credential (STUBBED). A regrade APPENDS a new version; the issued one is preserved. composition jsonb FROZEN at issuance.';
comment on column grade_artifacts.composition is 'FROZEN structured methodology. Required keys: credited_skill_count, total_skill_count, summative_contribution, practice_contribution, weighting, graph_version — so the credential renders honest credited-vs-practiced (trust-layer integrity), not prose.';
comment on column grade_artifacts.version is 'Monotonic per (student_id, course_id); a regrade appends version+1, never mutates.';
comment on column grade_artifacts.issued_to is 'FERPA disclosure trail: who the credential was issued/disclosed to.';
comment on column sessions.proctor_id is 'Proctor stub (S3): deferred-FK (a proctors table arrives with the assessment build). Only summative sessions populate. Bare uuid until then.';
comment on table video_assets is 'METADATA ONLY. Files on Cloudflare Stream; NO raw playable URL here — playback URL is signed/server-minted (Workstream D). READ SCOPE (Workstream B): any authenticated student (curriculum metadata, not PII); staff write.';
comment on table tutor_exchanges is 'APPEND-ONLY shape ONLY — Phase 10C not built. Forward-compat audit shape; append-only posture matches the other logs.';

commit;


-- =============================================================================
-- TEARDOWN (reversibility) — DESTRUCTIVE. Run as 0003_down.sql / separate
-- checkpoint. Drops in reverse dependency order. NOTE: curriculum_graphs is
-- immutable in normal operation (revoke + trigger) — this teardown drops the
-- table outright, which is the sanctioned destructive rollback path, distinct
-- from any per-row mutation (which remains forbidden). NOT part of the apply.
-- =============================================================================
-- begin;
--   -- triggers drop with their tables; drop the new tables (children first).
--   drop table if exists tutor_exchanges;
--   drop table if exists video_assets;
--   drop table if exists grade_artifacts;
--   drop table if exists summative_results;
--   drop table if exists diagnostic_estimates;
--   drop table if exists curriculum_graph_activations;
--   drop table if exists curriculum_graphs;
--
--   -- sessions proctor stub columns.
--   alter table sessions drop column proctor_attestation;
--   alter table sessions drop column proctor_location;
--   alter table sessions drop column proctor_id;
-- commit;
-- =============================================================================
