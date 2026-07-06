# TAXONOMY_TEMPLATE — requirements on per-node misconception taxonomies

**Version:** 1.0.0 (tracks MANIFEST.md §1 `archetypeLibraryVersion`).
**Status:** DRAFT (authoring). Gated: mr-kahn APPROVE required before freeze (BATCH_REGEN_SPEC §8 gate 1); every node taxonomy produced against this template is itself gated content (mr-kahn APPROVE, per CLAUDE.md — curriculum/mastery-touching).
**This document DEFINES the taxonomy-generation job for the 73 non-gold nodes.** The archetype entries (`archetype-*.md` §b sections) are the demand side; this template is the supply contract. A node without a conforming taxonomy is not lesson-ready (LESSON_TEMPLATE §3.2) and not bank-ready (every archetype's §b).

---

## 1. Purpose and quality bar

- **Reference instance:** `docs/gold-node/misconception-taxonomy-slope.md` (the slope cluster, ALG-L05/L06). It is the floor, not a stretch goal: every structural feature demanded below exists there and is cited by section.
- **Admission conditions (verbatim in substance from the gold §1 preamble — all four, per entry):** (1) names a belief, not a wrong output; (2) has a deterministic detection signature; (3) is distinguishable from every other entry by some observable — else document the collision and probe, or merge; (4) is grounded — cited research tradition, or honestly marked engineering-observed.
- **Cluster scope allowed:** one document may cover a node cluster sharing a misconception space (the gold doc spans L05+L06). Each covered node must still individually satisfy the §4.5 minimum-counts table.
- **Everything downstream keys to entry IDs.** Hints, distractors, error-analysis targets, rubric annotations, confrontation selection, routing reasons, and audit signatures all resolve to `§2.n` entries. An entry that no consumer can key is dead weight; a consumer demand no entry satisfies is a documented defect (§7), never a silently skipped archetype.

## 2. Required document structure (mirrors the gold doc)

1. **Header block:** status; author + gate verdict line; any structural findings about the node's graph position (gold: the F-IF.B.6 home finding); **notation preamble** defining the node's item parameters and stating that *every detection signature is a computable function of these parameters* (gold preamble — this sentence is load-bearing; archetype-scaffolded-multistep §b.1 and archetype-interactive §b.1 cite it as the requirement).
2. **§1 Design preamble:** the four admission conditions; the node's research base with citations; the severity scale (BLOCKER / HIGH / MEDIUM / LOW, defined exactly as gold §1: BLOCKER = prerequisite-gap symptom routing backward; HIGH = frequent local stall; MEDIUM = yields to one targeted counter; LOW = tag, don't interrupt).
3. **§2 The taxonomy:** one subsection per entry (§2.1 … §2.n) carrying every §3 field below; then a **merged/rejected candidates + not-an-error records** subsection (gold §2.15); then the **consolidated collision matrix** and the **global generator rule** (gold §2 tail).
4. **§3 Keying contract:** the node-specific restatement per §5 below.
5. **§4 Registry diff:** REDEFINE / ADD / NO-CHANGE-boundary-note / RE-KEY blocks, mechanically applicable to `misconceptionRegistry` in `data/algebra1-graph.json` (gold §4). Every entry ID must either exist in the post-diff registry or arrive in this diff — BATCH_REGEN §5.2 step 2 fails any tag outside it (F-TAG).
6. **§5 Verdict:** mr-kahn's gate verdict on the node taxonomy.

## 3. Per-entry REQUIRED fields

Each field is demanded by a named consumer. An entry missing a field is unusable by that consumer — omissions must be explicit ("non-propagating", "presentation-class-insensitive"), never blank.

