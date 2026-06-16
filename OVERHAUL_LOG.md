# OVERHAUL_LOG.md — A3 v0.2 Full Overhaul (self-driving)

Continuous, resumable record of the self-driving overhaul defined by `new_plan/` (binding specs:
GOAL.md, PLAN.md, CLAUDE.md, DIAGNOSTIC.md, AI_ADAPTIVE.md, STYLE_GUIDE.md,
SECURITY_DB_REPORTING.md). Loop = plan → adversarial review (codexreview / Codex) → autonomous
adjudication → execute → verify → log → advance. Branch: `overhaul/v0.2` (v0.1 preserved on
`master`). Every committed code diff also goes through codexreview (bugs/errors/security, no
overengineering).

Started: 2026-06-15.

---

## Phase status
- [x] **Phase 0 — AUDIT** — DONE. AUDIT.md (10 domains, normalized severity). Loop artifacts in
  phases/phase-0-*. Codex methodology review added domains D8 (diagnostic-flow), D9 (a11y), D10
  (telemetry). Single most-fatal: D5 engine split + in-session mastery lock.
- [x] **Phase 1 — The Spine** — DONE (gate met at buildable/reviewed level; commits 5ef8036,
  18a7c2a, b3f0d97). 0006 migration (5-round security-reviewed, clean) + rls_overhaul_deny.sql +
  lib/engine-loop (717 tests). Stack = Next.js (ADR-0001). Deferred (logged): full family-tenancy
  policy sweep + graph reconciliation -> Phase 2; submit_attempt client wiring -> Phase 4.
