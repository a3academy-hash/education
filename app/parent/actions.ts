"use server";

// Parent server actions (C2 — the heart): child provisioning (S6/S10), launch &
// switch (S4/S5), consent revoke & re-grant (S7). ALL of these are SUPABASE-mode
// only; memory mode short-circuits (S11) — the dev/test path has no parent layer.
//
// SERVICE-ROLE BOUNDARY: the admin/service client (RLS-bypass) is used ONLY
// server-side here and NEVER threaded to the client. Provisioning verifies the
// authed parent uid == the parent it links from (C-C2) before any write.
//
// LIVE-ONLY PATHS (deferred from the deterministic unit suite, flagged for
// mr-gates): every action below requires a live Supabase Auth + DB. They cannot
// run in memory mode and are not exercised by the in-process tests; they need a
// Matt-run live integration check (same posture as the SupabaseRepository).

import { redirect } from "next/navigation";
import { getAuthMode } from "../../lib/auth/mode";
import { createClient as createUserClient } from "../../lib/supabase/server";
import { createServiceClient } from "../../lib/supabase/service";
import { getCurrentParent } from "../../lib/auth/parent";
import { CONSENT_POLICY_VERSION, CONSENT_SCOPE } from "./consent-policy";

export interface ProvisionResult {
  ok: boolean;
  error?: string;
}

const MEMORY_NOTICE: ProvisionResult = {
  ok: false,
  error: "This action is not available in this environment.",
};
const MIN_GRADE = 6;
const MAX_GRADE = 8;
const GENERIC_FAIL: ProvisionResult = {
  ok: false,
  error: "We couldn't complete that just now. Please try again.",
};

// ── child provisioning (S6, S10) ─────────────────────────────────────────────

/**
 * Provision a child under the authenticated parent (Model B). Creates the
 * child's stable auth identity + profile + an active link + a granted consent
 * event, and points the link at that event. ROLLBACK on partial failure and
 * IDEMPOTENT (S10): createUser is not transactional with the DB writes, so a
 * failure after createUser cleans up the orphan auth user.
 */
export async function provisionChild(
  _prev: ProvisionResult | null,
  formData: FormData,
): Promise<ProvisionResult> {
  if (getAuthMode() !== "supabase") return MEMORY_NOTICE;

  const parent = await getCurrentParent();
  if (!parent) return { ok: false, error: "Please sign in again to continue." };

  // --- validate (do not trust the client) ---
  const firstName = String(formData.get("firstName") ?? "").trim();
  const gradeRaw = String(formData.get("gradeLevel") ?? "");
  const relationship = String(formData.get("relationship") ?? "").trim() || "parent";
  const consented = String(formData.get("consent") ?? "") === "on";

  if (!firstName || firstName.length > 30) {
    return { ok: false, error: "Enter your student's first name to continue." };
  }
  const gradeLevel = Number(gradeRaw);
  if (!Number.isInteger(gradeLevel) || gradeLevel < MIN_GRADE || gradeLevel > MAX_GRADE) {
    return { ok: false, error: "Select your student's grade to continue." };
  }
  // S6: fail closed if consent is not affirmatively granted.
  if (!consented) {
    return { ok: false, error: "Please confirm consent to add your student." };
  }

  const service = createServiceClient();

  // 1) Create the child's stable auth identity (Model B). Parent-managed: the
  //    credential is generated server-side and never surfaced; there is NO
  //    child-reachable password reset. email_confirm true so it is usable.
  let childUid: string | null = null;
  try {
    const { data, error } = await service.auth.admin.createUser({
      email: childEmail(),
      password: randomSecret(),
      email_confirm: true,
      app_metadata: { role: "student", provisioned_by: parent.uid },
    });
    if (error || !data.user) return GENERIC_FAIL;
    childUid = data.user.id;
  } catch {
    return GENERIC_FAIL;
  }

  // 2..5) DB writes. On ANY failure, ROLLBACK the orphan auth user (S10) so a
  //        partial failure never strands an unprovisioned identity.
  try {
    // 2) student_profiles (id = child uid).
    const { error: profErr } = await service.from("student_profiles").insert({
      id: childUid,
      display_name: firstName,
      grade_level: gradeLevel,
      sport: "neutral",
      campus_id: null,
      parental_consent_status: "granted",
      parental_consent_updated_at: new Date().toISOString(),
    });
    if (profErr) throw profErr;

    // 3) consent_events (granted) — freezes policy version + scope (S6).
    const { data: ev, error: evErr } = await service
      .from("consent_events")
      .insert({
        student_id: childUid,
        status: "granted",
        method: "online_parent_attestation",
        consented_by_name: parent.name ?? "Parent",
        relationship,
        consent_policy_version: CONSENT_POLICY_VERSION,
        consent_scope: CONSENT_SCOPE,
      })
      .select("id")
      .single();
    if (evErr || !ev) throw evErr ?? new Error("consent event insert failed");

    // 4) parent_student_links (active) + 5) point at the granted event.
    const { error: linkErr } = await service.from("parent_student_links").insert({
      parent_id: parent.uid,
      student_id: childUid,
      relationship,
      status: "active",
      current_consent_event_id: (ev as { id: string }).id,
    });
    if (linkErr) throw linkErr;
  } catch {
    // ROLLBACK (S10): delete the orphan auth user (best-effort) + any partial
    // rows. The link is keyed (parent_id, student_id); profile/consent FK the
    // child uid, so deleting the auth user + child rows is the clean undo.
    await rollbackChild(service, childUid, parent.uid);
    return GENERIC_FAIL;
  }

  redirect("/parent");
}

