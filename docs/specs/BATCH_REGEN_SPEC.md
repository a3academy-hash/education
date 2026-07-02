# BATCH_REGEN_SPEC — Phase 3 Lesson + Question-Bank Regeneration

**Status:** DRAFT (design-only). No code, no data writes, no Supabase writes authorized by this document.
**Owner:** Main session (orchestrator). Gated approvals required before any implementation (see §8).
**Scope:** Regenerate lessons + enriched question banks for the **73 non-gold nodes**, measured against the gold-node archetype library (ALG-L06 cluster reference).
**Companion docs:** `CLAUDE.md`, `new_plan/CLAUDE.md` (v0.2), `new_plan/AI_ADAPTIVE.md` (v0.2), `logs/GOLD_NODE_LOG.md`, `docs/gold-node/misconception-taxonomy-slope.md` (referenced as an *input contract*, not modified or depended on for its build artifacts).

> **Session constraint honored:** the gold-node artifacts under review in `docs/gold-node/` are BLOCKED. This spec references the archetype library and gold exemplars **as named input dependencies with a defined interface**. It does not read, regenerate, or depend on the blocked build artifacts, does not apply the registry diff to `data/algebra1-graph.json`, and writes nothing to `data/` or Supabase.

---

## 0. Preconditions and dependencies

This pipeline **cannot start** until all of the following exist and are frozen:

| Dependency | Produced by | State needed | This spec's stance |
|---|---|---|---|
| Gold reference node (ALG-L06 + L05 taught surface) | Desktop session (under review) | APPROVED + merged | **Input only.** Referenced, never regenerated. |
| Misconception registry diff (4 redefine, 10 add, 1 re-key) | mr-kahn | Applied to `data/algebra1-graph.json` | **Blocking input.** Regeneration keys tags against the *post-diff* registry. If the diff is not yet applied, this pipeline stops (see §7 failure mode F-DEP). |
| **Archetype library** (`archetypes/` — does not exist yet) | Follow-on authoring task | Authored + frozen at a pinned version | Interface defined in §4.2. This is the load-bearing missing input. |
| D4 rubric contract (score-per-element + tags + confidence) | Gold-node deliverable set | Frozen schema | Consumed by the rubric-item generator and by `RUNTIME_TUTOR_SPEC` grading. |
| Node taxonomy-keying contract (§3 of the slope taxonomy doc) | mr-kahn | Frozen | The 3-rung hint ladder / error-analysis / rubric-annotation rules every node copies. |

**Node inventory (verified against `data/algebra1-graph.json`, schema v1.11.0):** 74 nodes total across 7 domains (foundations→data, tiers 0–6). One is the gold reference (ALG-L06). **73 remain** for regeneration. Current per-node baseline (the quality bar being replaced), per `logs/GOLD_NODE_LOG.md`: 62 problems (28 P1 / 28 P2 / 6 P3), difficulty 1–3, numeric single-step prompts, 2 generic hints/item, thin `misconceptionMap` (1–2 entries), `visual: null`, 2 worked examples. No error-analysis, no representation variety, no rubric-scored explanation, no transfer-battery structure.

---

## 1. Pipeline architecture

### 1.1 Default choice: Anthropic Batch API + Python harness

Generation runs through the **Message Batches API** (`POST /v1/messages/batches`) driven by a Python harness using the `anthropic` SDK. Rationale:

- **50% cost reduction** on all token usage vs. synchronous calls — this is the single largest lever at 73-node volume.
- **Throughput without orchestration code.** One batch submits ≤100k requests / ≤256 MB; results return typically <1h (24h ceiling). No client-side concurrency, retry, or rate-limit handling to build.
- **Deterministic, replayable.** Each request carries a `custom_id`; results arrive **unordered** and are keyed back by `custom_id` (never by position). The harness is a pure function of (frozen inputs, pinned model, pinned prompt template).

