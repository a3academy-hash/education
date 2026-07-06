# Archetype: predict-reveal

Forces a cheap committed prediction that a perception-level or qualitative belief would get wrong, confronts it with a visual reveal, then scores a single deterministic resolve ask — the prediction is logged evidence, never a scored failure.

Gold exemplars (cite only, never copy): `docs/gold-node/gold-node-items.json` items `ALG-L06-gold-pr-01`, `pr-02`.

## Interface (BATCH_REGEN_SPEC §4.2 + BATCH_REGEN_PATCH_voice)

| Field | Value |
|---|---|
| id | `predict-reveal` |
| version | `1.0.0` |
| itemForm | `closed-form`. Note: imperfect fit — the §4.2 enum has no commit-reveal value. The scored resolve ask is closed-form (the operative gradability class); the predict beat is a logged-unscored additive body (`predictPrompt`/`reveal`/`resolvePrompt`, gold `schemaNote`). |
| phaseApplicability | P2, P3 (gold: P2, P3). P1 not exemplified — the archetype's payoff is confronting an already-forming belief; a manifest scheduling P1 instances has no gold anchor. |
| representation | graph + verbal (pr-01 dual-panel graphs; pr-02 bare coordinates → plane reveal) |
| hintLadderShape | Taxonomy §3.1 three-rung ladder via `hintLadderRef: {generic, perTag}`; `perTag` covers every tag in the resolve misconceptionMap. The prediction never triggers a ladder (it is not a wrong answer); ladders fire only on resolve traps. |
| misconceptionSlots | 1 target entry whose belief the predict construction keys (perception-level construction-keyed entry, or a qualitative sign/direction cluster) + 2–3 numeric entries trapping the resolve ask. Resolve traps may implement the target entry's documented disambiguation pair (pr-01: the measured-but-unscaled resolve trap re-attributes §2.12 → §2.11). |
| rubricElementRefs | none — not a rubric-explanation form |
| visualSpecShape | D1-convention visual object; type `dual-representation` (pr-01) or `coordinate-plane` (pr-02); the item's `reveal.visualRef` points at it and `reveal.shows` states in prose what the reveal demonstrates; see §e |
| solverContract | Resolve key computable from parameters; every resolve trap a computable signature; `resolveAcceptedEquivalents` collision-checked against all traps; the values stated in `reveal.shows` and the visual readouts must be recomputable from the same parameters (one consistency check across prompt, reveal text, and visual). |
| voiceRegister | `per-phase` (P2 instruction; P3 assessment — pr-02 post-ADJUST is the P3 exemplar, FK 6.8 in band) |
| askPatterns | Declared archetype frame `predict-commit` for the predict ask (no corpus analog — QUESTION_VOICE §11 row 12; declared per patch §2); resolve ask drawn from the catalog: `what-is-value`, `how-many/much`. Both asks close interrogatively; the final (resolve) ask is the item's final ask. |
| stemBand | P2: 30–60 words across predict stem; P3: 0–48 words (assessment register, lower bound 0). |
| interpretationSlot | `false` — the resolve ask is computation/selection; predict-reveal contributes no meaning-in-context ask under the QUESTION_VOICE instrument. Manifest sources interpretation floors elsewhere. |

## a. Construction rules

