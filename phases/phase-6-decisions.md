# phase-6-decisions.md — Autonomous adjudication

mr-kahn REJECT is factual + accreditation-grade → ADOPT all 10. mr-gates APPROVE-WITH-CHANGES → ADOPT
all. No rebuttals. One item escalates to a Matt human checkpoint (not a stop — flagged + built around).

| # | source | disposition | decision |
|---|--------|-------------|----------|
| K1 | mr-kahn | **ADOPT** | Replace CCSS-intersection with curated `HIGH_IMPACT_NODE_IDS` = {ALG-F02, ALG-F03, ALG-F08, ALG-E02, ALG-E03, ALG-E04, ALG-L05, ALG-L07, ALG-E13} (mr-kahn's table). Keep a CCSS set only as a secondary cross-check guard. Verify each id exists in the graph at build. |
| K2 | mr-kahn | **ADOPT (log)** | Coverage gaps logged for v1.5 in phase-6-plan §12 + phase-6-verify: no ordered-pair-as-solution node; decimal/fraction/rational collapsed into ALG-F02. Do NOT fake-tag. |
| K3 | mr-kahn | **ADOPT** | Folded into K1's corrected id set. |
| K4 | mr-kahn | **ADOPT** | High-impact READY requires ≥2 DIRECT correct; a high-impact node with <2 direct (even if inferred/1-direct) → UNCERTAIN. Corroboration may raise toward 2; if budget can't, UNCERTAIN. |
| K5 | mr-kahn | **ADOPT (defer constructed, implement foundational)** | v1 numeric items have no "hard constructed-response" → defer that READY sub-branch EXPLICITLY (logged). IMPLEMENT foundational-fail NEEDS_WORK: a direct incorrect on a domain-root/high-impact-foundational node → NEEDS_WORK even at 1 evidence. |
| K6 | mr-kahn | **ADOPT** | Inferred prior = Beta(1,2) (skeptical, anti false-READY). guess=0.2, slip=0.1. All thresholds/priors live in `DIAGNOSTIC_CONFIG.posterior` as named constants → **Matt threshold checkpoint** (flagged in verify; built with documented defaults). |
| K7 | mr-kahn | **ADOPT** | `maxItems` is `provisionalMaxItems=40`; the sim reports the realized length distribution + whether the uncertain-middle needs the §4 split (logged if so). |
| K8 | mr-kahn | **ADOPT** | Sim reports: overall + **high-impact-subset** sensitivity/specificity, **high-impact false-READY rate**, and a dedicated **procedural-over-brittle** scenario (correct on dependents while a true prereq gap exists) proving inference yields no false high-impact READY. |
| K9 | mr-kahn | **ADOPT (log + seam)** | Diagnostic attempts already carry `source:"diagnostic"`; the later transfer battery MUST exclude that student's diagnostic-exposed item ids. Documented as a binding constraint in the engine + verify (course-side enforcement when the transfer gate lands). |
| K10 | mr-kahn | **ADOPT + FLAG (Matt checkpoint)** | Phase-6 labels are honestly provisional (READY label ≠ lock; provisional flag flows). The pre-existing `creditFromDiagnostic` writing status `mastered`+masteredAt is a §12 accreditation concern that PREDATES Phase 6 and is a "mastery status threshold" change = a HARD Matt checkpoint — flagged in verify as a required pre-launch fix, NOT silently rewritten here. entryFrontier carries the provisional flag for inferred prereqs. |
| G1 | mr-gates | **ADOPT** | Posterior-aware stop lives INSIDE `nextItem` (returns null) — single pure replay drives both client+server stop. |
| G2 | mr-gates | **ADOPT** | Sim is `scripts/diagnostic-sim.test.ts` run via the vitest resolver (logs the report); deterministic seeded LCG RNG. No new dep. |
| G3 | mr-gates | **ADOPT** | High-impact corroboration = widen `needsConfirm` in `processAnswer`; `finishDiagnostic` stays a pure read-out. Flag every changed index.test.ts expectation in the diff. |
| G4 | mr-gates | **ADOPT** | `DiagnosticPlacementLabel` union → `types/diagnostic.ts`; `cold-start.ts` imports it. One source of truth, underscore form. |
| G5 | mr-gates | **ADOPT** | posterior/label code iterates `graph.nodes`/sorted ids only. |
| G6 | mr-gates | **ADOPT** | `ItemScreen` keyed on the asked-index ordinal (corroboration can re-serve a node). |
| G7 | mr-gates | **ADOPT** | `demonstrated[]`/`creditFromDiagnostic` stays the only node_mastery path; remediation derived read-side; test: INFERRED_READY/UNCERTAIN ⇒ no MasteryUpdate. |

**Net:** plan → v2 (below in phase-6-plan.md §V2). One Matt human checkpoint flagged (K6 thresholds +
K10 §12 credit semantics) — surfaced, not blocking the build (PLAN.md: configurable + documented
defaults, confirm before launch). Proceed to Codex pass on v2, then execute.
