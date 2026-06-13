# Phase 11 — Workstream B — RLS & Security — Design Spec

Status: DRAFT for gate review (mr-gates primary — RLS is its core; mr-kahn — evidence-access
correctness; pee-wee — scoped to persona-access expectations). Keep-moving workflow: gate →
implement (0004 + SQL test suite) → mr-gates diff review → commit. SQL is generated, NEVER
executed (Matt runs it).

These keys are public; **RLS is the only lock**. Default deny on every table. This
workstream writes the POLICY BODIES for the tables created (RLS-enabled, deny-all) in
Workstream A's 0002/0003, plus a SQL deny-case test suite proving the locks hold.

Builds on the helpers from 0002: `current_actor_id()`, `current_student_id()`,
`is_staff()`, `can_access_campus(uuid)`, `is_parent_of(uuid)`, `student_campus(uuid)`.

Authored migration: **`supabase/migrations/0004_rls_phase11.sql`** (+ teardown).
Test suite: **`supabase/tests/rls_deny_cases.sql`** (runnable by Matt after apply).

---

## A schema gap discovered in B (amend 0003 — it is committed but UNRUN, so safe to edit)
**`diagnostic_estimates` has no `student_id`.** It carries `session_id` + `skill_id` only.
Own-row RLS for a student needs a direct `student_id` (scoping via a subquery on the
RLS-protected `sessions` would re-trigger RLS / recurse — the exact thing 0001's invariant
forbids). **Recommend: denormalize `student_id uuid not null` onto `diagnostic_estimates`
in 0003** (consistent with student_attempts/mastery_updates carrying student_id directly),
so its policy is `student_id = current_student_id()` — subquery-free. mr-gates: confirm
amend-0003 (vs a `session_student(uuid)` DEFINER helper). I recommend the column.

---

## Policy design (per table). Pattern: own-row + staff-by-campus + parent-by-link.

### Identity (0002 tables)
- **parent_profiles** — SELECT own (`id = current_actor_id()`); SELECT super_admin (all).
  No INSERT/UPDATE/DELETE policy (service-role provisions). 
- **parent_student_links** — SELECT own (`parent_id = current_actor_id()`); SELECT staff by
  the student's campus (`can_access_campus(student_campus(student_id))`). Manage = service-
  role / campus_admin (a later admin surface); no student write.
- **staff_profiles** — SELECT own (`id = current_actor_id()`); SELECT super_admin (all);
  campus_admin SELECT own campus (`can_access_campus(campus_id)`). Write service-role.

### Curriculum (0003) — NOT student PII
- **curriculum_graphs / curriculum_graph_activations** — SELECT any authenticated
  (curriculum metadata, no PII). INSERT/UPDATE/DELETE already revoked (immutable; service-
  role publishes). So: a permissive SELECT policy for `authenticated`, nothing else.

### Student evidence & state (0003 new + already-policied 0001)
- **diagnostic_estimates** — SELECT own (`student_id = current_student_id()`, after the
  amend above) + staff by campus (`can_access_campus(student_campus(student_id))`).
  INSERT own (`with check student_id = current_student_id()`). No update/delete (append-only
  trigger + revoke already there). Parent: SELECT via `is_parent_of(student_id)`.
