// lib/auth/staff-guard.ts — the SINGLE server-only chokepoint for staff-gated
// surfaces (Phase 7 §A, mr-gates G2). Every /admin/* route calls requireStaff()
// and renders nothing until it returns a staff identity.
//
// POSTURE (mr-gates G2 — binding):
//  - In PRODUCTION with no real JWT, this MUST notFound() — mirroring the
//    /dev/* "notFound() in production" posture. The production data path stays
//    closed; there is no backdoor to real data.
//  - A STUB staff identity is permitted ONLY when NODE_ENV !== "production",
//    and the stub branch is dead code in a production bundle (the prod path
//    returns/notFound() before it is reached).
//  - When Supabase auth lands, this one function reads the JWT `role` claim
//    (role === "staff") and `campus_id` — exactly the claims the RLS policies in
//    supabase/migrations already expect. This is the only seam to wire.
//
// server-only: imports next/navigation's notFound, which throws in render. Never
// import this from a client component.

import { notFound } from "next/navigation";

/** Resolved staff identity — shape matches the JWT claims the RLS reads. */
export interface StaffIdentity {
  role: "staff";
  /** Campus scope from the JWT `campus_id` claim; null = unscoped/global. */
  campusId: string | null;
}

/**
 * The dev-only stub campus. Aligns with the single seeded in-memory campus so
 * the campusId every read builder receives (mr-gates G3) is consistent before
 * RLS exists. Inert in production (the stub branch is never reached there).
 */
const STUB_CAMPUS_ID: string | null = null;

/**
 * Gate a staff-only surface. Returns the staff identity, or calls notFound()
 * (which throws) when the caller is not authorized.
 *
 * Today (pre-auth): production → notFound(); non-production → stub staff. When
 * Supabase auth lands, replace the body with a JWT read of role/campus_id; the
 * call sites and return type do not change.
 */
export function requireStaff(): StaffIdentity {
  // Production data path is CLOSED until real auth is wired. No stub identity
  // ever materializes in a production bundle.
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  // Dev/preview only: a stub staff identity so the admin surfaces are
  // demonstrable against the in-memory store. Mirrors the JWT claim shape.
  return { role: "staff", campusId: STUB_CAMPUS_ID };
}
