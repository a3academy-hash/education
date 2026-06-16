# Phase 1 — THE SPINE — Plan (code-level)

**Plan against:** SECURITY §2-3/§6/§8/§16, DIAGNOSTIC §2/§14, AI_ADAPTIVE §5/§9, CLAUDE §17.
**Closes AUDIT:** D7.1–D7.5 (BLOCKERs), D2.1 (optimistic skeleton), D5 schema substrate, D10 telemetry.
**Gate (PLAN.md):** migrations clean; RLS tests pass; trivial interaction round-trips <800ms (skeleton).
**Governance:** ADR-0001 rules are binding (RPC boundary; framework-neutral lib/; latency budget).

## Build order (SECURITY §2 — compliance build-order IS a control)
1. **Data classes + retention policy FIRST** (gates the schema).
2. Identity/guardian model + family tenancy.
3. RLS + threat-model patterns + the `assert_can_access_student` RPC boundary.
4. Telemetry/calibration substrate + per-node p_known/retention state columns (engine substrate).
5. Fast-interaction skeleton (optimistic UI + async update + <800ms + non-LLM fallback).
6. Knowledge graph as data (nodes + prereq edges + CCSS + 5-10 clusters) — the spine others attach to.

## A. Migration `supabase/migrations/0006_overhaul_spine.sql` (generated, NOT executed — human runs SQL)
**A1. Data-class/retention (SECURITY §3):**
- `data_classes(id, name, description, is_child_pii bool, deletable bool, anonymizable bool)` seeded
  with the §3 classes (operational_child_pii, academic_record, fl_portfolio, consent_audit,
  anonymized_analytics).
- `retention_policies(data_class_id, retention_window, deletion_method, legal_basis)` seeded with the
  §3 timers (30-day operational, 7-yr elected academic, 2-yr FL, indefinite-anon). Marked
  `ATTORNEY-PENDING` in comments.
- **Reconcile immutability vs 30-day deletion (AUDIT D7.5):** evidence tables get a per-row
  `data_class_id`; the append-only `forbid_mutation` trigger is amended to allow a *class-aware*
  `SECURITY DEFINER` deletion/anonymize RPC (`erase_student_operational_data(student_id, reason)`)
  that the trigger whitelists — so COPPA deletion is possible without opening general mutation.

**A2. Family/guardian identity (SECURITY §6/§16):**
- `families(id, created_at)`.
- `guardians(id, family_id, auth_uid, role guardian_role enum[education_admin|billing_parent|
  view_only_guardian|restricted_guardian], court_order_flag bool, dual_consent_required bool)`.
- Extend `students`/`student_profiles` with `family_id`, `dob date`, `age_band`, `compliance_path`
  (coppa_child|teen_minor|adult_learner) — drives the COPPA-vs-teen branch + age-up.
- `consents` already strong (consent_events) — add `notice_version` alias view; keep immutable.

**A3. Family tenancy + RLS (SECURITY §8):**
- Add `family_id` to every learning/evidence table (student_attempts, mastery_updates, sessions,
  student_skill_state, tutor_exchanges, ...). RLS scopes rows to the caller's family via a
  `current_family_id()` JWT helper (pinned search_path).
- **`assert_can_access_student(actor_uid uuid, student_id uuid)`** SECURITY DEFINER: pinned
  search_path, re-checks family membership + guardian role from JWT, RAISES on mismatch, no dynamic
  SQL. Every privileged RPC calls it FIRST.

**A4. Server-side grading RPCs (SECURITY §9, ADR-0001 rule 1):**
- `submit_attempt(student_id, item_id, item_version, params_hash, attempt_nonce, hmac, response)`
  SECURITY DEFINER: assert_can_access_student → verify HMAC over (session_id,item_id,item_version,
  params_hash,attempt_nonce) → verify item_version served this session → grade server-side → insert
  append-only attempt with `graded_server_side=true`. Issue nonces via `issue_attempt_nonce(...)`
  (short TTL). (Grading logic lives in a Postgres function or a server-only edge fn calling lib/
  graders — the authoritative grade is server-side; client never gets the solution object.)
- `audit_log` gains IP/device hash columns; the read-audit insert is wired (closes the LB).

**A5. Telemetry/calibration substrate (AUDIT D10):**
- `item_versions`, `calibration_runs`, `item_exposure`; thresholds table for A/B-testable params.

**A6. Engine substrate (AUDIT D5 — Phase 3 writes here):**
- `node_mastery` gains `p_known numeric`, `p_known_var numeric` (BKT), `stability numeric`,
  `halflife numeric`, `last_retrieval_at`, `next_review_at`, per-dimension transfer status jsonb,
  `locked bool`, `provisional bool` (CLAUDE §3 / AI_ADAPTIVE §5/§6).

## B. RLS test harness `supabase/tests/rls_overhaul_deny.sql` (pgTAP-style or plain assert)
Deny-cases (SECURITY §8/§19.6): cross-family read/insert; guardian-role over-reach (view_only writes);
coach reading raw submissions/transcripts (must be denied — closes AUDIT D7.8); super_admin unlogged
read (must require reason code); HMAC-missing submit (denied); item_version mismatch (denied);
n>=5 aggregate suppression on any roster view. Gate: "ALL DENY CASES PASSED".