- **summative_results** — SELECT own + staff by campus + parent-by-link; INSERT own. Append-
  only enforced (Workstream A). (Stubbed; policy present so it's never open.)
- **grade_artifacts** — SELECT own + staff by campus + parent-by-link. INSERT service-role
  (the grade engine issues these); no student insert. Append-only/versioned (Workstream A).

### Video (0003)
- **video_assets** — SELECT any authenticated (curriculum metadata). Staff INSERT/UPDATE:
  because A revoked INSERT/UPDATE/DELETE from app roles, the staff write path must
  **re-GRANT INSERT/UPDATE to a staff path** (a policy cannot re-grant a revoked table
  privilege — mr-gates N-3). Recommend: keep writes service-role-only for now (admin video
  upload runs server-side in Workstream D), so NO re-grant needed; SELECT-authenticated is
  the only policy. mr-gates confirm.

### Tutor stub (0003)
- **tutor_exchanges** — SELECT own (`student_id = current_student_id()`) + staff by campus.
  INSERT own. Append-only. (Phase 10C not built — policy present so the table is never open.)

### Parent access across the existing 0001 evidence tables (NEW in B)
The Phase 7B parent digest + the COPPA model imply a parent must read THEIR linked
student's records. 0001 only has own + staff policies. **Add parent SELECT policies** via
`is_parent_of(student_id)` to: student_profiles, student_skill_state, student_attempts,
mastery_updates, course_enrollments, sessions, message_threads, messages,
consent_events, and the transcript view path. Parent gets READ ONLY; never insert/update.
mr-kahn: confirm parent read scope is correct (linked + consent-granted only) and does not
over-expose (e.g. should a parent see raw attempt rows, or only the digest projection?).

> Open question (mr-kahn + pee-wee): parent READ granularity. Option (a) parent reads the
> same evidence tables staff can (full transparency to the legal guardian). Option (b)
> parent reads only the digest/transcript projection, not raw per-attempt rows. (b) is more
> data-minimizing but the digest is computed app-side from those tables. Recommend (a)
> read access at the row level gated by is_parent_of (the guardian is entitled), with the
> UI choosing what to render — but rule on it.

---

## Hardening (belt-and-suspenders, carry 0001 posture)
- Default deny is already the baseline (RLS enabled + no policy = denied). Every policy
  ADDS narrow access; none uses `using (true)` except the curriculum/video
  authenticated-read (non-PII) and the 0001 record_access_log insert stub (already flagged).
- Re-confirm INSERT-ONLY: no UPDATE/DELETE policy on any evidence table; revoke + trigger
  from Workstream A stand.
- Engine/service-role writes: student_skill_state + grade_artifacts + curriculum_graphs +
  video writes are service-role only (no app write policy). The engine writes via the
  server-side service-role context (Workstream C), never the browser.
- No policy inlines a subquery against an RLS-protected table — all scoping via the DEFINER
  helpers (student_campus, is_parent_of, can_access_campus).

## SQL deny-case test suite (`supabase/tests/rls_deny_cases.sql`)
Runnable assertions (Matt runs after apply; uses set-claims to impersonate). Must PROVE:
1. Student A cannot SELECT student B's profile / skill_state / attempts / mastery_updates /
   diagnostic_estimates / summative_results / grade_artifacts (each → 0 rows).
2. A client (authenticated) cannot UPDATE or DELETE a student_attempt / mastery_update /
   summative_result / grade_artifact (→ raises / 0 rows affected; the trigger fires).
3. A parent NOT linked to student X sees 0 rows for X; a linked parent WITH consent granted
   sees X's rows; a linked parent with consent REVOKED sees 0 rows.
4. A coach/campus_admin sees only their campus; super_admin sees across campuses.
5. A student cannot SELECT any staff_profiles / parent_profiles row not their own actor.
6. anon (no JWT) sees nothing on every table.
7. Curriculum/video readable by any authenticated; NOT writable by authenticated.
Each test sets `request.jwt.claims` to the impersonated principal, runs the query, asserts
the row count / expects the raised exception. Structured so a CI harness can later run it.

## Gates requested
- **mr-gates**: the schema amend (student_id on diagnostic_estimates), every policy body,
  the no-recursion guarantee, the video write-path (re-grant vs service-role), the parent
  cross-table read policies, and the deny-case suite's completeness (does it actually prove
  default-deny + cross-student isolation + append-only + parent gating + anon-locked).
- **mr-kahn**: parent read granularity (a vs b), that parent/staff read access never
  exposes another student's evidence, and that the evidence trail stays append-only + the
  access log captures staff/parent reads where required (FERPA).