1. **Entry ID / tag naming.** Kebab-case, belief-named (`forgot-denominator`), never output-named (`answers-12`). Section-numbered §2.n. Registry-aligned per §2.5 above. *Consumers:* BATCH_REGEN §5.2 step 2 (existence), every archetype's `misconceptionMap` `{trigger, tag, signature}` objects, the derived `manifest.json`.
2. **Student-belief statement (Definition).** What the student *thinks is true*, in language rewritable to middle-school register. *Consumers:* confrontation peer-voicing (LESSON_TEMPLATE §1.5.2); scaffolded interpretation-capstone distractors (archetype-scaffolded-multistep §b.4); error-analysis diagnose choices (archetype-error-analysis §b.3: "⟨name⟩ thought X was true" rewritability).
3. **Cognitive root.** The model failure behind the belief, cited. A required field, not optional color (archetype-error-analysis §b.4). *Consumers:* hint rung 1 (taxonomy §3.1 root probe); worked-example self-explanation prompts (archetype-worked-example §b); error-analysis root-spanning rule (archetype-error-analysis §a.1).
4. **Severity band** — BLOCKER / HIGH / MEDIUM / LOW, with escalation notes where severity is phase- or node-conditional (gold §2.5: "HIGH if it survives to L08"). *Consumers:* **confrontation selection — top-3 by severity, all BLOCKERs first, HIGH band next, tie-broken by primary-home-is-this-node, documented** (LESSON_TEMPLATE §1.5); routing (taxonomy §3.4); error-analysis BLOCKER-target rule (archetype-error-analysis interface misconceptionSlots); discrimination boundary routing (archetype-discrimination §b.5); worked-example contrast-stage steering (archetype-worked-example §b).
5. **Closed-form detection signature.** The trap value as a computable function of the item parameters (answer = Δy; answer = m·s_x/s_y; construct state = (x₀+run, y₀+|rise|); keyed choice = the option this belief selects, with the keyed-construction recipe where the signature is construction-dependent, gold §2.12). Multi-variant signatures list every variant (gold §2.6 (a)/(b); §2.9 both points). *Consumers:* all five bank archetypes' solverContracts; embedded-check keying (archetype-embedded-check §b); BATCH_REGEN §5.2 step 4; audit `misconceptionTagsValid`.
6. **Step-locality.** Which step of the node's canonical procedure the belief acts at, so the signature decomposes into worked steps. An entry defined only by a final output cannot be an error-analysis target (archetype-error-analysis §b.1). *Consumers:* error-analysis `locate` keying; scaffolded per-part trap placement (archetype-scaffolded-multistep §b.3).
7. **Generator constraints.** Parameter conditions that (i) arm the trap (b ≠ 0; s_x ≠ s_y; m < 0), (ii) keep it live and distinct from the key and all other live traps, (iii) keep it outside grading tolerance (gold §2.9 minimum-separation note). *Consumers:* every archetype's distinctness validation (scaffolded §b.2, error-analysis §a.9, predict-reveal §b.3, interactive §b.2, discrimination arming §b.1, embedded-check §b); BATCH_REGEN §5.2 step 4.
8. **Belief-form rewrite.** The entry verbalized as a wrong *reading* with its asserted quantities recomputed on candidate item numbers, so the wrong reading contradicts the item's own data (gold-pattern: EC2's "grew by 3 in all"). *Consumers:* embedded-check interpretation mode (archetype-embedded-check §a.3); scaffolded interpretation capstones (§a.6); the interpretation floors these carry (BATCH_REGEN_PATCH_voice §3.1; QUESTION_VOICE §10 interpretation frames, §11 ADJUST #8).
9. **Propagation form.** The deterministic downstream value when the entry's wrong intermediate propagates through the node's later procedure steps — or an explicit **non-propagating** mark. *Consumers:* scaffolded two-hit propagated-trap trails (archetype-scaffolded-multistep §a.4, §b.5). Propagation forms that are not clean closed-form values are marked non-propagating with the reason (GAP_NOTES §1.6 degradation).
10. **Presentation-class sensitivity.** Whether attribution depends on how quantities are presented (named-quantity vs bare-pair, gold §2.3), and the per-class keying rule (which class tags directly; which class queues which probe) — or an explicit **insensitive** mark. *Consumers:* embedded-check presentation-class rules (§b) and presentation-class skin freeze (§f); collision-matrix conditions.
11. **Remediation move.** The contrast case, re-representation, or probe that attacks the root — stated concretely enough to run verbatim-in-structure on new numbers. *Consumers:* hint rung 2 (taxonomy §3.1); confrontation counter-case (LESSON_TEMPLATE §1.5.3 "verbatim in structure"); error-analysis reveal staging (archetype-error-analysis §e: "generated items must pick the reveal from the target entry's documented remediation move, not invent one"); discrimination resolve staging (§e); predict-reveal eligibility (contrast-reveal moves, archetype-predict-reveal §b.5); interactive eligibility (constructive moves flagged, archetype-interactive §b.5).
12. **Nodes / homes / routing.** Primary home, re-surfacing nodes, and — for BLOCKER and prerequisite-gap-flavored entries — the stated backward destination (taxonomy §3.4). Boundary entries name the neighbor node/schema discriminated against (archetype-discrimination §b.3).
13. **Grounding.** Exactly one grounding tier (§7.1): **`literature-grounded`** (names work(s) and the specific claim used), **`tradition-adjacent`** (FLAGGED "extrapolated from [tradition]"), or **`engineering-candidate`** (stated first-principles analysis, FLAGGED for pilot validation; gold §2.7, §2.13 precedent). *(tier vocabulary added 2026-07-06 at TAXONOMY_REGEN_SPEC gate, mr-kahn ruling — pre-freeze)*
14. **Worked example.** At least one concrete parameterization with the computed trap value and the correct answer (gold: every entry). *Consumers:* audit legibility; generation few-shot anchoring.
15. **Archetype-eligibility flags** (derived, but stated): boundary entry (discrimination), predict-reveal-eligible, interactive-eligible, degenerate-case entry. These let the manifest place archetypes where they pay (archetype-interactive §b.5).

## 4. Node-level REQUIRED structures

### 4.1 Consolidated collision matrix

One table (gold §2 tail): per row — **colliding trap value | entries colliding | parameter condition | disambiguation probe**. Rules:
- Every numeric or state collision between two live entries under any admissible parameterization is either (a) excluded by a generator constraint, or (b) documented here with a **named probe**.
- **Log-both-tag-neither rule:** a hit on a documented pair logs both tags, activates neither, and queues the probe as the next scheduled item (taxonomy §3.4; archetype-embedded-check §a.6/§d). The pair shares hint rung 1 (taxonomy §3.1).
- Undocumented collisions found at generation are defects → re-parameterize (global generator rule), never key a colliding value to a single tag.
- A node taxonomy lacking the matrix is not check-ready (archetype-embedded-check §b).

### 4.2 Boundary / contrast entries

**≥2 per node** (archetype-discrimination §b.2), each carrying the construction recipe + arming constraint + named neighbor (§3 fields 5, 7, 12). The node's concept has confusable neighbors by curriculum design (Axis B); **absence of 2 genuine boundaries after honest search is a taxonomy defect to document in the node doc and in GAP_NOTES — not a license to silently skip the discrimination archetype** (archetype-discrimination §b.2; degradation per GAP_NOTES §2.1).

### 4.3 Not-an-error records (§2.15-class)

A merged/rejected/not-an-error subsection is REQUIRED in every node taxonomy. It must document:
- Every **correct-but-unusual form** the skill admits (labeling freedom, traversal order, algebraically equivalent routes) — these bind `correctWhen`: punishing one is a fatal-class math error (archetype-interactive §a.4/§b.3), and the confrontation states the guard in student text (LESSON_TEMPLATE §1.5).
- Merged candidates with the merge reason (gold: slope-as-angle → §2.12); rejected candidates with the no-stable-belief reason (null-tag + monitor).
This section is the no-padding evidence record (§7). It is load-bearing, not appendix material.

### 4.4 Probe item definitions

Every collision-matrix probe is defined as an **authorable item spec**: task type (the deciding observable — construct vs numeric vs unit-labeled choice vs positive-parameter variant), arming condition, and what each outcome re-attributes to or activates (gold §2.2, §2.3, §2.10, §2.12). Probes are frequently discrimination or embedded-check constructions; they inherit the collision-probe neutral-default skin flag (archetype-discrimination §f).

### 4.5 Minimum counts (derived from the archetype §b sections — verified, not invented)

One entry may satisfy several rows; distinctness binds only where a consumer demands it (rows 3, 6). "REQUIRED" rows are structures, not counts.

| # | Requirement | Minimum | Demanding consumer |
|---|---|---|---|
| 1 | Entries with closed-form detection signatures (computable trap value as a function of item parameters) | **≥4** | archetype-scaffolded-multistep §b.1; archetype-error-analysis §b.2 + interface misconceptionSlots (1 target + 3 mismatch-verifiable distractors per instantiation) |
| 2 | Entries rewritable as student-language belief statements (capstone/diagnose supply) | **≥3** (and 100% of entries name a belief — gold §1 condition 1) | archetype-scaffolded-multistep §b.4; archetype-error-analysis §b.3 |
| 3 | Boundary/contrast entries, each with construction recipe + arming constraint + named neighbor | **≥2** | archetype-discrimination §b.2 |
| 4 | State-predicate-expressible entries (translate mechanically to construct-state predicates) | **≥2** (3 preferred) | archetype-interactive §b.2 ("≥2–3 predicate-expressible entries per instantiation") |
| 5 | Construction-keyed or qualitative-surface entry (predict-committable) | **≥1 where the manifest schedules predict-reveal**; absence → GAP_NOTES flag + manifest reallocation, never a fake commit | archetype-predict-reveal §b.1 |
| 6 | Step-instantiable entries with pairwise-distinct cognitive roots | **≥ the node's MANIFEST §4 error-analysis count** (2–4 by class), incl. ≥1 BLOCKER-rooted target where the node has a BLOCKER | archetype-error-analysis §a.1 + interface misconceptionSlots; MANIFEST §4 |
| 7 | Supporting computational entries usable as discrimination distractors | **1–2** (may overlap row 1) | archetype-discrimination §b.4 |
| 8 | Not-an-error records | section REQUIRED; ≥1 record wherever the procedure admits a labeling/order/traversal freedom | archetype-interactive §b.3; LESSON_TEMPLATE §1.5 correct-variant guard |
| 9 | Consolidated collision matrix + global generator rule | REQUIRED | archetype-embedded-check §b ("a node taxonomy lacking the matrix is not check-ready"); archetype-scaffolded-multistep §b.6; archetype-error-analysis §b.5 |
| 10 | §3.3-style rubric table (required semantic elements annotated with countered entry IDs) | REQUIRED | archetype-worked-example §b; LESSON_TEMPLATE §3.2 |
| 11 | Severity band on every entry | 100% of entries | archetype-scaffolded-multistep §b.7; archetype-error-analysis §b.6; archetype-discrimination §b.5; archetype-worked-example §b |
| 12 | Cognitive root on every entry | 100% of entries | archetype-error-analysis §b.4 ("required taxonomy field, not optional color"); archetype-worked-example §b |
| 13 | Generator constraints on every signature-bearing entry | 100% | archetype-scaffolded-multistep §b.2; archetype-embedded-check §b; archetype-worked-example §b (dataset choice) |
| 14 | Propagation form or explicit non-propagating mark | 100% of signature-bearing entries | archetype-scaffolded-multistep §b.5 |
| 15 | Degenerate-case entries where the node's concept has degenerate cases | dedicated entries (a standard item can't reach them) | archetype-scaffolded-multistep §b.1 + §a.11 |
| 16 | Entries at HIGH+ severity (confrontation supply) | **no minimum** — confront what exists; never pad down the severity scale | LESSON_TEMPLATE §1.5 |

