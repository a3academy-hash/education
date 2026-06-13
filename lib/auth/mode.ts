// lib/auth/mode.ts — the ONE source of truth for which auth/identity world we are
// in (Phase 11 C2 binding S3). Derived from REPOSITORY_BACKEND so there is no
// independent AUTH_MODE env to drift: the repository backend and the auth model
// are the same decision.
//
//   memory   → STUDENT_COOKIE onboarding/student flow (the dev/test path).
//              No Supabase Auth. The default.
//   supabase → Supabase Auth (parent-held, Model B): JWT-verified student_id.
//
// Pure + dependency-free (reads only process.env), so it is safe to import from
// the session seam, server components, route handlers, AND unit tests. It does
// NOT touch cookies/Supabase, so calling it never throws on missing env (S11).

export type AuthMode = "memory" | "supabase";

/**
 * Resolve the auth mode from REPOSITORY_BACKEND (S3 — one source of truth, fail
 * closed). Anything other than the explicit "supabase" value is treated as
 * "memory" — the safe default that needs no Supabase configuration.
 */
export function getAuthMode(): AuthMode {
  return process.env.REPOSITORY_BACKEND === "supabase" ? "supabase" : "memory";
}
