# LB2 — FERPA read-audit wiring — Design Spec

Status: DRAFT for gate review (mr-gates — read-model/audit-insert boundary, RLS, /types;
mr-kahn — evidence/audit-trail integrity + what counts as a "record access" + fail-mode.
No UI change → no pee-wee). Production launch blocker: a staff/parent READ of a student's
education record must write an immutable `record_access_log` row. Implement after gates
(standing autonomy — no further Matt stop).

## Background
`record_access_log` (migration 0001): `id, actor_id, actor_role, student_id, record_type,
accessed_at`. APPEND-ONLY (forbid_mutation trigger + revoke). 0004 policy:
`record_access_log_insert WITH CHECK (actor_id = app.current_actor_id())` (actor-bound,
tightened from the 0001 `with check(true)` stub); staff SELECT by campus; **no parent
SELECT** (it's a staff/audit surface). So inserts must run under the reader's own session
(userClient) with `actor_id` = their auth uid.

Today NOTHING writes it → "show who *could* read (policies) but not who *did* read." That
gap is the launch blocker.

## What reads a student's record today
- **Admin per-student insight** `/admin/students/[studentId]` — staff reads the full record
  (profile, attempts, mastery_updates, timeline, flags). THE primary record access. The page
  already resolves `staff` (actorId, role, campusId) + `studentId` before reading
  (page.tsx:53–60). ← instrument here.
- **Admin roster** `/admin/students` — staff reads a list (current focus/status/last-active
  per student). Coarser; list metadata, not a full record open.
- **Parent**: no per-child record-read surface exists yet (the parent sees the `/parent`
  roster = link/consent metadata; "launching" a child becomes that child). The Phase 7B
  digest/transcript is student-self-scoped. So there is no parent *record read* to audit
  today — wire the helper so it's ready, but there's no parent call site yet.

## Design
1. **`appendAccessLog(entry)` on `A3Repository`** (types/ change — mr-gates):
   `appendAccessLog(entry: { actorId: string; actorRole: string; studentId: string;
   recordType: string }): Promise<void>`.
   - InMemory: no-op (memory mode has no audit table / no FERPA surface) — keeps 662 tests
     green, dev/CI unaffected.
   - Supabase: INSERT into `record_access_log` via the **userClient** (RLS with-check
     `actor_id = current_actor_id()` authorizes the reader's own audit row; NOT service-role
     — least privilege, and the actor is provably the session principal). Append-only;
     never update/delete.
2. **Call site — admin per-student page** (`/admin/students/[studentId]/page.tsx`): after
   the campus-scope check (line 60), before returning the record to render:
   `await repo.appendAccessLog({ actorId: staff.actorId ?? "", actorRole: staff.role,
   studentId, recordType: "student_insight" });`
   (`staff.actorId`/`role` come from the wired `requireStaff()`.)
3. **record_type vocabulary** (small, typed): start with `"student_insight"` (the admin
   decision-log view). Add `"roster"` / `"transcript"` later as those surfaces audit.
   mr-kahn: confirm the value(s) + whether the roster view should also log (one coarse
   "roster" row per load) or stay un-logged as list-metadata.

## Open rulings
- **Fail-mode (mr-kahn + mr-gates):** if the audit insert fails, do we (a) BLOCK the read
  (no access without a logged audit row — strict FERPA), or (b) best-effort: log the failure
  server-side and still render? Recommendation: **(a) hard-gate in supabase mode** — a
  staff record view must not render if its audit row didn't persist (await the insert; on
  throw, surface a calm error, do NOT show records). This is the honest "auditable" posture
  the whole spine is built for. Memory mode no-ops (no audit surface), so dev/tests are
  unaffected. mr-kahn rules; (b) is the fallback if hard-gating risks locking staff out on
  transient errors.
- **Roster logging (mr-kahn):** log the per-student detailed view only (recommended), or
  also the roster list? FERPA audit is per-record; the roster is limited metadata.
- **actorId nullability:** `requireStaff()` returns `actorId: string | null` (null only in
  the memory stub, where appendAccessLog no-ops anyway). In supabase mode actorId is the
  verified `sub` (non-null). Confirm the supabase path never logs a null actor (the RLS
  with-check would reject `actor_id = null` vs `current_actor_id()` anyway → fail-closed).

