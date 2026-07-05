# GOLD_NODE_LESSON.md — ALG-L06 "Slope from Two Points"

| Field | Value |
|---|---|
| Node | ALG-L06 — Slope from Two Points (tier 2, domain: linear, prereq: ALG-L05) |
| Standard | CCSS 8.F.B.4 (construct/interpret rate of change from two (x, y) values); state code: `STATE-PLACEHOLDER` |
| Taxonomy version | `docs/gold-node/misconception-taxonomy-slope.md` (mr-kahn, 2026-07-02) — §3 keying contract binding |
| Status | DRAFT v2 — voice revision per Matt review, pending re-review |
| Inputs | misconception-taxonomy-slope.md; `.authoring-tmp/gold/ALG-L06-live-1.9.2.json`, `ALG-L05-live-1.9.2.json`; `new_plan/CLAUDE.md` (Axis A/B/C); `new_plan/STYLE_GUIDE.md`; root `CLAUDE.md` |
| Replaces | Live L06 instruction (2 generic worked examples, 2-rung generic hints, null visuals) |

**Global authoring rules for this document.** Student-facing text appears in blockquotes. Everything under "Authoring notes" is metadata and is stripped by the content pipeline. The formula and the symbols m, Δ, x₁/y₁/x₂/y₂ appear in NO student-facing text before Section 6 — earlier sections use only "rise," "run," "change," and "steepness/slope" (each introduced before use). Student voice contract (v2): no meta-labels in student text; misconceptions are always voiced by a named fictional person with the concrete context re-established first, never asserted in the lesson's own voice; every quantity carries its units; realism/design rationale lives only in Authoring notes. Sport phases: §1–§3.1 are P1 (sport), §3.2–§3.3 are P2 (blended), §3.4 and §6 are P3 (neutral). Mastery still requires P3 transfer downstream of this lesson; nothing here substitutes for the gate.

**Per-sport hook substitution table (P1 surfaces only; engine is sport-agnostic).** The baseball hook below is the rendered default. Each variant uses an authentic cumulative counting stat so the two-snapshot premise holds:

| Sport | Two-snapshot stat (x → y) |
|---|---|
| baseball (default) | games played → cumulative hits |
| softball | games played → cumulative RBIs |
| basketball | games played → cumulative points |
| soccer | matches played → cumulative goals |
| football | games played → cumulative rushing yards |
| volleyball | sets played → cumulative kills |
| neutral track | days → plant height (cm) |

---

## 1. HOOK — Two lines in a scout's notebook

> A scout watched your whole season, but his notebook has only two lines about you:
> **After game 2: 4 hits. After game 6: 16 hits.**
>
> Those are your season totals — 4 hits total, then 16 hits total. His report needs one number: how fast you were collecting hits, in hits per game. And he never saw games 3, 4, or 5.
>
> Can two snapshots really tell him your exact pace? And is there a way to get that number every time, no matter which two snapshots he kept? By the end of this lesson, you'll be able to do it in about ten seconds.

**Authoring notes**
- Knowledge gap: the student can find a rate from a full story or table (L05) but has never extracted it from *two isolated points*. The "he never saw games 3–5" clause plants the constancy question that Section 7 pays off (`assumes-constant-rate-nonlinear` §2.14).
- Dataset D1 = (2, 4), (6, 16), m = 3 — the taxonomy's canonical example (§2.1, §2.6, §2.7); reused through the lesson. Hook now states "season totals" explicitly so the cumulative-stat premise is anchored before any numbers travel to later sections.
- Structural-skin rule check: the math *is* the context — cumulative hits vs. games is genuinely linear data with a per-game rate. No narrative padding.

```visual
id: V-HOOK-01
type: table
purpose: Render the scout's two-line notebook entry as sparse data — emphasize what is missing.
data:
  columns: ["Game", "Total hits"]
  rows: [[2, 4], [6, 16]]
  ghost_rows: [[3, "?"], [4, "?"], [5, "?"]]   # rendered between the real rows, dimmed
  caption: "The scout's entire notebook."
annotations:
  - real rows in --ink on white; ghost rows in --text-muted with "?" in the hits column
  - no highlighting on first paint
reveal_beats:
  1. Table appears with only the two real rows.
  2. Ghost rows fade in between them (dimmed), visualizing the unseen games.
  3. Caption appears.
```

---

## 2. CONCRETE ANCHOR — Steepness you can count

> Before any graphs: look at the ramp up to the bleachers. Walk it in your head — every time you move 1 step across, you also move some amount up.
>
> This ramp climbs **6 blocks up** while it goes **4 blocks across**. The climb is called the **rise**. The across is called the **run**.
>
> How much does it climb for each single block across? Share the 6 blocks of climb equally across the 4 blocks of run: **1.5 up for every 1 across**.
>
> That number — how much up per one across — is the ramp's **steepness**. Math has a name for it: **slope**. A steeper ramp has a bigger slope. A downhill ramp has a negative one — you'll meet one of those later in this lesson.