1. **Fixed body:** `predictPrompt` (choice, `commitRequired: true`, `predictionLogged: true`) → `reveal` (`visualRef` + `shows`) → `resolvePrompt` (scored numeric/choice). One prediction, one reveal, one scored ask.
2. **The predict targets a belief that acts before computation** — either perception (judging by the picture: pr-01) or qualitative structure (sign/direction from the raw data: pr-02). The predict must be answerable without arithmetic, and the ask says so explicitly ("Just from the look of the two lines…"; "From the coordinates alone, before any arithmetic…").
3. **Binary commit.** Two predict choices — cheap to commit, impossible to hedge. The wrong choice is the one the target belief produces.
4. **Keyed construction.** Engineer the item so *exactly the target belief* selects the wrong prediction (pr-01's panel-scale mismatch is §2.12's own keyed-distractor construction: visually steeper line, numerically smaller slope). The construction recipe comes from the taxonomy entry, not from authoring intuition.
5. **The reveal confronts the committed prediction with the student's own evidence:** post-commit readouts computed from data that was visible all along (pr-01), or the drawn object contradicting the guess (pr-02). Conditional reveal captions keyed to the committed choice are allowed ("if the prediction was 'positive'…" — pr-02).
6. **Resolve ask stays on the same data** — one computation or selection, trap-armed under the standard rules (distinctness, generator constraints, collision handling). Where the target entry documents a disambiguation rule against a neighbor entry, implement it in the resolve traps (pr-01: counted-squares answer re-attributes to §2.11 per §2.12's rule; pr-02: −m/|m| pair logged, neither tagged, probe queued).
7. **Phase instantiation.** P2: sport context with authentic magnitudes. P3: neutral, assessment register, realistic decimal-bearing values with a tractable arithmetic path (pr-02 post-ADJUST: (1.5, 22.4)/(9.5, 8.4), each delta one clean step) — P3 predict-reveal items are prime carriers of the 30–40% realistic-values floor.
8. **Fraction-first keys:** canonical resolve answer in fraction form where fractional, with `resolveAcceptedEquivalents` for decimal/unreduced forms (pr-02: `-7/4` with `-1.75`, `-14/8`).

## b. Taxonomy interface (requirements on node taxonomies)

1. **≥1 construction-keyed or qualitative-surface entry.** Either an entry whose detection signature is a *keyed construction* for choice/comparison items — the taxonomy must document HOW to build the item so only that belief selects the distractor (§2.12: "engineered by scale mismatch between two panels; deterministic because the item is constructed so that exactly this belief selects that panel") — or a belief cluster with a predictable qualitative output (sign, direction) the predict can commit against. Without one of these, the archetype cannot instantiate on the node.
2. **Disambiguation rules between the target and its neighbor entries**, so resolve traps can double as the probe (pr-01 depends on §2.12's documented §2.11 disambiguation; pr-02 on the §2.2/§2.5 collision-matrix row).
3. **2–3 numeric entries with computable signatures + generator constraints** for the resolve traps.
4. **Advisory-evidence semantics.** The taxonomy's evidence rules (§3.4-class) must define what a logged wrong prediction does: it raises the prior on the target belief cluster (pr-02 authoringNote: "logged advisory evidence that raises the prior on the sign cluster before the numeric trap even fires") but **never sets a tag active by itself** — same standard as rubric elements in taxonomy §3.3. Node taxonomies must state this rule so engine behavior is defined.
5. **Remediation moves that are contrast-reveals** (same-data-two-readings, zoom contrasts) mark an entry as predict-reveal-eligible — the reveal is the entry's remediation move rendered as the item's payoff.

## c. Voice conformance

- **`predict-commit` is a declared frame** with no corpus analog (QUESTION_VOICE §11 row 12 names predict-reveal explicitly as additive, not drift); declaring it makes drift detectable (patch §2).
- **Both asks close interrogatively** — predict-reveal has no imperative exception (unlike interactive); gold predict and resolve asks all end with "?". Counts toward, not against, the ≥90% P3 interrogative-close check.
- **Ask lands last** in both beats: predict stem is context → data → predict ask; resolve is a single ask after the reveal.
- **Units named in the resolve ask** for rate asks ("…scoring rate, in points per game?" — pr-01).
- **Register by phase:** pr-02 is the measured P3 exemplar (FK 6.8, inside the 6–8 assessment band — §11.1 row 11); its stem compression to assessment register was ADJUST #10's target state.
- **No arithmetic leakage in the predict stem:** the predict ask must not pre-compute or name the quantity the resolve will ask for.

## d. Deterministic-gradability contract

- **Predict is logged-unscored:** `commitRequired: true` blocks advance until a choice is committed; `predictionLogged: true` writes the committed id to the attempt log as **advisory evidence** — it never enters answer checking, never counts as a wrong attempt, never fires a hint ladder, and never moves mastery by itself. This is the archetype's defining engine semantic; consistent with RUNTIME_TUTOR_SPEC §0 ("evidence, not verdict") and §6 list items 2 and 4: "**Mastery updates** — all BKT `p_known` updates…" and "**Mastery gating** — provisional→locked transitions…" are deterministic and prohibited from any LLM dependency — the prediction feeds them only as a logged prior-raising feature under the taxonomy's advisory rule.
- **Resolve is closed-form:** numeric/choice exact match per RUNTIME §6 list item 1 — "**Answer checking on closed-form items** — numeric/symbolic/exact-match verification against the certified answer. Solver, not model."
- **`resolveAcceptedEquivalents`** is the resolve-prefixed mirror of the parts-level `acceptedEquivalents` convention (gold `schemaNote` v2; pr-02 exemplar) — same semantics: equivalence list on the scored answer, every equivalent collision-checked against every resolve trap.
- **Trigger matching:** bare (unprefixed) exact-string triggers on the resolve map — one scored ask, so no prefix is needed; the predict id is recoverable from the attempt log, keeping the item fully reconstructable per taxonomy §3.4.
- **Collision semantics in-map:** where a resolve trap sits in a documented ambiguity zone, the map entry carries the pair-log/probe-queue instruction (pr-02 trigger `7/4`).
- **Solver contract:** resolve key, all traps, and the values quoted in `reveal.shows` and the visual readouts recomputable from the item parameters — a single-source consistency check the harness runs before the item advances.

## e. Visual spec requirements

- **The reveal IS the visual; pre-commit visibility is part of the spec.** Two conventions, both exemplified, chosen by what is being assessed:
  - **Show everything when not-consulting-it is the misconception:** pr-01's axis numbers are fully labeled from first paint, panels pixel-identical in size, and the annotation says so ("the scales are available; the misconception is not consulting them"). Rate readouts stay hidden until commit.
  - **Show nothing when the picture would answer the predict:** pr-02's annotation — "nothing renders before the commit; the prediction must come from the coordinates alone."
- **reveal_beats start at the commit:** beat 1 is the commit itself; subsequent beats draw the reveal in evidence order (labels pulse → readouts appear → caption lands); conditional beats keyed to the committed choice are allowed (pr-02's final beat).
- **No nulls:** every panel fully specified (per-panel titles, axes with label/range/gridline_every, points with labels, line descriptions, `post_commit_readouts` strings, arrows with from/to anchors and arithmetic labels, readout).
- **Color conventions:** standard lesson palette; negative rise `--error-on-light` pointing downward with the sign highlighted in the readout (pr-02).
- **Manim-buildable including the commit gate:** the builder must be able to stage pre-commit state, commit trigger, and post-commit sequence from the spec alone.

## f. Interest-skinning rules

- **May swap:** context nouns, personas/entities ("Player A/B" labels), unit label names, scenario sentence. **FROZEN:** every number, panel geometry and axis scales (the s_x/s_y relationship IS the construction in scale-betrayal items), predict choice structure, resolve key/traps/equivalents, phase, difficulty.
- **Skins poorly — flagged.** The keyed construction depends on *domain-authentic values on all surfaces simultaneously*: pr-01 works because 3 vs 20 points/game is an authentic role-player/star spread in basketball; a domain whose realistic ranges cannot sustain the engineered order-of-magnitude mismatch cannot carry the item (INTEREST_DOMAINS §3 known-failure rule: if realism and the frozen numbers conflict, the domain doesn't carry that item). Route to a carrying domain or neutral — never bend the numbers.
- **Collision-probe constructions are neutral-default.** Items whose resolve implements a disambiguation pair (pr-01's §2.12/§2.11 pair, pr-02's §2.2/§2.5 pair) — and EC3-style ambiguous-pair probes generally — have diagnostic value that lives in exact parameter relationships; skin only if the swap-validity gate (INTEREST_DOMAINS §4) passes with zero added ambiguity, else render neutral.
- **Abstract P3 instantiations are neutral-default** (pr-02 class; P3 phase discipline already requires it).
- **§6.1 hard constraints:** social-media skins are tempting for growth predictions — permitted only as growth-rate math on clearly fictional accounts, never follower/view counts as norms/goals/targets, never "going viral" framing (fatal). Fitness skins: performance quantities only (pace/distance/reps); all §6.1 banned quantities fatal.
