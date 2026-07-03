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

### 2026-07-03 — graph-version investigation + spec fixes + decisions doc

**TASK 1 — graph version (investigate-first, report-before-commit):**
- `data/algebra1-graph.json` schema version = **`1.11.0`**.
- History of the file: `53450f9` (2026-06-13, overhaul/v0.2, Phase 7A/B admin log+digest, v1.9.2) → `725ee23` (2026-06-14, overhaul/v0.2, LB3 MC-choice-widget fix + ALG-E14 data fix, **v1.9.2** — the published+activated state the gold-node work pulled) → `74de0f8` (2026-06-16, overhaul/v0.2, **Phase 2 item bank**: certification pipeline + 100% equivalenceClass/calculatorFlag tagging on 4,588 items + dedup, **bumped 1.9.2→1.11.0**, 13,765 ins/4,589 del, committed by matt@a3trojans.com).
- **Did it move or is the spec wrong?** It **moved** 1.9.2→1.11.0; the spec's 1.11.0 is the correct current git state (not a phantom). **Divergence flagged:** git=1.11.0 vs Supabase-active=1.9.2 (gold-node baseline).
- **Approved?** Yes — commit is under Matt's own email and `OVERHAUL_LOG.md` marks "Phase 2 — Item-bank remediation — DONE" (closes AUDIT D3.2–D3.5, 735 tests green). Not a phantom/unlogged change. Tension flagged: Matt said "last approved was 1.9.2," but 1.11.0 is recorded under his identity on the overhaul/v0.2 track (Phase-2 item-bank work ran parallel to the gold-node/regen line, which was scoped to Supabase-active 1.9.2).
- **Registry diff still applies?** Registry **structurally identical** across 1.9.2→1.11.0 (153 entries, same IDs, all 4 refined slope tags present) → the **4-redefine + 10-add** apply cleanly. **BUT** the diff's **1 live-item re-key** targets an item identified against the 1.9.2 bank; Phase 2 rewrote the whole bank, so that single re-key **must be re-verified against 1.11.0** before application. Did NOT touch the graph or apply any diff (still BLOCKED / out of scope).
- Proceeded to Task 2/3 (docs only, no `data/` writes) since the move is approved and the specs cite the real state — the wait-condition (phantom state) was not triggered.

**TASK 2 — spec fixes:**
1. BATCH_REGEN audit gate → **ramped 10% for first two batches, dropping to 5% only after two consecutive clean batches** (clean = 0 fatal AND 0 major; a batch can pass without being clean). Updated §6.1, §6.3 (added clean-batch definition), §3.3 cost (audit ~$12→**~$15**, up to ~$24 worst-case; total ~$58→**~$61**, up to ~$70), Appendix A rows.
2. RUNTIME cost §5 → now shows **both** intro ($2/$10 through 2026-08-31) **and** standard ($3/$15) scenarios in a table; **budgeted against standard (~$0.24/session)** so it survives the September step-up. Flagged the pricing-track caveat: pinned `RUNTIME_MODEL`=`claude-sonnet-4-6` is already flat $3/$15 (no intro, no cliff); the intro row applies only if switched to the `claude-sonnet-5` track. Decision surfaced to Matt.
3. Graph version in BATCH_REGEN corrected/annotated: 1.11.0 confirmed correct, with the git-vs-Supabase(1.9.2) divergence + registry-diff re-verify note added to §0 dependency table, the node-inventory paragraph, and F-DEP (§7).

**TASK 3 — commit:** created `docs/specs/SPEC_DECISIONS.md` (both 20-decision lists **verbatim**, with a dated "superseded figures" header pointing to the specs as source of truth for the items Task 2 / the model-ID pass changed). Committed Task 2 fixes + the decisions doc + this log entry; pushed to `claude/batch-regen-runtime-tutor-specs-u79i6t`.

### 2026-07-03 — Matt's two pinned decisions applied

**1. Graph baseline = git `1.11.0`, authoritative (final).**
- BATCH_REGEN **F-DEP** updated: graph-baseline hard-stop is now **RESOLVED** (pinned to git 1.11.0). Remaining F-DEP hard-stops = un-pinned archetype version / pre-diff registry only. The Supabase-active `1.9.2` divergence is no longer a *run* blocker — moved to a *promotion* precondition.
- §0 graph-version note updated to record the pin + "pinned but pending content review."
- **Promotion checklist (§8, item 7)** gains two gated preconditions before any regen output promotes: **(7a) [mr-kahn]** re-verify the registry diff's 1 live-item re-key against the 1.11.0 bank before applying the diff; **(7b) [mr-gates]** Supabase reconciliation to 1.11.0 must complete before promotion.
- **Pending Matt (desktop return):** review `OVERHAUL_LOG.md` + the `74de0f8` diff — baseline is pinned but his content review of the Phase-2 item-bank rewrite is still open.

**2. `RUNTIME_MODEL = claude-sonnet-5`, `GENERATION_MODEL_ALT = claude-sonnet-5` — confirmed final.**
- Reverted the interim `claude-sonnet-4-6` pin in both config tables back to `claude-sonnet-5` (with intro-pricing annotation: $2/$10 in / $3/$15 std through→after 2026-08-31; Batch alt $1/$5 intro → $1.50/$7.50 std).
- RUNTIME pricing-track caveat rewritten from a "flag for Matt" open question to a confirmed decision: intro row is the current cost (~$0.16/session) but budget is planned against **standard (~$0.24/session)** so it survives the September step-up. The dual-scenario table from Task 2.2 now correctly reflects the actual pinned model (sonnet-5 genuinely has the intro→standard step-up).
- `SPEC_DECISIONS.md` superseded-header corrected: the sonnet-5 IDs in the verbatim lists are accurate again; noted the brief 4-6 interim was reverted.

Committed + pushed to `claude/batch-regen-runtime-tutor-specs-u79i6t`.