**Authoring notes**
- Concreteness-fading stage 1 (Axis A). No coordinates, no formula, no "m" — steepness is a countable, felt, per-one quantity.
- The "per one across" normalization pre-empts `rate-not-per-unit` §2.10 and seeds the ratio meaning against `slope-as-difference` §2.6 (Lobato ratio-as-measure, per §2.6 cognitive root).
- Vocabulary earned here: rise, run, steepness, slope. These are the only technical words permitted until Section 6.

```visual
id: V-ANCHOR-01
type: ramp-diagram
purpose: Make slope countable as blocks of rise per blocks of run, then normalize to per-1.
data:
  grid: 12 wide x 8 tall, unit blocks, no axis numbers (deliberately non-coordinate)
  ramp: right triangle, base from block (1,0) to (5,0), apex at (5,6)  # run 4, rise 6
  labels: { rise: "6 up", run: "4 across" }
annotations:
  - rise segment highlighted --blue-on-light with label "6 up"
  - run segment highlighted --green-on-light with label "4 across"
  - stick-figure walker at ramp base
reveal_beats:
  1. Ramp outline draws on (250-450ms per STYLE_GUIDE §7).
  2. Walker steps across; run segment highlights, "4 across" label appears.
  3. Rise segment highlights, "6 up" label appears.
  4. The 6-block rise splits into 4 equal chunks of 1.5, one chunk stacking above each run block.
  5. Readout appears (Plex Mono): "1.5 up per 1 across".
```

---

## 3. WORKED EXAMPLES WITH FADING

**Authoring notes (sequence design).** Four examples, concrete → representational → representational-with-sign → abstract, easy → hard, per the worked-example-then-fading contract (`new_plan/CLAUDE.md` §7). Each ends with a self-explanation prompt targeting a taxonomy cognitive root (IDs cited per example); prompts are rubric-scored per taxonomy §3.3 (advisory evidence only — never sets a tag active alone). v2: prompts are folded into natural prose — no "Explain it:" meta-labels. Embedded checks (Section 4) are interleaved one per stage: EC1 after 3.1, EC2 after 3.2, EC3 after 3.3, EC4 after 3.4.

### 3.1 Worked example 1 — Concrete (P1 baseball): count the scout's answer

> Back to the scout's notebook: your season total was 4 hits after game 2 and 16 hits after game 6. Picture those two totals as two steps of a staircase.
>
> **Step 1 — the rise.** Your total climbed from 4 hits to 16 hits. That's a rise of **12 hits**.
>
> **Step 2 — the run.** That climb took from game 2 to game 6. That's a run of **4 games**.
>
> **Step 3 — per one.** Share the 12 hits of rise equally across the 4 games of run: 12 ÷ 4 = **3 hits per game**. That's the slope of your season — the scout's exact number, from just two snapshots.

> Before you move on, explain one thing in a sentence or two. In Step 1 you found 12, and in Step 2 you found 4. Twelve *what*, and four *what*? And why isn't 12 by itself the scout's answer?

**Authoring notes**
- Dataset D1. Fading stage: concrete step-picture, sport skin, all steps shown.
- Self-explanation target: ratio-as-measure root — forces the second quantity into view (`forgot-denominator` §2.1; adjacent `rate-not-per-unit` §2.10). Rubric elements 1–3 of taxonomy §3.3. Expected 1–2 sentences: "12 hits and 4 games; 12 alone doesn't say how many games it took."

```visual
id: V-WE1-01
type: dual-representation
purpose: Bridge the ramp image to the data — hits climbing like a staircase from (game 2, 4 hits) to (game 6, 16 hits).
data:
  left_panel: table { columns: ["Game", "Total hits"], rows: [[2, 4], [6, 16]] }
  right_panel: step-chart, x from 0 to 7 (label "Game"), y from 0 to 18 (label "Total hits"),
    columns at game 2 (height 4) and game 6 (height 16),
    rise_bracket: vertical from 4 to 16 at game 6, label "12 hits up"
    run_bracket: horizontal from game 2 to game 6 at height 4, label "4 games across"
annotations:
  - rise bracket --blue-on-light; run bracket --green-on-light (same colors as V-ANCHOR-01, deliberate)
  - readout (Plex Mono): "12 ÷ 4 = 3 hits per game"
reveal_beats:
  1. Table appears (mirrors V-HOOK-01, ghost rows gone).
  2. Two step-columns rise on the chart.
  3. Run bracket draws with "4 games across".
  4. Rise bracket draws with "12 hits up".
  5. Readout appears.
```

### 3.2 Worked example 2 — Representational (P2 blended): the same move on a graph

> Now the same move on a graph. Your team's run total is plotted: the point **(8, 24)** means 24 total runs after game 8, and **(20, 60)** means 60 total runs after game 20.
>
> **Step 1 — the rise.** The run total climbed from 24 to 60: rise = 60 − 24 = **36 runs**.
>
> **Step 2 — the run.** The games went from 8 to 20: run = 20 − 8 = **12 games**.
>
> **Step 3 — per one.** 36 ÷ 12 = **3 runs per game**. Those are the same three moves you made with the notebook — the graph just shows them as arrows.

> Here's something to explain in your own words. To compare the 36 runs to the 12 games, you divided. Suppose you subtracted instead: 36 − 12 = 24. What would that 24 tell you — and why isn't it a rate?