A node that cannot honestly meet a count row documents the shortfall per §7 and takes the GAP_NOTES degradation for the affected archetype. Padding to hit a row is a defect worse than the shortfall.

## 5. Keying contract — the §3-style restatement every node taxonomy carries

The node doc restates (not merely links) the gold §3 contract, instantiated on the node:

1. **§3.1 Hint ladders.** Three rungs per trapped entry, rendered from cached templates with item parameters slotted in — no LLM on this path: rung 1 root probe (never names procedure or formula), rung 2 the entry's remediation move miniaturized onto the item's numbers, rung 3 the first correct micro-step, never the final answer. Untagged wrong answers → node generic ladder + `misconception_tag: null` log. Collision pairs share rung 1; probe queued. ≤2 sentences per rung, second person, middle-school register. The node doc writes out **at least one full exemplar ladder** for its highest-severity entry (gold §3.1 does this for `forgot-denominator`).
2. **§3.2 Error-analysis rules.** (1) Shown work reproduces the entry's signature step by step; (2) shown final answer equals the computed trap value; (3) locate + diagnose in that order, diagnose distractors drawn from entries whose signatures provably mismatch the shown work; (4) `errorAnalysisOf` metadata routes evidence to the same tag as a direct hit.
3. **§3.3 Rubric annotation — advisory only.** The node's core-explanation rubric table: required semantic elements, each annotated with countered entry IDs. A missing element raises priors on the countered tags but **never sets a tag active by itself**; active status requires a signature hit or failed probe. Same advisory standard governs logged predictions (archetype-predict-reveal §b.4) — the node doc states this explicitly so engine behavior is defined.
4. **§3.4 Evidence and routing.** 1 hit = weak evidence; **2 hits, or 1 hit + failed disambiguation probe = tag active.** Active BLOCKER → route backward to the entry's stated destination with a plain-language reason on the pattern *"[what breaks in plain words] — we're going back to [prereq surface] to build that."* — the node doc writes the actual reason string for every BLOCKER entry (LESSON_TEMPLATE §1.7 surfaces the same string). Active HIGH/MEDIUM → targeted micro-set (the entry's error-analysis item + 2 maximally-distinct-trap items). Every trap value, tag, probe result, and route logged immutably. Clearing a tag requires correct performance on neutral P3 items whose parameters still arm the trap.

