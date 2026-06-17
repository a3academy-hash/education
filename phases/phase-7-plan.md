# phase-7-plan.md — Reporting + Compliance (v1, pre-review)

**Plan against:** `new_plan/SECURITY_DB_REPORTING.md` (§3 data classes, §5 VPC ordering, §8 RLS/n≥5,
§11 roles, §12-13 dashboards, §14/§14a NCAA + 70/20/10, §15 subprocessors, §18 roadmap).
**Gate (PLAN.md/GOAL.md):** under-13 flow consent-gated; parent/admin/coach views work; export
generates; NCAA export (CCW + transcript line + administrator statement + disclaimers) + 70/20/10
rubric; n≥5 suppression; server-side grading; audit without PII bodies.

## 0. EXISTS (reuse) vs MISSING (build)

REUSE (schema spine, GENERATED-not-executed, already present): migrations 0001-0006 —
families/guardians(role enum, court_order_flag, dual_consent)/students(dob, age_band,
compliance_path); consents (immutable); data_classes + retention_policies (seeded §3,
attorney_pending); node_mastery/attempts/mastery_updates (append-only); `assert_can_access_student`,
nonce+HMAC `submit_attempt`, `erase_student_operational_data` RPCs; `can_read_raw_evidence` (coach
exclusion). Pure builders: `lib/insight/{roster,flags,decision-timeline}.ts`, `lib/transcript`
(CCSS weakest-link roll-up). UI: `app/parent`, `app/admin/students`, `StaffShell`, `ConsentPill`.

MISSING (build — application layer, pure lib + UI + tests; no SQL execution):
1. **70/20/10 grade model** — none. 2. **Parent dashboard data** (progress ring, grade, 5-10 subject
masteries, proof modules, stuck nodes, export/delete). 3. **Admin/coach reporting** — pace-vs-plan,
intervention severity + next-step, **n≥5 suppression**, coach severity-bands-only. 4. **NCAA export**
(CCW + transcript line + grading scale + time logs + administrator statement + disclaimers).
5. **Subprocessor register** + parent-notice generation. 6. **Onboarding VPC ordering** (telemetry/
interest-graph gated behind consent; pre-consent = parent email + child birth month/year only).

## 1. Grade model — `lib/grade/index.ts` (+ test) — mr-kahn GATED

Pure, versioned. `computeGrade(states, graph, summative?, portfolio?, nowIso)`:
- **70%** locked-mastery fraction = LOCKED mastered nodes / required-scope nodes (locked = §3
  delayed-unseen via the engine `masteredAt`/status — credited diagnostic counts as provisional, NOT
  locked, per §14a + Phase-6 §12 flag). 
- **20%** cumulative proctored/summative — `summative` score when present; **0 + "no summative yet"
  flag** until the summative flow exists (documented, never fabricated — trust-layer rule).
- **10%** portfolio/completion = completion fraction of required scope.
- Effort/time NEVER boosts the grade (CLAUDE §14). Output `{ pct, letter, components{m,s,p},
  gradingScaleVersion, locked, provisionalExcluded, summativePresent }`. Grading scale published/
  frozen (a `GRADING_SCALE` constant + version). **Credit = 1.0 Algebra-1 unit ONLY on full required
  scope + summative + admin approval** → `creditEligible` boolean (false until summative exists).

## 2. Subject-area masteries — `lib/grade/subjects.ts`

Roll up node mastery to the graph's 5-10 domains: per domain {label, masteredLocked, total,
fraction, status band}. Reuses `computeMasteryAll`. Pure.

## 3. Parent dashboard — `app/parent/children/[studentId]/page.tsx` (+ components) — pee-wee GATED

Server component, parent-scoped (`is_parent_of` / memory parent session). Trust register (no
confetti). Renders:
- **Course-progress ring 0-100%** (ProgressRing, labelled distinct from the §3 daily rings).
- **Overall grade 0-100 + letter** (from `lib/grade`); shows "projection" + "no summative yet".
- **5-10 subject masteries** (`lib/grade/subjects`), plain bands.
- **Proof modules** (`components/insight/ProofModule.tsx`): per surfaced node — evidence count,
  provisional vs confirmed, last re-check date, plain-English confidence band ("Why this placement?").
- **Stuck nodes**: plain-English "struggling with {title}" from flags/status.
- **Self-service export** (button → `/parent/children/[studentId]/export` server action → structured
  record; watermarked; in memory mode returns a downloadable JSON/printable view).
