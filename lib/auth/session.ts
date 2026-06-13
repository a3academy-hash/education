// lib/auth/session.ts — the SINGLE server-only seam that resolves the ACTIVE
// student identity for every student-facing surface (Phase 11 C2 binding
// S1/S2/S8/S9). Every one of the nine student call sites routes through
// getCurrentStudentId() so there is exactly one place the memory↔supabase
// identity decision lives.
//
// MEMORY MODE (default, dev/tests — S1/S11):
//   identity = the opaque STUDENT_COOKIE value, UNCHANGED from the pre-C2 flow.
//   No Supabase Auth, no consent gate (the dev/test path has no parent layer).
//   Behavior is byte-for-byte what the call sites did inline before.
//
// SUPABASE MODE (Model B — S1/S2/S8/S9):
//   identity = the SERVER-VERIFIED `student_id` JWT claim, read via
//   userClient.auth.getUser() (a network call to the Auth server that VERIFIES
//   the token — NEVER the raw, spoofable cookie). Then consent is enforced
//   server-side: the active child must have a CURRENTLY-granted parent link, or
//   we fail closed (return null / paused) so no evidence surface loads
//   (PRE-CONSENT EVIDENCE INVARIANT, S8). Mid-session revocation degrades to
//   "paused" on the next request (S9 — honest about token latency).
//
// FAIL CLOSED: any error, missing claim, or non-granted consent → no identity.
// This module never throws on the happy path and never leaks an auth error to a
// caller — callers treat `null` as "no active student" and render their calm
// empty/expiry state. Middleware is UX redirection only; THIS is the binding
// gate (S2).
//
// server-only: reads cookies()/Supabase server clients. Never import from a
// client component.

import { cookies } from "next/headers";
import { getAuthMode } from "./mode";
import { createClient as createUserClient } from "../supabase/server";
import { createServiceClient } from "../supabase/service";
import { STUDENT_COOKIE } from "../../app/student/onboarding/constants";

// No-dep server-only guard (mirrors the repository/supabase modules). Fails fast
// if pulled into a client bundle (window is undefined on the server).
if (typeof window !== "undefined") {
  throw new Error(
    "lib/auth/session.ts is server-only and must never run in the browser.",
  );
}

/**
 * Why the active student has no usable session — drives the calm UI states
 * (P-states, S8): a brand-new/unauthenticated visitor, a consent-pending child
 * ("setup not finished"), or a revoked child ("access paused"). Memory mode only
 * ever yields "none" (cookie present) or the id directly.
 */
export type StudentSessionStatus = "active" | "none" | "pending" | "revoked";

export interface StudentSession {
  /** The verified active student id, or null when not "active". */
  studentId: string | null;
  status: StudentSessionStatus;
}

/**
 * Resolve the full active-student session (identity + consent posture). Server
 * components/shell use this when they must DISTINGUISH paused vs not-yet-granted
 * vs none (S8/P-states). Most call sites only need the id → use
 * getCurrentStudentId().
 *
 * NEVER throws: all failures collapse to { studentId: null, status: "none" }
 * (fail closed). A child must never see a raw auth error (pee-wee C-U1) — the
 * caller renders the calm interstitial.
 */
