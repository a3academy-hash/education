# GOLD_NODE_HINTS.md — ALG-L06 Hint-Ladder Library (D2)

| Field | Value |
|---|---|
| Node | ALG-L06 — Slope from Two Points (gold node) |
| Status | DRAFT — pending Matt review |
| Taxonomy version | `docs/gold-node/misconception-taxonomy-slope.md` (mr-kahn, 2026-07-02) — §3.1 ladder contract binding |
| Inputs | misconception-taxonomy-slope.md §2/§3.1; `gold-node-items.json` (all `hintLadderRef` entries); `GOLD_NODE_LESSON.md` §4 (EC1–EC4 trap→tag wiring) + global voice rules; `.authoring-tmp/remote-specs/RUNTIME_TUTOR_SPEC.md` §1.1/§4; `docs/specs/QUESTION_VOICE.md` §10 |
| Runtime role | These rungs are the **pre-authored static hints** the tutor serves as the LLM-free fallback (RUNTIME_TUTOR_SPEC §4: "Every item ships with 3 static rungs precisely so the tutor is optional"). They must stand alone — no model call ever completes them. |

> **DECLARED DEVIATION FROM TAXONOMY §3.1 — fixed-number rungs 2–3.** The taxonomy §3.1 ladder contract phrases rung 2 as "miniaturized onto **this item's numbers**" and rung 3 as "the first correct step on **this item's numbers**," rendered from templates with the item's parameters slotted in. This library deviates: every ladder's rungs 2–3 run on the ladder's **own fixed, item-agnostic numbers** instead. Why: (i) **answer-safer** — a rung slotted with the live item's parameters performs "exactly the first correct step" on the very numbers being graded, so finishing it can land on the item's key; fixed foreign numbers make answer leakage auditable and excludable (Appendix A.3 checks every rung-2/3 quotient against every referencing item's answers, embedded-check keys, and hidden construct components); (ii) **outage-servable verbatim** — RUNTIME_TUTOR_SPEC §4 serves these three static rungs with no model call, and fixed numbers require no parameter templating at serve time; (iii) **worked-analog form** — rung 3 stays a worked micro-step the student re-runs on their own numbers ("You finish it — then … your own …"), the same pedagogical move in transfer-safe form. This stands as a **declared deviation pending a taxonomy §3.1 amendment**; the taxonomy file itself is not edited by this deliverable.

**Keying contract (restated in 3 lines).**