**Generation model: `claude-opus-4-8`** (Batch: $2.50/$12.50 per 1M in/out). Curriculum content is accreditation evidence; we do not downgrade the generator for cost. "Cheapest for this volume" is achieved by the Batch discount, not by model tier. Sonnet 5 (`claude-sonnet-5`, Batch $1.50/$7.50, or intro $1.00/$5.00 through 2026-08-31) is a **cost-down candidate to A/B against the gold exemplars** on a 3-node pilot before committing — adopt only if audit pass-rate is statistically indistinguishable from Opus on the pilot.

**Audit model: `claude-fable-5`** (Batch: $5/$25) — a stronger, independent model grades the generator's output (§6). Using a *different, more capable* model for audit than for generation is deliberate: it avoids a model grading its own failure modes.

Harness responsibilities (pure, no side effects on `data/` or Supabase):
1. Load frozen inputs (graph node JSON, archetype library at pinned version, taxonomy contract, gold exemplars).
2. Render one prompt per node from the pinned template (§4).
3. Assemble batches (§3), submit, poll `processing_status` until `ended`.
4. Stream results, key by `custom_id`, write raw model output to `.authoring-tmp/regen/<node>/raw.json`.
5. Run schema validation (§5.2). Invalid → quarantine, do not advance.
6. Submit the audit sub-batch (§6). Compute pass/fail per batch.
7. Emit a per-batch report to `.authoring-tmp/regen/_reports/`.

### 1.2 Alternative: Claude Code authoring sessions

An agent-session approach (one mr-grunt/mr-kahn session per node or cluster, as the gold node was built) is the alternative.

| | Batch API + Python | Claude Code sessions |
|---|---|---|
| Cost @ 73 nodes | ~$60 total (§3.3) | 5–15× higher (interactive tokens, tool calls, re-reads, no batch discount) |
| Per-node latency | Amortized (<1h/batch) | Minutes/node, serial-ish |
| Determinism / replay | High (pinned template) | Low (model-driven trajectory) |
| Tool access mid-gen (grep graph, cross-check edges) | None | Full |
| Best for | High-volume uniform transform against a fixed archetype | Novel/ambiguous nodes needing live cross-referencing |

**When sessions win:** the gold node itself (novel, needed live registry cross-checks, human iteration) — correctly built as a session. For the remaining 73, the transform is *uniform against a now-fixed archetype*, which is exactly the Batch API's sweet spot. **Recommendation: Batch API for the 73, with a session fallback for individual nodes that fail audit twice** (§6.4) — those are, by definition, the non-uniform cases where tool-equipped iteration pays off.

---

## 2. Node ordering

Two candidate orderings for how nodes are assigned to batches:

**A. Dependency-cluster order** — walk the prerequisite DAG (114 edges; `prereqs[]` is source of truth) tier-by-tier (foundations → equations → linear → systems → exponents/polynomials → quadratics → data), batching nodes that share prerequisite context together (e.g. the linear cluster L01–L18 around the gold L05/L06 slope reference).

**B. Archetype-similarity order** — cluster nodes by the *item archetypes* they instantiate (e.g. "solve-for-x linear" nodes together, "rate/slope" nodes together, "factoring" nodes together) regardless of graph position.

**Decision: dependency-cluster order (A), archetype-similarity as the intra-cluster tiebreak.**

Justification:
- **Audit context compounds along prereqs.** An auditor checking L06 benefits from L05 already being regenerated and validated in an earlier batch; cross-node consistency (shared misconception tags, phase-progression continuity P1→P3, prerequisite-referenced worked examples) is a *dependency* property, not an archetype property. Ordering by archetype scatters a prereq chain across non-adjacent batches and defeats this.
- **Gold proximity.** The linear/slope cluster sits adjacent to the gold reference. Regenerating outward from the gold node means the earliest batches are the ones whose exemplars are closest, tightening the first audit gate when the pipeline is least calibrated.
- **Clean failure isolation.** If a prerequisite node fails audit and must be reworked, its dependents are still downstream (not yet generated), so no completed work is invalidated. Archetype order would routinely regenerate a dependent before its prerequisite.
- Archetype similarity still earns its keep *inside* a cluster: grouping same-archetype nodes within one batch maximizes prompt-cache reuse of the injected archetype templates (§4.3).

