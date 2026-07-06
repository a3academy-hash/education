# GAP_NOTES — what the gold node did NOT exercise, and how the library degrades

**Version:** 1.1.0 (tracks MANIFEST.md §1 `archetypeLibraryVersion`).
**Status:** DRAFT (authoring). Companion to MANIFEST.md §6 (under-target posture) and TAXONOMY_TEMPLATE.md §7 (never pad).
**Reading rule:** every item states the gap, why the gold node (ALG-L06, slope) could not exercise it, and the **degradation rule** — what a generator or auditor does on hitting it. The universal posture: degrade to an exemplified archetype, flag in the batch report, document sub-floor honestly. **Never pad, never fake, never invent an unexemplified construction and present it as gold-anchored.**

---

## 1. Archetype-coverage gaps

### 1.1 Predict-reveal reach beyond graph-perception / sign predictions
- **Gap:** both gold predicts are pre-computation beliefs with a visual payoff — perception (pr-01, scale betrayal) and qualitative sign (pr-02). What is commit-worthy on a factoring or exponent node — "will this factor?", "grows or shrinks?" — has no gold instance; archetype-predict-reveal §b.1's eligibility test (construction-keyed entry, or qualitative-output belief cluster) is the only guidance.
- **Why gold couldn't:** slope's predict-eligible beliefs happen to be graphical/sign beliefs; the archetype was extracted from them.
- **Degradation:** a node whose taxonomy has no §b.1-eligible entry **cannot instantiate predict-reveal** (the archetype says so). The manifest reallocates the pr slot(s) to error-analysis or discrimination (the nearest diagnostic forms), flags `pr-shortfall` in the batch report, and the node taxonomy records the absence. Never stage a "prediction" the taxonomy gives no belief a reason to get wrong.

### 1.2 Interactive tool vocabulary is coordinate-plane-only
- **Gap:** the entire exemplified tool set is `point-drag`, `arrow-builder`, `line-handles` (archetype-interactive §a.1 "gold vocabulary") — three coordinate-plane tools. Non-graph nodes (equation solving, factoring, exponents) need tool types that do not exist: step-builders, tile/area manipulatives, expression assemblers. The `submittedState`/`correctWhen` grading contract generalizes cleanly; the palette does not.
- **Why gold couldn't:** slope construction lives on the plane; no gold item needed a non-plane manipulable.
- **Degradation:** a node with predicate-expressible entries but no exemplified tool degrades its interactive slots to discrimination or scaffolded-multistep, flagged `tool-vocabulary-gap`. A new tool type is a **library addition**: version bump (MANIFEST §1) + pee-wee review (new interactive component, CLAUDE.md gate) + a gold-quality exemplar before any batch uses it. Never ship a tool type defined only in a generated item.

### 1.3 Stage-3 contrast case may not exist; fixed 4-WE/4-EC counts vs thin surfaces
- **Gap:** worked-example stage 3 requires a signed/boundary/degenerate variant, else the Axis-B confusable contrast (archetype-worked-example §a.3). Sign-less procedural nodes may have neither. The drafted files then say both "stage 3 exists in every lesson" (LESSON_TEMPLATE §1.3) and "neither available → GAP_NOTES flag, not filler" — without saying what the flagged lesson contains. MANIFEST §4's fixed 4-WE/4-EC lesson counts assume a fourth stage always has content.
- **Why gold couldn't:** slope is contrast-rich (negative slope, degenerate cases, three boundary entries); the tension never arose.
- **Degradation:** honesty outranks the fixed count. A node with no signed/degenerate variant AND no Axis-B contrast runs a **3-stage lesson (concrete → representational → abstract) with 3 embedded checks**, flags `stage3-absent` in the batch report and the lesson appendix, and documents the search in the node taxonomy's not-an-error/defect record. Do not invent a fake contrast or repeat a stage as filler. (ADOPTED: MANIFEST §4 carries this as its lesson-count degradation note and LESSON_TEMPLATE §1.3 states the same rule; mr-kahn adjudicates flagged lessons at the batch gate.)