**Authoring notes**
- Dataset D2 = (8, 24), (20, 60), m = 3 (taxonomy §2.3 example). Fading stage: representational — coordinate notation arrives, sport framing retained (genuine P2 blend: notation + graph + sport, not a reskin).
- Self-explanation target: additive-vs-multiplicative root (`slope-as-difference` §2.6). Rubric element 2. Expected: "36 − 12 mixes runs with games; a rate needs runs *per* game, which is division."
- Subtraction appears here as "how to find the climb" — a computation of change, not yet a formula.

```visual
id: V-WE2-01
type: coordinate-plane
purpose: Show rise and run as labeled arrows between two plotted points; first appearance of coordinates.
data:
  x_axis: { label: "Games played", range: [0, 24], gridline_every: 2 }
  y_axis: { label: "Total runs", range: [0, 70], gridline_every: 10 }
  points: [ { x: 8, y: 24, label: "(8, 24)" }, { x: 20, y: 60, label: "(20, 60)" } ]
  line: solid through both points
  arrows:
    run: from (8, 24) to (20, 24), label "run = 20 − 8 = 12"
    rise: from (20, 24) to (20, 60), label "rise = 60 − 24 = 36"
annotations:
  - run arrow --green-on-light, rise arrow --blue-on-light, both drawn WITH arrowheads (direction matters; seeds §2.2's invariant)
  - readout (Plex Mono): "36 ÷ 12 = 3 runs per game"
reveal_beats:
  1. Axes and both points appear; line draws through them.
  2. Run arrow draws left-to-right with its label.
  3. Rise arrow draws bottom-to-top with its label.
  4. Readout appears.
```

### 3.3 Worked example 3 — Representational, downhill (P2 blended): negative slope

> Baseball teams chasing a playoff spot track a **magic number** — how many more wins they need to clinch it. Good news: yours is falling. The graph shows the point **(8, 18)** — a magic number of 18 after game 8 — and **(12, 10)** — down to 10 after game 12.
>
> **Step 1 — the rise.** The magic number went from 18 down to 10: rise = 10 − 18 = **−8**. A negative rise means the line goes *down*.
>
> **Step 2 — the run.** The games went from 8 to 12: run = 12 − 8 = **4 games**.
>
> **Step 3 — per one.** −8 ÷ 4 = **−2 per game**. The slope is negative 2: the magic number drops by 2 every game. Keep that negative sign — it's telling you which direction the number is moving.

> One question before the next check. Suppose a teammate worked this same problem and wrote the slope as just 2, leaving off the negative sign. What true information about the magic number would be lost?

**Authoring notes**
- Dataset D3 = (8, 18), (12, 10), m = −2. Baseball authenticity: a magic number can drop 2 per game (your win plus the rival's loss) — a hot-stretch pace a real fan accepts. The live item's −3/game was not achievable; corrected here. "Magic number" is defined in-text before use (vocabulary-before-use rule).
- Both differences read in the same direction (game 8 → game 12), modeling §2.2's invariant before it is ever named.
- Self-explanation target: steepness-without-direction root (`drops-negative-slope-sign` §2.5; adjacent `rise-run-direction-error` §2.4). Rubric element 5. Expected: "You'd lose that the number is going *down* — 2 would mean it's growing."

```visual
id: V-WE3-01
type: coordinate-plane
purpose: Make a negative rise visible as a downward arrow, so the sign is seen before it is computed.
data:
  x_axis: { label: "Games played", range: [0, 16], gridline_every: 2 }
  y_axis: { label: "Magic number", range: [0, 22], gridline_every: 2 }
  points: [ { x: 8, y: 18, label: "(8, 18)" }, { x: 12, y: 10, label: "(12, 10)" } ]
  line: solid through both points, extended across the plot
  arrows:
    run: from (8, 18) to (12, 18), label "run = 12 − 8 = 4"
    rise: from (12, 18) to (12, 10), label "rise = 10 − 18 = −8"  # points DOWNWARD
annotations:
  - rise arrow --error-on-light to mark descent; run arrow --green-on-light
  - readout (Plex Mono): "−8 ÷ 4 = −2 per game"
reveal_beats:
  1. Axes, points, line appear; student sees the line falls left-to-right.
  2. Run arrow draws rightward.
  3. Rise arrow draws DOWNWARD with the negative label.
  4. Readout appears with the sign highlighted.
```

### 3.4 Worked example 4 — Abstract (P3 neutral): just two points

> No story this time. Two points: **(2, 7)** and **(6, 19)**. Find the slope.
>
> **Rise:** 19 − 7 = **12**. **Run:** 6 − 2 = **4**. **Slope:** 12 ÷ 4 = **3**.
>
> Same three moves, nothing else needed. The story was never doing the math — you were.

> Two quick questions before the next check. First: of the four numbers in those points, which two are both y-values? Second: both of your subtractions started from the point (6, 19). What would go wrong if one subtraction started from (6, 19) but the other started from (2, 7)?

**Authoring notes**
- Dataset D4 = (2, 7), (6, 19), m = 3, b = 1 (taxonomy §2.9 example — b ≠ 0 keeps `slope-as-single-point-ratio` §2.9 detectable in EC4). Fading stage: abstract/P3; graph withheld until the confirm beat (canvas gets cleaner as abstraction rises, STYLE_GUIDE §8.2).
- Self-explanation targets: quantity image of the differences (`subtracts-within-points` §2.7 — "which two are both y-values?", its remediation probe) and the same-direction invariant (`inconsistent-subtraction-order` §2.2). Rubric elements 1 and 4. Expected: "7 and 19 are the y's; mixing directions would flip the sign."
- Explicit abstraction beat per `new_plan/CLAUDE.md` §2: the closing line strips the story.

```visual
id: V-WE4-01
type: coordinate-plane
purpose: Confirmation-only graph for the abstract example — appears AFTER the computation, not before.
data:
  x_axis: { label: "x", range: [0, 8], gridline_every: 1 }
  y_axis: { label: "y", range: [0, 22], gridline_every: 2 }
  points: [ { x: 2, y: 7, label: "(2, 7)" }, { x: 6, y: 19, label: "(6, 19)" } ]
  line: solid through both points
  arrows:
    run: from (2, 7) to (6, 7), label "4"
    rise: from (6, 7) to (6, 19), label "12"
annotations:
  - same rise/run color convention as all prior visuals
  - readout (Plex Mono): "12 ÷ 4 = 3"
reveal_beats:
  1. (Held back until the student has read the three computed moves.)
  2. Plane, points, line appear together.
  3. Both arrows draw; readout appears — "the picture agrees with your arithmetic."
```

---

## 4. EMBEDDED CHECKS — one per fading stage

**Authoring notes (contract).** One choice item per stage, inserted immediately after its worked example. Every distractor below is the taxonomy detection signature evaluated on the item's actual numbers (§3.2 spirit); the `misconceptionMap` for each item is exactly this list. A distractor hit triggers the entry's three-rung hint ladder (§3.1) — Hints 1–2 never mention the formula. All trap values verified pairwise distinct and distinct from the key (taxonomy global generator rule). The "Correct" line under each item doubles as student-visible feedback: units attached, no design rationale.

### EC1 — Concrete stage (after 3.1)

> Ramp A rises **6 blocks over 4 blocks across**. Ramp B rises **12 blocks over 10 blocks across**. Which ramp is steeper to walk up?
>
> **A)** Ramp A  **B)** Ramp B  **C)** They're equally steep

