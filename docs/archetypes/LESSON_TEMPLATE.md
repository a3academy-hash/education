# LESSON_TEMPLATE — the D1 gold-lesson structure, generalized for the 73 non-gold nodes

**Version:** 1.0.0 (tracks MANIFEST.md §1 `archetypeLibraryVersion`).
**Source of the pattern:** `docs/gold-node/GOLD_NODE_LESSON.md` (ALG-L06, post-ADJUST). Sections below cite it as the exemplar by section number; nothing is duplicated.
**Companion archetypes:** `archetype-worked-example.md`, `archetype-embedded-check.md` (lesson-embedded; MANIFEST §2).
**Flag legend:** **[JUDGMENT]** = requires node-specific pedagogy judgment (mr-kahn-reviewable choice). **[MECHANICAL]** = instantiable from node data + node taxonomy + this template; a generator following the rules needs no judgment call.

---

## 0. Global authoring rules (all [MECHANICAL] — these are format law)

Mirror of the gold lesson's global-rules block (gold, "Global authoring rules"):

1. Student-facing text in blockquotes; everything under "Authoring notes" is metadata, stripped by the pipeline.
2. **Notation embargo:** the node's formal notation (symbols, formula, subscripts) appears in NO student text before FORMALIZATION. Earlier sections use only earned informal vocabulary, each term introduced before use (gold: rise/run/steepness/slope only, before §6).
3. **Voice contract:** no meta-labels in student text; misconceptions always voiced by a named fictional peer with the concrete context re-established first, never asserted in the lesson's own voice; every quantity carries its units; realism/design rationale lives only in Authoring notes. Persona realism per the content-persona convention (gold v2 rules).
4. **Phase map declared up front:** which sections are P1 (skin), P2 (blended), P3 (neutral) — gold's map (HOOK–WE1 P1; WE2–WE3 + their checks P2; WE4, its check, FORMALIZATION P3) is the default; deviations must be justified in Authoring notes. Mastery still requires P3 transfer downstream; nothing in the lesson substitutes for the gate.
5. **Per-skin substitution table** at the lesson head: one row per supported interest skin, each preserving the hook's structural premise (gold header table + archetype-worked-example §f). Skins that cannot carry the premise are omitted (student routes to default floor, INTEREST_DOMAINS §5).

---

## 1. Section sequence (fixed order; no section optional unless marked)

### 1.1 HOOK — **[JUDGMENT]** choose the contrast; **[MECHANICAL]** verify the shape

- **Knowledge-gap minimal pair (hook shape):** the hook presents a minimal pair — two data cases/snapshots whose gap generates the driving question the lesson answers (gold §1: two notebook lines vs the unseen games between them; the question "can two snapshots really tell him your exact pace?"). The knowledge gap must be real relative to the prerequisite node: what the student can already do (prereq) vs what these cases demand (this node) — stated in Authoring notes (gold §1 note).
- **Sport-context P1 entry:** the hook is the P1 on-ramp in the student's skin (default anchor if undeclared).
- **No narrative padding — structural-skin rule:** the math IS the context; every sentence's data is consumed by the math (gold §1 note; QUESTION_VOICE §10 universal: "if a sentence's data is never consumed, cut it").
- **Payoff plant [MECHANICAL check]:** if the BRIDGE carries a discrimination moment (§1.7), the hook plants its question (gold: "he never saw games 3, 4, or 5" plants the constancy question §7 pays off).
- **Anchor dataset:** the hook's numbers are the lesson's named anchor dataset, reused through worked example 1 and ≥1 confrontation (gold: D1).
- Choosing *which* contrast, *which* stat, *which* gap → **[JUDGMENT]**. Verifying the shape, the dataset naming, the P1 register → **[MECHANICAL]**.

### 1.2 CONCRETE ANCHOR — **[JUDGMENT]** select the manipulable; **[MECHANICAL]** verify the rules

- The target concept rendered as a **countable/manipulable quantity** before any formal representation: no coordinates, no formula, no symbols — a quantity the student can count, walk, stack, or split (gold §2: blocks of rise per blocks of run; "steepness you can count").
- **Per-one / defining-structure normalization** happens here if the concept is a rate/ratio/measure — the anchor pre-empts the taxonomy's normalization-class entries by construction (gold §2 note: pre-empts §2.10, seeds against §2.6).
- **Vocabulary earned here** is the complete informal lexicon permitted until FORMALIZATION; list it in Authoring notes (gold §2 note).
- Forward-shadow the contrast case in one clause if stage 3 needs it (gold §2: "A downhill ramp has a negative one — you'll meet one of those later").
- Selecting the anchor object → **[JUDGMENT]** (it must make the concept *felt*, not just illustrated). Vocabulary accounting, notation embargo, visual spec → **[MECHANICAL]**.

