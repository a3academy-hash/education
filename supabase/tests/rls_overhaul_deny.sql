-- =============================================================================
-- rls_overhaul_deny.sql — A3 v0.2 Overhaul / Phase 1 deny-case suite for 0006
-- Proves the NEW isolation/integrity guarantees added by 0006_overhaul_spine.sql.
-- HUMAN-RUN (the agent does not execute SQL): run as a NON-OWNER role against a
-- scratch DB with 0001->0006 applied + seed data. Each case states EXPECTED.
-- A case "passes" when the stated outcome holds (a raise where a raise is
-- expected; a row count where a count is expected). Mirrors the convention of
-- supabase/tests/rls_deny_cases.sql.
--
-- These supersede the rls_deny_cases.sql expectations that ASSUMED coach raw
-- access (e.g. its "coachX reads A attempts" expected=1) — 0006 R1 makes coach
-- raw reads DENIED, so those legacy cases are FLIPPED here (N1/N2 expect 0).
--
-- SEED (illustrative — adapt ids): family F1{studentA, guardian_admin (education_admin),
-- guardian_view (view_only_guardian)}; family F2{studentB}; campus C1 with
-- coachC1 + adminC1 (campus_admin) + super1 (super_admin). A granted consent event
-- links each guardian; studentA has a session sessA + a served nonce.
-- =============================================================================

-- Helper to set the JWT actor for a case (Supabase sets request.jwt.claims).
-- Example: select set_config('request.jwt.claims', '{"sub":"<uuid>","student_id":"<uuid>"}', true);

-- ── N1 (R1) — COACH may NOT read raw student_attempts (was allowed pre-0006). ──
-- set role authenticated; claims = coachC1.
--   select count(*) from student_attempts where student_id = '<studentA>';
-- EXPECTED: 0  (can_read_raw_evidence excludes coach). Legacy suite expected 1.

-- ── N2 (R1) — COACH may NOT read raw tutor_exchanges. ────────────────────────
-- claims = coachC1.
--   select count(*) from tutor_exchanges where student_id = '<studentA>';
-- EXPECTED: 0.

-- ── N2b — campus_admin / super_admin CAN still read raw (control, not a deny). ─
-- claims = adminC1:   select count(*) from student_attempts where student_id='<studentA>';  -- >=0 allowed
-- claims = super1:    select count(*) from tutor_exchanges  where student_id='<studentA>';  -- >=0 allowed

-- ── N3 (R6) — nonce REPLAY: a consumed nonce cannot be submitted again. ───────
-- As service_role: issue a nonce, submit once (ok), submit the SAME nonce again.
--   select app.submit_attempt('<actorA>','<studentA>','<sessA>','<item>','v1','<phash>','<nonce>','<hmac>', ... );
-- EXPECTED on 2nd call: RAISE 'nonce already consumed (replay)'.

-- ── N4 (R6) — EXPIRED nonce is rejected. ─────────────────────────────────────
-- Issue with p_ttl_seconds = 0 (or wait past expiry), then submit.
-- EXPECTED: RAISE 'nonce expired'.

-- ── N5 (R6) — session/student mismatch: issuing a nonce for studentA against a
-- session owned by studentB is rejected. ─────────────────────────────────────
--   select app.issue_attempt_nonce('<actorA>','<sessB>','<studentA>','<item>','v1','<phash>',300);
-- EXPECTED: RAISE 'session ... does not belong to student ...'.

-- ── N6 (write authz) — a VIEW_ONLY guardian may NOT submit/issue for the student.
-- As service_role vouching p_actor = guardian_view:
--   select app.assert_can_submit_for_student('<guardian_view>','<studentA>');
-- EXPECTED: RAISE 'submit denied' (view_only excluded; only student or education_admin).
-- Control: assert_can_submit_for_student('<studentA>','<studentA>') -> ok (void).
--          assert_can_submit_for_student('<guardian_admin>','<studentA>') -> ok (consent granted).

-- ── N7 (family isolation) — cross-family access is denied. ────────────────────
--   select app.can_access_student('<guardian_admin>','<studentB>');   -- F1 guardian -> F2 student
-- EXPECTED: false.
--   select app.assert_can_access_student('<guardian_admin>','<studentB>');
-- EXPECTED: RAISE 'access denied'.

-- ── N8 (R2/R4) — the erase exception is SCOPED: it cannot mutate a legal/audit
-- table even with the flag set, and cannot do a non-anonymizing UPDATE. ────────
-- As service_role, inside a txn:
--   select set_config('app.erase_in_progress','<studentA>', true);
--   update mastery_updates set reason = 'x' where student_id='<studentA>';
-- EXPECTED: RAISE 'append-only: UPDATE on mastery_updates forbidden' (shared strict trigger).
--   update student_attempts set correct = true where student_id='<studentA>';   -- not response-only
-- EXPECTED: RAISE (jsonb-diff guard: only response->'[erased]' permitted).
--   update student_attempts set response='[erased]' where student_id='<studentA>';   -- the anonymize
-- EXPECTED: SUCCEEDS (and response is actually '[erased]', proving NEW was returned).

-- ── N9 (forge defense) — a browser-authenticated caller cannot call submit_attempt
-- or issue_attempt_nonce at all (service_role-only). ─────────────────────────
-- set role authenticated; claims = studentA:
--   select app.submit_attempt(...);   EXPECTED: permission denied for function submit_attempt.
--   select app.issue_attempt_nonce(...);  EXPECTED: permission denied for function issue_attempt_nonce.
-- (So the client can never supply a secret or forge p_correct — the round-1 forge bug.)

-- ── N10 (consent revocation) — a guardian whose consent is revoked loses access. ─
-- Revoke studentA's guardian_admin consent (append a 'revoked' consent_event +
-- repoint the link / set link status), then:
--   select app.can_access_student('<guardian_admin>','<studentA>');
-- EXPECTED: false (is_parent_of -> false once consent not granted).

-- ── N11 (break-glass) — read_student_record requires a reason + staff role and
-- audits before returning. ───────────────────────────────────────────────────
-- claims = coachC1:   select * from app.read_student_record('<studentA>','review-iep');
-- EXPECTED: RAISE 'break-glass denied' (coach is not campus_admin/super_admin).
-- claims = adminC1:   select * from app.read_student_record('<studentA>', NULL);
-- EXPECTED: RAISE 'a reason_code is required'.
-- claims = adminC1:   select * from app.read_student_record('<studentA>','annual-review');
-- EXPECTED: returns the per-skill projection AND a record_access_log row was inserted
--           (record_type = 'break_glass:annual-review') BEFORE the rows were returned.

-- =============================================================================
-- PASS CRITERION: every EXPECTED above holds. Report "ALL DENY CASES PASSED" or
-- the first failing case id. Cases N1/N2 are the R1 coach-scope fix; N9 is the
-- forge-attempt defense; N3-N6 the §9 integrity layer; N7/N10 family/consent
-- isolation; N8 the scoped erase; N11 the audited break-glass.
-- =============================================================================
