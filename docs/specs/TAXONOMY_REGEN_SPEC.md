# TAXONOMY_REGEN_SPEC — Phase 3 Per-Node Misconception-Taxonomy Generation

**Status:** DRAFT (design-only). No code, no data writes, no Supabase writes, no commits authorized by this document.
**Owner:** Main session (orchestrator). Gated approvals required before any implementation (see §11).
**Scope:** Generate **74 per-node misconception taxonomies** (the non-gold nodes at graph `1.12.0`) to the `TAXONOMY_TEMPLATE.md` bar. This is the **F-DEP supplier for BATCH_REGEN**: GAP_NOTES §4.1 and TAXONOMY_TEMPLATE §6 make a conforming, mr-kahn-approved taxonomy a per-node hard stop for bank generation — no approved taxonomy, no bank batch entry. This pipeline is therefore the load-bearing Phase-3 blocker, and it is *larger authorship than the archetype library itself* (GAP_NOTES §4.1).
**Companion docs:** `docs/archetypes/TAXONOMY_TEMPLATE.md` (the contract each output fills), `docs/gold-node/misconception-taxonomy-slope.md` (the gold instance, pinned few-shot exemplar), `docs/specs/BATCH_REGEN_SPEC.md` (the consumer pipeline; structural conventions mirrored here), `docs/archetypes/MANIFEST.md` (§3 node classes, §4 archetype demands), `docs/archetypes/GAP_NOTES.md` (§2.1, §2.2, §4.1 degradation postures), `docs/specs/DECISION_F-IF-B6.md` (§4 — ALG-L19 pre-sketched surface).

---

## Model configuration (single source of truth)

Every model ID used by this pipeline is defined **once** here. The rest of the spec refers to these constants by name — do not inline a raw model string anywhere else. To change a model, edit this table only.

| Constant | Model ID | Batch price ($/1M in / out) | Role |
|---|---|---|---|
| `TAX_DRAFT_MODEL` | `claude-opus-4-8` | $2.50 / $12.50 | Mechanical scaffolding drafts (§1.3 draft pass) |
| `TAX_JUDGMENT_MODEL` | `claude-fable-5` | $5.00 / $25.00 | Belief-level authorship (§1.3 judgment pass) |
| *(audit)* | — none — | — | **Audit is harness (deterministic layers) + mr-kahn (judgment layers). No LLM audit model exists in this pipeline** — see §6 for why the BATCH_REGEN different-model audit principle cannot be satisfied here and what replaces it. |

---

## 0. Preconditions and dependencies

This pipeline **cannot start** until all of the following exist in the pinned state stated below. Any failure is an **F-DEP hard stop** (§10), checked at every harness start.

| Dependency | Produced by | State needed | Stance |
|---|---|---|---|
| `TAXONOMY_TEMPLATE.md` | Archetype-library authoring | **Frozen** (mr-kahn APPROVE — currently DRAFT) | The output contract. Freezing it is §11 gate 1. Version pinned in Appendix A; a template edit mid-run invalidates the pin and hard-stops. |
| Misconception registry | graph-mutations-v1.12 + subsequent gate-6 applications | **Pinned per batch (rolling)**: the batch's pin = the 163-entry post-`1.12.0` state ∪ every diff applied by prior gated graph-mutation batches (§6.6 / §11 gate 6), recorded in the batch's `_manifest.json`. F-DEP checks the **batch's** pin (§10); registry growth is legal **only** via gate-6 gated applications. | Legal tag vocabulary. Each taxonomy may *propose* a registry diff (§6.6); it never applies one. A hard "frozen at 163" pin was rejected at the gate review: batch 2 would F-DEP on the consequences of batch 1's own approval (its applied ADDs move the registry past 163), and batch-5 nodes legitimately reuse batch-2 ADDs — cross-node reuse is the norm (the gold ADDs recur across the whole linear cluster). |
| Graph baseline | `data/algebra1-graph.json` | **Pinned per batch (rolling, same rule as the registry)**: `1.12.0` (75 nodes, 117 edges) at batch 1; thereafter the latest gate-6 gated application state, recorded in the batch's `_manifest.json` | Read-only input: node objective, standards, prereqs, item banks (error-pattern mining), `misconceptionTags`. |
| Gold taxonomy | `docs/gold-node/misconception-taxonomy-slope.md` | APPROVED + merged | **The pinned few-shot exemplar** for both passes. Never regenerated. |
| **Confusable-cluster map** | **This pipeline's REQUIRED pre-step** (does not exist yet) | Authored + **mr-kahn APPROVE** (§11 gate 2) | One document, derived from graph edges + Axis-B interleaving rules, mapping each node's confusable neighbors (the concept it is most mistakable for, and why). GAP_NOTES §2.1 names this the de-risk for the ≥2-boundary floor (TEMPLATE §4.5 row 3) and notes it "is not yet scheduled anywhere" — it is scheduled **here**, before batch 1. It feeds the draft pass's boundary-entry search directly; without it, boundary discovery is per-node improvisation across 74 nodes. |
| MANIFEST node-class assignments | `manifest.json` derivation (BATCH_REGEN §8 gate 1, still open) | Class per node, mr-kahn-signed | Needed to select each node's §4.5 demand row and §5 band. Minimum viable: class assignments signed **per taxonomy batch** before that batch renders (full-74 sign-off preferred, per-batch acceptable — the rolling schedule in §8 only consumes 10 at a time). |
| `verified-citations.json` | This pipeline (harness-managed) | Initialized, seeded from the gold doc's research base (§2.4) | The citation-verification registry. Created empty except for gold-seeded works before batch 1. |

**Node inventory (74).** 75 nodes at `1.12.0` minus the gold reference (ALG-L06). Two special cases inside the 74:
- **ALG-L05** — partially covered by the gold *cluster* doc (TEMPLATE §2 cluster-scope rule: one doc may span a cluster, but each covered node must individually satisfy §4.5). L05's deliverable is a **completion/conformance pass** against the existing gold doc — verify every §4.5 row for L05 specifically, author what is missing (its own §3 restatement, L05-scoped collision matrix view, §2.14's post-L19 revision) — not fresh generation. It still produces the full §9 output set. This is why GAP_NOTES §4.1 counts "~72" fresh taxonomies against this spec's 74 deliverables.
- **ALG-L19** — no baseline bank (stub at `1.12.0`); its misconception surface is pre-sketched in DECISION_F-IF-B6 §4 (5 tags shared with the gold doc + 1 unapproved candidate). Pilot node (§7); its taxonomy also executes the gold doc's deferred §2.14 primary-home revision. Its taxonomy's **generator constraints and worked examples inherit DECISION_F-IF-B6 §7's binding authoring constraint**: nonlinear relations are *presented* only (graph, table, or pre-evaluated values); no vertex/factoring/exponential manipulation; symbolic work = direct substitution per L03.

