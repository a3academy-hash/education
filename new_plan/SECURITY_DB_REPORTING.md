# SECURITY_DB_REPORTING.md — A3 Course: Identity, Security, Compliance & Reporting

**Version:** v0.2 (post board-review: Claude / Grok / ChatGPT)
**Companion to:** CLAUDE.md (course), DIAGNOSTIC.md, STYLE_GUIDE.md.
**Stack:** React 19 + Vite + Supabase (Postgres, RLS, RPC), Vercel.
> *Stack adjudication (ADR-0001, 2026-06-15): React-19 host = **Next.js App Router**; "Vite"
> superseded as a default. Every privileged mutation stays a Postgres `SECURITY DEFINER` RPC with
> `assert_can_access_student`; server actions are thin auth wrappers. See
> `docs/adr/0001-stack-next-over-vite.md`.*
**Delivered as a HOMESCHOOL CREDIT.** Parent is the homeschool administrator of record.

> **ATTORNEY-PENDING:** every legal value here (consent method, retention timers, FERPA stance,
> grade rubric) is a defensible working position from adversarial review, NOT legal advice. An
> ed-privacy attorney must ratify the VPC method and retention policy before a single under-13
> record is collected.

---

## 0. What v0.2 changed + the one cross-doc dependency

The board converged hard: both external reviewers independently ranked **retention-vs-deletion
as the #1 fatal issue**, both caught the **small-roster re-identification leak**, both flagged
**VPC + missing written policies as a legal blocker**, and both produced **near-identical RLS
threat models.** v0.2 folds in the reconciled, concrete artifacts.

> **CRITICAL CROSS-DOC DEPENDENCY (new):** **Verifiable parental consent must complete BEFORE any
> telemetry or the interest-graph onboarding runs.** That means CLAUDE.md's first interaction
> ("declare your interests," §4) is GATED behind VPC for under-13s. Pre-consent we collect only
> parent email + child birth month/year — nothing else (§5). CLAUDE.md's onboarding sequence
> must be edited to reflect this ordering.

**Architectural lock:** the data-class + retention policy (§3) is **Phase 0 — it gates the
schema.** You cannot design the data model before deciding which records are deletable vs.
preservable vs. anonymizable, or you will over-retain illegally or destroy records parents need.

---

## 1. Compliance posture

- **COPPA (amended rule, in effect since 2025):** applies to every under-13 student. A3 has
  **actual knowledge** of under-13 users (we collect birthdate) and is a **mixed-audience**
  service, so full COPPA protections apply. VPC before collection/use/disclosure; parental
  access + deletion rights; data minimization; written retention policy with deletion timeframe;
  written information-security program + annual assessment + designated owner; separate opt-in
  consent for any third-party advertising disclosure.
- **Simplifying commitment: NO third-party advertising disclosure, ever.** (Removes the highest-
  risk COPPA surface; matches the no-loot-box ethic, STYLE_GUIDE §5.)
- **FERPA: see the explicit operating-model statement, §7.** "Clean" is not assumed.
- **State homeschool law (Florida first):** notice of intent, annual evaluation options, and a
  parent-maintained portfolio (logs + samples) preserved ~2 years. Export must be FL-aware (§14).

---

## 2. Phase 0 gating sequence (build order is a compliance control)

1. **Data classes + retention policy (§3)** — FIRST. Gates the schema.
2. **COPPA compliance matrix + VPC flow + notices (§4-5).**
3. **Identity/guardian model + RLS + threat-model patterns (§6, §8).**
4. **Written InfoSec program, incident-response, breach-notification, subprocessor DPAs (§15).**
Only after these do learning features, telemetry, or the interest graph turn on.

---

## 3. Data classes & retention/deletion policy (LOCKED working policy)

**Principle:** COPPA deletion wins for operational child data; parent-authorized preservation
wins only for a minimal transcript record. On deletion we **export first, then delete** — the
parent becomes custodian of their child's academic record.

**Data classes:** identity/PII; consent records; learning telemetry; raw submissions; tutor
transcripts; grades/transcript records; audit logs; payment records; exports; backups.

| Class | Retention | Deletion behavior |
|-------|-----------|-------------------|
| **Operational child PII** (login, telemetry, raw attempts, tutor transcripts, session logs) | Min necessary while enrolled | Deleted/irreversibly anonymized **within 30 days** of verified parent request (sooner unless active security/legal hold) |
| **Academic record** (course title, completion date, credit, final grade, grading scale, versioned syllabus, standards map, evidence summary) | **7 years** after completion **only if parent elects** transcript/NCAA preservation | Parent may export anytime; on delete, we **generate + deliver the full export package first**, then delete the platform copy |
| **Florida portfolio support** (activity logs, work samples) | Provided as export + optional storage, **>=2 yrs** | A3 is NOT the official custodian — the duty is the parent's; we provide export, not pretense |
| **Consent + deletion-request audit** | Minimal, retained for legal defensibility | Never store raw child learning data inside consent/audit logs |
| **Anonymized analytics** | Indefinite ONLY if irreversibly de-identified (no re-identification path) | n/a |