- **Correct: A.** For each single block across, Ramp A climbs 6 ÷ 4 = 1.5 blocks, and Ramp B climbs 12 ÷ 10 = 1.2 blocks. More climb per block across means steeper — and 1.5 > 1.2.
- **Distractor B** ← `slope-as-height` §2.8 (ramp analog of signature "answer = the height"): B's total rise 12 > A's 6, so the *taller* ramp is chosen. Trap computed on item numbers: 12 vs 6.
- **Distractor C** ← `slope-as-difference` §2.6 (signature Δy − Δx): A gives 6 − 4 = **2**, B gives 12 − 10 = **2** — equal differences, so the additive reasoner answers "equally steep." This is §2.6's own contrast-case construction, used as detection.

```visual
id: V-EC1-01
type: ramp-diagram
purpose: Side-by-side ramps engineered so additive comparison says "equal" and height says "B" — only the ratio says A.
data:
  grid: shared unit blocks, both panels same scale
  ramp_A: run 4, rise 6, drawn base-aligned left panel, labels "6 up / 4 across"
  ramp_B: run 10, rise 12, right panel, labels "12 up / 10 across"
annotations:
  - no per-1 readout shown before the student answers (it would give away the key)
  - after answer: 1.5-per-1 and 1.2-per-1 chunking overlays appear on both ramps
reveal_beats:
  1. Both ramps and labels appear together (static — this is an assessment beat).
  2. On resolve: each rise splits into per-1-across chunks (A: chunks of 1.5, B: chunks of 1.2).
```

### EC2 — Representational stage (after 3.2)

> The graph shows a soccer team's total goals for the season: through match 8 they had 24 goals, and through match 20 they had 60 — the points **(8, 24)** and **(20, 60)**. What is the slope, in goals per match?
>
> **A)** 3  **B)** 36  **C)** 1/3  **D)** 24

- **Correct: A.** The goal total climbed from 24 to 60, a rise of 60 − 24 = 36 goals. That took from match 8 to match 20, a run of 20 − 8 = 12 matches. 36 ÷ 12 = 3 goals per match.
- **Distractor B = 36** ← `forgot-denominator` §2.1 (signature Δy): 60 − 24 = 36; |Δx| = 12 ≠ 1, so the trap is live per §2.1 generator constraints.
- **Distractor C = 1/3** ← `inverted-ratio` §2.3 (signature Δx/Δy): 12/36 = 1/3; |m| = 3 ≠ 1 so the trap is distinct. Named-quantity item ("goals per match" in prose) → tags §2.3 directly, not `reverses-x-and-y`, per the §2.3 collision rule.
- **Distractor D = 24** ← `slope-as-difference` §2.6 variant (a) (signature Δy − Δx): 36 − 12 = 24. (Variant (b) y₂ − x₂ = 60 − 20 = 40, not offered; y₁ ≠ x₁ so variants stay distinct per §2.6 constraints.)

