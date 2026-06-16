# DIAGNOSTIC.md — Algebra 1 Readiness Diagnostic

**Version:** v0.2 (post board-review: Claude / Grok / ChatGPT)
**Parent project:** Adaptive Math Course (see CLAUDE.md). This diagnostic SEEDS the course
knowledge graph; standalone build, own review cycle.
**Stack:** React 19 + Vite + Supabase (Postgres, RLS, RPC), Vercel.
> *Stack adjudication (ADR-0001, 2026-06-15): React-19 host = **Next.js App Router**; "Vite"
> superseded as a default. RLS/RPC/server-grading behaviors remain binding. See
> `docs/adr/0001-stack-next-over-vite.md`.*
**One-line purpose:** Before a student starts Algebra 1, reliably find the prerequisite gaps
most likely to break Algebra 1 — and place the student on the graph — as a PROVISIONAL seed
the course will confirm. It places; the course confirms.

---

## 0. What v0.2 changed (provenance)

The board converged, independently, on one fatal flaw and several real ones:

1. **The "25-35 items classifies 30-40 nodes at confidence" claim is dead.** Both external
   reviewers named it the single most-likely-fatal assumption. Length is now set by simulation
   + a posterior/SEM stopping rule and a multistage routing design, not a flat target (§4).
2. **KST inference routes; it does NOT lock mastery in v1.** Both flagged over-trust of
   prerequisite inference. Inferred nodes are provisional; high-impact/bridge nodes require
   direct evidence and are never inferred-only (§3, §3a).
3. **Output labels renamed** to stop using mastery language for a placement instrument:
   `READY / NEEDS WORK / UNCERTAIN / INFERRED-READY` (§1).
4. **Graph expanded** — decimal/rational-number magnitude + operations (both reviewers' top
   curriculum catch), absolute value, equivalent expressions, and the full function/bridge
   cluster (slope-from-graph, y-intercept, is-a-function, function notation, solution-as-point)
   which were wrongly treated as a "light bridge." Precise CCSS codes; sub-grade-5 floor
   screener added (§2).
5. **"Decontextualized" -> "minimal-context."** Engagement is solved at the UI layer, not with
   interest skins; pure-vs-light-neutral is A/B-tested (§6).
6. **Constructed-response scope cut** to numeric/short-answer free entry + structured input for
   symbolic/graph; no LLM scoring (§5).
7. **Fatigue is flagged, never silently down-weighted** (§9). **Data model gains versioning**
   (§14). **Validation gains sample sizes + decision-accuracy targets** (§13).
8. **A reconciled 6-week MVD is carved out as the front of the roadmap** (§15a) — that is what
   goes to Claude Code first.

---

## 1. Required output (placement, not mastery)

Per node, emit one of (thresholds `MUST-VALIDATE`, calibrate from pilot):
- `READY` — posterior P >= .85 AND >= 2 independent evidence points (or 1 hard constructed-
  response + prerequisite consistency).
- `NEEDS WORK` — posterior P <= .35 AND >= 2 failed opportunities (or a foundational fail that
  logically blocks downstream skills).
- `UNCERTAIN` — posterior .36-.84, or inconsistent evidence.
- `INFERRED-READY` — resolved via prerequisite topology, **provisional only, never a final
  lock.**

Per student, emit:
1. **Knowledge-graph state object** (node -> label + posterior + CI + evidence count + flags).
2. **Prioritized remediation list**, ordered by prerequisite topology.
3. **Recommended entry frontier.**
4. **Quality flags:** low-confidence nodes, suspected guessing, fatigue risk, possible
   reading-not-math confound.

This writes the course's seed `node_mastery`. The course treats every diagnostic label as
PROVISIONAL until corroborated by the first spaced re-check (course §3).

---

## 2. The Algebra 1 readiness knowledge graph

Scope expanded per review. Target node set below (final count `MUST-VALIDATE`). Use **precise
CCSS codes per node**, not broad cluster tags.

**A. Number, magnitude & operations**
- Integer/signed-number operations — 7.NS.A.1/A.2
- **Decimal operations, incl. signed (add/sub/mult/div, place value)** — 6.NS.B.3/7.NS *(top board catch)*
- Order of operations incl. exponents & grouping — 6.EE.A.1
- **Rational-number ordering / magnitude on a number line** — 6.NS.C.7
- **Absolute value as distance** — 6.NS.C.7c