**Deletion-with-warning:** when a parent requests deletion of academic records, deliver the
NCAA/transcript export first and warn: "Deleting this may limit future NCAA / transcript
support." No indefinite retention of identifiable child PII, ever.

---

## 4. COPPA compliance matrix (maintain as a living artifact)

For every data element collected, record: **data category | purpose | child-facing collection
point | subprocessor(s) touched | retention period | deletion/anonymization method | parent
access path | parent deletion path.** Plus program-level: **direct-notice content, online-notice
content, VPC method, designated security owner, annual-assessment date, incident-response owner,
notice_version (immutable).**

- **Direct notice (to parent):** what we collect, purposes, retention, parental rights,
  third-party sharing (state "none for advertising"), how to consent.
- **Online notice (privacy policy):** prominent, linked at every child-facing collection point.
- **Expanded PII categories** (per amended rule): treat government IDs + biometric identifiers
  as PII — and **do not collect them for children** (default: none).

---

## 5. COPPA VPC flow (method selected)

1. **Pre-consent age screen collects ONLY:** parent email + child birth month/year (DOB only if
   strictly necessary). **No learning telemetry, no free-text profile, NO interest graph, no
   persistent behavioral tracking** before VPC. (This is the gate on CLAUDE.md onboarding.)
2. Parent creates + verifies their own account; sees direct notice + online notice.
3. **VPC method (v1):**
   - **Primary:** signed electronic consent form with parent identity verification + billing/
     payment-account match.
   - **Fallback:** uploaded signed form reviewed by an admin.
   - **Avoid** child voice/photo/biometric age checks. (KBA is permissible per the amended rule
     but treat as secondary; `MUST-VALIDATE` final method with counsel.)