---

## 3. Batch sizing and cost estimate

### 3.1 Sizing: ~10 nodes per batch

Batch = **10 nodes**, giving **8 batches** (7×10 + 1×3). Rationale for 10 (well under the 100k-request API ceiling — the constraint is human review, not the API):
- Each batch is a **human audit + approval unit** (§6, §8). 10 nodes ≈ one reviewable sitting for mr-kahn.
- Small enough that a batch-level rejection (regenerate the whole batch) is cheap.
- Large enough to amortize the shared cached prefix (§4.3) across the batch.

### 3.2 Per-node token model

Anchored on the measured baseline (63 KB / ~16k-token live node file) and the gold-node enrichment delta.

| Component | Tokens | Notes |
|---|---|---|
| **Input — shared, cached across batch** | ~20k (write once, read ×9 @ ~0.1×) | System prompt + output schema + archetype library slice + full taxonomy-keying contract + registry tag slice |
| **Input — per-node unique** | ~15k | Live node JSON (~16k raw, trimmed to relevant fields) + 2–3 gold exemplar items (~4k) + node-specific archetype selection |
| **Output — enriched node** | ~40k | See enrichment target below |

**Enriched output target (per gold-node delta):** baseline 62 items → **~100 items/node** with per-item enrichment (3-rung hint ladder replacing 2 generic hints; expanded `misconceptionMap` with 2-hit/probe-confirmed keying; `visual` spec where the archetype requires it, replacing `null`; error-analysis items instantiating misconception signatures as shown work; representation-variety items (table/graph/verbal); rubric-scored explanation items carrying D4 rubric elements; transfer-battery structure across the 4 dimensions), plus worked examples with fading. JSON roughly ~150 KB / node ≈ ~40k output tokens. **This target is an input dependency on the frozen gold-node delta; the exact item count per node is set by the archetype library's per-node manifest (§4.2), not hard-coded here.**

### 3.3 Cost estimate (Batch pricing)

Per node (Opus 4.8, Batch 50%): input ≈ (20k shared amortized ≈ 2k/node effective + 15k unique) × $2.50/1M ≈ **$0.043**; output 40k × $12.50/1M ≈ **$0.50**. ≈ **$0.55/node**.

| Line | Nodes | Est. cost |
|---|---|---|
| Generation (Opus 4.8, Batch) | 73 | ~$40 |
| Regeneration loop overhead (~15% reruns) | — | ~$6 |
| Audit (Fable 5, Batch, 5% item sampling) | 8 batches | ~$12 |
| **Total** | | **~$58** |

Assumptions stated: no cache-miss penalty modeled beyond the amortization above; ~15% of nodes require one regeneration; audit samples 5% of items per batch (§6.1). A Sonnet-5 generator would cut the generation line ~40% (~$24 total) — pursue only if the §1.1 pilot clears audit parity. **These are planning numbers; the harness emits actuals per batch from `response.usage`.**

---

## 4. Prompt structure per node

One request per node. Rendered from a single pinned template; only the per-node payload varies.

### 4.1 What gets injected

| Injected | Source | Role | Cache tier |
|---|---|---|---|
| System prompt (author-role, constraints, phase rules P1→P3, structural-skin rule) | This spec, pinned | Frozen instruction | Shared (cached) |
| Output JSON schema (strict) | `types/problem.ts`-derived, pinned | Constrains output shape (§5.1) | Shared (cached) |
| Taxonomy-keying contract (§3 of taxonomy doc) | `docs/gold-node/misconception-taxonomy-slope.md` | The copy-to-all-nodes keying rules | Shared (cached) |
| Misconception registry slice | post-diff `data/algebra1-graph.json` registry | Legal tag vocabulary for this node's domain | Shared per domain-cluster |
| Archetype templates for this node's item types | Archetype library (§4.2) | The item molds to fill | Shared per archetype-cluster |
| **Node JSON** (target node) | live graph node | What to regenerate: objective, standards, prereqs, existing items, contextHooks | Per-node |
| **Gold exemplars** (2–3 items) | gold reference node | Few-shot quality anchor | Per-node (archetype-matched) |

