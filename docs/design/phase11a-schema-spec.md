# Phase 11 — Workstream A — Schema & Migrations — Design Spec

Status: DRAFT for gate review (mr-gates DB/RLS/architecture, mr-kahn evidence-trail +
curriculum + compliance integrity, pee-wee scoped to parent/consent/staff surface
implications). Per the Phase 11 workflow we do NOT stop for Matt after this gate — gate →
implement SQL → mr-gates diff review → commit → hand SQL to Matt to RUN (the one human
gate). Migrations execute NOTHING on their own.

Target: the fresh dedicated education Supabase project
(`ewnvknibkzloujxbanzm`). The validated graph (data/algebra1-graph.json, 74 nodes /
4,588 problems) stays the source of truth — NOT duplicated into Postgres.

Grounded in the existing `supabase/migrations/0001_compliance_spine.sql` (gated Phase 5,
NEVER executed). 0001 already provides: student_profiles, sessions, student_skill_state,
student_attempts (source ∈ practice|diagnostic|retention), mastery_updates,
course_enrollments, message_threads, messages, consent_events, record_access_log; RLS
helpers `app.current_student_id/current_campus_id/is_staff_for_campus` (JWT role='staff');
append-only via revoke + trigger; transcript view.

---

## DECISIONS (gates: confirm or correct each)

### D1 — Migration layering: ADDITIVE (recommended) vs revise-0001-in-place
0001 has never run, so either is technically safe. **Recommend ADDITIVE**: leave 0001
intact (it's already gated and sound) and add discrete, reviewable migrations:
- `0002_identity_and_roles.sql` — parent_profiles, parent_student_links, staff_profiles
  + the role model; **evolves the RLS helpers** (adds `is_staff`, `can_access_campus`,
  `is_parent_of`, `current_actor_id`) via `create or replace`, and replaces the
  JWT-'staff' staff policies from 0001 with staff_profiles-backed ones.
- `0003_curriculum_and_assessment.sql` — curriculum_graphs, diagnostic provenance,
  summative_results, grade_artifacts, video_assets, tutor_exchanges (stub).
- `0004_rls_phase11.sql` — RLS enable + default-deny policies for every NEW table
  (Workstream B owns the policy bodies; A creates tables with RLS enabled + a deny-all
  baseline so no table is ever left open between migrations).

Rationale for additive: each migration is independently reviewable; 0001's gated review
is preserved; the helper-evolution in 0002 is explicit and auditable rather than a silent
in-place rewrite. **mr-gates: rule. If you prefer revise-0001 (fresh project, never ran),
say so and I'll consolidate.**

> Open sub-question: 0001's staff policies read JWT `role='staff'`. The Phase 11 role
> model is staff_profiles-backed (super_admin|campus_admin|coach). 0002 must `drop
> policy ... ; create policy ...` for the staff SELECT policies on the 0001 tables to
> route them through the new `can_access_campus`/`is_staff` helpers. mr-gates confirm this
> is the right reconciliation (vs. revising 0001).

### D2 — Identity & role model
- `parent_profiles` (id uuid pk, display_name, email citext?, created_at). COPPA: the
  legal account holder for under-13.
- `parent_student_links` (parent_id, student_id, relationship, consent gating; pk
  (parent_id, student_id)). A parent sees a student ONLY via an active link.
- `staff_profiles` (id uuid pk, display_name, role check in
  ('super_admin','campus_admin','coach'), campus_id uuid null, created_at).
- **RLS helpers (0002, SECURITY DEFINER, pinned search_path):**
  - `current_actor_id()` — the authenticated principal's id (JWT `sub` or an `actor_id`
    claim) for audit stamping.
  - `is_staff()` — true if a staff_profiles row exists for the caller (any staff role).
  - `can_access_campus(p_campus uuid)` — super_admin → any; campus_admin/coach → only
    their own `staff_profiles.campus_id`. Replaces the JWT-'staff' check.
  - `is_parent_of(p_student uuid)` — true if an active parent_student_link exists for the
    caller's parent id (with consent granted).
- **JWT claims:** `role` ∈ {student, parent, super_admin, campus_admin, coach};
  `student_id` (when role=student); `campus_id`; principal id via `sub`.
  Workstream C wires these; A only defines the helpers that read them.

> mr-gates: helpers must NOT inline subqueries against RLS-protected tables in a way that
> recurses. `is_parent_of`/`is_staff` read their OWN identity tables — must those identity
> tables be readable by the SECURITY DEFINER function without triggering their own RLS?
> (SECURITY DEFINER runs as owner → bypasses RLS, which is the intended pattern, but
> confirm the helper reads are safe + non-recursive.)

