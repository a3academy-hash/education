"use server";

// Auth server actions (C2 P2) — parent account sign-in / sign-up / sign-out via
// Supabase Auth (@supabase/ssr). MEMORY mode has no Supabase Auth (S11): these
// actions short-circuit to a calm "not available" result rather than throwing on
// missing env, so the dev/test path never touches Supabase.
//
// SECURITY: the SSR userClient persists the session through cookies (the
// createServerClient setAll path). NO service-role key is touched here. Error
// copy is GENERIC — never reveal whether an email exists (P2).
//
// On a successful PARENT sign-in/up we ENSURE a parent_profiles row keyed by the
// auth uid (C-C2: parent_profiles.id == auth.uid()) using the service client,
// idempotently — this is the one server-side write that backs is_parent_of.

import { redirect } from "next/navigation";
import { getAuthMode } from "../../lib/auth/mode";
import { createClient as createUserClient } from "../../lib/supabase/server";
import { createServiceClient } from "../../lib/supabase/service";
import {
  GENERIC_SIGNIN_ERROR,
  GENERIC_SIGNUP_ERROR,
  mapSignInError,
} from "../../lib/auth/error-copy";

export interface AuthResult {
  ok: boolean;
  /** Generic, non-enumerating error copy for the form (P2). */
  error?: string;
  /**
   * Set when signUp succeeded but the account needs email confirmation
   * (Supabase "Confirm email" ON → no session yet). The client renders a
   * "check your email" panel instead of redirecting (LB1).
   */
  pendingConfirmation?: boolean;
}

const UNAVAILABLE: AuthResult = {
  ok: false,
  error: "Parent accounts are not available in this environment.",
};
function readCredentials(formData: FormData): { email: string; password: string } {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

/** Ensure a parent_profiles row exists for the authed parent (C-C2, idempotent). */
async function ensureParentProfile(uid: string, displayName: string): Promise<void> {
  const service = createServiceClient();
  // Idempotent upsert keyed by the auth uid (= parent_profiles.id). Never
  // overwrites an existing display_name with a blank.
  await service
    .from("parent_profiles")
    .upsert(
      { id: uid, display_name: displayName || "Parent" },
      { onConflict: "id", ignoreDuplicates: true },
    );
}

export async function signIn(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  if (getAuthMode() !== "supabase") return UNAVAILABLE;

  const { email, password } = readCredentials(formData);
  if (!email || !password) return { ok: false, error: GENERIC_SIGNIN_ERROR };

  try {
    const userClient = await createUserClient();
    const { data, error } = await userClient.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: mapSignInError(error) };
    if (!data.user) return { ok: false, error: GENERIC_SIGNIN_ERROR };
  } catch {
    return { ok: false, error: GENERIC_SIGNIN_ERROR };
  }

  // Post-auth routing (one-child zero-friction) is decided by /parent's loader
  // (P6); land there.
  redirect("/parent");
}

export async function signUp(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  if (getAuthMode() !== "supabase") return UNAVAILABLE;

  const { email, password } = readCredentials(formData);
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!email || !password) return { ok: false, error: GENERIC_SIGNUP_ERROR };
  if (password.length < 8) {
    return { ok: false, error: "Choose a password with at least 8 characters." };
  }

  let uid: string | null = null;
  // null session ⇒ "Confirm email" is ON: auth.signUp returns data.user but no
  // session until the emailed link is clicked. A created-but-unconfirmed user
  // still populates data.user (incl. on re-signup of the same unconfirmed
  // email — Supabase resends), so it reaches this branch, NOT the generic error
  // (LB1 L1/L7).
  let needsConfirmation = false;
  try {
    const userClient = await createUserClient();
    const { data, error } = await userClient.auth.signUp({ email, password });
    if (error || !data.user) return { ok: false, error: GENERIC_SIGNUP_ERROR };
    uid = data.user.id;
    needsConfirmation = !data.session;
  } catch {
    return { ok: false, error: GENERIC_SIGNUP_ERROR };
  }

  try {
    // Service-role write — session-independent, so it lands even on the
    // pending-confirmation path (so the 0005 hook mints role=parent on first
    // sign-in, no bounce). Idempotent upsert ⇒ self-heals on retry.
    if (uid) await ensureParentProfile(uid, displayName);
  } catch {
    // Profile-ensure failure is non-fatal to the auth record; the next sign-in
    // re-attempts (idempotent). Surface a calm retry rather than a stack.
    return { ok: false, error: GENERIC_SIGNUP_ERROR };
  }

  // redirect() MUST stay outside any try (it throws NEXT_REDIRECT — never
  // swallow). Confirmation-pending ⇒ no session to land with: return the
  // pending result so the client shows "check your email" (LB1 L1).
  if (needsConfirmation) return { ok: true, pendingConfirmation: true };
  redirect("/parent");
}

export async function signOut(): Promise<void> {
  if (getAuthMode() === "supabase") {
    try {
      const userClient = await createUserClient();
      await userClient.auth.signOut();
    } catch {
      // Swallow — sign-out is best-effort; we redirect regardless.
    }
  }
  redirect("/auth/sign-in");
}
