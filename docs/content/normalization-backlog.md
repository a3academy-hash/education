# Algebra 1 Content — Normalization & Standards Backlog

**Status:** The Algebra 1 knowledge graph is **content-complete** as of schema **v1.9.0** (commit `9f6c279`):
74 nodes, 114 edges, **4,588 problems**, zero empty nodes. Validator VALID, 258/258 tests pass.

This file is the durable backlog of **deferred MINOR defects and standards work** accumulated across the
seven content-authoring batches. **None of these affect correctness of the merged graph today** — the validator
is green and all tests pass. They are checker-ergonomics papercuts, cosmetic notation drift, diagnostic-tag
precision, and standards-code verification. They were intentionally deferred per Matt's standing order so they
could be done together in a dedicated **normalization / CCSS-verification pass** rather than piecemeal.

> Do NOT fix these ad hoc. They are scoped for one focused session. Each item below says **what** and **how to apply**.

Per-domain problem counts: Foundations 682 · Equations 868 · Linear 1116 · Systems 372 · Exponents/Polynomials 558 · Quadratics 744 · Data 248.

---

## A. Cross-cutting themes (do these graph-wide, once)

### A1. Notation unification — ASCII vs Unicode (highest-value normalization)
The graph mixes ASCII hyphen `-`/caret `^2` with Unicode minus `−`, superscripts `²`/`⁴`, and en-dash `–`.
Grading is **unaffected** everywhere (the checker's `stripSpace` normalizes `−`→`-`; choice grading is exact-string
with answer.value/choices/keys self-consistent within each item). This is purely display polish, but it spans the
whole graph and should be unified to one house convention in a single pass:

- **Foundations:** F01/F04/F06/F08 use Unicode minus; F02/F03/F05/F07/F09/F10/F11 use ASCII. F04 prompts use
  superscripts but choices use caret form.
- **Equations:** E11 OR-choice strings mix `x < −2 or x > 3` (Unicode) with `x <= -1 or x >= 4` (ASCII).
- **Linear:** L09/L11/L14 choice strings mix `−` and `-` in answer values. Also **L13 "+ -" formatting** —
  choice strings render `"y = 5x + -19"`; reformat to `"y = 5x − 19"` in choices, answer.value, AND the matching
  misconceptionMap key **together** (all three must change to preserve exact-match; these negative-b keys are live
  `mixes-point-coordinates` distractors, not dead). Items: L13-p2-softball-04, -basketball-04, -soccer-02/-04,
  -football-04, -volleyball-04, -neutral-04; L13-p3-neutral-05/-06.
- **Exponents/Polynomials:** P05 and P06 render Unicode superscripts (`x²`, `x⁴`, `·`) while P01–P04, P07–P09 use
  caret (`x^2`); P03 uses `a × 10^n`.
- **Quadratics:** Q05/Q06/Q08 use Unicode `−`/`²`; Q01–Q03/Q07/Q09–Q12 use ASCII `-`/`^2`.
- **Data:** D02's hand-authored p2 items (`-03`/`-04`) use ASCII hyphen in "Q3 - Q1" and "0-9" vs the original
  items' Unicode en-dash ("Q3 − Q1", "0–9").

**How to apply:** pick one house convention (recommend Unicode `−` for minus and `²`/`³` superscripts in
student-facing display, OR commit fully to ASCII `-`/`^2` — decide once). For every changed **choice** item, update
choices[], answer.value, and misconceptionMap keys in lockstep so exact-match grading is preserved.

### A2. Checker-ergonomics — rounded/fraction answers under an exact-equality checker
The numeric checker uses **exact equality** (no CAS, no rounding tolerance). Several banks key non-terminating
results, relying on the prompt to signal the expected format. A student who types the unrounded decimal/fraction
is marked wrong with no misconception tag. Audit-confirmed safe **as authored** (prompts signal the convention),
but formalize a course-wide rubric note and verify coverage:

- **Equations E12** p2 fraction-root items (p2 baseball/softball/soccer/volleyball/football/basketball -02):
  negative roots are non-terminating thirds (−13/3, −11/3, −19/3, −17/3, −11/3, −4/3) keyed as exact fractions,
  but the typing example "like 3, -7" models only integers. Add a "leave as a fraction" signal.
