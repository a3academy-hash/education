# CONFUSABLE_CLUSTERS — the cross-node confusable-cluster map

**Version:** 1.0.0 *(the TAXONOMY_REGEN_SPEC Appendix-A pin — F-DEP checks this value; every change to this document bumps it, §5)*
**Status:** DRAFT — pending mr-kahn APPROVE (TAXONOMY_REGEN_SPEC §11 **gate 2**). Not an input to any batch until approved.
**Charter:** TAXONOMY_REGEN_SPEC §0 — *"One document, derived from graph edges + Axis-B interleaving rules, mapping each node's confusable neighbors (the concept it is most mistakable for, and why)."* GAP_NOTES §2.1 names this map the de-risk for the ≥2-boundary floor (TAXONOMY_TEMPLATE §4.5 row 3). It feeds the draft pass's boundary-entry search (§1.3 step 1) and the judgment pass's collision-matrix and probe authorship (§1.3 step 3, §4.3).
**Machine-readable mirror:** `docs/specs/confusable-clusters.json` (same version; the two files change together).
**Registry basis:** 163 entries at graph `1.12.0` (the batch-1 pin). Node spans from `.authoring-tmp/tag-node-spans.json`; gold-stated re-surface homes cited where node-tag assignment is still pending.

---

## 1. Honest model-split declaration

This map is the declared hybrid's JUDGMENT layer sitting on mechanical inputs. Who produced what:

| Layer | Producer | Scope | Standing |
|---|---|---|---|
| **1 — pairwise signature comparison** | **Deterministic Python harness** (`.authoring-tmp/confusable_pairwise.py`), K = 30 stratified parameter samples, grading-tolerance-separated | The 14 gold slope entries + the 2 gold-matrix boundary tags with stated numeric forms (`reverses-x-and-y`, `negative-reciprocal-error`) = 12 numeric forms pairwise-compared; 4 non-numeric forms excluded from numeric comparison. Output: `.authoring-tmp/machine-collisions.json` | **Verified** (deterministic; re-runnable) |
| **1b — error-form classification** | `claude-opus-4-8` (the pipeline's draft tier) | The other 149 registry entries: errorForm, parameterFamily, provisionalPairs. Output: `.authoring-tmp/error-form-classification.json` | **PROVISIONAL** — no per-node taxonomy signatures exist yet for these entries; every classification is re-verified mechanically as signatures land (§5) |
| **2–4 — clusters, probe contracts, pilot pre-sketch** | `claude-fable-5` (the pipeline's judgment tier) | Everything below: grouping, regrouping/rejection of layer-1b pairs, shared-surface analysis, probe contracts, pilot obligations | **Judgment** — gated by mr-kahn (gate 2); provisional members are flagged per entry |
| Maintenance re-verification | Harness + judgment, per gated batch | §5 | — |

**Standing semantics (used throughout — three values, kahn gate-2 change 1):**
- **verified** — the membership's coincidence is harness-computed (numeric or construct-state comparison). Today: the 12 numeric gold forms.
- **gold-matrix-verified** — the membership rests on kahn-approved gold-matrix documentation, not harness comparison, because the signature form is non-numeric (keyed-choice, perceptual, categorical). Today: `rise-run-direction-error`, `slope-as-visual-steepness`, `assumes-constant-rate-nonlinear` (and `zero-undefined-slope-swap`, a singleton). These are NOT provisional — the gold matrix is their evidence — but they are not harness-promotable either (§5.4).
- **provisional** — asserted by the judgment layer over layer-1b classification; no signature exists yet. **Every provisional membership is re-verified mechanically when its home node's taxonomy lands computable signatures** (the harness re-runs the pairwise pass over the grown signature set, §5); promotion happens then, never by assertion.

**Structural vs sporadic (the layer-1 reading rule).** The machine output contains three distinct things, and only the first defines clusters:
- **STRUCTURAL collisions** — the coincidence has an expressible realizing condition (`ALWAYS`, `m<0`, `y₁=0`, `s_x=s_y`, `|m|=1`, `y₁=x₁`, `|Δx|=1`). These are cluster-defining or constraint-defining (below).
- **Sporadic coincidences** — 1–2/30 samples with no clean condition. These are **item-level arming-constraint duties** (the gold global generator rule: re-parameterize when any trap collides at render time), NOT confusability. They are listed in §2.4 and impose no probe.
- **Key collisions (trap = m)** — arming territory: the trap equals the correct answer under some parameters (e.g. `|m| = m` when m > 0 on 15/30 samples; `m·s_x/s_y = m` when s_x = s_y on 12/30). These become **arming conditions** carried in cluster rows, not collisions between beliefs.

**Cluster admission (the no-padding rule applied to clusters):** a cluster exists only where (a) a structural machine collision links its members, or (b) an endorsed layer-1b pairing shows the same wrong answer / indistinguishable behavior under a statable condition, or (c) the same belief demonstrably re-surfaces under multiple registry IDs across nodes (a pooling/merge duty). Singletons stay unlisted — **95 of 163 entries are unclustered**, and that is the honest state, not a gap.

**Two cluster types**, because they impose different duties:
- **Type A — confusable-distinct:** different beliefs producing the same observable under a condition. Duty: collision-matrix rows + a disambiguation probe contract in every touching node's taxonomy.
- **Type B — same-root re-surface:** one belief carried by multiple registry IDs at multiple nodes. Duty: the touching taxonomies must either propose a registry cross-link/merge or document the observable that genuinely separates the IDs; until then evidence pools as **advisory** cross-link only (never cross-node tag activation). This matters at runtime because Axis-B interleaving (new_plan/CLAUDE.md §6) deliberately serves confusable-cluster nodes in the same session — the same wrong behavior can appear against two nodes' items minutes apart.

---

## 2. Cluster inventory

### 2.1 Type A — confusable-distinct clusters

#### CC-01 `sign-family` — wrong-signed slope, three beliefs, one number
- **Confidence:** VERIFIED (machine layer; gold §2.2/§2.5/§2.4 matrix rows) — one provisional extension.
- **Members:** `inconsistent-subtraction-order`, `drops-negative-slope-sign`, `rise-run-direction-error`; *provisional:* `sign-error-on-point` (ALG-L11).
- **Shared surface:** the answer **|m| ≡ −m when m < 0** (machine: 15/30 samples — the largest structural collision in the run). On read-a-graph numeric items `rise-run-direction-error` also lands on |m|. `sign-error-on-point` joins provisionally: a sign slip on a negative coordinate in point-slope work surfaces as the same sign-flipped output, and gold names L11 the §2.2 re-surface site.
- **Arming condition:** m < 0 (when m > 0, |m| = m — key collision, trap dead; 15/30 machine key-collision rate confirms).
- **Node span:** ALG-L06 (primary), ALG-L09 (`rise-run-direction-error` home), ALG-L11 (re-surface + provisional member); gold re-surfaces at L05/L08. **Cross-node.**
- **Probe contract:** the probe must **vary the sign regime** — schedule a positive-slope item immediately after a −m/|m| hit. Inconsistent-order students answer −|m| (a negative slope for a visibly increasing relation — decisive); sign-droppers answer correctly. The construct-vs-numeric **task-type split** separates `rise-run-direction-error`: construct items (place the next point) key it directly; numeric read-a-graph items queue a construct probe. **Default while unresolved: log-both-tag-neither** (inherited, gold §2.2).

#### CC-02 `ratio-inversion-family` — 1/m and transposed pairs
- **Confidence:** VERIFIED core (machine: `inverted-ratio ~ reverses-x-and-y` = **ALWAYS**, rate 1.0) — three provisional extensions.
- **Members:** `inverted-ratio`, `reverses-x-and-y`, `negative-reciprocal-error` (gold-ruled compound boundary: −1/m in L05/L06 tags as compound 2.3+2.2 with probe queued; the tag itself is reserved for L14 perpendicular contexts); *provisional:* `plots-table-pairs-reversed` (L07), `ratio-order-flipped` (F10), `mismatched-units-in-ratio` (E07).
- **Shared surface:** the answer **Δx/Δy = 1/m** — identical for rate inversion (a belief about which quantity is the referent) and coordinate transposition (a convention error) on bare-coordinate-pair items, ALWAYS. The provisional members are the word-order-driven inversions upstream (ratio setup, proportion setup) and the plotting-form transposition (tables), which produce the same inverted comparison in their own parameter families. **Internal strand note (kahn gate-2 change 8):** `plots-table-pairs-reversed` (L07) vs `reverses-x-and-y` (L01) is a **same-belief Type-B strand inside this Type-A cluster** — L07's duty is pooling/merge-or-separate against L01's tag, NOT a disambiguation probe against its own sibling (there is nothing to separate).
- **Arming condition:** |m| ≠ 1 (else 1/m = ±m: dead or collides into CC-01 — the machine's 1/30 `inverted-ratio ~ drops-negative-slope-sign` coincidence realizes exactly at |m| = 1).
- **Node span:** ALG-F10 → E07 → L01 → L05 → L07 (→ L14 for the reserved compound). **Cross-node — this chain is the proportionality cluster Axis-B exists for.**
- **Probe contract:** the probe must **vary the presentation class** (gold §2.3): on named-quantity prose items, coordinate transposition has no purchase → tag `inverted-ratio` outright; on bare-pair items, **default-tag `inverted-ratio` and queue a plot probe** ("plot (3, 7)") — failure re-attributes to `reverses-x-and-y`. A verbalized-units follow-up ("your answer says ⟨1/m⟩ what per what?") separates word-order-driven members. Provisional members' contract: their nodes' taxonomies must land signatures showing the inverted value is the same computable form before promotion.

#### CC-03 `normalization-family` — Δy with the denominator never consulted vs never normalized
- **Confidence:** VERIFIED (machine: `forgot-denominator ~ rate-not-per-unit` = **ALWAYS**, rate 1.0 — the identity collision).
- **Members:** `forgot-denominator`, `rate-not-per-unit`.
- **Shared surface:** the numeric answer **Δy** — identical always on bare numeric entry. The beliefs differ (never coordinated two quantities vs coordinated but never normalized to per-1), and so do the remediations, which is why the entries stay separate despite the identity (gold §2.1/§2.10).
- **Arming condition:** |Δx| ≠ 1 (else Δy = m — key collision; the machine's 1/30 `forgot-denominator` key hit realizes there); y₁ ≠ 0 on items also carrying `slope-as-height` (else Δy = y₂ — the machine's 1/30 cross into CC-04, excluded by the gold generator constraint).
- **Node span:** ALG-L05, L06, **L19** (both tags live on L19's stub — the only cluster fully re-instantiated on the new node). **Cross-node.**
- **Probe contract:** the probe must **vary unit labeling** (the gold pattern): a unit-labeled choice item ("… per game" / "… per 4 games"). Correct-magnitude-wrong-referent choice re-attributes to `rate-not-per-unit`; failure to coordinate two quantities at all stays `forgot-denominator`. **Default: bare-numeric Δy default-tags `forgot-denominator` and queues the unit-labeled probe** (gold default-tag rule — this cluster's default is asymmetric, not log-both).

#### CC-04 `value-for-rate-family` — the function's value read as its rate
- **Confidence:** VERIFIED core (gold §2.8/§2.9; machine 2/30 conditional) — one provisional boundary member.
- **Members:** `slope-as-height`, `slope-as-single-point-ratio`; *provisional:* `k-as-y-intercept` (L18 — gold-named mirror boundary: one belief assumes no start value exists, the other misreads the rate constant as the start value).
- **Shared surface:** a **single-snapshot answer where a two-point comparison is required** — y at the queried point (height) or y/x at one point (proportional overgeneralization). Machine collision `slope-as-height ~ slope-as-single-point-ratio` realizes at **x = 1** (y/x = y; 2/30) — condition-expressible, excluded by constraint.
- **Arming conditions:** b ≠ 0 (else y/x = m and `slope-as-single-point-ratio` is invisible — gold's most important arming rule); queried x ≠ 1 (the internal collision above); y₁ ≠ 0 against CC-03 (gold constraint).
- **Node span:** ALG-L05/L06 (gold homes; node-tag assignment pending), **L19** (`slope-as-single-point-ratio` live; DECISION_F-IF-B6 §4's unapproved candidate *"reads average rate as f(b)"* is this cluster's function-notation face), L18 (boundary). Gold re-surfaces: L08, L10, L13. **Cross-node.**
- **Probe contract:** the probe must **vary what is queried on one display** — the two-questions contrast ("what is the value at x=6?" vs "how fast is it changing?") with the student indicating where each answer lives. Response y-at-point → `slope-as-height`; response y/x → `slope-as-single-point-ratio`; treating the direct-variation constant as a start value → boundary re-attribution toward `k-as-y-intercept` (its L18 taxonomy must land a signature first). Default: log-both-tag-neither.

#### CC-05 `scale-perception-family` — the picture's geometry trusted over the axes
- **Confidence:** VERIFIED core (gold §2.11/§2.12 + machine key-collision structure) — one provisional extension.
- **Members:** `grid-count-ignores-scale`, `slope-as-visual-steepness`; *provisional:* `reads-intersection-imprecisely` (S01 — visual-perceptual graph misread; joins only if its S01 signature turns out to be a scale-driven off-by-s_x/s_y form rather than free-form imprecision).
- **Shared surface:** on graph displays, an answer derived from **counted squares / visual appearance instead of axis units**. `grid-count` answers m·(s_x/s_y); `visual-steepness` selects the visually-steeper-but-numerically-smaller panel. Indistinguishable on equal-scale graphs — where **both are invisible** (key collision: m·s_x/s_y = m on 12/30 samples, exactly the s_x = s_y draws).
- **Arming condition:** s_x ≠ s_y — and this cluster carries the gold **silent-survival warning**: unequal-scale items must be authored deliberately in practice sets, or the error survives undetected to the transfer battery. The machine's `drops-negative-slope-sign ~ grid-count-ignores-scale` 7/30 coincidence realizes only where **both traps are disarmed** (m > 0 ∧ s_x = s_y) — handled entirely by arming constraints, no probe duty.
- **Node span:** ALG-L09 (gold-named primary home), L05/L06 graph variants, S01 (provisional), data-domain scatterplot nodes (gold re-surface note). **Cross-node.**
- **Probe contract:** the probe must **vary the axis-scale regime**: after a steepness-comparison hit, serve a single-graph unequal-scale numeric item. Answer = m·s_x/s_y → measures-but-ignores-scale, re-attribute `grid-count-ignores-scale`; answer unrelated to counts → confirm `slope-as-visual-steepness` (gold §2.12 ladder). Default: log-both-tag-neither.

#### CC-06 `linearity-illusion-family` — one rate assumed everywhere
- **Confidence:** gold-documented boundary (kahn-approved cross-link, gold §2.14); mechanically provisional (keyed-choice signatures were outside the numeric pairwise run).
- **Members:** `assumes-constant-rate-nonlinear` (measurement flavor), *provisional:* `treats-exponential-as-steep-linear` (extension flavor; **dual-membership with CC-09**, noted there).
- **Shared surface:** on nonlinear data, a **two-point/endpoint-derived constant rate applied everywhere** — linear extrapolation of a curve, "yes, constant" verdicts from endpoints. The gold boundary rule: exponential-context items key the existing P04 tag; measurement items on any nonlinear data key `assumes-constant-rate-nonlinear`.
- **Node span:** **ALG-L19** (primary home post-1.12.0 re-home), L05 (retains ≥2 discrimination items as the Axis-B boundary guard), P04. **Cross-node — this is the linear/exponential Axis-B boundary itself.**
- **Probe contract:** the probe must **vary the interval** — the gold middle-point betrayal (compute P₁→P₂ and P₂→P₃ rates on the student's own numbers). Consistent endpoint-only reasoning on presented-nonlinear data → `assumes-constant-rate-nonlinear`; additive extension of an exponential pattern → P04's tag. What real signatures must establish first: L19's taxonomy (pilot) executes the gold §2.14 revision and lands the keyed-choice/prediction signatures; only then does the harness pairwise pass cover this cluster.

#### CC-07 `additive-for-multiplicative-family` — comparing by subtraction where a ratio is required
- **Type: A/B HYBRID (kahn gate-2 change 3 — the CC-11 precedent).** Per-member-pair duty types: `slope-as-difference` vs the others = **Type B** (gold's own ruling: same-root cross-link, not confusable-distinct — these pairs are never co-live on one item, so no disambiguation rows are owed by F10/E08/P04); the ramp-contrast probe below is **root-confirmation machinery**, not pair disambiguation. BLOCKER routing preserved.
- **Confidence:** mixed — `slope-as-difference` VERIFIED (gold signature); the rest provisional (endorsed layer-1b group + gold cross-link).
- **Members:** `slope-as-difference` (slope-cluster manifestation), *provisional:* `additive-instead-of-multiplicative` (F10 — gold-named proportion-domain root tag, cross-link not merge), `treats-exponential-as-steep-linear` (P04, dual with CC-06), `adds-percents-directly` (E08 — additive composition of multiplicative operators).
- **Shared surface:** an **additive answer where a multiplicative one is required** — Δy − Δx, next-table-value = last + constant, combined percent = p₁ + p₂. On table-extension items the additive prediction is the same wrong number whichever tag is live.
- **Node span:** ALG-F10 → E08 → L05/L06 (gold homes) → **L19** (`slope-as-difference` live) → P04. **Cross-node — the canonical proportional-reasoning failure chain; BLOCKER-severity territory (gold routes it below L05).**
- **Probe contract:** the probe must **vary the representation and the gap size** — serve an item where additive and multiplicative predictions diverge widely (gold ramp contrast: equal differences, unequal ratios), plus a ratio-labeled choice. Consistent additive behavior across representations raises the root tag; slope-context Δy − Δx keys `slope-as-difference` directly. Default: node-local tag + **advisory** pooling to the root tag (this cluster feeds routing priors, never cross-node activation).

#### CC-08 `exponent-rule-swap` — add/multiply exponent rules interchanged
- **Confidence:** provisional (layer-1b endorsed; conditions symbolically derivable but no harness run yet).
- **Members (all provisional):** `adds-exponents-on-power`, `multiplies-exponents-on-product` (P01 mutual swap); `multiplies-base-by-exponent`, `squares-as-double` (F04).
- **Shared surface (kahn gate-2 change 4 — the cross-node claim stated explicitly):** the two documented coincidences are each **within-node** 2-member pairs and are owed as §2.3-class matrix rows in their own nodes: (1) P01: the two tags are each other's mirror — plausibly **one belief** (the two rules memorized swapped), manifesting as different tags by item type. (2) F04: on **exponent = 2**, `multiplies-base-by-exponent` (b·n) and `squares-as-double` (2b) produce the identical value 2b — **ALWAYS on squares** (condition-expressible). What makes CC-08 a CLUSTER is the **Type-B cross-node linking hypothesis: F04's multiply-the-base belief re-surfacing as P01's swapped-rule pair** — P01's taxonomy must confirm or refute it (cross-link/merge proposal or the separating observable), the standard Type-B duty.
- **Node span:** ALG-F04 → P01 (the foundations→exponent-rules Axis-B boundary). **Cross-node.**
- **Probe contract:** P01: serve a **product item and a power item with matched base/exponents**; the swap pattern on both → single swapped-rule belief (P01's taxonomy must then propose merge or the separating observable); error on only one form → separate beliefs. F04: **vary the exponent off 2** (b³: 3b vs unarmed) — the separator is any non-square power. Default: log-both-tag-neither on exponent-2 items.

#### CC-09 `degenerate-outcome-family` — 0 = 0 and 0 = k read as the wrong verdict
- **Confidence:** provisional (layer-1b endorsed; strong structural story).
- **Members (all provisional):** `identity-means-zero`, `contradiction-read-as-solution`, `vanishing-variable-as-no-solution` (E14); `parallel-as-one-solution`, `zero-equals-zero-as-no-solution` (S04).
- **Shared surface:** a **wrong solution-count verdict on a degenerate simplification outcome**. Internal structure: the S04 pair are the E14 beliefs re-surfacing in systems form — `zero-equals-zero-as-no-solution` is `vanishing-variable-as-no-solution` on an equation pair; `parallel-as-one-solution` is the contradiction-case mirror. Three distinct beliefs, two of which carry cross-node twins.
- **Realizing condition:** items whose simplification lands on 0 = 0 or 0 = k — degenerate-case items are authored deliberately (gold §2.13 pattern), so every collision here is author-controlled.
- **Node span:** ALG-E14 → S04. **Cross-node.**
- **Probe contract:** the probe must **vary the degenerate type and the representation** — serve the *other* degenerate case (0 = 0 after a 0 = k hit, and vice versa) and a graphed parallel/coincident-lines version. The verdict pattern across the pair of cases identifies which belief (a student who calls both "no solution" holds the vanishing-variable belief; one who splits verdicts holds a case-specific belief). Symbolic-vs-system split governs pooling between the E14 tags and their S04 twins. Default: log-both-tag-neither within a node; advisory pooling across E14/S04.

#### CC-10 `order-of-operations` — precedence beliefs colliding on the same expression
- **Confidence:** provisional (layer-1b endorsed; within-node).
- **Members (all provisional):** `add-before-multiply`, `left-to-right-always`, `ignores-grouping` (all ALG-F03).
- **Shared surface:** on `a + b × c`-shaped items, `add-before-multiply` and `left-to-right-always` produce the identical value (a+b)·c (Opus example: 3 + 4 × 2 → 14 both ways).
- **Node span:** ALG-F03 only — included as a cluster (not a mere within-node pair) because it has 3 members and a clean separator; the map's within-node rule (§2.3) applies to 2-member pairs.
- **Probe contract:** the probe must **vary operator order**: on `a × b + c` (multiplication first), `left-to-right-always` is coincidentally correct while `add-before-multiply` still errs (b + c grouped) — decisive. `ignores-grouping` arms only in the presence of parentheses; grouping-free items keep it silent by construction. Default: log-both-tag-neither.

#### CC-11 `intercept-role-swap` — the intercept lives on the wrong axis
- **Confidence:** provisional (judgment grouping over layer-1b referent entries).
- **Members (all provisional):** `intercept-as-x-value` (L08), `plots-b-on-x-axis` (L09), `sets-wrong-variable-to-zero` (L10).
- **Shared surface:** across read/plot/compute task types, the **x- and y-intercept roles swapped** — the point (b, 0) constructed for (0, b), the value read on the wrong axis, the wrong variable zeroed. Plausibly one belief ("intercepts are interchangeable / b lives on the x-axis") surfacing in three task types — the taxonomies must decide (type-A/type-B hybrid; L10's may be a procedure slip rather than a belief, which its signature work must establish).
- **Arming condition:** both intercepts exist and are distinct (|b| ≠ |x-intercept|; b ≠ 0) — otherwise the swap is invisible.
- **Node span:** ALG-L08 → L09 → L10 (three consecutive graphing-cluster nodes — high Axis-B interleave probability, so runtime co-occurrence is the norm, not the exception). **Cross-node.**
- **Probe contract:** the probe must **vary the task type while holding the line fixed** — a construct task where both intercepts are marked candidates. Consistent axis-swap across both intercepts and across task types → single cluster belief (pool evidence, propose cross-link); errors confined to one task type → node-local tag. Default: node-local tagging + advisory pooling.

#### CC-12 `dropped-middle-term` — (a+b)² = a² + b², two roads in
- **Confidence:** provisional (layer-1b endorsed; condition-expressible — ALWAYS on perfect-square items).
- **Members (all provisional):** `multiplies-firsts-and-lasts-only` (P08), `square-of-sum-drops-middle` (P09).
- **Shared surface:** on (a+b)² items both produce **a² + b² exactly, ALWAYS** (Opus note endorsed) — a partial-FOIL procedure and a wrong-pattern recall, indistinguishable there.
- **Node span:** ALG-P08 → P09 (adjacent multiplication/special-products nodes — interleaved by design). **Cross-node.**
- **Probe contract:** the probe must **vary to a general binomial product** (a+b)(c+d) with distinct factors: `multiplies-firsts-and-lasts-only` errs again (ac + bd); `square-of-sum-drops-middle` is unarmed (no square to mis-recall) and the student expands correctly — decisive. Default: log-both-tag-neither on perfect-square items.

### 2.2 Type B — same-root re-surface clusters (pooling / merge-candidate duties)

For all Type-B clusters the probe contract is uniform unless stated: **no disambiguation probe exists or is needed at runtime** (different nodes' items key their own node-local tag). The duty is registry hygiene under Axis-B interleaving: the touching taxonomies must land signatures, then either (a) document the observable that genuinely separates the IDs, or (b) propose a registry cross-link/merge in their §4 diff. **Default until then: node-local tagging; evidence pools as advisory cross-link only** — a hit against one member raises the sibling tags' priors (hint pre-selection, routing priors) but never activates them.

| ID | Cluster | Members (all provisional) | Shared belief surface | Node span |
|---|---|---|---|---|
| CC-13 | `partial-distribution` | `distributes-to-first-term-only` (F08), `distributes-partially` (E03), `point-slope-partial-distribution` (L11), `partial-distribution` (P07) | Multiplier applied to the first term inside the parentheses only — identical wrong expansion wherever a(b+c) appears | F08 → E03 → L11 → P07 — **four nodes, four IDs, one belief candidate; the map's strongest merge-candidate case** |
| CC-14 | `negative-distribution` | `sign-error-distributing-negative` (F08), `loses-negative-distributing` (E03), `drops-negative-across-subtraction` (P06), `sign-error-subtracting-equations` (S03) | The negative distributed to the first term only; later signs unchanged (Opus note on S03 endorsed: same mechanism, equation-pair parameter family) | F08 → E03 → P06 → S03 |
| CC-15 | `missing-parentheses-negative` | `substitutes-without-parentheses` (F06), `b-squared-sign-error` (Q10) | (−k)² computed as −k² — the identical missing-parentheses trap at substitution time (Opus note endorsed) | F06 → Q10 |
| CC-16 | `partial-division` | `divides-single-term` (E06), `clears-denominator-one-term` (E05), `divides-only-radical-by-2a` (Q10) | A divide/multiply applied to one term instead of every term of a sum | E05 → E06 → Q10 |
| CC-17 | `one-side-only` | `operates-one-side-only` (E01), `unbalanced-completion` (Q09) | Equality broken by operating on one side only (Opus note endorsed) | E01 → Q09 |
| CC-18 | `one-case-only` | `single-case-only` (E12), `forgets-negative-root` (Q08) | Only the positive case reported where ± cases exist — identical answer set (positive root only) | E12 → Q08 |
| CC-19 | `variable-as-label` | `treats-variable-as-label` (F05), `defines-variable-vaguely` (E13), `unlabeled-variables` (S05) | Variable stands for an object, not a quantity — the same defective definition, ungradable apart (Opus note on S05 endorsed) | F05 → E13 → S05. First duty of the touching taxonomies: establish whether this is one registry entry re-homed or three beliefs — mostly rubric-scored surface, so signatures here are choice-keyed/rubric-element forms |
| CC-20 | `radical-linearity` | `splits-sum-under-radical` (Q05), `roots-a-sum` (Q08) | √(a+b) = √a + √b — the same distributive overgeneralization, two homes | Q05 → Q08 |
| CC-21 | `unlike-term-combination` | `combines-unlike-terms` (F07), `combines-unlike-degrees` (P06) | Unlike terms merged by adding coefficients — same output form on polynomial parameter families | F07 → P06 |
| CC-22 | `boundary-line-type` | `solid-vs-dashed-confusion` (L15), `boundary-type-mismatch` (S06) | Strict/inclusive boundary rendered with the wrong line type — identical construct-state error | L15 → S06 |
| CC-23 | `inverse-operation-swap` | `wrong-inverse-operation` (E01), `subtracted-not-divided` (E02) | Undoing a multiplication by subtracting (and kin) — same substituted-operation output | E01 → E02 |

### 2.3 Endorsed within-node pairs — matrix-row duties, NOT clusters

These layer-1b pairs are real collision-matrix obligations for a single node's taxonomy (the per-node harness computes them mechanically anyway); they are recorded here so the draft pass carries them as known rows, but they are not clusters — no cross-node surface, 2 members:

| Node | Pair | Deciding observable (pre-sketch for the taxonomy's probe) |
|---|---|---|
| ALG-L02 | `fails-vertical-line-test-reading` ~ `one-to-one-confusion` | Both output "not a function" for a valid function; separate by which relation type each rejects (one-to-many-x vs many-to-one-y) |
| ALG-L13 | `b-as-given-y-coordinate` ~ `mixes-point-coordinates` | b = y₁ exactly vs coordinates scrambled; separate on points where y₁ ≠ the scrambled b |
| ALG-D03 | `joint-vs-marginal` ~ `row-column-percent-confusion` | Wrong-denominator percent; separate by which marginal the wrong answer normalizes against |
| ALG-D04 | `extrapolates-blindly` ~ `intercept-interpreted-out-of-context` | Both produce out-of-domain claims; separate by whether the claim is a prediction or an intercept reading |
| ALG-P03 | `coefficient-out-of-range` ~ `exponent-off-by-one` | 34×10⁵ is value-correct/form-wrong; 3.4×10⁵ is value-wrong — the value-vs-form observable separates |
| ALG-F11 | `percent-as-whole-number` ~ `moves-decimal-wrong-way` | Powers-of-ten values differ (×100 vs ÷100 directions) — item-level distinctness, not ambiguity |

### 2.4 Sporadic machine coincidences — item-level arming duties (no probe, no cluster)

The layer-1 run's 1–2/30 coincidences that reduce to degenerate parameter draws, all covered by existing or implied generator constraints plus the gold **global generator rule** (recompute every applicable signature at render; re-parameterize on any collision):

- **|Δx| = 1 family:** `forgot-denominator ~ inconsistent-subtraction-order` (2/30, Δx = −1 → Δy = −m); `inconsistent-subtraction-order ~ rate-not-per-unit` (2/30, the same Δx = −1 draws — the rate-not-per-unit twin, added per kahn gate-2 change 5); `drops-negative-slope-sign ~ forgot-denominator` / `~ rate-not-per-unit` (1/30 each, Δx = −1 ∧ m < 0). Constraint |Δx| ≠ 1 (gold) kills all four.
- **|m| = 1 family:** `inconsistent-subtraction-order ~ negative-reciprocal-error` (−m = −1/m ⟺ |m| = 1); `drops-negative-slope-sign ~ inverted-ratio` / `~ reverses-x-and-y` / `~ subtracts-within-points` (1/30 each, the m = 1 draw). Constraint |m| ≠ 1 (gold §2.3) kills all four.
- **Genuinely sporadic** (no clean condition; per-item render check only): `inverted-ratio ~ subtracts-within-points` (2/30), `reverses-x-and-y ~ subtracts-within-points` (2/30), `grid-count-ignores-scale ~ inverted-ratio` / `~ reverses-x-and-y` (2/30, scale-value coincidences), `drops-negative-slope-sign ~ slope-as-difference` / `~ slope-as-height` (1/30), `forgot-denominator ~ slope-as-single-point-ratio` (1/30), `slope-as-difference ~ slope-as-height` / `~ subtracts-within-points` (1/30), `rate-not-per-unit ~ slope-as-height` / `~ slope-as-single-point-ratio` (1/30), `inconsistent-subtraction-order ~ slope-as-height` / `~ subtracts-within-points` (1/30), `grid-count-ignores-scale ~ slope-as-difference` / `~ subtracts-within-points` (1/30), `forgot-denominator ~ slope-as-height` (1/30 — the y₁ = 0 draw, already a gold constraint).
- **Key-collision arming territory** (trap = m; carried as arming conditions in the cluster rows above): `drops-negative-slope-sign` 15/30 (arm only m < 0), `grid-count-ignores-scale` 12/30 (arm only s_x ≠ s_y), six others at 1/30 (degenerate draws; render-time check).

**Unclustered gold entries:** `subtracts-within-points` and `zero-undefined-slope-swap` belong to no cluster — their collisions are all sporadic or self-contained (deliberate special-case items). They stay singletons; their duties live in the gold matrix.

---

## 3. Probe-contract summary (what a touching taxonomy's collision matrix must satisfy)

A node taxonomy "touches" a cluster when any member (verified or provisional) is live on the node or gold-documented as re-surfacing there. Touching obligates, per cluster type:

1. **Type A:** a collision-matrix row per realizable member pair, with the realizing condition stated; a named probe conforming to the cluster's contract (**what it varies** is fixed by this map; the item spec is the taxonomy's to author per TAXONOMY_TEMPLATE §4.4); the cluster's stated default rule verbatim (log-both-tag-neither, or the gold default-tag rules of CC-02/CC-03).
2. **Type B:** the pooling/merge duty stated in the doc's §2.15-class section; a registry cross-link or merge proposal in §4, or the separating observable documented; the advisory-only pooling rule stated.
3. **All clusters:** arming conditions from the cluster row enter the node's generator constraints; provisional memberships the taxonomy confirms or refutes are reported in the batch report for the §5 maintenance pass.

---

## 4. Pilot pre-sketch — ALG-L19, ALG-L11, ALG-L09

Cluster obligations each pilot generation prompt carries **explicitly** (mandatory collision-matrix rows + applicable probe contracts). Live tags per `.authoring-tmp/tag-node-spans.json`.

### ALG-L19 — Average Rate of Change (conceptual; live tags: `forgot-denominator`, `rate-not-per-unit`, `assumes-constant-rate-nonlinear`, `slope-as-single-point-ratio`, `slope-as-difference`)

| Cluster | Obligation |
|---|---|
| CC-03 normalization | **Mandatory matrix row:** f(b) − f(a) (the Δy identity in function-notation form) — both members are live tags, so the ALWAYS collision re-instantiates verbatim. Unit-labeled probe contract carried into interval language ("… per unit of x, over [a,b]"). Gold default-tag rule (bare-numeric → `forgot-denominator` + queue probe) inherited. |
| CC-04 value-for-rate | **Mandatory row:** f(b)/b-class single-snapshot traps; arming analogue of b ≠ 0 (relation not proportional through the origin on the interval). DECISION_F-IF-B6 §4's **unapproved candidate** *"reads average rate as f(b)"* is this cluster's function-notation face — if the judgment pass admits it (engineering-candidate, kahn-gated), the taxonomy must compute its collision conditions against both live members (f(b) = Δf/(b−a) parameter draws) before it ships. |
| CC-07 additive-for-multiplicative | **Mandatory row:** Δf − (b−a) variants of `slope-as-difference`; BLOCKER severity and below-L05 backward routing preserved from gold. Advisory pooling to the F10 root tag stated. |
| CC-06 linearity-illusion | **Primary-home duty:** L19's taxonomy executes the deferred gold §2.14 revision (this is where the entry now lives). Must document the P04 boundary rule (exponential-presented → P04's tag; measurement-on-nonlinear → this tag) and the interval-varying probe (middle-point betrayal). L05's ≥2 discrimination items stand as the Axis-B boundary guard — L19's doc records that split. |
| CC-01 sign-family | **Conditional row:** objective 4 (interpret the sign of the average rate) guarantees negative-rate intervals, so the \|rate\| trap re-arms; the positive-regime follow-up probe contract applies. Not a live tag yet — the taxonomy decides whether `drops-negative-slope-sign` re-surfaces here or a matrix row against the L06 entry suffices. |
| Binding constraint | All rows and probe items inherit DECISION_F-IF-B6 §7: nonlinear relations **presented only** (graph, table, pre-evaluated values); no vertex/factoring/exponential manipulation; symbolic work = direct substitution per L03. |

### ALG-L11 — Point-Slope Form (procedural; live tags: `sign-error-on-point`, `point-slope-partial-distribution`)

| Cluster | Obligation |
|---|---|
| CC-01 sign-family | **Mandatory rows:** L11 is the gold-named §2.2 re-surface site. (1) −m from mismatched subtraction order inside point-slope substitution; (2) the y − (−k) double-negative surface where `sign-error-on-point` (provisional member) acts; (3) **`rise-run-direction-error` re-surfaces at L11 "when stepping from (x₁, y₁)"** (gold §2.4 — kahn gate-2 change 6): the construct-vs-numeric task-type split applies to point-slope stepping items. Sign-regime-varying probe contract applies: a positive-coordinate / positive-slope follow-up separates the local sign slip from re-surfaced `inconsistent-subtraction-order`. This taxonomy's signatures **confirm or refute `sign-error-on-point`'s provisional membership** (§5 promotion input). |
| CC-13 partial-distribution | **Pooling duty (type B):** `point-slope-partial-distribution` is a member; the taxonomy must state whether expanding m(x − x₁) to mx − x₁ is the same belief as F08/E03/P07's and propose the cross-link/merge or the separating observable. Advisory-only pooling stated. |
| Gold re-surface (unclustered) | `subtracts-within-points` (§2.7) re-surfaces at L11 per gold — inherit its signature ((y₂−x₂)/(y₁−x₁)-class within-pair differences applied to the substitution) and the y₁ ≠ x₁ constraint. An inherited entry is documented as re-surfaced, never re-invented (the pilot's tag-overlap comparator check). |

### ALG-L09 — Graphing Linear Equations (graphing; live tags: `plots-b-on-x-axis`, `rise-run-direction-error`)

| Cluster | Obligation |
|---|---|
| CC-01 sign-family | **Mandatory row:** `rise-run-direction-error` is a verified member and L09 is its registry home. The construct-vs-numeric **task-type split is L09's own disambiguation machinery**: construct items (step from (x₀,y₀) with m < 0) key it directly; any numeric read-a-graph \|m\| hit queues a construct probe against `drops-negative-slope-sign`. |
| CC-05 scale-perception | **Primary-home duty:** gold names L09 the primary home of `grid-count-ignores-scale` and the §2.12→§2.11 re-attribution ladder. Mandatory: s_x ≠ s_y arming rows; the **silent-survival rule** (unequal-scale items authored into practice, not just the gate); the axis-scale-varying probe contract. |
| CC-11 intercept-role-swap | **Pooling duty:** `plots-b-on-x-axis` is a member; probe contract (task-type-varying construct item with both intercepts as marked candidates) applies, and the taxonomy coordinates with L08/L10's — consistent cross-intercept swap pools to the cluster belief. L08→L09→L10 interleave co-occurrence makes this row load-bearing at runtime. |
| Gold re-surface (unclustered) | **`zero-undefined-slope-swap` (§2.13) re-surfaces at L09** per gold (equations x = a, y = b — kahn gate-2 change 7): inherit its signature (label swap on the degenerate cases) and the **deliberate special-case authoring duty** (degenerate items are authored, never left to parameter luck). An inherited entry is documented as re-surfaced, never re-invented. |

---

## 5. Maintenance rule

1. **Update cadence:** the map updates **per gated registry-mutation batch** (TAXONOMY_REGEN_SPEC §0 rolling-pin semantics / §11 gate 6). Each taxonomy batch's `_manifest.json` records the confusable-map version it ran against; F-DEP hard-stops on a mismatch.
2. **New-entry harness check:** any registry entry a batch's approved taxonomies ADD must be **classified against the existing clusters before the batch closes** — errorForm + parameterFamily (layer-1b vocabulary) + a pairwise harness run against every signature-bearing member of any cluster whose parameter family it shares. Result: joins a cluster (row added), stays a singleton (recorded), or founds a new cluster (judgment + gate 2 scope).
3. **Version bump on every change:** member added/removed, promotion, probe-contract edit, new cluster — patch bump for promotions and row edits, minor bump for new clusters or contract changes. The Appendix-A pin and the JSON mirror move together.
4. **Provisional → verified promotion:** when a node taxonomy lands computable signatures (harness §3 pass + kahn APPROVE), the harness **re-runs the pairwise pass over the grown signature set**; a provisional membership whose predicted coincidence realizes is promoted to verified, one that fails to realize is struck (with the finding recorded — a struck membership is evidence, not noise). Layer-1b classifications for that node's tags lose PROVISIONAL status at the same moment. **Non-numeric forms (kahn gate-2 change 2):** construct-state tuple memberships promote **mechanically** (state comparison per TAXONOMY_REGEN_SPEC §3.2); keyed-choice recipe memberships can only have their *construction* harness-verified — the behavioral membership claim is confirmed by **mr-kahn at the node's taxonomy verdict** and recorded as `kahn-confirmed`, never harness-promoted. Without this path, gold-matrix-verified and recipe-form members would have no reachable promotion.
5. **Ownership:** mechanical re-runs = harness; regrouping/striking/founding = judgment layer output, gated by mr-kahn (map changes are curriculum structure — gate 2 posture persists for the life of the map).

---

## 6. Layer-1b classifications rejected or regrouped (with reasons)

Fable judgment calls over the Opus draft — recorded so the draft pass never re-imports a rejected pairing:

1. **`negative-result-accepted` ~ `negative-means-one-solution` — REJECTED as a cluster.** Different beliefs (accepting an impossible value as a solution vs miscounting roots from a negative discriminant) that never co-occur on one item; the shared phrase "mishandles a negative" is family resemblance, not a shared observable. Cross-link note only.
2. **`conjugates-keep-middle` ~ `misses-perfect-square-pattern` — REJECTED.** Opposite task directions (expansion vs factoring) mean no item ever presents both traps; "both miss a special-product pattern" is not runtime ambiguity. Each stays in its own node's matrix.
3. **The magnitude pairs (`decimal-place-shift` ~ `decimal-multiplication-error`; `moves-decimal-wrong-way` ~ `percent-as-whole-number`) — REJECTED as clusters.** Powers-of-ten errors separate by value on any given item (×100 vs ÷100 land on different numbers); the duty is item-level distinctness, not disambiguation. The F11 pair is retained as a within-node matrix row (§2.3). The decimal entries are additionally slip-adjacent — stable-belief status is itself for their taxonomies to establish.
4. **`coefficient-out-of-range` ~ `exponent-off-by-one` — REGROUPED** to a P03 within-node row: the value-correct/form-wrong vs value-wrong observable separates them deterministically; no probe needed, no cluster.
5. **`swaps-domain-and-range` excluded from CC-02** — endorsing Opus's own caveat ("not the same items"): the swap acts on set reporting, never producing the 1/m or transposed-pair surface. Singleton.
6. **Within-node pairs regrouped, not clustered** (L02, L13, D03, D04): real matrix duties the per-node harness computes anyway; a cluster adds nothing (§2.3).
7. **Endorsed negative decisions carried forward:** `flips-on-subtraction` correctly left unpaired (opposite wrong answers to `forgets-flip-on-negative`); `reverses-subtraction-order` (F05) correctly kept out of the inversion family (word-order translation error, different parameter family); `off-by-one-term-index` (L17) honestly left without a vocabulary fit — singleton.
8. **`adds-percents-directly` regrouped INTO CC-07** (Opus left it unpaired): additive composition of multiplicative operators is the same root surface as the F10/P04 members — provisional, for E08's taxonomy to confirm.
9. **`sign-error-subtracting-equations` regrouped INTO CC-14** (Opus noted the mechanism match but paired nothing): the note is correct and the equation-pair parameter family doesn't change the belief.

---

## 7. Verdict

**APPROVE WITH CHANGES** (mr-kahn — gate 2, 2026-07-06; all eight changes applied in-place, marked "kahn gate-2 change N"). Gold fidelity is faithful where it matters most: the negative-slope follow-up, the unit-labeled probe, the presentation-class rule, and the distinction between log-both-tag-neither and the two gold asymmetric defaults (CC-02, CC-03) are all carried verbatim and correctly generalized; the negative-reciprocal-error compound/reserved rule matches the gold matrix exactly. The §6 rejections are sound, including the endorsements-with-regrouping (#8, #9). Provisional discipline is genuine — every non-gold member is flagged with a promotion path, and no provisional member needed striking (reads-intersection-imprecisely's explicit strike condition and sign-error-on-point's confirm-or-refute assignment to L11 are exactly the right posture). The unclustered accounting is honest and arithmetically verified (68 unique cluster members; 95 = 163 − 68; the 12 within-node pair tags counted inside the 95). Changes 1–2 were pin-blocking (the promotion machinery for non-numeric forms had to be internally consistent before this document becomes a batch precondition); 3–8 were text-precise. mr-kahn verifies the applied changes at the batch-1 F-DEP check.