**B. Fractions, decimals, percents**
- Fraction operations, unlike denominators, incl. **negative fractions** — 5.NF/7.NS
- **Fraction magnitude comparison / equivalent fractions** — 4.NF/6.NS
- Fraction <-> decimal <-> percent conversion — 7.NS/7.RP
- Percent of a quantity; **percent increase vs. decrease (base confusion)** — 7.RP.A.3

**C. Ratio & proportional reasoning**
- Unit rate, incl. **fractional quantities** — 6.RP.A.2
- Solve a proportion — 7.RP.A.2
- **Distinguish proportional (multiplicative) vs. non-proportional (additive)** from a table — 7.RP.A.2a
- Constant of proportionality (bridge to slope) — 7.RP.A.2b

**D. Exponents & roots**
- Evaluate powers; product/quotient rules (intro) — 8.EE.A.1
- **Sign/exponent binding: (-2)^2 vs -2^2; zero exponent readiness** — 8.EE.A.1
- Square root as principal root; perfect squares — 8.EE.A.2

**E. Expressions**
- Evaluate an expression (incl. negative/fraction substitution) — 6.EE.A.2c
- Combine like terms — 7.EE.A.1
- Distributive property, incl. **distributing a negative: -2(x-3)** — 7.EE.A.1
- **Equivalent expressions (identify/generate)** — 6.EE.A.3/A.4

**F. Equations & inequalities**
- Inverse operations / equation-balance model — 6.EE.B
- One-step / two-step linear equations — 6.EE.B.7/7.EE.B.4
- **Equations with variables on both sides** — 8.EE.C.7
- **Distribution + variables both sides (e.g. 3(x-4)=2x+5)** — 8.EE.C.7
- Rational coefficients (e.g. 0.6x=12) — 7.EE.B.4
- **No-solution / infinite-solution readiness** — 8.EE.C.7a
- One-variable inequalities + number-line representation; sign-flip on negative — 7.EE.B.4b
- **Check a solution by substitution** — 6.EE.B.5

**G. Coordinate plane & functions (CENTRAL readiness — not a light bridge)**
- Plot/identify points; quadrants; x/y order — 6.NS.C.6
- **Slope/rate of change from two points, a table, AND from a graph** — 8.EE.B.5
- **y-intercept from graph / table / equation** — 8.F.B.4
- **Map between table <-> graph <-> rule** — 8.F.B.4
- **Identify whether a relation is a function (table/mapping)** — 8.F.A.1
- **Evaluate a function rule from an input (function notation readiness)** — 8.F.A.1
- **Ordered pair as a solution: does (4,11) satisfy y=2x+3?** — 8.EE.C.8a

**H. Language -> math translation**
- Translate a verbal statement into an expression — 6.EE.A.2
- **Compound/multi-clause translation into an equation or inequality** — 7.EE.B.4
- **Define the variable before writing the equation** — 7.EE.B.4
- Comparison/quotient language; "less than" reversal — 7.EE.B.4

**Emergency floor screener (below grade 5, only triggered for far-below students):**
multiplication/division facts; decimal place value; fraction magnitude; equivalent fractions;
number-line placement.

Edges encode prerequisites and carry a `graph_version`. Inference rules in §3.

---

## 3. Measurement method — graph-aware multistage adaptive

A fixed linear test is rejected (wastes items, under-samples the frontier). But full IRT-CAT is
premature pre-calibration, so v1 is honestly **structured multistage adaptive testing**, not a
true CAT.

- **Phase 1 (launch) — structured multistage routing:** fixed domain-spanning anchor set, then
  rule-based branching on performance bands, with Bayesian per-node posteriors and KST graph
  pruning. Call it what it is: expert routing, not IRT.
- **Phase 2 (post-data) — IRT/CAT migration:** once item difficulty/discrimination are
  calibrated (§13), migrate selection to IRT Fisher-information / KST fringe-resolution. Built
  as a parameter swap, not a rebuild.
- **Per-node mastery:** Bayesian update with conservative priors; BKT-style guess/slip
  parameters where observations support them.

### 3a. KST inference is for ROUTING, not LOCKING (v1)

Both reviewers: real students solve harder items procedurally while still holding brittle
prerequisite gaps; prerequisite edges are only approximately deterministic in adolescent data.

- KST may mark a node `INFERRED-READY` (**provisional**) to skip direct testing for *routing*.
- **High-impact / bridge nodes are NEVER inferred-only — they require >= 2 direct evidence
  points:** fraction operations, rational-number operations, decimal operations, distributive
  property, two-step equations, variables-both-sides, slope/rate, table<->graph<->rule mapping,
  ordered-pair-as-solution, verbal-to-equation translation.