## C. Fast-interaction skeleton (AI_ADAPTIVE §9, AUDIT D2.1) — framework-neutral lib + thin action
- `lib/engine-loop/` (pure): `gradeAttempt(item, response)` (authoritative, sync, <5ms) split from
  `applyModelUpdate(state, attempt)` (async). Server action returns the grade immediately; fires the
  model update without blocking; client renders optimistically.
- Prove a trivial interaction round-trips <800ms with optimistic paint (in-memory now; Supabase RTT
  measured Phase 4 per the budget).

## D. Knowledge graph as data (CLAUDE §6, DIAGNOSTIC §2)
- Define the v0.2 node/edge schema (id, concept, prereq_edges, confusable_cluster_id, standard_codes,
  high_impact). Reconcile the existing 74-node graph to the DIAGNOSTIC §2 readiness set (expanded:
  decimals, abs value, equivalent expressions, function/bridge cluster). This is the spine Phase 2
  (items) / Phase 3 (engine) / Phase 6 (diagnostic) attach to. (Full reconciliation may span into
  Phase 2; Phase 1 lands the schema + cluster tags + CCSS codes.)

## Tests / acceptance (mapped to GOAL checkboxes)
- Migration applies clean on a scratch DB (syntactic validate; exec is the human SQL gate).
- RLS deny-suite passes (or is runnable + documented for the human-run gate).
- `assert_can_access_student` + `submit_attempt` RPC contract unit-tested (lib graders) + the deny
  cases cover the boundary.
- Optimistic-skeleton: a trivial interaction shows feedback without awaiting the model update.
- `npm run build` + existing tests stay green (no regression to the running v0.1 surfaces).

## Deferred (logged, not built in Phase 1)
- Full HMAC wiring end-to-end in the UI (skeleton + RPC contract in Ph1; full client integration Ph4).
- VPC flow UI (SECURITY §5) — schema + ordering rule in Ph1; the consent UI lands in Phase 7.
- The full engine math (BKT/FSRS) — Phase 3; Phase 1 only lays the columns.

## REVISION v2 (codexreview informed+security — BINDING; supersedes conflicting text above)
All 8 concerns adopted. Implementation builds to THIS section.

- **R1 — Policy replacement, not overlay (blocking):** RLS policies OR-combine, so 0006 must
  INVENTORY then DROP/REWRITE every legacy campus/staff/parent SELECT policy on evidence/identity/
  view tables, recreating ONLY family/guardian/RPC policies. Coach scope = severity-bands view ONLY
  (no raw submissions/tutor transcripts/DOB) — separate from campus_admin/super_admin. The existing
  `supabase/tests/rls_deny_cases.sql` cases that currently EXPECT coach raw access (e.g. :409) are
  flipped to DENY.
- **R2 — Erase path, not trigger whitelist (blocking):** keep the shared `app.forbid_mutation`
  trigger strict; the erase RPC sets a txn-local GUC `app.erase_in_progress`; a REVISED trigger
  allows the op ONLY when that flag is set AND `data_class_id` = operational_child_pii. Flag settable
  only inside the SECURITY DEFINER `erase_student_operational_data` RPC; EXECUTE granted only to the
  server role. No UPDATE allowance for general callers.
- **R3 — DB-backed authorization (high):** `assert_can_access_student(actor_uid, student_id)` reads
  guardians/family/role/court_order/dual_consent/active-consent FROM TABLES at call time (mirrors the
  existing DB-backed `is_parent_of`). JWT supplies only `auth.uid()`; it never authorizes a family or
  role by itself.
- **R4 — Anonymize-in-place deletion (high):** operational child PII is irreversibly anonymized in
  place (COPPA-permitted), NOT hard-deleted — avoids the `ON DELETE RESTRICT` FK graph and preserves
  the academic record. A per-class behavior table defines anonymize|tombstone|preserve (consent/audit
  preserved). Scratch-DB test seeds linked rows + proves erase completes without FK violation.
- **R5 — Durable async (high):** grade + append-only attempt insert are synchronous + transactional;
  the mastery/model update is written to a `model_update_outbox` row in the SAME transaction; a
  worker applies it idempotently (replayable from attempts) with retry/dead-letter. Acceptance: a
  simulated async-failure test proves the attempt is never orphaned.
- **R6 — Nonce/session binding (high+med):** add `served_attempt_nonces(session_id,item_id,
  item_version,params_hash,nonce,expires_at,consumed_at)` UNIQUE(nonce). `submit_attempt` derives
  session_id from the nonce row, enforces attempt+session+nonce share student_id+session_id, verifies
  HMAC + item_version + atomic consume. Deny tests: replay/expired/wrong-session/wrong-version/
  tampered-params.
- **R7 — Audited break-glass reads (high):** sensitive staff/admin reads go behind
  `read_student_record(student_id, reason_code)` SECURITY DEFINER RPC that inserts the audit row
  (actor, subject, reason, ip/device hash) in the same txn BEFORE returning; direct super_admin/staff
  SELECT on sensitive tables dropped. (Ph1 lands the RPC contract + break-glass; full read-path
  migration completes with reporting in Ph7.)

## Codex review ask
Attack this spine plan: is the data-class-first ordering correctly honored? Does the
`assert_can_access_student` + RPC pattern actually close the family-isolation threat model, or is
there a bypass? Is amending the `forbid_mutation` trigger to whitelist a deletion RPC safe (does it
reopen general mutation)? Is the optimistic/async split safe for evidence integrity (could an async
model-update failure lose an attempt)? Anything in §8 the deny-suite misses?