Render order (for prompt-cache correctness, per `shared/prompt-caching.md`): `tools` (none) → `system` (frozen) → cached contract/schema/archetype blocks with a `cache_control` breakpoint on the last shared block → per-node volatile payload last. Stable-before-volatile; the node JSON and exemplars change every request and therefore sit after the final breakpoint.

### 4.2 Archetype library — required interface (does not exist yet)

The library is the missing load-bearing input. This spec defines the contract it must satisfy; authoring it is a separate gated task (mr-kahn APPROVE).

```
archetypes/
  manifest.json            # pinned version, e.g. "1.0.0"; maps nodeId -> archetype set + per-node item-count manifest
  archetypes/
    <archetype-id>.json    # one per reusable item mold
```

Each archetype entry MUST provide:
- `id`, `version`
- `itemForm`: closed-form | error-analysis | representation-variety | rubric-explanation | transfer-battery-slot
- `phaseApplicability`: which of P1/P2/P3 it may instantiate
- `representation`: numeric | table | graph | verbal | symbolic
- `hintLadderShape`: the 3-rung structure (root probe → targeted counter → worked micro-step; never the answer)
- `misconceptionSlots`: which registry-tag *categories* this archetype's distractors/error-analysis must instantiate
- `rubricElementRefs`: for rubric-explanation forms, the D4 rubric elements to score (each annotated with countered entry IDs — advisory only)
- `visualSpecShape`: schema reference for the `visual` field when non-null
- `solverContract`: how the harness (or a downstream cert step) can symbolically verify the item (item-certification pipeline, `new_plan/CLAUDE.md` §9)

`manifest.json` maps each of the 73 nodes to its archetype set **and target item count**, so the enriched output volume is data-driven, not prompt-hard-coded.

### 4.3 Context budget

Per-request input ≈ **35k tokens** (20k shared + 15k unique), output ≈ **40k**. Total well within Opus 4.8's 1M context. Output at 40k is under the 128k cap but **requires streaming inside the harness** for non-batch pilot calls; batch requests are not subject to the SDK HTTP timeout. `max_tokens` set to **64k** (headroom over the 40k target; truncation → `stop_reason: max_tokens` → treated as F-OVERFLOW, §7). Archetype-cluster intra-batch ordering (§2) maximizes cache reads on the archetype block.

---

## 5. Output contract

### 5.1 File layout under `.authoring-tmp/regen/`

**Nothing is written to `data/` or Supabase by this pipeline.** All output is staging under `.authoring-tmp/regen/`:

```
.authoring-tmp/regen/
  _manifest.json                 # run id, pinned model, pinned archetype version, batch->node map
  _reports/
    batch-<n>-report.json        # gen + validation + audit results, pass/fail, cost actuals
  <NODE-ID>/
    raw.json                     # verbatim model output (audit trail)
    node.json                    # schema-validated, normalized enriched node
    validation.json              # schema + taxonomy + solver check results
    audit.json                   # Fable audit verdicts for sampled items
    status                       # PENDING | VALID | AUDIT_PASS | AUDIT_FAIL | QUARANTINE
```

Promotion of a validated, audit-passed, human-approved node into `data/algebra1-graph.json` (or Supabase) is a **separate, explicitly gated implementation task** outside this spec (mr-gates + mr-kahn + Matt; see §8). This document's boundary ends at `.authoring-tmp/regen/`.

### 5.2 Schema validation step