### 1.4 Confrontation selection under-determined at the edges
- **Gap:** LESSON_TEMPLATE §1.5's top-3 rule handles the gold case (2 BLOCKERs + 1 primary-home HIGH) and ties via primary-home. Unhandled: **>3 BLOCKERs** ("all BLOCKERs first" cannot fit in 3 slots) and **several co-equal HIGHs surviving the primary-home tie-break**.
- **Why gold couldn't:** the slope taxonomy has exactly 2 BLOCKERs and one L06-homed HIGH — the rule was reverse-engineered from a case with no ties.
- **Degradation:** document the tie in Authoring notes and surface it at the per-batch mr-kahn gate (BATCH_REGEN §8 gate 5) rather than inventing a local tie-break. Provisional order for the generator's first attempt (explicitly reviewable): BLOCKERs by shallowest routing destination; HIGHs by entry-stated frequency language. Never resolve a tie silently.

### 1.5 Hook-shape naming
- **Gap:** LESSON_TEMPLATE §1.1 titles the hook "two-contrasting-cases shape," but its own definition — and the gold hook — is a **knowledge-gap minimal pair**: two snapshots of one subject whose gap generates the question ("can two snapshots really tell his exact pace?"). A generator keying on the title may build two *contrasting cases* (two athletes, two rates) where the gold move is under-determination by sparse data.
- **Why gold couldn't:** one exemplar, one shape; the generalized name was coined in drafting, not measured.
- **Degradation:** the operative definition is the §1.1 body text (minimal pair whose **gap** generates the driving question), not the title. Either surface form (two snapshots of one case; two genuinely contrasting cases) conforms if the gap is real relative to the prerequisite node. Auditors check the gap statement in Authoring notes, not the surface form.

### 1.6 Propagated-trap rule is conditional on clean closed-form downstream values
- **Gap:** scaffolded two-hit trails (archetype-scaffolded-multistep §a.4) require each earlier misconception's downstream consequence to be a deterministic, distinct, keypad-representable value. Many procedures propagate errors into messy or colliding values.
- **Why gold couldn't:** slope's propagation (wrong rise → wrong rate → wrong extension) is arithmetically clean; the conditionality never bit.
- **Degradation:** where an entry's propagation form is not clean/distinct on any admissible parameterization, the taxonomy marks it **non-propagating** (TAXONOMY_TEMPLATE §3.9), the scaffolded item pre-supplies the earlier result to isolate the later step (§a.5 device), and the evidence trail for that entry rests on single-part hits plus probes. Never accept a propagated trap inside grading tolerance of another value.

## 2. Node-type gaps

### 2.1 Discrimination boundary availability across all 73 nodes is unproven
- **Gap:** archetype-discrimination §b.2 requires ≥2 boundary entries per node and asserts confusable neighbors exist "by curriculum design." True for slope (the best-documented boundary space in the literature); unverified for 73 nodes. A **confusable-cluster map per node** — derived from graph edges + Axis-B interleaving rules before taxonomy authoring starts — would de-risk this and is not yet scheduled anywhere.
- **Why gold couldn't:** slope sits inside the proportionality cluster with three ready boundaries (§2.9/§2.11/§2.14); scarcity never surfaced.
- **Degradation:** taxonomy authoring performs the boundary search per node and documents it. Fewer than 2 genuine boundaries after honest search → run discrimination at the reduced count with distinct key signatures, flag `boundary-shortfall`, record the defect in the taxonomy. Never manufacture a pseudo-boundary (a computational error dressed as a concept confusion).

### 2.2 Pure-procedural nodes with thin misconception surfaces; no systems-shaped pressure
- **Gap:** slope generated no systems-of-equations archetype pressure (multi-object simultaneous-constraint items have no gold analog), and some nodes — Matt's own examples — are pure-procedural with thin belief surfaces: few stable beliefs, mostly slips.
- **Why gold couldn't:** slope is the ideal case (mr-kahn's §5 verdict says so explicitly: best-researched space, clean closed-form signatures). The library is extracted from the easiest node to enrich.
- **Degradation:** already partially encoded — MANIFEST §4 procedural row runs **13 with reduced pr/int (1/1)**, and MANIFEST §6 allows under-target totals flagged in the batch report. Residual rule: a node that cannot honestly field even the procedural row's counts documents the sub-floor bank (`thin-surface` flag), ships what is defensible, and is not padded with filler items. Systems nodes take session-fallback authoring (BATCH_REGEN §6.4) on first failure rather than a third batch attempt.