4. Consent type, method, notice_version, timestamp logged immutably.
5. Parent rights are self-service: **access** (export child's data) and **delete** (per §3).
6. Data minimization: participation never conditioned on extra PII.

---

## 6. Identity & guardian model

- **Parent/guardian root; child is a transparent sub-account** the parent creates and can always
  see into. Child never has a standalone account.
- **Guardian roles (not a single "parent"):** `education_admin`, `billing_parent`,
  `view_only_guardian`, `restricted_guardian`. Plus a **court-order flag**, optional
  **dual-consent** requirement, an **access-dispute freeze** workflow, and a **manual
  verification path** before releasing records. (Custody disputes are common and legally
  dangerous; unilateral deletion or processing without required consents creates liability.)
- **Age-up (12 -> 13) workflow:** keep the parent dashboard by homeschool role; switch the
  compliance branch from COPPA-child to teen-minor; send the parent a status-change notice;
  **never erase the consent audit trail**; do not expand data use without renewed notice.
- **18+ workflow:** convert to an adult-learner account; require adult consent to keep sharing
  progress with parent/A3; preserve previously authorized academic records; allow the adult to
  **authorize the parent as transcript administrator** for NCAA/homeschool export.

---

## 7. FERPA operating-model statement (write it down, hold the line)

"Clean" is not assumed — FERPA re-engages if A3 starts functioning like an education-record
keeper. Stated model:
- **The parent is the school administrator of record.**
- **A3 is the curriculum / software / content + AI-tutor provider** — not the school.
- **A3 does NOT issue an official transcript** unless the legal model changes.
- **If A3 staff ever grade, approve credit, or issue transcripts**, FERPA + state private/
  umbrella-school rules must be re-reviewed BEFORE doing so. (Directly constrains the human-in-
  the-loop teacher role: a teacher who *advises* is fine; a teacher who *grants credit* may
  change A3's regulatory status. Strategic fork — decide deliberately.)

---

## 8. Database & infrastructure security (RLS threat model)

RLS is necessary but NOT sufficient. Required, enforced patterns:
- Every table carries `family_id` + `student_id`; RLS scopes rows to the caller's family.
- **Every privileged RPC takes an explicit `student_id` and calls `assert_can_access_student
  (auth.uid(), student_id)` first** — never trusts a client-supplied `family_id`.
- **Every `SECURITY DEFINER` function:** sets `search_path` explicitly, re-checks ownership from
  the JWT claim, returns empty on mismatch, uses **no dynamic SQL on user input**.
- **Views:** `security_invoker = true`.
- **Storage:** private buckets, object paths scoped by family/student, **short-TTL signed URLs**
  (no guessable public export URLs), storage RLS.
- **Service-role key:** server-only, never in the client bundle or logs, per-environment, rotated
  (30-90 days), usage monitored. Used only in backend jobs, never user-invokable generic queries.
- **Aggregates (the inference channel):** minimum cell size **n >= 5**; suppress outliers; coarse
  severity bands, not exact per-child mastery, in any roster view.
- **CI:** automated RLS policy tests + static analysis so a future migration can't silently open
  a hole.
- **Audit logs (must not become the soft PII copy):** store actor ID, subject student ID, action,
  resource, timestamp, IP/device hash. **NEVER** raw answer text, tutor transcript bodies, or
  parent notes. Retention separate from learning data.
- **break-glass super_admin:** even A3 super_admin uses just-in-time access with a **reason
  code** + audit review; no unlogged browsing of child records.
- Auth: **MFA mandatory** for admin/teacher/coach AND for parent **sensitive actions** (export,
  deletion, account changes) + re-auth + email alerts. Device anomaly detection.

---

## 9. Answer-submission integrity

- **Never trust the client for grading.** Client receives display data only — **never the
  solution object or full render spec**.
- **Per served item:** one-time attempt nonce + short TTL + **HMAC over (session_id, item_id,
  item_version, params_hash, attempt_nonce)**; server validates signature + that the item_version
  matches the one served this session before grading.
- **Server-side attempt state machine** + max attempts per item; randomized params resolved
  server-side only.
- **No answer-validation endpoint distinguishable from the submission endpoint** (defeats probing).
- **Locked mastery requires delayed, unseen confirmation** (CLAUDE §3) — defeats replay +
  memorization. Anomaly scoring, not just rate limits.

---

## 10. Tutor-transcript governance (PII, not exhaust)

LLM tutor transcripts contain student responses + identifiable misconception patterns -> they are
COPPA personal information.
- **Redact/tokenize PII before persisting**; log only **structured misconception tags +
  session_id** for analytics.
- Same retention/deletion rules as raw submissions (§3).
- **Prompt-injection hardening:** input sanitization + output filtering on the tutor path.
- **No training use** by the model provider; minimal context; advisory-only (CLAUDE §8); covered
  by a DPA (§15).

---

## 11. Roles & permissions (RBAC + RLS)

| Role | Sees | Hard limits |
|------|------|-------------|
| **super_admin** (A3) | Everything (break-glass, reason-coded, audited) | No unlogged access |
| **admin / teacher** | Assigned students' mastery/pace/flags | Re-review FERPA if they grant credit (§7) |
| **coach** | **Roster-scoped, need-to-know** severity bands + flags | **No raw submissions, no tutor transcripts, no DOB/address, no parent contact unless authorized**; audited; revocable per course |
| **parent/guardian** | Own children, by guardian role (§6) | Other families; system admin |
| **student** | Own surfaces + own progress | Others' data |

Enforced at RLS, not just UI.

---

## 12-13. Reporting & parent dashboard

- **Admin/teacher:** mastery (locked vs. provisional + transfer dims), **pace vs. plan**
  (ahead/on-track/behind; flags "wasting time" = high time/low gain), time-on-task + effort (NOT
  the mastery measure, CLAUDE §14), intervention severity + **"what to do next"**, cohort views
  under the **n>=5 suppression** rule.
- **Coach:** roster snapshots, coarse severity bands only (per §8/§11).
- **Parent dashboard (trust register, no confetti):** all enrolled courses; **Course-Progress
  ring 0-100%** (explicitly labeled distinct from STYLE_GUIDE daily Focus/Mastery/Retrieval
  effort rings); overall mastery/grade 0-100 (§14a); **5-10 subject-area masteries**; plain-
  English mastered vs. struggling with stuck nodes named; proof modules (evidence count,
  provisional vs. confirmed, last re-check, confidence band); self-service export + delete.
- **Report exports:** watermarked, download-audited, **no emailed child-level CSV** unless
  encrypted/authenticated download.

---

## 14. NCAA homeschool export + grade model

**Verdict from board: FIX (not rebuild).** Export a parent-submittable package; A3 generates,
parent (administrator of record) certifies + submits.

**Export must include:** Core-Course Worksheet content (learning objectives; major topics =
knowledge-graph nodes; materials/texts; **time spent**; grading approach), versioned **syllabus**,
**grading scale**, **assessment samples**, **time/activity logs**, transcript line (grade, credit,
completion date), and a parent **administrator statement** template.
- **Separate "platform-generated evidence" from "parent-certified transcript."**
- **Disclaimers on every export:** "Parent/guardian administrator is responsible for accuracy";
  "Generated support package, NOT NCAA approval"; "Eligibility Center may request more."
- **Classify A3 accurately:** parent-administered homeschool course **supported by a third-party
  platform + AI tutor + content authoring** — do not over-claim "parent only." (Over-claiming
  risks eligibility denial.)
- `MUST-VALIDATE`: pull the **live NCAA Homeschool Toolkit at build time** and map every field
  exactly; do not hardcode from memory.

### 14a. Mastery -> grade/credit model (published, versioned)
A purely mastery-derived grade is not transcript-defensible alone. Published rubric:
- **70%** locked mastery across required Algebra 1 standards (delayed-unseen, transfer-gated).
- **20%** cumulative **proctored/locked** assessment(s).
- **10%** portfolio / completion artifacts.
- **Effort/time NEVER boosts the grade** (CLAUDE §14) but documents credit/seat-time.
- **Publish the grading scale BEFORE the course begins**; preserve item/test versions behind the
  final grade.
- **Credit:** Algebra 1 = **1.0 unit only after full required scope + final cumulative assessment
  + administrator approval.** Partial completion **cannot** export as full Algebra 1 credit.
- The grade is a documented projection of the mastery model, reconcilable with the delayed-unseen
  measure — not a separate black-box number.

---

## 15. Subprocessor register + agreements (was entirely omitted)

Maintain a register; every entry: **provider | data shared | purpose | child data? | retention |
region | DPA/SCC status | security commitments | deletion support | included in parent notice?**
Covers at minimum: **Supabase, Vercel, email, analytics, error logging, the LLM tutor provider,
payment processor, file storage.** **DPAs / sub-processor flow-downs are required** (COPPA +
state law) and are a **launch blocker** — paperwork with every vendor that touches child data.

---

## 16. Data model (sketch; RLS + family_id + student_id on every table)

`families`, `guardians` (role enum, court_order_flag), `students` (dob, age_band,
compliance_path), `consents` (type, method, notice_version, granted/revoked — immutable),
`data_classes` + `retention_policies` (purpose, timeframe, deletion_method), `enrollments`,
`courses` (subject_clusters, ncaa_objectives, syllabus_version, grading_scale_version),
`node_mastery`, `time_logs`, `submissions` (item_version, graded_server_side, hmac),
`tutor_turns` (misconception_tag, session_id — no raw PII body), `grades` (mastery_pct,
components_70_20_10, mapped_grade, credit, completion_date), `reports`/`ncaa_exports`,
`subprocessors`, `audit_log` (append-only, no PII bodies), `roles`.

---

## 17. Compliance regimes now covered (previously omitted)

Florida homeschool law (notice of intent, annual evaluation, 2-yr portfolio); other-state
homeschool variances; **ADA / WCAG / Section 504** for the whole public app (esp. constructed-
response, coordinate-plane, graphing); **state privacy laws** (FL, CA, CO, CT, UT, VA...) +
**SOPIPA** if CA students; **DPAs/subprocessors** (§15); **state breach-notification** (FL has
its own timelines); **international/GDPR/UK-GDPR/PIPEDA** if non-US users; **PCI** if card-based
VPC/billing; a **records amendment/dispute** process (parent/student challenges a grade or
transcript field); **AI governance** (provider data-use limits, hallucination audit, child-data
minimization).

---

## 18. Build roadmap
- **Phase 0:** §2 gating sequence — data classes + retention, COPPA matrix + VPC + notices,
  identity/guardian + RLS patterns + threat-model controls, InfoSec/IR/breach/DPAs.
- **Phase 1:** parent dashboard MVD (multi-course, progress ring, overall + 5-10 subject mastery,
  proof modules, export + delete self-service).
- **Phase 2:** admin/teacher + coach reporting (pace vs. plan, severity + next-step, n>=5 cohorts).
- **Phase 3:** NCAA export + 70/20/10 grade rubric + FL homeschool export; validate vs. live
  toolkit + FL law.
- **Phase 4:** enterprise hardening (annual assessment, SOC 2 readiness, pen test, full DPA review).

---

## 19. Remaining assumptions / attorney-pending
1. Final VPC method (signed-form + billing match) satisfies the amended rule for a mixed-audience,
   actual-knowledge platform — confirm with counsel.
2. Retention timers (30-day operational / 7-yr elected academic / 2-yr FL portfolio) are correct
   for COPPA + FL + NCAA look-back — confirm with counsel.
3. The FERPA operating-model statement holds as long as A3 staff do not grant credit.
4. n>=5 suppression is sufficient against re-identification in small academy rosters.
5. The 70/20/10 grade model is defensible to NCAA reviewers + colleges.
6. RLS + the threat-model patterns fully isolate families (CI tests + pen test will verify).
7. DPAs with all subprocessors (incl. the LLM provider, no-training-use) are executable before
   launch.
