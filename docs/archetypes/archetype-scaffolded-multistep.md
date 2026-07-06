# Archetype: scaffolded-multistep

Decomposes a node's core procedure into 2–5 individually graded parts — each part one cognitive step, wrong intermediates trapped and propagated — ending with a part that interprets or generalizes the result.

Gold exemplars (cite only, never copy): `docs/gold-node/gold-node-items.json` items `ALG-L06-gold-scaf-01` … `scaf-04`.

## Interface (BATCH_REGEN_SPEC §4.2 + BATCH_REGEN_PATCH_voice)

| Field | Value |
|---|---|
| id | `scaffolded-multistep` |
| version | `1.0.0` |
| itemForm | `closed-form`. Note: imperfect fit — the §4.2 enum has no multipart value. Every part is independently closed-form gradable (numeric or choice), which is the operative gradability class; the multipart body (`parts[]`) is the additive schema extension the gold JSON `schemaNote` documents. |
| phaseApplicability | P1, P2, P3 (gold spans all three; P3 instances follow instruction-register part rules under P3 phase discipline) |
| representation | verbal + graph (coordinate-plane support visual); part answers numeric or choice; a generalization capstone may be symbolic-as-choice (scaf-03 part d) |
| hintLadderShape | Taxonomy §3.1 three-rung ladder per trapped entry (root probe → targeted counter → worked micro-step; never the final answer), referenced via `hintLadderRef: {generic, perTag}`. `perTag` keys MUST cover every tag in the item's misconceptionMap. Untagged wrong answers → generic ladder + `misconception_tag: null` log. |
| misconceptionSlots | Per-part slots: ≥1 live armed trap on each early procedural part; the full live trap set (3–4 entries) on the synthesis part; 2–3 taxonomy-keyed distractors (entries in belief/interpretation form) on the interpretation capstone; propagated-trap slots on any use-the-result part. Requires ≥4 distinct signature-bearing entries per instantiation (degenerate-case items may run on 2 dedicated entries — scaf-04). |
| rubricElementRefs | none — not a rubric-explanation form |
| visualSpecShape | D1-convention visual object `{id, type, purpose, data, annotations, reveal_beats}`, type `coordinate-plane` (default); see §e for the no-nulls field list |
| solverContract | Every part key is a closed-form function of the stem parameters (solver recomputes rise, rate, extension value, etc.); choice keys verified by recomputing each distractor's generating signature; `acceptedEquivalents` collision-checked against all trap values. Enables §5.2 step-4 symbolic verification per part. |
| voiceRegister | `per-phase` (patch §2 resolution rule verbatim: P1/P2 → instruction; standalone P3 → assessment; P3-phase scaffolded practice → instruction part rules under P3 discipline — scaf-03 is the exemplar of the third case) |
| askPatterns | `what-is-value`, `how-many/much`, `which-select`, `meaning/interpretation`. Constraint: the final part's ask must be `meaning/interpretation` (interpretation capstone) or `which-select` in generalization form (fading capstone). |
| stemBand | Instruction register 30–60 words (patch default; the ≥90% node-level conformance check absorbs tight P1 stems); P3 instances may set lower bound 0 (minimal bare-object stems compliant — scaf-03's stem is 8 words). Never widened. |
| interpretationSlot | `true` — this archetype is the primary carrier of the node's interpretation floors (§3.1 of the patch); all four gold instances end interpret-or-generalize (QUESTION_VOICE §11.1 row 9). |

## a. Construction rules

1. **One stem, all data.** The stem states the context and the complete dataset once; parts never introduce new data. P1 narrates the data in context language (scaf-01); P2 pairs the context with explicit coordinate/formal notation (scaf-02); P3 presents the bare mathematical object (scaf-03).
2. **Part (a) is the entry ramp.** It isolates the first move of the node's core procedure and is answerable by direct arithmetic on given values (QUESTION_VOICE §4: IM part (a) is nearly always directly computable).
3. **Exactly one cognitive step per part**, following the procedure's canonical decomposition; a synthesis part combines the students' prior results into the node's target object. 2–5 parts, hard cap 5 (gold: 3–4).
4. **Later parts consume the student's earlier results** ("Using your rise from part (a)…"). Where the node's procedure has a use-the-result step, arm **propagated traps**: the later part's trap values are the deterministic downstream consequences of each earlier misconception, so a consistent wrong model leaves a two-hit evidence trail (taxonomy §3.4: 2 hits = tag active). Exemplar: scaf-03 part (b).
5. **A part may pre-supply one step** to focus assessment on the adjacent step (scaf-02 part (b) gives the run so the signed division is isolated).
6. **Interpretation capstone (QUESTION_VOICE §11 ADJUST #8).** The final part asks what the computed number means, as a choice whose distractors are taxonomy entries rewritten in belief/interpretation form — every distractor keyed, zero random. **Hazard rule:** no distractor may restate the correct reading; in cumulative contexts, re-verify that an interval-worded option is genuinely wrong, not a paraphrase (scaf-01 authoringNote's cumulative-context check).
7. **Abstraction-fading capstone (ADJUST #9).** At least one P3 scaffolded item per node ends with a generalization part that strips the numbers (compute → use → interpret → generalize), delivered as choice-for-expressions while the keypad is fraction-only; choices use the node lesson's exact notation, and distractors key the notational/structural entries in general form. Exemplar: scaf-03 part (d).
8. **Trap arming.** At parameterization, evaluate every applicable entry signature; every trap value must be live under its entry's generator constraints, pairwise distinct, and distinct from the key (taxonomy §2.15 global generator rule). Gold authoringNotes list the constraint checks explicitly — generated items must do the same.
9. **Choice where the keypad can't.** Degenerate, verbal, or symbolic answers ("undefined", general expressions) are delivered as choice parts with fully keyed distractors.
10. **Collision handling.** Where parameters put a trap in a documented ambiguity zone, the map entry records the pair-log + probe-queue semantics from the collision matrix instead of asserting one tag (scaf-02 parts (a)/(b): −m/|m| pair logged, neither tagged, positive-slope probe queued).
11. **Degenerate-case coverage.** Nodes with degenerate cases the standard items can't reach get a dedicated scaffolded item running the procedure through the degenerate case (scaf-04: horizontal line; the remediation stance is "run the procedure, don't recite the label").
12. **Phase-instantiation differences.** P1: sport context, clean numbers, difficulty ~2, conversational framing. P2: blended context + formal notation, signed/negative and realistic values admitted, difficulty ~3. P3: neutral academic object, fraction/non-integer keys with `acceptedEquivalents`, minimal stem, difficulty ~3+.

## b. Taxonomy interface (requirements on node taxonomies)

1. **≥4 distinct signature-bearing entries** whose detection signatures are closed-form functions of the item parameters (taxonomy preamble: "Every detection signature is a computable function of these parameters"). Needed to fill the synthesis part's 3–4 traps plus part-level traps. A degenerate-case item can run on 2 entries only if the node taxonomy carries dedicated degenerate-case entries.
2. **Generator constraints per entry** (arming conditions like |Δx| ≠ 1, b ≠ 0) so the generator can verify at parameterization that each trap is live, distinct, and outside grading tolerance of the key.
3. **Step locality.** Signatures must identify which procedural step the belief acts at, so traps land on the right part (scaf-01: §2.2 "caught at the rise step").
4. **Belief/interpretation forms.** ≥3 entries must be rewritable as student-language belief statements for capstone distractors — the entry's Definition must name a belief, not a wrong output (taxonomy §1 condition 1).
5. **Propagation forms.** Document how each entry's wrong intermediate propagates through the node's later steps (else rule a.4 is unusable and two-hit trails weaken).
6. **Collision matrix** with disambiguation probes, consulted whenever parameters land in an ambiguity zone; the archetype embeds pair-log/probe-queue instructions in the signature text.
7. **Severity ranking** per entry, so downstream hint and routing behavior (§3.4) is defined for every trap the item can fire.

## c. Voice conformance

- **Register by phase** per the patch §2 `per-phase` rule; scaf-03 is the canonical P3-scaffolded case (instruction part rules, neutral context, minimal stem).
- **Stem band**: instruction 30–60 words before parts, 1–3 context sentences (QUESTION_VOICE §10); exemplars scaf-01/scaf-02. P3 minimal stems below band are compliant by design (§11.1 row 11 scoped ruling — the FK 6–8 band is a ceiling, not a per-sentence floor; scaf-03 exemplar).
- **Ask lands last in every part**; context → data → ask is invariant (§10 universal).
- **Units named inside the ask** on rate/quantity parts: "…what is the slope, in runs per game?" (scaf-01 part (c)).
- **Imperative asks allowed** in instruction-register parts ("Compute the rise… Keep the sign." — scaf-02 part (a)); interrogative close required on P3-assessment surfaces.
- **Interpretation capstone uses the stable frame** "Which sentence says what that slope of N means?" (scaf-01/scaf-04) — the frame the §11.1 instrument was extended to catch.
- **No meta-labels or authoring-speak** in student text (the "No story." label was deleted from scaf-03 by ADJUST; voiceConformant audit check, patch §3.2).

## d. Deterministic-gradability contract

- **Answer types:** `numeric` (exact string match plus the parts-level `acceptedEquivalents` list — scaf-03 part (a): key `3/4`, equivalents `0.75`, `6/8`; canonical answer stays fraction-form for the fraction-first keypad) and `choice` (exact option id).
- **Trigger matching:** exact strings per part in the per-part `misconceptionMap` (`{trigger, tag, signature}` objects).
- **Part-prefixed flattened mirror:** the item-level map repeats every per-part entry with `partId:`-prefixed triggers (`"a:-20"`, `"d:B"`) so the attempt log stays reconstructable per taxonomy §3.4 (gold `schemaNote`; scaf-01 exemplar). Mirror completeness is an audit-trail requirement: every per-part entry appears exactly once, prefixed, at item level.
- **acceptedEquivalents convention:** every equivalent is collision-checked against every trap value on the same part (pr-02's authoringNote states the procedure; it binds here identically).
- **Never-LLM consistency** (RUNTIME_TUTOR_SPEC §6): part grading is list item 1 — "**Answer checking on closed-form items** — numeric/symbolic/exact-match verification against the certified answer. Solver, not model." Evidence from trap hits feeds list items 2/4 ("**Mastery updates**…", "**Mastery gating**…"), which are deterministic; the item exposes trigger→tag→signature so the engine needs no interpretation. Hint dispatch is trigger-matched to the pre-authored `perTag` ladder (taxonomy §3.1: cached templates, "no LLM on this path").
- **Solver check:** each part key recomputable from stem parameters; the harness verifies key, traps, equivalents, and constraint satisfaction before the item advances (§5.2 step 4).

## e. Visual spec requirements

- **Type:** `coordinate-plane` (default). **No nulls** — the spec must carry every field the renderer needs: `x_axis`/`y_axis` each with `label`, `range`, `gridline_every`; `points[]` with coordinates and label strings; `line` description; `arrows` with explicit `from`/`to` anchor coordinates and label strings (labels show the arithmetic: "rise = 30 − 10 = 20"); `readout` string.
- **reveal_beats tied to part resolution**, one beat per part in part order, each naming its trigger ("On part (a) resolve: rise arrow draws upward with its label." — scaf-01). Parts with no visual change say so explicitly: "(No visual change on parts (c) and (d) — …)" (scaf-03). Beats may include captions that land the teaching point.
- **Withheld-visual convention (P3):** the visual may be held back entirely until a mid-item resolve as a confirmation-only payoff ("(No visual during parts (a) and (b) — abstract stage.)" — scaf-03), keeping the canvas clean at the abstract stage.
- **Color/annotation conventions:** rise `--blue-on-light`, run `--green-on-light` (arrowheads required); negative rise `--error-on-light` pointing DOWNWARD (scaf-02); readouts in Plex Mono (scaf-01); zero-length rise rendered as a pinned dot with label (scaf-04). Annotations state hide-until-resolve rules ("arrows and readout are hidden on first paint; each appears only after its part resolves").
- **Manim-buildable:** a builder must construct the full scene and beat sequence from the spec alone — no field may require consulting the prompt text or authoring notes.

## f. Interest-skinning rules

- **May swap** (INTEREST_DOMAINS §4): context nouns/entities, the scenario sentence, unit label names, personas. **FROZEN:** every parameter and key, all trap values and their entry IDs, generator-constraint satisfaction, part count and sequence, difficulty tier, phase, hint-ladder mapping, and the visual geometry (axis ranges, points, arrow anchors) — only axis-label nouns swap.
- **Structural-skin rule:** the context quantities must BE the axes' quantities (games/runs are x/y, not decoration). A skin whose story data is never consumed by the math fails the voiceConformant and structuralSkinRuleRespected audits.
- **Capstone re-verification:** interpretation-capstone distractors are context-worded; after any skin, re-verify no distractor has become a restatement of the correct reading in the new context (the cumulative-context hazard travels with the skin).
- **P3 instances are neutral by phase discipline — never skinned.**
- **§6.1 hard constraints:** fitness skins use performance quantities only (pace/distance/time/reps) — body weight, weight-change targets, calories-as-weight-lever, body composition, sizes, before/after framing are fatal; social skins compute growth rates on clearly fictional accounts only — follower/like/view counts as norms/goals/targets, "going viral," real or identifiable accounts are fatal.
- **Skins well overall** (gold spans baseball and football surfaces). Caution: degenerate-case items need a context where the degenerate value is authentic (scaf-04's clean fielding streak makes a zero rate meaningful) — a domain that can't motivate the degenerate case routes that item to a carrying domain or neutral (INTEREST_DOMAINS §5 triage).
