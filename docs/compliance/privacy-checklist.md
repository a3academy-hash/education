# Privacy Checklist — EXECUTED (Phase 5 §G)

This is an **executed** checklist, not an aspirational one. Each item below was
verified against the codebase at Phase 5 and records the result. Re-run on any
change that adds a student-facing surface, a third-party script, or a new
free-text input.

- **Course:** Algebra 1 · **Audience:** middle-school (largely under 13 → COPPA)
- **Verified at:** Phase 5 (graph schema v1.7.1)
- **Scope of scan:** `app/` (student routes: `app/student/**`; shared
  `app/layout.tsx`).

---

## 1. No third-party trackers in student surfaces — VERIFIED (zero hits)

Scanned `app/` for the common tracker/analytics signatures:
`gtag`, `googletagmanager`, `google-analytics`, `segment`, `mixpanel`,
`hotjar`, `fbq`/facebook, `posthog`, `amplitude`, `window.analytics`,
`.track(`, `navigator.sendBeacon`.

**Result: zero real hits.** The only matches are UI identifiers / comments —
`GradeSegmented` (an onboarding component) and a "segments" comment in
`DiagnosticFlow.tsx`. These are not trackers. mr-gates and mr-kahn independently
scanned and reached the same conclusion; this Phase-5 re-scan confirms it.

Also scanned student routes for any outbound network surface
(`fetch(`, `axios`, `XMLHttpRequest`, `new Image(`, `<iframe`, `<script`):
**zero hits.** Student surfaces make no client-side third-party requests.

**Fonts:** `app/layout.tsx` self-hosts Fraunces / Hanken Grotesk / Spline Mono
via `next/font` (no runtime request to Google Fonts) — the documented MANDATORY
DEVIATION §F-1 for the COPPA posture. Confirmed still self-hosted.

**Dev/internal surfaces** (`app/dev/graph`, `app/dev/transcript`,
`app/dev/messages`, `app/dev/gallery`) all `notFound()` in production
(`process.env.NODE_ENV === "production"`), so none of them ship to a student
bundle. The transcript/message dev surfaces render sample (fictional) data only.

## 2. PII minimization — VERIFIED

- The **only** student-facing PII is `StudentProfile.displayName`, which is
  **first-name-only by policy** (typed comment in `types/student.ts`; mirrored
  by the `display_name` COPPA comment + check intent in the migration). No
  surname, email, address, or DOB is collected on the student.
- `StudentAttempt.response` is **math-only** (numeric / expression / choice /
  coordinate / inequality answers — see `types/problem.ts` `AnswerSpec`). It is
  not a free-text channel. The migration comments this on `student_attempts.response`.
- **Flag for re-review:** if any future surface adds a free-text student input
  (open-response answers, profile bio, message composition from the student
  side), this checklist item MUST be re-evaluated for PII/COPPA exposure before
  it ships. `Message.body` (NCAA interaction) is the first place free text can
  enter; in Phase 5 it is dev-only sample data with no send wiring.

## 3. COPPA parental-consent placeholder — PRESENT

- `StudentProfile.parentalConsent { status; updatedAt }` and the migration's
  `student_profiles.parental_consent_status` / `parental_consent_updated_at`
  carry the consent state.
- `ConsentEvent` (`types/compliance.ts`) + `consent_events` (append-only) give
  a tamper-evident consent **audit trail** (every transition is a new row).
- The onboarding flow carries the consent placeholder posture; verifiable-consent
  **method** is deliberately left as `string | null` pending counsel (see §5).

## 4. FERPA-aligned record handling — STUBBED

- `RecordAccessLog` (`types/compliance.ts`) + `record_access_log` (append-only)
  are the read-audit stub: who read which student record, when. Shape only in
  Phase 5; not wired.
- RLS in the migration enforces **own-record** access for students and
  **staff-by-campus** access for teachers (the NCAA "teacher access to student
  work" pillar), via pinned `SECURITY DEFINER` helpers — the access-control spine
  FERPA record handling depends on.

## 5. NEEDS-COUNSEL flags (do not self-certify)

These are explicitly NOT resolved in-engineering and require legal/compliance
counsel before the corresponding surface is wired:

1. **COPPA verifiable-consent method** — `ConsentEvent.method` / `consent_events.method`.
   Which mechanisms (credit-card check, signed form, school-as-agent) satisfy
   verifiable parental consent for this audience.
2. **School-consent-as-agent** — whether a partner school/academy may provide
   consent on the parent's behalf (and the records that must back it).
3. **State privacy statutes** — state-level student-data-privacy laws beyond
   COPPA/FERPA (the `standards.state` field is the placeholder; statute mapping
   is counsel's call).
4. **Current NCAA nontraditional-course checklist** — confirm the live NCAA
   requirements (defined timeframe, regular interaction, teacher access, scope &
   sequence) against the current published checklist before any NCAA claim.
