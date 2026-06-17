# phase-7-review.md — Adversarial review (Reporting + Compliance plan v1)

Reviewers: **mr-kahn** (grade/NCAA/FERPA — APPROVE WITH CHANGES), **mr-gates** (compliance/RLS/arch —
APPROVE WITH CHANGES, 3 blockers), **pee-wee** (dashboards — APPROVE WITH CHANGES), **Codex
informed+cold** (2 blocking + highs). Strong convergence. Trail: `.codexreview/reviews/2026-06-16-phase7-reporting/`.

## Convergent findings (deduped)
1. **[BLOCKING] "Locked" ≠ `status`** (mr-kahn1, codex locked-provisional): diagnostic-credited AND
   transfer-earned both end `status="mastered"`. The 70% must read the immutable **MasteryUpdate
   provenance** — locked-by-transfer = trigger `attempt`; provisional = `diagnostic`/`credit-propagation`
   with no later attempt confirmation. Excluded ids in `provisionalExcluded` (auditable, §14a).
2. **70% denominator = DERIVED credit-bearing set** (mr-kahn2): reuse `lib/transcript`
   `isCreditBearingCode`/`creditTier` (HS-category A-/F-/N-/S-/G-), NOT all 74 nodes; prerequisite-review
   excluded. 10% uses the SAME denominator + real work-product, NOT diagnostic-credit (mr-kahn3).
3. **FERPA labeling** (mr-kahn4, pee-wee1): parent number = "Projected course grade — for the
   parent-administrator's reference; A3 does not issue grades or credit"; letter suppressed/grey while
   no summative; disclaimer rides `lib/grade` output + the NCAA grade line; export refuses a
   credit-bearing transcript line when `creditEligible=false` (mr-gates8).
4. **[BLOCKING] n≥5 in the BUILDER, cohort-only** (mr-gates B1, codex suppression-scope, pee-wee6):
   banded `RosterRow`; suppression takes cohort cell counts; single-student authorized reads (parent's
   own child, admin detail, student self) + a coach's OWN-roster per-child severity bands EXEMPT (§11).
   Pass `staff.role` into `buildRoster` (required). **Coach RLS gap:** RLS bands only RAW evidence — the
   app builder is the SOLE defense for the projection channel → flag a SHIP-gate follow-up migration.
5. **[BLOCKING] Memory-mode export/delete** (mr-gates B2, codex memory-mode/authz): in-memory repo is
   append-only (no erase; audit no-op). Delete = anonymize-in-place (`response='[erased]'`) via a scoped
   repo method, NOT row delete; export-then-delete enforced IN THE ACTION; authz verifies parent-of /
   `assert_can_access` before erase; audit row carries NO PII (`{actorId,actorRole,studentId,recordType}`).
6. **[BLOCKING] Server-side grading** (mr-gates B3): grade computed server-side; no `lib/grade` import in
   any `"use client"`; named acceptance criterion.
7. **Severity vocabulary** (pee-wee5,7,9): display band `on-track|watch|intervention` (green/amber/rose,
   STYLE_GUIDE §8.5) derived in `lib/insight/intervention.ts`, leaving `FlagEntry.severity`
   (`info|attention`) untouched. New `SeverityPill` (dot+label, `--status-mastered`/`--retrieval`/`--error`
   tokens), NEVER color-only. Coach view leads with amber/rose count + the single next action (pee-wee6).
8. **Stuck nodes = failing transfer dimension** (pee-wee3, CLAUDE §13); if unavailable this phase,
   downgrade explicitly + document.
9. **Proof modules plain-English** (pee-wee4): "Confirmed / Likely solid / Still proving it"; numeric on
   hover only; "Confirmed" = "passed an unseen re-check after a delay".
10. **NCAA: pure builder over a STATIC field-map snapshot** (codex ncaa-live): export carries "field
    mapping not yet validated against live NCAA Homeschool Toolkit" flag; live-toolkit validation deferred
    MUST-VALIDATE. Time-on-task in the seat-time section ONLY, never a grade input (mr-kahn note).
11. **Gate vs deferred boundary** (codex gate-deferred-contradiction): the BUILD delivers all gate
    artifacts (NCAA export, 70/20/10, server-grading, audit-no-PII, consent-gating); DEFERRED = SQL
    execution, DPA execution, SOC2/pentest, VPC-method final ratification + MFA, FERPA read-audit WIRING,
    summative INTAKE — all SHIP gates (GOAL #6), not build gates. State explicitly.
12. ParentShell wraps the parent dashboard; ProgressRing for the course ring; multi-course shape
    list-ready, single course v1 (pee-wee2,8). Subprocessor notice filters `inParentNotice`, no
    `dpaStatus` leak (mr-gates5). `subjects` accepts pre-computed mastery results (mr-gates perf). Tests
    for suppression/severity/grade/ncaa (mr-gates9). consentGate targets the sampler/telemetry surface;
    if none exists, document "verified" (mr-gates6).

**Rebut:** codex-cold `repo-premises-unverified` — premises (spine, RPCs, builders) verified by the
repo-aware reviewers (mr-kahn/mr-gates/codex-informed). Not a real defect; cold-seal artifact.

Single most-fatal (consensus): #1 — reading "locked" from `status` would compute every accelerated
student's grade from unconfirmed placement (the exact §14a / CLAUDE §3 failure). Fixed in v2.
