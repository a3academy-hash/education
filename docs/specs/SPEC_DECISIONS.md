# SPEC_DECISIONS — key-decision summaries

These are the two 20-decision summaries **verbatim** as first presented (2026-07-02), one per spec, for quick review.

> **Superseded figures (2026-07-03 revisions):** a few line items below were changed after this snapshot — kept verbatim here as the original record, but the **specs themselves are the source of truth**:
> - Model IDs: **`claude-sonnet-5` confirmed final (Matt, 2026-07-03)** for both `RUNTIME_MODEL` and `GENERATION_MODEL_ALT` — matching these lists; Haiku fallback pinned to dated `claude-haiku-4-5-20251001`. (An interim pass had briefly moved Sonnet to `claude-sonnet-4-6`; reverted.) All model IDs now live once per spec in a "Model configuration" table.
> - BATCH_REGEN audit gate (item 16): now **ramped 10% for the first two batches → 5% after two consecutive clean batches** (not flat 5%).
> - BATCH_REGEN cost: now **~$61 (up to ~$70)**, not ~$58, reflecting the ramped audit.
> - Graph version: **git `1.11.0` pinned as the authoritative baseline (Matt, 2026-07-03)**; Supabase (`1.9.2`) reconciliation deferred to a gated promotion precondition (see `logs/REMOTE_DESIGN_LOG.md` and BATCH_REGEN §8).
> - RUNTIME cost (item 15): now shows both intro ($2/$10) and standard ($3/$15) scenarios; budgeted against standard (~$0.24/session).

---

## BATCH_REGEN_SPEC — 20 key decisions

1. Scope: 74 nodes total in the live graph (v1.11.0), 1 gold (ALG-L06), **73 to regenerate**.
2. Pipeline = **Anthropic Batch API + Python harness**; the 50% batch discount is the "cheapest at volume" lever, not a model downgrade.
3. Alternative (Claude Code sessions) reserved for the gold node + per-node fallback; 5–15× costlier, non-deterministic.
4. Generator = **claude-opus-4-8** (curriculum is accreditation evidence — no cost downgrade).
5. Cost-down option: pilot A/B **claude-sonnet-5** on 3 nodes; adopt only at audit parity.
6. Auditor = **claude-fable-5** — deliberately stronger + independent from the generator.
7. Ordering = **dependency-cluster** (archetype-similarity as intra-cluster tiebreak).
8. Justification: audit context compounds along prereqs, gold proximity, clean failure isolation, cache reuse.
9. Batch size = **10 nodes → 8 batches**; sized as a human review/approval unit, not by API limits.
10. Enriched target ≈ **100 items/node (~40k output tok)**, count data-driven from the archetype manifest.
11. **Archetype library doesn't exist** — spec defines its required interface (manifest + per-archetype entries) as the load-bearing input dependency.
12. Prompt = cached shared prefix (system+schema+taxonomy contract+archetypes+registry) then per-node payload (node JSON + gold exemplars).
13. Output contract: strict `json_schema` structured output + host-side re-validation.
14. Everything staged under **`.authoring-tmp/regen/`**; promotion to `data/`/Supabase is a *separate gated task*.
15. Validation: tag-existence + structural invariants (P3 non-empty, 3-rung ladder, prereqs unchanged) + solver check.
16. Audit gate: **5% stratified item sampling** (~50/batch), pass = ≤5% failure AND **0 fatal**.
17. Reject loop: 2 auto-regen rounds (audit feedback injected) → then session fallback.
18. Failure modes catalogued: F-SCHEMA/F-TAG/F-OVERFLOW(split-by-phase)/F-PARTIAL(re-key by custom_id)/F-DEP(hard stop)/F-DRIFT.
19. **F-DEP hard-stops** the run if the registry diff isn't applied or the archetype version isn't pinned.
20. Human gates marked: mr-kahn (archetypes, registry freeze, per-batch audit), mr-gates (harness), Matt (pilot go/no-go, end-of-phase, promotion).

---

## RUNTIME_TUTOR_SPEC — 20 key decisions

1. Top-line constraint restated: **LLM is advisory-only; deterministic BKT/KST gates all mastery**; on disagreement the engine wins.
2. Runtime model = **claude-sonnet-5** (+ Haiku 4.5 fallback for simple grading).
3. Exactly **four call types**: tutor turn, free-response grading, interest-variant, report narration — nothing else calls an LLM.
4. Tutor turn fires only on engine-detected stuck/low-confidence states; never states the answer.
5. Grading **produces evidence, not a verdict**; the engine decides what it changes.
6. Interest-variant = constrained slot-fill of a pre-certified template, solver-verified, structural-skin-rule enforced.
7. Report narration **narrates engine numbers; never computes** — may not introduce a new quantitative claim.
8. Single **context envelope** defined (node, misconceptions, hint-ladder pos, mastery snapshot, interest profile).
9. Every envelope number + `engineDecision` is **read-only**; only return path is the structured-output schema.
10. Grading schema matches the **D4 rubric contract exactly** — score-per-element + detected tags + confidence — drop-in with regen rubric items.
11. All four output schemas are strict `json_schema` (evidence-shaped; no free-form "decision" possible).
12. Validation = host-side → **retry once → deterministic fallback** per call type.
13. Fallbacks: static hint rung / deterministic answer-check + human-review queue / neutral certified template / templated report.
14. **Full LLM outage degrades tailoring but never stalls the lesson or corrupts mastery.**
15. Cost ≈ **$0.24 per 30-min session** (Sonnet 5 std; ~$0.16 with Haiku grading + prompt caching); assumptions stated.
16. Only **tutor turns block** (<800ms TTFT, streamed, effort:low, thinking:disabled); rest async-optimistic/precomputed/cached.
17. Explicit **NEVER-LLM list**: answer-checking, mastery/retention updates, routing, gating, selector, scheduling, pace numbers, cold-start, frustration-drop decision.
18. Injection containment: student text only in a delimited user turn, no tools/retrieval exposed, output schema-constrained.
19. **Semantic firewall** is the real defense: deterministic layer never reads LLM output as authority, so injection blast radius = one wrong hint/grade, absorbed by fallback.
20. Human gates: mr-gates (routes/envelope), mr-kahn (grading fidelity), pee-wee (surfaces), Matt (evidence-weighting changes + expert-label validation before any hard-gate influence).
