# Phase 11 — Workstream C2 — Parent-Held Auth UI — Design Spec

Status: DRAFT for gate review (pee-wee PRIMARY — family-facing auth surface, full quality
bar; mr-gates — auth wiring/session/middleware/security; mr-kahn — consent/COPPA fidelity).
Keep-moving: gate → implement → mr-gates diff → commit. Auth = MODEL B (Matt ruled): stable
parent-provisioned student identity. Builds on C1 (clients, SupabaseRepository, 0005 hook).

Constraint: memory-mode (REPOSITORY_BACKEND=memory, default) must keep working for
dev/tests — the existing cookie-based student flow stays as the dev/offline path. The parent
auth surface activates in supabase mode. All 623 tests stay green.

---

## Routes (new parent area, OUTSIDE student (shell))
- `/auth/sign-in`, `/auth/sign-up` — parent account (Supabase Auth email/password via
  @supabase/ssr). Calm, white, premium register. Parent-only — children never see these.
- `/parent` — parent dashboard: child roster, provision-new-child, consent management, launch.
- `/parent/children/new` — provision a child (creates student identity, Model B).
- Middleware (`middleware.ts`): the @supabase/ssr session-refresh pattern; gate `/parent/*`
  to authenticated parents; gate student `(shell)` to an active child session.

## Model B provisioning flow (the heart)
1. Parent signs up / signs in (Supabase Auth). On first sign-in, ensure a `parent_profiles`
   row with `id = auth.uid()` (C-C2 forge-prevention: parent_profiles.id == auth uid).
2. Parent provisions a child (`/parent/children/new`, server action, service-role):
   - creates the child's stable auth identity (Supabase Admin createUser — Model B),
   - inserts `student_profiles` (id = child auth uid), `parent_student_links`
     (parent_id, student_id, status active), and a `consent_events` row capturing
     `consent_policy_version` + `consent_scope` (what the parent is consenting to) — sets
     `current_consent_event_id`.
   - The child credential is PARENT-MANAGED — presented as a profile, NEVER "your account";
     NO child-reachable password reset (pee-wee caveat, binding).
3. Launch a child: parent picks a child → server action establishes the child's session
   (Model B: signs into the child identity). Active-student indicator shows "Working as
   {name}." Switching child is PARENT-GATED (re-confirm parent), and ends the prior child's
   working context cleanly (commit/discard the in-progress attempt under the CORRECT child).

## pee-wee C-U1 requirements (binding)
- **Active-student indicator** always visible in the shell ("Working as Maya").
- **One-child family = zero friction**: sign in → auto-select the single consented child → work.
- **Consent states are distinct**: "Ready once a parent finishes setup" (pending, never
  granted) vs "Access paused — a parent can re-grant" (revoked). Calm, non-accusatory; a
  child must never feel blamed. Re-grant reachable from the same screen, returns to context.
- **Auth errors/expiry**: a CHILD must NEVER see a raw auth error/401/stack. Session expiry
  mid-practice preserves in-progress work and degrades to a calm "let's get a parent to sign
  back in," returning to the exact problem. No auth machinery (token/JWT/session) on child
  surfaces.
- Parent surfaces: standard calm form-level errors; "no children yet" → calm onboarding
  empty state ("Add your first student to begin").

## Memory-mode fallback (dev/tests)
- In memory mode, the existing `STUDENT_COOKIE` onboarding flow REMAINS the path (no
  Supabase Auth required to run the app locally / in tests). The parent area + Supabase Auth
  activate only in supabase mode. A single `getAuthMode()` seam decides which.
- All 623 existing tests stay green (memory; no auth).

## Security (mr-gates)
- Session via @supabase/ssr cookies; middleware refresh. Parent routes require an
  authenticated parent; student shell requires an active child session whose `student_id`
  claim is set by hook 0005. No client ever holds the service-role key (C1 guard stands).
