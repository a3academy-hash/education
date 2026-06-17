// lib/compliance/consent-gate — the VPC ordering gate (§5, R11). PURE: no IO, no
// Date.now().
//
// COPPA §5 ordering: NO learning telemetry, free-text profile, interest graph, or
// persistent behavioral tracking may run for an under-13 student BEFORE verifiable
// parental consent is granted. Pre-consent we collect only parent email + child
// birth month/year. This gate is the single pure predicate any future
// preference-sampler / telemetry surface MUST check before collecting.
//
// VERIFIED (R11, 2026-06-16): there is NO pre-consent telemetry or
// preference-sampler surface in the current app. The onboarding flow
// (app/student/onboarding) runs INSIDE an already-consented, parent-provisioned
// session — the parent grants consent at provisioning (app/parent/actions.ts
// provisionChild writes a granted consent_event), and the child's name/grade/sport
// selection is a personalization choice within that consented session, not
// pre-consent behavioral telemetry. This gate therefore guards a not-yet-built
// surface; it is added now so the contract exists before any such surface ships.

import type { StudentProfile } from "../../types";

/**
 * May the platform collect learning telemetry / run the interest-graph sampler
 * for this student? TRUE only when parental consent is currently granted. PURE.
 *
 * Any telemetry/preference-sampler surface MUST gate on this; a non-granted
 * (pending/revoked) consent state returns false → collect nothing beyond the
 * pre-consent minimum (§5).
 */
export function consentGate(student: Pick<StudentProfile, "parentalConsent">): boolean {
  return student.parentalConsent.status === "granted";
}