**Authoring notes.** Soccer skin (P2 blend retained; team goal totals of 3/match are authentic for a strong club side). Visual: reuse V-WE2-01 geometry with these axis labels ("Matches played" / "Total goals") and NO rise/run arrows pre-answer; arrows draw on resolve.

### EC3 — Negative-slope stage (after 3.3)

> A starting pitcher is on a pitch limit, and the graph tracks how many pitches he has left. After inning 2 he had 60 pitches left — the point **(2, 60)**. After inning 5 he had 15 left — the point **(5, 15)**. What is the slope, in pitches per inning?
>
> **A)** −15  **B)** 15  **C)** −45  **D)** −1/15

- **Correct: A.** His pitches left dropped from 60 to 15, a rise of 15 − 60 = −45 pitches. That took from inning 2 to inning 5, a run of 5 − 2 = 3 innings. −45 ÷ 3 = −15 pitches per inning: he's using up 15 pitches each inning, so the count of pitches left falls by 15.
- **Distractor B = 15** ← ambiguous pair `inconsistent-subtraction-order` §2.2 (signature −m = 15) / `drops-negative-slope-sign` §2.5 (signature |m| = 15). Per the consolidated collision matrix (−m / |m| row): log the pair, tag neither active, queue a positive-slope follow-up item as the disambiguation probe.
- **Distractor C = −45** ← `forgot-denominator` §2.1 (signature Δy): 15 − 60 = −45.
- **Distractor D = −1/15** ← `inverted-ratio` §2.3 (signature Δx/Δy): 3/(−45) = −1/15.

**Authoring notes.** Baseball P2 blend. Realism rationale (recorded here, not in feedback): 15 pitches per inning is an authentic starter workload. Visual: V-WE3-01 geometry with x-range [0, 7] gridline 1, y-range [0, 70] gridline 10, points (2, 60) and (5, 15), downward rise arrow only on resolve.

### EC4 — Abstract stage (after 3.4), P3 neutral

> Find the slope of the line through **(2, 7)** and **(6, 19)**.
>
> **A)** 3  **B)** 12  **C)** 13/5  **D)** 19/6

- **Correct: A.** Rise: 19 − 7 = 12. Run: 6 − 2 = 4. Slope: 12 ÷ 4 = 3.
- **Distractor B = 12** ← `forgot-denominator` §2.1 (signature Δy): 19 − 7 = 12.
- **Distractor C = 13/5** ← `subtracts-within-points` §2.7 (signature (y₂ − x₂)/(y₁ − x₁)): (19 − 6)/(7 − 2) = 13/5. y₁ ≠ x₁, constraint satisfied.
- **Distractor D = 19/6** ← `slope-as-single-point-ratio` §2.9 (signature y₂/x₂): 19/6. Armed because b = 1 ≠ 0 (§2.9 generator constraint); as an exact choice, the near-miss-to-3 concern in §2.9 (numeric-entry tolerance) does not apply.

**Authoring notes.** No visual pre-answer (abstract stage); V-WE4-01 renders on resolve. A §2.9 hit here is HIGH prerequisite-gap-flavored — 2 hits route per §3.4 evidence rules, plain-language reason surfaced to the student.

---

## 5. MISCONCEPTION CONFRONTATION — the three highest-severity entries

**Authoring notes (selection justification).** The taxonomy assigns exactly two BLOCKER severities in the cluster: `forgot-denominator` §2.1 ("Severity: BLOCKER. The single most common slope error…") and `slope-as-difference` §2.6 ("Severity: BLOCKER. The deepest prerequisite-gap signal in the cluster"). Both are confronted. The third slot goes to the top of the HIGH band: among the HIGHs (§2.2, §2.3, §2.8, §2.9, §2.11), `inconsistent-subtraction-order` §2.2 is selected because it is the only HIGH whose stated primary home is L06 itself ("Nodes: L06 (primary)") — §2.3/§2.8/§2.9 are prerequisite-gap flavored with L05-side remediation surfaces, and §2.11's primary home is L09. These are teaching segments (predict → collide → student-articulated resolve), not assessment items; they run after Section 4's checks and before formalization. Each uses the entry's stated remediation move verbatim in structure. v2 voice contract: every confrontation re-establishes the concrete data first, then attributes the wrong belief to a named fictional peer in quoted speech; the lesson's own voice never asserts the misconception.

### 5.1 Confront `slope-as-difference` §2.6 — "steeper means it rises more"

> Think back to the two ramps from the ramp check: Ramp A rises 6 blocks over 4 blocks across, and Ramp B rises 12 blocks over 10 blocks across.
>
> A classmate named Priya looks at them and says, "Ramp B rises 12 blocks and Ramp A only rises 6 — B climbs way more. And if you subtract, they're tied anyway: 12 − 10 is 2, and 6 − 4 is 2. So B has to be at least as steep."
>
> Walk both ramps and see. On Ramp A, every 1 block across costs you 1.5 blocks of climb, because 6 ÷ 4 = 1.5. On Ramp B, every 1 block across costs you only 1.2, because 12 ÷ 10 = 1.2. Ramp A works your legs harder on every single step. Priya's subtraction said the ramps were tied — your legs say A is steeper, every time.
>
> Finish this sentence in your own words: "Subtracting the numbers can't measure steepness, because steepness is how much climb you get for each..."

