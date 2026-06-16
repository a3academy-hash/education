# Phase 2 — Verify (gate)

**Gate (PLAN.md):** snapshot exists; dedup = 0; 100% live items solver-verified + tagged; quality
scan clean.

## Results
- [x] **Snapshot** `backups/question-bank-2026-06-15.json` (byte-identical 4,529,150 B) — purge reversible.
- [x] **Tagging 100%:** all **4,588** items carry `equivalenceClass` + `calculatorFlag` (was 0% each
      — closes AUDIT D3.2/D3.3). Schema `equivalenceClass`/`calculatorFlag` added to ProblemTemplate.
- [x] **Solver-verified (round-trip) 100%, 0 flagged:** the live-bank gate
      (`lib/item-certification/bank.test.ts`) runs `certify()` — the engine's own checker confirms
      every authored answer + well-formedness + choice-integrity — over all 4,588 items; **0
      uncertified** (closes AUDIT D3.4 with an honest, metadata-bounded method, not prose CAS).
- [x] **Dedup:** **0** TRUE within-bucket exact duplicates (the audit's "33 exact" were cross-bucket
      phase/sport coverage — legitimately KEPT, per codexreview). 4,123 distinct structural families
      tagged (the 536 number-swap "near-dups" are family members, interpretable for transfer — closes
      D3.5 without destructive deletion). Report: `phases/phase-2-dedup-report.md`.
- [x] **Certification pipeline gates future items** (R6): `certify()` is the gate (runs in the
      vitest/CI suite over the live bank). 19 lib unit tests + 3 bank-gate tests.
- [x] **No regression:** full suite **735 tests green**; `tsc --noEmit` clean.

## Flagged for authoring (R5 — flag, don't fabricate)
- **misconceptionMap gaps (283 items, AUDIT D3.6):** NOT auto-invented. They are an authoring TODO
  (mr-kahn equivalent) — `misconceptionMap` is optional (wrong-answer→tag enrichment), so it does
  not fail certification, but completing it on high-error skills is logged for the content pass.
- **Per-node `no_calculator` refinement:** Phase 2 assigned the defensible rule (numeric →
  no_calculator; else calc_neutral_arithmetic_light). Finer per-node calibration is a future pass.
- **Within-bucket collapse:** N/A — 0 groups found, nothing to collapse.

## Result: **PASS** — advance to Phase 3 (the adaptive engine: BKT acquisition + FSRS retention +
damped KST + selector; lock only on delayed/unseen — the AUDIT D5 most-fatal gap; the 0006 columns
+ ab_parameters are the substrate).
