# Phase 2 — ITEM BANK REMEDIATION — Plan

**Plan against:** DIAGNOSTIC §5/§9, CLAUDE §9 (the item-certification pipeline — "the single most
likely fatal flaw"). **Closes AUDIT:** D3.2 (equivalence_class 0%), D3.3 (calculator_flag 0%), D3.4
(no solver), D3.5 (536 near-dups), D3.6 (misconception_map 283 gaps). Snapshot DONE
(backups/question-bank-2026-06-15.json — reversible).

## Deliverables (testable lib + applied passes; each edit codexreviewed)
1. **`lib/item-certification/` (pure, tested) — the pipeline (CLAUDE §9):**
   - `solverVerify(item)` — independent re-derivation where the answer kind is machine-derivable
     (numeric arithmetic/exponent/order-of-ops via a safe evaluator; choice = answer∈choices;
     coordinate/inequality/numeric-set = canonical parse). Flags items whose stated answer the
     solver cannot confirm (→ human-QA queue, not silent pass). NO eval() of arbitrary strings — a
     bounded arithmetic evaluator only.
   - `equivalenceClassOf(item)` — deterministic structural signature (node + answer-kind + prompt
     skeleton with numbers masked) so re-skinned/number-swapped variants share a class (§9.5).
   - `detectDuplicates(items)` — exact (normalized prompt) + near (same node + same skeleton) →
     groups to collapse into parameterized families behind randomization (§8).
   - `tagCompleteness(item)` — which required fields are present (node_id, difficulty_tier,
     misconception_map, response_type, calculator_flag, item_version, equivalence_class).
   - `calculatorFlagFor(item)` — derive the 3-way flag (no_calculator | calculator_allowed |
     calc_neutral_arithmetic_light) from node/answer shape (DIAGNOSTIC §10).
   - `certify(item)` — runs the gates → {certified | flagged, reasons[]}. The pipeline that gates
     all FUTURE items.
2. **Applied tagging pass (`scripts/phase2-tag-bank.mjs`):** add `equivalenceClass` + `calculatorFlag`
   to every item; backfill the 283 missing `misconceptionMap`s where derivable (else flag). Bump
   graph schema version. Validate against the existing validate-graph + the new certification gates.
3. **Dedup report + collapse plan:** run detectDuplicates over the bank → a report of the 536+33
   groups; collapse the exact dups; the near-dup families are documented as parameterized templates
   (the full template-engine migration is large — Phase 2 collapses exact dups + tags equivalence
   classes so the transfer signal is interpretable now; the parameterized-render migration is
   logged for the diagnostic build in Phase 6).

## Acceptance (GOAL checkboxes)
- Snapshot exists (DONE). Solver pass runs over 100% of machine-derivable items; flagged set listed.
- `equivalence_class` + `calculator_flag` coverage → 100% (was 0%). misconception_map gaps closed or
  flagged. Exact dups → 0. Certification pipeline gates new items (tested).
- `npm run build` + tests green; validate-graph passes; the bank is restore-by-diff reversible.

## REVISION v2 (codexreview informed+cold — BINDING; supersedes conflicting text above)
All 7 concerns adopted. The reviewers prevented a fabrication-prone auto-tagger + a destructive
dedup. Build to THIS section.

- **R1 Schema first:** extend `types/problem.ts` ProblemTemplate with `equivalenceClass?: string` +
  `calculatorFlag?: "no_calculator" | "calculator_allowed" | "calc_neutral_arithmetic_light"`
  (camelCase = repo convention; the spec's snake_case are conceptual). Add validate-graph rules that
  read these EXACT fields; acceptance checks the same.
- **R2 Solver = well-formedness, NOT prose re-derivation:** items carry no derivation metadata, so
  `certify(item)` verifies: (a) the answer PARSES under its kind's canonicalizer; (b) ROUND-TRIP —
  `checkAnswer(item, item.answer.value)` (or each numeric-set value / the choice value) returns
  correct; (c) choice-integrity (answer∈choices, ≥1 distractor, no dup). Anything not mechanically
  confirmable → `flagged` with a reason (human-QA queue), NEVER silently passed. No "100%
  machine-derivable" claim. True CAS needs an authored `derivationSpec` (logged, future).
- **R3 Dedup is safe + reported:** exact-PROMPT dups that span different phase/sport buckets are
  legitimate coverage — KEEP them. Collapse ONLY true within-bucket dups (same node+phase+sport+
  prompt+answer). Emit `phases/phase-2-dedup-report.md` (node/phase/sport/answer/count) BEFORE any
  removal; when in doubt, keep. Snapshot enables restore-by-diff.
- **R4 equivalenceClass = structural family** = `node | answer.kind | numbers-masked skeleton |
  difficulty`. Documented as STRUCTURAL (calibration refines §9.5 later). Tests: known same-skeleton-
  different-answer items get DIFFERENT classes via the difficulty/kind discriminators.
- **R5 Flag, don't fabricate:** the 283 missing `misconceptionMap`s are FLAGGED for authoring, never
  auto-invented. `calculatorFlag` by explicit rules (computation-fluency nodes + pure-arithmetic
  numeric → no_calculator; reasoning/modeling → calc_neutral_arithmetic_light; uncertain → flag).
- **R6 Gating:** `certify()` runs inside `validate-graph` (the existing CI/test gate); an
  uncertified item fails validation. Same gate for future content import.

## Codex review ask
Attack the solver-verification approach: is the bounded evaluator safe (no code-exec) and correct
for the math kinds? Is the equivalence-class signature stable enough to group true variants without
collapsing genuinely-different items? Does collapsing exact dups risk losing a needed isomorph?
