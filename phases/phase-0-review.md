# Phase 0 — Adversarial Review (Codex) of the AUDIT methodology

Reviewer: Codex via `/codexreview` (dual: informed + cold). Raw JSON preserved at
`.codexreview/reviews/2026-06-15-phase0-audit/round-1.{informed,cold}.codex.json`. Adjudication at
`round-1.claude.json`. The review targeted the audit *approach* (PLAN.md Phase 0: "Codex reviews the
audit approach for blind spots").

## Concerns raised (union)
**Informed (repo-aware):**
1. `diag-routing-validity` (HIGH) — audit treated DIAGNOSTIC as item-bank-only; missed routing/
   stopping-rule/4-labels/simulation/validity. → **adopted** as new domain D8.
2. `a11y-interaction-gap` (HIGH) — visual+interactivity audits could pass while construct/coordinate
   inputs stay inaccessible. → **adopted** as new domain D9.
3. `calibration-telemetry` (MED) — no audit of item_versions/calibration_runs/item_exposure +
   A/B-testable thresholds. → **adopted** as new domain D10.

**Cold (sealed, premise-attacking):**
4. `spec-source` (BLOCKING) — specs' location/version/precedence unstated. → **adopted**: AUDIT.md
   now states inputs = new_plan/*.md v0.2 + precedence GOAL>specs>Codex.
5. `static-latency` (HIGH) — static reads may miss real latency. → **adopted**: latency marked
   PROVISIONAL; architecture-level violations are static-certain; live profiling = Phase 4 gate.
6. `stack-deferral` (HIGH) — deferring stack biases findings. → **adopted**: findings split
   stack-INVARIANT (most) vs stack-CONTINGENT (D2-arch, tooling); stack fork is a Phase-1 codexreview.
7. `agent-consistency` (MED) — no shared severity rubric across the 6 agents. → **adopted**:
   normalized BLOCKER/HIGH/MED/LOW in synthesis.
8. `security-static-gap` (MED) — security audit should trace runtime, not just schema. → **adopted/
   already-done**: the security agent traced call-sites + grep'd hmac/nonce (zero).

## Outcome
All 8 concerns adopted (3 added new audit domains; 5 hardened method rigor). No rejects. The
methodology was enriched and re-run into AUDIT.md before execution — converged.
