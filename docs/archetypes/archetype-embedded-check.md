# Archetype: embedded-check — one engine-graded choice item per lesson fading stage, keying every distractor to a taxonomy detection signature so instruction and diagnosis run on the same evidence rail.

**Lesson-embedded.** Instantiated inside D1-style lessons (LESSON_TEMPLATE.md §EMBEDDED CHECKS), not the item bank; counted lesson-side per MANIFEST.md §2/§4 (4 per lesson, one per fading stage, ≥1 interpretation-form). Gold exemplars: `docs/gold-node/GOLD_NODE_LESSON.md` §4 EC1–EC4.

## Interface (BATCH_REGEN_SPEC §4.2 + BATCH_REGEN_PATCH_voice §2)

| Field | Value |
|---|---|
| `id` | `embedded-check` |
| `version` | `1.0.0` (tracks MANIFEST §1 `archetypeLibraryVersion`) |
| `itemForm` | `closed-form` (closest enum). Note: lesson-embedded MC — lives in the lesson document, not the node's bank; excluded from the §4 distribution rows and the bank's manifest item count. |
| `phaseApplicability` | P1 / P2 / P3 — **inherited from the fading stage the check follows**, never set independently (gold: EC1 P1, EC2–EC3 P2, EC4 P3 per GOLD_NODE_LESSON appendix "Phase discipline" row). |
| `representation` | Matches the preceding worked example's representation (concrete diagram / table / graph / numeric-symbolic). A check never introduces a representation its stage has not taught. |
| `hintLadderShape` | Taxonomy §3.1 three-rung entry-conditional ladder per trapped entry (root probe → targeted counter → worked micro-step; never the answer). Additional bind on pre-formalization checks: rungs 1–2 never mention the formula/notation (gold §4 preamble). Collision-pair hits get the shared rung-1 probe (taxonomy §3.1). |
| `misconceptionSlots` | Every distractor keys to exactly one taxonomy entry via its detection signature evaluated on the check's actual numbers — except documented collision pairs, handled per rule a.6. Zero unkeyed distractors. `misconceptionMap` = exactly the distractor keying list (gold §4 preamble). |
| `rubricElementRefs` | None. MC; the correct-line feedback is fixed student-visible text, not rubric-scored. |
| `visualSpecShape` | Lesson fenced `visual` block (LESSON_TEMPLATE §APPENDIX no-nulls bar): either reuse-with-stated-substitutions of the stage visual or a purpose-built full spec; never null; pre-answer frame must not reveal the key (§e). |
| `solverContract` | Key and every trap value are closed-form functions of item parameters (the taxonomy signatures). Host solver recomputes key, all applicable signatures, and pairwise distinctness at instantiation (taxonomy §2.15 global generator rule). |
| `voiceRegister` | `per-phase` (BATCH_REGEN_PATCH_voice §2 resolution rule). P1/P2 checks → instruction register; the P3-stage check is a standalone single-ask item → assessment register (gold EC4). |
| `askPatterns` | `which-select`, `what-is-value`, `meaning/interpretation` (QUESTION_VOICE §3 catalog). The interpretation-form check uses the stable frame "Which sentence says what this ___ means?" (QUESTION_VOICE §10 assessment register; gold EC2). |
| `stemBand` | Instruction register 30–60 words (P1/P2 checks); assessment register ≤48 words with lower bound 0 (P3 check — bare-points minimal stems are compliant, gold EC4). |
| `interpretationSlot` | `true`. ≥1 check per lesson MUST instantiate the interpretation form (rule a.4). Lesson-side: satisfies the MANIFEST §4 lesson requirement, not the §7 bank floors. |

## a. Construction rules