async function rollbackChild(
  service: ReturnType<typeof createServiceClient>,
  childUid: string | null,
  parentUid: string,
): Promise<void> {
  if (!childUid) return;
  try {
    await service.from("parent_student_links").delete().match({ parent_id: parentUid, student_id: childUid });
  } catch {
    /* best-effort */
  }
  try {
    await service.from("consent_events").delete().eq("student_id", childUid);
  } catch {
    /* best-effort */
  }
  try {
    await service.from("student_profiles").delete().eq("id", childUid);
  } catch {
    /* best-effort */
  }
  try {
    await service.auth.admin.deleteUser(childUid);
  } catch {
    /* best-effort */
  }
}

// ── consent revoke / re-grant (S7) ───────────────────────────────────────────

/**
 * Revoke consent: APPEND a new consent_events row (status='revoked') and repoint
 * the link's current_consent_event_id at it (S7). NEVER mutates the prior event.
 * Also flips the link status to 'revoked' so the relationship renders paused.
 */
export async function revokeConsent(formData: FormData): Promise<void> {
  if (getAuthMode() !== "supabase") return;
  const parent = await getCurrentParent();
  if (!parent) return;
  const childId = String(formData.get("studentId") ?? "");
  if (!childId) return;

  const service = createServiceClient();
  // C-C2: only act on a link the verified parent actually owns.
  if (!(await parentOwnsChild(service, parent.uid, childId))) return;

  try {
    const { data: ev } = await service
      .from("consent_events")
      .insert({
        student_id: childId,
        status: "revoked",
        method: "online_parent_attestation",
        consented_by_name: parent.name ?? "Parent",
        consent_policy_version: CONSENT_POLICY_VERSION,
        consent_scope: CONSENT_SCOPE,
      })
      .select("id")
      .single();
    if (ev) {
      await service
        .from("parent_student_links")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          current_consent_event_id: (ev as { id: string }).id,
        })
        .match({ parent_id: parent.uid, student_id: childId });
      // Dual-consent truth (S7): keep the denormalized profile column IN SYNC with
      // the appended consent_events truth so it can never go stale (FERPA/COPPA
      // hazard). The event remains source of truth; this mirror prevents drift.
      await service
        .from("student_profiles")
        .update({
          parental_consent_status: "revoked",
          parental_consent_updated_at: new Date().toISOString(),
        })
        .eq("id", childId);
    }
  } catch {
    /* calm no-op; the roster reflects the unchanged state */
  }
  redirect("/parent");
}

/**
 * Re-grant consent: APPEND another new consent_events row (status='granted') and
 * repoint the link (S7). Reactivates the link.
 */
export async function regrantConsent(formData: FormData): Promise<void> {
  if (getAuthMode() !== "supabase") return;
  const parent = await getCurrentParent();
  if (!parent) return;
  const childId = String(formData.get("studentId") ?? "");
  if (!childId) return;

  const service = createServiceClient();
  if (!(await parentOwnsChild(service, parent.uid, childId))) return;

  try {
    const { data: ev } = await service
      .from("consent_events")
      .insert({
        student_id: childId,
        status: "granted",
        method: "online_parent_attestation",
        consented_by_name: parent.name ?? "Parent",
        relationship: "parent",
        consent_policy_version: CONSENT_POLICY_VERSION,
        consent_scope: CONSENT_SCOPE,
      })
      .select("id")
      .single();
    if (ev) {
      await service
        .from("parent_student_links")
        .update({
          status: "active",
          revoked_at: null,
          current_consent_event_id: (ev as { id: string }).id,
        })
        .match({ parent_id: parent.uid, student_id: childId });
      // Dual-consent truth (S7): mirror the re-grant onto the profile column so it
      // never contradicts the consent_events truth. Event stays source of truth.
      await service
        .from("student_profiles")
        .update({
          parental_consent_status: "granted",
          parental_consent_updated_at: new Date().toISOString(),
        })
        .eq("id", childId);
    }
  } catch {
    /* calm no-op */
  }
  redirect("/parent");
}