Every `raw.json` passes, before it can become `node.json`:
1. **Strict JSON-schema validation** against the pinned output schema — use structured outputs (`output_config.format`, `json_schema`) on the generation request so the model is constrained at generation time, then re-validate the returned object host-side (belt-and-suspenders; structured outputs can still be incomplete on `max_tokens`).
2. **Taxonomy validation:** every `misconceptionMap` value and every rubric-element `counteredEntryId` must exist in the post-diff `misconceptionRegistry`. Unknown tag → validation fail (F-TAG, §7).
3. **Structural invariants:** `prereqs[]` unchanged from source graph; phase distribution present (P1/P2/P3, with P3 non-empty — mastery requires neutral transfer); every item has the 3-rung hint ladder; `skillId` matches node id; standards codes preserved.
4. **Solver check (where `solverContract` present):** each closed-form item's stated answer is symbolically verified (item-certification pipeline hook). Mismatch → validation fail.

Validation failures never advance and never touch `data/`; they route to QUARANTINE for regeneration or session-fallback.

---

## 6. Audit gate mechanics

### 6.1 Sampling

**5% of generated items per batch**, stratified so the sample spans every node in the batch and every item form (closed-form, error-analysis, representation-variety, rubric-explanation, transfer-battery). At ~100 items/node × 10 nodes = ~1000 items/batch → **~50 audited items/batch**. Stratification guarantees no node and no form is unaudited even at 5%.

### 6.2 Fable audit prompt spec

One audit request per sampled item (batched as a Fable sub-batch). Injected: the item JSON, its node's objective + standards, the taxonomy-keying contract, the archetype it claims to instantiate, and the D4 rubric contract (for rubric-explanation items). Forced structured output:

```json
{
  "itemId": "string",
  "checks": {
    "mathematicallyCorrect": "bool",
    "answerMatchesWork": "bool",
    "hintLadderValid": "bool",        // 3 rungs, never reveals answer
    "misconceptionTagsValid": "bool", // tags exist + genuinely match the distractor/error-work
    "phaseAppropriate": "bool",       // P1/P2/P3 context matches declared phase
    "representationFaithful": "bool", // table/graph/verbal actually encodes the structure
    "rubricElementsScoreable": "bool",// rubric-explanation only; matches D4 contract
    "structuralSkinRuleRespected": "bool", // interest context IS the math, no seductive-detail wrapper
    "difficultyPlausible": "bool"
  },
  "severity": "none | minor | major | fatal",
  "failingChecks": ["string"],
  "rationale": "string"
}
```

### 6.3 Pass/fail criteria

- **Item fails** if any check is `false` with `severity ∈ {major, fatal}`. `minor` findings are logged, not failing.
- **Batch passes** if the sampled failure rate is **≤ 5%** AND there are **0 `fatal`** findings. Any `fatal` (wrong math, tag that would mis-route a student, answer/work mismatch) fails the batch regardless of rate — these are accreditation-evidence integrity failures.

### 6.4 Rejection and regeneration loop

- **Batch fail:** every node in the failed batch returns to generation with an *augmented* prompt — the audit `failingChecks` + `rationale` for that node's sampled items are injected as negative constraints ("prior attempt failed X; do not repeat"). Regenerate → re-validate → re-audit. **Max 2 automated regeneration rounds per batch.**
- **After 2 failed rounds:** the batch's failing nodes escalate to **Claude Code session fallback** (§1.2) — tool-equipped per-node authoring, since repeated batch failure signals a non-uniform node. This is a human gate (Matt notified).
- **Full-batch escalation:** two consecutive batch REJECTs on the *same* proposal escalate to Matt per `CLAUDE.md` (two-REJECT rule).

---

## 7. Failure modes