### D3 — Curriculum storage (graph stays JSON source of truth)
Do NOT duplicate 4,588 problems as rows. **Recommend:** a `curriculum_graphs` table —
`graph_version text primary key, schema_version text not null, graph jsonb not null,
published_at timestamptz not null default now(), is_active boolean not null default false`
— holding the validated graph as ONE jsonb row per version (a durable, auditable snapshot
of exactly what a cohort was assessed against). Plus a **provenance column `graph_version`
on the evidence rows** (student_attempts, mastery_updates) so every evidence row pins the
graph it was produced under (accreditation: reconstruct the exact curriculum at audit
time). The app continues to LOAD the graph from the bundled JSON at runtime; the DB copy
is the versioned audit snapshot + the FK-less referent for skill_ids.

> mr-kahn: is the full-graph-jsonb snapshot worth storing (audit value) vs. only a
> `graph_version` marker + the file in git? Recommend storing it (the git repo is not the
> compliance record; the DB is). Confirm. mr-gates: jsonb single-row (~MB) vs Supabase
> Storage object — rule on placement.

### D4 — Diagnostic provenance (avoid duplicating the evidence truth)
The mastery_updates log (trigger ∈ diagnostic|credit-propagation) IS the credit record;
sessions(kind='diagnostic') already models the session. **Recommend:** model
`diagnostic_sessions` as sessions with `kind='diagnostic'` (no new table) and add
`diagnostic_credits` ONLY if it carries non-redundant data (the per-node estimate/
confidence from the diagnostic engine that mastery_updates doesn't capture). If it would
merely restate mastery_updates, OMIT it (one source of truth — the F11 lesson).

> mr-kahn: rule. Either (a) diagnostic_credits as a thin provenance table capturing the
> diagnostic engine's confidence/estimate per node (non-redundant), or (b) omit and rely
> on mastery_updates. I lean (a) ONLY if it adds the confidence signal; else (b).

### D5 — Retention probes provenance
Phase 7C derives the schedule from logs and marks probes `source='retention'` on
student_attempts. **No new table needed** — the provenance already exists. Recommend
confirming: retention provenance = the existing source marker; the schedule stays derived,
never stored (consistent with the gated 7C design). mr-kahn/mr-gates confirm.

### D6 — Assessment & grading (Phase 7D posture, STUBBED — D is deferred)
Create table SHAPES now (so the schema is coherent and RLS covers them), unwired:
- extend `sessions` with proctor stub fields (`proctor_id uuid, proctor_location text,
  proctor_attestation text`) — nullable; only summative sessions populate them.
- `summative_results` — APPEND-ONLY (revoke update/delete + trigger), per student×course×
  form, seeded-form id, score, per-standard breakdown jsonb, `source` fixed 'summative',
  graph_version, created_at.
- `grade_artifacts` — per student×course: letter, percent, composition jsonb
  (methodology self-statement), generated_at. Mutable (regenerated) OR append-only
  versioned — mr-kahn rule (a grade artifact handed to a registrar should arguably be
  immutable+versioned).

> mr-kahn gates assessment integrity even stubbed: confirm summative is append-only
> evidence and grade_artifacts' mutability posture.

### D7 — Video
`video_assets` — `id uuid pk, skill_id text not null (opaque graph id, not FK), provider
text not null default 'cloudflare-stream', playback_id text not null, kind text
(e.g. lesson|worked-example|explain), duration_seconds int, captions_url text, created_at`.
Metadata ONLY — files live on Cloudflare Stream. Publicly readable? NO — playback uses a
signed server-minted URL (Workstream D); video_assets rows are staff-writable,
student-readable (read the metadata to request a signed URL server-side). mr-gates rule on
read policy.

### D8 — tutor_exchanges (Phase 10C NOT built)
Create the APPEND-ONLY table shape for forward-compat (append-only posture matches the
other logs), unwired, commented "Phase 10C not built — shape only." Low cost, keeps the
schema complete. mr-gates: include the stub or omit until 10C? Recommend include (shape
only, RLS default-deny + student-own-read).

---

## Cross-cutting invariants (carry from 0001 — non-negotiable)
- uuid PKs default gen_random_uuid(); timestamptz everywhere; NO bigint identity.
- skill_id/problem_id are opaque text, NOT FKs (graph is JSON).
- APPEND-ONLY tables guarded by BOTH revoke (app paths) AND a BEFORE UPDATE/DELETE
  trigger (privileged roles) — every new evidence table (summative_results,
  tutor_exchanges) gets both.
- RLS helpers: STABLE SECURITY DEFINER, pinned `search_path = pg_catalog, app`.
- Every migration: wrapped begin/commit, reversible (teardown block / paired down file),
  executes nothing on its own, header states "NOT EXECUTED — Matt checkpoint."
- Every NEW table ships with RLS ENABLED + a deny-all baseline in the SAME migration, so
  no window exists where a table is readable without a policy (Workstream B fills the
  real policies). Default deny.

## Gates requested
- **mr-gates**: D1 (layering), D2 (role model + helper recursion safety), D3 (jsonb vs
  storage), D6/D7/D8 (table shapes, append-only, read policies), and the cross-cutting
  invariants. The heart: nothing here weakens the evidence trail or RLS posture.
- **mr-kahn**: D3 (graph snapshot audit value), D4 (diagnostic provenance — no truth
  duplication), D5 (retention provenance), D6 (assessment/grade integrity), and that the
  evidence trail remains the immutable accreditation record under the new tables.
- **pee-wee**: scoped — the parent/consent/staff IDENTITY model's downstream UX
  implications (parent-held account for under-13, the consent relationship surface, staff
  role tiers). Not a schema veto; flag anything that would make the eventual
  parent/staff/consent screens dishonest or confusing.

Verdict format: APPROVE | APPROVE WITH CHANGES (list) | REJECT (reason).

---

## GATE RESOLUTIONS — BINDING (supersedes conflicting text above)

mr-gates APPROVE WITH CHANGES (4 blocker + 3 should + 2 nit) · mr-kahn APPROVE WITH
CHANGES (6) · pee-wee APPROVE WITH NOTES (6). No rejections. This is the law the SQL
is authored to. Workstream A authors migrations **0002 (identity/roles/helpers + 0001
reconciliation) and 0003 (curriculum/diagnostic/assessment/video, tables only with RLS
ENABLED = deny-all baseline + append-only guards)**. The NEW tables' POLICY BODIES + the
SQL deny-case test suite are **Workstream B (0004)**.

### Layering & 0001 reconciliation (mr-gates A1/A3/A9)
L1. **ADDITIVE confirmed.** Leave 0001 intact except via new migrations.
L2. Keep `is_staff_for_campus(uuid)` as a **thin shim delegating to
    `can_access_campus(uuid)`** (smaller diff, name survives). State this in the 0002 header.
L3. 0002 must `drop policy; create policy` for ALL NINE 0001 staff policies so they route
    through the new helpers: student_profiles / student_attempts / mastery_updates /
    course_enrollments / message_threads / messages / consent_events / record_access_log
    `_select_staff`, and fix `sessions_select_staff` (the `where false` placeholder — wire
    it via the campus path now, or leave explicitly denying WITH a comment).
L4. **Fix the inherited recursion hazard (A3):** add `app.student_campus(p_student uuid)`
    STABLE SECURITY DEFINER helper (reads student_profiles, RLS-bypassed). Replace every
    inline `(select campus_id from student_profiles ...)` scalar subquery in the staff
    policies with `app.can_access_campus(app.student_campus(student_id))` — subquery-free,
    non-recursive. This makes the new policies MORE faithful to 0001's stated invariant.
L5. 0002 down-block must RESTORE 0001's original staff policies (not just drop the new),
    so a rollback doesn't strand 0001 tables policy-less.

### Helper pattern (mr-gates A2) — exact, non-negotiable
H1. Every helper: `STABLE SECURITY DEFINER`, `SET search_path = pg_catalog, app`, owned by
    the table owner (so DEFINER legitimately bypasses RLS on identity tables). Reads JWT
    via the 0001 `current_setting('request.jwt.claims', true)::jsonb` idiom verbatim.
H2. New helpers: `current_actor_id()`, `is_staff()`, `can_access_campus(uuid)`,
    `is_parent_of(uuid)`, `student_campus(uuid)`. Identity-table reads happen INSIDE the
    DEFINER helpers; **no policy inlines a subquery against an RLS-protected table.**
H3. `is_parent_of(p_student)` returns false unless an active `parent_student_link` exists
    AND consent is currently granted; revoked/ pending consent → false (A4). Revocation
    immediately revokes read access (FERPA/COPPA).

### Identity & consent model (pee-wee N1–N4)
I1. **One consent truth:** `consent_events` (append-only) is the source of truth;
    `parent_student_links` holds a DERIVED `current_consent_event_id` pointer (+ a
    lifecycle the helper can read), NOT an independent status enum. `is_parent_of` reads
    the current consent event's status.
I2. Consent must record WHAT was consented to: add `consent_policy_version text` and
    `consent_scope jsonb` to `consent_events` (so the consent screen can honestly show
    "on [date] you consented to [disclosure vX]"). A later policy-wording change must not
    silently rewrite prior consents.
I3. `parent_student_links` carries an explicit lifecycle (`status` /`revoked_at`, or the
    derived pointer in I1) so the relationship renders honestly active vs revoked.
I4. `staff_profiles` CHECK: `(role='super_admin' AND campus_id IS NULL) OR
    (role IN ('campus_admin','coach') AND campus_id IS NOT NULL)` — no "coach of nowhere"
    limbo state. (Coach-vs-campus_admin permission scope is a Workstream B/UI concern.)

### Curriculum snapshot (mr-kahn 1/2 + mr-gates A5) — graph_version is non-negotiable
G1. `curriculum_graphs` is IMMUTABLE per version: `graph`, `graph_version`,
    `schema_version`, `published_at` guarded by revoke + `app.forbid_mutation`. Model the
    active version as a SEPARATE append-only `curriculum_graph_activations` log (active
    version is DERIVED, not a mutable bit) — preferred over a mutable `is_active` flag.
G2. **`graph_version text NOT NULL` on EVERY evidence row** — student_attempts,
    mastery_updates, summative_results, diagnostic_estimates — stamped at WRITE time from
    the graph the engine actually loaded, never back-filled from "whatever is active now."
    Add via `ALTER TABLE ... ADD COLUMN` in 0002 (tables empty — safe). This is the one
    item mr-kahn flips to REJECT without. Capture BOTH axes: content `graph_version` AND
    `schema_version` (they answer different audit questions). engine_version already on
    mastery_updates; add to the other evidence tables.

### Diagnostic provenance (mr-kahn 3/4) — explanation, never authority
DX1. Add `diagnostic_estimates` (renamed from diagnostic_credits), APPEND-ONLY
    (revoke+trigger), ONLY these non-redundant fields: `session_id` (FK sessions),
    `skill_id` (opaque text), `estimate_status`, `confidence`
    (high|medium|low|unknown), `evidence_kind`
    (directly-probed|inferred-from-descendant|descended-past|untouched),
    `evidence_attempt_ids uuid[]`, `credited boolean` (the audit-critical "declined despite
    correct" flag), `graph_version`, `engine_version`, `created_at`. Comment asserts: this
    table EXPLAINS estimates and records declined-credit; committed credit derives SOLELY
    from mastery_updates. NO prev/new_mastery columns (that would be the fork).
DX2. `diagnostic_sessions` = sessions with `kind='diagnostic'` (no separate table).

### Retention (mr-kahn 5) — confirmed, no table
R1. No retention table. Provenance = `source='retention'` on student_attempts; schedule
    stays derived (Phase 7C). Retention attempt rows also get graph_version/engine_version
    pinned (G2).

### Assessment & grading (mr-kahn 5/6 + mr-gates A6 + pee-wee N5/N6) — STUBBED, D deferred
S1. `summative_results` APPEND-ONLY (revoke + trigger, in 0003 WITH the table — A6),
    `source` fixed 'summative', graph_version + engine_version pinned, per-standard
    breakdown jsonb, seeded form id. A re-sit appends a new row.
S2. `grade_artifacts` IMMUTABLE + VERSIONED (append-only, revoke+trigger): monotonic
    `version` per (student_id, course_id), graph_version + engine_version pinned,
    `composition jsonb` FROZEN at issuance. Mutable/regenerated REJECTED — a regrade
    appends a new version, the issued one is preserved. Add `issued_to`/`purpose` (FERPA
    disclosure trail). composition jsonb must carry STRUCTURED renderable keys
    (credited_skill_count vs total, summative-vs-practice contribution, weighting,
    graph_version) — not just prose — so the credential renders honest credited-vs-practiced
    (carry [[trust-layer-integrity-principles]]).
S3. `sessions` proctor stub: nullable `proctor_id uuid` (FK-less, deferred-FK comment),
    `proctor_location text`, `proctor_attestation text`. Only summative sessions populate.

### Video (mr-gates A7) & tutor stub (D8)
V1. `video_assets`: metadata only (skill_id opaque text no FK, provider default
    'cloudflare-stream', playback_id, kind, duration_seconds, captions_url, created_at).
    Read = any authenticated student (curriculum metadata, not PII) + staff write; NO raw
    playable URL in the row (signed URL minted server-side in Workstream D). State the
    open-to-authenticated read scope in a comment.
V2. `tutor_exchanges`: APPEND-ONLY shape only (revoke+trigger, RLS enabled), commented
    "Phase 10C not built — shape only."

### Cross-cutting (mr-gates A8) — deny-all baseline
C1. **Every NEW table ships `alter table ... enable row level security` in its CREATING
    migration (0003)** = the deny-all baseline (RLS on + no policy = denied). Policy
    bodies for new tables come in Workstream B (0004). Append-only guards (revoke+trigger)
    also ship WITH the table, never deferred.
C2. Carry all 0001 invariants: uuid PK gen_random_uuid(), timestamptz, opaque-text skill
    ids (no FK), reversible begin/commit, "NOT EXECUTED — Matt checkpoint" header.

### The one human gate
After mr-gates diff review, the migration files are COMMITTED but **handed to Matt to RUN**
— no agent executes SQL against the children's-records store.
