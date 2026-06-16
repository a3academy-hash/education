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
- [ ] Phase 1 — The Spine (schema/RLS/identity/data-class + fast-interaction skeleton + graph)
- [ ] Phase 2 — Item-bank remediation (snapshot → dedup → solver → tag/certify)
- [ ] Phase 3 — Adaptive engine (BKT + FSRS retention + damped KST + selector)
- [ ] Phase 4 — Interactivity + speed (predict/construct→resolve, <800ms)
- [ ] Phase 5 — Visual system (one instrument system, AA contrast, rings, baseball-native)
- [ ] Phase 6 — Diagnostic (multistage routing, 4 labels, seed write)
- [ ] Phase 7 — Reporting + compliance (VPC, dashboards, NCAA export, 70/20/10)
- [ ] Phase 8 — Engagement guardrails + motivation
- [ ] Phase 9 — Full verification (prove DONE)

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