- Child provisioning is service-role (server action only); verifies the caller's authed uid
  == parent_profiles.id it links from (C-C2). A parent can only provision/launch children
  they have a consented link to.
- No PII in URLs (child selected by opaque id in a server action, not a query string).

## Gates requested
- **pee-wee**: the whole family flow — signup/sign-in register, provisioning, child-select,
  active-student indicator, consent-paused vs not-yet-granted, child-never-sees-auth-error,
  one-child zero-friction. Full quality bar (paying families).
- **mr-gates**: middleware/session security, the service-role provisioning boundary, the
  memory-mode fallback seam (no regression to the cookie flow / tests), route protection,
  forge-prevention.
- **mr-kahn**: consent capture fidelity (policy_version + scope recorded; revocation
  honored; COPPA consent is specific not a boolean) and that no student evidence path is
  altered by the auth layer.

Verdict: APPROVE | APPROVE WITH CHANGES (list) | REJECT (reason).

---

## GATE RESOLUTIONS — BINDING (supersedes conflicting text above)

pee-wee APPROVE WITH NOTES (7) · mr-gates APPROVE WITH CHANGES (4 blocker + 4 should + 3
nit) · mr-kahn APPROVE WITH CHANGES (4). No rejections, no conflicts. Law for mr-grunt.

### Identity seam (mr-gates B1/B2/B3 — the security heart)
S1. **`getCurrentStudentId()` seam** (server-only): memory mode → reads STUDENT_COOKIE
   (UNCHANGED, tests green); supabase mode → reads the VERIFIED `student_id` claim via
   `userClient.auth.getUser()` (server-verified, NEVER the raw cookie). Route ALL nine
   student call sites through it (layout, page, diagnostic page+actions, summary, learn,
   progress, practice page+actions). This is the gated migration scope.
S2. Middleware is UX REDIRECTION ONLY (send unauthenticated → sign-in). The binding
   guarantee is RLS (keyed on JWT) + every server component/action independently resolving
   identity server-side and FAILING CLOSED if absent. Middleware is never the sole gate.
S3. `getAuthMode()` DERIVES from `REPOSITORY_BACKEND` (one source of truth; assert equal /
   fail-closed). No independent AUTH_MODE env.

### Launch / session (mr-gates B4/S1)
S4. "Launch a child" = a server-side action that, BEFORE establishing the session,
   re-verifies authed parent uid == parent_student_links.parent_id AND is_parent_of(childId)
   (consent granted). Mechanism: service-role admin session-mint for the child identity,
   cookies written via @supabase/ssr; NO admin token to the client. Child credential is
   parent-managed (no child password reset).
S5. Child-switch ATOMICITY: flush/discard the in-progress attempt under the OUTGOING child's
   session (old JWT live) and only THEN establish the new session (invalidate prior
   server-side). Never set the new session first (would write the outgoing attempt under the
   new child = uncorrectable cross-child evidence).

### Consent (mr-kahn 1/2/3/4 + mr-gates S2/S3)
S6. Provisioning consent write (service-role — parent isn't the student, so RLS own-insert
   is bypassed): insert consent_events `status='granted'` with `consent_policy_version` +
   `consent_scope` + `consented_by_name`/`relationship`; set
   parent_student_links.current_consent_event_id. Fail closed if any required field missing.
S7. Revocation = NEW append-only consent_events row `status='revoked'` (own policy_version/
   scope) + repoint current_consent_event_id. NEVER mutate/delete the prior event. Re-grant
   = another new event. Consent truth is the pointer only (no independent link flag).
S8. PRE-CONSENT EVIDENCE INVARIANT (state + enforce): a child with no current `granted`
   consent has NO active session → CANNOT create student_attempts/mastery_updates. No
   evidence before consent. Enforced server-side in getCurrentStudentId/shell load, not just
   a banner (S2 mr-gates): if the active child's link is revoked/pending, shell server
   components refuse to load practice/evidence surfaces.
