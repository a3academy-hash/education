// lib/auth/parent.ts — server-only resolution of the AUTHENTICATED PARENT and
// their child roster (C2 P3/P5/P6). Mirrors lib/auth/session.ts for the parent
// side: the verified parent uid (via userClient.auth.getClaims(), never the raw
// cookie) plus the roster the parent is permitted to see.
//
// SECURITY:
//  - The parent uid is SERVER-VERIFIED. role must be 'parent' (the 0005 hook
//    mints it from parent_profiles).
//  - The roster is read with the SERVICE client because the child-profile join
//    spans tables a parent's own JWT cannot fully traverse pre-launch; every row
//    is filtered to parent_id == the VERIFIED parent uid (forge-safe, C-C2).
//  - Consent posture per child is derived from the link's current_consent_event
//    status (the one consent truth), surfaced as the ConsentState the roster
//    renders.
//
// server-only: never import from a client component.

import { createClient as createUserClient } from "../supabase/server";
import { createServiceClient } from "../supabase/service";
import type { ConsentState } from "../../components/ui/ConsentPill";

if (typeof window !== "undefined") {
  throw new Error("lib/auth/parent.ts is server-only and must never run in the browser.");
}

export interface ParentIdentity {
  uid: string;
  name: string | null;
}

export interface RosterChild {
  studentId: string;
  firstName: string;
  gradeLevel: number | null;
  consent: ConsentState;
}

/**
 * The verified authenticated parent, or null. Fail closed on any error / a
 * non-parent principal.
 */
export async function getCurrentParent(): Promise<ParentIdentity | null> {
  try {
    const userClient = await createUserClient();
    const { data, error } = await userClient.auth.getClaims();
    if (error || !data?.claims) return null;

    const claims = data.claims as Record<string, unknown>;
    // App role is 'user_role' (the reserved 'role' claim stays 'authenticated'
    // for PostgREST — see migration 0005).
    const role = typeof claims.user_role === "string" ? claims.user_role : null;
    if (role !== "parent") return null;

    const uid = typeof claims.sub === "string" ? claims.sub : null;
    if (!uid) return null;
    // Name from parent_profiles (the parent can read their own row via RLS).
    const { data: profile } = await userClient
      .from("parent_profiles")
      .select("display_name")
      .eq("id", uid)
      .maybeSingle();
    const name =
      profile && typeof (profile as { display_name?: unknown }).display_name === "string"
        ? (profile as { display_name: string }).display_name
        : null;
    return { uid, name };
  } catch {
    return null;
  }
}

/**
 * The parent's child roster (P3). Service-read, filtered to the VERIFIED parent
 * uid. Deterministic order: first name asc, ties by studentId asc (no progress
 * sort — P3). Returns [] on any error (calm empty state).
 */
export async function getRoster(parentUid: string): Promise<RosterChild[]> {
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("parent_student_links")
      .select(
        "student_id, status, student_profiles:student_id(display_name, grade_level), consent_events:current_consent_event_id(status)",
      )
      .eq("parent_id", parentUid);
    if (error || !data) return [];

    const rows = data as RosterLinkRow[];
    const children: RosterChild[] = rows.map((row) => {
      const profile = normalizeOne(row.student_profiles);
      const ev = normalizeOne(row.consent_events);
      return {
        studentId: row.student_id,
        firstName: profile?.display_name ?? "Student",
        gradeLevel: profile?.grade_level ?? null,
        consent: deriveConsent(row.status, ev?.status ?? null),
      };
    });

    return children.sort(
      (a, b) =>
        a.firstName.localeCompare(b.firstName) ||
        a.studentId.localeCompare(b.studentId),
    );
  } catch {
    return [];
  }
}

/** Map link.status + current consent event status → the roster ConsentState. */
export function deriveConsent(
  linkStatus: string,
  eventStatus: string | null,
): ConsentState {
  if (linkStatus === "active" && eventStatus === "granted") return "active";
  if (linkStatus === "revoked" || eventStatus === "revoked") return "revoked";
  return "pending";
}

interface ChildProfileShape {
  display_name: string;
  grade_level: number | null;
}
interface ConsentEventShape {
  status: string;
}
interface RosterLinkRow {
  student_id: string;
  status: string;
  student_profiles: ChildProfileShape | ChildProfileShape[] | null;
  consent_events: ConsentEventShape | ConsentEventShape[] | null;
}

function normalizeOne<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
