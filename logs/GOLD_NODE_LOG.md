# GOLD_NODE_LOG — gold-standard node authoring

## 2026-07-02 — Session start: context + live-bank pull

- Read `new_plan/CLAUDE.md` (v0.2), `new_plan/AI_ADAPTIVE.md` (v0.2), `new_plan/STYLE_GUIDE.md` (v0.2), root `CLAUDE.md`.
- Slope nodes located in `data/algebra1-graph.json`: **ALG-L05 "Slope as Rate of Change"** (prereqs L01, F10; CCSS 8.EE.B.5, F-IF.B.6) and **ALG-L06 "Slope from Two Points"** (prereq L05; CCSS 8.F.B.4). Prompt placeholder "[slope node ID]" unresolved → working target **ALG-L06** with the taxonomy covering the L05+L06 slope cluster, so it survives either choice. Reason: L06 subsumes L05 as prereq and carries the richest documented misconception surface (subtraction order, inversion, forgot-denominator, sign flips).
- Supabase pull (project `ewnvknibkzloujxbanzm`, matches `.env.local`): active graph **1.9.2** (published + activated 2026-06-14). Slope node entries saved to `.authoring-tmp/gold/ALG-L05-live-1.9.2.json` and `ALG-L06-live-1.9.2.json`.
- **Current quality bar (what we're replacing), per node:** 62 problems (28 P1 / 28 P2 / 6 P3; difficulty 1–3), all numeric-answer single-step prompts, 2 generic hints each, thin `misconceptionMap` (1–2 wrong-answer→tag entries), `visual: null` throughout, 2 worked examples. No error-analysis items, no representation variety (no table/graph/verbal), no rubric-scored explanation, no transfer-battery structure.
- Graph `misconceptionRegistry` (153 entries) slope-relevant tags: `forgot-denominator`, `inconsistent-subtraction-order`, `inverted-ratio`, `rise-run-direction-error`; adjacent: `swaps-m-and-b`, `negative-reciprocal-error`, `k-as-y-intercept`, `treats-exponential-as-steep-linear`.

## 2026-07-02 — Misconception taxonomy authored (mr-kahn)

- mr-kahn (agent a6087caa8bc320a1d, continuable via SendMessage) authored the slope-cluster taxonomy → persisted at `docs/gold-node/misconception-taxonomy-slope.md`.
- **14 entries**: 4 existing registry IDs refined (`forgot-denominator`, `inconsistent-subtraction-order`, `inverted-ratio`, `rise-run-direction-error`) + 10 new (`drops-negative-slope-sign`, `slope-as-difference`, `subtracts-within-points`, `slope-as-height`, `slope-as-single-point-ratio`, `rate-not-per-unit`, `grid-count-ignores-scale`, `slope-as-visual-steepness`, `zero-undefined-slope-swap`, `assumes-constant-rate-nonlinear`). Every entry has a closed-form deterministic detection signature; collisions documented in a matrix with disambiguation probes; merged/rejected candidates recorded (no padding).
- **Keying contract** (§3 of the doc — the part all 73 other nodes copy): 3-rung hint ladder (root probe → targeted counter → worked micro-step, never the answer), error-analysis items must instantiate the entry's signature as shown work, rubric elements annotated with countered entry IDs (advisory evidence only), 2-hit / probe-confirmed tag activation + severity-based routing.
- **Registry diff** ready for mechanical application (4 redefine, 10 add, 0 narrowed, 1 live-item re-key). NOT yet applied to `data/algebra1-graph.json` — that edit is gated implementation work.
- **mr-kahn verdict: APPROVE** on ALG-L06 (with L05 as taught prereq surface) as the gold reference node.
- Structural finding: F-IF.B.6 lives only on ALG-L05 (no downstream average-rate node) → nonlinearity-discrimination items are mandatory in L05.

Next: awaiting Matt's deliverables list for the full gold-standard experience build.

## 2026-07-05 — Rebuild session (post-outage): branch + D1

- Prior desktop session lost to power outage; D1–D6 were never persisted (see `docs/gold-node/REVIEW_DIGEST.md`, committed `1c28e0d`). Rebuild ordered by Matt with the DURABILITY RULE: write + commit + push per deliverable, one commit each, log per deliverable.
- Branch `gold-node-alg-l06` created off `b62fa21` (overhaul/v0.2 tip), pushed to origin.
- Deliverable order (Matt): D1 → D3 → D2 → D4 → D5 → D6, hard stops after D1 and D3.
- Gates: no registry-diff application, no Supabase writes, no `data/algebra1-graph.json` edits.

### D1 — GOLD_NODE_LESSON.md (DONE, DRAFT pending Matt review)

- Authored by mr-kahn (agent a9e27d802a12603a1, continuable via SendMessage) → `docs/gold-node/GOLD_NODE_LESSON.md`.
- Full ALG-L06 instructional sequence, 7 sections: scout's-notebook hook (baseball P1, per-sport substitution table for all 7 tracks) → ramp concrete anchor (no formula/coordinates) → 4 worked examples with fading (P1 concrete → P2 graph → P2 negative slope → P3 abstract), each with taxonomy-rooted self-explanation prompts → 4 embedded checks, every distractor = a taxonomy detection signature computed on the item's numbers (EC3 carries the −m/|m| collision-matrix handling) → 3 misconception-confrontation segments (§2.1 + §2.6 BLOCKERs, §2.2 top HIGH with documented tie-break) → formalization LAST (formula derived as "naming what you already did"; §2.7 subscript treatment; §2.15 full-reversal correctness) → L05→L06 bridge with the mandatory §2.14 nonconstant-rate discrimination moment.
- 10 fully-specified `visual` blocks (renderer/Manim-buildable: exact data, annotations, reveal beats); zero nulls. Constraint self-check appendix included.
- Datasets: (2,4)/(6,16)→3 · (8,24)/(20,60)→3 · (8,18)/(12,10)→−2 · (2,7)/(6,19)→3 · ramps 6/4 vs 12/10 · §2.14 table.
- HARD STOP: hook + anchor + first worked example surfaced to Matt for review before D3.
- Matt review: APPROVED with one copy fix — scout persona pronoun her→his ("scouts are usually male"). Applied + committed `85fbbbb`. Standing content rule recorded: named personas match realistic demographics for the role.

### D3 — gold-node-items.json (DONE, DRAFT pending Matt review)

- Authored by mr-kahn (agent a95d7b34c2aaa777c) → `docs/gold-node/gold-node-items.json`; persisted, JSON-validated, structurally checked (all taxonomy tags valid, zero null visuals, §3.2 fields present) by main session.
- 15 items, 5 archetypes: 4 scaffolded-multistep (parts a/b/c deterministically checkable, per-part misconceptionMaps) · 3 error-analysis (`subtracts-within-points` §2.7, `slope-as-difference` §2.6, `slope-as-single-point-ratio` §2.9 — distinct cognitive roots; §3.2 four-rule construction: shown work instantiates the signature, locate + diagnose questions, non-matching distractor beliefs, errorAnalysisOf metadata) · 2 predict-reveal (scale betrayal §2.11/§2.12; sign §2.2/§2.5) · 3 interactive (full interaction contracts: manipulated state, submitted state object, deterministic scoring incl. formula-valid many-answer states) · 3 discrimination (incl. constant-vs-nonconstant table keyed to §2.14).
- Phase split 4 P1 / 6 P2 / 5 P3; ids namespaced `ALG-L06-gold-*`; every misconceptionMap entry carries trigger + tag + instantiated signature; hintLadderRef convention `HL-L06-generic` + `HL-<tag>` (D2 will define these ladders, keyed by exactly these ids).
- schemaNote documents the extension over the live 1.9.2 item schema (string phases, object misconceptionMap with explicit signatures, archetype bodies, mandatory visual).
- HARD STOP: one complete error-analysis item surfaced to Matt for review before D2.

### D1 v2 — voice revision (Matt REJECTED v1 language)

- Matt's complaints (verbatim themes): "an authentic workload — what does that even mean? why is that added to a math question?"; "the tempting idea — what does this even mean?"; "Your hits went up by 12, so 12 is your rate — WHAT? What hits? … why is there no relevant context?"; "why cant you talk normal?"
- Diagnosis (now standing voice contract, recorded in the doc's global rules): (1) never ventriloquize a misconception in the lesson's own voice — re-establish concrete context first, then attribute the wrong idea to a named fictional peer in quoted speech; (2) no insider pedagogy meta-labels in student text ("The tempting idea," "You say it"); (3) authoring/realism rationale never leaks into student-visible text ("an authentic workload" moved to Authoring notes); (4) numbers never appear without units + context, "rate" never bare; (5) read-aloud test — plain coach/teacher speech.
- Rewrite by mr-kahn (agent a71d1d8a7dce217f9): all pedagogy, datasets, distractor values, taxonomy keying, and the 10 visual specs unchanged; student-facing text only. Confrontations now voiced by named peers (Priya §5.1, Eli §5.2, Marcus §5.3). Appendix gains constraint (f) v2 voice contract. Status → DRAFT v2 pending re-review.
- Matt also supplied a register benchmark (Claude-chat "Radar Gun Log" item: week 3 74 mph / week 8 86 mph → 2.4 mph per week) — adopted as the voice bar; same pass to be applied to D3 next, with the radar-gun item integrated as a scaffolded item.

### D2 - GOLD_NODE_HINTS.md (DONE, committed this entry)

- 15 hint ladders (14 taxonomy tags + HL-L06-generic), every hintLadderRef id in gold-node-items.json + lesson EC wiring covered (0 undefined, 0 orphaned). Taxonomy 3.1 three-rung contract; rungs 1-2 formula-free (programmatic audit); collision service rules for the -m/|m|, dy, and 1/m pairs.
- Declared deviation from taxonomy 3.1 (header block): ladders use item-agnostic fixed numbers, not "this item's numbers" - answer-safer, outage-servable verbatim (RUNTIME 4). Pending taxonomy amendment.
- mr-kahn APPROVE WITH CHANGES, applied: generic + forgot-denominator examples renumbered off a widened collision set (numeric answers + EC keys + construct components; the int-03 slope-3 near-miss drove the widening); A.3 audit re-run, two standing boundary findings ruled (quotient-5 accepted on trigger-ordering; zero-ladder collision permanent structural exemption).

### D4 - GOLD_NODE_RUBRICS.md (DONE, committed this entry)

- Rubric contract mapped field-for-field to RUNTIME_TUTOR_SPEC 3.2 (parity script-verified); advisory-only semantics per taxonomy 3.3; met = score >= metThreshold declared as D4-supplied semantics; counteredEntryIds withheld from grader input - flagged as a proposed RUNTIME 2 envelope amendment.
- RUB-L06-explain (5 elements, 3.3 row-for-row) + RUB-L06-transfer-d1 (4 elements; row-4 subtraction-direction element trimmed - prompt never elicits it, 2.2 keeps its deterministic channel via part (a)).
- Gold instances: rex-01 (rubric-explanation, P3 neutral) and tb-d1-01 (dimension-1 cross-domain, atmospheric lapse rate, spatial x - freshness claim census-verified against all 62 live + 15 gold items). Four sample graded responses in exact 3.2 JSON.
- Voice: instrument-measured, 6/6 new items pass the assessment register; two-part anchor+explanation shape accepted by mr-kahn as an archetype-declared exception (RUNTIME 4 deterministic-evidence grounding).

### D5 - gold-node-variants.json (DONE, committed this entry)

- Swap-template envelope per INTEREST_DOMAINS invariance contract: machine-usable frozen/swappable classes, presentation-class freeze, solver-equivalence required (RUNTIME 3.3 consumer). 15-domain registry (6 platform sports fillTarget:false - sport swaps ride the D1 hook mechanism; 6 high-fidelity fill domains; cooking route-to-default; music/social light/held per 6.1 proximity).
- 9 skinnable / 6 neutral-or-default-only with per-item reasons (P3 discipline, collision probes incl. pr-01, integer-snap). 2 fully-filled exemplars (scaf-01, ea-01) across all six fill domains; density convention declared.
- mr-kahn APPROVE WITH CHANGES, applied: scaf-01 automotive fill authored at week scale (fuel log, ea-01 precedent), capstone distractors re-verified under the new context. Declared unfillables honest (pr-01 spread, 6.1 hard constraints all pass).
