# Phase 1 spine — dossier

## Current state (from AUDIT.md D7 + the security agent's runtime trace)
- Migrations 0001-0005 exist (Model-B identity, campus/staff tenancy). Strong plumbing: pinned
  search_path SECURITY DEFINER helpers (is_parent_of, can_access_campus), security_invoker views,
  append-only evidence via `app.forbid_mutation` trigger + REVOKE, immutable curriculum snapshot,
  Model-B server-minted JWT claims (0005 custom_access_token_hook mints user_role/student_id).
- GAPS this plan closes: NO data_classes/retention_policies (§3, must be FIRST); NO families/
  family_id (tenancy is campus_id); students have no dob/age_band/compliance_path; flat parent, no
  guardian role enum; NO assert_can_access_student RPC; grading is client-trusting (no HMAC/nonce/
  item_version/graded_server_side); coach == campus_admin whole-campus read (over-scoped); super_admin
  unconditional all-campus (no break-glass); no n>=5 suppression; no telemetry/calibration tables.
- The `forbid_mutation` trigger currently makes COPPA 30-day per-row deletion impossible — the plan
  amends it to whitelist a class-aware deletion RPC.

## Binding governance (ADR-0001)
- Next.js App Router host; server actions are thin auth wrappers; every privileged mutation is a
  Postgres SECURITY DEFINER RPC taking explicit student_id, calling assert_can_access_student FIRST,
  pinned search_path, no dynamic SQL. Domain logic stays in framework-neutral lib/. Latency budget:
  optimistic <16ms paint vs authoritative grade RPC <300ms; <800ms measured Phase 4.

## Constraints
- Migrations are GENERATED, NOT executed (executing against the dedicated Supabase project of
  children's records is the one human gate per the prior phase-11 workflow; here all data is test
  data per PLAN.md but I cannot exec SQL from this environment — validate syntactically + provide a
  runnable deny-suite). Test data freely destructible.
- Spec sections: SECURITY §2 (gating order), §3 (data classes + the deletion/immutability tension),
  §6 (guardian model), §8 (RLS threat model + assert_can_access_student + n>=5 + break-glass), §9
  (HMAC/nonce/server-grading), §16 (target tables). AI_ADAPTIVE §9 (optimistic/async/<800ms).
