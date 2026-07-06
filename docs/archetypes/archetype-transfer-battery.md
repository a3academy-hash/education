# Archetype: transfer-battery

Assessment-only gate items across the four transfer dimensions — delayed, unseen, hint-free instances on which mastery locks; the pass decision is deterministic engine logic, and the battery is where errors that teaching surfaces left invisible are made to detonate.

Gold exemplars (cite only, never copy): `docs/gold-node/gold-node-transfer.json` (battery structure, passRule, and item families `ALG-L06-gold-tb-d1-02`, `tb-d2-01`, `tb-d3-01`, `tb-d4-01`) and `docs/gold-node/GOLD_NODE_RUBRICS.md` §4 (`ALG-L06-gold-tb-d1-01` + `RUB-L06-transfer-d1` + graded samples §5.3–§5.4).

**Namespace caution (MANIFEST §2):** the four battery dimensions are always written "transfer dimension 1–4," never bare "D1–D4" — "D4" elsewhere in the gold-node docs names the rubric-contract *deliverable*. Where RUNTIME_TUTOR_SPEC writes "D1–D4" (§6 item 4, `perDimension`), it means these transfer dimensions.

## Interface (BATCH_REGEN_SPEC §4.2 + BATCH_REGEN_PATCH_voice)

| Field | Value |
|---|---|
| id | `transfer-battery` |
| version | `1.1.0` |
| itemForm | `transfer-battery-slot` (exact §4.2 enum fit). Note: this entry now OWNS the form. The pre-1.1.0 stand-in posture — archetype-discrimination's itemForm note ("natural fillers for `transfer-battery-slot` positions … a manifest may count them there") and GAP_NOTES §4.2's "filled, not owned, by discrimination/interactive items" — predates it and is constrained by the unseen rule below: a teaching-bank item is by definition *seen* and can never sit in the battery. Discrimination/interactive-shaped constructions inside the battery are authored as transfer-battery instances under this entry's rules. The stale stand-in notes are flagged for reconciliation at the next library pass, not silently rewritten. |
| phaseApplicability | P3 only — every battery item is neutral or foreign-domain at the assessment register. The gate is the neutral-transfer mastery evidence (phase discipline; `new_plan/CLAUDE.md` §3 lock semantics); no other phase is coherent here. |
| representation | Dictated per dimension: dimension 1 — word/table in a foreign domain; dimension 2 — the pairing IS the item (table ↔ graph ↔ equation ↔ word ↔ verbal); dimension 3 — bare symbolic in the node lesson's notation; dimension 4 — whatever the novel form requires. |
| hintLadderShape | **Replaced.** `hintPolicy: "none-during-battery"` REPLACES `hintLadderRef` (gold `schemaNote`): no hint ladder is served while the battery runs; wrong answers still log their trigger/tag/signature evidence; remediation is scheduled AFTER the battery resolves. Every instance carries the `hintPolicy` + `hintPolicyNote` pair. |
| misconceptionSlots | Full trap sets computed on the battery item's own numbers, never inherited (3–6 armed traps in gold); collision-pair semantics per the node matrix (pair logged, neither tagged, probe queued — tb-d3-01's `5/2`, tb-d1-01's `6.5`); dimension-2 items key boundary entries (scale/height/rate traps on the representation surface). |
| rubricElementRefs | Dimension-1 instances may pair the computation with a rubric-scored open part under archetype-rubric-explanation's contract (anchor part first; ≤4-element rubric preferred for `GRADING_FALLBACK_MODEL` eligibility; advisory-only — `RUB-L06-transfer-d1`). Dimensions 2–4: none. |
| visualSpecShape | D1-convention visual object as an **assessment surface** (data vehicle only, never a scaffold; §e). `visual: null` is admissible ONLY with a `visualNote` arguing why any spec would void the dimension (gold tb-d3-01, tb-d4-01) — the battery-specific exception to the library's no-nulls bar, per the gold `schemaNote`. |
| solverContract | Standard closed-form recomputation (keys, traps, `acceptedEquivalents`, arming constraints, pairwise distinctness) PLUS the battery-specific checks: (i) the structural-freshness census backing every unseen claim (rule a.3), (ii) per-render parameter re-randomization stays inside the item's generator constraints, (iii) every input to the pass decision is deterministic (§d). |
| voiceRegister | `assessment` (fixed, all instances — QUESTION_VOICE §10; gold voiceConformance block). |
| askPatterns | Per dimension. Dimension 1: `what-is-value` / `how-many/much` with units in the ask; a paired open part uses `explain/justify` and may close on `meaning/interpretation` (tb-d1-01 part (b)). Dimension 2: `which-select`. Dimension 3: `what-is-value`. Dimension 4: drawn from the catalog, with the constraint that the ask's question *shape* is itself census-verified absent from teaching — the novelty may live in the ask (tb-d4-01's inverse coordinate ask). |
| stemBand | Assessment register ≤48 words, lower bound 0 (gold stems 24–42 words; gold `voiceConformance.stemWordCounts`). |
| interpretationSlot | `true` for **dimension-1 instances only, declared per-dimension**: tb-d1-01's final ask is interpretation (what the sign says about the air higher up), so dimension-1 instances contribute interpretation-final coverage toward MANIFEST §7 floor 2's standalone-P3 count. Dimensions 2–4 are compute/classify and claim no coverage. |