### 1.3 WORKED EXAMPLES WITH FADING — mixed; rules in `archetype-worked-example.md` §a

- Four stages, concrete → representational → contrast/negative case → abstract; one abstraction move per transition; identical step skeleton; self-explanation prompt per stage; datasets named and constraint-chosen; abstraction beat closes stage 4. All per archetype-worked-example §a (gold §3.1–3.4).
- **When the negative/contrast case is mandatory:** whenever the node honestly has one. Stage 3's *content* is the signed/boundary/degenerate variant trapped by the node's highest-severity contrast-bearing entries, else the Axis-B confusable contrast. **Neither available → the lesson degrades to 3 stages (concrete → representational → abstract) with 3 embedded checks**, flagged `stage3-absent` in the lesson appendix and batch report (GAP_NOTES §1.3 adopted rule; MANIFEST §4 degradation note); never a filler or repeated stage. mr-kahn adjudicates flagged lessons at the batch gate.
- Datasets, contexts, prompt targets → **[JUDGMENT]** (constraint-bounded). Stage order, phase map, one-move discipline, prompt placement, notation embargo → **[MECHANICAL]**.

### 1.4 EMBEDDED CHECKS — **[MECHANICAL]** placement and wiring; **[JUDGMENT]** only inside number choice

- **Placement rule:** one check per fading stage, immediately after its worked example (archetype-embedded-check §a.1; gold §4).
- **≥1 interpretation-form check** per lesson (archetype-embedded-check §a.4; gold EC2, measured 25% — QUESTION_VOICE §11.1 row 8).
- Two keying modes, collision-pair probe convention, distinctness verification, feedback-line rules, give-away control — all per archetype-embedded-check §a. These are generator-followable against the node taxonomy; the residual **[JUDGMENT]** is picking check numbers *within* the taxonomy's generator constraints when multiple valid parameterizations exist.

### 1.5 MISCONCEPTION CONFRONTATION — **[MECHANICAL]** selection; **[JUDGMENT]** staging

- **Selection rule [MECHANICAL]:** the top-3 taxonomy entries by severity. All BLOCKERs first; remaining slots from the top of the HIGH band, tie-broken by *stated primary home = this node*, with the tie-break documented in Authoring notes (gold §5 selection justification: two BLOCKERs + the only HIGH whose primary home is L06). Fewer than 3 entries at HIGH+ → confront what exists; do not pad down the severity scale.
- **Confrontation shape (fixed):** teaching segments, not assessment items — **predict → collide → student-articulated resolve** (gold §5 preamble). Per segment:
  1. Re-establish the concrete data first (reuse a lesson dataset — gold: EC1 ramps, D1, D3).
  2. The wrong belief voiced by a **named fictional peer in quoted speech**; the lesson's own voice never asserts it (gold: Priya, Eli, Marcus).
  3. Counter-case: the entry's stated remediation move, verbatim in structure, run on the segment's numbers (gold §5.1–5.3 notes: "remediation move is §X's … verbatim structure").
  4. Resolution: the *student* articulates the principle — a finish-the-sentence or explain-it-to-the-peer ask, rubric-mapped to the taxonomy's §3.3 elements (advisory).
- Correct-variant guard [MECHANICAL]: if the taxonomy marks an adjacent *correct* behavior that must never be penalized, the confrontation states it in student text (gold §5.3: full reversal is fine, per §2.15).
- Confrontation is prevention, not routing — an active tag still routes per taxonomy §3.4; say so in Authoring notes (gold §5.1 note).
- Selection and shape → **[MECHANICAL]**. Peer characterization, dialogue naturalness, which lesson dataset each segment reuses → **[JUDGMENT]**.

### 1.6 FORMALIZATION — LAST — **[MECHANICAL]** ordering and once-only; **[JUDGMENT]** the naming narrative

- **Position:** after confrontation, before bridge. Never earlier — the formalism *names what students already did*; it may introduce notation but no new procedure (gold §6: "the formula is just your three moves with name tags on").
- **Notation introduced exactly once, no third notation:** the lesson carries exactly two notational layers — the earned informal vocabulary (from CONCRETE ANCHOR) and the formal notation (here). The formalization maps layer 1 onto layer 2 term by term; no alternative/legacy notation is ever introduced (gold §6: rise → y₂ − y₁ → Δy; slope → m).
- **Check the formula against the anchor dataset** in student text — same answer as the concrete method (gold §6: D1 re-run through the formula).
- **Notation-born misconceptions:** entries whose cognitive root is *born at the notation* get their remediation move embedded here, not in §1.5 (gold §6 note: §2.7 "is born here" — name-tags treatment, y's-subtract-from-y's rule, color-coded visual).
- **Lock-in rules:** close with the 1–2 invariants the taxonomy says the notation obscures, restated in formula language (gold §6: never-across rule + same-starting-point rule).
- Ordering, once-only, anchor re-check, invariant restatement → **[MECHANICAL]**. The naming narrative's register ("name tags," "delta means change") → **[JUDGMENT]**.