1. Every gold-node item resolves `hintLadderRef.generic` → `HL-L06-generic` and every `hintLadderRef.perTag["<tag>"]` → `HL-<tag>` in this file; the lesson's embedded checks (D1 §4) fire the same ladders through the same tags.
2. A tag ladder fires only after its tag is **confirmed** — a signature hit outside a collision zone, or a collision hit resolved by the queued disambiguation probe (taxonomy §3.1 + consolidated collision matrix); until then, only the pair's shared Hint 1 serves (see "Collision service rules" below). Untagged wrong answers get `HL-L06-generic` and log `misconception_tag: null`.
3. Rung 1 = root probe (a question at the belief's root), rung 2 = targeted counter on the ladder's **own fixed small numbers** (item-agnostic — one ladder serves every item that references its tag), rung 3 = worked micro-step that sets up the computation and stops before any answer ("You finish it"). Rungs 1–2 never mention the slope formula and never say "divide"; no rung ever states a final answer.

**Voice.** Blockquoted rung text is student-facing: second person, plain coach speech, units attached to every contextual quantity, no meta-labels, passes the read-aloud test. Hints speak **directly to the student** — named fictional peers belong only to the lesson's confrontation segments (D1 §5), never to hints. Everything outside blockquotes is authoring-facing and is stripped by the content pipeline.

---

## 1. Coverage table

Built by parsing `gold-node-items.json` (every `hintLadderRef.perTag` key/value) and the D1 lesson §4 distractor keys. Item ids abbreviated (`scaf-01` = `ALG-L06-gold-scaf-01`, etc.).

| Tag | Ladder id | Taxonomy | Referenced by (items) | Referenced by (embedded checks) |
|---|---|---|---|---|
| *(untagged)* | `HL-L06-generic` | §3.1 generic rule | all 15 items (`hintLadderRef.generic`) | none reachable — every EC distractor is taxonomy-keyed, so ECs never serve the generic ladder |
| `forgot-denominator` | `HL-forgot-denominator` | §2.1 | scaf-01, scaf-02, scaf-03, ea-01, ea-02, ea-03, pr-02, int-01, int-03, disc-02, disc-03 (11) | EC2-B, EC3-C, EC4-B |
| `inconsistent-subtraction-order` | `HL-inconsistent-subtraction-order` | §2.2 | scaf-01, scaf-02, scaf-03, ea-01, pr-02, int-02 (6) | EC3-B (−m/\|m\| pair — shared Hint 1 until probe resolves) |
| `inverted-ratio` | `HL-inverted-ratio` | §2.3 | scaf-01, scaf-02, scaf-03, ea-01, pr-02, int-01, int-02, int-03, disc-02 (9) | EC2-C, EC3-D |
| `rise-run-direction-error` | `HL-rise-run-direction-error` | §2.4 | int-01 (1) | — |
| `drops-negative-slope-sign` | `HL-drops-negative-slope-sign` | §2.5 | scaf-02 (1) | EC3-B (−m/\|m\| pair — shared Hint 1 until probe resolves) |
| `slope-as-difference` | `HL-slope-as-difference` | §2.6 | scaf-01, scaf-03, ea-02 (3) | EC1-C, EC2-D |
| `subtracts-within-points` | `HL-subtracts-within-points` | §2.7 | scaf-03, ea-01, ea-02, ea-03 (4) | EC4-C |
| `slope-as-height` | `HL-slope-as-height` | §2.8 | scaf-01, scaf-04, ea-03, disc-03 (4) | EC1-B |
| `slope-as-single-point-ratio` | `HL-slope-as-single-point-ratio` | §2.9 | scaf-01, scaf-03, ea-03, int-03, disc-03 (5) | EC4-D |
| `rate-not-per-unit` | `HL-rate-not-per-unit` | §2.10 | scaf-01, scaf-02, ea-02 (3) | — |
| `grid-count-ignores-scale` | `HL-grid-count-ignores-scale` | §2.11 | pr-01, disc-02 (2) | — |
| `slope-as-visual-steepness` | `HL-slope-as-visual-steepness` | §2.12 | pr-01 (1) | — |
| `zero-undefined-slope-swap` | `HL-zero-undefined-slope-swap` | §2.13 | scaf-04 (1) | — |
| `assumes-constant-rate-nonlinear` | `HL-assumes-constant-rate-nonlinear` | §2.14 | disc-01 (1) | — |

15 ladders: 14 tag ladders (one per taxonomy entry referenced in the gold node — that is all 14 entries) + 1 generic.

---

## 2. Collision service rules (which rung serves when the trigger is ambiguous)

Per taxonomy §3.1, a wrong answer matching a **collision pair** gets a shared root-adjacent Hint 1 while the disambiguation probe is queued; the full tag ladder fires only after the probe confirms one member. The pairs live in the gold node as follows:

| Collision (matrix row) | Where it fires in the gold node | Shared Hint 1 served | Probe |
|---|---|---|---|
| −m / \|m\| (§2.2 vs §2.5, m < 0) | scaf-02 a:24, b:6; pr-02 7/4; EC3-B | `SH1-SIGN-PAIR` (below) | positive-slope two-point item |
| Δy (§2.1 vs §2.10, numeric entry) | every bare-numeric Δy trigger (defaults to §2.1) | `HL-forgot-denominator` rung 1 — root-adjacent for both beliefs (never-saw-Δx and saw-it-didn't-normalize) | unit-labeled choice item |
| 1/m (§2.3 vs `reverses-x-and-y`, bare pairs) | scaf-03 a:4/3; pr-02 −4/7 | `HL-inverted-ratio` rung 1 — probes the referent without presuming which convention broke; §2.3 is the default tag | plot/read probe ("plot (3, 7)") |
| \|m\| on read-a-graph (§2.4 vs §2.5) | not live in gold items (int-01 is a construct item, which keys §2.4 decisively) | n/a here; if authored later, serve `SH1-SIGN-PAIR` | construct item |

**`SH1-SIGN-PAIR`** — shared Hint 1 for the −m/\|m\| pair (root-adjacent to both §2.2 and §2.5; presumes neither):

> Look at your two points: as x grows from one to the other, does y climb or fall? Now look at your slope — does it say the same thing?

`SH1-SIGN-PAIR` is intentionally **not** in any item's `hintLadderRef` — it is addressed by the collision-matrix row, not by per-item reference. After the probe resolves, rungs continue inside the confirmed tag's ladder at rung 2 (the shared Hint 1 counts as that ladder's rung 1 for the session's hint budget).

---

## 3. The ladders

### `HL-L06-generic`

- **Tag:** none — untagged wrong answer (matched no detection signature; logs `misconception_tag: null` for taxonomy growth).
- **Taxonomy:** §3.1 generic rule (restate the goal → anchor the structure → first micro-step).
- **Belief countered:** none confirmed — the rungs re-anchor the task instead of attacking a diagnosis.

> **Rung 1 (re-anchor the goal):** Slope is a pace: how much y changes for every 1 step x takes. Read your answer back to yourself — does it say a pace?

> **Rung 2 (narrow to the operative comparison):** Two changes live in this problem: how far the y-values moved, and how far the x-values moved while that happened. Find both before anything else, and keep track of which is which.

> **Rung 3 (worked micro-step, generic numbers):** Try an easy pair first: from (1, 2) to (3, 16), the y-values move 16 − 2 = 14 while the x-values move 3 − 1 = 2, so the slope is 14 ÷ 2. You finish it — then run those same three moves on your own points.

- **neverSay:** Rungs 1–2 never say "subtract," "divide," "rise over run," or quote the slope formula. Rung 3 never computes 14 ÷ 2 and never touches the item's numbers.
- **Renumbering note (2026-07-05, mr-kahn D2 review):** previously (1, 2)→(3, 8), quotient 3 — which is int-03's hidden construct target slope and the EC2/EC4 key. Renumbered so the quotient (7) avoids the widened collision set; audit in A.3.

### `HL-forgot-denominator`

- **Tag:** `forgot-denominator` — **Taxonomy:** §2.1 (BLOCKER).
- **Belief countered:** Slope *is* the amount the output changed (Δy alone); the input's change is never consulted.
- This is the taxonomy's §3.1 exemplar ladder, held to its structure (same-Δy contrast pair, N-in-K vs N-in-N); rung 1 generalized to stay item-agnostic. The exemplar's own numbers (12-in-4 vs 12-in-12) are **renumbered** here: their quotient 3 is int-03's hidden construct target slope and the EC2/EC4 key (see A.3).

> **Rung 1 (root probe):** You found how much one thing changed. A rate compares two changes — what else was changing while that happened?

> **Rung 2 (targeted counter):** One player picked up 14 more hits, and it took her 4 games. Another player also picked up 14 more hits — in 14 games. Same rate? What do you have to do with the 4?

> **Rung 3 (worked micro-step):** For the first player: the hits changed by 14 and the games changed by 4, so her rate is 14 ÷ 4, in hits per game. You finish it — then find both changes in your own problem before anything else.

- **neverSay:** Rungs 1–2 never say "divide," never mention the bottom of a fraction, and never name the missing quantity for the student — the second change must be discovered, not installed. Rung 3 never computes 14 ÷ 4.
- **Collision note:** Rung 1 doubles as the shared Hint 1 for the Δy pair (§2.1/§2.10) — it is root-adjacent for both beliefs. On a bare-numeric Δy hit, only rung 1 serves until the unit-labeled probe resolves the pair (§2 above).

### `HL-inconsistent-subtraction-order`

- **Tag:** `inconsistent-subtraction-order` — **Taxonomy:** §2.2 (HIGH).
- **Belief countered:** The subtraction order on top and bottom of the slope are independent choices, so one can run forward and the other backward.

> **Rung 1 (root probe):** You made two subtractions to get here. Did both of them walk the line the same way — from the same starting point to the same ending point?

> **Rung 2 (targeted counter):** Plot (1, 3) and (5, 11), then draw your climb arrow and your across arrow, arrowheads on. Do your two arrows walk the line in the same direction, or in opposite directions?

> **Rung 3 (worked micro-step):** Pick one direction and stay in it: walking from (1, 3) to (5, 11), the climb is 11 − 3 and the across is 5 − 1 — both read start-to-end. You finish it — then redo your own two subtractions in one single direction.

- **neverSay:** Rungs 1–2 never say "divide," never show the slope fraction, and never tell the student which of their two subtractions ran backward. No rung states the item's correct sign or value.
- **Collision note:** When m < 0, the −m trigger equals |m| and is ambiguous with §2.5. This ladder fires only after the positive-slope probe confirms §2.2 (the student answers a negative slope for an obviously increasing relation). Until then: `SH1-SIGN-PAIR` only, pair logged, neither tag active.

### `HL-inverted-ratio`

- **Tag:** `inverted-ratio` — **Taxonomy:** §2.3 (HIGH).
- **Belief countered:** The rate compares input per output (Δx/Δy) — often anchored by word order in the prompt.

> **Rung 1 (root probe):** Your answer is a comparison — but which way around? Say it out loud with its units: is that the what-per-what the question asked for?

> **Rung 2 (targeted counter):** A plant grows 6 cm in 3 days. "2 cm each day" and "half a day for each cm" are both true — but only one of them answers "how fast is it growing, in cm per day?"

> **Rung 3 (worked micro-step):** For the plant, cm per day means the height's change leads: the height climbed 6 cm while the days climbed 3, so the rate is 6 ÷ 3, in cm per day. You finish it — then check which change your question puts first.

- **neverSay:** Rungs 1–2 never say "flip your fraction," never say which quantity goes on top, and never say "divide." No rung states the item's answer.
- **Collision note:** On bare coordinate pairs, 1/m is shared with `reverses-x-and-y`; §2.3 is the default tag and rung 1 serves as the pair's shared Hint 1 while the plot probe is queued. On named-quantity items the tag is decisive and the full ladder runs.

### `HL-rise-run-direction-error`

- **Tag:** `rise-run-direction-error` — **Taxonomy:** §2.4 (MEDIUM).
- **Belief countered:** "Rise" always means up and "run" always means right — the step direction is a fixed habit instead of being chosen by the slope's sign.

> **Rung 1 (root probe):** Before you step, read the line's story: as x grows, is this quantity climbing or falling? Which way must your step go to stay with it?

> **Rung 2 (targeted counter):** A line falls from (0, 10) as you move right. Step right 1 and up 2 anyway and you land at (1, 12) — floating above the line. Are you still on it?

> **Rung 3 (worked micro-step):** The sign steers the step: a slope of −2 means right 1, then DOWN 2 — from (0, 10) that lands on (1, 8), back on the line — while a slope of +2 would mean right 1, then up 2. You finish it — let your slope's sign pick the direction before you move.

- **neverSay:** Rungs 1–2 never say "go down instead" and never name the correct landing point — the wrong step's contradiction has to be seen first. No rung places the item's point.
- **Collision note:** Numeric |m| answers on read-a-graph items are ambiguous with §2.5 and queue a construct probe. This ladder fires on construct items (the placed point is decisive — int-01's trigger) or after the probe.

### `HL-drops-negative-slope-sign`

- **Tag:** `drops-negative-slope-sign` — **Taxonomy:** §2.5 (MEDIUM, HIGH if it survives to L08).
- **Belief countered:** Slope measures only how steep; the sign is bookkeeping, not meaning.

> **Rung 1 (root probe):** Your number says how steep. Does it say which direction — is this quantity growing or shrinking as the games go by?

> **Rung 2 (targeted counter):** One team is gaining 3 points a game; another is losing 3 points a game. If you write both rates as just 3, how would anyone know which team is in trouble?

> **Rung 3 (worked micro-step):** The losing team's rate is −3 points per game — the minus sign IS the losing. You finish yours: your climb came out with a sign for a reason, so carry that sign all the way onto the slope.

- **neverSay:** Rungs 1–2 never say "add a minus sign" and never state the item's signed answer; never say "divide."
- **Collision note:** Mirror of §2.2's note — an |m| hit on a negative-slope item is ambiguous between the two. This ladder fires only after the positive-slope probe attributes the hit here (the student computes the positive item correctly, proving the setup is consistent and only the sign is discarded).

### `HL-slope-as-difference`

- **Tag:** `slope-as-difference` — **Taxonomy:** §2.6 (BLOCKER).
- **Belief countered:** The two changes are compared by subtraction — "how much more" — instead of by a ratio.
- Fixed counter-case uses fresh ramps (5-over-3 vs 9-over-7), not EC1's ramps, so the counter never resolves EC1 for the student.

> **Rung 1 (root probe):** You compared the two changes by finding how far apart they are. Is "how far apart" the same thing as "how fast"?

> **Rung 2 (targeted counter):** One ramp climbs 5 blocks over 3 blocks across; another climbs 9 blocks over 7 blocks across. Subtract and both give 2 — a tie — but walk them: the short ramp costs your legs more climb on every single block across. What did the subtraction miss?

> **Rung 3 (worked micro-step):** Steepness is climb for each single block across: the short ramp spreads 5 blocks of climb across 3 blocks, 5 ÷ 3 per block, and the long one spreads 9 across 7, 9 ÷ 7 per block. You finish both — then compare your own two changes the same way, not by subtracting.

- **neverSay:** Rungs 1–2 never say "divide," "ratio," or "per one" — the walk has to force the idea. No rung answers the item (or EC1's ramp comparison).
- **Routing note (authoring-facing):** An active §2.6 tag routes below L05 per §3.4 — this ladder is first aid, never a substitute for the BLOCKER route.

### `HL-subtracts-within-points`

- **Tag:** `subtracts-within-points` — **Taxonomy:** §2.7 (MEDIUM; diagnostic gold).
- **Belief countered:** The slope fraction is "point 2's numbers subtracted, over point 1's numbers subtracted" — differences formed inside each pair instead of across pairs.

> **Rung 1 (root probe):** Look at the first two numbers you subtracted. Do they measure the same thing — or two different things?

> **Rung 2 (targeted counter):** Take (2, 10) and (5, 22), where x counts days and y counts dollars. The 22 and the 5 sit in the same point, but 22 is dollars and 5 is days — dollars minus days is nothing you could count or spend.

> **Rung 3 (worked micro-step):** Match like with like, always across the two points: dollars with dollars, 22 − 10, and days with days, 5 − 2. You finish those two changes — then rebuild your own pair the same way, same-kind with same-kind.

- **neverSay:** Rungs 1–2 never hand over the correct pairing ("subtract across the points") — rung 1's question must expose the mixed units first; never say "divide." No rung states the item's answer.

### `HL-slope-as-height`

- **Tag:** `slope-as-height` — **Taxonomy:** §2.8 (HIGH).
- **Belief countered:** Slope is the height of the graph — the y-value at a point — conflating what the function *is* with how it is *changing*.

> **Rung 1 (root probe):** Your number says where the line sits at one spot. Is "where is it?" the same question as "how fast is it changing?"

> **Rung 2 (targeted counter):** Two questions about one scoring graph: "how many points did she have at game 6?" and "how fast was she scoring, in points per game?" Point to where each answer lives on the picture — one lives at a spot, the other lives in the tilt.

> **Rung 3 (worked micro-step):** A spot needs one point; a tilt needs two. From (1, 4) to (3, 10), the line climbs 10 − 4 = 6 while it goes 3 − 1 = 2 across, so the tilt is 6 ÷ 2. You finish it — two points, two changes, never just one height.

- **neverSay:** Rungs 1–2 never name the two-point procedure and never tell the student outright "the answer is the rate, not the y-value" — the spot-vs-tilt contrast must do that work. Rung 3 never computes 6 ÷ 2 or the item's slope.

### `HL-slope-as-single-point-ratio`

- **Tag:** `slope-as-single-point-ratio` — **Taxonomy:** §2.9 (HIGH; Axis-B discriminator).
- **Belief countered:** y ÷ x at any single point gives the slope — the proportional (y = kx) habit applied to lines that did not start at zero.

> **Rung 1 (root probe):** Your answer came from just one point. What is that assuming about where this line started?

> **Rung 2 (targeted counter):** Two runners both cover 5 meters every second, but one started 20 meters ahead — so at 4 seconds she is at the 40-meter mark. Treat those 40 meters as if she ran them all in those 4 seconds, and you would call her twice as fast as she really is.

> **Rung 3 (worked micro-step):** Her head start never ran a single meter — so use two snapshots instead of one. From (1, 25) to (4, 40) she covered 40 − 25 = 15 meters in 4 − 1 = 3 seconds: her speed is 15 ÷ 3, in meters per second, and the head start cancels itself out. You finish it.

- **neverSay:** Rungs 1–2 never say "use two points," never say the line "doesn't pass through the origin," and never say "divide" — the head start has to be caught by the student. Rung 3 never computes 15 ÷ 3 or the item's slope.

### `HL-rate-not-per-unit`

- **Tag:** `rate-not-per-unit` — **Taxonomy:** §2.10 (MEDIUM in L05, HIGH in L06+).
- **Belief countered:** A true change over a multi-unit interval ("12 hits in 4 games") already *is* the rate — the comparison is never brought down to one unit of input.

> **Rung 1 (root probe):** What you wrote really happened — nobody is arguing with it. But a rate answers "how much for each ONE?" — does yours?

> **Rung 2 (targeted counter):** Player A: 12 hits in 4 games. Player B: 20 hits in 8 games. Who is hotter — can you tell before both are "per 1 game"?

> **Rung 3 (worked micro-step):** Make each one a per-1: Player A's is 12 hits ÷ 4 games and Player B's is 20 hits ÷ 8 games, each landing in hits per one game. You finish both — then bring your own change down to per-1 the same way.

- **neverSay:** Rungs 1–2 never say "divide" or "reduce" — "per 1" names the destination (that is §2.10's own probe), not the operation. Rung 3 never computes either player's per-game number.
- **Collision note:** Bare-numeric Δy hits default to §2.1 and serve `HL-forgot-denominator` rung 1 as the shared Hint 1. This ladder fires only after the unit-labeled probe re-attributes the student here (correct magnitude, wrong referent).

### `HL-grid-count-ignores-scale`

- **Tag:** `grid-count-ignores-scale` — **Taxonomy:** §2.11 (HIGH for representation transfer).
- **Belief countered:** Grid squares carry the slope — counted squares are the measure, and the axes are never consulted to convert squares into units.

> **Rung 1 (root probe):** You counted squares going up and across. What is one square UP actually worth on this graph — and is it the same as one square ACROSS is worth?

> **Rung 2 (targeted counter):** On a graph where each square across is 1 day but each square up is 10 dollars, a line climbing 3 squares for every 2 across is not gaining 3 dollars every 2 days. The picture says 3; the axes say something much bigger.

> **Rung 3 (worked micro-step):** Convert each count with its own axis: 3 squares up × 10 dollars a square = 30 dollars, and 2 squares across × 1 day a square = 2 days, so the rate is 30 ÷ 2, in dollars per day. You finish it — count squares, then let each axis price its own squares.

- **neverSay:** Rungs 1–2 never say "multiply by the scale" and never perform the conversion — the worth-of-a-square question must send the student to the axis; never say "divide." Rung 3 never computes 30 ÷ 2 or the item's rate.

### `HL-slope-as-visual-steepness`

- **Tag:** `slope-as-visual-steepness` — **Taxonomy:** §2.12 (MEDIUM local, HIGH conceptual ceiling).
- **Belief countered:** Slope *is* how steep the drawn line looks — two lines can be compared by eye, without reading any axis.

> **Rung 1 (root probe):** Your eyes compared the two pictures. Did they read the axis numbers — or just the tilt of the ink?

> **Rung 2 (targeted counter):** Graph the same savings account twice — one y-axis counting by 1s, the other by 100s — and it looks like a cliff on the first and nearly flat on the second. Same account, same dollars, same week: did the account change?

> **Rung 3 (worked micro-step):** Steepness lives in the picture; the rate lives in the numbers. On the by-1s graph, read two points off the axes — (0, 2) and (4, 10) means the account grew 10 − 2 = 8 dollars in 4 − 0 = 4 weeks, so the rate is 8 ÷ 4, in dollars per week. You finish it — and never trust a look you haven't priced against the axes.

- **neverSay:** Rungs 1–2 never say which line or panel actually has the larger slope and never describe the read-two-points procedure; never say "divide." Rung 3 never computes 8 ÷ 4 or resolves the item's comparison.

### `HL-zero-undefined-slope-swap`

- **Tag:** `zero-undefined-slope-swap` — **Taxonomy:** §2.13 (LOW-MEDIUM).
- **Belief countered:** "0" and "undefined" are memorized labels for the flat and straight-up lines — memorized backwards, because neither was ever attached to the ratio.
- **Degenerate-case rule (rule 5):** the student's item may be horizontal *or* vertical; every rung below works for both and never presumes which one they had — the arithmetic hands over the label.

> **Rung 1 (root probe):** Is that a label you remembered, or a number you worked out? Try it here: what do the climb and the across actually come out to be for these two points?

> **Rung 2 (targeted counter):** Walk a perfectly flat hallway for 6 steps: how much did you climb? That's a real number — a real answer. Now face a wall going straight up: how many steps ACROSS does it even give you to work with?

> **Rung 3 (worked micro-step):** Run the machine instead of reciting: for (4, 1) and (4, 9) the across is 4 − 4 = 0, so the slope tries to be 8 ÷ 0 — punch that into a calculator and watch what happens. Then walk the flat pair (1, 5) and (7, 5) the same way: climb 5 − 5, across 7 − 1. You finish both — let the arithmetic hand you each label.

- **neverSay:** No rung ever says which line type gets "0" and which gets "undefined" — that assignment is exactly what the student must re-derive; rungs 1–2 never say "divide by zero."

### `HL-assumes-constant-rate-nonlinear`

- **Tag:** `assumes-constant-rate-nonlinear` — **Taxonomy:** §2.14 (HIGH conceptual guard).
- **Belief countered:** Every relationship has one rate, so two points always suffice — a curve gets measured as if it were straight.

> **Rung 1 (root probe):** You measured between two snapshots. Does this pattern climb by the same amount at every single step — did you check the middle?

> **Rung 2 (targeted counter):** A table runs 2, 5, 10, 17: the jumps are +3, then +5, then +7. Look only at the two ends and you'd swear it's steady — the middle just told you otherwise.

> **Rung 3 (worked micro-step):** Check every gap before trusting any of them: 5 − 2 = 3, then 10 − 5 = 5, then 17 − 10 = 7. You finish it on your own table — if all the jumps match, one rate rules it; if they don't, no single slope can speak for the whole thing.

- **neverSay:** Rungs 1–2 never declare "it isn't constant" or "it isn't a line" — the middle check must deliver that verdict; no rung answers the item's yes/no.

---

## Appendix A — Self-audit

Checks run 2026-07-05 against `gold-node-items.json` (parsed) and `GOLD_NODE_LESSON.md` §4 (distractor keys read manually).

**A.1 — Coverage: every referenced id defined, every defined id referenced.**

- Referenced ids collected programmatically from all 15 items' `hintLadderRef` fields: 15 distinct ids (`HL-L06-generic` + 14 `HL-<tag>`). Lesson §4 EC distractors key 9 tags, all within the same set (EC1: §2.8, §2.6; EC2: §2.1, §2.3, §2.6; EC3: §2.2/§2.5 pair, §2.1, §2.3; EC4: §2.1, §2.7, §2.9).
- Defined in this file: the same 15 ids. **Referenced-but-undefined: 0. Defined-but-unreferenced: 0.** ✓
- `SH1-SIGN-PAIR` is a collision service text, not a ladder id, and is deliberately absent from all `hintLadderRef` maps (it is addressed by the collision-matrix row). Recorded here so a future id-diff doesn't misread it as orphaned.

**A.2 — Rungs 1–2 formula-free.**

Programmatic grep over all Rung 1/Rung 2 lines for `divid`, `÷`, `formula`, `fraction`, `rise over run`, `Δ`, `y₂`, `x₂`, `(y2`, `slope =`: **0 hits** across all 15 ladders and `SH1-SIGN-PAIR`. Honest boundary cases, by inspection:

- `HL-inconsistent-subtraction-order` rung 1 and `HL-subtracts-within-points` rungs 1–2 mention *the student's own subtractions* — the belief's object, not the slope formula; the formula and division stay unnamed. Judged compliant with the §3.1 contract ("never names the procedure, never mentions the formula").
- `HL-slope-as-difference` rung 2 shows the *wrong* subtractions producing the tie (the belief acting), never the ratio.
- `HL-rate-not-per-unit` rungs 1–2 name "per 1" as the destination — this is §2.10's own remediation probe verbatim; the operation is never named.

**A.3 — No answer leakage.** *(Re-run 2026-07-05 with a WIDENED collision set, per mr-kahn's D2 review.)*

**What was widened and why.** The original pass checked rung-3 quotients only against referencing items' numeric `correctAnswer` values — and under that narrow set, recorded the old `HL-forgot-denominator` numbers (12 hits over 4 games = EC4's exact deltas, quotient landing on EC4's key) as a "documented coincidence." The review widened the set after a second near-miss the narrow check could not see: the old `HL-L06-generic` example ((1, 2)→(3, 8)) and the old `HL-forgot-denominator` exemplar both quotient to **3**, which is **int-03's answer-critical construct target** — slope 3 (with intercept 1, giving the handle state y0 = 1 / y6 = 19 the student must *infer from the table*; int-03's prompt states neither) — and is also EC2's stated slope and EC4's key. int-03 and EC2-B/EC3-C/EC4-B all serve `HL-forgot-denominator`; every item serves `HL-L06-generic`. The widened set, built programmatically from `gold-node-items.json` + lesson §4, is per ladder:

- (a) every **numeric answer** of every referencing item — item-level, per-part, and resolve answers, plus `acceptedEquivalents`;
- (b) every **embedded-check key** (lesson §4) whose distractors fire the ladder;
- (c) every **answer-critical component of a referencing construct-state item** — int-03: slope 3, intercept 1, handle state y0 = 1 / y6 = 19 (all inferred, none prompt-stated). int-01's slope 2 is *stated in its prompt* ("exactly 2 goals per match") and int-02 asks for arrow placement between two given points — neither hides a numeric, so neither contributes hidden components;
- (d) **quotient 1 banned outright** — every gold item enforces the |m| ≠ 1 generator constraint, so 1 must stay un-suggestible;
- plus a **distinctness pass** against the trap values in referencing items' misconceptionMaps (exact distinctness required; margins recorded).

**Renumbering results.**

- **`HL-L06-generic` rung 3** → (1, 2) to (3, 16): moves 16 − 2 = 14 and 3 − 1 = 2, quotient **7** (never stated). Checked against the union set over all 15 items: numeric answers and keyed choice values {20, 5, 4, −24, −6, 3/4, 17, 0, 8, 20, −7/4, 50, 2}, error-analysis corrected rates {4, 6, 1.9}, construct components {3, 1, 19} (+ prompt-stated 2 and derived −3, included anyway), EC keys/stated slopes {1.5, 1.2, 3, −15}, all accepted equivalents, and every numeric trap value across all items — **7 hits nothing**. Nearest set members: 6 (scaf-02 trap b:6; ea-02's corrected rate) and 8 (scaf-04 part (c) key; scaf-04 trap a:8), both margin 1.0 — exact-distinct, far beyond exact-match grading. ✓
- **`HL-forgot-denominator` rungs 2–3** → **14 hits in 4 games** (contrast pair: 14 hits in 14 games), quotient **3.5** (never stated). Checked against its 11 referencing items' answers/parts {20, 5, 4, −24, −6, 3/4, 17, −7/4, 50, 2}, corrected rates {4, 6, 1.9}, EC2-B/EC3-C/EC4-B keys and stated slopes {3, −15, 3}, int-03's components {3, 1, 19} — **3.5 hits nothing**. Distinctness margins to nearest trap-adjacent values: 3.25 (disc-03 choice C — choice surface, exact match only) margin 0.25; 19/6 ≈ 3.17 (EC4 choice D) margin 0.33; 3 (int-03 target / EC2·EC4 keys) margin 0.5; nearest numeric-entry key 4 (scaf-01 part (c)) margin 0.5 — all exact-distinct, none reachable by finishing the rung. The contrast player's 14-in-14 implies rate 1 exactly as the §3.1 exemplar's 12-in-12 did; rate 1 can never be a referencing key by constraint (d). ✓
- The old "documented coincidence" is **retired, not re-recorded**: under the widened rule, 12 ÷ 4 landing on EC4's key was a collision, and the renumbering removes it.

**Full re-run over the other 13 ladders** (each rung-2/3 quotient vs its own widened set). All divisions still stop before their result (programmatic check: `14 ÷ 2`, `14 ÷ 4`, `6 ÷ 3`, `5 ÷ 3`, `9 ÷ 7`, `6 ÷ 2`, `15 ÷ 3`, `12 ÷ 4`/`20 ÷ 8`, `30 ÷ 2`, `8 ÷ 4`, `8 ÷ 0` all appear without a stated result). Per-ladder results — clean except four boundary findings, recorded honestly:

1. `HL-slope-as-single-point-ratio` (15 ÷ 3, quotient 5): **5 equals scaf-01's part (b) answer** (run = 5) — a widened-set hit the narrow check missed. Assessed: the ladder's only scaf-01 trigger is d:D, the final part, so it can only fire after part (b) has resolved — the quotient cannot leak forward into any live ask; no other referencing surface (scaf-03, ea-03, int-03, disc-03, EC4-D) carries 5 as a key, component, or trap. **Ruled accepted (mr-kahn, 2026-07-05): trigger-ordering makes the quotient unreachable by any live ask; renumbering would disturb the rung-2 narrative arithmetic for no risk reduction. Standing entry — re-check if scaf-01's trigger map or the ladder's referencing set ever changes.**
2. `HL-zero-undefined-slope-swap`: the flat pair (climb 5 − 5, across 7 − 1) finishes to slope **0**, which is scaf-04 part (a)'s key (and, coincidentally, the value of scaf-04's §2.8 trap c:0 — the same degeneracy seen from the other side). Structural, not renumberable: 0 is the only value a zero-slope analog can produce, and re-deriving that 0 is the belief being repaired (§2.13's degenerate-case rule). The ladder's scaf-04 triggers (b:B, d:B) fire only after part (a) resolves. **Structural — PERMANENT exemption from future renumber passes (mr-kahn, 2026-07-05): no parameter choice can avoid it, and avoiding it would defeat §2.13's degenerate-case rule. Re-check only if this ladder ever gains a second referencing item whose live asks include a numeric 0.**
3. `HL-inverted-ratio` (6 ÷ 3, quotient 2) equals int-01's target slope — but that slope is **stated in int-01's prompt**; the hidden work is placing a grid point, which a quotient cannot perform. No leak. Same reasoning covers `HL-inconsistent-subtraction-order` (8 ÷ 4 → 2) and `HL-slope-as-visual-steepness` (8 ÷ 4 → 2); no ladder with quotient 2 serves disc-03 (whose key value is 2) — disc-03 fires only §2.1 (now 3.5), §2.8 (3), §2.9 (5).
4. `HL-rise-run-direction-error` uses −2 as its example slope, which coincides with int-01's §2.4 trap-state family (slope-−2 placements). That is the counter operating on the trap itself, not leakage — the correct family needs +2, and no rung places the item's point (neverSay).

Remaining ladders, clean under the widened set: `HL-slope-as-height` (6 ÷ 2 → 3) **keeps quotient 3 legitimately** — none of its referencing surfaces (scaf-01, scaf-04, ea-03, disc-03, EC1-B) hides or keys a 3; int-03, EC2, and EC4 do not fire it. `HL-slope-as-difference` remains off EC1's ramps (5-over-3 / 9-over-7 vs EC1's 6-over-4 / 12-over-10); quotients 5/3 and 9/7 are exact-distinct from EC1's 1.5 and 1.2 (choice-only surfaces). `HL-subtracts-within-points` rung 3 stops before forming either change; the implied 12-over-3 (= 4) equals ea-01's corrected rate, but ea-01's answers are locate/diagnose letters — the corrected rate is never an enterable key. `HL-rate-not-per-unit` (12 ÷ 4 → 3, 20 ÷ 8 → 2.5): its referencing set (scaf-01, scaf-02, ea-02 — no ECs, no construct items) contains neither 3 nor 2.5 as key, component, or trap. `HL-drops-negative-slope-sign` states its analog's rate −3 outright (the sign IS the counter); −3 is no key, component, or trap on scaf-02 or EC3-B. `HL-grid-count-ignores-scale` (30 ÷ 2 → 15) and `HL-assumes-constant-rate-nonlinear` (gaps 3/5/7, no quotient): clean vs pr-01 {20; 3, 0.4}, disc-02 {50; 2, 200, 1/50}, disc-01 (choice key B).

- No ladder mentions any gold item's context (teams, drives, scouts stay generic/unnamed) or quotes any item's trap or key.

**A.4 — Voice contract.**

- All rung text second person, direct to the student; **no named peers** (peer attribution is lesson-confrontation-only per D1 global rules — checked: zero proper names in blockquotes).
- Units attached to every contextual quantity (hits/games, cm/days, points/game, dollars/day, meters/second, blocks). The two pure-coordinate micro-steps (`HL-L06-generic`, `HL-zero-undefined-slope-swap` rung 3, `HL-inconsistent-subtraction-order`) are deliberately unit-free — neutral P3 register, matching lesson §3.4's abstract-stage convention.
- No meta-labels inside blockquotes (the "Rung n (role)" headers are authoring structure, stripped like D1's "Authoring notes"); read-aloud test passed by review of each rung.
- Symbols: rungs avoid m/Δ/subscripts entirely; "x" and "y" appear only in ladders that serve P3/abstract surfaces, consistent with hints firing during practice (post-§6, where the formula has been introduced).

**A.5 — Runtime fit (RUNTIME_TUTOR_SPEC §1.1/§4).**

Three static rungs per ladder, each self-contained, ≤2–3 short sentences, no dependency on an LLM turn, no item-parameter templating required (fixed numbers make every rung servable verbatim when the LLM path is down). `hintRung` 1–3 map directly onto the rung order above; collision-pair hits serve the shared Hint 1 as rung 1 per §2.
