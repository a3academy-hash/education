# REMOTE_DESIGN_LOG — remote (mobile) design-doc sessions

Pure design-doc work executed remotely. No code, no `data/` writes, no Supabase writes.
Gold-node artifacts in `docs/gold-node/` are BLOCKED (under review) — referenced as input contracts only, never modified or depended on for their build artifacts. Registry diff NOT applied.

## 2026-07-02 — Session: batch-regen + runtime-tutor specs

Branch: `claude/batch-regen-runtime-tutor-specs-u79i6t`. Context read: root `CLAUDE.md`, `new_plan/CLAUDE.md` (v0.2), `new_plan/AI_ADAPTIVE.md` (v0.2), `logs/GOLD_NODE_LOG.md`. Grounded token/cost estimates in live graph (`data/algebra1-graph.json`, schema v1.11.0: 74 nodes, 114 edges, 7 domains) + the measured L05 baseline pull (63 KB / ~16k tok, 62 items) + the gold-node enrichment delta from the log. Pulled current model IDs / Batch pricing / structured-output + prompt-cache mechanics from the `claude-api` skill (not from memory).

### TASK 1 — `docs/specs/BATCH_REGEN_SPEC.md` (DONE, draft)
Phase 3 regeneration of lessons + enriched banks for the 73 non-gold nodes against the (not-yet-existing) gold-node archetype library.
- **Pipeline:** Anthropic Batch API + Python harness (50% discount = the "cheapest at volume" lever); Claude Code sessions as the alternative + per-node fallback. Generator `claude-opus-4-8` (pilot A/B vs `claude-sonnet-5`); auditor `claude-fable-5` (independent, stronger-than-generator).
- **Ordering:** dependency-cluster order (archetype-similarity as intra-cluster tiebreak). Justified by compounding audit context along prereqs, gold proximity, clean failure isolation, and cache reuse.
- **Sizing/cost:** 10 nodes/batch → 8 batches. ~$0.55/node; ~$58 total (gen ~$40 + regen overhead ~$6 + Fable audit ~$12). Enriched target ~100 items/node (~40k output tok), item count data-driven from the archetype manifest, not hard-coded.
- **Prompt:** cached shared prefix (system + schema + taxonomy-keying contract + archetype templates + registry slice) then per-node volatile payload (node JSON + gold exemplars). Defined the **archetype library required interface** (`archetypes/manifest.json` + per-archetype entries) since it doesn't exist yet — the load-bearing missing input.
- **Output contract:** everything staged under `.authoring-tmp/regen/`; strict json_schema structured output + host-side re-validation + taxonomy tag existence + structural invariants + solver check. NOTHING touches `data/` or Supabase — promotion is a separate gated task.
- **Audit gate:** 5% stratified item sampling/batch (~50 items), Fable structured-verdict prompt, batch passes at ≤5% sampled failure AND 0 fatal; 2 auto-regen rounds then session fallback.
- **Failure modes:** F-SCHEMA / F-TAG / F-OVERFLOW (split-by-phase) / F-PARTIAL (re-key by custom_id) / F-DEP (hard stop if registry diff unapplied or archetype version unpinned) / F-DRIFT.
- **Human gates** marked: mr-kahn on archetype library + registry-freeze + per-batch audit; mr-gates on the harness; Matt on pilot go/no-go + end-of-phase + the separate promotion task.

### TASK 2 — `docs/specs/RUNTIME_TUTOR_SPEC.md` (DONE, draft)
Phase 5 Sonnet runtime, advisory-only. Restated the load-bearing constraint at the top: LLM never sets mastery/routes/gates; deterministic BKT/KST decides everything; on disagreement the deterministic model wins.
- **Runtime model** `claude-sonnet-5` (+ Haiku 4.5 grading fallback). Four call types only: tutor turn, free-response grading, interest-variant instantiation, report narration — one section each with trigger/job/output/latency posture.
- **Context envelope:** full JSON defined; every number + `engineDecision` is read-only; the only return channel is the per-call structured-output schema (evidence, never a decision).
- **Schemas:** grading schema matches the **D4 rubric contract** exactly (score-per-element + detected-misconception-tags + confidence) so it's drop-in with the regen rubric items.
- **Validation/fallback:** validate host-side → retry once → deterministic fallback per call type (static hint rung / deterministic answer-check + human-review queue / neutral certified template / templated report). Full LLM outage degrades tailoring, never stalls the lesson or corrupts mastery.
- **Latency/cost:** ~$0.24/30-min session (Sonnet 5 standard; ~$0.16 w/ Haiku grading + caching). Only tutor turns block (<800ms TTFT, streamed, effort:low, thinking:disabled); rest async-optimistic/precomputed/cached.
- **Deterministic NEVER-LLM list:** answer-checking, all mastery/retention updates, routing, gating, selector utility, scheduling, pace numbers, cold-start, frustration-drop decision.
- **Prompt-injection:** structural containment (student text only in delimited user turn, no tools/retrieval exposed, schema-constrained output) + mechanical sanitization + the semantic firewall (deterministic layer never reads LLM output as authority, so injection blast radius = one wrong hint/grade, absorbed by fallback) + immutable logging.
- **Human gates** marked: mr-gates (routes/envelope), mr-kahn (grading fidelity + evidence mapping), pee-wee (tutor/report surfaces), Matt (evidence-weighting changes + expert-label validation before any hard-gate influence).

Next: Matt reviews the 20-line-per-spec summary (below / in chat) from mobile; on approval these move from DRAFT toward the gated implementation tasks each spec names.

### 2026-07-03 — model-ID audit + config refactor (follow-up)
Verified every hardcoded model ID in both specs against the approved valid set {`claude-fable-5`, `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`}. Fixes: `claude-sonnet-5` → `claude-sonnet-4-6` (BATCH_REGEN alt-generator + RUNTIME runtime model); `claude-haiku-4-5` → `claude-haiku-4-5-20251001` (RUNTIME grading fallback). `claude-opus-4-8` / `claude-fable-5` already valid. Refactored so IDs live **once** per spec in a "Model configuration (single source of truth)" table; all inline uses now reference named constants (`GENERATION_MODEL`, `GENERATION_MODEL_ALT`, `AUDIT_MODEL`; `RUNTIME_MODEL`, `GRADING_FALLBACK_MODEL`). Dropped Sonnet-5-only intro pricing from RUNTIME cost math (4.6 has none). Note: `claude-sonnet-5` is itself a live model, but conformed to the project's approved set per instruction.