- **Equations E06** expression items (p1-*-04, p2 RHS): exact-string expression matching is fragile — distractor
  keys use `3*T` (explicit multiply) while templates say `3t`. Standardize multiplication notation across template
  + keys, or widen the stated typing format.
- **Data D03** rounded-percent items: items with non-terminating answers carry "to the nearest percent" (verified
  on all 11); exact-terminating items omit it. Add a one-line rubric note when the rounding convention is
  formalized course-wide; consider whether the checker should accept the unrounded decimal as an equivalence class.
- **Foundations** "simplest form"/"as a fraction" prompts are graded by numeric equivalence, so `10/20` or `0.5`
  also pass. Soften wording or accept as a defined equivalence class. Also F07-p2-baseball-04 drops the "no spaces"
  clause its siblings carry; standardize one answer-format house pattern (4 patterns currently coexist).

### A3. p2 per-sport distribution convention
Earlier domains (Foundations…Polynomials) use **strict 4-per-sport** in p2. Quadratics and Data were relaxed to
**"28 total + all 7 sports present (≥1 each), neutral required"** (matches the authoring instruction; some sports
have 2–3 and neutral more). Decide in the normalization pass whether to backfill Quadratics/Data p2 to strict
4-per-sport for whole-graph consistency, or formally adopt the relaxed convention everywhere. The adaptive engine
selects by availability, so either is functionally fine; this is a consistency decision.

### A4. Diagnostic-engine test coupling — RESOLVED (recorded for context)
Each new probeable domain historically broke hardcoded domain-set/sequence assertions in
`lib/diagnostic-engine/index.test.ts` (root cause = correct behavior: a node becomes probeable once it has a
neutral p3 problem). **Resolved** by deriving the probeable-domain set from the graph in the tests (Window 1).
Polynomials, Quadratics, and Data each merged with **zero** test fallout. No further action; noted so the
mechanism is understood.

---

## B. CCSS / standards-verification pass (Matt's standing order — do NOT fix before this pass)

Matt's standing order (2026-06-10): fold these into the dedicated CCSS standards-verification pass.

**Standards-code corrections (deferred, approved-as-deferred):** E09→7.EE.B.4b · L07→8.F.B.4 · L14 annotate
G-GPE.B.5 · E12 state-dependent code · P09→A-APR.A.1. Plus audit defects: 8 (capstone flags), 11/21–23
(granularity), 13–14 (prereq-edge strength), 20 (visual enum), 26 (tier semantics), 27–28 (scope docs).

**Sport-hook coherence flags (found post-1.2.1 scrub, not yet approved for fix):**
- ALG-P01 softball: pool-play/bracket confusion; "(2²)³ rounds" numerically incoherent.
- ALG-L08 basketball "y = 18x + 0" and football "y = 110x + 0" (`+0` pattern reads oddly).
- ALG-Q05 volleyball: full-court diagonal is 9√5, not a √2-multiple — needs "half-court"; soccer "square box" isn't square.
- ALG-P05: all six sport hooks are the same "arc is degree 2" reskin cluster.
- ALG-F03 football TD-as-7 shorthand; ALG-P02 soccer "possession halving" vague.

---

## C. Per-batch deferred MINOR queues

### Batch 1 — Foundations (ALG-F01..F11), v1.3.1
mr-kahn APPROVE WITH CHANGES; CRITICAL (F11 p3 dup) + MAJOR (F04 p3 dup) fixed in v1.3.1. 9 deferred MINORs:
1. **F01** `sign-error-addition` key convention flips across items (some map negative magnitude-sum, others positive
   sum) → tag silently won't fire on the common variant for several items. Engine-safe, diagnostically blind.
2. Cross-node notation drift (see A1).
3. Answer-format instruction phrasing drift — 4 coexisting patterns; standardize (see A2).
4. **F09** uses real MLB club names (Tigers, Cubs) vs generic "a team/club" elsewhere → prefer generic.
5. **F06-p2-baseball-04** "toy rating" jargon → "simple rating" for grades 6–8.
6. **F02** decimal sign errors mapped to `sign-lost-in-fractions` (registry def is fraction-specific) → broaden
   registry description or add a decimal-sign tag.