- **pee-wee**: scoped — do the access rules match each persona's honest expectations
  (student sees own; parent sees their child with consent; coach sees their roster;
  nobody sees another family's child)? Flag any rule that would make a persona screen
  either over-promise (showing data they shouldn't) or under-deliver (hiding data they're
  entitled to).

Verdict: APPROVE | APPROVE WITH CHANGES (list) | REJECT (reason).

---

## GATE RESOLUTIONS — BINDING (supersedes conflicting text above)

mr-gates APPROVE WITH CHANGES (7 blocking + nits) · mr-kahn APPROVE WITH CHANGES (5) ·
pee-wee APPROVE WITH NOTES (3). No rejections. ONE item (parent read granularity) is a
mr-kahn↔pee-wee CONFLICT on a COPPA/FERPA-ambiguous call → escalated to Matt (below); all
others folded here. mr-grunt implements after Matt rules on the escalation.

### Schema amend (mr-gates 1) — to 0003 (committed but UNRUN, safe to edit)
B1. Add `diagnostic_estimates.student_id uuid NOT NULL references student_profiles(id)
    on delete restrict` + an index on `(student_id)`; writer (C) stamps it from the same
    session. Own-row policy then `student_id = current_student_id()` (subquery-free).

### Policy mechanics (mr-gates 2/3/5/6) — every policy in 0004
B2. super_admin-all = `using (app.can_access_campus(null))` explicitly (the helper returns
    true for super_admin regardless of campus). No new is_super_admin() helper invented.
B3. EVERY read policy carries `TO authenticated`. Curriculum + video reads =
    `for select to authenticated using (true)` (non-PII; never PUBLIC/anon).
B4. Engine/curriculum/grade/video writes are **Supabase `service_role`** (RLS-bypassing,
    server-side only — Workstream C). State the role name in 0004 comments. No app write
    policy on student_skill_state / grade_artifacts / curriculum_graphs / video_assets.
B5. Video writes stay service-role-only (no re-grant; admin upload server-side in D).
    grade_artifacts has no INSERT policy (RLS-on + no-policy = denied); comment the
    asymmetry vs video's revoke so nobody "helpfully" adds one.
B6. No policy inlines a subquery against an RLS-protected table — scope only via the
    DEFINER helpers. (Carried.)

### Transcript view + sessions reconciliation (mr-gates 5, mr-kahn 3)
B7. `alter view student_standard_transcript set (security_invoker = true)` (PG15+) AND
    enforce own/parent/staff scoping on its base `student_skill_state` — else the view
    bypasses RLS and leaks every transcript. Deny-case M-8 proves it.
B8. Reconcile `sessions_select_staff` (0001 `where false` placeholder): drop+recreate to
    `can_access_campus(student_campus(student_id))` in 0004 (mirror 0002's reconciliation).
    Do NOT layer a parent sessions policy on a broken staff grant. Scope parent `sessions`
    OUT unless a surface needs it.

### Read-only invariant + record_access_log (mr-kahn 4/5, mr-gates 6)
B9. HARD INVARIANT: NO parent or staff INSERT/UPDATE/DELETE policy on ANY evidence or
    consent table. Parent/staff are read-only across the board. Deny-suite asserts
    parent+staff INSERT/UPDATE/DELETE rejected on student_attempts, mastery_updates,
    consent_events.
B10. Do NOT add parent read to `record_access_log` (staff/audit surface only) — state the
    exclusion (deny-case M-9).
B11. Tighten the 0001 `record_access_log_insert` stub from `with check (true)` to
    `with check (actor_id = app.current_actor_id())` in 0004 (in-scope: open write path on
    an audit table). **Declare it a PRODUCTION LAUNCH BLOCKER** if left unwired.
B12. FERPA read-audit (logging who READ a record) is DEFERRED but as an EXPLICIT tracked
    backlog item (in the 0004 header + phase notes): "wire record_access_log insert on
    every staff/parent SELECT of a student record before production." May ship to staging
    without it; may NOT certify/production with cross-record read open + read-audit unwired.

### Persona honesty (pee-wee 1/2)
B13. A parent must still SELECT their OWN `parent_student_links` + current consent status
    EVEN WHEN consent is revoked — so the UI renders "access paused" not "no records."
    The link/consent-status read is gated by `parent_id = current_actor_id()`, NOT by
    `is_parent_of` (which is false when revoked). This is independent of the granularity
    call below.
B14. Coach vs campus_admin: for now BOTH get whole-campus read via `can_access_campus`
    (tiers differ in write/admin power, not read scope). STATE this explicitly; a
    roster-scoped coach (coach↔student link) is a future model addition — log as backlog.
    The eventual coach screen must not say "your roster" while showing the whole campus.

### Deny-case suite (mr-gates 6, mr-kahn 2/4) — the proof artifact, must include
B15. supabase/tests/rls_deny_cases.sql adds, beyond the original 7:
    M-1 cross-student INSERT spoofing (student A inserts a row with student_id=B → rejected
    by `with check`) — the biggest gap, evidence forgery is worse than reading.
    M-2 authenticated cannot insert grade_artifacts at all.
    M-3 authenticated cannot insert curriculum_graphs/activations/video_assets (revoke path).
    M-4 consent precision: linked+pending → 0; link revoked but consent granted → 0.
    M-5 campus_admin cannot read another campus's staff_profiles/parent_profiles/
        student_profiles; super_admin can.
    M-6 coach from campus X gets 0 on parent_student_links for a campus-Y student.
    M-7 anon SELECT on curriculum_graphs/video_assets = 0/denied (regression guard for B3).
    M-8 transcript view leak: student B reading A's transcript rows → 0 (proves B7).
    M-9 linked+granted parent gets 0 on record_access_log (proves B10).
    M-10 (mr-kahn 2) revocation WITHOUT re-auth: granted parent sees N → repoint consent
        event to revoked, SAME JWT → 0 rows.
    NIT: reset `request.jwt.claims` to empty between principals; wrap expected-raises in
    savepoints so one exception doesn't abort the script.

### ESCALATED TO MATT (mr-kahn ↔ pee-wee conflict; COPPA/FERPA-ambiguous)
E1. **Parent read granularity.** mr-kahn rules **(b)**: parent reads PROJECTION ONLY
    (student_profiles, student_skill_state, mastery_updates, course_enrollments,
    consent_events, message_threads/messages, transcript view) — NOT raw student_attempts,
    diagnostic_estimates, or tutor_exchanges (data-minimization; raw telemetry isn't "the
    education record"; the parent UI already renders only the projection; any genuinely-
    needed raw read happens service-role server-side). pee-wee rules **(a)**: row-level read
    of raw tables gated by is_parent_of, with digest-first rendering and a parent-initiated
    drill-down (full transparency to the guardian; (b) is "quietly patronizing"). Both flag
    needs-counsel. mr-gates: mechanism supports either. **Matt decides.** 0004's parent
    policy set differs only in whether student_attempts/diagnostic_estimates/tutor_exchanges
    get a parent SELECT policy. Default if unspecified: (b), the data-minimizing safe
    default pending counsel.
    **>>> MATT RULED 2026-06-13: (b) PROJECTION ONLY. <<<** Parent SELECT policies are added
    ONLY to student_profiles, student_skill_state, mastery_updates, course_enrollments,
    consent_events, message_threads, messages, and the transcript view path. NO parent
    SELECT on student_attempts, diagnostic_estimates, or tutor_exchanges. Any raw read the
    digest needs runs service-role server-side. Auth model = PARENT-HELD accounts (Matt
    ruled — informs Workstream C).