### 2.3 Visual type vocabulary: three types observed
- **Gap:** every exemplified visual is `coordinate-plane`, `dual-representation`, or `table`. Number lines (foundations/inequality nodes), algebra tiles, and area models (polynomial/factoring nodes) are unexemplified **against the no-nulls Manim-buildable bar** — no field list exists for them, so "no nulls" is currently undefined off-plane.
- **Why gold couldn't:** slope's representations are exactly the three exemplified types.
- **Degradation:** prefer a faithful rendering in an exemplified type (tables carry most numeric structure) over a half-specified new type. Where fidelity genuinely requires a new type, its first instance authors the complete field list (axes/objects/annotations/reveal_beats analog) and enters the library via version bump + pee-wee review, exactly as §1.2 tools do. `visual: null` remains prohibited in all cases — that invariant does not degrade.

## 3. Platform / engine gaps

### 3.1 Probe-queue runtime support assumed but unspecced
- **Gap:** the taxonomy (§3.1/§3.4), embedded-check §d, scaffolded §a.10, and predict-reveal §d all assume the engine can queue a disambiguation probe "as the next scheduled item." RUNTIME_TUTOR_SPEC §6 item 5 defines the selector as info-gain + retention + transfer-coverage — **no probe-priority channel exists**.
- **Why gold couldn't:** gold is content; no runtime was built against it.
- **Degradation:** until the selector spec grows a probe channel (mr-gates territory — engine change), probe queueing is **authored-content + logged-advisory**: the probe items exist in the bank, collision hits log the pair, and neither tag activates (log-both-tag-neither already guarantees no mis-routing). The cost is latency of disambiguation, not correctness. Flag `probe-queue-unspecced` on every node whose collision matrix is non-empty, so the engine work is sized honestly.

### 3.2 Collision-pair probe semantics live as prose in signature strings
- **Gap:** pair-log/probe-queue instructions are embedded as prose inside `misconceptionMap` signature strings (scaf-02, pr-02 trigger `7/4`, EC3). There is no structured schema field (`collisionPair: {tags, probeId}`), so the engine must parse conventions out of prose.
- **Why gold couldn't:** the gold JSON schema was frozen before the convention stabilized; `schemaNote` documents extensions additively.
- **Degradation:** keep the prose convention **byte-stable** (same phrasing pattern across all generated items) so a later mechanical migration to a schema field is a parse, not a re-authoring. Validation flags every collision-carrying map entry in the node report. Schema field addition is a types/engine change (mr-gates gate) queued with §3.1.

### 3.3 Symbolic-answer ceiling (fraction-only keypad)
- **Gap:** the keypad accepts numeric/fraction input only; every symbolic answer becomes choice-for-expressions (scaf-03 part d; QUESTION_VOICE §11.1 row 9). On polynomial/factoring/exponent nodes, nearly every capstone and many core asks are symbolic — whole banks skew choice-heavy, weakening produce-vs-recognize evidence.
- **Why gold couldn't:** slope's answers are numeric; only one gold part hit the ceiling.
- **Degradation:** choice-for-expressions with fully keyed distractors is the standing rule (never string-match hacks on typed symbols). The harness flags nodes where >50% of scored parts are ceiling-forced to choice (`symbolic-ceiling` flag) so symbolic-input platform work can be prioritized by measured need. Item counts are not padded to compensate.

