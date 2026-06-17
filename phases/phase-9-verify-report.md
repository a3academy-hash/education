# phase-9-verify-report.md — Full verification (generated)


## Dedup
- items: 4588
- within-bucket true duplicates: **0**

## Solver + tagging
- solver-verified: **4588/4588** (100.00%)
- fully tagged: **4588/4588** (100.00%)

## Tagging (full required set)
- node_id + difficulty_tier + item_version + response_type + equivalence_class + calculator_flag: **4588/4588**
- misconception_map present: 4305/4588 (remainder = flagged authoring gaps, deferred)

## Adaptive engine (engine-v2 modular spine)
- BKT: correct 0.78 > 0.40 > incorrect 0.17 (acquisition live)
- FSRS: P(recall) decays with time; success extends stability (retention live)
- Lock firewall (delayed-unseen only): proven by lib/engine-v2/{gate,session}.test.ts (perfect in-session never locks). Live engine-v2↔mastery-engine cutover = carried residual.

## Performance (74-node graph, all assessed, 30 runs)
- median engine loop: **0.5ms**
- p95: 3.7ms
- budget: <800ms

## End-to-end journey
- diagnostic placed 74 nodes; demonstrated 14
- credit updates: 45; grade projection 0% (creditEligible false)
- NCAA export: 3 disclaimers, transcript line withheld (not credit-eligible)