7. **F11-p3-neutral-06** distractor "back to exactly $100" is the `adds-percents-directly` error but unmapped (tag
   not in F11 misconceptionTags) → add tag + mapping.
8. **F08-p1** difficulty-1 hints give the full computation recipe (revealing) vs two-stage orienting hints elsewhere.
9. Instruction/checker leniency mismatch ("simplest form" graded by numeric equivalence) — see A2.

### Batch 2 — Equations (ALG-E01..E14), v1.4.1
mr-kahn APPROVE WITH CHANGES; 1 CRITICAL + 3 MAJOR fixed before stopping. 3 deferred MINORs:
1. **E06** expression-item multiplication notation (`3*T` keys vs `3t` templates) — see A2.
2. **E12** p2 fraction-root typing signal — see A2.
3. **E11** OR-choice Unicode/ASCII minus drift — see A1.
- Note: E08 neutral-p2 blend quality was machine-checked only, not re-read in the audit — confirm if a deeper pass happens.

### Batch 3 — Linear Functions (ALG-L01..L18), v1.5.1
mr-kahn APPROVE WITH CHANGES; 3 MAJORs fixed in v1.5.1 (`scripts/fix-linear-audit-defects.mjs`). 2 deferred MINORs:
1. **L13 dead decoy keys** — ~13 `mixes-point-coordinates` numeric keys are unreachable decimal decoys
   (`3.0001`, `4.0001`, `5.0001`, `6.0001`), inserted where the true coordinate-swap value collided with the
   correct b in single-point items. Harmless (never false-positive) but diagnostic dead weight. **How:** remove the
   `*.0001` keys; leaving only `b-as-given-y-coordinate` is acceptable for single-point "find b" items. Items:
   L13-p1-baseball-02/-04, -softball-03/-04, -basketball-03, -soccer-01, -football-02, -volleyball-04;
   L13-p2-baseball-03, -softball-03, -soccer-01, -neutral-03; L13-p3-neutral-01.
2. **L13 "+ -" formatting** — see A1 (live keys; change choices/answer.value/key together).
- Plus L09/L11/L14 Unicode/ASCII minus drift — see A1.

### Batch 4 — Systems (ALG-S01..S06), v1.6.0
mr-kahn APPROVE WITH CHANGES; 0 CRITICAL/MAJOR, 3 cosmetic MINORs. **Note:** S03 is GENERATED by
`scripts/gen-s03.mjs` (deterministic, self-asserting) — to change S03 content, edit the generator and re-run; do
NOT hand-edit.
1. **S03 "(1y)" / "1(n)" hints** — generator emitted unit coefficients literally (e.g. "(3y) − (1y)", "4x + 1(3) = 7",
   "8x + (1x) = 9x", "3x + 1(2) = 14", plus p2 mirrors). Fix in `gen-s03.mjs` (strip `1y`→`y`, `1(3)`→`3`,
   `(1x)`→`x`) and re-merge. Math correct; presentation only.
