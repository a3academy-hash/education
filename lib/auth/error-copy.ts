// Auth error copy + the pure sign-in error mapping (LB1). Lives in /lib (pure,
// unit-testable) and OUT of the "use server" actions module so it can be a plain
// (sync) pure function — and so it falls inside the vitest include (lib/**).
//
// P2 / non-enumeration: the unconfirmed case is the ONLY non-generic branch;
// every other sign-in failure collapses to the generic "doesn't match" copy.

export const GENERIC_SIGNIN_ERROR =
  "That email and password don't match. Please try again.";
export const GENERIC_SIGNUP_ERROR =
  "We couldn't create that account just now. Please try again.";
export const UNCONFIRMED_SIGNIN_MESSAGE =
  "Please confirm your email first. We sent a link to your inbox — open it, then sign in.";

/**
 * Map a Supabase sign-in error → the form message. Matches the unconfirmed
 * account by STABLE CODE (`email_not_confirmed`), falling back to a
 * case-insensitive message check only when no code is present (LB1 L3).
 */
export function mapSignInError(
  err: { code?: string | null; message?: string | null } | null,
): string {
  const isUnconfirmed =
    err?.code === "email_not_confirmed" ||
    (!err?.code && (err?.message ?? "").toLowerCase().includes("not confirmed"));
  return isUnconfirmed ? UNCONFIRMED_SIGNIN_MESSAGE : GENERIC_SIGNIN_ERROR;
}