## Tests
- InMemory `appendAccessLog` is a no-op (no throw); contract present.
- (supabase path is live-only, like the rest of SupabaseRepository — verified in a Matt-run
  integration check; the admin page calling it is covered by reading.)
- All 662 tests stay green.

## Invariants
- Engine/mastery/router/checkAnswer UNCHANGED. This is an audit-insert on a read path only.
- record_access_log stays append-only (insert via userClient; the trigger + revoke stand).
- No new dependency, no SQL/migration (the table + policy already exist in 0001/0004).

## Gates
- **mr-gates**: the `appendAccessLog` contract + /types change, userClient (not service)
  insert under the actor-bound RLS, the call-site placement, fail-mode mechanism, memory
  no-op parity.
- **mr-kahn**: fail-mode ruling (hard-gate vs best-effort), record_type vocabulary, roster-
  vs-per-student granularity, and that this completes the FERPA "who-did-read" evidence
  alongside the existing who-could-read (policies) — closing the launch blocker.

Verdict: APPROVE | APPROVE WITH CHANGES | REJECT.

---

## GATE RESOLUTIONS — BINDING (supersedes conflicting text above)
mr-gates APPROVE WITH CHANGES (1 blocker + 2 nit) · mr-kahn APPROVE WITH CHANGES (5),
fully aligned. Implement to this section. Engine/evidence-trail UNTOUCHED.

L1. **Contract + typed union** (types/repository.ts): add
    `export type RecordAccessType = "student_insight" | "transcript" | "parent_child_record";`
    (NO "roster" member). Add to A3Repository:
    `appendAccessLog(entry: { actorId: string; actorRole: StaffRole; studentId: string;
    recordType: RecordAccessType }): Promise<void>` with a doc comment: **logs HUMAN
    inspection of a student's education record; engine/service-role/system reads are
    deliberately NOT audited here (this is not a query log).** Only `"student_insight"` is
    wired now. (`StaffRole` already exported from types/student.ts.)
L2. **InMemory**: no-op (memory has no FERPA surface; keeps 662 green).
L3. **Supabase**: INSERT (never upsert) into `record_access_log` via the **userClient**
    (RLS with-check `actor_id = current_actor_id()` — forced; service-role carries no actor
    sub and would fail-closed/unattributable). Columns: actor_id, actor_role, student_id,
    record_type. **Throw a legible error if `entry.actorId` is empty/missing** (don't send
    "" to PostgREST and get an opaque RLS rejection).
L4. **Call site + HARD-GATE + ORDERING (mr-kahn #1, the critical one):** in
    app/admin/students/[studentId]/page.tsx, place the audit AFTER the campus-scope
    `notFound()` (line 60) and **BEFORE the `Promise.all` record reads (lines 62-67)** — the
    profile fetch at line 57 is access-control (OK pre-audit), but the substantive record
    (attempts/mastery/timeline/flags) must NOT be read unless the audit row persisted:
    ```ts
    try {
      await repo.appendAccessLog({
        actorId: staff.actorId ?? "",
        actorRole: staff.role,
        studentId,
        recordType: "student_insight",
      });
    } catch {
      notFound(); // no record disclosure without a persisted audit row (FERPA)
    }
    ```
    Do NOT `.catch(()=>{})` (that silently reopens the blocker); do NOT let it bubble as a
    raw 500. In memory mode appendAccessLog no-ops so dev/tests render normally.
L5. **Granularity (mr-kahn #2):** log the per-student detailed view ONLY. The admin roster
    (/admin/students — list metadata) is NOT logged (directory-level triage, not record
    inspection). If the roster ever renders inline substantive record content, it must then
    log.
L6. **Residuals documented (mr-kahn #4) — why the blocker is closed despite unwired
    surfaces:** (a) roster un-logged unless it later shows inline record content; (b) parent
    record-read logging deferred — no parent per-child record view exists yet (the /parent
    roster is link/consent metadata; the digest is student-self-scoped); when a parent
    record view is built it MUST log `"parent_child_record"` before shipping (record_access_
    log has no parent SELECT — parents generate audit rows, don't read them); (c) the
    transcript surface logs `"transcript"` when staff/parent-facing; (d) engine/service-role
    reads are EXCLUDED by design (machine processing, not human disclosure).
L7. **Tests:** InMemory appendAccessLog no-op (no throw). 662 stay green. (Supabase path is
    live-only, verified in a Matt-run integration check, like the rest of SupabaseRepository.)
