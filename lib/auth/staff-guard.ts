// lib/auth/staff-guard.ts — the SINGLE server-only chokepoint for staff-gated
// surfaces (Phase 7 §A, mr-gates G2). Every /admin/* route calls requireStaff()
// and renders nothing until it returns a verified staff identity.
//
// POSTURE (mr-gates G2 — binding):
//  - SUPABASE MODE: server-VERIFIED claims (getClaims, never getSession) — the
//    same 0005-minted claims RLS reads. The app role is `user_role` (NOT the
//    reserved `role` claim). Any non-staff principal (student/parent/
//    unprovisioned) or any failure → notFound(). The production data path stays
//    closed; there is no backdoor to real data.
//  - MEMORY MODE: in PRODUCTION → notFound() (mirrors the /dev/* posture); in
//    non-production → an unscoped stub staff identity so the admin surfaces are
//    demonstrable against the in-memory store.
//
// server-only: imports next/navigation's notFound, which throws in render, and
// the Supabase server client. Never import this from a client component.

import { notFound } from "next/navigation";
import { getAuthMode } from "./mode";
import { createClient as createUserClient } from "../supabase/server";
import { STAFF_ROLES, type StaffRole } from "../../types";

if (typeof window !== "undefined") {
  throw new Error("lib/auth/staff-guard.ts is server-only and must never run in the browser.");
}

export interface StaffIdentity {
  /** The staff role tier from the 0005 user_role claim. */
  role: StaffRole;
  /** Campus scope from the campus_id claim; null = unscoped (super_admin → all). */
  campusId: string | null;
  /** The verified auth uid (JWT sub) — audit/identity stamp. */
  actorId: string | null;
}

function isStaffRole(v: unknown): v is StaffRole {
  return typeof v === "string" && (STAFF_ROLES as readonly string[]).includes(v);
}

export async function requireStaff(): Promise<StaffIdentity> {
  // MEMORY MODE (dev/tests): unchanged posture. Production → closed; non-prod →
  // an unscoped stub staff identity so the admin surface is demonstrable.
  if (getAuthMode() === "memory") {
    if (process.env.NODE_ENV === "production") notFound();
    return { role: "super_admin", campusId: null, actorId: null };
  }

  // SUPABASE MODE: server-VERIFIED claims (getClaims, never getSession). Deny any
  // non-staff principal (student/parent/unprovisioned) with notFound().
  let claims: Record<string, unknown> | null = null;
  try {
    const userClient = await createUserClient();
    const { data, error } = await userClient.auth.getClaims();
    if (!error && data?.claims) claims = data.claims as Record<string, unknown>;
  } catch {
    claims = null;
  }
  if (!claims) notFound();

  const role = claims.user_role;
  if (!isStaffRole(role)) notFound();

  const campusId = typeof claims.campus_id === "string" ? claims.campus_id : null;
  const actorId = typeof claims.sub === "string" ? claims.sub : null;
  return { role, campusId, actorId };
}
