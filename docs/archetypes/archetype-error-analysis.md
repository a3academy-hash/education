# Archetype: error-analysis

Presents a named fictional peer's worked solution that instantiates one taxonomy entry's detection signature step by step; the student locates the first breaking step, then diagnoses the belief that produced it.

Gold exemplars (cite only, never copy): `docs/gold-node/gold-node-items.json` items `ALG-L06-gold-ea-01` … `ea-03`.

## Interface (BATCH_REGEN_SPEC §4.2 + BATCH_REGEN_PATCH_voice)

| Field | Value |
|---|---|
| id | `error-analysis` |
| version | `1.0.0` |
| itemForm | `error-analysis` (exact §4.2 enum fit) |
| phaseApplicability | P2, P3 (gold: P2, P2, P3). P1 not exemplified — diagnosing a peer's break presumes the procedure is already established; a manifest scheduling P1 instances has no gold anchor. |
| representation | verbal + symbolic (the shown work) + graph/table (dual-representation reveal) |
| hintLadderShape | Taxonomy §3.1 three-rung ladder via `hintLadderRef: {generic, perTag}`; `perTag` covers the target entry (`errorAnalysisOf`) plus every distractor-belief tag in the misconceptionMap (all three gold instances do). Untagged wrong answers (including wrong locate picks) → generic ladder + null-tag log. |
| misconceptionSlots | 1 target entry (`errorAnalysisOf`) whose signature the shown work instantiates + 3 distractor-belief entries whose signatures provably mismatch the shown work → ≥4 signature-bearing entries per instantiation. Across a node's error-analysis set: targets must span distinct cognitive roots and include ≥1 BLOCKER-severity entry where the node has one (ea-02's rationale). |
| rubricElementRefs | none — not a rubric-explanation form (diagnosis is selection against keyed beliefs, not a scored free-text explanation) |
| visualSpecShape | D1-convention visual object; type `dual-representation` (shown work/table panel + correct-structure panel — ea-01/ea-02) or `coordinate-plane` (ea-03); see §e |
| solverContract | The harness recomputes (i) the target signature on the item's parameters and verifies it equals the shown final answer (taxonomy §3.2 rule 2), (ii) each distractor entry's signature value and verifies it does NOT equal the shown answer (rule 3), and (iii) pairwise distinctness of all belief-values. This makes the §3.2 contract machine-checkable end to end. |
| voiceRegister | `per-phase` (P2 instruction; P3 assessment — ea-03's compressed stem is the P3 exemplar) |
| askPatterns | Declared archetype frames with no corpus analog (QUESTION_VOICE §11 row 12; declaring them is what makes drift detectable per the patch §2): `which-step-breaks` ("Which step is the first one that breaks?") and `peer-belief-diagnose` ("What did ⟨name⟩ think was true?"). Final ask is always `peer-belief-diagnose`. |
| stemBand | P2: 30–60 words; P3: 0–48 words (assessment register, lower bound 0 — ea-03's stem is ~20 words). Shown-work step lines are not stem words (they break the FK instrument; §11.1 row 11 note). |
| interpretationSlot | `false` — belief-diagnosis is not a meaning-in-context ask under the QUESTION_VOICE instrument (the gold node's 20%/26.7% interpretation figures count only scaffolded capstones). The manifest must source interpretation-floor coverage elsewhere. |

## a. Construction rules

1. **Pick the target.** `errorAnalysisOf` names one taxonomy entry whose signature can be instantiated as visible work (not merely as a final wrong number). Across the node's error-analysis set, choose targets with **distinct cognitive roots** (gold: notational §2.7, additive §2.6, proportional-overgeneralization §2.9) and include the node's BLOCKER root where one exists — the deepest prerequisite-gap beliefs make the highest-value diagnosis items.
2. **Shown work reproduces the signature literally** (taxonomy §3.2 rule 1): ~4 numbered steps in which the fictional peer executes the belief's algebraic form on the item's parameters. The written work must show the belief acting (ea-01's fraction literally pairs within-point numbers).
3. **The shown final answer equals the computed trap value** for the item's parameters (rule 2). No rounding drift, no "approximately."
4. **Steps before the break are genuinely correct** — the work isolates the belief precisely (ea-02: both deltas right, only the comparison operation wrong, so locate lands on the last step). The belief determines where the break lands; do not smear errors across steps.
5. **Two questions, fixed order** (rule 3): `locate` — choice over the steps, keyed to the step where the belief first acts; then `diagnose` — choice among belief statements in student language. The correct diagnosis is the target entry's Definition rewritten in student register.
6. **Distractor beliefs mismatch the work.** Each diagnose distractor is another taxonomy entry whose signature, computed on this item's parameters, does NOT produce the shown answer — and each map signature documents the mismatch arithmetic ("§2.1 would produce 16, not 21/9" — ea-01). This is what makes the correct diagnosis unique and deterministically gradable.
7. **Persona:** a named fictional peer with realistic demographics; the work "breaks" — never framing the peer as careless or foolish. Peer attribution is the archetype's voice signature.
8. **Phase instantiation.** P2: sport-context data, the peer charts/tracks something authentic, instruction register. P3: neutral object, compressed assessment stem carrying only data + a handoff ("…and ⟨name⟩'s work for its slope is shown below."), realistic decimal-bearing values at the P3 rate (ea-03 post-ADJUST: points (2.5, 11)/(12.5, 30) — the v3 realism retune is the exemplar state).
9. **Trap arming:** the target entry's generator constraints must hold on the chosen parameters; all belief-values (shown answer + three distractor signature values) pairwise distinct.
10. **Evidence routing:** `errorAnalysisOf` metadata routes a correct-diagnosis miss / distractor pick to the same skill-model tags as direct trap hits (§3.2 rule 4).

## b. Taxonomy interface (requirements on node taxonomies)

1. **Step-instantiable signatures.** The target entry's signature must decompose into a worked procedure — the taxonomy must make clear *which operation* embodies the belief so `locate` can be keyed to one step. Entries defined only by a final output value cannot be error-analysis targets.
2. **≥4 computable-signature entries per instantiation** (1 target + 3 mismatch-verifiable distractors), each a closed-form function of item parameters so the mismatch check (§3.2 rule 3) is mechanical.
3. **Belief-statement definitions** (taxonomy §1 condition 1): every candidate entry's Definition must be rewritable as a "⟨name⟩ thought X was true" sentence in middle-school register.
4. **Cognitive-root labeling** on every entry, so a node's error-analysis set can be certified to span distinct roots (rule a.1). Root is a required taxonomy field, not optional color.
5. **Collision matrix** so distractor uniqueness is verifiable: no two candidate beliefs may produce the shown answer on the chosen parameters; where the matrix documents a numeric collision, the parameters must be chosen outside it.
6. **Severity ranking**, because error-analysis evidence feeds the same routing as direct hits (§3.4) — a BLOCKER target must route backward on activation, and the taxonomy must say where.

## c. Voice conformance

- **Declared frames are fixed strings** (see interface): "Which step is the first one that breaks?" and "What did ⟨name⟩ think was true?" recur verbatim across all three gold items — frame stability is the conformance property; drift in the frame is detectable drift.
- **Ask lands last** in the stem→work→questions ordering, and within each question; both questions close interrogatively.
- **Register by phase:** ea-01/ea-02 P2 instruction stems (peer + context + data + "Find where it breaks."); ea-03 P3 assessment stem (data + handoff only — the ADJUST #10 compression is the exemplar state). FK band is a ceiling; worked-step lines make per-item FK statistically meaningless and are excluded (§11.1 row 11).
- **Peer-attributed error voice** is a measured KEEP with no corpus analog (QUESTION_VOICE §11 row 12) — additive, not drift; keep it.
- **No coaching:** the stem never hints at which step breaks or what kind of error to look for.

## d. Deterministic-gradability contract

- **Answer types:** both questions are `choice` with exact option-id matching — RUNTIME_TUTOR_SPEC §6 list item 1 applies verbatim: "**Answer checking on closed-form items** — numeric/symbolic/exact-match verification against the certified answer. Solver, not model." Diagnosis is selection against keyed beliefs precisely so it never needs §1.2 free-response grading (the LLM path).
- **Trigger matching:** the item-level misconceptionMap uses question-prefixed triggers (`"diagnose:A"` — the questions-level mirror of the parts-level part-prefix convention), keeping the attempt log reconstructable per question (taxonomy §3.4 audit trail). Gold maps carry only `diagnose:` triggers: wrong `locate` picks are untagged wrong answers (generic ladder + null-tag log), because a wrong step choice is not by itself evidence of a specific belief.
- **Signature strings carry the mismatch proof** ("§2.7 would produce 9/4, not the shown 20") so an auditor — and the `misconceptionTagsValid` audit check — can verify keying without re-deriving.
- **Solver contract** (see interface row): shown answer = target signature; each distractor signature ≠ shown answer; pairwise distinctness. All computable host-side; consistent with RUNTIME §6 items 2/4 — the evidence enters deterministic mastery updates/gating, never an LLM verdict.

## e. Visual spec requirements

- **Type:** `dual-representation` default — left panel carries the peer's artifact (table + `shown_fraction` / `shown_comparison` string), right panel the correct structure (full coordinate-plane spec); or `coordinate-plane` where the confrontation lives on one plane (ea-03). **No nulls:** every panel fully specified — table columns/rows, shown-work fraction string, axes with label/range/gridline_every, points with labels, line, arrows with from/to anchors and arithmetic labels, readout.
- **reveal_beats tied to question resolution:** beat 1 = first paint (peer's artifact beside the bare graph — the correct structure absent); "On locate resolve:" highlight the breaking operation *in the shown work* (glowing numbers, `--error-on-light` operation glyph, green checkmarks on the correct steps — ea-02); "On diagnose resolve:" draw the correct structure + readout. Correct arrows/readouts are hidden until diagnose resolves (no leakage — ea-01 annotation).
- **The reveal stages the target entry's remediation move** on this item's numbers: ea-01 inverts §2.7's color-coding counter (same-point numbers in ONE color); ea-03 computes y/x at BOTH points so the peer's own rule contradicts itself, with the hidden intercept as the payoff. Generated items must pick the reveal from the target entry's documented remediation move, not invent one.
- **Color/annotation conventions:** lesson rise/run colors on the corrected structure; checkmarks for correct steps; crossed-out shown answer stacked over the correct readout (ea-02).
- **Manim-buildable** from the spec alone, including the two-stage question-keyed reveal.

## f. Interest-skinning rules

- **May swap:** persona name (kept demographically realistic — the content-persona realism rule), context nouns, unit labels, the scenario sentence. **FROZEN:** every number in the shown work, the algebraic form of each step, step count and break-step index, the shown final answer, all distractor signature values, question order, difficulty, phase, visual geometry.
- **Structural-skin rule:** the peer must be working on the context's own quantities (charting strikeouts per start); a skin where the shown work computes something the story doesn't generate fails.
- **Quasi-frozen prose:** shown-work step lines swap nouns only — the arithmetic strings are byte-identical across skins (INTEREST_DOMAINS §4: frozen elements byte-identical except noun/unit labels).
- **P3 instances neutral by phase discipline — never skinned** (ea-03 class).
- **§6.1 hard constraints:** fitness — performance quantities only; additionally, a peer's mistake must never be body-/weight-/calorie-related framing (banned quantities are fatal wherever they appear, including inside shown work). Social — fictional creator accounts only; follower/view counts may appear only as neutral inputs to the rate computation, never as goals.
- **Skins adequately.** No collision-probe constructions exist in the gold error-analysis set, but any future error-analysis item built as a disambiguation probe inherits the neutral-default flag (see predict-reveal §f).
