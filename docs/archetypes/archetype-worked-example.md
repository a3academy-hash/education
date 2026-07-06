# Archetype: worked-example — a four-stage faded worked-example sequence (concrete → representational → contrast → abstract) whose steps model the concept's invariants before they are named, each stage closing with a self-explanation prompt aimed at a taxonomy cognitive root.

**Lesson-embedded.** Instantiated inside D1-style lessons (LESSON_TEMPLATE.md §WORKED EXAMPLES), not the item bank; counted lesson-side per MANIFEST.md §2/§4 (4 per lesson). Gold exemplars: `docs/gold-node/GOLD_NODE_LESSON.md` §3.1–3.4.

## Interface (BATCH_REGEN_SPEC §4.2 + BATCH_REGEN_PATCH_voice §2)

| Field | Value |
|---|---|
| `id` | `worked-example` |
| `version` | `1.1.0` |
| `itemForm` | `rubric-explanation` — a **grading-channel classification**: the closing self-explanation prompt genuinely routes through the same RUNTIME §1.2 free-response grading call and is rubric-scored per taxonomy §3.3. Bank-item owner of this enum form: `archetype-rubric-explanation`; this segment is lesson-embedded and is never scheduled by §4.2. Note: the worked steps themselves are shown, not graded. |
| `phaseApplicability` | Stage-mapped, fixed: stage 1 → P1, stages 2–3 → P2, stage 4 → P3 (gold global rules: §3.1 P1, §3.2–3.3 P2, §3.4 P3). |
| `representation` | Fades with stage: concrete/countable (stage 1) → the node's formal representation arrives (stage 2: coordinates/table/symbols) → same representation + the contrast dimension (stage 3) → bare numeric-symbolic with confirmation-only visual (stage 4). |
| `hintLadderShape` | n/a — no wrong-answer path. The self-explanation prompt produces advisory rubric evidence only. |
| `misconceptionSlots` | Each stage's self-explanation prompt targets ≥1 taxonomy entry's **cognitive root**, cited by entry ID in Authoring notes (gold §3.1–3.4 notes). The contrast stage (rule a.3) is steered by the highest-severity contrast-bearing entries. |
| `rubricElementRefs` | Required: each prompt maps to named taxonomy §3.3 rubric elements (each annotated with countered entry IDs). Scoring is **advisory only** — raises tag priors, never sets a tag active alone (taxonomy §3.3; gold §3 authoring notes). |
| `visualSpecShape` | One full fenced `visual` spec per stage; cross-stage color/orientation conventions declared once and held (§e); stage 4 visual is confirmation-only (held to the confirm beat). Never null. |
| `solverContract` | Every shown arithmetic step is solver-verifiable against the stage dataset. Datasets are named (D1…Dn) and reused verbatim by downstream checks, confrontations, and the formalization worked check (gold appendix "Datasets reused" row). |
| `voiceRegister` | `instruction` throughout (lesson prose). The P3 stage keeps the instruction register under P3 phase discipline: neutral context, explicit abstraction beat, cleaner canvas — register does not switch to assessment (BATCH_REGEN_PATCH_voice §2 scoping sentence applies to items; lesson prose is instruction by definition). |
| `askPatterns` | `explain/justify` (QUESTION_VOICE §3) for the self-explanation prompts, folded into natural prose — no "Explain it:" meta-labels (gold v2 rule, §3 authoring notes). |
| `stemBand` | Instruction band (30–60 words) applies to the self-explanation ask including its lead-in sentence. Worked-step lines are exempt from FK/word instruments (QUESTION_VOICE §11.1 row 11: step lines make FK statistically meaningless; band is a ceiling over the student-visible surface). |
| `interpretationSlot` | `true` at sequence level — ≥1 stage prompt asks meaning ("twelve *what*, per *what*?" class), not procedure recall (gold §3.1 prompt; QUESTION_VOICE §11 ADJUST #8 spirit). |

## a. Construction rules

1. **Stage count and order.** Four stages, fixed sequence: **concrete → representational → contrast/negative case → abstract**, easy → hard (gold §3 authoring notes; MANIFEST §4 lesson-side counts). Stage 1 is countable/manipulable in the node's P1 skin; stage 2 introduces the node's formal representation while keeping the skin (a genuine P2 blend — "notation + graph + sport, not a reskin," gold §3.2 note); stage 3 keeps the representation and adds the contrast dimension; stage 4 strips all context.
2. **One-move-per-stage.** Each stage transition makes exactly one abstraction move (the QUESTION_VOICE §4.1 fading architecture: "each part changes exactly one thing"). Surface details (numbers, skin variant) may refresh, but the procedure is held identical and the identity is *said* in student text (gold §3.2 "the same move on a graph"; §3.4 "Same three moves"). Gold's moves: count → coordinates; coordinates → sign; sign-bearing context → no context.
3. **Contrast/negative-case stage (stage 3).** Mandatory content: the variant of the concept that the node's highest-severity contrast-bearing taxonomy entries trap — a signed case, boundary case, or degenerate case (gold: negative slope, steered by §2.5/§2.2/§2.4). If the node's concept has no signed/degenerate variant, stage 3 instead runs the node's Axis-B confusable contrast (the near-miss concept the taxonomy discriminates against). A node where neither exists is a GAP_NOTES flag, not a filler stage (MANIFEST §6 posture).
4. **Procedure invariance and the notation embargo.** The step skeleton (named steps, same order) is identical across all four stages. Steps use only the lesson's earned informal vocabulary until FORMALIZATION — the formal notation never appears in any stage's student text (gold global rules; appendix row (a)). The steps silently **model** the taxonomy's invariants before any section names them (gold §3.3 note: "both differences read in the same direction … modeling §2.2's invariant before it is ever named").
5. **Self-explanation prompts.** One per stage, folded into natural prose after the steps. Each prompt: targets a named entry's cognitive root (not its procedure); cites its taxonomy §3.3 rubric elements in Authoring notes; states the expected 1–2 sentence response in Authoring notes (gold §3.1–3.4 notes). Prompts are rubric-scored, advisory evidence only.
6. **Dataset design.** Name the datasets (D1…Dn) and choose them against the taxonomy's generator constraints so that the same numbers arm the intended traps in the stage's embedded check (gold: D4 has b = 1 ≠ 0 precisely to keep §2.9 detectable in EC4, per §3.4 note). Reuse the lesson's anchor dataset in stage 1 (gold: D1 from the hook) so the hook's question is the one the example answers.
7. **Authenticity.** Every contextual quantity must be realistic for its skin; realism rationale is recorded in Authoring notes only, never in student text (gold §3.3 note: the live item's unachievable −3/game corrected to −2). Vocabulary is defined in-text before use (gold: "magic number").
8. **Abstraction beat.** Stage 4 ends by explicitly stripping the story in student voice (gold §3.4: "The story was never doing the math — you were"), and its visual is withheld until after the computed steps (canvas-gets-cleaner, gold §3.4 note).

## b. Taxonomy interface — what the node taxonomy must supply

- **Severity ratings per entry** (taxonomy severity scale) — the contrast stage is steered by the highest-severity entries whose signatures are contrast/sign-bearing; the selection must be justifiable from the severity field alone.
- **Cognitive-root statements per entry** (taxonomy §1 condition 1: a belief, not a wrong output) — self-explanation prompts aim at roots; an entry without an articulated root cannot be prompt-targeted.
- **A §3.3-style rubric table** (required semantic elements annotated with countered entry IDs) — prompts cite elements from it; scoring is advisory per its contract.
- **Generator constraints per entry** — dataset choice (rule a.6) is constrained by them so downstream checks stay diagnostic.

## c. Voice conformance (QUESTION_VOICE)

Binding properties: instruction register throughout (§10 — 1–3 context sentences, second person, imperative and conversational asks allowed, units named on every quantity, FK ≤ 7, sentences ≤ 15 words median); compute-before-symbolize ordering (§4.2 architecture: the student computes concrete instances before anything is formalized — the gold sequence is this architecture stretched across a lesson); fading with one cognitive move per step (§4.1); prompts as explain/justify asks with no meta-labels. Exemplars by reference: gold §3.1 (concrete P1, meaning-form prompt), §3.2 (P2 blend, additive-vs-multiplicative prompt), §3.3 (contrast case, sign-meaning prompt), §3.4 (abstract P3, notation-image + invariant prompt, confirmation-only visual).

## d. Deterministic-gradability contract

- **Worked examples produce no grades.** The shown steps are instruction; nothing in them is answer-checked at runtime.
- **Self-explanation responses** route to free-response grading (RUNTIME_TUTOR_SPEC §1.2): scored against the item's rubric elements, returning per-element scores + detected tags + confidence — *evidence production, not a decision*. Per taxonomy §3.3, a missing element raises priors on the countered tags but **never sets a tag active by itself**; active status requires a signature hit or failed probe. A failed grading call falls back to "ungraded — queued for human review" (RUNTIME §4) and the lesson never stalls.
- **Never-LLM boundary:** mastery, routing, and phase progression never read the prompt responses as authority (RUNTIME §0, §6). Worked-example content is authored and frozen at generation time — no runtime call generates or alters it.
- **Probe-queue relationship:** worked examples queue nothing; probes belong to the embedded-check archetype. A stage's prompt may share a cognitive root with the stage check's trapped entries (gold §3.1 prompt vs EC1's §2.6 distractor) — that is deliberate convergent evidence, wired through the rubric-element annotations.

## e. Visual spec requirements

- **One full fenced spec per stage**, no nulls, Manim-buildable: concrete ranges, gridline spacing, labels, colors, reveal beats — a renderer needs zero decisions (LESSON_TEMPLATE §APPENDIX row (e)).
- **Cross-stage conventions declared once and held:** the same semantic quantities carry the same colors and orientations in every stage visual (gold: rise `--blue-on-light`, run `--green-on-light` from V-ANCHOR-01 through V-FORM-01, "same colors … deliberate," V-WE1-01 annotation). The convention table is authored with stage 1 and cited by later specs.
- **Reuse-with-stated-substitutions downstream:** stage geometries are the reuse base for the stage's embedded check, the confrontation visuals, and formalization (gold: EC2 reuses V-WE2-01, V-C3-01 bases on V-WE3-01, V-FORM-01 reuses V-WE4-01 "exactly" with relabeled points). Substitutions are enumerated, never implied.
- **Fading in the canvas:** visual richness decreases as abstraction rises — stage 1 leads with the visual; stage 4's visual is confirmation-only, appearing after the computation (gold §3.4 spec beat 1: "Held back until the student has read the three computed moves").

## f. Interest-skinning rules

- **Invariance contract binds** (INTEREST_DOMAINS §4): numbers, step skeleton, difficulty, phase map, and the taxonomy targeting of every prompt are FROZEN; nouns, scenario framing, and unit labels swap on P1/P2 stages only.
- **Per-skin substitution table:** the lesson head carries one row per supported skin (gold header table), and each variant must preserve the **structural premise** of the sequence, not just the nouns (gold: "an authentic cumulative counting stat so the two-snapshot premise holds"). A skin that cannot carry the premise routes to the default floor (INTEREST_DOMAINS §5 triage) rather than forcing a contrived variant.
- **Neutral-default flags:** stage 4 (abstract) is P3 → neutral always, never skinned. Stage 3's contrast case is skin-sensitive: its authenticity constraint (rule a.7) must be re-verified per skin (gold's magic-number pacing argument is baseball-specific); a skin without an authentic contrast quantity takes the neutral or default-anchor variant for stage 3.
- **Fitness / social-media skins:** INTEREST_DOMAINS §6.1 hard constraints are fatal-class (BATCH_REGEN §6.2). No banned quantity in any stage's steps, prompts, or visuals — the "how fast / how far / how many reps" test applies to worked-step quantities exactly as to item stems.
- **Coverage triage:** skin stages only where the domain carries the node's concept at ● or ◐ (INTEREST_DOMAINS §3); the engine stays sport-agnostic — the skin is a P1/P2 surface substitution only (gold header rule).