## 6. Validation hooks — which BATCH_REGEN checks consume which fields

| Check (BATCH_REGEN_SPEC / PATCH_voice) | Template field(s) consumed |
|---|---|
| §5.2 step 2 — taxonomy validation (F-TAG existence) | §3.1 entry IDs; §2.5 registry diff alignment |
| §5.2 step 3 — structural invariants (3-rung ladder on every item) | §5.1 ladder contract; §3.3 cognitive root (rung 1) + §3.11 remediation move (rung 2) |
| §5.2 step 4 — solver check | §3.5 signatures; §3.7 generator constraints; §4.1 collision matrix (distinctness outside documented pairs); §4.3 not-an-error forms (accepted-equivalents / `correctWhen` completeness) |
| §5.2 step 5 (PATCH_voice §3.1) — interpretation floors, deterministic | §3.8 belief-form rewrites (the distractor supply for interpretation capstones and interpretation-form checks) |
| §6.2 audit `misconceptionTagsValid` (semantic) | §3.5 signatures with mismatch arithmetic; §3.6 step-locality; §3.10 presentation-class rules |
| §6.2 audit `hintLadderValid` | §5.1 (3 rungs, never the answer) |
| §6.2 audit `rubricElementsScoreable` | §4.5 row 10 rubric table (the D4-contract stand-in — see GAP_NOTES §4.2) |
| §7 F-DEP — precondition hard stop | the node taxonomy itself, frozen and gated, extends F-DEP per node: **no conforming taxonomy → the node does not generate** (GAP_NOTES §4.1) |