// ── launch & switch (S4, S5) ─────────────────────────────────────────────────

/**
 * Launch a child (S4): BEFORE establishing the session, re-verify the authed
 * parent uid == the link's parent_id AND consent is currently granted, THEN mint
 * the child's session into the SSR cookies (service-role admin link → verifyOtp).
 * NO admin token reaches the client. On success the child lands on their home.
 */
export async function launchChild(formData: FormData): Promise<void> {
  if (getAuthMode() !== "supabase") return;
  const parent = await getCurrentParent();
  if (!parent) return;
  const childId = String(formData.get("studentId") ?? "");
  if (!childId) return;

  const service = createServiceClient();
  // S4: re-verify ownership + currently-granted consent before minting.
  if (!(await parentOwnsChild(service, parent.uid, childId, { requireGranted: true }))) {
    return;
  }

  const ok = await establishChildSession(service, childId);
  if (!ok) return;
  redirect("/student");
}

/**
 * Switch to a different child (S5, P7), PARENT-GATED by password re-entry. ATOMIC
 * ORDER: the OUTGOING child's in-progress attempt is committed/discarded under
 * the OUTGOING session (still live) BEFORE the new session is established — never
 * the reverse (would write the outgoing attempt under the new child).
 *
 * The outgoing attempt flush is a client concern (PracticeFlow persists per
 * attempt already; there is no uncommitted server-held draft), so the binding
 * server obligation is ORDER: verify parent password, THEN sign out the outgoing
 * child session, THEN establish the new one.
 */