export async function resolveStudentSession(): Promise<StudentSession> {
  if (getAuthMode() === "memory") {
    // UNCHANGED dev/test path: the opaque cookie IS the identity. No consent
    // gate (no parent layer in memory mode).
    try {
      const cookieStore = await cookies();
      const id = cookieStore.get(STUDENT_COOKIE)?.value ?? null;
      return id
        ? { studentId: id, status: "active" }
        : { studentId: null, status: "none" };
    } catch {
      return { studentId: null, status: "none" };
    }
  }

  // ── supabase mode (Model B) ───────────────────────────────────────────────
  try {
    const userClient = await createUserClient();
    // SERVER-VERIFIED: getUser() validates the JWT with the Auth server. Do NOT
    // use getSession() here (it trusts the cookie without verification).
    const { data, error } = await userClient.auth.getUser();
    if (error || !data?.user) return { studentId: null, status: "none" };

    // The student_id claim is minted by the 0005 hook from the student's OWN
    // profile (Model B) — never client input. A non-student principal (parent/
    // staff/unprovisioned) carries no student_id → no active student here.
    const claims = (data.user.app_metadata ?? {}) as Record<string, unknown>;
    const claimStudentId =
      typeof claims.student_id === "string" ? claims.student_id : null;
    // Fall back to the verified uid only when role === 'student' (Model B keeps
    // student_id == auth uid); never accept a uid for a non-student principal.
    const role = typeof claims.role === "string" ? claims.role : null;
    const studentId =
      claimStudentId ?? (role === "student" ? data.user.id : null);
    if (!studentId) return { studentId: null, status: "none" };

    // PRE-CONSENT / PAUSED ENFORCEMENT (S8/S9): the active child must have a
    // CURRENTLY-granted parent link. Read server-side via the service client
    // (the student's own JWT cannot read parent_student_links — that policy is
    // parent/staff scoped). This re-checks EVERY request, so a mid-session
    // revocation degrades to "paused" next request (S9).
    const consent = await readConsentStatus(studentId);
    if (consent === "granted") return { studentId, status: "active" };
    if (consent === "revoked") return { studentId: null, status: "revoked" };
    return { studentId: null, status: "pending" };
  } catch {
    // Any failure (network, misconfig) fails closed. Child never sees the error.
    return { studentId: null, status: "none" };
  }
}

/**
 * The active student's verified id, or null. THE canonical identity accessor —
 * all nine student call sites use this (S1). Returns null whenever the session
 * is not "active" (no cookie / unauthenticated / consent pending or revoked), so
 * existing `if (!studentId) return <Empty/>` guards keep working unchanged.
 */
export async function getCurrentStudentId(): Promise<string | null> {
  const session = await resolveStudentSession();
  return session.studentId;
}

/**
 * Consent posture for a child, read RLS-bypassed (service client) because a
 * student's own JWT is not permitted to read parent_student_links. Consent truth
 * is the link's current_consent_event_id → that event's status (the one consent
 * truth, never an independent enum). Mirrors app.is_parent_of's server-side
 * reading exactly.
 *
 * Returns the coarse posture the UI needs: "granted" (active), "revoked"
 * (paused), or "pending" (no link / no granted event yet). Fail closed → on any
 * read error returns "pending" (no evidence before a confirmed grant).
 */
async function readConsentStatus(
  studentId: string,
): Promise<"granted" | "revoked" | "pending"> {
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("parent_student_links")
      .select("status, consent_events:current_consent_event_id(status)")
      .eq("student_id", studentId);
    if (error || !data || data.length === 0) return "pending";

    // Any active link whose current consent event is 'granted' → granted.
    let sawActiveLink = false;
    for (const row of data as ConsentLinkRow[]) {
      if (row.status === "active") {
        sawActiveLink = true;
        const ev = normalizeConsentEvent(row.consent_events);
        if (ev?.status === "granted") return "granted";
      }
    }
    // An active link exists but no granted event → revoked (paused); otherwise
    // there is no usable link at all → pending (setup not finished).
    return sawActiveLink ? "revoked" : "pending";
  } catch {
    return "pending";
  }
}

interface ConsentEventShape {
  status: string;
}
interface ConsentLinkRow {
  status: string;
  // PostgREST returns an embedded relation as an object or (defensively) an
  // array depending on cardinality inference; normalize both.
  consent_events: ConsentEventShape | ConsentEventShape[] | null;
}

function normalizeConsentEvent(
  ev: ConsentEventShape | ConsentEventShape[] | null,
): ConsentEventShape | null {
  if (!ev) return null;
  return Array.isArray(ev) ? (ev[0] ?? null) : ev;
}