**Authoring notes.** Remediation move is §2.6's ratio-as-measure contrast case (Lobato) on the exact EC1 ramps, now taught instead of assessed. The additive belief is voiced by a named classmate ("Priya") in quoted speech, per the v2 attribution rule. Visual: reuse V-EC1-01 with the per-1 chunk overlays active from beat 1. Resolution rubric: must state division/per-one (§3.3 element 2). An active §2.6 tag still routes below L05 per §3.4 — this segment is prevention, not a substitute for routing.

### 5.2 Confront `forgot-denominator` §2.1 — "the rate is how much it went up"

> Back to the scout's notebook one more time: your season total went from 4 hits after game 2 to 16 hits after game 6. So your total climbed by 12 hits, and it took you 4 games to do it.
>
> Your teammate Eli went on a streak of his own. He also picked up 12 hits — but his 12 took 12 games. Eli looks at both stat lines and says, "We both went up 12. Same rate. We're equally hot."
>
> Are you? You collected your 12 hits in 4 games: 12 ÷ 4 = 3 hits per game. Eli collected his 12 hits in 12 games: 12 ÷ 12 = 1 hit per game. You were hitting three times as fast as Eli.
>
> Eli's number is a real fact — the hits did go up by 12. But twelve *what*, per *what*? Twelve hits by itself isn't a rate. A rate always compares two changes: how much the hits changed AND how many games that change took.
>
> Now explain it to Eli. In one sentence: why can two players with the same rise have different slopes?

**Authoring notes.** Remediation move is §2.1's fixed-Δy contrast case plus its "twelve what, per what?" probe, verbatim structure, on dataset D1 numbers (Δy = 12, Δx = 4 vs 12; rates 3 vs 1). The misconception is voiced by a named teammate ("Eli," male per baseball-roster realism), who is also the 12-hits-in-12-games contrast player — matching V-C2-01's "Teammate" line. Resolution rubric: names both changing quantities (§3.3 elements 1–2). BLOCKER routing on an active tag: back to L05's rate-as-comparison sequence with the §3.4 plain-language reason.

```visual
id: V-C2-01
type: dual-representation
purpose: Same rise, different runs — make the missing denominator visible as two different tilts.
data:
  left_panel: coordinate-plane { x_axis: {label: "Games", range: [0, 14], gridline_every: 2},
    y_axis: {label: "Hits gained", range: [0, 14], gridline_every: 2},
    lines: [ {from: [0,0], to: [4,12], label: "You: 12 hits in 4 games"},
             {from: [0,0], to: [12,12], label: "Teammate: 12 hits in 12 games"} ] }
  right_panel: readout table { rows: [["You", "12 ÷ 4 = 3 per game"], ["Teammate", "12 ÷ 12 = 1 per game"]] }
annotations:
  - both lines end at height 12; a dashed horizontal at y = 12 labeled "same rise: 12"
  - your line --blue-on-light, teammate's --text-muted
reveal_beats:
  1. Both lines draw from the origin; dashed same-rise line appears — "both went up 12."
  2. Student predicts: same rate or not? (commit before reveal, predict-then-reveal contract)
  3. Right-panel readouts appear: 3 per game vs 1 per game.
```

### 5.3 Confront `inconsistent-subtraction-order` §2.2 — "any subtraction order works"

> One more visit to the magic-number graph: your team's magic number was 18 after game 8 and 10 after game 12 — the points (8, 18) and (12, 10). You already found the slope: rise = 10 − 18 = −8, run = 12 − 8 = 4, and −8 ÷ 4 = −2. Negative 2 matches what the graph shows — a line falling as the games go by.
>
> A classmate named Marcus works the same problem a different way. He says, "For each subtraction, I just do the bigger number minus the smaller one. The order is up to you." So he keeps the run as 12 − 8 = 4, but he writes the rise as 18 − 10 = 8. His slope comes out 8 ÷ 4 = **+2**. Positive — for a line anyone can see is falling.
>
> Here's what went wrong. Picture the rise and the run as two arrows that walk from one point to the other. Your run arrow walked forward along the line, from game 8 to game 12. Your rise arrow made the same trip, from 18 down to 10. Marcus's run arrow walked forward too — but his flipped rise arrow walked the trip *backward*, from 10 up to 18. One arrow going forward and one going backward, and the sign came out wrong.
>
> One thing Marcus *could* have done is flip both. Start both subtractions from the other point — rise = 18 − 10 = 8 and run = 8 − 12 = −4 — and you get 8 ÷ (−4) = −2. Still the right answer, because both arrows walked the line together.
>
> So, in your own words: what's the one rule about the two subtractions that keeps the sign honest?