2. **S03 p1 unused context preamble** on choice/sign-distribution items (ticket-pricing preamble where pricing
   isn't used). Optional: drop preamble on choice/sign items, keep on solve items.
3. **S05 `single-equation-for-two-constraints`** numeric keys (e.g. bare total "6") — context-defensible but loose
   tag; consider a more precise tag in the standards pass. Checker-safe (distinct from answers).

### Batch 5 — Exponents & Polynomials (ALG-P01..P09), v1.7.1
mr-kahn APPROVE WITH CHANGES; 0 CRITICAL/MAJOR, 2 MINOR (one fixed pre-commit: P08-p3-neutral-06 worked-example
reuse). 1 deferred MINOR:
1. Cross-node exponent notation `²` vs `^2` — see A1.

### Batch 6 — Quadratics & Radicals (ALG-Q01..Q12), v1.8.0
mr-kahn APPROVE; 0 CRITICAL/MAJOR, 3 deferred MINORs:
1. Cross-node ASCII-vs-Unicode exponent/minus — see A1.
2. p2 distribution differs from earlier domains — see A3.
3. **ALG-Q09-p1-soccer-01** (x²+2x): degenerate case where (b/2)²=b/2=1, so the `adds-half-b-not-squared`
   distractor coincides with the answer; the agent used a bogus key "0.5" that never matches a real input (harmless,
   never fires). Also minor 3-choice-vs-4-choice variance across nodes. Cosmetic. **How:** drop the bogus key
   (empty the misconceptionMap on that one item), and optionally standardize choice counts.

### Batch 7 — Data & Statistics (ALG-D01..D04), v1.9.0 — FINAL DOMAIN
mr-kahn APPROVE; 0 CRITICAL/MAJOR, 2 deferred MINORs:
1. **D03** rounded-percent convention — see A2 (verified safe as authored).
2. **D02** hand-authored p2 ASCII-dash vs original Unicode en-dash — see A1.
- Context: D01 had 21 degenerate `mean-median-interchanged` numeric keys (dataset mean==median) dropped to empty
  maps during authoring — correct and audit-confirmed; no further action.

---

## D. Suggested order of operations for the normalization session
1. **A1 notation unification** graph-wide (biggest visible win; mechanical but touch choices/answer/keys in lockstep).
2. **A2 checker-ergonomics** rubric + format signals (decide the rounding/fraction equivalence policy first).
3. **B CCSS standards-code corrections** + sport-hook coherence (curriculum-gated; mr-kahn authors/approves).
4. **C per-batch tag/decoy cleanups** (L13 dead keys, F01/F02/F11 tag fixes, S03 generator polish, Q09 bogus key).
5. **A3 p2-distribution decision** (backfill vs adopt relaxed) — lowest urgency.

All changes to `data/algebra1-graph.json` are mr-kahn-gated (content) and must keep the validator VALID and tests
green; re-run `npm run validate:graph` and `npm run test` after each step.

---

## E. Phase 8 experiential-quality polish (deferred 2026-06-12, Matt's call)
Surfaced during Phase 8B (visuals wired to real problem data, schema v1.9.2). Non-blocking; logged for a later pass.

- **E1. L05 lesson concept vs explore plane mismatch.** The Learn "THE IDEA" concept sentence for ALG-L05 cites slope 18 (from the node contextHook) while the seeded explore CoordinatePlane shows a real graph item at slope 3. Both are wired/correct; they just cite different examples. Polish: seed the explore plane from an item whose slope matches the concept sentence, or align the concept sentence to the seed.
- **E2. L01 plot frame clipping.** Interactive plot items (ALG-L01) render the placement plane at the default −5→5 frame; an answer point beyond that (e.g. (6, 4)) is still typeable but sits outside the placement window. Polish: extend the plot frame to a sensible bound when the item's answer arity/range implies off-frame placement (without leaking the target — frame from given context + a generous margin).
- **E3. F01/F02 number lines — Wave-2 authoring (mr-kahn's call).** F01/F02 numberline items were STRIPPED (visual nulled) in 8B rather than authored, because prose-embedded start values risk marking the landing/result (answer leak). A start-only display number line is pedagogically valuable for signed addition; author it safely under an explicit no-landing-marker + answer-agnostic-range rule. mr-kahn gates.
- **E4. Data/Stats display primitives — genuine curriculum gap (future phase).** ALG-D02/D04 (and L16 scatter) assess display-reading standards (6.SP, 8.SP.A, S-ID) but the 184 boxplot/histogram/scatter `visual` values were nulled in 8B (no primitive). Several items currently test definition recall ("the median is the line inside the box") rather than reading a real display. Needs: build BoxPlot/Histogram/Scatter primitives (extend VisualKind) + re-author those items to read from a rendered display. Later-phase primitive wishlist (priority): boxplot/histogram → parabola curve (Q06/Q12) → region shading (L15/S06) → balance worked-examples. This is a real scope gap — do NOT claim full Data/Stats display coverage until built.
