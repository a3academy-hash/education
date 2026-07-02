# Misconception Taxonomy — Slope Cluster (ALG-L05 / ALG-L06)

**Status:** Reference artifact for the gold-standard node experience. Every hint, error-analysis item, distractor, and self-explanation rubric element in ALG-L06 (gold) and ALG-L05 (taught prereq surface) keys to an entry ID below. All 73 remaining nodes copy the pattern in §3.

**Authored by:** mr-kahn (agent a6087caa8bc320a1d), 2026-07-02. Verdict: APPROVE on ALG-L06 as gold node (see §5).

**Structural finding:** F-IF.B.6 is carried entirely by ALG-L05 (`data/algebra1-graph.json`) — there is no downstream average-rate-of-change node — which makes L05 the mandatory home for the nonlinearity-blindness entry (§2.14).

**Notation used throughout.** Item parameters: points P₁ = (x₁, y₁), P₂ = (x₂, y₂); Δy = y₂ − y₁; Δx = x₂ − x₁; true slope m = Δy/Δx; intercept b = y₁ − m·x₁. For graph items: s_x, s_y = units per gridline on each axis. Every detection signature is a computable function of these parameters — the item generator evaluates all applicable signatures at render time (§3.4).

---

## 1. Design preamble — what makes an entry "verified"

An entry is admitted to this taxonomy only if it satisfies all four conditions:

1. **It names a belief, not a wrong output.** The definition states what the student *thinks is true* or *systematically does*, so the remediation move can attack the model failure rather than re-teach the procedure (CLAUDE.md §8: "verified misconception taxonomy" feeding the deterministic skill model).
2. **It has a deterministic detection signature.** For numeric items, an algebraic form in the item parameters that the generator computes per rendered item; for choice/construct items, a keyed distractor or construct-state that only this belief produces. No entry requires an LLM to diagnose (AI_ADAPTIVE §5: rule-based diagnosis first; LLM only after rules are exhausted).
3. **It is distinguishable from every other entry by some observable.** Where two entries produce the same number on some item class, the collision is documented and a disambiguation probe is defined. Where *no* observable can ever separate two candidates, they are merged (see §2.15, merged/rejected candidates).
4. **It is grounded.** Each entry cites its research tradition; entries with thin literature are honestly marked **engineering-observed** (seen in item-bank response data / practitioner error lists) and flagged for validation against pilot response data per CLAUDE.md §15.

**Research base for the cluster.** Slope misconceptions are among the best-documented in middle-grades math education: Stump (1999, 2001) on slope conceived as visual steepness/angle rather than ratio; Lobato & Thanheiser (2002) and Lobato, Ellis & Muñoz (2003) on *ratio-as-measure* — students attending to one quantity instead of coordinating two; Simon & Blume (1994) on constructing steepness as a ratio; the additive-vs-multiplicative reasoning literature (Hart 1981; Karplus et al.; Lamon on unit rates); De Bock & Van Dooren on the *illusion of linearity/proportionality*; Leinhardt, Zaslavsky & Stein (1990) and the physics-education graphing literature (McDermott et al. 1987; Beichner 1994) on slope–height confusion and scale errors; Postelnicu (2011, with Greenes) showing that slope from graphs with non-homogeneous axis scales is the single hardest item class for algebra students; Cho & Nagle (2017) categorizing concrete slope-calculation errors. The CCSS progression (6.RP → 7.RP → 8.EE.B.5 → 8.F.B.4 → F-IF.B.6) treats slope as the capstone of proportional reasoning — which is why half the high-severity entries below are *prerequisite-gap symptoms*, not local errors.

**Severity scale.** BLOCKER = prerequisite-gap symptom; remediation routes backward (to L05 or below), not to more L06 practice. HIGH = frequent local error that stalls mastery until targeted. MEDIUM = common but yields to one targeted counter. LOW = infrequent or self-correcting; tag for evidence, don't interrupt.

---

## 2. The taxonomy

### 2.1 `forgot-denominator` — Slope as the amount of change *(existing ID, refined)*

- **Definition:** The student believes slope/rate *is* the change in the output quantity — an amount, not a comparison — so Δy alone answers the question and Δx is never consulted.
- **Cognitive root:** Ratio-as-measure failure — attends to one quantity instead of coordinating two (Lobato & Thanheiser 2002; Stump 2001). Slope treated as extensive ("how much it went up"), not intensive ("how fast per unit").
- **Nodes:** L05 and L06 (primary); re-surfaces in L07 (rate from tables), L08/L13 (builds y = (Δy)x + b), and any F-IF.B.6 average-rate item.
- **Detection signature:** answer = **Δy = y₂ − y₁**.
  - *Generator constraints:* require |Δx| ≠ 1 (else Δy = m, trap collides with correct answer); require y₁ ≠ 0 on items also carrying the `slope-as-height` trap (else Δy = y₂, §2.8 collision).
  - *Collision:* numerically identical to `rate-not-per-unit` (§2.10) on bare numeric-entry items — see that entry for the default-tag rule and the unit-labeled disambiguation probe.
