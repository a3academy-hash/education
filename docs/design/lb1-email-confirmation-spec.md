# LB1 — Handle email confirmation in the parent auth flow — Design Spec

Status: DRAFT for gate review (pee-wee — the "confirm your email" state + sign-in copy;
mr-gates — auth-flow correctness / no-session handling). Production launch blocker: email
confirmation was turned OFF for live testing (a COPPA/security gap — anyone could register
an unowned email as a "parent"). Re-enabling it is Matt's Supabase dashboard action; this
spec makes the APP correct for that posture (today it assumes an immediate session at
signup, so it would bounce when confirmation is on). Implement after gates (standing
autonomy). Supabase mode only (memory mode signUp already returns UNAVAILABLE).

## The problem
`app/auth/actions.ts` `signUp`: calls `auth.signUp({email,password})`, then
`ensureParentProfile(uid)`, then `redirect("/parent")` — it ASSUMES a session exists. With
"Confirm email" ON, `auth.signUp` returns `data.user` but **`data.session === null`** (no
session until the emailed link is clicked). So the redirect to `/parent` lands with no
session → `getCurrentParent()` is null → bounce to sign-in, with no explanation. The user
is stuck and never learns to check their email.

`signIn`: with confirmation ON, signing in before confirming returns a Supabase
"Email not confirmed" error; today it collapses to the generic "email and password don't
match," which misdirects a legitimate parent who just needs to click the link.

## Design
1. **signUp — detect the no-session (confirmation-pending) path:**
   After a successful `auth.signUp`, if `!data.session` → the account needs email
   confirmation. Still run `ensureParentProfile(uid, displayName)` (it uses the SERVICE
   client, so it works WITHOUT a session — and creating parent_profiles now means that when
   the parent later confirms + signs in, the 0005 hook immediately mints role=parent, no
   bounce). Then **return a pending-confirmation result instead of redirecting**:
   `{ ok: true, pendingConfirmation: true }` (extend `AuthResult` with an optional
   `pendingConfirmation?: boolean`). If `data.session` exists (confirmation OFF) → keep
   today's behavior: ensureParentProfile → `redirect("/parent")`.
2. **AuthForm (client) — render the confirmation state:** when the signUp action returns
   `pendingConfirmation`, replace the form with a calm "check your email" panel:
   "We sent a confirmation link to {email}. Open it to finish setting up your family
   account, then sign in." A quiet link back to /auth/sign-in. No auto-redirect, no polling.
   pee-wee directs the exact copy/treatment.
3. **signIn — handle the unconfirmed error:** map the Supabase "Email not confirmed" error
   to a clear-but-bounded message: "Please confirm your email first — check your inbox for
   the link we sent." (All OTHER failures keep the generic non-enumerating
   "email and password don't match.") pee-wee + mr-gates: rule whether surfacing
   "confirm your email" is acceptable (it tells someone who supplied that email that it's
   registered-but-unconfirmed — low enumeration risk, big UX win for a real parent) vs
   staying fully generic.

## Out of scope / Matt's dashboard actions (note, don't build)
- Flip "Confirm email" ON in Supabase Auth → Providers → Email.
- Configure Site URL + redirect URLs + the confirmation email template so the link returns
  to the app. (No code; Supabase project config.)
- COPPA consent-method counsel item remains separate.

## Tests
- Memory mode unaffected (signUp returns UNAVAILABLE) — 663 stay green.
- The supabase signUp/signIn branches are live-only (like the rest of auth) — verified in a
  Matt-run check after the dashboard toggle. Add a small unit test only if a pure seam
  exists (e.g. mapping the unconfirmed-error → message); otherwise assert via reading.

## Invariants
- No engine/evidence/RLS change. Auth-flow + one client UI state only. No new dependency,
  no SQL. ensureParentProfile stays service-role (works pre-confirmation). getClaims/Model B
  unchanged.

## Gates
- **pee-wee**: the "confirm your email" state (calm, premium, parent register; no dead-end),
  the back-to-sign-in affordance, and the sign-in "confirm your email first" copy.
