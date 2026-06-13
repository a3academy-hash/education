-- =============================================================================
-- 0005_auth_access_token_hook.sql  —  A3 Virtual School / Algebra 1 / Phase 11C1
-- Supabase Auth custom_access_token_hook implementing the MODEL B claim contract:
-- inject student_id / campus_id / role into the JWT from SERVER-READ profile
-- tables keyed by the AUTHENTICATING auth uid — NEVER from client input. This is
-- the single place the 0001/0002 helper claims are minted; it must match those
-- helper reads EXACTLY (C-C1).
--
--   *** NOT EXECUTED — Matt checkpoint. ***
--   Per CLAUDE.md "Any schema migration before it runs" is a human checkpoint.
--   This hook governs identity for the store of children's education records. NO
--   agent runs it. No psql / supabase / SQL was run to produce or verify this
--   file. Read it top-to-bottom; approve; THEN run via the Supabase migration
--   tooling, AFTER 0001→0004 have been applied, AND enable it as the
--   "Customize Access Token (JWT) Claims" hook in the Supabase Auth dashboard
--   (Authentication → Hooks → Custom Access Token), or via the Auth config API.
--
-- ── MODEL B (Matt ruled 2026-06-13) ──────────────────────────────────────────
--   The student has their own Supabase auth identity, PROVISIONED + CONTROLLED +
--   CONSENTED by the parent (C2 builds that provisioning UI). The JWT carries a
--   STABLE student_id = the student's own auth uid, minted HERE from
--   student_profiles (never client input). The parent has a SEPARATE parent
--   login for oversight (reads via app.is_parent_of). "Parent-held" = the parent
--   holds provisioning + consent + oversight authority. RLS-cleanest: the
--   student_id claim is stable across the session (no per-child re-mint window,
--   which is why Model A was rejected for evidence integrity).
--
-- ── AUTH UID ↔ PROFILE ID MAPPING CONTRACT (established by C2 provisioning) ───
--   This hook ASSUMES the following identity mapping, which the C2
--   signup/provisioning server actions (service-role) MUST establish:
--     - a STUDENT  auth user: auth.users.id == student_profiles.id
--     - a PARENT   auth user: auth.users.id == parent_profiles.id
--     - a STAFF    auth user: auth.users.id == staff_profiles.id
--   i.e. the profile row's primary key IS the Supabase auth uid for that
--   principal. The hook reads the authenticating uid (event->>'user_id') and
--   looks the role + scoping claims up from these tables. It NEVER trusts any
--   value supplied by the client. A principal with NO matching profile row gets
--   role 'unprovisioned' and NO scoping claims → every RLS helper denies (fail
--   closed). The actual rows are written by C2 (provisioning), not here.
--
-- ── CLAIM CONTRACT (C-C1 — must match the 0001/0002 helper reads EXACTLY) ─────
--   app.current_student_id() reads claim 'student_id'   (uuid)   — STUDENT only.
--   app.current_campus_id()  reads claim 'campus_id'    (uuid)   — student/staff.
--   app.current_actor_id()   reads claim 'actor_id', else 'sub'  — every role.
--                            (We do NOT set actor_id; the JWT 'sub' = auth uid is
--                            the actor, and parent_student_links.parent_id /
--                            staff_profiles.id are keyed to that uid — C-C2.)
--   role claim 'role'        reads:
--        - student → 'student'
--        - parent  → 'parent'
--        - staff   → the staff_profiles.role ('super_admin'|'campus_admin'|'coach')
--   NOTE: the 0002 staff path keys on app.current_actor_id() (= sub = auth uid)
--   matched against staff_profiles.id, so for staff we set role + campus_id but
--   rely on sub (not a separate actor_id) for is_staff()/can_access_campus()
--   — exactly the 0002 contract. Likewise is_parent_of() keys parent_id on sub.
--
-- ── FORGE PREVENTION (C-C2) ──────────────────────────────────────────────────
--   Every claim is SERVER-READ from a profile table keyed by the authenticating
--   uid. The client NEVER supplies student_id / campus_id / role. A parent can
--   never forge a student_id for a child they lack a consented link to: a parent
--   auth user matches parent_profiles (role 'parent', no student_id claim) and
--   reaches a child's records ONLY through app.is_parent_of (active link AND
--   currently-granted consent). The student_id claim is minted ONLY for a
--   student auth user, from that student's OWN profile row.
--
-- ── PRECEDENCE (single mint point) ───────────────────────────────────────────
--   A uid is expected to be exactly one of student / parent / staff. The hook
--   checks student → staff → parent and stops at the first match, so a single
--   well-formed principal gets exactly one role. (If a uid somehow matched
--   multiple profile tables, this deterministic order picks one; C2 provisioning
--   must keep the three identity spaces disjoint.)
--
-- HARD ORDER (do not reorder): function → grants/revokes (auth admin executes it;
-- authenticated/anon/public must NOT) → comment.
-- =============================================================================

begin;