- **Remediation move:** Contrast case holding Δy fixed while varying Δx: "Two teams both scored 12 more goals. Team A did it over 4 games, Team B over 12 games. Same rate?" Then the probe: "Your answer is 12 — twelve *what*, per *what*?" Forces the second quantity into view.
- **Severity:** BLOCKER. This is the single most common slope error and signals the 6.RP/7.RP intensive-quantity gap. Two hits route back to L05's rate-as-comparison teaching sequence, not to more L06 drill.
- **Example:** Points (2, 4) and (6, 16) [live item ALG-L06-p1-baseball-01]. Trap: **12** (correct: 3).

### 2.2 `inconsistent-subtraction-order` — Mismatched Δ orientation *(existing ID, refined)*

- **Definition:** The student believes the subtraction order in numerator and denominator are independent choices, computing (y₂ − y₁)/(x₁ − x₂) or (y₁ − y₂)/(x₂ − x₁) and flipping the slope's sign.
- **Cognitive root:** Notation-driven — the formula is symbol manipulation without the underlying invariant ("both differences must be read in the same direction along the line"). Documented as a distinct calculation-error category (Cho & Nagle 2017).
- **Nodes:** L06 (primary); re-surfaces in L11 (point-slope substitution) and L13.
- **Detection signature:** answer = **−m**.
  - *Collision (important):* when m < 0, −m = |m|, which is also the `drops-negative-slope-sign` signature (§2.5). On negative-slope items the −m trap is ambiguous between the two. **Disambiguation probe:** immediately schedule a *positive-slope* two-point item. Inconsistent-order students answer −|m| (a negative slope for an obviously increasing relation — decisive); sign-droppers answer correctly. Until the probe resolves, log the ambiguous tag pair, tag neither as active.
  - *Note:* the full reversal (y₁ − y₂)/(x₁ − x₂) = m is *correct* and must never be marked wrong — labeling of points is arbitrary. Only the mismatched forms are errors.
- **Remediation move:** Re-representation, not re-explanation: draw the two points, draw the rise arrow and run arrow *as arrows with direction*, and ask "your two arrows — do they walk the line in the same direction or opposite directions?" The invariant becomes visible: both differences trace P₁ → P₂.
- **Severity:** HIGH, local. Frequent but yields quickly to the arrows counter.
- **Example:** (2, 4) and (6, 16). Trap: **−3** (correct: 3).

### 2.3 `inverted-ratio` — Run over rise *(existing ID, refined)*

- **Definition:** The student believes the rate compares input per output, computing Δx/Δy — often verbally anchored ("games per hit") because word order in the prompt drove the setup.
- **Cognitive root:** Ratio inversion / failure to anchor the *referent* of a unit rate (Lobato, Ellis & Muñoz 2003; Cramer & Post on unit-rate referents; boundary with the existing `mismatched-units-in-ratio` proportion tag).
- **Nodes:** L05 and L06; re-surfaces in L08 (interprets m in y = mx + b as "x per y") and L13.
- **Detection signature:** answer = **Δx/Δy = 1/m**.
  - *Generator constraints:* require |m| ≠ 1 (else 1/m = ±m and the trap is dead or collides with §2.2).
  - *Collision:* the existing adjacent tag `reverses-x-and-y` (transposed ordered pairs) produces the identical value 1/m on bare-coordinate-pair items. They are different beliefs (rate inversion vs. coordinate convention). **Rule:** on named-quantity items ("games as x, hits as y" stated in prose), tag `inverted-ratio` — coordinate transposition has no purchase there. On bare-pair items, tag defaults to `inverted-ratio` but queues a plot/read probe ("plot (3, 7)"); failure on the probe re-attributes to `reverses-x-and-y`.
- **Remediation move:** Units-first probe on the student's own answer: "Your answer says 1/3 — that's 1/3 of a hit for every 1 game, or 3 games for every 1 hit? Which one did the question ask for?" Then the re-representation: write both candidate rates *with full unit labels* and check each against the table.
- **Severity:** HIGH; partially a prerequisite-gap symptom (6.RP.A.2 unit-rate referents). Persistent inversion (3+ hits) routes to a unit-rate micro-review inside L05.
- **Example:** (8, 24) and (20, 60) runs vs. games. Trap: **1/3** (correct: 3).

### 2.4 `rise-run-direction-error` — Wrong step direction for the sign *(existing ID, refined)*