### 1.7 BRIDGE — **[MECHANICAL]** links; **[JUDGMENT]** the discrimination moment's construction

- **Backward link (prerequisite):** name what the prereq node gave the student and what this node added (gold §7 opening). **Backward-routing reason phrasing per taxonomy §3.4:** plain language, names the gap, names the destination — pattern *"[what breaks in plain words] — we're going back to [prereq surface] to build that."* (taxonomy §3.4 example; gold §7 note's constancy-check variant). The lesson states the reason string in Authoring notes so runtime routing surfaces the same phrasing.
- **Forward link:** one student-facing line closing the arc into the next node (gold §7 note: m into y = mx + b, "a prediction machine").
- **Discrimination moment (conditional but MANDATORY when armed):** if the node's taxonomy contains a boundary/overgeneralization entry whose home is this node — or which no downstream node carries (taxonomy structural finding, gold §7 note) — the bridge runs that entry's remediation move on the taxonomy's own example, with a commit-before-reveal beat (gold §7: the middle-point betrayal on §2.14's table). Also record the downstream practice-interleaving obligations the taxonomy's severity notes impose (gold §7 note: ≥2 nonconstant-table + ≥1 unequal-scale items).
- Link extraction from graph `prereqs[]`/edges and reason-string phrasing → **[MECHANICAL]**. Building the discrimination table/case when the taxonomy provides no worked example → **[JUDGMENT]**.

### 1.8 APPENDIX — constraint self-audit table — **[MECHANICAL]** (the trust-layer artifact)

Authoring metadata; the pipeline strips it; the audit trail keeps it. Rows, generalized from the gold appendix (every row must be verifiable against the lesson text as it exists NOW — trust-layer rule, QUESTION_VOICE §11.1 collateral note):

| Row | Constraint verified |
|---|---|
| (a) | Notation embargo — formal notation absent from student text before FORMALIZATION; first appearance cited |
| (b) | Every distractor cites entry ID + trap/belief computed on the item's numbers; collision pairs handled per matrix (log + probe queued) |
| (c) | Confrontations = top-3 by severity; tie-break documented |
| (d) | Discrimination moment present iff armed (§1.7), keyed to its entry, on stated numbers |
| (e) | Zero null/unspecified visuals; every visual id listed; reuses have stated substitutions |
| (f) | Voice contract — no meta-labels; misconceptions peer-voiced with context re-established; units on every rate; realism rationale confined to Authoring notes |
| (g) | Datasets — named, listed with values and answers, reuse map |
| (h) | Phase discipline — section→phase map; sport is the on-ramp; neutral transfer remains the mastery bar |

A row that cannot honestly read PASS blocks the lesson from freeze — the table is evidence, not decoration.

---

## 2. Voice and phase discipline (binds every section)

- **Instruction register per QUESTION_VOICE §10:** second person; FK ≤ 7; sentences ≤ 15 words median; units on every quantity; context → data → ask ordering wherever an ask appears; no padding (data never consumed = cut). Embedded checks follow their archetype's per-phase register (P3 check = assessment register).
- **Phase discipline P1 → P3 with the canvas-gets-cleaner principle:** sport/interest context and visual richness are front-loaded; as abstraction rises, the skin thins (P2 = genuine blend, not reskin — gold §3.2 note) and the canvas gets cleaner (gold §3.4 note: abstract-stage graph withheld to the confirm beat; STYLE_GUIDE §8.2). P3 sections are neutral, story-stripped, and are the register students meet again at the mastery gate.
- **Never-LLM boundary:** every graded surface in the lesson (embedded checks) is engine-graded (RUNTIME_TUTOR_SPEC §6); self-explanation and confrontation-resolve responses produce advisory rubric evidence only (taxonomy §3.3).

## 3. Inputs a node must have before this template can instantiate

1. Node JSON (objective, standards, `prereqs[]`, contextHooks) — graph 1.11.0 baseline (BATCH_REGEN_SPEC §0).
2. A node misconception taxonomy conforming to the slope taxonomy's pattern: verified entries with severities, cognitive roots, computable detection signatures, generator constraints, remediation moves, a consolidated collision matrix, a §3.3 rubric table, and §3.4 routing semantics. **A node without this is not lesson-ready** — the HOOK, stage-3 content, check keying, confrontation selection, and bridge discrimination all read from it.
3. The archetype library at the pinned version (MANIFEST §1) and the voice-contract slice (BATCH_REGEN_PATCH_voice §1).