1. **Count and placement.** Exactly one check per fading stage, inserted immediately after its worked example and before the next stage begins (gold §3 authoring notes: "interleaved one per stage: EC1 after 3.1 … EC4 after 3.4"). Four checks per lesson (MANIFEST §4 lesson-side counts).
2. **Number choice.** A check may reuse its stage's dataset (gold EC2 reuses D2's values re-skinned; EC4 reuses D4 bare) or introduce fresh numbers (gold EC1, EC3). Either way, every applicable taxonomy signature is recomputed on the check's actual numbers before keying — never inherited from the stage's authoring notes.
3. **Two keying modes** (gold §4 preamble — both deterministic, keyed choice unique):
   - **Computation checks:** the distractor IS the entry's trap value computed on the item's numbers (gold EC1, EC3, EC4).
   - **Interpretation checks:** the distractor is the entry's belief **verbalized, with its asserted quantities recomputed on the item's numbers** so the wrong reading contradicts the item's own data (gold EC2: the change-not-rate reading asserts "grew by 3 in all" against an actual Δy the stem's data makes checkable).
4. **Interpretation floor.** ≥1 check per lesson asks meaning, not computation (QUESTION_VOICE §11 ADJUST #8; D1 measured 25% = 1 of 4 post-ADJUST, QUESTION_VOICE §11.1 row 8). Default slot: the representational stage's check (gold EC2), where the quantity names are richest.
5. **Choice count.** 3–4 options. The P3/assessment-register check carries exactly 3 distractors (QUESTION_VOICE §10). An instruction-register check may run 2 distractors when the stage's armable signature space is genuinely thinner (gold EC1: concrete stage, 2 keyed distractors) — never pad with an unkeyed option.
6. **Collision-pair probe convention** (generalizes gold EC3 distractor B). When two entries' signatures produce the same value on the check's chosen numbers AND the pair is documented in the node taxonomy's collision matrix: one distractor may carry the pair — a hit **logs both tags, sets neither active, and queues the matrix's disambiguation probe as the next scheduled item** (gold: the ambiguous −m/|m| pair queues a positive-slope follow-up). Undocumented collisions are defects: re-parameterize the check's numbers (taxonomy §2.15 global generator rule). Never key a colliding value to a single tag.
7. **Distinctness.** All trap values pairwise distinct and distinct from the key, outside documented pairs, verified on the check's numbers at instantiation; respect per-entry separation constraints (e.g., minimum trap-to-key distance vs grading tolerance, taxonomy §2.9 note).
8. **Feedback line.** The "Correct" line doubles as student-visible feedback: units attached to every quantity, restates the reasoning on the item's numbers, zero design rationale (gold §4 preamble). Realism/authoring rationale lives in Authoring notes only.
9. **Give-away control.** Nothing rendered pre-answer may compute or display the key or discriminate a distractor (gold V-EC1-01: "no per-1 readout shown before the student answers"; gold EC2 note: arrows and readout draw only on resolve). Resolve beats then show the full reasoning.
10. **Routing awareness.** A check whose distractor keys a BLOCKER or prerequisite-gap-flavored entry notes this in its Authoring notes with the taxonomy §3.4 evidence rule it triggers (gold EC4: a §2.9 hit is "HIGH prerequisite-gap-flavored — 2 hits route per §3.4"). The check does not route; the engine does.

## b. Taxonomy interface — what the node taxonomy must supply

- **Computable signatures.** Every entry the check may trap must define its detection signature as a closed-form function of item parameters, evaluable on any candidate numbers (taxonomy §1 condition 2).
- **Generator constraints per entry**, so numbers can be chosen to arm the intended traps (gold: §2.9 requires b ≠ 0; §2.1 requires |Δx| ≠ 1). Check authoring is constraint-solving: pick numbers so target entries' traps are armed, live, and distinct.
- **A consolidated collision matrix** (taxonomy §2 tail) with, per row: the colliding value, the conditions under which it collides, and the named disambiguation probe. Rule a.6 cannot run without it — a node taxonomy lacking the matrix is not check-ready.
- **Presentation-class rules** where attribution depends on how quantities are presented (gold §2.3: named-quantity items tag `inverted-ratio` directly; bare-pair items queue a plot probe). The check's Authoring notes must state which class it is, because keying differs.

## c. Voice conformance (QUESTION_VOICE)

Binding properties: context → data → ask order with the ask last (§1 universal invariant); units named inside the ask for rate items (§10; gold EC3 "in pitches per inning?"); stem bands and register per the interface table (§10); interrogative close on the P3 check (§10 assessment register); the interpretation check uses a stable frame (§10); FK ceiling per §10 with the §11.1 row-11 scoping (minimal P3 stems below band are compliant — the band is a ceiling, not a per-sentence floor). Exemplars by reference: gold §4 EC1 (P1 which-select on a concrete comparison), EC2 (interpretation frame, belief-verbalized distractors), EC3 (P2 computation, units in the ask, collision-pair distractor), EC4 (P3 minimal bare-points stem, assessment register).

## d. Deterministic-gradability contract

- **Engine-graded, never LLM.** Embedded checks are closed-form MC; answer checking is on the RUNTIME_TUTOR_SPEC §6 never-LLM list (item 1). No runtime call type touches the grade; the LLM tutor may only fire afterward on an engine-detected stuck state (RUNTIME §1.1), and its output is advisory.
- **Trap → tag → ladder wiring.** Distractor hit → the entry's signature hit is logged (1 hit = weak evidence; 2 hits, or 1 hit + failed disambiguation probe = tag active — taxonomy §3.4) → the entry's three-rung ladder serves from cached templates with the item's parameters slotted in (taxonomy §3.1, no LLM on this path). Every trap value, tag, probe result, and route is written to the attempt log (taxonomy §3.4; accreditation evidence trail).
- **Probe-queue mechanics.** A collision-pair hit logs the tag pair, activates neither, and queues the matrix's disambiguation probe as the next scheduled item; the pair shares rung 1 of the hint ladder (taxonomy §3.1). Probe outcome re-attributes to one entry or activates per §3.4. Until resolved, neither tag routes.
- **No untagged wrong answers exist** on a conforming check (every distractor keyed), so the generic ladder / `misconception_tag: null` path (taxonomy §3.1) applies only to defects.

## e. Visual spec requirements

- **Reuse-with-stated-substitutions convention.** A check reuses its stage visual's geometry with every substitution enumerated in its Authoring notes — axis labels, ranges, gridline spacing, points, which annotations are withheld pre-answer (gold appendix row (e): "EC2/EC3/EC4 reuse specified geometries with stated substitutions"; gold EC2 note names the labels and the withheld arrows; EC3 note names ranges and points). "Similar to V-X" without the substitution list is nonconforming.
- **Purpose-built specs** are allowed where the check's diagnostic engineering needs its own geometry (gold V-EC1-01: ramps engineered so the additive comparison says "equal") and follow the full lesson visual grammar (id, type, purpose, data, annotations, reveal_beats).
- **No-nulls Manim-buildable bar:** every field concrete — a renderer could build the visual from the spec alone with zero decisions (LESSON_TEMPLATE §APPENDIX row (e); gold: zero null/unspecified visuals).
- **Assessment-beat rule:** static pre-answer frame; diagnostic overlays and readouts draw on resolve only (rule a.9).

## f. Interest-skinning rules

- **Invariance contract binds** (INTEREST_DOMAINS §4): numeric structure and values, trap values and their entry IDs, difficulty, hint-ladder keying, and phase are FROZEN; only nouns, scenario framing, and unit labels swap. A skin that would change any trap's attribution is invalid.
- **Presentation-class freeze (this archetype's extension of §4):** where the taxonomy's collision rules key on presentation class (named-quantity vs bare-pair, gold §2.3), that class is part of the frozen structure. A skin may not turn a bare-pair check into a named-quantity check or vice versa — doing so silently changes which tag a distractor keys.
- **Neutral-default flags:** (1) the abstract-stage check is P3 → neutral always, never skinned (phase discipline; gold EC4); (2) **collision-probe checks** — both the check carrying a documented collision pair and its queued disambiguation probe — default neutral unless the skin is verified not to alter the presentation class or the probe's discriminating condition. Diagnosis integrity outranks engagement.
- **Fitness / social-media skins:** INTEREST_DOMAINS §6.1 hard constraints are fatal-class at generation and audit (BATCH_REGEN §6.2 `fitnessFramingSafe` / `socialFramingSafe`). No banned quantity ever appears in a check stem, distractor, feedback line, or hint rung.
- **Coverage triage:** skin only where the domain carries the concept at ● or ◐ (INTEREST_DOMAINS §3); ○ routes to the default floor (§5). A skinned check must keep the structural-skin rule: the scenario's data is consumed by the math (gold appendix; QUESTION_VOICE §10 universal).