---

## 1. Generation structure — HYBRID (settled; both pure paths costed and rejected)

The taxonomy job splits into two layers of unequal difficulty:
- **The mechanical ~60%:** candidate entry list (from node objective, baseline item-bank error patterns, prereq structure, the confusable-cluster map), detection signatures + generator constraints, worked examples, the §3-contract restatement. Pattern-following against a strong template; verifiable deterministically (§3–§4).
- **The judgment ~40%:** belief-level definitions (what the student thinks is TRUE), cognitive roots, severity + routing calls, merge/reject decisions (§2.15-class), collision-matrix disambiguation probes, literature grounding with §2's honesty tiers. This is where the gold taxonomy's value concentrates — and it is the layer that **routes live students backward**. A wrong severity call or an invented belief writes remediation routing for real students.

### 1.1 Path A — `TAX_DRAFT_MODEL` generates, `TAX_JUDGMENT_MODEL` audits (straight BATCH_REGEN mirror) — REJECTED

Cost: generation ≈ 30k in / 11k out per node at Batch pricing → 30k×$2.50/1M + 11k×$12.50/1M ≈ **$0.21/node**; a 100% Fable audit pass (≈12k in / 1.2k out) ≈ **$0.09/node**; ≈ **$0.30/node → ~$25 total** (74 nodes, +15% regen).

**Rejected on quality, not cost:** the belief-level analysis is precisely what degrades in volume generation — it is judgment, not transformation, and the 74 nodes have no per-node exemplar the way bank items have archetype molds. An audit can catch fabrication and structural defects; **it cannot inject insight that was never generated.** An audit-shaped pipeline produces taxonomies that *pass checks* while carrying generic, root-less belief statements — the exact failure mode that makes routing plausible-looking and wrong.

### 1.2 Path B — `TAX_JUDGMENT_MODEL` generates everything directly — REJECTED as the sole path

Cost: ≈ 30k in / 11k out at Fable Batch pricing → 30k×$5.00/1M + 11k×$25.00/1M ≈ **$0.43/node → ~$37 total** (74 nodes, +15% regen).