-- ── 1. THE HOOK FUNCTION ─────────────────────────────────────────────────────
-- Signature is fixed by Supabase Auth: custom_access_token_hook(event jsonb)
-- returns jsonb. `event` carries the authenticating user_id and the claims
-- being assembled (event->'claims'); we merge our app_metadata-level claims into
-- the returned claims object. SECURITY DEFINER with a pinned search_path so the
-- table reads bypass RLS (the hook runs as the auth admin path; reading the
-- profile tables is intentional and forge-safe because it keys on the uid).
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid          uuid;
  v_claims       jsonb;
  v_student_id   uuid;
  v_campus_id    uuid;
  v_staff_role   text;
  v_staff_campus uuid;
  v_is_parent    boolean;
begin
  -- The authenticating principal's auth uid. NEVER trust client-supplied claims;
  -- everything below is keyed off this server-known value.
  v_uid := (event ->> 'user_id')::uuid;
  v_claims := coalesce(event -> 'claims', '{}'::jsonb);

  -- 1) STUDENT — own profile row keyed by uid. Mint stable student_id + campus.
  select sp.id, sp.campus_id
    into v_student_id, v_campus_id
    from public.student_profiles sp
   where sp.id = v_uid;

  if v_student_id is not null then
    v_claims := v_claims
      || jsonb_build_object('role', 'student')
      || jsonb_build_object('student_id', v_student_id::text);
    if v_campus_id is not null then
      v_claims := v_claims || jsonb_build_object('campus_id', v_campus_id::text);
    end if;
    event := jsonb_set(event, '{claims}', v_claims);
    return event;
  end if;

  -- 2) STAFF — staff_profiles row keyed by uid. Mint role + campus (super_admin
  --    has null campus by the 0002 CHECK; can_access_campus(null)=true for them).
  select s.role, s.campus_id
    into v_staff_role, v_staff_campus
    from public.staff_profiles s
   where s.id = v_uid;

  if v_staff_role is not null then
    v_claims := v_claims || jsonb_build_object('role', v_staff_role);
    if v_staff_campus is not null then
      v_claims := v_claims || jsonb_build_object('campus_id', v_staff_campus::text);
    end if;
    event := jsonb_set(event, '{claims}', v_claims);
    return event;
  end if;

  -- 3) PARENT — parent_profiles row keyed by uid. Mint role only; the actor is
  --    the JWT sub (= uid), which app.is_parent_of matches against
  --    parent_student_links.parent_id (C-C2). NO student_id / campus_id claim:
  --    a parent reaches a child ONLY via an active, consent-granted link.
  select true
    into v_is_parent
    from public.parent_profiles p
   where p.id = v_uid;

  if v_is_parent then
    v_claims := v_claims || jsonb_build_object('role', 'parent');
    event := jsonb_set(event, '{claims}', v_claims);
    return event;
  end if;

  -- 4) UNPROVISIONED — no matching profile. Fail closed: a role that no helper
  --    admits and no scoping claims. (C2 provisioning has not run for this uid.)
  v_claims := v_claims || jsonb_build_object('role', 'unprovisioned');
  event := jsonb_set(event, '{claims}', v_claims);
  return event;
end;
$$;


-- ── 2. GRANTS / REVOKES (Supabase auth-hook requirements) ────────────────────
-- The hook is invoked by the `supabase_auth_admin` role during token issuance.
-- Grant EXECUTE to it and to read the profile tables it consults; REVOKE EXECUTE
-- from authenticated / anon / public so no ordinary caller can invoke the mint
-- path directly. (SECURITY DEFINER means the table reads run as the function
-- owner; the auth_admin grant is about who may CALL the hook.)
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- The DEFINER reads bypass RLS (owned by the table owner), but Supabase docs also
-- recommend granting the auth admin explicit read on the consulted tables so the
-- hook is robust to ownership/migration changes. SELECT-only; never write.
grant select on public.student_profiles to supabase_auth_admin;
grant select on public.staff_profiles   to supabase_auth_admin;
grant select on public.parent_profiles  to supabase_auth_admin;


-- ── 3. COMMENT (carry the rationale into the live catalog) ───────────────────
comment on function public.custom_access_token_hook(jsonb) is
  'Supabase Auth custom access-token hook (Model B). Mints role + student_id/campus_id claims SERVER-READ from student/staff/parent profile tables keyed by the authenticating auth uid (never client input — forge prevention C-C2). Claims match the 0001/0002 RLS helpers exactly (C-C1): current_student_id<-student_id, current_campus_id<-campus_id, current_actor_id<-sub, role<-role. This is how Model B mints the stable parent-provisioned student_id. SECURITY DEFINER, pinned search_path; EXECUTE granted only to supabase_auth_admin.';

commit;


-- =============================================================================
-- TEARDOWN (reversibility) — DESTRUCTIVE. Run as 0005_down.sql / separate
-- checkpoint. Drops the hook function (and its grants fall with it). Remember to
-- ALSO disable the hook in the Supabase Auth dashboard/config before dropping,
-- or token issuance will error on a missing function. NOT part of the apply.
-- =============================================================================
-- begin;
--   revoke execute on function public.custom_access_token_hook(jsonb) from supabase_auth_admin;
--   drop function if exists public.custom_access_token_hook(jsonb);
--   -- (Optional) revoke the read grants if no other auth-admin path needs them:
--   -- revoke select on public.parent_profiles  from supabase_auth_admin;
--   -- revoke select on public.staff_profiles   from supabase_auth_admin;
--   -- revoke select on public.student_profiles from supabase_auth_admin;
-- commit;
-- =============================================================================