- **Self-service delete** (button → confirm modal → "export first" warning → calls erase path; memory
  mode: clears the student's operational rows). Audit-logged (consent_events / record_access_log).

## 4. Admin/teacher + coach reporting — `lib/insight/` extensions + `app/admin` — mr-gates GATED

- **Pace vs plan** (`lib/insight/pace.ts`): course time-budget constant + velocity estimate →
  ahead/on-track/behind + "wasting time" (high time / low gain). Pure.
- **Intervention severity + next-step** (`lib/insight/intervention.ts`): map each FlagEntry kind →
  severity (info/watch/intervention) + a plain-language "what to do next" string. Pure.
- **n≥5 suppression** (`lib/insight/suppression.ts`): any cohort/roster aggregate with cell size < 5
  is suppressed (no per-child exact metric); coach view shows severity BANDS, never raw %/mastery.
  Applied in `buildRoster` output + the admin/coach pages. Pure, tested.
- Coach role: severity-bands + flags only (no raw submissions/transcripts/DOB) — enforced in the
  builder output by role (RLS already excludes coach via `can_read_raw_evidence`; mirror in the app).

## 5. NCAA export + FL portfolio — `lib/ncaa-export/index.ts` (+ test) — mr-kahn + mr-gates GATED

Pure builder → a structured export object (rendered to a printable page / downloadable artifact):
- **Core-Course Worksheet**: learning objectives (node objectives), major topics (graph nodes),
  materials/texts, **time spent** (attempt time aggregate), grading approach (70/20/10 text).
- Versioned **syllabus** (graph version + domain sequence) + **grading scale** (from `lib/grade`).
- **Assessment samples** (representative neutral problems per domain).
- **Time/activity logs** (per-session timeline).
- **Transcript line** (course, grade, credit, completion date).
- **Parent administrator statement** template + **disclaimers** on every export ("Parent/guardian
  administrator responsible for accuracy"; "Generated support package, NOT NCAA approval";
  "Eligibility Center may request more"). Separates "platform-generated evidence" from
  "parent-certified transcript". **MUST-VALIDATE live NCAA toolkit** flagged (not hardcoded-final).

## 6. Subprocessor register — `lib/compliance/subprocessors.ts` (+ data) — mr-gates GATED

Typed register: provider, dataShared, purpose, childData, retention, region, dpaStatus, sccStatus,
securityCommitments, deletionSupport, inParentNotice. Seed the known set (Supabase, Vercel, email,
LLM tutor, analytics, error-logging, payments, storage) with `dpaStatus: "pending"` (launch blocker,
flagged). `parentNoticeSection(register)` → the plain-language sharing notice (only inParentNotice).

## 7. Onboarding VPC ordering (§5)

Verify + (if needed) guard: the interest-graph sampler + telemetry must not run before consent for an
under-13 `compliance_path`. Add a pure `consentGate(student)` → may-collect-telemetry boolean; the
onboarding flow checks it. Pre-consent collects only parent email + child birth month/year (already
the provision-flow shape). If already correct, document as verified.

## 8. Files
**Create:** `lib/grade/{index,subjects}.ts` (+tests), `lib/insight/{pace,intervention,suppression}.ts`
(+tests), `lib/ncaa-export/index.ts` (+test), `lib/compliance/subprocessors.ts` (+data/test),
`app/parent/children/[studentId]/page.tsx` + `export/route` or action,
`components/insight/ProofModule.tsx`, `app/admin/.../` reporting additions, `phases/phase-7-*`.
**Modify:** `lib/insight/roster.ts` (suppression+pace+severity), `app/admin/students/page.tsx` +
`[studentId]/page.tsx`, `app/parent/page.tsx` (link to child dashboard), `types/{insight,compliance}.ts`.

## 9. Verify
tsc clean; tests green (> 817); contrast 39/39; build green; grade/NCAA/suppression unit-tested;
parent dashboard + admin reporting render; export generates a structured artifact. Map → GOAL
reporting+compliance checkboxes.

## 10. Deferred (SHIP gates, not build gates — GOAL non-negotiable #6; logged)
- SQL execution (human runs migrations); DPAs execution + SOC2 + pen test (§18 Phase 4);
  VPC method final ratification + MFA on sensitive actions (attorney-pending §5/§19);
  FERPA read-audit wiring (binding B12, interaction layer); summative-assessment intake (grade 20%
  component is 0 + flagged until built); tutor-transcript tokenization (§10, AI-tutor phase).
  All marked ATTORNEY-PENDING / launch-gated, built configurable with documented defaults.

---

# §V2 REVISIONS (binding — supersede v1; from phase-7-review.md). All ADOPTED.

**R1 Locked-from-provenance.** `lib/grade` 70% numerator = nodes locked-BY-TRANSFER, read from the
immutable `MasteryUpdate[]`: a node counts iff its latest mastered-making update has trigger `attempt`
(earned P3 transfer); nodes whose only mastered-making update is `diagnostic`/`credit-propagation`
(provisional placement) are EXCLUDED. Output `provisionalExcluded: string[]` (excluded ids, auditable).
NEVER read "locked" from `status` alone.

**R2 Credit-bearing denominator.** Import `isCreditBearingCode`/`creditTier` from `lib/transcript`
(single source); 70% + 10% denominator = `algebra1-credit` (HS-category) nodes only — prerequisite-review
excluded. 10% portfolio counts nodes with REAL work-product evidence (attempts/lesson progress), never
diagnostic-credit-only.

**R3 FERPA labels.** Output + UI: "Projected course grade — for the parent-administrator's reference; A3
does not issue grades or credit." `summativePresent:false` → primary numeral labeled "Projected", letter
grade suppressed/grey. The disclaimer string rides `computeGrade` output AND the NCAA grade line. NCAA
export reads `creditEligible` and refuses a credit-bearing transcript line when false.

**R4 n≥5 in the builder, cohort-only.** Suppression lives in `lib/insight/suppression.ts` + the banded
builder return (typed in `types/insight.ts`); it takes COHORT cell counts. EXEMPT: single-student
authorized reads — a parent viewing their own child, the `/admin/students/[id]` detail, the student
themselves, AND a coach's own assigned-roster per-child severity bands (§11). `buildRoster` gains a
REQUIRED `role` input so coach-banding can't be omitted. Logged SHIP-gate: RLS bands only RAW evidence —
the app builder is the SOLE projection-channel defense until a follow-up coach-banding migration.

**R5 Memory-mode export/delete.** Export builds a REAL artifact from in-memory data. Delete =
anonymize-in-place: a scoped `A3Repository.eraseOperationalData(studentId)` whose in-memory impl sets
`response='[erased]'` (append-only preserved — NO row delete). The server action: (a) verifies authz
(parent-of / `assert_can_access`), (b) generates the export FIRST, (c) only then erases — ordering
enforced in the action, not just a UI warning. Audit row carries NO PII:
`{actorId, actorRole, studentId, recordType:'operational_erase'}`.

**R6 Server-side grading.** `computeGrade` runs only in server components/actions; NO `lib/grade` import
in any `"use client"` module; the grade is rendered, never shipped as client state. Named acceptance
criterion + a grep check.

**R7 Severity band.** `lib/insight/intervention.ts` derives a DISPLAY band `on-track|watch|intervention`
(green `--color-status-mastered` / amber `--color-retrieval` / rose `--color-error`) from `FlagEntry.kind`
— `FlagEntry.severity` (`info|attention`) UNCHANGED. New `components/insight/SeverityPill.tsx` (7px dot +
MANDATORY text label, never color-only). Coach card leads with the amber/rose count + the single "what to
do next" string.

**R8 Stuck nodes.** Surface the failing transfer dimension when the engine read exposes it; if not
available this phase, show "struggling with {title}" and DOCUMENT the downgrade (don't silently drop
CLAUDE §13).

**R9 Proof modules.** Plain-English band: "Confirmed" / "Likely solid" / "Still proving it"; the numeric
posterior/CI only on hover/expand. "Confirmed" tooltip = "passed an unseen re-check after a delay".

**R10 NCAA pure builder + static snapshot.** The builder is pure over a STATIC field-map; the export
artifact carries a visible "field mapping not yet validated against the live NCAA Homeschool Toolkit"
flag; live-toolkit validation is a deferred MUST-VALIDATE. Time-on-task appears in the seat-time/activity
section ONLY, never as a grade input.

**R11 ParentShell + ProgressRing + multi-course-ready.** The parent child-dashboard is wrapped in
`ParentShell`; the course-progress ring is `ProgressRing` (NOT MasteryRing); the data shape is keyed by
enrollment (list-ready) though only Algebra 1 exists in v1. Subprocessor `parentNoticeSection` emits only
`inParentNotice` entries and never leaks `dpaStatus`/`securityCommitments`. `lib/grade/subjects` accepts
already-computed `computeMasteryAll` results (no recompute). consentGate targets the
preference-sampler/telemetry surface; if none exists pre-consent, document "verified".

**R12 Gate vs deferred (explicit).** BUILT this phase (gate artifacts): NCAA export, 70/20/10 grade,
server-side grading, audit-without-PII, consent-gated onboarding, parent/admin/coach views, n≥5.
DEFERRED as SHIP gates (GOAL #6, not build gates): SQL execution; DPA execution; SOC2/pen-test; VPC-method
final ratification + MFA on sensitive actions; FERPA read-audit WIRING (B12); summative-assessment INTAKE
(20% = 0 + `summativePresent:false` until built). Built configurable, documented defaults, ATTORNEY-PENDING.

**Tests (R13):** unit tests for `computeGrade` (provenance exclusion, denominator, summative-zero,
creditEligible), `subjects`, `suppression` (n<5 → suppressed; single-student exempt), `intervention`
(kind→band), `ncaa-export` (creditEligible refusal, disclaimers), `subprocessors` (notice filter). Keep
total > 817.
