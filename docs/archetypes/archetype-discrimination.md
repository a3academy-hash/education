# Archetype: discrimination

Single-ask items that assess the boundary of the node's concept — parameters engineered so a confusable neighbor-concept reading produces a different answer than the correct one (Axis-B discrimination).

Gold exemplars (cite only, never copy): `docs/gold-node/gold-node-items.json` items `ALG-L06-gold-disc-01` … `disc-03`.

## Interface (BATCH_REGEN_SPEC §4.2 + BATCH_REGEN_PATCH_voice)

| Field | Value |
|---|---|
| id | `discrimination` |
| version | `1.1.0` |
| itemForm | `closed-form`. Note: gradability class remains closed-form. Battery items with discrimination shape are authored as transfer-battery instances under that entry's rules — a teaching-bank item is by definition *seen* and never counts into a battery. |
| phaseApplicability | P1, P2, P3 (gold: P3, P2, P1 — the boundary is assessable at every phase; only the surface changes) |
| representation | table \| graph \| verbal — the representation is the discrimination surface (nonconstant table, unequal-scale graph, head-start table), so representation choice is dictated by the boundary being tested, not by variety quotas |
| hintLadderShape | Taxonomy §3.1 three-rung ladder via `hintLadderRef: {generic, perTag}`; `perTag` covers every tag in the misconceptionMap (disc-01 legitimately carries a single perTag entry — both traps key the same boundary entry). |
| misconceptionSlots | 1 boundary (contrast) entry per item — the belief that confuses this node's concept with a neighbor concept — plus 1–3 supporting computational entries as additional traps. Two traps may key the same boundary entry through different computations to sharpen the boundary (disc-01: endpoints vs first interval). The key signature must be distinct across the node's discrimination set (each gold authoringNote certifies this). |
| rubricElementRefs | none — not a rubric-explanation form |
| visualSpecShape | D1-convention visual object; types `table`, `coordinate-plane`, `dual-representation`; see §e for the discrimination-specific fields (`units_per_gridline`, `gap_labels_between_rows`, `post_resolve_overlay`, muted-row styling) |
| solverContract | The harness computes every confusable reading from the item parameters (endpoint slope, first-interval rate, square-count value m·s_x/s_y, single-point ratio y/x, height y₂) and verifies: each equals its keyed trap, all are pairwise distinct and distinct from the key, and the arming constraint holds (nonconstant differences / s_x ≠ s_y / b ≠ 0). Data must be internally consistent with the true model (disc-03: all rows satisfy y = 2x + 5). |
| voiceRegister | `per-phase` (P1/P2 instruction; standalone P3 → assessment register — disc-01 is a standalone P3 item and follows the no-sub-parts assessment rules) |
| askPatterns | `which-select`, `what-is-value`, `how-many/much`, plus declared frame `does-property-hold` ("Does y grow at one constant rate?" — disc-01; a yes/no-with-evidence selection not in the corpus catalog, declared per patch §2). |
| stemBand | P1/P2: 30–60 words; P3: 0–48 words (assessment register, lower bound 0 — disc-01's stem is ~25 words and measured below the FK band as a compliant minimal stem, §11.1 row 11). |
| interpretationSlot | `false` — discrimination asks compute-or-classify, not meaning-in-context. Manifest sources interpretation floors elsewhere (scaffolded-multistep carries them). |

## a. Construction rules

1. **One boundary per item.** Each item is built around exactly one contrast: a taxonomy boundary entry defining what the node's skill is NOT (gold: constant vs nonconstant rate §2.14; picture-geometry vs relationship §2.11; proportional vs linear-with-intercept §2.9/§2.8). The node's discrimination set covers distinct boundaries — key signatures must not repeat across the set.
2. **Arm the boundary by construction.** Parameters must make the confusable reading produce a *different* answer than the correct one: unequal axis scales (s_x ≠ s_y), a nonzero start value (b ≠ 0), nonconstant differences. On symmetric parameters the misconception is invisible and "the error survives silently to the transfer battery" (§2.11's warning) — the asymmetry is deliberate, mandatory, and checked.
3. **Single ask, no parts** — standalone-item discipline at every phase; the discrimination must stand alone the way it will on a gate.
4. **Foreground-vs-withhold rule.** If *noticing* a feature is the assessed discrimination, the feature is fully present from first paint (disc-03's head-start row rendered and tagged from the start "because noticing it is the discrimination"; disc-02's y-axis tick labels all rendered — "the scale is fully available"). If *unprompted checking* is assessed, the diagnostic feature is hidden until resolve (disc-01's gap labels) and no coaching clause tips it — disc-01's v2 removed "look at the whole table before computing" precisely so checking the middle unprompted stays the assessed behavior.
5. **Data delivery is not coaching.** A P2 stem may state scale facts in prose ("each y-gridline is 25 yards") — that is the data sentence, and reading it against the picture is the task. A P3 stem states only the object.
6. **Choice construction:** each distractor is a computed confusable reading, keyed; a correct "No" option on a does-property-hold item shows its evidence (disc-01 option B states the growing jumps), while "Yes" distractors each show the computation that seduces (endpoints; first interval). Numeric construction: the traps are the computed confusable readings.
7. **Internal consistency:** all displayed data satisfies the true model exactly (disc-03's table lies on y = 2x + 5) — the boundary is conceptual, never an artifact of noisy numbers.
8. **Numbers that ARE the construct stay clean.** The P3 realistic-values ADJUST yields to construct integrity: disc-01's "+5/+7/+9 first differences ARE the construct" and were deliberately kept clean. Apply realism only where it doesn't blur the boundary.
9. **Phase instantiation.** P1: the boundary in a naturally motivating context (a head start that makes single-point division visibly wrong). P2: a representation-reading boundary on authentic data. P3: the abstract boundary at assessment register, difficulty up to 4.

## b. Taxonomy interface (requirements on node taxonomies)

1. **Boundary entries are REQUIRED.** For each discrimination item the taxonomy must supply an entry whose belief defines the confusion between this node's concept and a specific neighbor concept, carrying: (i) a **construction recipe** — how to build/parameterize an item so the belief is armed and detectable (§2.14's two deterministic forms; §2.11's "the generator must include unequal-scale graphs deliberately"; §2.9's b ≠ 0 requirement), and (ii) an explicit **arming constraint** whose violation makes the trap collapse onto the correct answer.
2. **Minimum ≥2 distinct boundary entries per node** so the node can field a discrimination set with distinct key signatures (gold uses 3). A node taxonomy with no boundary entries is a taxonomy defect — the node's concept has confusable neighbors by curriculum design (Axis B), and the taxonomy must name them — not a license to skip the archetype.
3. **Neighbor naming.** Boundary entries must name the neighbor node/schema being discriminated against (§2.9 names the 7.RP unit-rate schema; §2.14 names its E-domain sibling and the L05 home), because routing on an active hit crosses node boundaries and must be defined.
4. **1–2 supporting computational entries** with computable signatures + generator constraints, for the non-boundary distractors (disc-02/disc-03 use forgot-denominator / inverted-ratio / slope-as-height class entries).
5. **Severity + routing on boundary entries** — boundary hits are forward-looking conceptual guards (§2.14: "it defines the boundary of the concept") and their routing (backward, micro-set, or monitor) must be stated, since discrimination items are frequently gate/transfer material.
6. **Variant computation rules:** where a boundary entry has multiple computational faces (endpoint vs first-interval; y₂/x₂ vs y₁/x₁), the entry must define all of them so the generator can compute, key, and exclude the unused variant (disc-03's signature records the excluded 2.625 variant).

## c. Voice conformance

- **Single interrogative ask, landing last** — all three gold items close with "?" on the final clause; discrimination has no imperative exception.
- **Units named in the ask** for rate asks: "…in yards per game?" (disc-02); "…per game?" (disc-03).
- **`does-property-hold` is a declared frame** (disc-01); the rest of the archetype draws on the corpus catalog (`which-select`, `what-is-value`).
- **Register by phase:** standalone P3 items follow the full assessment rules — ≤48 words, no sub-parts, interrogative close (QUESTION_VOICE §10); disc-01's below-band FK is a compliant minimal stem per the §11.1 row 11 scoped ruling (the band is a ceiling over the full student-visible surface, not a per-sentence floor).
- **No coaching clauses** where unprompted checking is assessed (rule a.4; disc-01's ADJUST is the exemplar); prose scale-facts at P2 are data, not coaching (rule a.5).
- **Distractor evidence in student language:** choice text states the seducing computation plainly ("because from (1, 3) to (4, 24) it climbs 21 over 3 steps") — the belief is visible in the option, which is what makes a pick diagnostic.

## d. Deterministic-gradability contract

- **Answer types:** `choice` (exact option id) or `numeric` (exact string; `acceptedEquivalents` available under the parts-level convention if a key is fractional — unused in gold discrimination, whose keys are `50`, `A`, `A`). RUNTIME_TUTOR_SPEC §6 list item 1 applies: "**Answer checking on closed-form items** — numeric/symbolic/exact-match verification against the certified answer. Solver, not model."
- **Bare triggers:** one scored ask → unprefixed exact-string triggers in the misconceptionMap, standard `{trigger, tag, signature}` objects; signatures carry the full computation and arming citation for the audit trail.
- **Transfer-battery consistency:** teaching discrimination items feed **provisional state**; the mastery gate reads delayed, unseen transfer-battery instances exclusively (archetype-transfer-battery). The gate decision is RUNTIME §6 list item 4 — "**Mastery gating** — provisional→locked transitions; the retention firewall…; the transfer-battery pass decision across D1–D4" — deterministic and prohibited from LLM dependency. The item's keyed traps are what make a boundary miss machine-attributable without judgment calls.
- **Solver contract** (interface row): all confusable readings recomputed, matched to their keyed traps, distinctness and arming constraints verified, displayed data verified against the true model. Every check is host-side arithmetic.

## e. Visual spec requirements

- **No nulls, including the discrimination-specific fields:** unequal-scale planes must carry `units_per_gridline` on both axes explicitly (disc-02 — the field exists precisely because scale is the construct); tables carry `columns`, `rows`, `gap_labels_between_rows`, `caption`; de-emphasis styling is specified, not implied (disc-03's head-start row in `--text-muted` with its "head start" tag).
- **Visibility rules are spec'd per rule a.4:** annotations state what is present from first paint and why ("present from first paint, because noticing it is the discrimination") or what is withheld and until when ("gap labels are hidden until resolve — the item assesses whether the student checks the middle unprompted").
- **reveal_beats follow the answer-then-confront pattern:** beat 1 = first-paint state, student commits; resolve beats stage the boundary evidence in argument order — gap labels appearing one at a time; the dashed endpoint line drawn so it visibly misses the interior points; the counted reading and the axis reading stacked (`post_resolve_overlay`, disc-02); the head-start caption naming the false assumption ("dividing 13 by 4 assumes she started at zero — she did not").
- **The confrontation is the entry's remediation move rendered:** middle-point betrayal (§2.14), one-graph-two-readings (§2.11), head-start contrast (§2.9) — generated items take the resolve staging from the boundary entry, not from invention.
- **Explicit no-change convention** applies as in all archetypes: any beat with no visual change says so.
- **Manim-buildable** from the spec alone, including hidden-until-resolve elements and overlays.

## f. Interest-skinning rules

- **May swap:** context nouns, personas, unit label names, scenario sentence. **FROZEN:** every number including axis scales and `units_per_gridline`, gap sequences, the head-start/intercept value, all confusable-reading computations, choice structure, difficulty, phase, visual geometry.
- **Structural-skin rule at its sharpest: the context must MOTIVATE the boundary.** disc-03 works because a career total entering the season *is* a nonzero intercept — the head start is a real thing in the story, not a parameter; disc-02 works because total rushing yards (0–300) against games (0–6) makes unequal axis scales the natural rendering. A domain that cannot motivate the boundary (no authentic head-start quantity, no naturally mismatched scales, no plausible nonconstant growth) cannot carry the item — route to a carrying domain or neutral per the INTEREST_DOMAINS §5 triage; never bend the construction to fit the skin.
- **Abstract P3 boundary items are neutral-default** (disc-01 class; P3 phase discipline already requires neutral).
- **Collision-probe constructions are neutral-default:** discrimination items double as the taxonomy's disambiguation probes (positive-slope probes for the −m/|m| pair; unit-labeled choice probes for the Δy pair; EC3-style ambiguous-pair probes) — their diagnostic value lives in exact parameter relationships, so skin only if the swap-validity gate passes with zero added ambiguity, else render neutral.
- **§6.1 hard constraints:** fitness skins — the boundary quantities must be performance measures (a training-pace head start is fine; any body-weight/calorie/composition quantity is fatal). Social skins — growth-boundary items (linear vs exponential follower growth) are natural here but bind hard to §6.1: clearly fictional account, counts only as neutral inputs to the rate computation, no norm/goal/target framing, no "going viral" (fatal).
- **Skins carefully overall:** the archetype's value is the boundary, and boundaries are the easiest thing for a careless skin to blur. When motivation is in doubt, neutral is the correct default.