- **Definition:** When *constructing or stepping along* a line, the student moves the rise (or run) in the direction that contradicts the slope's sign — e.g., stepping up-and-right for a negative slope — believing "rise" always means "up."
- **Cognitive root:** Graphical convention error — "rise" and "run" learned as absolute directions (up, right) rather than signed displacements.
- **Nodes:** Primarily L09 (its current home in the registry) and graphical L06/L05 variants (slope read from a plotted line); re-surfaces in L11 when stepping from (x₁, y₁).
- **Detection signature:** on construct items ("plot the next point from (x₀, y₀) with slope m < 0"): student plots **(x₀ + run, y₀ + |rise|)** instead of (x₀ + run, y₀ − |rise|). On numeric read-a-graph items: answer = **|m|** when m < 0.
  - *Collision:* the numeric |m| form is indistinguishable from `drops-negative-slope-sign` (§2.5) on read-a-graph items. **Rule:** construct items key `rise-run-direction-error` (the point placement is decisive); pure numeric-computation items from given coordinates key `drops-negative-slope-sign`; read-a-graph numeric items log the ambiguous pair and queue a construct probe.
- **Remediation move:** Predict-then-reveal on the graph itself: "This line goes *down* as you walk right. If you step right 1 and up 4, are you still on the line? Try it." The student's wrong step visibly leaves the line — the contradiction is the teaching moment (CLAUDE.md §7).
- **Severity:** MEDIUM, local, graphical-task-specific.
- **Example:** From (0, 20) with slope −4: trap point **(1, 24)** (correct: (1, 16)).

### 2.5 `drops-negative-slope-sign` — Magnitude-only slope *(new)*

- **Definition:** The student computes the correct rise and run magnitudes but reports the slope unsigned, believing slope measures "how steep" and that sign is bookkeeping rather than meaning (direction of change).
- **Cognitive root:** Steepness-dominant slope concept (Stump 1999 — slope as steepness carries no direction) meeting general integer-operation fragility. Distinct from §2.2: the setup is consistent; the sign is discarded at the end.
- **Nodes:** L06 (primary); re-surfaces in L08 (graphs y = −2x + 5 with positive inclination) and L05 (decreasing-rate interpretation).
- **Detection signature:** answer = **|m|**, armed only on items where m < 0.
  - *Collisions:* with `inconsistent-subtraction-order` (−m = |m| when m < 0) — disambiguated by the positive-slope follow-up probe (§2.2); with `rise-run-direction-error` on read-a-graph items — disambiguated by task type (§2.4).
- **Remediation move:** Meaning-of-sign contrast pair: two P1 contexts, one rate +3 and one −3 ("gaining 3 points a game" vs. "losing 3 points a game"), then the probe: "If you write both slopes as 3, how would anyone know which team is in trouble?" Sign = direction of the story, not decoration.
- **Severity:** MEDIUM, local — but it silently corrupts every downstream graphing node if untreated, so it becomes HIGH if it survives to L08.
- **Example:** (3, 6) and (9, 4) [live item ALG-L06-p1-baseball-04]. Trap: **1/3** (correct: −1/3). *(Generator note: per-item collision check required — see §2.15 global generator rule.)*

### 2.6 `slope-as-difference` — Additive comparison *(new)*

