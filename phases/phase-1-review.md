# Phase 1 — Adversarial Review (Codex) of the spine plan

Reviewers: `/codexreview` adversarial_reviewer (informed) + security_reviewer (informed). Raw JSON at
`.codexreview/reviews/2026-06-15-phase1-spine/round-1.{informed,security}.codex.json`; adjudication
at `round-1.claude.json`.

## Concerns (union, all ADOPTED)
1. **rls-policy-overlay** (informed, BLOCKING) + **raw-coach-access-conflict** (security, HIGH) —
   RLS OR-combines; family policies layered over legacy campus/staff policies leave bypass paths
   (coach still reads raw attempts via `student_attempts_select_staff`; existing deny tests *expect*
   it). → R1: drop/rewrite legacy policies; coach severity-only; flip the tests.
2. **trigger-whitelist-mutation** (security, BLOCKING) — a generic whitelist on the shared
   `forbid_mutation` trigger reopens mutation on ALL evidence tables. → R2: txn-local GUC flag,
   data_class-gated, EXECUTE server-role only.
3. **jwt-family-role-trust** (security, HIGH) — JWT is the wrong trust boundary for revocation-
   sensitive guardian perms. → R3: assert_can_access_student reads tables, not JWT claims.
4. **session-binding-gap** (informed, HIGH) — submit_attempt omitted session_id; evidence requires
   it. → R6: bind student+session+item_version+nonce.
5. **async-update-loss/durability** (both, HIGH) — fire-and-forget can lose mastery updates. → R5:
   transactional outbox + idempotent replay + orphan-proof test.
6. **deletion-fk-plan** (informed, HIGH) — ON DELETE RESTRICT graph blocks per-row delete. → R4:
   anonymize-in-place (COPPA-permitted), preserves FK + academic record.
7. **unlogged-admin-read-bypass** (security, HIGH) — direct SELECT bypasses read-audit. → R7:
   read_student_record(reason_code) RPC audits-then-returns.
8. **nonce-replay-substrate-missing** (security, MED) — no served-item/nonce table. → R6:
   served_attempt_nonces + atomic consume + replay deny tests.

## Outcome
All adopted; plan revised to v2 (REVISION R1–R7). The review converted a schema sketch into a
defensible, threat-modeled compliance spine before a line of SQL was written — the intended use of
the loop. Convergence: both reviewers independently flagged the RLS-overlay + async-durability
issues → weighted heavily.