- Inferred nodes are re-confirmed by the course's early re-checks.

---

## 4. Length & stopping rule (no flat target — simulation sets it)

The old 25-35 target is withdrawn. Length is an OUTPUT of the design, governed by:

- **Multistage routing** so different students get different lengths:
  - Confident ceiling student: short (~28-35 items).
  - Confident floor student: short, routed to the emergency screener.
  - **Uncertain middle student: long** — this is where items are actually needed; allow split
    across sessions rather than capping prematurely.
- **Posterior/SEM stopping rule (not a generic cap).** Stop when ALL hold:
  1. every high-priority bridge node is directly tested or course-provisionally inferred;
  2. every node is labeled READY / NEEDS WORK / UNCERTAIN / INFERRED-READY;
  3. no unresolved high-priority node has posterior in the ambiguous .45-.75 band;
  4. >= 2 independent evidence points exist for every locked high-impact node;
  5. the hard cap is hit (remaining nodes -> UNCERTAIN, flagged).
- **Hard cap:** split into a second session rather than forcing a long single sitting; a 70+
  item single session is rejected on engagement grounds (disengagement is itself construct-
  irrelevant variance).
- **Mandatory before engine finalization:** run a **simulation on synthetic mastery patterns**
  consistent with the graph to set realistic per-student length distributions and verify
  classification accuracy. No length number is committed until this runs.

---

## 5. Item types & response modes (with misconception mapping)

Every item tagged: `node_id`, `difficulty_tier`, `misconception_map` (each wrong answer -> a
named misconception), `calculator_flag` (§10), `response_type`, `item_version`,
`equivalence_class`.

**Response modes (v1, no LLM scoring):**
- **Free numeric / short-answer** — slope value, percent, coordinates, evaluate, solve-for-x.
- **Structured input** for symbolic/relational — coefficient boxes, drag-to-match for
  equivalent expressions, click-to-plot / select-line for graphs. (Avoids string-match failure
  on `2x+3` = `3+2x`.)
- **MC with misconception-mapped distractors** where efficient; a wrong option is diagnostic.

**Archetypes must probe readiness DEPTH, not surface execution.** Required harder items:
- `-3/4 + 1/2`; `-0.8 x -2.5` (signed fraction/decimal).
- `2 + 3^2 x (4-1)` (precedence with exponent/grouping).
- `(-2)^2` vs `-2^2` (sign/exponent binding).
- `-2(x-3)` (distribute the negative); "which expressions equal `2(x+3)-x`?" (equivalence).
- `0.6x = 12` (rational coefficient); `3(x-4) = 2x+5` (distribution + both sides).
- Inequality with sign flip: `-3x < 9` + pick its number-line graph.
- "Does `(4,11)` satisfy `y = 2x+3`?" (ordered-pair solution).
- Table -> slope -> equation; graph -> y-intercept -> equation (representation chain).
- "Is this table a function?"; evaluate a rule at an input.
- Compound translation: "5 less than twice a number is 11" -> equation; define the variable.

Misconception maps must be complete for the highest-error skills (sign rules, additive-fraction
thinking, distribute-to-first-term-only, slope-as-y-value, x/y reversal, keyword-order
translation traps, "linear = any increasing pattern"). Full per-domain map list maintained in
the item bank.

---

## 6. Minimal-context (revised from "decontextualized")

Both reviewers: full sterility risks disengagement, which is *also* construct-irrelevant
variance. Resolution:
- Items are **minimal-context, low-reading, neutral** — mostly symbolic/numeric, short
  table/graph items, **one-sentence practical context only where the construct requires it**
  (unit rate, percent change, slope).
- **No interest/narrative skins in the diagnostic** (those belong to the course's teaching
  layer). Neutral framing must not change the numbers or require domain knowledge.
- **Engagement is solved at the UI layer:** calm visuals, level/progress framing, micro-
  encouragement, pause/resume — not at the content layer.
- **A/B test** pure-symbolic vs. light-neutral framing on completion rate, latency variance,
  and effort flags. Let data, not aesthetics, settle the final framing.

---

## 7. GAP vs SLIP vs GUESS (reliability)

Final-answer + latency alone is weak. Expected error without step capture: ~10-20% false
NEEDS-WORK on careless students, ~10-15% false READY on lucky/simple items.
- **Capture structured work on high-value nodes** to disambiguate: enter the next step (not
  just the final answer) for equations; click/drag for graphing; select common denominator /
  operation for fractions; identify rise/run before final slope.