- **Definition:** The student compares the two quantities by subtraction instead of division, believing the relationship between y's change and x's change is "how much more," not "how many times per unit" — answering Δy − Δx, or y₂ − x₂ read off a single point.
- **Cognitive root:** Additive reasoning where multiplicative reasoning is required — the canonical proportional-reasoning failure (Hart 1981; Karplus; Simon & Blume 1994). This is the slope-cluster manifestation of the existing proportion-domain tag `additive-instead-of-multiplicative`, kept as a separate ID because the observable signatures differ; the registry cross-links them as same-root.
- **Nodes:** L05 and L06; the root re-surfaces everywhere proportionality does (L07 tables, E-domain via `treats-exponential-as-steep-linear` — the extension-flavored sibling).
- **Detection signature:** two variants, both computed per item:
  - (a) answer = **Δy − Δx** (across-points additive);
  - (b) answer = **y₂ − x₂** (single-point additive).
  - *Generator constraints:* require y₁ ≠ x₁ (else variants (a) and (b) coincide and can't be logged distinctly); per-item check that neither variant equals m, Δy, or another live trap.
- **Remediation move:** Ratio-as-measure contrast case (Lobato): two staircases/ramps where the *difference* is equal but the *ratio* differs — "Ramp A rises 6 over 4; Ramp B rises 12 over 10. B rises more. Which is steeper to walk up?" Additive answer says B; the felt answer is A; the collision forces division.
- **Severity:** BLOCKER. This is the deepest prerequisite-gap signal in the cluster (7.RP). Any active hit routes to proportional-reasoning remediation below L05 — more slope practice is contraindicated.
- **Example:** (2, 4) and (6, 16). Trap (a): 12 − 4 = **8**; trap (b): 16 − 6 = **10** (correct: 3).

### 2.7 `subtracts-within-points` — Differences formed inside each pair *(new)*

- **Definition:** The student keeps the ratio structure but forms each difference *within* a point instead of *across* points, computing (y₂ − x₂)/(y₁ − x₁) — the formula executed as symbol-shuffling on whatever numbers are adjacent.
- **Cognitive root:** Notation-driven — the subscripts in m = (y₂ − y₁)/(x₂ − x₁) are parsed as "the 2-point stuff over the 1-point stuff." The student has no quantity image of Δy and Δx. Attested as a calculation-error category in Cho & Nagle (2017); frequency data thin — **partially engineering-observed**, validate in pilot.
- **Nodes:** L06 only (it requires the two-point formula); re-surfaces in L11 substitution errors.
- **Detection signature:** answer = **(y₂ − x₂)/(y₁ − x₁)**.
  - *Generator constraints:* y₁ ≠ x₁ (division by zero); per-item check against all other live traps.
- **Remediation move:** Quantity-labeling probe before any formula: "Point to the two numbers that are both *hits*. Now point to the two numbers that are both *games*. Slope only ever subtracts hits from hits and games from games." Re-representation: color-code y's and x's in the worked example.
- **Severity:** MEDIUM, local, but diagnostic gold — it certifies the student is running the formula with zero quantity meaning, which upgrades the response to the L05 interpretation check.
- **Example:** (2, 4) and (6, 16). Trap: (16 − 6)/(4 − 2) = **5** (correct: 3).

### 2.8 `slope-as-height` — Slope read as the y-value *(new)*

- **Definition:** The student reads slope off the graph (or table) as the *height* of the line at a point — "the line is at 12, so the slope is 12" — conflating the value of the function with its rate of change.
- **Cognitive root:** Slope–height confusion, one of the most replicated findings in graph-interpretation research (Leinhardt, Zaslavsky & Stein 1990; McDermott, Rosenquist & van Zee 1987; Beichner 1994 — physics students reading velocity as the height of the position graph).
- **Nodes:** L05 (primary — interpretation items); L06 graphical variants; re-surfaces hard in L08 (evaluating y vs. reading m), L10 (intercepts vs. slope), and function-behavior nodes.
- **Detection signature:** answer = **y₂** (or the y-value at the marked/queried point).
  - *Generator constraints:* y₁ ≠ 0 (else y₂ = Δy and it collides with `forgot-denominator`); y₂ ≠ m by parameter choice.
- **Remediation move:** The two-questions contrast on one graph: "Question A: how many points did she have at game 6? Question B: how fast was she scoring? Show me where on the picture each answer lives." Height is a *spot*; slope is a *tilt* — the student must physically indicate both.
- **Severity:** HIGH; prerequisite-gap flavored (F10 graph-reading foundations). Repeat hits route to a graph-reading micro-sequence, not slope drill.
- **Example:** Graph through (2, 4) and (6, 16), asked for the slope. Trap: **16** (correct: 3).

### 2.9 `slope-as-single-point-ratio` — y/x from one point *(new)*

- **Definition:** The student computes slope as y/x at a single point, believing any line's rate can be read from one snapshot — the y = kx schema overgeneralized to lines that don't pass through the origin.
- **Cognitive root:** Illusion of proportionality (De Bock, Van Dooren et al.): the 7.RP unit-rate procedure ("divide the pair") applied where a starting value b ≠ 0 breaks it. The mirror-image boundary of the existing tag `k-as-y-intercept` (that one misreads k as a start value; this one assumes there is no start value).
- **Nodes:** L05 and L06; re-surfaces in L08/L13 (writes y = (y₁/x₁)x, dropping b) and proportional-vs-nonproportional discrimination items (Axis B: this is exactly the slope/rate/proportion confusable cluster of CLAUDE.md §1).
- **Detection signature:** answer = **y₂/x₂** (variant: y₁/x₁ — compute both).
  - *Generator constraints:* **b ≠ 0 required** (if the line passes through the origin, y/x = m and the "trap" is correct — the misconception is invisible). x₁, x₂ ≠ 0.
- **Remediation move:** The head-start contrast case: "Two runners both cover 5 meters per second, but one started 20 meters ahead. At t = 4, the leader is at 40 m. Is 40/4 = 10 her speed?" Then the probe: "What does dividing by 4 assume about where she started?"
- **Severity:** HIGH; prerequisite-gap flavored, and the single most important Axis-B discriminator between proportional relationships (L01/7.RP) and linear functions with intercepts.
- **Example:** (2, 7) and (6, 19) — m = 3, b = 1. Trap: 19/6 ≈ **3.17** (or 7/2 = 3.5). Correct: 3. *(The trap can land near the correct answer — the generator must enforce a minimum separation for numeric grading tolerance; recommend |trap − m| > 2× the accepted tolerance.)*

### 2.10 `rate-not-per-unit` — Rate not normalized to unit input *(new)*

- **Definition:** The student reports a true change over a true interval — "12 hits per 4 games" — but believes that *is* the rate, never normalizing to one unit of input; slope-as-chunk instead of slope-per-one.
- **Cognitive root:** Unit-rate incompleteness (Lamon; Cramer & Post; CCSS 6.RP.A.2 → 8.EE.B.5 progression): the comparison is multiplicative (unlike §2.6) but not yet a *measure* with a standard referent of 1.
- **Nodes:** L05 (primary — this is exactly what "Δoutput per unit input" in L05's objective exists to fix); L06; re-surfaces in L08 when m must be read as "per 1."
- **Detection signature:**
  - On **unit-labeled choice items:** selects the option pairing the correct Δy with the interval ("−0.03 in average per 20 games" style).
  - On **numeric-entry items:** answer = **Δy** — numerically identical to `forgot-denominator` (§2.1). **Collision rule:** bare-numeric Δy defaults to `forgot-denominator`; the disambiguation probe is a unit-labeled choice item ("Which of these describes the rate? … per game / … per 4 games / …"). Students who pick the correct-magnitude-wrong-referent option are re-attributed here; students who can't coordinate two quantities at all stay at §2.1. The beliefs differ (never saw Δx vs. saw it but didn't normalize) and so do the remediations, which is why the entries stay separate despite the numeric collision.
- **Remediation move:** The "fair comparison" probe: "Player A: 12 hits in 4 games. Player B: 20 hits in 8 games. Who's hotter? Can you tell without making both 'per 1 game'?" Normalization becomes the tool that answers a question the student actually has.
- **Severity:** MEDIUM in L05 (it's the node's teaching target), HIGH if it survives into L06+.
- **Example:** (10, .320) → (30, .290). Trap choice: "−0.03 in batting average per game" (correct: −0.0015 per game).

### 2.11 `grid-count-ignores-scale` — Rise/run counted in squares, not units *(new)*

- **Definition:** The student counts grid squares for rise and run, believing the *picture's geometry* carries the slope, and never converts squares to axis units when the two axes have different scales.
- **Cognitive root:** Scale-blindness in graph reading (Leinhardt et al. 1990; Postelnicu 2011 — slope items with non-homogeneous axis scales are the hardest class for algebra students). The procedure (ratio of counts) is right; the measure is wrong.
- **Nodes:** L05/L06 graph variants; primary home L09; re-surfaces in any node with real-data graphs (data/statistics domain scatterplots, trend lines).
- **Detection signature:** answer = **m · (s_x/s_y)** — armed *only* on graph items where s_x ≠ s_y (when scales are equal the trap collapses onto the correct answer and this misconception is undetectable; the generator must include unequal-scale graphs deliberately, or the error survives silently to the transfer battery).
- **Remediation move:** One graph, two readings: have the student count squares, then *label the arrows with axis numbers* ("this 1 square up is worth how many points? read the axis"). The counted answer and the labeled answer disagree on the same picture; the axis wins.
- **Severity:** HIGH for representation transfer specifically — this error is invisible on equal-scale teaching graphs and then detonates in the transfer battery (dimension 2, representation change). Include ≥1 unequal-scale item in L06 practice, not just at the gate.
- **Example:** Line through gridpoints 2 squares up per 1 square right; y-axis marked 10 per square, x-axis 1 per square. Trap: **2** (correct: 20).

### 2.12 `slope-as-visual-steepness` — Steepness judged by eye, without scales *(new)*

- **Definition:** The student believes slope *is* the visual steepness/angle of the drawn line, so two lines can be compared (or a slope estimated) by eye without consulting axis scales at all.
- **Cognitive root:** Steepness/angle conception of slope (Stump 1999, 2001 — the dominant intuitive conception; Postelnicu). Distinct from §2.11: the grid-counter *runs a ratio procedure* on the wrong measure; the steepness-judger runs *no measurement at all*. The "slope-as-angle" candidate entry is **merged into this one** — at the middle-school level (no trigonometry) no observable separates "judges by angle" from "judges by visual steepness."
- **Nodes:** L05 (rate-comparison items, 8.EE.B.5 "compare two proportional relationships represented differently"); re-surfaces in L08/L09 and the transfer battery.
- **Detection signature:** choice/comparison items only — the keyed distractor is the **visually-steeper-but-numerically-smaller-slope graph** (engineered by scale mismatch between two panels). Deterministic because the item is *constructed* so that exactly this belief selects that panel.
  - *Collision/disambiguation vs. §2.11:* after a hit here, serve a single-graph unequal-scale numeric item. Answer = m·s_x/s_y → the student measures-but-ignores-scale, re-attribute to `grid-count-ignores-scale`; answer bears no relation to counts → confirm here.
- **Remediation move:** The zoom contrast: the *same line* rendered on two different y-axis scales, side by side. "Same team, same season, same rate. Which graph is steeper? Did the team change?" Steepness is a property of the picture; slope is a property of the relationship.
- **Severity:** MEDIUM as a local error, HIGH as a conceptual ceiling — Stump's work suggests it persists into adulthood when never confronted. It is also precisely what transfer dimension 2 exposes.
- **Example:** Panel A: slope 2, y-axis 1-per-square (looks steep). Panel B: slope 5, y-axis 10-per-square (looks shallow). "Which shows the faster rate?" Trap choice: **Panel A**.

### 2.13 `zero-undefined-slope-swap` — Horizontal/vertical confusion *(new)*

- **Definition:** The student swaps the two degenerate cases — answering 0 for a vertical line and "undefined" for a horizontal line — because both labels were memorized as arbitrary facts unattached to the ratio (0/Δx vs. Δy/0).
- **Cognitive root:** Label-memorization without ratio meaning; notation-driven. **Engineering-observed / practitioner-attested** (ubiquitous in textbook error lists; thin dedicated research literature — mark for pilot validation; Stump notes vertical-line difficulty in passing).
- **Nodes:** L06 (two-point special cases); re-surfaces in L09/L12 (equations x = a, y = b) and domain/range work.
- **Detection signature:** on items with x₁ = x₂ (vertical): answer = **0**; on items with y₁ = y₂ (horizontal): answer = **"undefined"** (or the keyed choice). Special-case items are authored deliberately; the traps are exact.
- **Remediation move:** Run the formula, don't recite the rule: "(4, 1) and (4, 9): compute the run. You got 0. Now try to divide 8 by 0 on your calculator. What happens?" The label "undefined" becomes the *result of an impossible division*, not vocabulary. Pair with the walking metaphor: a horizontal walk climbs 0 (a real number, a real answer); a vertical wall has no "per step right" at all.
- **Severity:** LOW-MEDIUM, local; cheap to fix, but it must be fixed in L06 because L12 items assume it.
- **Example:** (4, 1) and (4, 9). Trap: **0** (correct: undefined).

### 2.14 `assumes-constant-rate-nonlinear` — Two-point slope applied to a curve *(new)*

- **Definition:** The student computes a two-point slope on a nonlinear relation and treats it as *the* rate everywhere — believing any relationship has one rate, so two points always suffice to know all of it.
- **Cognitive root:** Illusion of linearity (De Bock, Van Dooren et al.); rate-constancy overgeneralization (Bezuidenhout 1998 on average vs. instantaneous rate). Sibling of the existing E-domain tag `treats-exponential-as-steep-linear` — that tag is the *extension* flavor (grows a pattern additively); this is the *measurement* flavor (measures a curve as if straight). Boundary: exponential-context items key the existing tag; measurement items on any nonlinear data key this one.
- **Nodes:** **L05 (primary and mandatory home)** — F-IF.B.6 lives on L05 with no downstream average-rate node in the current graph, so "is the rate even constant?" checks must be authored here; re-surfaces in L07 (constant-differences test on tables) and quadratics-domain rate items.
- **Detection signature:** two deterministic forms:
  - (a) On a table with nonconstant first differences, prediction item: answer = **y₁ + m₁·(x − x₁)** where m₁ is the first-interval rate (linear extrapolation of a curve);
  - (b) Constancy-check choice item ("Is this a constant rate?" with the table shown): keyed choice = **"yes"** computed from endpoints only.
- **Remediation move:** The middle-point betrayal: give three points of a curve, have the student compute the two endpoint slopes P₁→P₂ and P₂→P₃. "You said the rate is 3. Your own numbers just said 3 and then 7. Can one line do that?" The student's own computation is the counterexample.
- **Severity:** HIGH as a forward-looking conceptual guard; LOW frequency inside L05/L06 (most items are honestly linear) but it *defines* the boundary of the concept, and Axis-B discrimination (CLAUDE.md §1) demands the confusable case be present. At least 2 nonlinear-table discrimination items belong in L05's practice set.
- **Example:** Table (1, 2), (2, 5), (3, 10), (4, 17). "Constant rate?" Trap: **"Yes, 5 per step"** using (1,2)→(4,17) endpoints (correct: no — differences 3, 5, 7).

### 2.15 Merged and rejected candidates (the no-padding record)

- **Full label reversal** (y₁−y₂)/(x₁−x₂): *rejected* — mathematically correct; point labeling is arbitrary. Grading and hints must never penalize it (the live L06 worked example already teaches this correctly).
- **Slope-as-angle:** *merged* into `slope-as-visual-steepness` (§2.12) — no pre-trigonometry observable separates them.
- **Other coordinate permutations** (e.g., (y₂−x₁)/(x₂−y₁)): *rejected as entries* — no stable documented belief; they don't replicate within-student. They log as `misconception_tag: null` and feed the taxonomy-growth audit loop (AI_ADAPTIVE §5, CLAUDE.md §8) rather than getting speculative IDs.
- **`additive-instead-of-multiplicative` reuse for slope:** *not reused directly* — kept as the proportion-domain root tag, with `slope-as-difference` as the slope-cluster manifestation, because the detection signatures and routing targets differ. Registry cross-link, not merge.
- **Averaging the coordinates** ((y₁+y₂)/(x₁+x₂)): *rejected* — occasionally observed, no attested belief structure; null-tag and monitor.

### Consolidated collision matrix

| Trap value | Entries colliding | Condition | Disambiguation |
|---|---|---|---|
| −m / \|m\| | 2.2 vs 2.5 | m < 0 | positive-slope follow-up item |
| 1/m | 2.3 vs `reverses-x-and-y` | bare coordinate pairs | named-quantity item or plot probe |
| Δy | 2.1 vs 2.10 | numeric entry | unit-labeled choice probe |
| Δy = y₂ | 2.1 vs 2.8 | y₁ = 0 | generator constraint y₁ ≠ 0 |
| y/x = m | 2.9 vs correct | b = 0 | generator constraint b ≠ 0 |
| m·s_x/s_y = m | 2.11 vs correct | s_x = s_y | author unequal-scale items deliberately |
| \|m\| on graph | 2.4 vs 2.5 | read-a-graph numeric | task type: construct item decides |
| −1/m | 2.3 + 2.2 compound vs `negative-reciprocal-error` | any | in L05/L06 tag as compound (2.3 primary, probe queued); `negative-reciprocal-error` is reserved for the perpendicular-slopes context where it is the primary belief |

**Global generator rule:** at render time, compute every applicable signature; if any trap equals the correct answer, equals another trap (outside the documented pairs above), or falls within grading tolerance of either, re-parameterize the item. Trap values and their entry IDs are written into the item's `misconceptionMap` exactly as the live format already does — this taxonomy is backward-compatible with every existing `misconceptionMap` key.

---

## 3. Keying contract (the pattern the other 73 nodes copy)

### 3.1 Hint ladder — three rungs, entry-conditional

Every item carries, per taxonomy entry it traps, a three-hint ladder rendered from cached templates with the item's parameters slotted in (no LLM on this path — AI_ADAPTIVE §9). After a wrong answer matching entry E's signature:

- **Hint 1 — root probe.** A question aimed at E's cognitive root. Never names the procedure, never mentions the formula. It makes the student's belief visible to the student. *(forgot-denominator: "You found how much the hits changed. A rate compares two changes — what else was changing?")*
- **Hint 2 — targeted counter.** E's remediation move, miniaturized onto this item's numbers (the contrast case, re-representation, or probe from the entry). *(forgot-denominator: "12 more hits in 4 games. Another player got 12 more hits in 12 games. Same rate? What do you have to do with the 4?")*
- **Hint 3 — worked micro-step.** Perform exactly the first correct step on this item's numbers and stop. Never the final answer. *(forgot-denominator: "Δhits = 12 and Δgames = 4. Slope = Δhits ÷ Δgames. You finish it.")*

Untagged wrong answers get the node's generic ladder (restate the goal → anchor the structure → first micro-step) and log `misconception_tag: null` for taxonomy growth. Wrong answers matching a *collision pair* get the shared Hint 1 (the pairs above always share a root-adjacent probe), and the disambiguation probe is queued as the next scheduled item. All hint text: middle-school register, ≤2 sentences per rung, second person.

### 3.2 Error-analysis items

An error-analysis item for entry E must **instantiate E's detection signature as work**, not just as an answer:

1. The fictional student's shown work reproduces E's algebraic form step by step (for §2.7: the written fraction literally shows (16 − 6)/(4 − 2)).
2. The shown final answer *equals the computed trap value* for the item's parameters.
3. Two questions, both required: (a) *locate* — "which step breaks?" (keyed to the step where E's belief acts); (b) *diagnose* — "what did this student think was true?" with choices drawn from taxonomy entry definitions rewritten in student language. Distractor beliefs must be other taxonomy entries **whose signatures do not match the shown work** — so the correct diagnosis is unique and deterministically gradable.
4. The item's metadata carries `errorAnalysisOf: <entry-id>` so evidence flows to the same skill-model tag as a direct trap hit.

### 3.3 Self-explanation rubrics (CLAUDE.md §10)

Each rubric element is a required semantic element **annotated with the entry IDs it counters**. For ALG-L06's core explanation ("explain how you find slope from two points and why it works"):

| # | Required element | Counters |
|---|---|---|
| 1 | Names the two quantities being compared (change in y, change in x) | `slope-as-difference`, `subtracts-within-points` |
| 2 | States the comparison is a division/ratio, not a difference | `slope-as-difference`, `forgot-denominator` |
| 3 | States the result means "output change per ONE unit of input" | `rate-not-per-unit`, `inverted-ratio` |
| 4 | States both subtractions must run in the same direction, and why (flipping one flips the sign) | `inconsistent-subtraction-order` |
| 5 | States what the sign of the answer tells you about the line | `drops-negative-slope-sign`, `rise-run-direction-error` |

A missing element is *advisory* evidence: it raises the skill model's prior on the countered tags (feeding routing and hint pre-selection) but **never sets a tag active by itself** — active status still requires a signature hit or failed probe. Rubric scoring is against these elements, logged per element for audit; sampled for human review per §10.

### 3.4 Evidence and routing semantics (deterministic, explainable)

- 1 signature hit = weak evidence (logged); **2 hits, or 1 hit + failed disambiguation probe = tag active.**
- Active tag with severity BLOCKER → route backward (to the entry's stated prerequisite surface: L05, or 7.RP review below it), with the plain-language reason: *"You're comparing by subtracting. Slope compares by dividing — we're going back to build that."*
- Active tag with severity HIGH/MEDIUM → targeted micro-set inside the node: the entry's error-analysis item + 2 items whose parameters make the trap maximally distinct from the correct answer.
- Every trap value, tag, probe result, and route is written to the attempt log — the mastery decision remains fully reconstructable (accreditation evidence trail; `attempts.misconception_tag` in the CLAUDE.md §17 schema).
- Clearing a tag requires the same standard as everything else: correct performance on neutral P3 items whose parameters still carry the trap (the student had the chance to fall in and didn't). Sport-context recovery alone never clears a tag.

---

## 4. Registry diff (mechanically applicable to `misconceptionRegistry` in `data/algebra1-graph.json`)

**REDEFINE (4) — same IDs, replacement `description` text; all existing `misconceptionMap` usages remain valid:**

1. `forgot-denominator` → "Believes slope/rate is the amount the output changed (Δy alone), never coordinating the change in input; answers y₂ − y₁ where a ratio is required."
2. `inconsistent-subtraction-order` → "Treats the subtraction order in the slope formula's numerator and denominator as independent choices, computing (y₂ − y₁)/(x₁ − x₂) and producing −m; consistent full reversal is correct and is not this error."
3. `inverted-ratio` → "Believes the rate compares input per output, computing Δx/Δy (1/m) — often anchored by word order, e.g. 'games per hit' instead of 'hits per game.'"
4. `rise-run-direction-error` → "When constructing or stepping along a line, moves rise/run in the direction contradicting the slope's sign (rise always 'up'), placing (x+run, y+|rise|) for a negative slope."

**ADD (10):**

5. `drops-negative-slope-sign` — "Computes correct rise and run magnitudes but reports slope unsigned, treating the sign as bookkeeping rather than the direction of change; answers |m| on negative-slope items."
6. `slope-as-difference` — "Compares the change in output to the change in input by subtraction instead of division (answers Δy − Δx, or y₂ − x₂ from one point), applying additive reasoning where a ratio is required."
7. `subtracts-within-points` — "Forms the slope fraction from differences within each ordered pair instead of across pairs, computing (y₂ − x₂)/(y₁ − x₁)."
8. `slope-as-height` — "Reads slope as the height/y-value of the graph at a point, conflating the value of the function with its rate of change."
9. `slope-as-single-point-ratio` — "Computes slope as y/x from a single point, overgeneralizing proportional reasoning to lines that do not pass through the origin."
10. `rate-not-per-unit` — "Reports a true change over a multi-unit interval as the rate (e.g., '12 hits per 4 games') without normalizing to one unit of input."
11. `grid-count-ignores-scale` — "Counts grid squares for rise and run without converting to axis units, answering m·(x-scale/y-scale) on graphs whose axes use different scales."
12. `slope-as-visual-steepness` — "Judges slope by the drawn line's visual steepness or angle without consulting axis scales, so rescaled versions of the same relationship appear to have different slopes."
13. `zero-undefined-slope-swap` — "Swaps the degenerate cases, calling a vertical line's slope 0 and a horizontal line's slope undefined, because the labels were memorized unattached to the ratio Δy/Δx."
14. `assumes-constant-rate-nonlinear` — "Computes a two-point slope on a nonlinear relation and treats it as the constant rate everywhere, extrapolating a curve linearly from one interval."

**NO CHANGE, boundary-note only (recorded here, not in the registry):** `reverses-x-and-y` (1/m collision rule, §2.3), `swaps-m-and-b` (L08 equation-reading boundary; never tag it on two-point computation items), `negative-reciprocal-error` (reserved for perpendicular-slope contexts; −1/m in L05/L06 tags as compound per the collision matrix), `k-as-y-intercept` (mirror boundary of `slope-as-single-point-ratio`), `treats-exponential-as-steep-linear` (extension flavor; measurement flavor is `assumes-constant-rate-nonlinear`), `additive-instead-of-multiplicative` (proportion-domain root of `slope-as-difference`; cross-link, not merge), `mismatched-units-in-ratio` (proportion setup; `inverted-ratio` owns the slope cluster).

**RE-KEY (1 content fix):** live item ALG-L05-p1-baseball-04 — the distractor "−0.03 in batting average per game" should map to `rate-not-per-unit` (currently unmapped; only the inverted-ratio distractor is keyed).

**NARROWED (0):** no existing ID's scope shrinks; all four refinements are compatible with every current `misconceptionMap` usage inspected.

---

## 5. Verdict

**APPROVE** (mr-kahn) — ALG-L06 with L05 as its taught prereq surface is the right gold node: slope is the best-researched misconception space in the middle-grades literature, its errors have clean closed-form detection signatures (the ideal case for the deterministic-first contract every other node must meet), and the L05→L06 pair exercises the full pattern — prerequisite-gap routing, collision disambiguation, graphical and numeric task types, and Axis-B discrimination against the proportionality cluster — in one place.
