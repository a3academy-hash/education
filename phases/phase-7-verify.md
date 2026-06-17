# phase-7-verify.md — Reporting + Compliance acceptance

**Result: PASS** (build-and-test level; compliance items are SHIP gates, GOAL #6). 856 tests, tsc clean,
contrast 39/39, build green (20 routes incl. `/parent/children/[studentId]`).

## Gate (PLAN.md/GOAL.md reporting+compliance)
| Acceptance | Evidence | Status |
|------------|----------|--------|
| Parent dashboard works | `app/parent/children/[studentId]/page.tsx` (ParentShell, parent-scoped, parentOwnsChild authz + FERPA read-audit seam): course-progress ProgressRing, **projected** grade (letter suppressed while no summative + FERPA disclaimer), 5-10 subject masteries, proof modules ("Confirmed/Likely solid/Still proving it"), stuck nodes, export + anonymize-delete | ✅ |
| 70/20/10 grade, server-side | `lib/grade` — 70% locked-BY-TRANSFER (MasteryUpdate trigger provenance; diagnostic-credit excluded → `provisionalExcluded`), 20% summative (0 + `summativePresent:false`), 10% real-work-product portfolio; credit-bearing denominator (lib/transcript). NO `lib/grade` import in any client module (grep-verified) | ✅ |
| creditEligible correct | `summativePresent && full credit-bearing scope locked` (codex credit-before-complete fix) — partial completion never exports full credit | ✅ |
| NCAA export generates | `lib/ncaa-export` — CCW (objectives/topics/materials/seat-time/grading-approach), versioned syllabus + grading scale, assessment samples, time logs, transcript line (null when `!creditEligible`), administrator statement, 3 disclaimers, "not validated vs live toolkit" flag, platform-evidence vs parent-certified split | ✅ |
| Admin/teacher + coach + n≥5 | `lib/insight/{suppression,intervention,pace}` + `roster.ts` (required `role`; coach banded — no exact status/title); `SeverityPill` (on-track/watch/intervention, never color-only); cohort n≥5 suppression (single-student authorized reads exempt) | ✅ |
| Subprocessor register | `lib/compliance/subprocessors.ts` — typed register (dpaStatus "pending" launch-blocker), `parentNoticeSection` filters `inParentNotice`, no dpaStatus/securityCommitments leak | ✅ |
| VPC onboarding ordering | `lib/compliance/consent-gate.ts` `consentGate`; VERIFIED no pre-consent telemetry/sampler surface exists; provision flow fails-closed without consent | ✅ |
| Audit without PII | erase + read-audit rows = `{actorId, actorRole, studentId, recordType}`, no bodies; append-only preserved (anonymize-in-place `response='[erased]'`) | ✅ |
| Build + tests | 856 (was 817; +39); tsc clean; contrast 39/39; build green | ✅ |

## Loop artifacts
phase-7-plan.md (v1+§V2) · review · decisions · simulation n/a · this file. Gates: mr-kahn
(grade/NCAA/FERPA, APPROVE-WITH-CHANGES, all adopted), mr-gates (compliance, plan 3-blockers +
diff 2-blockers, all adopted), pee-wee (dashboards, APPROVE-WITH-CHANGES), Codex plan informed+cold
(2 blocking) + diff (1 blocking + 2 high). Trail `.codexreview/reviews/2026-06-16-phase7-reporting/`.

## Diff-review fixes applied
- Supabase `eraseOperationalData`: service client + `p_student`/`p_reason` (was userClient + `p_student_id`,
  would fail at runtime — mr-gates/Codex blocker).
- `creditEligible` = summative AND full-scope-locked (Codex credit-before-complete).
- Parent child-dashboard FERPA read-audit seam added (Codex parent-record-unaudited).
- RosterRow `<a>`→`<Link>` (build lint gate).

## Deferred — SHIP gates (GOAL #6, ATTORNEY-PENDING; built configurable, documented defaults)
SQL execution (human runs migrations); DPA execution + SOC2 + pen test; VPC method final ratification +
MFA on sensitive actions; FERPA read-audit WIRING across all surfaces (B12; seam added on the parent
record page); summative-assessment INTAKE (20%=0 until built); coach projection-channel RLS banding
migration (app builder is the sole defense until then — logged in suppression.ts/roster.ts headers);
tutor-transcript tokenization (§10). All `ATTORNEY-PENDING` / launch-gated, never build-gated.

## Matt checkpoints (carried): posterior constants (Phase 6); §12 diagnostic credit-status; grade
thresholds (70/20/10 weights + grading scale) + retention timers + VPC method — confirm with counsel.