export async function switchChild(
  _prev: ProvisionResult | null,
  formData: FormData,
): Promise<ProvisionResult> {
  if (getAuthMode() !== "supabase") return MEMORY_NOTICE;
  const parent = await getCurrentParent();
  if (!parent) return { ok: false, error: "Please sign in again to continue." };

  const childId = String(formData.get("studentId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!childId || !password) {
    return { ok: false, error: "Enter your password to switch students." };
  }

  const service = createServiceClient();
  if (!(await parentOwnsChild(service, parent.uid, childId, { requireGranted: true }))) {
    return GENERIC_FAIL;
  }

  // P7: re-confirm the PARENT via password on a parent surface. Verify against a
  // throwaway client so we do not disturb the live (outgoing) session cookies
  // until the new session is established.
  const parentEmail = await parentEmailFor(service, parent.uid);
  if (!parentEmail) return GENERIC_FAIL;
  const verifier = createServiceClient();
  const { error: pwErr } = await verifier.auth.signInWithPassword({
    email: parentEmail,
    password,
  });
  if (pwErr) {
    return { ok: false, error: "That password doesn't match. Please try again." };
  }

  // S5 ORDER: (1) read the OUTGOING child's access token from the live cookie jar,
  // (2) REVOKE that session server-side via the service-role admin API, (3) mint
  // the new child's session into the SAME cookie jar. Revoke happens AFTER the
  // per-attempt persistence (PracticeFlow has already committed under the outgoing
  // JWT before this parent surface is reached) — no cross-child evidence possible.
  //
  // Server-side revoke (not just cookie overwrite): without it, the outgoing
  // child's still-unexpired access token / refresh token would remain valid to
  // anyone who exfiltrated it. We revoke ALL of the outgoing user's sessions.
  //
  // API CONTRACT (verified against @supabase/supabase-js 2.108.1 / @supabase/
  // auth-js 2.108.1):
  //   service.auth.admin.signOut(jwt: string, scope?: 'global'|'local'|'others')
  //   — `jwt` is a valid logged-in ACCESS TOKEN (JWT) for the user to sign out;
  //   — scope 'global' revokes ALL refresh tokens for that user server-side.
  //   Returns { data: null, error: AuthError | null }.
  // The outgoing access token is read via the cookie-bound SSR client's
  // getSession() BEFORE we overwrite the jar.
  await revokeOutgoingChildSession(service);

  const ok = await establishChildSession(service, childId);
  if (!ok) return GENERIC_FAIL;
  redirect("/student");
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** True when the verified parent owns an active link to the child (optionally requiring granted consent). */
async function parentOwnsChild(
  service: ReturnType<typeof createServiceClient>,
  parentUid: string,
  childId: string,
  opts: { requireGranted?: boolean } = {},
): Promise<boolean> {
  try {
    const { data, error } = await service
      .from("parent_student_links")
      .select("status, consent_events:current_consent_event_id(status)")
      .match({ parent_id: parentUid, student_id: childId })
      .maybeSingle();
    if (error || !data) return false;
    const row = data as { status: string; consent_events: { status: string } | { status: string }[] | null };
    if (row.status !== "active") return false;
    if (!opts.requireGranted) return true;
    const ev = Array.isArray(row.consent_events) ? row.consent_events[0] : row.consent_events;
    return ev?.status === "granted";
  } catch {
    return false;
  }
}

async function parentEmailFor(
  service: ReturnType<typeof createServiceClient>,
  parentUid: string,
): Promise<string | null> {
  try {
    const { data } = await service.auth.admin.getUserById(parentUid);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Revoke the OUTGOING child's session server-side (S5/P7). Reads the live access
 * token from the cookie-bound SSR client, then calls the service-role admin
 * signOut with scope 'global' to invalidate ALL of that user's refresh tokens.
 * Best-effort: a no-session jar (nothing to revoke) or a transient admin error
 * must NOT block the switch — the subsequent cookie overwrite still replaces the
 * outgoing session in this browser. Server-side revoke is the additional, real
 * guarantee on top of the overwrite.
 *
 * API CONTRACT (@supabase/supabase-js 2.108.1 / @supabase/auth-js 2.108.1):
 *   userClient.auth.getSession() → { data: { session: Session | null } } where
 *     Session.access_token is the JWT.
 *   service.auth.admin.signOut(accessToken, 'global') revokes server-side.
 */
async function revokeOutgoingChildSession(
  service: ReturnType<typeof createServiceClient>,
): Promise<void> {
  try {
    const userClient = await createUserClient();
    const { data } = await userClient.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return; // nothing live to revoke
    await service.auth.admin.signOut(accessToken, "global");
  } catch {
    /* best-effort: cookie overwrite (below) still replaces the outgoing session */
  }
}

/**
 * Mint the child's session into the SSR cookie jar (service-role, server-only).
 * Mechanism: generate a magic-link OTP for the child (admin), then verify it on
 * the request-scoped userClient so @supabase/ssr writes the session cookies. The
 * admin token NEVER reaches the client.
 *
 * COOKIE-CONTEXT REQUIREMENT (BLOCKER 2): this MUST run inside a Server Action
 * (launchChild / switchChild are `"use server"` actions). In a Server Action the
 * cookies() store is WRITABLE, so the SSR client's setAll() actually persists the
 * session cookies. The setAll() try/catch in lib/supabase/server.ts only swallows
 * writes in the read-only Server-Component render path; from a Server Action the
 * writes land. Do NOT call establishChildSession from a Server Component.
 *
 * API CONTRACT (verified against @supabase/supabase-js 2.108.1 / @supabase/
 * auth-js 2.108.1):
 *   service.auth.admin.generateLink({ type: 'magiclink', email })
 *     → { data: { properties: { hashed_token } }, error } (GenerateLinkResponse).
 *   userClient.auth.verifyOtp({ token_hash, type: 'email' })
 *     → consumes the hash and, via @supabase/ssr setAll, writes session cookies.
 *     NOTE: verifyOtp type is the EmailOtpType 'email' for a token_hash verify of
 *     a magiclink-generated hash (VerifyTokenHashParams).
 *
 * FAIL-CLOSED (BLOCKER 2c): returns false on ANY failure (no email, generateLink
 * error/missing hash, verifyOtp error, or thrown). Callers (launchChild /
 * switchChild) treat false as a hard stop — the child is NEVER dropped into a
 * broken half-authenticated state; they see the calm interstitial / no redirect.
 *
 * LIVE-VERIFY (BLOCKER 2): the generateLink+verifyOtp mint and the cookie
 * persistence are version-sensitive and CANNOT run in memory mode / the
 * in-process suite. Matt must run a live Supabase integration check to confirm
 * the session cookies actually land and the child reaches /student.
 */
async function establishChildSession(
  service: ReturnType<typeof createServiceClient>,
  childId: string,
): Promise<boolean> {
  try {
    const { data: child } = await service.auth.admin.getUserById(childId);
    const email = child.user?.email;
    if (!email) return false;

    const { data: link, error: linkErr } = await service.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !link.properties?.hashed_token) return false;

    const userClient = await createUserClient();
    const { error: verifyErr } = await userClient.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "email",
    });
    return !verifyErr; // FAIL-CLOSED: any verify error → false → no redirect
  } catch {
    return false;
  }
}

/** A unique, non-deliverable internal email for a parent-managed child identity. */
function childEmail(): string {
  return `child-${crypto.randomUUID()}@students.a3academy.internal`;
}

/** A high-entropy server-only secret for the parent-managed child credential. */
function randomSecret(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}