## a. Construction rules

Battery-wide:

1. **Assessment-only — this archetype is the mastery gate** (`new_plan/CLAUDE.md` §5, verbatim): "A node passes the gate only when it clears all four dimensions at the §3 confidence bound on **delayed, unseen** items." Battery items never appear in teaching; they exist only at the gate. Teaching-bank items, however strong, are never counted into a battery.
2. **Delayed:** spaced-scheduler-controlled checks at 1, 7, and 21 days; locked mastery is computed ONLY from delayed unseen items — one-sitting accuracy never locks a node (`new_plan/CLAUDE.md` §2 step 6, §3; the AI_ADAPTIVE §7 retention firewall, quoted in the gold passRule).
3. **Unseen, census-verified — the D6 precedent.** Every render is an instance the student has never seen: numeric parameters re-randomized per render under the item's generator constraints, and the item *family* structurally absent from the teaching bank. Structural-freshness claims are **census-verified per node**: the authoringNote enumerates what the whole teaching bank (all live items + all enriched gold-pattern items) does on the relevant axis and shows the battery construct absent (gold: "every contextualized teaching-item x is a sequential event count or clock time … no teaching item uses a physical-gradient construct"; "no item prices a batch against a setup fee"; "no item anywhere gives m and asks for a missing coordinate"). An unverified freshness assertion is a defect, not a claim.
4. **`hintPolicy: "none-during-battery"` on every item**, with its `hintPolicyNote`; no mid-item reveals — feedback defers to the post-battery review (§e).
5. **Trap arming on the battery numbers** per the standard rules: signatures recomputed on the item's own parameters, pairwise distinct, distinct from the key, `acceptedEquivalents` collision-checked against all traps; difficulty 3–4 (gold range).
6. **Evidence volume:** 3–5 successful items per transfer dimension feed the pass computation (`new_plan/CLAUDE.md` §3); the authored families are the certified exemplars from which parameter-randomized unseen instances render (family counts per node: MANIFEST §4 transfer-battery block).

Per dimension:

7. **Transfer dimension 1 — same structure, changed story (foreign domain).** ≥2 foreign domains per node (`new_plan/CLAUDE.md` §5.1). A foreign domain is non-sport AND absent from the node's taught neutral contexts. The quantity must be **authentic** (gold: −6.5 °C/km is the real environmental lapse rate; realistic print-shop dollar pricing) and the item **structurally fresh, not a reskin** — the authoringNote names the structural axis that changed (a spatial-gradient x; an order-size unit price over a setup fee) and backs it with the rule-3 census. A dimension-1 item may pair the computation with a rubric-scored interpretation part — a combination itself absent from teaching — under archetype-rubric-explanation's anchor-first contract; the closed-form part remains the item's sole gating evidence (§d).
8. **Transfer dimension 2 — changed representation, same structure.** The pairing, drawn from table ↔ graph ↔ equation ↔ word ↔ verbal, must be unseen in teaching (gold: graph → table matching, where teaching had table → graph construction and graph → numeric reads). **≥2 distinct representation pairings per generated battery** — the gold single graph→table family is the pattern exemplar, not the coverage standard (gold dimension-2 coverage note). This dimension IS representation transfer, not bare symbolic (`new_plan/CLAUDE.md` §5 note). Author the detonation deliberately: parameters that make errors invisible on teaching surfaces (equal scales, aligned rows) produce different answers here — unequal axis scales, shared start values so only the rate discriminates (tb-d2-01; taxonomy §2.11's "detonates in the transfer battery" severity note, authored on purpose).
9. **Transfer dimension 3 — no story, symbolic.** Decontextualized, **in the node lesson's own notation** (gold: the lesson §6 subscript name-tags, delivered as four separated assignments — unseen surface, same structure). A plane or table would reintroduce exactly the representation support this dimension exists to remove: null-with-argued-`visualNote` is the default posture here.
10. **Transfer dimension 4 — novel problem form.** A question shape absent from the WHOLE teaching bank, **verified**: the authoringNote enumerates the bank's question shapes and shows this one absent (gold: the inverse form — slope and one point given, find the second point's *input* coordinate — verified "doubly absent"). A parameter tweak or re-skin of a taught shape is not a novel form.

## b. Taxonomy interface (requirements on node taxonomies)