- [x] **Phase 2 — Item-bank remediation** — DONE. Snapshot + honest certification pipeline
  (lib/item-certification) + 100% tagging (equivalenceClass + calculatorFlag on all 4,588) + the
  live-bank round-trip gate (0 flagged). 0 TRUE within-bucket dups (audit's "33 exact" were
  cross-bucket coverage). 4,123 structural families. 735 tests. codexreview rescoped it honestly
  (no prose-CAS, no destructive deletion, flag-don't-fabricate). misconceptionMap 283 gaps flagged
  for authoring.
- [x] **Phase 3 — Adaptive engine** — DONE (module-level D5 closed). lib/engine-v2: BKT (closed-form)
  + FSRS retention (clamped; massed success = 0 durability) + no-double-count interaction + airtight
  delayed/unseen lock gate (perfect in-session NEVER locks) + single-step DAG propagation + graded
  cold-start. 22 tests; 757 total. codexreview specified the exact math (7 plan concerns) + fixed the
  per-dimension count (1 code concern). LIVE CUTOVER (wire engine-v2, retire v0.1 in-session lock) = Phase 4.
- [~] **Phase 4 — Interactivity + speed** — PARTIAL (both BLOCKING concerns closed + tested).
  lib/atoms (predict→resolve typed invariant, 6 tests) + lib/engine-v2/session.ts (D5 cutover:
  updateNode never locks; evaluateLock takes DelayedCheck[] only; firewall test: 20 perfect
  in-session attempts don't lock). 767 tests. **CONTINUATION (do next):** lib/engine-v2/selector.ts
  (contract adjudicated in round-1.claude.json) + worked-example UI cutover (wire StepReveal/
  LearnClient advance to canAdvance, remove the exampleSeen/'read through' bypasses) — see
  phase-4-verify.md.
- [ ] Phase 5 — Visual system (one instrument system, AA contrast, rings, baseball-native)
- [ ] Phase 6 — Diagnostic (multistage routing, 4 labels, seed write)
- [ ] Phase 7 — Reporting + compliance (VPC, dashboards, NCAA export, 70/20/10)
- [ ] Phase 8 — Engagement guardrails + motivation
- [ ] Phase 9 — Full verification (prove DONE)

## RESUME POINT (next context window — continue here, unbroken)
Phases 0-3 COMPLETE; Phase 4 ~80% (atoms + D5 session cutover + selector done; commits 121f4a7,
29ec0c6). Branch overhaul/v0.2, 12 commits, 774 tests green, tsc clean. Continue in order:
1. **Finish Phase 4:** worked-example UI cutover — extract a pure `canStartPractice` gate; wire
   StepReveal/LearnClient "Start practice" to `lib/atoms` canAdvance; REMOVE the bypasses
   (LearnClient exampleSeen-on-any-pointer/key ~:484-497; the "I've read through" shortcut ~:287-290;
   the :136 unlock). Verify live via chrome-devtools (no jsdom). Then phase-4 full PASS.
2. **Phase 5 — Visual system** (STYLE_GUIDE): tokens resolve-by-surface (on-light/on-dark), dark
   Focus canvas #0B0F17, 3 rings (Focus/Mastery+gold-cap/Retrieval dashed) hue+icon+pattern+ARIA,
   baseball instrumentation, fonts (Source Serif 4 + Plex Sans + Plex Mono), mode indicator, AA
   contrast audit. (AUDIT D6 ~15-20% compliant.)
3. **Phase 6 — Diagnostic** (DIAGNOSTIC.md): multistage routing + posterior/SEM stop + 4 labels +
   seed write + the simulation. (AUDIT D8; build the diag_items bank — D3.1.)
4. **Phase 7 — Reporting + compliance** (SECURITY): VPC flow UI + ordering, parent/admin/coach
   dashboards (n>=5), NCAA export + 70/20/10, finish the family-tenancy policy sweep + read-audit
   wiring (D7.6-D7.10 ship-gates).
5. **Phase 8 — Engagement guardrails** (AI_ADAPTIVE §8): success band live, review cap, fast-but-
   fragile flag, retained-mastery surfacing, Training/Boost mode.
6. **Phase 9 — Full verification:** every GOAL checkbox + perf/contrast/dedup/solver/a11y/e2e reports.
Every code commit through codexreview (security pass on anything privileged). Loop, don't halt.

## Standing decisions (autonomous, logged)
- **Branch strategy:** work on `overhaul/v0.2`; `master` keeps the v0.1 baseline as an implicit
  full backup of the old system (the question bank snapshot in Phase 2 is the explicit one).
- **Open fork (to adjudicate at Phase 1 via codexreview): stack.** Specs name React 19 + Vite +
  Supabase + Vercel; current repo is Next.js (App Router) + Supabase + Vercel. Deeper requirements
  (RLS, server-side grading, RPC, <800ms, optimistic UI) are framework-agnostic. Decision deferred
  to Phase 1 with an explicit Codex review (Next-stays vs Vite-migration; cost/regret/spec-fidelity).

---

## Log

### 2026-06-15 — Phase 0 kickoff
- Read all 7 plan files. Created `overhaul/v0.2` branch, `phases/`, `backups/`, this log.
- Phase 0 loop started: methodology plan → codexreview the audit approach → run the audit →
  AUDIT.md (gap list + severity per domain) → verify → advance.

### 2026-06-15 — Phase 0 DONE
- 6 parallel domain agents (latency/items/interactivity/engine/visual/schema) + direct stack read.
- Codexreview (informed+cold) of the methodology: 8 concerns, ALL adopted; added 3 audit domains
  (D8/D9/D10), hardened rigor (spec-source/precedence, latency-provisional, stack-invariant split,
  severity rubric). AUDIT.md written across 10 domains.
- Key findings: D5 engine = deterministic score + in-session lock (the "fake adaptive" failure, the
  most-fatal); D7.1-D7.5 compliance-schema blockers for Phase 1 (data-class/retention, family_id,
  guardian roles+dob, VPC ordering, immutability-vs-deletion); D2.1 no optimistic UI (BLOCKER);
  D3 = 4,588 items, 0 diagnostic items, 0% equivalence_class/calculator_flag, 536 near-dups;
  D6 visual ~15-20% compliant (no dark canvas, no 3-ring system, no baseball instrumentation).
- Plumbing to KEEP: pinned-search_path SECURITY DEFINER, security_invoker views, append-only
  evidence, Model-B forge-safe JWT, server-side grading, no-LLM-on-common-path, advisory tutor seam.
- NEXT: Phase 1 loop. FIRST a dedicated codexreview of the stack fork (Next-stays vs Vite-migrate),
  then the SECURITY §2 data-class/retention-first schema + family/guardian model + fast-interaction
  skeleton + knowledge-graph spine.

### 2026-06-15 — Stack decision (Phase 1 gate) DONE → ADR-0001
- Codexreview (informed+cold). Informed (repo-aware): NO spec requirement Next can't meet that Vite
  can. DECISION: keep Next.js (App Router). 5 hardening rules adopted (RPC boundary; framework-neutral
  lib/; latency budget). Governed override: ADR-0001 + non-destructive pointer on the 3 spec headers.
  Committed 219ee24.

### 2026-06-15 — Phase 1 spine PLAN reviewed + hardened to v2 (implementation pending)
- phase-1-plan.md written (SECURITY §2 build-order: data-class/retention FIRST → family/guardian →
  RLS + assert_can_access_student RPC → telemetry + engine substrate → fast skeleton → graph).
- Codexreview (adversarial + SECURITY reviewer): 8 concerns, ALL adopted (2 blocking). Folded as
  REVISION R1–R7. Key hardening: R1 drop/rewrite legacy RLS (OR-combine bypass) + coach severity-only;
  R2 flag-gated erase (not trigger whitelist); R3 DB-backed assert_can_access_student; R4
  anonymize-in-place (FK RESTRICT graph); R5 durable model_update_outbox; R6 served_attempt_nonces +
  session binding; R7 read_student_record(reason_code) audited break-glass.
### 2026-06-15 — Phase 1: migration 0006 DONE (committed 18a7c2a)
- Wrote supabase/migrations/0006_overhaul_spine.sql (generated, NOT executed — human SQL gate) to
  plan-v2 R1-R7: data_classes/retention_policies; families/guardians(role enum + flags)/students
  dob+family_id+compliance_path; family_id+data_class_id on evidence; current_family_id();
  assert_can_access_student (READ) + assert_can_submit_for_student (WRITE) DB-backed; R1 coach raw
  read removed via can_read_raw_evidence; R2/R4 strict forbid_mutation + scoped
  forbid_mutation_erasable (jsonb-diff, response-only) + anonymize-in-place erase RPC; R5
  model_update_outbox; R6 served_attempt_nonces + submit_attempt/issue_attempt_nonce (service_role
  only, server-side HMAC, p_actor vouched); R7 read_student_record(reason_code); D5/D10 substrates.
- **codexreview security: 5 rounds.** Caught + fixed before commit: 2 BLOCKING forgery bugs
  (client HMAC secret + p_correct; erase UPDATE no-op), append-only scope leak, staff-break-glass
  denial, session-student mismatch, service-role actor denial, COMMENT syntax error, consent-actor
  gap, view-only->write escalation. Round 5 clean. Trail: .codexreview/reviews/2026-06-15-phase1-0006/.

- **RESUME / CONTINUE (remaining Phase 1):**
  - [next] `lib/engine-loop/` framework-neutral gradeAttempt (sync, authoritative) / applyModelUpdate
    (async, durable per R5) split + tests (closes D2.1 optimistic skeleton).
  - `supabase/tests/rls_overhaul_deny.sql` deny-suite: coach raw-read DENIED (R1), nonce replay/
    expiry/wrong-session, view-only submit denied, cross-family read, erase-non-operational blocked.
  - Phase 1 VERIFY gate (phase-1-verify.md) + OVERHAUL_LOG, then Phase 2 (item bank: snapshot first).
- (superseded resume note below — 0006 now done)
- **RESUME HERE (next context window):** implement to phase-1-plan.md REVISION v2:
  1. `supabase/migrations/0006_overhaul_spine.sql` (generated, NOT executed — human SQL gate): data_
     classes + retention_policies (seed §3, ATTORNEY-PENDING); families + guardians(role enum,
     court_order_flag, dual_consent) + students.{family_id,dob,age_band,compliance_path}; family_id on
     evidence tables; current_family_id() + assert_can_access_student() (DB-backed); DROP/rewrite
     legacy campus/staff/parent SELECT policies (R1); revised forbid_mutation + erase_student_
     operational_data (R2/R4); served_attempt_nonces + submit_attempt + issue_attempt_nonce (R6);
     model_update_outbox (R5); read_student_record(reason_code) (R7); item_versions/calibration_runs/
     item_exposure + thresholds (D10); node_mastery p_known/stability/halflife/next_review_at (D5).
  2. `supabase/tests/rls_overhaul_deny.sql` deny-suite (flip coach raw-access cases to DENY).
  3. `lib/engine-loop/` framework-neutral grade/applyModelUpdate split (optimistic skeleton).
  4. codexreview the migration + lib CODE (per user directive: all committed code), keep tests green,
     commit, then Phase 1 VERIFY gate.
- NOTE: migrations are GENERATED + syntactically validated here; execution against Supabase is infra
  (human runs SQL), consistent with the prior phase-11 workflow.