- **Bayesian evidence weighting:** fast-correct on a hard item with no work = reduced weight;
  trigger a corroboration item.
- **Minimum 2 items** (or 1 constructed + 1 selected) for any node near the band or any high-
  impact bridge node.
- Inconsistent easy-after-hard performance -> UNCERTAIN, not NEEDS WORK.
- Detector thresholds are tuned from logged pilot data, not hand-set finally.

---

## 8. Integrity & anti-gaming

- **No answer feedback during the test; no back-navigation** after later items are seen.
- **Multiple isomorphic item families per node** (randomized numbers alone don't stop family
  memorization).
- Latency + revision-pattern logging (feeds §7); **"explain why" micro-item on suspicious
  corrects.**
- **Delayed confirmation inside the course** is part of integrity, not just placement.
- Browser lockdown only if placement is ever made high-stakes; default low-stakes.

---

## 9. Affective framing & fatigue (validity, not nicety)

- Frame low-stakes: "you can't fail this — it just helps us start you in the right place."
  Calm UI, encouraging progress, no punitive timer.
- Adaptive routing must not feel like relentless failure: cap consecutive hard misses;
  interleave a reachable item after a hard run.
- **Fatigue is flagged, never silently down-weighted** (down-weighting hides real gaps and
  yields non-comparable scores):
  - pause at ~25 items / ~25 min;
  - if post-pause accuracy drops >= 25 points across matched difficulty, set `fatigue_risk`;
  - unresolved nodes become UNCERTAIN, not NEEDS WORK;
  - allow resume within 24h.

---

## 10. Calculator & accessibility