**Authoring notes.** Remediation move is §2.2's arrows re-representation ("do your two arrows walk the line in the same direction?"), staged as an attributed deliberate error (classmate "Marcus" flips one subtraction), predict-then-reveal on dataset D3 — the lesson voice never instructs the student to make the error. The full-reversal-is-fine statement now appears in-segment on D3's numbers ((18 − 10)/(8 − 12) = −2) and repeats in §6 on D1, satisfying §2.15 (consistent reversal is correct and never penalized). Resolution rubric: states the same-direction invariant and why flipping one flips the sign (§3.3 element 4).

```visual
id: V-C3-01
type: animation
purpose: Show matched arrows producing the true sign, then one deliberately flipped arrow producing the lie.
data:
  base: V-WE3-01 plane, points (8, 18) and (12, 10), line through them
  pass_1: run arrow (8,18)->(12,18) label "12 − 8 = 4"; rise arrow (12,18)->(12,10) label "10 − 18 = −8"; readout "−8 ÷ 4 = −2 ✓ line falls"
  pass_2: run arrow unchanged; rise arrow REVERSED (12,10)->(12,18) label "18 − 10 = 8"; readout "8 ÷ 4 = +2 ✗ but the line falls"
annotations:
  - pass 1 arrows --green-on-light/--blue-on-light; pass 2 reversed arrow --error-on-light
  - final frame shows both passes side by side with "same direction / opposite directions" captions
reveal_beats:
  1. Pass 1 plays; slope −2 confirmed against the falling line.
  2. Student predicts what the flipped rise will produce.
  3. Pass 2 plays; the +2 readout gets an ✗ against the visibly falling line.
  4. Side-by-side freeze frame with the invariant captioned.
```

---

## 6. FORMALIZATION — naming what you already did

> You've done the same three moves four times now. Time to write them down once, in a way that works for any two points.
>
> Call your first point **(x₁, y₁)** and your second point **(x₂, y₂)**. The little 1 and 2 aren't math — they're name tags. Read x₂ as "the x of point 2."
>
> **Your rise** was always the second y minus the first y. Written: **y₂ − y₁**. Mathematicians call any "change" a **delta**, written Δ, so rise = Δy.
>
> **Your run** was always the second x minus the first x. Written: **x₂ − x₁**. So run = Δx.
>
> **Your slope** was always rise ÷ run. Mathematicians call slope **m**. So:
>
> **m = (y₂ − y₁) / (x₂ − x₁)**
>
> Check it against the scout's notebook, points (2, 4) and (6, 16): m = (16 − 4)/(6 − 2) = 12/4 = **3**. Same answer as before — the formula is just your three moves with name tags on.
>
> Two rules to lock in. First: y's only ever subtract from y's, and x's only from x's — never across. Second: it doesn't matter which point you call point 1, as long as *both* subtractions start from the same one: (4 − 16)/(2 − 6) = −12/−4 = 3 works too.

**Authoring notes**
- Derivation is naming-what-you-already-did: rise/run were computed identically in 3.1–3.4; the formula introduces only notation, no new procedure. First student-facing appearance of m, Δ, subscripts, and the formula in this document — constraint (a) holds.
- Subscript treatment is explicit ("name tags," "the x of point 2") because §2.7 `subtracts-within-points` is *born here* — its cognitive root is subscripts parsed as "the 2-stuff over the 1-stuff." The "y's only subtract from y's" line is §2.7's quantity-labeling remediation move; the visual color-codes it per §2.7's re-representation.
- The full-reversal check (4 − 16)/(2 − 6) = 3 encodes §2.15: consistent reversal is correct and must never be marked wrong. The "both start from the same point" clause restates §2.2's invariant in formula language.

```visual
id: V-FORM-01
type: dual-representation
purpose: Color-map every formula symbol onto the graph objects the student has been using since 3.2.
data:
  left_panel: V-WE4-01 plane exactly (points (2, 7) and (6, 19), rise arrow 12, run arrow 4)
    with point labels rewritten "(x₁, y₁) = (2, 7)" and "(x₂, y₂) = (6, 19)"
  right_panel: formula "m = (y₂ − y₁)/(x₂ − x₁)" then substituted "(19 − 7)/(6 − 2) = 12/4 = 3"
annotations:
  - ALL y-symbols and the numbers 19, 7, 12, and the rise arrow: --blue-on-light
  - ALL x-symbols and the numbers 6, 2, 4, and the run arrow: --green-on-light
  - color-coding note for renderer: never mix the two hues within one difference (this IS the §2.7 counter)
reveal_beats:
  1. Left graph appears with name-tag labels.
  2. Formula appears uncolored.
  3. y-parts flash blue simultaneously on graph and formula; substitution 19 − 7 fills in.
  4. x-parts flash green simultaneously; substitution 6 − 2 fills in.
  5. m = 3 resolves; caption: "the formula is your three moves, named."
```

---

## 7. BRIDGE L05 → L06 — when do two points tell the whole story?