## 7. Honesty rules

1. **Grounding or the flag.** Every entry carries exactly one grounding tier: **`literature-grounded`** — names work(s) and the specific claim used; **`tradition-adjacent`** — domain literature exists but does not attest this specific belief, so the entry cites the tradition and is **FLAGGED "extrapolated from [tradition]"**; **`engineering-candidate`** — no literature, grounded in a stated first-principles analysis and **FLAGGED for pilot validation** (gold §1 condition 4; §2.7 and §2.13 precedent). An unflagged tier-2 or tier-3 entry is an audit defect. *(tier vocabulary added 2026-07-06 at TAXONOMY_REGEN_SPEC gate, mr-kahn ruling — pre-freeze; refines the prior cited-vs-engineering-observed binary.)*
2. **Never pad.** The §4.5 minimums are demand statements, not quotas. A node whose honest misconception surface is thinner than a row documents the shortfall in its own §2.15-class section and takes the archetype degradation (GAP_NOTES); it does not invent entries, split one belief into two IDs, or promote unstable error patterns to entries. Unstable patterns log `misconception_tag: null` and feed taxonomy growth (gold §2.15).
3. **Merge or document — never duplicate.** Two candidates no observable can separate are merged with the reason recorded; two candidates that collide numerically but differ in belief stay separate **only** with a documented collision row + probe (gold §2.1/§2.10 is the model).
4. **Severity is evidence-bearing.** Confrontation selection and routing read severity mechanically (LESSON_TEMPLATE §1.5; §3.4). Inflating severity to win a confrontation slot corrupts routing; severity assignments cite frequency/consequence rationale.
5. **The verdict is the gate.** Every node taxonomy ends with a mr-kahn verdict section; APPROVE is required before the node enters any generation batch (BATCH_REGEN §8 gates 1–2 posture).