- **Three calculator flags per item:** `no_calculator` (computation-fluency nodes),
  `calculator_allowed` (reasoning/modeling), `calc_neutral_arithmetic_light` (mixed-construct
  items kept arithmetic-light so calculation doesn't mask the target). **Do not put ugly
  arithmetic inside reasoning items unless arithmetic is the target** (e.g. slope from
  fractional coordinates).
- **Accessibility:** keyboard symbol entry, screen-reader support for structured-input and
  coordinate-plane items (the hard case — design early), adjustable text size, extended-time
  mode that does not distort fatigue logic.

---

## 11. Edge cases

- **Floor:** far-below -> descend to grade 5-6 prereqs, then the sub-grade-5 emergency screener
  (§2); output an explicit "pre-Algebra-1 remediation required" node list, not a vague flag.
- **Ceiling:** already-ready -> short test, "ready; consider acceleration."
- **Reading-not-math confound:** failures clustering on higher-reading items while low-reading
  equivalents pass -> flag literacy factor, do not brand math gaps.
- **ESL / language:** minimal-reading design partially mitigates; flag for human review.

---

## 12. Handoff to the course

Diagnostic writes the seed `node_mastery` state with PROVISIONAL labels (READY / NEEDS WORK /
UNCERTAIN / INFERRED-READY), the recommended entry frontier, and queues NEEDS-WORK / UNCERTAIN
nodes into the course's early remediation path. **The diagnostic places; the course confirms
via the first spaced re-check.** Diagnostic-READY is never treated as course-MASTERED until
confirmed.

---

## 13. Validation protocol (`MUST-VALIDATE`)

- **Reliability:** test-retest on a stable cohort; per-domain internal consistency.
- **Sample sizes:** pilot **n >= 200-300** for item analysis + validity correlations;
  **n >= 500-1,000** before serious IRT calibration.
- **Concurrent validity:** correlate with teacher placement + MAP/NWEA; do not rely on
  correlation alone.
- **Predictive validity (the one that matters):** criterion = first-attempt success and
  time-to-mastery on DEPENDENT course nodes. Report **sensitivity >= .80 for true gaps and
  specificity >= .85 against false-gap labels.**
- **Consequential validity:** does diagnostic-driven placement improve downstream course
  outcomes vs. a historical baseline?
- **Fairness / DIF:** classification accuracy + differential item functioning across grade
  band, reading level, demographics.
- **Length/accuracy curve:** from the §4 simulation + pilot, to set real per-student length
  distributions.

---

## 14. Data model & engine architecture

**Supabase (RLS per-student; coach/parent scoped reads):**
- `prereq_nodes` (id, domain, ccss_code, prereq_edges, calculator_flag, high_impact bool, graph_version)
- `diag_items` (id, node_id, difficulty_tier, response_type, calculator_flag, misconception_map,
  render_spec, irt_params, calibration_status, **item_version**, **equivalence_class**)
- `diag_sessions` (id, student_id, started_at, paused_at, completed_at, fatigue_flags,
  integrity_flags, **diagnostic_version**, **scoring_rule_version**, **graph_version**)
- `diag_responses` (session_id, item_id, answer, correct, latency, revision_pattern,
  work_capture, misconception_tag, evidence_weight)
- `diag_results` (session_id, node_id, label, posterior, ci_low, ci_high, evidence_count, flags)
- **`item_versions`**, **`calibration_runs`**, **`item_exposure`** (longitudinal validity:
  without these, any item edit silently breaks comparability).

**Engine:** anchor localization -> rule-based multistage router (KST fringe for routing only)
-> Bayesian per-node update -> posterior/SEM stopping check -> provisional inference pass ->
result object + handoff write.

---

## 15. Build roadmap

### 15a. MVD — what goes to Claude Code FIRST (6-week ship)

Reconciled from both reviewers' minimum-viable cuts. **Goal: reliably find the 5-10
prerequisite gaps most likely to break Algebra 1 — NOT perfectly classify every node.**

**Keep:**
- All 8 domains; ~20-25 highest-impact nodes (full A/B core, C, E, F one/two-step +
  vars-both-sides + check-by-substitution, G plot/slope/y-intercept/mapping/ordered-pair,
  H basic + one compound translation).
- ~35-45 items, structured multistage routing (NOT true CAT): fixed anchor set + performance-
  band branching.
- Direct testing of all high-impact nodes; conservative Bayesian per-node update + rule-based
  inference for the rest (provisional).
- Response modes: free numeric/short-answer + structured input (coefficient boxes, drag-to-
  match, click-to-plot) for G/E. **No LLM scoring.**
- Output the 4 provisional labels + prioritized top remediation list + entry frontier; write
  provisional seed to `node_mastery`.
- Neutral minimal-context items + strong affective UI (progress, micro-encouragement, pause).
- Basic accessibility (keyboard + screen-reader compatibility); fatigue pause at ~25 items.
- Ship framed as **"beta placement — the course confirms."**

**Cut for the 6-week ship:**
- Full IRT/CAT selector + Phase 2/3 migration.
- Aggressive KST mastery *locking* (routing-only is fine).
- LLM elements of any kind.
- Advanced slip/guess detectors beyond latency + 2-item corroboration.
- Complex fatigue down-weighting (use flag + SHAKY/UNCERTAIN + resume only).
- Niche/low-yield nodes; absolute-value and no/infinite-solution can move to v1.5.
- Full validation protocol (replace with small internal check + post-launch monitoring).

### 15b. Post-MVD phases
- **Phase 2 — Validate & calibrate:** run §13 (n>=200-300, then 500-1,000); fit IRT params;
  produce the length/accuracy curve; tune detectors from logs.
- **Phase 3 — Full adaptive CAT:** migrate selection to IRT/KST (parameter swap).
- **Phase 4 — Depth:** add deferred nodes, richer step-level capture, DIF-driven item fixes.

---

## 16. Open assumptions still to attack

1. The expanded node set is now correctly scoped (nothing critical missing, nothing redundant).
2. The structured multistage router (hand-set params) places accurately enough pre-calibration.
3. The §4 simulation will confirm a workable per-student length distribution.
4. Structured-input scoring (no LLM) is robust for equivalence/graph items at the bridges.
5. 2-item corroboration + latency is enough to hold false-READY / false-NEEDS-WORK within the
   §13 targets without full step-level capture on every node.
6. Minimal-context + UI engagement keeps completion/effort high enough for clean data.

---

## 17. If running another adversarial round, ask reviewers to focus on:

1. Is the expanded graph (§2) now complete and non-redundant? Name any remaining missing/extra
   node and its CCSS code.
2. Does the simulation-driven length approach (§4) actually resolve the item-count problem, or
   is there a residual flaw?
3. Is routing-only KST (§3a) the right v1 stance, or too conservative / not conservative enough?
4. Are the §13 decision-accuracy targets (sens >= .80, spec >= .85) the right bar, and is the
   predictive-validity criterion sufficient?
5. Does the MVD (§15a) cut the right things, and will it hit the "find the 5-10 breaking gaps"
   goal?

End with: ranked top 3 highest-severity remaining concerns + the single assumption from §16
most likely still fatally wrong.