S9. Mid-session revocation: middleware + server-side identity resolution RE-CHECK consent
   each request; a revocation degrades to the consent-paused state at the next request
   (Model B; honest about token latency — no claim of instant token kill).

### Provisioning robustness (mr-gates S4)
S10. createUser + student_profiles + parent_student_links + consent_events must be
   rollback/cleanup-on-failure + idempotent (createUser isn't transactional with DB writes;
   a partial failure must not strand an orphan auth identity → role='unprovisioned').

### UX / IA (pee-wee 1–7) — binding
P1. **`ParentShell`** (new, mirror StaffShell): accent square, "A3 ACADEMY · FAMILY", nav
   "Students" + parent identity + Sign out. NEVER renders alongside an active child session.
   `/auth/*` pages get NO shell — centered single column max 420.
P2. `/auth/sign-in|sign-up`: centered 420 Card, 22–24px heading (not 30px H1), Input(text)
   for email+password, primary `w-full` allowed INSIDE the auth card only. Calm onboarding
   voice, no exclamations/AI/ampersands. Generic "email and password don't match" (never
   reveal email existence). AlertPanel for server error; Input errorText for field. Enter
   submits, autofocus email.
P3. `/parent`: ParentShell + PageHeader (eyebrow FAMILY). Roster = VERTICAL STACK of child
   rows (compact Card each: avatar + name + grade + ConsentPill + one primary action), NOT
   a grid. Page primary "Add a student" in header. NO progress/analytics, no ranking/sort
   by progress (sort by name/order). Empty state "Add your first student to begin."
P4. **`ConsentPill`** (NEW — do NOT extend the MasteryStatus-typed StatusPill): same
   7px-dot+label grammar, neutral palette, three values: Active / Setup not finished /
   Access paused.
P5. `/parent/children/new`: two steps — (a) child profile (mirror onboarding IdentityStep:
   first name + grade) (b) consent. Consent step RENDERS consent_scope as a legible list in
   an InsetPanel (what data, why, who sees it) + the literal consent_policy_version in quiet
   ink-500. Real checkbox, NOT pre-checked, full-sentence guardian label; primary disabled
   until checked. Calm non-celebratory confirm → back to /parent.
P6. **Active-student indicator** in the student AppShell ("Working as Maya" + initials),
   visible every student screen, NOT auth chrome (no "session/logged in"). One-child
   zero-friction: parent sign-in with exactly one Active child auto-establishes that session
   → student home (skip /parent); reach dashboard via a quiet parent-gated "Manage students".
P7. Switching child is PARENT-GATED via parent PASSWORD re-entry (PIN is a future option) on
   a parent-register surface (never inside the child's learning context); clean interstitial
   "Save Maya's progress and switch?" → new child lands on THEIR home (S5 order).
P8. **Child expiry interstitial**: full-canvas, student register, `Card` DEFAULT tone (NOT
   error), "Let's get a grown-up to sign back in." + single primary "Get a parent." Child
   NEVER sees 401/"session"/"token"/stack. Preserves in-progress work; on re-auth returns to
   the EXACT problem with work intact. Silent token refresh is invisible (no spinner on the
   common case); interstitial only on genuine refresh failure. Reduced-motion fade.

### Memory-mode safety (mr-gates N3)
S11. In memory mode, `/parent/*` and `/auth/*` render a calm "not available in this mode"
   (or notFound) rather than throwing on missing Supabase env. The existing cookie onboarding
   flow remains the dev/test path. All 623 tests stay green.

### Components
NEW: ParentShell, ConsentPill, Working-as indicator (in AppShell), child expiry interstitial.
REUSE: Card, Button, Input, PageHeader, InsetPanel, AlertPanel, LabeledSection, avatar
treatment, IdentityStep pattern. Do NOT reuse StatusPill for consent; child expiry uses
default tone, not error.

### Counsel flag (carry)
COPPA consent METHOD remains jurisdiction-specific (0001 NEEDS COUNSEL). The UI must not
imply a method is legally sufficient until counsel-verified.