| ID | Failure | Detection | Handling |
|---|---|---|---|
| **F-SCHEMA** | Schema-invalid output (missing fields, wrong types) | §5.2 step 1 | Quarantine node; regenerate (structured-output constraint should make this rare). Never advances. |
| **F-TAG** | Taxonomy tag misuse (unknown tag, or valid tag on a non-matching distractor) | §5.2 step 2 (existence) + audit `misconceptionTagsValid` (semantic) | Existence failure → quarantine + regenerate. Semantic failure → audit-fail path (§6.4). Mis-keyed tags corrupt runtime routing, so treated as ≥major. |
| **F-OVERFLOW** | Context/output overflow on a large node (item count × enrichment exceeds `max_tokens`) | `stop_reason == "max_tokens"` or truncated JSON | Split node generation by phase (P1 request, P2 request, P3 request) and merge host-side; re-validate the merged node. Large nodes are flagged in the archetype manifest so they're split preemptively. |
| **F-PARTIAL** | Partial batch failure (some `custom_id`s error/expire) | Batch result `.result.type ∈ {errored, expired}` | Key by `custom_id`; resubmit only the failed ids in a follow-up batch. Never re-key by position. Succeeded nodes proceed independently. |
| **F-DEP** | Registry diff not yet applied / archetype library not frozen | Precondition check at harness start | **Hard stop.** Pipeline refuses to run against an un-pinned archetype version or pre-diff registry (would key tags against a stale vocabulary). |
| **F-DRIFT** | Generator quality drifts mid-run (later batches worse) | Audit pass-rate trend across batches in `_reports/` | If pass-rate degrades across ≥2 batches, halt and re-pin exemplars / re-pilot model choice before continuing. |

---

## 8. Human gates (Matt approves — explicitly marked)

Per `CLAUDE.md` workflow. Gated (curriculum/accreditation-touching) content **cannot** be implemented without the marked approvals.

1. **[GATE — mr-kahn APPROVE]** Archetype library design + per-node manifest, *before* any generation. (Touches problem content + standards mapping.)
2. **[GATE — mr-kahn APPROVE]** Confirmation that the misconception registry diff is applied and the tag vocabulary is frozen. (Mastery-tag posture.)
3. **[GATE — mr-gates APPROVE]** The harness itself (spans batch I/O + schema/types + validation) before it runs — read-only against `data/`, but it's a 3+-module tool.
4. **[HUMAN CHECKPOINT — Matt]** Pilot result (3-node Opus vs. Sonnet A/B) → approve generator model + go/no-go on the full run.
5. **[GATE — per batch, mr-kahn APPROVE]** Each batch's audit report before the batch is considered done. Audit PASS is necessary but not sufficient — mr-kahn signs off.
6. **[HUMAN CHECKPOINT — Matt, END OF PHASE]** Full-run demo summary + diff of `.authoring-tmp/regen/` + open questions.
7. **[SEPARATE GATED TASK — NOT THIS SPEC]** Promotion of approved nodes from `.authoring-tmp/regen/` into `data/algebra1-graph.json` / Supabase. Requires mr-gates (schema/migration) + mr-kahn (content) + Matt (commit). This document's authority ends at staging.

---

## Appendix A — pinned parameters (fill at run authoring)

| Parameter | Value |
|---|---|
| Generation model | `claude-opus-4-8` (pilot A/B vs `claude-sonnet-5`) |
| Audit model | `claude-fable-5` |
| API surface | Message Batches (`/v1/messages/batches`), 50% pricing |
| Structured output | `output_config.format` = `json_schema` (strict), re-validated host-side |
| `max_tokens` | 64000 (split-by-phase for manifest-flagged large nodes) |
| Batch size | 10 nodes (8 batches) |
| Audit sampling | 5% of items/batch, stratified by node × item-form |
| Batch pass bar | ≤5% sampled failure AND 0 fatal |
| Max auto-regen rounds | 2, then session fallback |
| Archetype library version | PIN before run (F-DEP hard-stops if unset) |
| Registry state | post-diff, frozen (F-DEP hard-stops if pre-diff) |
| Output root | `.authoring-tmp/regen/` (never `data/`, never Supabase) |