### 3.4 Lesson-side interpretation floor has no deterministic check
- **Gap:** BATCH_REGEN_PATCH_voice §3.1's deterministic voice validation is **bank-scoped** (per-node items). The lesson-side requirement — ≥1 embedded check in interpretation form (MANIFEST §4) — has no harness check, and LESSON_TEMPLATE's appendix rows (a)–(h) do not include it.
- **Why gold couldn't:** the gold lesson was hand-measured (QUESTION_VOICE §11.1 row 8: D1 checks 25%); no harness existed.
- **Degradation:** until a lesson-scoped check ships, the interpretation-form EC is verified at the per-batch mr-kahn gate, and lesson generators add it as a self-audit row in the appendix table (an additive row, consistent with the appendix's "verifiable against the lesson text as it exists NOW" rule). Flag `lesson-voice-unchecked` on every batch report so the coverage hole stays visible.

## 4. Dependency gaps

### 4.1 72 node taxonomies do not exist — the biggest dependency
- **Gap:** the archetype library consumes per-node taxonomies everywhere (every §b section; LESSON_TEMPLATE §3.2 hard input), but only the slope cluster doc exists — covering ALG-L06 and (partially) ALG-L05. **~72 nodes have no taxonomy at all.** BATCH_REGEN §0 lists only the *keying contract* (§3 pattern) as a dependency — the per-node taxonomy is not on the §0 dependency table as an artifact, yet it is larger authorship than the library itself, and it is gated (mr-kahn) per node.
- **Why gold couldn't:** the gold effort produced the reference instance, not the fleet.
- **Degradation:** **none — this is a hard stop, not a degradation.** TAXONOMY_TEMPLATE.md defines the job; a node without a conforming, mr-kahn-approved taxonomy does not enter a generation batch (F-DEP extended per node, TAXONOMY_TEMPLATE §6). The taxonomy-authoring effort needs its own plan, ordering (dependency-cluster, mirroring BATCH_REGEN §2), and budget line before the regen pipeline's schedule is credible.

### 4.2 D-deliverable availability: two enum forms were SPEC-ONLY — **RESOLVED 2026-07-05 (D4/D5/D6 all rebuilt)**
- **Resolution (2026-07-05):** D4 and D6 were rebuilt as gold-node deliverables. The rubric contract, gold instances, and graded samples live in `docs/gold-node/GOLD_NODE_RUBRICS.md` (`RUB-L06-explain` + `ALG-L06-gold-rex-01`; `RUB-L06-transfer-d1` + `ALG-L06-gold-tb-d1-01`; §5 drop-in-compatibility samples against RUNTIME §3.2); the transfer battery lives in `docs/gold-node/gold-node-transfer.json` (passRule + 5 certified item families across the four transfer dimensions). The two formerly spec-only enum forms now have owning archetype entries, authored at library **v1.1.0**: `archetype-rubric-explanation.md` (itemForm `rubric-explanation`, exact fit) and `archetype-transfer-battery.md` (itemForm `transfer-battery-slot`, exact fit). MANIFEST §2 counts them (item bank / mastery gate — the new third counting category) and §4 carries their distribution rules; the degradation below is superseded. **D5 (swap templates) was rebuilt the same day:** `docs/gold-node/gold-node-variants.json` (committed `50755de`) — the swap-template envelope INTEREST_DOMAINS' "D5 envelope" references now exists (15-domain registry, per-item frozen/swappable slots, presentation-class freeze). D5 needs no archetype entry (it is a skinning envelope, not an item form); the §4.3 INTEREST_DOMAINS presentation-class patch remains the one open skinning item.
- **Was — gap (recorded at 1.0.0, preserved as history):** the library was extracted from four files (gold-node-items.json, GOLD_NODE_LESSON.md, the slope taxonomy, REVIEW_DIGEST.md). The lost D1–D6 deliverable set (REVIEW_DIGEST §1) was only partially rebuilt: **D4 (rubric contract)** exists only as taxonomy §3.3 + the ALG-L06 element table; **D5 (swap templates)** only as the INTEREST_DOMAINS consumer spec; **D6 (transfer battery)** only as RUNTIME_TUTOR_SPEC's transfer-dimension definitions. Consequently **`rubric-explanation` and `transfer-battery-slot` — two of the BATCH_REGEN §4.2 enum's five forms — have no bank archetype and no gold instance.** This is why the library has 7 archetypes rather than mapping 1:1 onto the enum: rubric evidence rides lesson-side only (worked-example self-explanation prompts, advisory), and transfer-battery positions are filled, not owned, by discrimination/interactive items (their itemForm notes). Namespace hazard, recorded: RUNTIME's "D1–D4" are transfer *dimensions*, not these deliverables (REVIEW_DIGEST caution). *(The stand-in itemForm notes in archetype-discrimination / archetype-interactive / archetype-worked-example date from this state; they are superseded on the battery/ownership point by the two 1.1.0 entries and flagged there for reconciliation.)*
- **Was — why gold couldn't:** the D4/D5/D6 build artifacts were lost in the outage and never rebuilt (REVIEW_DIGEST: not reconstructed from memory, correctly).
- **Was — degradation (superseded for D4/D6 by the resolution above; still operative for D5):** the manifest schedules **zero** bank-side rubric-explanation or transfer-battery items until D4/D6 gold instances exist; generated banks must not invent them. When D4 (rubric + sample graded responses) and D6 (transfer battery) are rebuilt, each becomes a new archetype entry via library version bump + full gates. Until D5 exists, skinning runs on INTEREST_DOMAINS' consumer spec + the archetype §f rules only, with the neutral-default flags doing the safety work.

### 4.3 Skinning can flip presentation class — INTEREST_DOMAINS itself is unpatched
- **Gap:** the taxonomy's attribution rules can key on presentation class (named-quantity vs bare-pair, gold §2.3). A skin that names quantities ("games as x, hits as y") silently converts a bare-pair item into a named-quantity item and **changes which tag a distractor keys**. archetype-embedded-check §f patched this locally (presentation-class freeze); the other archetypes rely on the general invariance contract, and **INTEREST_DOMAINS §4's frozen-element list does not name presentation class**.
- **Why gold couldn't:** gold skins were hand-checked; no mechanical skin pipeline ran against the gold items.
- **Degradation:** TAXONOMY_TEMPLATE §3.10 makes presentation-class sensitivity a required per-entry field, so every node taxonomy exposes the hazard mechanically. Until INTEREST_DOMAINS §4 is patched (remote-branch doc — patch on merge, same handling as PATCH_voice), auditors treat any skin that flips a presentation-class-sensitive item's class as an invalid skin under psychometric equivalence (fatal to the skin, not the item): render neutral instead.

---

## Summary for review (Matt)

1. **RESOLVED 2026-07-05:** the two BATCH_REGEN item forms that had no gold instance (rubric-explanation, transfer-battery) now have both — D4/D6 were rebuilt (GOLD_NODE_RUBRICS.md + gold-node-transfer.json), and the library is now **9 entries at v1.1.0** with owning archetype entries and MANIFEST §4 distribution rules for both forms. D5 (swap templates) was rebuilt the same day (gold-node-variants.json) — the gold node is deliverable-complete. *(Was: banks schedule zero of those forms until they exist.)* One open skinning item remains: the INTEREST_DOMAINS presentation-class patch (§4.3).
2. Biggest dependency: ~72 per-node misconception taxonomies do not exist. Larger than the library itself, gated per node, not on BATCH_REGEN §0 as an artifact. Hard stop per node — TAXONOMY_TEMPLATE.md now defines that job; it needs its own plan and budget.
3. Coverage honesty: predict-reveal and interactive may not instantiate off graph-heavy nodes (no eligible beliefs / no tools); visuals beyond plane-dual-table are undefined; degradation is always reallocate-to-exemplified-archetype + flag, never pad.
4. Engine debt the content assumes: probe-queue channel absent from the RUNTIME selector; collision-pair semantics live in prose, not schema; both queued as mr-gates work — content stays correct meanwhile (log-both-tag-neither).
5. Keypad ceiling: symbolic nodes go choice-heavy until symbolic input ships; harness will flag nodes >50% ceiling-forced so the platform work is sized by data.
6. Known tensions left for gates: fixed 4-stage lesson vs nodes with no honest contrast case (we degrade to 3 stages, flagged); confrontation ties (>3 BLOCKERs / co-equal HIGHs) escalate to mr-kahn, no silent tie-breaks.
7. Skin safety: presentation-class flips can silently re-key diagnosis; frozen locally in embedded-check, required per-entry in TAXONOMY_TEMPLATE, INTEREST_DOMAINS patch pending.
8. Nothing in this file licenses padding: every shortfall ships smaller and flagged.