**Rejected because it leaves no independent model audit:** Fable cannot self-audit (BATCH_REGEN §1.1's own principle — a model must not grade its own failure modes), and Opus auditing Fable **inverts capability** — the weaker model cannot reliably catch the stronger model's subtle judgment errors. Path B therefore pushes the *entire* audit load onto mr-kahn, with no automated layer between generation and the human gate beyond the harness.

### 1.3 HYBRID — ADOPTED

Two batch passes per node, strongest model exactly where students get routed:

1. **Draft pass (`TAX_DRAFT_MODEL`):** the mechanical 60% — candidate entry list with detection signatures in machine-evaluable form (§3.2), generator constraints, worked examples (parameterization + computed trap + correct answer), step-locality, propagation forms, presentation-class marks, archetype-eligibility flags, and the node's §3-contract restatement scaffold. Inputs: node JSON (objective, standards, prereqs, `misconceptionTags`), a baseline item-bank slice (existing `misconceptionMap` keys + distractor patterns — the empirical error surface already observed), the node's confusable-cluster map row, the gold doc's §2 entry anatomy as few-shot.
2. **Draft harness check (fail fast, cheap):** §3's signature computability + constraint satisfiability run on the *draft*, and the **machine collision list** (§4.1) is computed here. F-SIG at draft stage → one cheap redraft with findings as negative constraints, before any judgment tokens are spent.
3. **Judgment pass (`TAX_JUDGMENT_MODEL`):** the judgment 40% — belief definitions, cognitive roots, severity bands + routing destinations + BLOCKER reason strings, remediation moves, merged/rejected/not-an-error records (§2.15-class), disambiguation probes for **every row of the machine collision list** (injected as input — collision recall is engineered at generation, then guarded at audit, §4.2), grounding tier per entry with citations drawn from or queued into the verification registry (§2). The judgment pass may also **strike or merge draft entries** — it owns admission condition 1 (belief, not wrong output) and the no-padding record. It may equally **ADD entries the draft search missed**: any addition carries the **full mechanical field set** (§1.5 draft-owned fields included — signature in a §3.2 evaluable form, generator constraints, worked example, step-locality, propagation form, presentation-class mark, eligibility flags) and **re-triggers §3 signature verification and §4.1 collision computation at assembly** — step 5's full harness re-run is mandatory after an addition, not optional (§4.2 extends its entry-change rule to entry addition for exactly this case).
4. **Assembly (harness, deterministic):** merge judgment output over the draft scaffold into `taxonomy.md` per the TEMPLATE §2 structure. No model call.
5. **Full harness verification** (§3 + §4 + structure-vs-TEMPLATE + registry-tag hygiene) on the assembled doc; then citation verification (§2.4); then the mr-kahn gate (§6).

**Cost:** draft ≈ $0.21/node (as Path A generation) + judgment ≈ 33k in / 6k out → 33k×$5.00/1M + 6k×$25.00/1M ≈ **$0.31/node**. Total ≈ **$0.52/node**. Raw 74-node run ≈ $38.5; ≈ **~$41** with pilot double-runs and the L19 fresh-authoring premium (no baseline bank to mine — heavier draft input); ≈ **~$47** with 15% regen; **+~$2 total** citation-verification overhead (web lookups are cheap; the cost is session attention) → **~$47–50 all-in** (§8 budget table).

State plainly: **the cost driver is quality, not dollars — all three paths land under $50.** The hybrid is not a cost optimization; it buys the strongest model exactly for the layer where a generation defect becomes a live mis-route, while keeping the mechanical layer on the cheaper model *because the harness can verify that layer deterministically*.

### 1.4 Prompt structure and cache tiers (both passes)

Both passes run through the **Message Batches API** (50% pricing, `custom_id`-keyed, unordered results — same rationale and mechanics as BATCH_REGEN §1.1; the harness is a pure function of frozen inputs, pinned models, pinned templates). Render order per `shared/prompt-caching.md`: stable-before-volatile, `cache_control` breakpoint on the last shared block.

| Injected | Pass | Cache tier |
|---|---|---|
| System prompt (role, TEMPLATE §1 admission conditions, §7 honesty rules verbatim, severity scale definitions) | both | Shared (cached) |
| TAXONOMY_TEMPLATE §2–§5 (structure + per-entry fields + §4.5 table + keying contract shape) | both | Shared (cached) |
| Gold taxonomy — full doc (the few-shot exemplar; §2 entry anatomy, §2.15, collision matrix, §3, §4) | both | Shared (cached) |
| Grounding-tier definitions + `verified-citations.json` current registry (works available for reuse with their verified claims) | judgment | Shared per batch (registry grows between batches) |
| Registry slice (the node's domain-cluster tags + descriptions) | both | Shared per domain-cluster |
| Node payload: node JSON + baseline-bank error slice + confusable-cluster row + MANIFEST class row (§4.5 demands + §5 band) | draft | Per-node |
| Node payload: assembled draft + machine collision list + draft-harness report | judgment | Per-node |

Draft input ≈ 30k effective (≈20k shared amortized across a 10-node batch ≈ 2k effective + ≈12k per-node, rounded up for the L19-class heavy nodes); draft output ≈ 11k (a 14-entry doc's mechanical layer ≈ gold's §2 signature/constraint/example volume). Judgment input ≈ 33k (shared prefix + 11k draft + collision list); judgment output ≈ 6k (belief/root/severity/probe/grounding prose across ≤14 entries + §2.15 records). These are planning numbers; the harness emits actuals per batch from `response.usage`.

### 1.5 Field-ownership map — all fifteen TAXONOMY_TEMPLATE §3 fields

Every per-entry field has exactly one owning pass. Draft-owned fields are harness-verifiable (§3–§4); judgment-owned fields are kahn-audited (§6.2 step 3). The judgment pass may overwrite any draft field when it strikes/merges/adds an entry (§1.3 step 3); ownership names who authors the field on the normal path.

| TEMPLATE §3 field | Owning pass |
|---|---|
| §3.1 Entry ID / tag naming | draft (candidate list); judgment renames on strike/merge/add |
| §3.2 Student-belief statement | judgment |
| §3.3 Cognitive root | judgment |
| §3.4 Severity band | judgment |
| §3.5 Closed-form detection signature | draft |
| §3.6 Step-locality | draft |
| §3.7 Generator constraints | draft |
| §3.8 Belief-form rewrite | **judgment** — the wrong *reading* is belief authorship; the asserted-quantity recomputation on candidate item numbers is mechanical-subordinate (recomputed under the judgment-authored reading at assembly) |
| §3.9 Propagation form | draft |
| §3.10 Presentation-class sensitivity | draft |
| §3.11 Remediation move | judgment |
| §3.12 Nodes / homes / routing | judgment |
| §3.13 Grounding | judgment |
| §3.14 Worked example | draft |
| §3.15 Archetype-eligibility flags | draft |

Node-level split for the **§5.1 exemplar hint ladder** (TEMPLATE §5.1): **rungs 1–2 judgment** (rung 1 is the root probe, rung 2 the entry's remediation move miniaturized — both judgment-owned material), **rung 3 draft** (the first correct micro-step — mechanical).

---

## 2. Literature honesty standard

Every entry carries **exactly one** grounding tier. The tier vocabulary is shared with TEMPLATE §7.1/§3.13, where it was folded in pre-freeze (2026-07-06, mr-kahn ruling at this spec's gate — it replaced the earlier cited-vs-engineering-observed binary): tier 1 and tier 2 both cite their research tradition (tier 2 carries the mandatory extrapolation flag); tier 3 is the former engineering-observed mark under the shared naming.

| Tier | Meaning | Obligation |
|---|---|---|
| `literature-grounded` | Names work(s) **and the specific claim used** (gold model: Stump 1999/2001 on visual steepness — not "Stump wrote about slope") | Work(s) must be in `verified-citations.json` (verified or queued, §2.4) with the claim recorded |
| `tradition-adjacent` | Domain literature exists but does not attest **this specific belief** — the entry cites the tradition and is **FLAGGED "extrapolated from [tradition]"** in the entry text | Tradition's anchor work(s) verified; the extrapolation flag is student-invisible but audit-visible |
| `engineering-candidate` | No literature — grounded in first-principles cognitive analysis, **stated in the entry** (what model failure produces this belief and why it is stable), **FLAGGED for pilot-data validation** (gold §2.7/§2.13 precedent) | The first-principles analysis is a required entry component; a bare "engineering-candidate" label with no analysis is F-INVENT (§10) |

### 2.1 F-CITE is FATAL-CLASS

**A fabricated or decorated citation fails the whole node's taxonomy** regardless of every other quality — not the entry, the node. An uncited-but-flagged entry is fully compliant; **a plausible-looking fake is the worst artifact this pipeline can produce**: it launders an invented belief into "research-backed" routing evidence and poisons the accreditation trail. "Decorated" includes: real work, wrong claim attributed to it; real authors, invented paper; real paper, invented finding-specificity (citing page-level precision the verifier cannot confirm at abstract level is *not* decoration; asserting a finding the abstract contradicts is).

### 2.2 No auto-repair

The auditor (harness or mr-kahn) **never repairs a citation**. A mismatch is F-CITE; the fix is regeneration with the finding as a negative constraint, or downgrade-by-regeneration to `tradition-adjacent`/`engineering-candidate` **by the judgment model in a regen round**, never by edit-in-place. Silent repair would erase the evidence that the generator fabricates.

### 2.3 `verified-citations.json` — the registry

Lives at `.authoring-tmp/taxonomies/_registry/verified-citations.json` (promoted to `docs/taxonomies/_registry/` with the docs, §9 — it is itself an audit artifact). One record per distinct cited work:

```
{
  "key": "stump-1999",                       // author-year; -a/-b suffix on collision
  "authors": [...], "year": 1999, "title": "...", "venue": "...",
  "verified": { "date": "...", "by": "main-session", "method": "web-lookup",
                "source": "https://... | doi:... | consulted-record ref",
                                               // REQUIRED evidence field: the URL/DOI/consulted record
                                               //   behind the verification — events reconstructable, not asserted
                "existence": true },          // author/title/venue/year all confirmed to exist
  "claims": [ { "claim": "slope conceived as visual steepness/angle rather than ratio",
                "consistency": "abstract-consistent",   // abstract-level judgment
                "firstUsedBy": "ALG-L06" } ],
  "status": "verified | queued | FAILED"     // FAILED is permanent — the key is burned
}
```

### 2.4 Verification protocol

- **Verified ONCE, reused across nodes.** Slope literature recurs across the whole linear cluster; a work verified for one node is legal for every later node *for the claims recorded* — a **new claim against a verified work re-enters the queue for claim-consistency only** (existence is settled).
- **Verification = web lookup** (author/title/venue/year exist as stated) **+ claim-consistency judgment at abstract level** (does the work's abstract/known findings support the claim used — not a full-text review). Performed by the main session with web tools; recorded in the registry; deterministic thereafter.
- **New citations** emitted by a judgment pass land in `citations-delta.json` (§9) and enter the verification queue. A taxonomy **cannot reach the mr-kahn gate** with unverified first-use citations — verification is a pipeline stage, not an option.
- **Seeding:** the gold doc's research base (Stump, Lobato & Thanheiser, Lobato/Ellis/Muñoz, Simon & Blume, Hart, De Bock & Van Dooren, Leinhardt/Zaslavsky/Stein, McDermott, Beichner, Postelnicu, Cho & Nagle, Lamon, Cramer & Post, Bezuidenhout, Karplus) is verified into the registry before batch 1 — it immediately covers the gold-adjacent linear cluster that batches first (§8).
- **Spot-check floors:** **100% of first-use citations** (every new work, every new claim); **10% re-verification sample per batch** against the registry (guards registry corruption and claim drift — a reused key whose recorded claim no longer matches how an entry uses it is a first-use claim in disguise).

---

## 3. Detection-signature verification (harness, deterministic)

The gold doc's notation preamble is load-bearing: *every detection signature is a computable function of the item parameters.* This section makes that mechanically checked for all 74 nodes.

### 3.1 The K-sample check

For **every signature-bearing entry**: instantiate the signature over **K = 25** parameter sets sampled under the node's generator constraints (rejection sampling over the declared parameter space), and assert:

1. **(i) Closed-form computable** — the signature evaluates to a value (number, tuple/construct state, or keyed option) on every sample. No evaluation error, no free variable, no "approximately."
2. **(ii) Outside grading tolerance of the key** on **every** constrained sample — bare inequality is not enough; the trap must be armed and separated from the correct answer by **more than the grading tolerance** under the entry's own constraints (the gold §2.9 minimum-separation rule / TEMPLATE §3.7(iii), promoted from render-time to author-time).
3. **(iii) Pairwise outside grading tolerance** of every other live entry's value on every sample, **except** where the collision matrix documents the pair (§4) — the same tolerance standard as (ii) (gold §2.9 / TEMPLATE §3.7(iii)), not bare distinctness. This is the automated form of the error-analysis "mismatch arithmetic" standard (archetype-error-analysis: distractor beliefs must *provably* mismatch the shown work).

**Stratified boundary sampling (required):** the K samples are **not** pure uniform rejection draws. The sampler deliberately includes admissible **boundary and degenerate parameter values** — sign boundaries, zero-valued parameters, minimum magnitudes, x₁ = x₂-class cases — wherever the constraint region admits them. Parameter-conditional collisions concentrate exactly at those values, and recipe-form signatures (§3.2) have **no symbolic layer** to catch what sampling misses — stratification is their only conditional-collision detector.

**Why K = 25:** a parameter-conditional collision live on ≥12% of the admissible region is detected with >95% probability (1 − 0.88²⁵ ≈ 0.96); rarer conditional collisions are the symbolic layer's job (§4.1), the stratified boundary draws' job (above), and the collision matrix's job to document. K = 25 × ≤14 entries × pairwise comparisons is trivial compute; raising K is free if pilot data shows misses.

### 3.2 Machine-evaluable signature forms

The draft pass emits every signature in one of three evaluable forms (prose restatement is additional, never a substitute):

| Form | Evaluation | Example (gold) |
|---|---|---|
| **Numeric expression** over the node's declared parameters | Direct evaluation (symbolic where expressible) | `Δy`, `−m`, `m·s_x/s_y` |
| **Construct-state tuple/predicate** over parameters | Tuple evaluation + state comparison | `(x₀ + run, y₀ + |rise|)` (§2.4) |
| **Keyed-construction recipe** (choice items) | Structural check: the recipe names the option-construction function; assertion (i) becomes "the recipe instantiates a distinct option on all K samples" | §2.12's visually-steeper-but-numerically-smaller panel |

Honest limit, stated: recipe-form signatures verify **construction**, not student behavior — assertion (i) is weaker for them than for numeric forms. The judgment pass and mr-kahn carry the residual "does this belief actually select that option" question; the harness guarantees only that the option is buildable and distinct.

### 3.3 Failure classes

- **Non-computable signature = F-SIG.** The entry is **quarantined — never shipped as prose-only.** A prose-only "signature" is undetectable at runtime, which makes the entry dead weight at best and a false-confidence artifact at worst.
- **Constraint-arming check:** each entry's generator constraints must be **satisfiable** — a non-empty parameter region. Operationally: rejection sampling must find K valid parameter sets within N = 10,000 attempts; failure = **F-SIG** (an unsatisfiable constraint set means the trap can never arm — the entry is untestable as written).
- Assertion (ii)/(iii) failures = F-SIG (a signature that lands within grading tolerance of the key, or within tolerance of another entry's value on an undocumented pair, is a constraint defect: either add the arming constraint or document the collision — the regen round decides, never the harness).

---

## 4. Collision matrices at scale

### 4.1 Machine ground truth

The harness computes the collision ground truth per node: **pairwise signature coincidence within grading tolerance over the K-sample grid + symbolic equality where expressible** (numeric-expression forms get a symbolic pass — identities like `−m = |m| ⟺ m < 0` are caught exactly, not sampled; the sampled arm uses the same grading-tolerance separation standard as §3.1, since runtime attribution cannot distinguish values a tolerance window merges). Output: the **machine collision list** — every pair of live entries whose signatures coincide under some admissible parameterization, with the realizing condition. Entries include registry boundary tags the doc states signatures for (the gold matrix's `reverses-x-and-y` row pattern).

### 4.2 Recall requirement

- The generated matrix **must contain EVERY machine-detected collision. Omission = F-COLL, fatal** — an undocumented collision means a runtime hit keys a single tag where two beliefs are live, which **writes misattributed evidence** into the immutable attempt log and routes students on it. There is no minor version of this defect.
- By construction the judgment pass receives the machine list as input (§1.3 step 3), so recall failures should be regression-rare; F-COLL guards assembly and regen rounds, where entries change **or are added** after the list was computed (the judgment pass has ADD authority — §1.3 step 3). Any entry change **or entry addition** re-runs §4.1.
- **Extra documented collisions** (parameter-conditional pairs the model asserts beyond the machine list) are checked against the grid + symbolic layer: realizable → legal row (document it); not realizable under the stated constraints → finding for mr-kahn (either the generator constraint already excludes it — then it converts to a constraint note, the gold "y₁ ≠ 0" pattern — or the claim is wrong and regens out).

### 4.3 Disambiguation probes (judgment)

- Every matrix row carries a **named probe** authored by `TAX_JUDGMENT_MODEL` as an **authorable item spec** per TEMPLATE §4.4: task type (the deciding observable), arming condition, and what each outcome re-attributes to or activates. Gold models: the positive-slope follow-up (§2.2), the plot probe (§2.3), the unit-labeled choice (§2.10), the construct-vs-numeric task split (§2.4).
- **mr-kahn audits every probe (100%)** — probe discrimination is a judgment call no grid can verify: the harness can check the probe's arming condition is satisfiable, but only kahn can check that the two beliefs actually part ways on the observable. A probe that cannot discriminate its pair = **F-PROBE** (§10).
- **Default rule, inherited from gold and stated in every node doc: log-both-tag-neither until the probe resolves.** This is also the runtime safety net for GAP_NOTES §3.1 (no probe-priority channel exists in the selector yet): probes ship as authored content + logged-advisory, the pair never mis-routes, and every node with a non-empty matrix carries the `probe-queue-unspecced` flag so the engine debt stays sized.

---

## 5. Node-class variance and floors

### 5.1 The real floor

The binding floor is **TAXONOMY_TEMPLATE §4.5's table** (≥4 closed-form-signature entries, ≥3 belief-rewritable, ≥2 boundary, ≥2 predicate-expressible, error-analysis root-spanning count per MANIFEST §4, the REQUIRED structures), selected by the node's MANIFEST §3 class → §4 demand row. The harness checks every countable row; mr-kahn checks the judgment rows.

### 5.2 Expected entry-count bands (instrumentation, not floors)

Anchor: gold conceptual = **14 entries** (§2.1–§2.14). Bands are **anomaly instrumentation** — an out-of-band count triggers scrutiny, never automatic failure in either direction:

| Class | Band | Rationale |
|---|---|---|
| conceptual | **10–14** | Gold is the ceiling anchor — the best-researched, richest surface (mr-kahn's own §5 verdict: the ideal case). Meaning-rich nodes carry belief clusters, boundary entries, and degenerate cases; below 10 on a conceptual node means the search likely stopped early. |
| word-problem / modeling | **9–12** | Translation nodes stack context-reading beliefs (referent errors, quantity-mapping errors) on top of the computational surface — richer than procedural, thinner than a full concept cluster. No gold comparator (see §7's honest note). |
| graphing / representation | **8–12** | The gold graphing family (§2.4, §2.11, §2.12) shows visual/construct signatures are plentiful, but a graphing node's skill is narrower than a concept node's meaning space. |
| procedural | **6–10** | GAP_NOTES §2.2: thin belief surfaces, mostly slips — and slips are *not entries* (no stable belief). 6 is the practical floor at which the §4.5 binding rows remain satisfiable given legal overlap (one entry may satisfy several rows). |

Below band → the audit verifies the shortfall documentation before anything else; above band → **padding suspicion**, heightened kahn attention on the §2.15 record (did candidates that should have merged stay split?).

### 5.3 Degradation (GAP_NOTES-consistent)

A node that honestly cannot meet a §4.5 floor:
1. **Documents the search** in its §2.15-class section — what was looked for (literature sweep by tradition, first-principles sweep over the procedure's steps, confusable-cluster row), and what it found.
2. **Flags `taxonomy-floor-shortfall`** (with the specific row) in the harness report and batch report.
3. **MANIFEST reallocates the starved archetype instances** per the GAP_NOTES rules already in force (pr-shortfall → error-analysis/discrimination; boundary-shortfall → reduced discrimination count; thin-surface → sub-floor bank, flagged) — the taxonomy states the fact; the manifest takes the consequence. **Never pad.**

Verbatim principle, carried in the system prompt of both passes and in every audit charge: **an invented misconception is worse than a missing one — it routes real students to remediation for beliefs they don't hold.**

---

## 6. Audit gate

### 6.1 100% entry-level audit — justified

Unlike BATCH_REGEN's sampled item audit (100-item banks, ramped 10%→5%), this pipeline audits **every entry of every taxonomy**: docs carry ~6–14 entries, every entry is a routing rule for live students, and the marginal cost of full coverage is trivial (the harness layers are compute; the kahn layers are ~10 docs per sitting). Sampling would save nothing and leave routing rules unreviewed.

### 6.2 Layer order — harness gates advancement

1. **Harness (deterministic, first):** §3 signatures + constraints, §4 machine collisions + matrix recall, structure-vs-TEMPLATE (every §2 section present, every §3 per-entry field present-or-explicitly-marked, §4.5 countable rows, exemplar hint ladder present, BLOCKER reason strings present), registry-tag hygiene (every entry ID exists in the **batch's pinned registry** (§0 rolling pin) **or** in the doc's own §4 proposed diff — nothing outside both; the F-TAG existence rule applied at authoring time), **routing-reference checks** (every §3.12 re-surfacing node ID exists in the graph; every BLOCKER's stated backward destination is a **prerequisite ancestor of the node in the graph DAG** or an **explicitly named below-graph surface** — whether it is the *right* ancestor stays mr-kahn's judgment half, step 3). **A doc that fails any harness layer never reaches mr-kahn.**
2. **Citation verification (§2.4):** all first-use citations verified; mismatch → F-CITE, straight to regen.
3. **mr-kahn (judgment):** belief definitions (belief-not-output, middle-school rewritability), cognitive roots (real model failures, cited or analyzed), severity + routing calls (evidence-bearing per TEMPLATE §7.4 — frequency/consequence rationale present, no inflation; including the "right ancestor" half of every BLOCKER destination the harness verified structurally in step 1), disambiguation probes (100%, §4.3), grounding-tier assignments (is `tradition-adjacent` honestly flagged; is the `engineering-candidate` analysis real), **reused-citation claim fidelity (100%)** — for every entry citing an already-verified work, kahn reads how the entry *uses* the citation against the registry-recorded claim; the §2.4 10% mechanical re-verification is only a registry-corruption sample, never the fidelity check — §2.15 no-padding record (merges reasoned, rejections null-tagged, correct-but-unusual forms recorded).

### 6.3 Fatal classes

| Class | Definition |
|---|---|
| **F-CITE** | Fabricated or decorated citation (§2.1). Fails the node. |
| **F-SIG (shipped)** | A non-computable signature shipped as an entry (prose-only). Quarantine-at-harness makes shipping one a pipeline bug as well as a content defect. |
| **F-INVENT** | Invented misconception: an entry with neither literature nor a stated first-principles analysis, or one contradicting the node's actual mathematics. The direct violation of §5.3's principle. |
| **F-COLL** | Collision-matrix omission vs machine ground truth (§4.2). Misattributed-evidence hazard. |
| **F-PROBE** | A documented probe that cannot discriminate its pair (kahn finding). The pair's entries revert to log-both-tag-neither pending a working probe; the matrix row is defective until then. |

### 6.4 Regeneration loop

**Max 2 automated rounds** per node, audit findings injected as negative constraints into the failing pass (harness/citation findings → the pass that owns the layer; kahn findings → the judgment pass; a struck entry never returns under a new name without new grounding). After 2 failed rounds → **session fallback** (tool-equipped per-node authoring, mirroring BATCH_REGEN §6.4) — repeated failure marks a non-uniform node, exactly the case where live cross-referencing pays. Matt notified at fallback.

### 6.5 mr-kahn sign-off — per-taxonomy verdicts, per-batch sittings

- **Every taxonomy gets its own APPROVE / APPROVE WITH CHANGES / REJECT verdict**, recorded in the doc's §5 verdict section. Accreditation posture: each taxonomy is a **per-node evidence artifact** (it defines the node's routing rules and diagnostic claims); a batch-level blanket verdict would leave individual nodes without a citable gate record.
- **Review labor batches:** verdicts are delivered in **per-batch review sittings, 10 nodes/sitting** (the BATCH_REGEN §3.1 human-review sizing, reused for the same reason).
- **Two REJECTs on the same node → stop and escalate to Matt** (CLAUDE.md rule).

### 6.6 Registry interaction

Each taxonomy may **propose** a registry diff (ADD / REDEFINE / boundary-note / RE-KEY — the gold §4 pattern). Proposed diffs live **in the taxonomy doc only**; they are applied exclusively in **gated graph-mutation batches** (mr-kahn + mr-gates + Matt — the graph-mutations-v1.12 precedent). **This pipeline never touches `data/`.** Sequencing consequence: a node whose entries depend on its own proposed ADDs is internally consistent for audit (the harness checks tags against registry ∪ own-diff), but its *bank* cannot generate until the diff lands (BATCH_REGEN F-TAG checks the applied registry) — proposed diffs therefore batch into periodic graph-mutation applications between taxonomy approval and bank-batch entry (§8).

---

## 7. Pilot integration (settled picks — facts verified against graph `1.12.0`)

Three nodes, one per class except word-problem (below). The pilot runs **both pipelines end-to-end**: taxonomy gen → harness → citation verification → kahn gate → (approved taxonomy, registry diff applied if proposed) → bank gen (the BATCH_REGEN pilot) → Fable bank audit. The pilot is the only place the two specs' assumptions meet reality simultaneously.

| Node | Class | Why this node |
|---|---|---|
| **ALG-L19** — Average Rate of Change over an Interval (`F-IF.B.6`, prereqs L03/L05/L06) | conceptual | Misconception surface **pre-sketched** in DECISION_F-IF-B6 §4 (shares 5 tags with the gold doc + 1 unapproved engineering-candidate — the sketch de-risks the draft pass and tests the candidate-admission path). Fills the F-IF.B.6 accreditation hole **first**. Direct gold comparator (same cluster, same class). Its bank is already TODO-gated to land before any student ships — the taxonomy is on the critical path regardless. Also executes the gold §2.14 primary-home revision (deferred there to "Phase-3 L19 taxonomy authoring"). **Binding inheritance:** L19's taxonomy generator constraints and worked examples INHERIT DECISION_F-IF-B6 §7's binding authoring constraint — nonlinear relations presented-only (graph, table, or pre-evaluated values); no quadratic-specific concepts (vertex, factoring, solving) and no exponential manipulation; symbolic = direct substitution per L03 — stated here so the fresh-authoring pass cannot assume tier-4/5 machinery. |
| **ALG-L11** — Point-Slope Form (prereqs L06, L08) | procedural | **One edge from L06** (direct prereq). The gold taxonomy names L11 as the re-surface site for §2.2 (subtraction order in substitution) and §2.7 (subscript machinery) — a **tag-overlap comparator**: the pilot can check that L11's taxonomy correctly inherits re-surfaced entries rather than re-inventing them. Tests the **THIN-surface end** (procedural band 6–10) — the class GAP_NOTES §2.2 worries about. *(Classification rationale — mr-kahn, recorded here and **to be repeated verbatim at the class-assignment sign-off**: L11's objective verb is "write," which MANIFEST §3 could read toward word-problem via the A-CED family; it is settled **procedural** — the task is **math→math template substitution** (given point/slope into the point-slope form), with **no context translation** anywhere in the task; the word-problem criterion is context→math translation, which **fails outright here, so the tie-break never engages**. Standards tension, queued: **A-CED.A.2 on a substitution node** — whether that code belongs on L11 at all — goes to the deferred CCSS verification pass, not resolved here.)* |
| **ALG-L09** — Graphing Linear Equations (`F-IF.C.7a`, prereq L08 → L05/E02) | graphing | Two edges from the gold cluster via L08. **Primary home territory** for §2.4 (rise-run-direction), §2.11 (grid-count-scale), §2.12 (visual-steepness) — the graphing tag family the gold registry diff just added. Tests **visual/construct-class signatures** (§3.2's tuple and recipe forms) where numeric evaluation is weakest. |

**Word-problem class deliberately not piloted.** Its surface richness sits between conceptual and graphing (§5.2) and none of its risk is unique: signatures, collisions, and grounding all pilot on the other three classes. Stated honestly: this leaves the word-problem band (9–12) and its context-belief surface **unvalidated until batch 1** — the first word-problem taxonomy is a **batch-1 priority with heightened kahn attention** (its verdict sitting reviews it first and in depth), not a silent assumption.

**Taxonomy-leg success criteria (measured vs gold):**

| Criterion | Bar |
|---|---|
| Entry count | Within the node's class band (§5.2) |
| Signature computability | **100%** (harness §3) |
| Collision recall | **100%** vs machine ground truth (§4.2) |
| Citation validity | **100% verified-or-flagged; 0 fabrications** (a single F-CITE fails the pilot leg) |
| Grounding-tier distribution | **Reported, no criterion** — honesty means procedural nodes will run engineering-candidate-heavy, and a distribution quota would incentivize decoration, the exact thing §2 exists to kill |
| kahn quality proxy | Per-doc change-requests **≤5 average**, **0 fatal findings**, **no REJECT** across the three pilots |
| Qualitative | kahn judges **≥1 pilot belief-definition set "gold-comparable"** — the direct test of the hybrid's core bet (§1.3), that judgment-pass belief authorship holds the gold bar |

Pilot failure handling: criteria miss → fix the template/prompt/pass-split defect and re-pilot **before** batch 1; the whole point of piloting first is that a template defect found at node 3 costs 3 regens, not 74 (§8).

---

## 8. Sequencing and budget

### 8.1 Rolling batches, interleaved with bank generation — settled

- **Batch size 10** (74 = 7×10 + 1×4), matching the kahn sitting size (§6.5).
- **Ordering: dependency-cluster order, gold-adjacent first** — the BATCH_REGEN §2 mirror, same batch composition where possible so **taxonomy batch k feeds bank batch k**. Same three justifications transfer: audit context compounds along prereqs (a cluster's shared tags and re-surface entries are reviewed together), gold proximity calibrates the earliest batches (the linear cluster reuses the seeded citation registry and the gold collision patterns), and failure isolation (a reworked prerequisite taxonomy has no approved dependents to invalidate).
- **Interleave:** taxonomy batch N+1 generates **while bank batch N runs**; a taxonomy batch **leads its own bank batch by ≥1 full gate cycle** (taxonomy batch k must be fully kahn-verdicted — and any proposed registry diffs from it applied in a gated graph-mutation batch — before bank batch k renders prompts; BATCH_REGEN's F-DEP and F-TAG checks then see only approved, applied state).
- **Full-74-up-front REJECTED:** it front-loads 74 kahn gates (≈8 sittings) before a single bank lands, and any pilot-revealed or batch-1-revealed template defect reworks all 74 finished docs instead of ≤10 in flight. Rolling generation caps rework exposure at one batch and starts producing student-shippable nodes ~7 gate cycles earlier.
- **Per-node hard stop stands:** no approved taxonomy → the node **exits its bank batch** (F-DEP per node, TEMPLATE §6 / GAP_NOTES §4.1). The bank batch runs short rather than waiting — a delayed node re-enters the next bank batch after approval.

### 8.2 Budget

| Path | Basis | 74-node total |
|---|---|---|
| A (draft-model generates, judgment-model audits) | $0.30/node (§1.1) | **~$25** — rejected on quality |
| B (judgment-model generates directly) | $0.43/node (§1.2) | **~$37** — rejected on audit structure |
| **HYBRID (chosen)** | $0.52/node (§1.3) + pilot double-runs + 15% regen + ~$2 citation verification | **~$47–50 all-in** |

All figures Batch API pricing per the model-config table; harness emits actuals per batch. The delta between the chosen path and the cheapest is ~$25 across the entire course — less than one hour of anyone's review time, spent on the layer that routes students.

---

## 9. Output contract

**Nothing is written to `data/`, `docs/` (except gated promotion, below), or Supabase by this pipeline.** All staging under `.authoring-tmp/taxonomies/`:

```
.authoring-tmp/taxonomies/
  _manifest.json                  # run id, pinned models, template version, graph pin,
                                  #   registry pin, confusable-map version, batch->node map
  _registry/
    verified-citations.json       # §2.3 — the citation registry (audit artifact, promoted with docs)
  _reports/
    batch-<n>-report.json         # harness + citation + kahn results per node, flags
                                  #   (taxonomy-floor-shortfall, boundary-shortfall,
                                  #    probe-queue-unspecced, ...), cost actuals
  <NODE-ID>/
    draft.md                      # TAX_DRAFT_MODEL output (mechanical layer, audit trail)
    taxonomy.md                   # assembled full doc (draft + judgment merge, TEMPLATE §2 structure)
    harness-report.json           # §3 + §4 + structure + tag-hygiene results, machine collision list
    citations-delta.json          # new works/claims this node introduced (§2.4 queue input)
    status                        # PENDING | DRAFT_VALID | ASSEMBLED | HARNESS_PASS
                                  #   | CITATIONS_VERIFIED | APPROVED | AWC | REJECTED | QUARANTINE
```

**Promotion:** APPROVED taxonomies promote to **`docs/taxonomies/<node-id>.md`** via commit — diff shown to Matt, commit only on approval (CLAUDE.md). The doc promotes **with its kahn verdict section filled** (it is the per-node gate record, §6.5). Proposed registry diffs do **not** promote with the doc — they batch into gated graph-mutation applications (§6.6). AWC docs promote only after the changes land and re-pass the harness.

---

## 10. Failure modes

| ID | Failure | Detection | Handling |
|---|---|---|---|
| **F-CITE** | Fabricated/decorated citation | §2.4 verification (100% first-use; 10% re-verification sample) | **Fatal to the node's taxonomy.** Regen with finding as negative constraint; never repaired in place (§2.2). Repeat F-CITE on the same node → session fallback + Matt notified (fabrication under negative constraint is a generator-trust event, not a retry case). |
| **F-SIG** | Non-computable signature, or unsatisfiable generator constraints | §3.1 K-sample + §3.3 satisfiability, at draft stage and on assembly | Entry quarantined — **never ships prose-only**. Draft-stage: one cheap redraft. Post-assembly: regen round. |
| **F-COLL** | Collision-matrix omission vs machine ground truth | §4.1/§4.2, on assembly and after any entry change | **Fatal** (misattributed-evidence hazard). Regen with the machine list re-injected. |
| **F-PROBE** | Probe cannot discriminate its pair | mr-kahn 100% probe audit (§4.3) | Matrix row defective; pair reverts to log-both-tag-neither; probe re-authored in regen round. |
| **F-INVENT** | Invented misconception (no literature, no stated first-principles analysis, or contradicts the node's mathematics) | mr-kahn judgment audit (§6.2); math contradiction also catchable at harness where the "belief" implies a false identity | **Fatal.** Entry struck; §5.3 shortfall path if the floor is now missed — the shortfall is the honest state. |
| **F-PAD** | Padding: one belief split across IDs, unstable error patterns promoted to entries, above-band count without merged-candidate justification | mr-kahn on the §2.15 record; §5.2 above-band trigger | Entries merged/struck in regen. Padding is "a defect worse than the shortfall" (TEMPLATE §4.5). |
| **F-STRUCT** | TEMPLATE §2 structure or required per-entry field missing/blank (not explicitly marked) | Harness structure layer (§6.2 step 1) | Quarantine + regen; never reaches kahn. |
| **F-TAG** | Entry ID outside batch-pinned registry (§0) ∪ own proposed diff | Harness tag-hygiene layer | Quarantine + regen (authoring-time application of BATCH_REGEN's F-TAG). |
| **F-PARTIAL** | Batch API partial failure (errored/expired `custom_id`s) | Batch result types | Resubmit failed ids only; key by `custom_id`, never position (BATCH_REGEN §7 mirror). |
| **F-DEP** | Any §0 precondition unmet (template unfrozen/unpinned, registry ≠ the **batch's** `_manifest.json` pin — 163 ∪ prior gate-6 gated applications, §0 — graph ≠ the corresponding gated application state, confusable map absent/unapproved, class row unsigned for the batch, citation registry uninitialized) | Precondition check at every harness start | **Hard stop.** Downstream form: a node without an APPROVED taxonomy exits its bank batch (§8.1) — this spec *supplies* BATCH_REGEN's per-node F-DEP. |
| **F-DRIFT** | Quality trend degrades across batches (kahn change-requests/doc rising ≥2 consecutive batches, or any fatal-class recurrence post-pilot) | `_reports/` trend | Halt; re-examine prompts/exemplar pinning before continuing (BATCH_REGEN §7 mirror). |

---

## 11. Human gates (Matt approves — explicitly marked)

Per CLAUDE.md workflow. Everything this pipeline produces is curriculum/mastery-touching → mr-kahn territory throughout.

1. **[GATE — mr-kahn APPROVE]** `TAXONOMY_TEMPLATE.md` freeze at a pinned version, *before* any generation (it is currently DRAFT; this pipeline's output contract cannot float).
2. **[GATE — mr-kahn APPROVE]** The **confusable-cluster map** (§0 pre-step), before batch 1 renders. (Standards/curriculum structure.)
3. **[GATE — mr-gates APPROVE]** The harness (batch I/O + signature evaluation + collision computation + structure validation — a 3+-module tool) before it runs. Read-only against `data/`.
4. **[HUMAN CHECKPOINT — Matt]** **Pilot result** (§7: three nodes, both pipelines end-to-end, criteria table) → go/no-go on the full run. Any pilot F-CITE or REJECT is an automatic no-go pending fix + re-pilot.
5. **[GATE — per batch, mr-kahn]** **Per-taxonomy verdicts in per-batch sittings** (§6.5) — every node's own APPROVE/AWC/REJECT recorded in its doc. Two REJECTs same node → Matt.
6. **[GATE — recurring, mr-kahn + mr-gates + Matt]** **Registry-diff application batches** (§6.6): proposed diffs from approved taxonomies apply to `data/algebra1-graph.json` in gated graph-mutation batches (graph-mutations-v1.12 precedent), sequenced so each bank batch sees applied state (§8.1).
7. **[HUMAN CHECKPOINT — Matt]** **Promotion commits**: APPROVED taxonomies → `docs/taxonomies/`, diff shown, commit on approval only (§9).
8. **[HUMAN CHECKPOINT — Matt, END OF PHASE]** Full-run summary: 74 verdicts, flag inventory (shortfalls, probe-queue debt), citation-registry state, cost actuals vs §8.2, open questions.

---

## Appendix A — pinned parameters (fill at run authoring)

| Parameter | Value |
|---|---|
| Draft model | `TAX_DRAFT_MODEL` — see model-config table |
| Judgment model | `TAX_JUDGMENT_MODEL` — see model-config table |
| Audit | Harness (deterministic) + mr-kahn (judgment); **no LLM audit** (§6) |
| API surface | Message Batches (`/v1/messages/batches`), 50% pricing, both passes |
| TAXONOMY_TEMPLATE version | *(pin at gate 1 freeze — F-DEP if unpinned or drifted)* |
| Graph baseline | `1.12.0` at batch 1 (75 nodes / 117 edges); thereafter the latest gate-6 gated application state, recorded in the batch's `_manifest.json` (F-DEP on mismatch with the batch's pin) |
| Registry state | Per-batch rolling pin: 163-entry post-`1.12.0` state ∪ prior gate-6 gated applications, recorded in the batch's `_manifest.json` (§0; F-DEP checks the batch's pin — growth only via gate 6) |
| Gold exemplar | `docs/gold-node/misconception-taxonomy-slope.md`, pinned at commit |
| Confusable-cluster map | *(pin version at gate 2 approval — F-DEP if absent)* |
| Signature sampling | **K = 25** per entry, rejection-sampled under generator constraints, **stratified to include admissible boundary/degenerate values** (§3.1); satisfiability N = 10,000 (§3) |
| Entry-count bands | conceptual 10–14 · word-problem 9–12 · graphing 8–12 · procedural 6–10 (instrumentation, §5.2) |
| Binding floors | TAXONOMY_TEMPLATE §4.5 per MANIFEST class row (§5.1) |
| Batch size | 10 nodes (7×10 + 1×4), = one kahn sitting |
| Ordering | Dependency-cluster, gold-adjacent first; taxonomy batch leads its bank batch by ≥1 full gate cycle (§8.1) |
| Citation floors | 100% first-use verification; 10% per-batch re-verification sample (§2.4) |
| Max auto-regen rounds | 2, then session fallback (§6.4) |
| Pilot nodes | ALG-L19 (conceptual) · ALG-L11 (procedural) · ALG-L09 (graphing); word-problem = batch-1 priority, heightened kahn attention (§7) |
| Budget | ~$47–50 all-in (HYBRID; A ~$25 / B ~$37 rejected) — §8.2 |
| Output root | `.authoring-tmp/taxonomies/` (never `data/`, never Supabase; `docs/taxonomies/` by gated commit only) |