- **mr-gates**: the no-session detection in signUp (don't redirect when session is null),
  ensureParentProfile-without-session correctness (service-role), the AuthResult extension,
  the unconfirmed-error mapping, and that nothing weakens the existing generic-error /
  non-enumeration posture beyond the deliberate unconfirmed hint.

Verdict: APPROVE | APPROVE WITH CHANGES | REJECT.

---

## GATE RESOLUTIONS — BINDING (supersedes conflicting text above)
pee-wee APPROVE WITH NOTES · mr-gates APPROVE WITH CHANGES (3 should + 2 nit), aligned.
Implement to this section. Supabase mode only; memory signUp stays UNAVAILABLE (663 green).

### actions.ts — signUp (mr-gates 2/3)
L1. Capture `data.session` from `auth.signUp` (today only `data.user` is read). Keep the
    existing `ensureParentProfile` try/catch (service-role, session-independent — confirmed
    it works pre-confirmation, so parent_profiles lands at signup → no first-signin bounce).
    Then: `if (!data.session) return { ok: true, pendingConfirmation: true };`
    `redirect("/parent");` — the `return` is fine inside or after the try, but `redirect()`
    MUST stay OUTSIDE any try (it throws NEXT_REDIRECT; never swallow it).
L2. `AuthResult` += `pendingConfirmation?: boolean`. Do NOT add `email` to AuthResult
    (mr-gates nit 4) — the client renders the email from its own input (L5).

### actions.ts — signIn (mr-gates 1, pee-wee 2)
L3. Map the unconfirmed error by STABLE CODE: `error.code === "email_not_confirmed"`
    (fallback to a case-insensitive message check only if `code` is absent) →
    `{ ok: false, error: "Please confirm your email first. We sent a link to your inbox — open it, then sign in." }`.
    ALL other failures keep the generic non-enumerating "That email and password don't
    match. Please try again." (specific unconfirmed copy approved — bounded enumeration,
    big UX win.)

### AuthForm.tsx — confirmation-pending panel (pee-wee 1, mr-gates nit 4)
L4. When the signUp action result has `pendingConfirmation`, REPLACE the form with a calm
    panel (reuse tokens; fade-in; NO primary button; NO auto-redirect/polling). Keep the
    existing "A3 Academy · Family" eyebrow. Content:
    - Heading (font-display ~23px semibold): **"Check your email"**
    - Body (text-[14px] ink-500): **"We sent a confirmation link to the address below. Open
      it to finish setting up your family account, then come back and sign in."**
    - `InsetPanel` label **"SENT TO"** + the email (ink-700).
    - Reassurance (text-[13px] ink-500): **"The link can take a minute to arrive. If you
      don't see it, check your spam folder."**
    - Footer (centered, existing link style): **"Already confirmed?"** + accent link
      **"Sign in"** → /auth/sign-in.
L5. The panel needs the submitted email → make the email input **controlled** (useState) so
    AuthForm has it to render "SENT TO {email}". (Not via AuthResult.) sign-up form only;
    sign-in form unaffected in behavior.

### Confirmed-link landing (pee-wee 3.1)
L6. The Supabase confirmation link returns the parent to the app confirmed-but-not-signed-in.
    The **sign-in page** reads a `?confirmed=1` search param → renders a calm one-time banner
    above the form (InsetPanel / success tone, NOT error AlertPanel): **"Your email is
    confirmed. Sign in to continue."** (Matt configures the Supabase redirect URL to
    /auth/sign-in?confirmed=1 — dashboard; the code reads the param.)

### Deferred (note, don't build) — pee-wee 3.2/3.3, mr-gates nit 5
L7. No "resend link" in v1 (rate-limit/abuse surface). Re-signup with the same unconfirmed
    email: confirm the null-session branch returns `pendingConfirmation` (Supabase resends),
    NOT GENERIC_SIGNUP_ERROR — verify the existing error/null-data branch doesn't swallow
    "user exists, unconfirmed" into a generic failure. ensureParentProfile failure on the
    pending path self-heals on retry (idempotent upsert) — intentional.

### Matt's dashboard actions (out of code scope)
Flip "Confirm email" ON; set Site URL + redirect to /auth/sign-in?confirmed=1 + the email
template.

### Tests / invariants
Memory unaffected (UNAVAILABLE) — 663 green. Supabase signUp/signIn branches live-only
(Matt-run check after the toggle). No engine/RLS/SQL/dep change; getClaims/Model B untouched.