1. **Traps computed on battery numbers:** the full signature set with generator constraints per entry, so re-randomized renders keep every trap armed, live, and distinct — the same closed-form demand as the bank archetypes, held at gate parameterizations.
2. **Boundary entries for dimension-2 scale traps where applicable** (TAXONOMY_TEMPLATE §4.2): the boundary entries' construction recipes + arming constraints supply dimension 2's deliberate detonations (unequal scales, nonzero intercepts, nonconstant differences). Where the node's boundary space has no scale-class entry, dimension 2 keys the boundaries the taxonomy honestly has.
3. **Collision matrix at the gate:** negative/ambiguous keys keep collision honesty at the gate (pair logged, neither tagged, probe queued — the battery never pauses for a probe; disambiguation schedules after it resolves).
4. **§2.15-class slip records:** a bare intermediate typed as the answer (tb-d4-01's `7` = Δx) is a slip, not a belief — logs `misconception_tag: null` and feeds taxonomy growth.
5. **For paired dimension-1 rubric parts:** the node's §3.3-style rubric table (TAXONOMY_TEMPLATE §4.5 row 10), trimmed honestly to what the prompt elicits (archetype-rubric-explanation §a.3).

## c. Voice conformance

- **Assessment register throughout** (QUESTION_VOICE §10): stems ≤48 words, 0–2 context sentences, single interrogative ask landing last, units attached in the ask ("in degrees Celsius per kilometer?"), MC with exactly 3 keyed distractors.
- **Realistic values where the domain is authentic** (lapse-rate decimals, dollar amounts — gold 2/5 = 40%, inside the 30–40 band), with construct-integrity exemptions where clean numbers ARE the construct (gridline alignment, integer inverse paths — gold voiceConformance).
- **Dimension-1 two-part shape** is the declared standalone-P3 deviation carried from archetype-rubric-explanation §a.2 (deterministic-anchor mandate); each part is a single ask.
- **No coaching, ever:** battery stems state the object and the data; nothing tips the diagnostic feature (the whole point of delayed-unseen assessment).

## d. Deterministic-gradability contract

- **The pass decision is on the never-LLM list.** RUNTIME_TUTOR_SPEC §6 item 4, verbatim: "**Mastery gating** — provisional→locked transitions; the retention firewall (lock only on delayed, unseen, neutral-P3 transfer); the transfer-battery pass decision across D1–D4." (RUNTIME's "D1–D4" = the transfer dimensions.) The pass computation across the four dimensions is deterministic engine logic; no LLM output enters it (gold `passRule.gatingAuthority`).
- **Pass rule + confidence bound:** all four dimensions cleared at the §3 bound on delayed unseen items; lower-bound P(mastery) > 0.90 for prerequisite nodes, 0.85 for leaf nodes — MUST-VALIDATE, pilot-calibrated, A/B-testable (`new_plan/CLAUDE.md` §3; gold passRule).
- **Every scored battery answer is closed-form** per RUNTIME §6 item 1 (solver, not model): numeric/choice exact match with `acceptedEquivalents` under the standard convention.
- **A dimension-1 rubric part is advisory misconception evidence ONLY and never enters the pass computation** — the closed-form part is that item's sole gating evidence (the `gatingNote` pattern; GOLD_NODE_RUBRICS §1.2; RUNTIME §4: provisional state advances only on deterministic evidence). Grading failure ⇒ ungraded + human-review queue; the battery result is unaffected.
- **hintPolicy semantics:** no ladder serves during the battery; wrong answers still log trigger/tag/signature as taxonomy evidence; remediation (ladders, micro-sets, probes) schedules after the battery resolves.
- **Practiced and in-session items feed provisional state only** and never count toward the lock (gold `unseenRule`); the lock reads delayed unseen battery evidence exclusively.

## e. Visual spec requirements

- **Assessment-surface grammar:** the visual is a data vehicle only, never a scaffold — no arrows, brackets, per-interval labels, gap labels, or rate readouts before resolve; tables are a first-class vehicle (QUESTION_VOICE §6). Annotations state the posture explicitly ("no per-interval brackets or change labels — the battery assesses unaided transfer").
- **No mid-item reveals:** reveal_beats carry first paint plus the explicit no-reveal marker ("(Assessment surface: no reveal on resolve — results surface in the post-battery review.)"). Confrontation/remediation staging belongs to the post-battery review, not the item.
- **Dimension-2 visuals carry the discrimination-grade fields:** `units_per_gridline` on both axes, every tick label rendered — the scale is fully available; consulting it is the assessed behavior (tb-d2-01).
- **`visual: null` ONLY with an argued `visualNote`** stating why any spec would void the dimension (tb-d3-01: a plane would reintroduce the removed representation support; tb-d4-01: plotting the target height collapses the inverse move into a graph read). This is the library's sole sanctioned null; an unargued null remains prohibited.
- **Manim-buildable** from the spec alone wherever a visual exists.

## f. Interest-skinning rules

- **Dimension-1 items are BORN foreign-domain: skinning IS the construct — and it is fixed at authoring.** The changed story is *what dimension 1 assesses*, so the domain is chosen once, at authoring time, with the full freshness census and solver certification behind it (authentic quantity, structural-axis argument, trap set computed on the authored numbers).
- **The battery never runs the runtime interest-variant call (RUNTIME §1.3), on any dimension.** Two reasons, both fatal to the gate: (i) **unseen-ness would break** — the §1.3 call re-skins a template *toward the student's declared interest*, which is precisely the domain the gate must move away from, and a render-time story swap cannot carry the per-node structural-freshness census that the unseen rule rests on; (ii) **solver-certification would break** — battery keys, traps, equivalents, and freshness claims are certified on the authored construction, and the only render-time variation permitted is deterministic parameter re-randomization under the item's own generator constraints (engine-side, no LLM call).
- **Never sport-skinned:** all battery items are P3 (phase discipline) and the battery is the neutral/foreign-transfer evidence — a sport skin would corrupt the very thing being measured.
- **Foreign-domain choice still respects the INTEREST_DOMAINS §6.1 fatal lists** at authoring time: no body/weight/calorie framing, no social counts as norms/goals/targets — banned quantities are fatal wherever they appear, gate items included.
- **Persona realism** applies to any named person in a foreign-domain story exactly as in the teaching bank (content-persona realism rule).
