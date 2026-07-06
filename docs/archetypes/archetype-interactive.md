# Archetype: interactive

The student constructs a state on a live canvas (drag, place, build); grading is a deterministic predicate over the submitted state, and misconceptions are keyed to the specific wrong states each belief produces.

Gold exemplars (cite only, never copy): `docs/gold-node/gold-node-items.json` items `ALG-L06-gold-int-01` … `int-03`.

## Interface (BATCH_REGEN_SPEC §4.2 + BATCH_REGEN_PATCH_voice)

| Field | Value |
|---|---|
| id | `interactive` |
| version | `1.0.0` |
| itemForm | `closed-form`. Note: imperfect fit — the §4.2 enum has no construct/interactive value. Grading is a deterministic predicate over a typed submitted state, which places it in the closed-form gradability class; instances frequently double as `representation-variety` (int-03 is table→graph representation transfer) and a manifest may count them toward that coverage. |
| phaseApplicability | P1, P2, P3 (gold spans all three; difficulty ramps 2 → 3 → 4) |
| representation | graph (all gold instances are coordinate-plane canvases); + table for representation-transfer variants (int-03) |
| hintLadderShape | Taxonomy §3.1 three-rung ladder via `hintLadderRef: {generic, perTag}`; `perTag` covers every tag in the misconceptionMap. Wrong states matching no trap predicate → generic ladder + `misconception_tag: null` log (taxonomy growth). |
| misconceptionSlots | 2–3 state-predicate slots, each an exact predicate over the submitted state that only that belief produces; predicates pairwise disjoint and disjoint from the correct set (guard clauses like `x != 2` enforce it). Overlapping-belief states carry pair-log semantics inside the trigger (int-01's §2.1/§2.3 overlap note). |
| rubricElementRefs | none — not a rubric-explanation form |
| visualSpecShape | D1-convention visual object; type `coordinate-plane` or `dual-representation`; the visual IS the interaction canvas and must additionally specify the interaction furniture (see §e) |
| solverContract | The harness verifies: (i) `correctWhen` is satisfiable within the `submittedState` ranges/snap; (ii) each trap predicate is satisfiable, disjoint from the correct set, and pairwise distinct; (iii) every alternative construction the taxonomy rules mathematically correct is inside `correctWhen` (int-02's four accepted traversals); (iv) any stated readout values recompute from the parameters. |
| voiceRegister | `per-phase` (P1/P2 instruction; P3 neutral — int-03 measured FK 7.4, inside the assessment band) |
| askPatterns | Declared archetype frame `construct-imperative` (drag/place/build instruction — no corpus analog, QUESTION_VOICE §11 row 12). This is the archetype-declared exception to the interrogative close: gold's 73% "?" rate is explained by exactly these items (QUESTION_VOICE §11 row 3; patch §3.1 exempts them from the ≥90% P3 interrogative check). |
| stemBand | P1/P2: 30–60 words; P3: 0–48 words. Structure bound regardless of count: ≤2 context sentences + 1 imperative instruction (int-03 authoringNote). |
| interpretationSlot | `false` — construction, not meaning-in-context. Manifest sources interpretation floors elsewhere. |

## a. Construction rules

1. **Fixed body:** an `interaction` object with `tool` (the manipulable's kind — gold vocabulary: `point-drag`, `arrow-builder`, `line-handles`), `manipulates` (prose contract of what moves and what is fixed), `submittedState` (typed schema: every field with type, range, and snap), and `scoring` (`type: formula | state-match`, `correctWhen`, `note`).
2. **Snap is mandatory.** Exact-match grading must be well-defined; every manipulable snaps to a grid (int-03's scoring note: "exact match is well-defined because handles snap to integers"). Consequence: **clean values are required** where snapping demands them — the P3 realistic-values ADJUST does not apply to snap-graded states (int-03: "Clean values retained: integer-snap scoring requires them").
3. **Many-valid-answers rule.** When the correct set is a family, `correctWhen` is the formula defining the family, never an enumeration (int-01: every integer grid state on the target line is accepted, including placements left of the fixed point); the resolve celebrates the family ("all of these were right; the slope is the rule, not the point").
4. **Correct-equivalence rule.** Every alternative construction the taxonomy rules mathematically correct MUST be inside the accepted set — the taxonomy's not-an-error record binds the scoring predicate (int-02 accepts all four consistent traversals because §2.15 rules the full reversal correct: "point labeling is arbitrary"). Punishing a correct alternative is a fatal-class math error.
5. **Wrong-state keying.** Each trap is a state predicate only that belief produces, stated in the same variables as `submittedState`; guards keep predicates disjoint from the correct set and from each other. Where one state pattern matches two beliefs, the trigger carries the pair-log/probe-queue instruction per the taxonomy's global rule (int-01).
6. **Direction as assessed object.** Where the node's beliefs are directional/orientational, the construction makes direction physical and mandatory (int-02: "arrowheads are mandatory — direction is the assessed object"); construct items are also the designated task type for resolving read-vs-construct collisions (taxonomy §2.4's rule: construct items key the placement-decisive entry).
7. **Live feedback shows current state, never target-check.** Preview lines and live readouts update while dragging, but display only what the student has built (int-01: "the live readout shows the CURRENT ratio, never the target check — no answer leakage before submit"). Grading fires only on submit.
8. **Neutral-wrong start state.** The initial state is neither the answer nor any trap (int-03 handles start at a neutral wrong position).
9. **Difficulty ramp by phase.** P1: single manipulable satisfying a stated rate/relation. P2: multi-element construction encoding a relation's structure (two directed arrows). P3: representation-transfer construction — read one representation, build another (table → line), difficulty 4 admitted.
10. **Prompt shape:** context sentence(s) then one imperative instruction naming the manipulables and the success condition in context units ("…so the club's scoring pace works out to exactly 2 goals per match").

## b. Taxonomy interface (requirements on node taxonomies)

1. **Algebraic signatures in item parameters.** Detection signatures must be stated as computable functions of the item parameters (taxonomy notation preamble) so they translate mechanically into state predicates — an entry defined only by a final numeric answer, with no statement of the structure that produces it, cannot drive this archetype.
2. **≥2–3 predicate-expressible entries per instantiation**, with generator constraints so the predicates stay live and disjoint on the chosen parameters.
3. **A not-an-error record** (taxonomy §2.15 class): the taxonomy must document which alternative constructions are mathematically correct, because `correctWhen` must accept them. Merged/rejected-candidate records are load-bearing here, not appendix material.
4. **Task-type disambiguation rules** for entries whose numeric outputs collide but whose construct states differ (§2.4/§2.5's "construct items decide" rule) — this archetype is where those probes live, so the rules must exist.
5. **Constructive remediation moves flagged.** Entries whose remediation move is a physical re-representation (draw the arrows, plot the point, step along the line) are interactive-eligible: the archetype turns the remediation move into a scored detector (int-02 is §2.2's arrows move as an item). Node taxonomies should flag such entries so the manifest can place interactive items where they pay.

## c. Voice conformance

- **`construct-imperative` is the declared frame** and the declared exception to the interrogative close: QUESTION_VOICE §11 row 3 attributes the gold bank's 73% "?" rate (vs SAT 93%) to exactly these drag/build items, and the patch §3.1 P3 interrogative check exempts archetype-declared imperatives. The imperative is intrinsic to the archetype (int-03 v2 note: "the imperative drag instruction stays").
- **Context → data → ask order still binds:** context sentence(s) first, the imperative instruction lands last.
- **Units in the success condition** ("exactly 2 goals per match"; "yards-to-go" arrows) — the target is stated in context units, not abstract slope talk, in P1/P2.
- **Register by phase:** P1/P2 conversational instruction register; P3 neutral surface at assessment reading level (int-03 FK 7.4, inside the 6–8 band — one of the two gold P3 surfaces measured in-band, §11.1 row 11).
- **≤2 context sentences + 1 instruction** (int-03's register-pass bound) — interactive stems never pad.

## d. Deterministic-gradability contract

- **The predicate is the solver.** `submittedState` is typed, ranged, and snapped; `correctWhen` is either an engine-evaluable formula over those fields (int-01, int-03) or an explicit `state-match` enumeration of accepted states (int-02). RUNTIME_TUTOR_SPEC §6 list item 1 applies: "**Answer checking on closed-form items** — numeric/symbolic/exact-match verification against the certified answer. Solver, not model." No LLM ever interprets a construct state.
- **Trap predicates:** exact predicates over the same state space; deterministic evaluation requires the guards (e.g. `x != 2`, `y != 3`) that keep each trap disjoint from the correct set; pair-log semantics for documented overlaps live in the trigger text (int-01).
- **Trigger format:** the misconceptionMap trigger IS the predicate string (e.g. `"(y - 3) == 2 && (x - 2) != 1"` or a prose state description for state-match items — int-02); tags and signatures follow the standard `{trigger, tag, signature}` object.
- **Hints and evidence stay deterministic:** matched trap → pre-authored `perTag` ladder (taxonomy §3.1, no LLM); unmatched wrong state → generic ladder + null-tag log; evidence flows to RUNTIME §6 items 2/4 ("**Mastery updates**", "**Mastery gating**") which are deterministic and "prohibited from any LLM dependency."
- **Solver contract** (interface row): satisfiability of correct set and each trap within ranges/snap; disjointness; correctness of the taxonomy-mandated accepted alternatives; readout-value consistency.

## e. Visual spec requirements

- **The visual IS the interaction canvas.** The no-nulls bar extends beyond axes/points/line to the interaction furniture: `draggable_point {start, snap}`, `handles [{x, snap}]`, `preview_line`/`live_line` behavior description, `arrow_palette` (orientation, color, arrowhead requirement per arrow kind), `live_readout` definition (what it computes and displays), `post_submit_readout`, fixed-element styling (`--ink` with a lock glyph — int-01), plus the standard axes (label/range/gridline_every), points with labels, and table panels (columns, rows, `gap_labels_between_rows`) for dual-representation canvases.
- **Leakage rule in the spec, not just the code:** annotations must state that live readouts show the current state only ("the live readout shows the CURRENT ratio, never the target check"); target-side information visible from first paint must be information whose *reading* is the task (int-03: "table gap labels are visible from first paint — reading them correctly IS the task").
- **reveal_beats span the interaction lifecycle:** first paint (canvas + start state) → live-update beat (what changes while dragging) → submit-resolve beats, with **distinct correct and incorrect resolve beats** (int-01) and, where a trap state has its own teaching payoff, a wrong-state-specific beat (int-03: the origin-forced state pulses the intercept point; int-02: mixed-direction arrows animate a walking figure leaving the line — the taxonomy entry's contradiction move).
- **Color conventions:** rise `--blue-on-light`, run `--green-on-light`, errors `--error-on-light`, fixed elements `--ink`; arrowheads required wherever direction is assessed.
- **Manim-buildable:** the builder must be able to stage canvas, start state, live behavior, and all resolve branches from the spec alone.

## f. Interest-skinning rules

- **May swap:** axis-label nouns, the scenario sentence, unit names, entity nouns. **FROZEN:** grid geometry, ranges, snap resolution, fixed points, start state, `correctWhen`, every trap predicate, difficulty, phase — the state space is the item; nothing in it moves.
- **Structural-skin rule at maximum strength:** the axes ARE the context (matches on x, goals on y). A skin is valid only if the domain's quantities are natural at the snap resolution — a snap step of 1 must correspond to a countable, authentic unit in the domain; fractional-only quantities can't wear an integer-snap item.
- **Abstract P3 instantiations are neutral-default** (int-03 class; P3 phase discipline already requires neutral).
- **Construct items used as disambiguation probes** (the §2.4-rule task type) inherit the collision-probe neutral-default flag: their diagnostic value depends on exact state relationships; skin only if the swap-validity gate passes with zero added ambiguity.
- **§6.1 hard constraints:** fitness skins may use reps/pace/distance as axis quantities; body weight, calories, body composition, or before/after framing as an axis or target quantity is fatal. Social skins: growth-rate canvases on clearly fictional accounts only; follower/view counts as a target state to "reach" is exactly the banned goal-framing — do not build it.
- **Skins moderately well** at P1/P2 (gold: soccer, football). Constructions that embody a taxonomy remediation move (arrows, plots) are already context-light; when in doubt, the neutral canvas loses nothing.
