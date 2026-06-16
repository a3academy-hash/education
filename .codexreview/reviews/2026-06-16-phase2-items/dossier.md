# Phase 2 items — dossier

## Current state (from AUDIT.md D3 + the item-bank agent)
- data/algebra1-graph.json: 74 nodes, 4,588 problems (p1 2,072 / p2 2,072 / p3 444). 0 diagnostic items.
- Answer kinds: choice 1,956 (42.6%); numeric 2,002 (43.6%); coordinate/inequality/numeric-set 488
  (10.6%); expression 142 (3.1%, string-normalize only, no CAS).
- Existing checker: lib/problem-engine/index.ts checkAnswer/isCorrect — conservative compare vs the
  AUTHOR-stated answer; NOT a solver. Hand-check of ~60 items: all stated answers correct.
- Tagging: node_id 100%, difficulty(1/2/3) 100%, response_type 100%, item_version 100%,
  misconception_map 93.8% (283 missing), calculator_flag 0%, equivalence_class 0%.
- Duplicates: 33 exact (normalized prompt), 536 near-dup number-swap twins across 223 skeletons.
- Types: types/problem.ts ProblemTemplate { id, version, skillId, phase, sport, prompt, visual,
  visualSpec?, choices?, answer (AnswerSpec union), misconceptionMap?, hints[], difficulty 1|2|3 }.
- Validators: lib/validation/index.ts (validate-graph, incl. the LB3 choice-integrity rule).

## Constraints
- Snapshot backups/question-bank-2026-06-15.json is the reversibility net (byte-identical).
- This is test/authoring data, freely editable; restore-by-diff if a threshold over-deletes.
- The graph is JSON (not PG); engine reads it. A schema-version bump signals an edit.

## Review focus
Solver safety (no arbitrary code-exec; correct for numeric/exponent/order-of-ops/choice/coordinate/
inequality/set); equivalence-class signature stability; risk of collapsing needed isomorphs.