> In the last lesson (rate of change), you found rates from full tables and stories. Today you found the same number from just **two points**. The scout's shortcut works — but it comes with one warning.
>
> Two points give you the exact rate only if the rate is **constant** — only if the data makes a straight line. The scout assumed your season was steady. What if it wasn't?
>
> Here's a table. Before you compute anything, look at it: does this look like a constant rate to you?
>
> | x | 1 | 2 | 3 | 4 |
> |---|---|---|---|---|
> | y | 2 | 5 | 10 | 17 |
>
> Try the two-point formula on the *ends* of the table: m = (17 − 2)/(4 − 1) = 15/3 = **5**. So is "5 per step" the rate?
>
> Check the middle before you answer. From x = 1 to x = 2, y climbs **3**. From 2 to 3, it climbs **5**. From 3 to 4, it climbs **7**. Your own numbers just said 3, then 5, then 7 — and no single straight line can do that.
>
> So here's the rule: the two-point formula measures the slope *of the line between those two points*. If the data isn't a straight line, that number only describes the trip between your two snapshots — not the whole story. Check the middle before you trust the ends.

**Authoring notes**
- Mandatory discrimination moment: `assumes-constant-rate-nonlinear` §2.14 — F-IF.B.6 lives entirely on ALG-L05 with no downstream average-rate node (taxonomy structural finding), so L06 must carry this guard. The segment is §2.14's "middle-point betrayal" remediation move run on §2.14's own example table (1, 2), (2, 5), (3, 10), (4, 17); the endpoint trap "yes, 5 per step" is §2.14 signature (b) computed on these numbers.
- Axis-B discrimination (confusable cluster: slope vs. rate vs. proportion): downstream practice for this node must interleave ≥2 nonconstant-table items (§2.14 severity note) and ≥1 unequal-scale graph item (§2.11 severity note) so neither error survives silently to the transfer battery.
- Backward link: students who fail the constancy check here have an L05-surface gap; routing reason per §3.4: "Slope from two points only works when the rate is steady — we're going back to rate of change to build that check."
- Forward link (one line, student-facing, closes the arc): L08 will put this m into y = mx + b; the scout's number becomes a prediction machine.

```visual
id: V-BRIDGE-01
type: dual-representation
purpose: Betray the endpoint slope — the line through the end points visibly misses the middle of the curve.
data:
  left_panel: table { columns: ["x", "y"], rows: [[1, 2], [2, 5], [3, 10], [4, 17]],
    gap_labels_between_rows: ["+3", "+5", "+7"] }
  right_panel: coordinate-plane { x_axis: {label: "x", range: [0, 5], gridline_every: 1},
    y_axis: {label: "y", range: [0, 20], gridline_every: 2},
    points: [ {x:1,y:2}, {x:2,y:5}, {x:3,y:10}, {x:4,y:17} ],
    dashed_line: through (1, 2) and (4, 17), label "the two-point line, slope 5" }
annotations:
  - gap labels +3/+5/+7 appear in --retrieval-on-light, one at a time
  - middle points (2, 5) and (3, 10) pulse where the dashed line passes above/below them
reveal_beats:
  1. Table appears; student predicts constant-or-not before anything else (commit required).
  2. Dashed endpoint line draws on the plane with "slope 5".
  3. Gap labels +3, +5, +7 appear in order down the table.
  4. Middle points pulse; the dashed line visibly misses them — "no single line can do that."
```

---

## Appendix — constraint self-check (authoring metadata)

| Constraint | Status |
|---|---|
| (a) Formula/m/Δ/subscripts absent from student text before §6 | PASS — §§1–5 use rise, run, change, steepness/slope only; formula first appears in §6 |
| (b) Every distractor cites entry ID + trap computed on item numbers | PASS — EC1 (§2.8: 12 vs 6; §2.6: 2 = 2), EC2 (§2.1: 36; §2.3: 1/3; §2.6: 24), EC3 (§2.2/§2.5 pair: 15; §2.1: −45; §2.3: −1/15), EC4 (§2.1: 12; §2.7: 13/5; §2.9: 19/6); collisions handled per matrix (EC3 ambiguous pair logs + queues positive-slope probe) |
| (c) Confrontations = 3 highest severities | PASS — §2.1 BLOCKER, §2.6 BLOCKER, §2.2 top HIGH (only HIGH with L06 as stated primary home; tie-break documented in §5) |
| (d) Nonconstant-rate discrimination moment | PASS — §7, keyed to §2.14, on the taxonomy's own table |
| (e) Zero null/unspecified visuals | PASS — 10 fenced visual specs (V-HOOK-01, V-ANCHOR-01, V-WE1-01…V-WE4-01, V-EC1-01, V-C2-01, V-C3-01, V-FORM-01, V-BRIDGE-01); EC2/EC3/EC4 reuse specified geometries with stated substitutions |
| (f) v2 voice contract | PASS — no meta-labels in student text; §5 misconceptions voiced only by named fictional peers (Priya §5.1, Eli §5.2, Marcus §5.3) with context and units re-established first; realism rationale confined to Authoring notes (EC3 workload note relocated); every rate carries units ("hits per game," "goals per match," "pitches per inning") |
| Datasets reused | D1 (2,4)/(6,16)→3; D2 (8,24)/(20,60)→3; D3 (8,18)/(12,10)→−2; D4 (2,7)/(6,19)→3 (b=1); ramps 6/4 vs 12/10; §2.14 table |
| Phase discipline | P1: §1–3.1 · P2: §3.2–3.3, EC2–EC3 · P3: §3.4, EC4, §6 — sport is the on-ramp; neutral transfer remains the mastery bar |
