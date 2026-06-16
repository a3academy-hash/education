# phase-6-plan.md — Diagnostic (v1, pre-review)

**Plan against:** `new_plan/DIAGNOSTIC.md` (all; esp. §1 labels, §3/§3a routing+KST, §4 stopping+
simulation, §5 items, §9 fatigue, §12 handoff, §14 data, §15a MVD). Companion: AI_ADAPTIVE §6
(cold-start seam), STYLE_GUIDE §8.3 (test register — done Phase 5).
**Gate (PLAN.md/GOAL.md):** structured multistage routing; high-impact nodes tested directly; KST
routing; outputs four labels + remediation + entry frontier; writes provisional seed; finds the
5-10 break-Algebra-1 gaps; new student completes placement; engine starts seeded.

## 0. What EXISTS (reuse) vs MISSING (build)

REUSE (solid, tested, mr-kahn-gated): the pure deterministic **frontier-walk engine**
(`lib/diagnostic-engine/index.ts`): one anchor per probeable domain → advance-on-correct /
descend-on-miss, cross-domain/depth **confirmation probe**, immutable replay, sealed client graph
view, the persistence order in `actions.ts`, `creditFromDiagnostic` seed write, the
`DiagnosticFlow` UI (silent correctness, no back-nav). The **cold-start seam already exists**:
`lib/engine-v2/cold-start.ts` has `DiagnosticLabel = READY|NEEDS_WORK|UNCERTAIN|INFERRED_READY` +
`seedFromDiagnostic` (graded p_known + provisional flag). All 74 nodes carry CCSS codes.

MISSING (build, MVD §15a): the **4 placement labels** + provisional flag in the output; **Bayesian
per-node posteriors + CI** (today only a confidence band); **high-impact bridge set** + the §3a
rule (never inferred-only; ≥2 direct evidence); **posterior-aware stopping** (today flat
maxItems=15); **remediation list + entry frontier + quality flags** in the result; **fatigue
pause** (~25 items) + `fatigueRisk`; the **§4 simulation** on synthetic mastery patterns.

## 1. High-impact bridge set (DIAGNOSTIC §3a) — `lib/diagnostic-engine/high-impact.ts`

Derive from each node's CCSS codes (no schema edit needed — codes already present). High-impact iff
the node's `standards.ccss` intersects the §3a bridge codes:
`7.NS.*` (signed/fraction ops), `6.NS.B.3`/`7.NS` (decimals), `6.NS.C.7*` (rational magnitude/abs),
`6.EE.A.1` (order of ops), `7.EE.A.1` (combine/distribute), `6.EE.B.7`/`7.EE.B.4*` (one/two-step),
`8.EE.C.7*` (vars both sides), `8.EE.B.5` (slope/rate), `8.F.B.4` (table↔graph↔rule),
`6.EE.B.6`/`8.EE.C.8a`/`6.NS.C.8` (ordered-pair-as-solution), `6.EE.A.2*` (verbal→expression).
Export `HIGH_IMPACT_CCSS: Set<string>` + `isHighImpact(node): boolean` +
`highImpactNodeIds(graph): string[]`. **mr-kahn must bless the final code list.**

## 2. Bayesian posterior + CI — `lib/diagnostic-engine/posterior.ts`

Per-node Beta-Binomial posterior over the node's evidence (pure, no clock). Prior `Beta(a0,b0)`
set by inference state: untouched → Beta(1,1) (flat); inferred-from-descendant → Beta(2,1) (weak
prior toward known); descended-past → Beta(1,2). Each DIRECT response updates with guess/slip
discounting: correct → `a += (1 - slip)`, `b += slip`; incorrect → `b += (1 - guess)`, `a += guess`
(guess=0.2 MC-ish, slip=0.1; §5/§7 "fast-correct on a hard item = reduced weight" → a latency hook
deferred). Output `{ posterior=a/(a+b), ciLow, ciHigh, evidenceCount }`; CI via a Beta normal-approx
(mean ± 1.96·sd, clamped) — honest, simple, no new dep. Thresholds (§1/§3) are config constants.

## 3. Four labels + remediation + frontier — `lib/diagnostic-engine/labels.ts`

`labelNode({posterior, evidenceCount, inferredOnly, directIncorrect, highImpact})`:
- **READY** — posterior ≥ .85 AND ≥2 evidence points (direct), OR 1 direct-correct + prereq
  consistency. High-impact require ≥2 DIRECT (never inferred-only, §3a).
- **NEEDS_WORK** — posterior ≤ .35 AND ≥2 failed opportunities (or a foundational direct fail).
- **INFERRED_READY** — resolved by topology only (inferred), posterior ≥ .65, **provisional**;
  but a high-impact node with inferred-only evidence is demoted to **UNCERTAIN** (forces direct).
- **UNCERTAIN** — posterior .36–.84, inconsistent evidence, or fatigue-flagged.
`remediationList(labels, graph)` = NEEDS_WORK + UNCERTAIN ordered by prereq topology (topo sort,
ancestors first). `entryFrontier(labels, graph)` = deepest nodes whose prereqs are all READY/
INFERRED_READY but the node itself is not READY (the recommended start set). Pure.

## 4. Engine integration — `lib/diagnostic-engine/index.ts`

- `finishDiagnostic` also returns `labels: Record<id, DiagnosticNodeLabel>` (label, posterior,
  ciLow, ciHigh, evidenceCount, provisional, highImpact), `remediation: string[]`,
  `entryFrontier: string[]`, `qualityFlags: { lowConfidenceNodes, suspectedGuessing, fatigueRisk }`.
  Built from the existing `state` (demonstrated/inferred/incorrect/answered) + the posterior layer.
- **High-impact corroboration in routing:** when a high-impact node would be credited by INFERENCE
  alone (ancestor of a correct descendant, never directly probed), queue ONE direct probe before
  finishing (extends the existing `confirm` machinery; deterministic). If budget exhausted and
  still inferred-only → label UNCERTAIN (not INFERRED_READY).
- **Stopping rule (§4):** keep the localization stop, add a posterior-band guard — do not finish
  while any high-impact node sits in the ambiguous .45–.75 posterior band AND budget remains AND a
  direct probe exists. Raise `maxItems` to the MVD band (~40) with a hard cap; second-session split
  deferred (logged). Determinism preserved (pure replay; total-ordered queue).

## 5. Fatigue (§9) — config + session + UI

`DIAGNOSTIC_CONFIG.fatiguePauseAt = 25`. `DiagnosticSession` exposes `pauseDue: boolean` (asked ≥
pauseAt and not yet resumed). `DiagnosticFlow` shows a calm pause card ("You can pause here — this
helps place you correctly") with Resume. `fatigueRisk` set when post-pause accuracy drops ≥25 pts
across matched items; unresolved nodes after a fatigue flag are labeled UNCERTAIN (never NEEDS_WORK),
per §9. (Full 24h resume persistence deferred — flag + pause shipped.)

## 6. Types — `types/diagnostic.ts`

Add `DiagnosticPlacementLabel` (= cold-start's union), `DiagnosticNodeLabel` (label, posterior,
ciLow, ciHigh, evidenceCount, provisional, highImpact), and extend `DiagnosticResult` with
`labels`, `remediation`, `entryFrontier`, `qualityFlags`. Extend `DiagnosticConfig` with
`fatiguePauseAt` + the posterior/threshold constants (changing them stays a Matt checkpoint).

## 7. Seed handoff (§12)

Keep the working `creditFromDiagnostic` lock-credit path for READY/credited nodes (the seed that
the LIVE mastery-engine consumes). ADD the provisional labels + remediation to the result + UI so
the course routes NEEDS_WORK/UNCERTAIN into early remediation. Full per-label `node_mastery`
p_known seeding via `seedFromDiagnostic` is wired for when engine-v2 becomes the live mastery path
(seam exists; logged, not duplicated now). The diagnostic PLACES; the course CONFIRMS (§12).

## 8. Simulation (§4, MANDATORY) — `scripts/diagnostic-sim.mjs` → `phases/phase-6-simulation.md`

Generate N synthetic students with a known per-node "true mastered" pattern (varied frontiers +
guess/slip noise), drive the engine via simulated responses (correct ~ Bernoulli(known? 1-slip :
guess)), then compare predicted labels vs ground truth:
- **Classification accuracy:** sensitivity (true gaps → NEEDS_WORK/UNCERTAIN) ≥ target, specificity
  (true-ready → not NEEDS_WORK) ≥ target (§13 aims .80/.85; report actuals).
- **Length distribution:** items per student (min/median/max) to set a realistic MVD length band.
- **High-impact coverage:** every high-impact node directly tested or correctly inferred+confirmed.
Output the report; no length number is "committed" until this runs (§4).

## 9. UI — `DiagnosticFlow.tsx`

Already on the Test register (Phase 5, muted rewards). Add: the fatigue pause card; a calm
"about N more" non-count progress (existing `progress` rail); the summary surfaces the 4 labels +
the top remediation list + "Why this placement?" evidence counts (Trust = proof, STYLE_GUIDE §8.5).
No rewards (firewall, done Phase 5).

## 10. Files
**Create:** `lib/diagnostic-engine/high-impact.ts`, `posterior.ts`, `labels.ts` (+ tests);
`scripts/diagnostic-sim.mjs`; `phases/phase-6-simulation.md`.
**Modify:** `lib/diagnostic-engine/index.ts` (finish output + high-impact corroboration + stopping);
`types/diagnostic.ts`; `app/student/(shell)/diagnostic/DiagnosticFlow.tsx` (pause + label summary);
`app/student/(shell)/diagnostic/actions.ts` (carry labels through the result DTO).

## 11. Acceptance → GOAL checkboxes
- [ ] Four labels (READY/NEEDS WORK/UNCERTAIN/INFERRED-READY) + provisional + posteriors/CI emitted.
- [ ] High-impact nodes tested directly / never inferred-only (≥2 direct evidence).
- [ ] Structured multistage routing + KST inference + posterior-aware stopping.
- [ ] Remediation list + entry frontier + quality flags in the result.
- [ ] Fatigue pause + flag.
- [ ] Simulation report: classification accuracy + length distribution (§4 satisfied).
- [ ] New student completes placement; engine starts seeded (credit path intact); build+tests green.

## 12. Deferred (logged, justified)
- True IRT/CAT selector (§3 Phase-2, post-calibration) — MVD is structured multistage, not CAT.
- 24h resume persistence + full §13 validation (n≥200) — post-launch (§15a cut).
- Below-grade-5 emergency screener nodes + absolute-value/no-solution nodes — §15a v1.5.
- Dedicated `diag_items` Supabase table — MVD reuses neutral-P3 banks (§15a "alias p3"); the
  tagging (misconception_map/calculator_flag/equivalence_class/item_version) already exists on
  problems from Phase 2. Logged.
- Full per-label engine-v2 `node_mastery` p_known seeding — wired when engine-v2 goes live.

---

# §V2 REVISIONS (binding — supersede v1 on conflict; from phase-6-review/decisions)

**R1 — Curated high-impact set.** `lib/diagnostic-engine/high-impact.ts` exports
`HIGH_IMPACT_NODE_IDS = ["ALG-F02","ALG-F03","ALG-F08","ALG-E02","ALG-E03","ALG-E04","ALG-L05",
"ALG-L07","ALG-E13"]` (mr-kahn's §3a→node-id table) + `isHighImpact(nodeId)`; build-time assert each
id exists in the graph. CCSS set kept only as a secondary guard. Coverage gaps (no ordered-pair-as-
solution node; decimal/fraction/rational collapsed into ALG-F02) are LOGGED for v1.5, never fake-tagged.

**R2 — ≥2 DIRECT evidence for high-impact READY.** A high-impact node reaches READY only with ≥2
direct-correct points; <2 direct (inferred-only or 1-direct) → UNCERTAIN. Corroboration (R4) may add a
direct point; if budget can't reach 2 → UNCERTAIN, and the node is excluded from `demonstrated[]`.

**R3 — Posterior (Beta-Binomial, skeptical).** Priors: untouched Beta(1,1); inferred Beta(1,2)
(anti false-READY); descended-past Beta(1,2). Direct correct → a+=(1−slip), b+=slip; direct incorrect →
b+=(1−guess), a+=guess. guess=0.2, slip=0.1. posterior=a/(a+b); CI = mean±1.96·sd (Beta normal-approx,
clamped, labelled "rough", never shown as precise). All constants in `DIAGNOSTIC_CONFIG.posterior`
(named) → **Matt threshold checkpoint** (documented defaults, built, confirm-before-launch).

**R4 — Corroboration via `needsConfirm` widening (NOT a finish pass).** In `processAnswer`, extend the
`needsConfirm` trigger to also fire when the credited `pending` set contains a high-impact node lacking
≥2 direct-correct. Same `confirm` Target machinery → one code path, replay invariant intact.
`finishDiagnostic` stays a pure read-out. Every changed `index.test.ts` expectation is flagged in the diff;
add NEW tests: a high-impact node never enters `inferred`/`demonstrated[]` without direct evidence;
UNCERTAIN/INFERRED_READY never enter `demonstrated[]`.

**R5 — Stop rule INSIDE `nextItem`.** `nextItem` returns null when: queue empty OR asked ≥
provisionalMaxItems(40) OR (all high-impact resolved AND no high-impact node in the .45–.75 posterior
band with budget+probe remaining). Client and server compute the identical stop from the same pure
replay — no UI-side stop. Posteriors computed only where the stop needs them (high-impact), memoized per
replay (no all-node recompute in `nextItem`).

**R6 — Labels.** `labelNode` per §1: READY (posterior≥.85 ∧ ≥2 evidence; high-impact ≥2 DIRECT),
NEEDS_WORK (posterior≤.35 ∧ ≥2 fails, OR a foundational/root direct fail at 1 evidence), INFERRED_READY
(inferred-only, posterior≥.65, provisional; high-impact demoted → UNCERTAIN), UNCERTAIN (.36–.84,
inconsistent, or fatigue-flagged). The "1 hard constructed-response" READY branch is EXPLICITLY DEFERRED
(v1 items are numeric/short-answer; logged).

**R7 — One label type.** `DiagnosticPlacementLabel` union lives in `types/diagnostic.ts`;
`lib/engine-v2/cold-start.ts` imports it (underscore form canonical). No second label type.

**R8 — Determinism hygiene.** posterior.ts / labels.ts iterate `graph.nodes` (or sorted id list) only —
never raw Map/Set/Object.keys order. Mirror `finishDiagnostic`'s existing pattern. No clock, no RNG.

**R9 — Seed firewall + remediation read-side.** `demonstrated[]`→`creditFromDiagnostic` stays the ONLY
path to node_mastery. `labels`/`remediation`/`entryFrontier`/`qualityFlags` are placement metadata
returned to the client; remediation derived read-side from the immutable attempt/update log (no
`diag_results` write this phase). Test: INFERRED_READY/UNCERTAIN ⇒ no MasteryUpdate. entryFrontier
carries the provisional flag forward for inferred prereqs (course confirms, §12).

**R10 — §12 accreditation FLAG (Matt checkpoint).** Phase-6 labels are honestly provisional. The
PRE-EXISTING `creditFromDiagnostic` writing status `mastered`+masteredAt (diagnostic-READY treated as
course-mastered) is a §12 concern that predates Phase 6 and is a mastery-status-threshold change = HARD
Matt checkpoint. Flagged in phase-6-verify as a required pre-launch fix; NOT silently rewritten here.

**R11 — Simulation = `scripts/diagnostic-sim.test.ts` (vitest resolver, seeded LCG).** Reports overall +
**high-impact-subset** sensitivity (≥.80)/specificity (≥.85), **high-impact false-READY rate**, realized
length distribution (min/median/max), and a **procedural-over-brittle** scenario proving inference yields
no false high-impact READY. Whether the uncertain-middle needs the §4 split is reported. Output →
`phases/phase-6-simulation.md`. maxItems(40) is provisional until this runs (§4).

**R12 — UI.** `ItemScreen` keyed on the asked-index ordinal (corroboration can re-serve a node). Fatigue
pause card + the 4-label/remediation/"Why this placement?" summary on the Test register (Phase 5).

**Files (v2):** create `lib/diagnostic-engine/{high-impact,posterior,labels}.ts` (+ `.test.ts`),
`scripts/diagnostic-sim.test.ts`, `phases/phase-6-simulation.md`; modify
`lib/diagnostic-engine/index.ts`, `types/diagnostic.ts`, `lib/engine-v2/cold-start.ts` (import the union),
`app/student/(shell)/diagnostic/{DiagnosticFlow.tsx,actions.ts}`.

---

# §V3 REVISIONS (binding — fold Codex round-1 on v2; supersede on conflict)

**V3.1 — BKT likelihood-ratio posterior (replaces v2 Beta-mean).** `posterior.ts`:
`odds0 = p0/(1-p0)` with p0 by inference state (untouched 0.5; inferred 0.4 skeptical; descended 0.4);
per DIRECT correct `odds *= (1-slip)/guess`; per DIRECT incorrect `odds *= slip/(1-guess)`;
`posterior = odds/(1+odds)`. guess=0.2, slip=0.1 → 1 direct-correct ≈ .82, 2 ≈ .95, 1 incorrect ≈ .11.
This makes READY(≥.85) require ≥2 direct-correct (satisfies the high-impact rule by construction). CI =
rough Wilson interval on the binary direct-correct count (labelled rough; never shown precise). Inference
does NOT move the posterior (only direct responses do) → inferred-only high-impact stays at the prior →
UNCERTAIN. All constants in `DIAGNOSTIC_CONFIG.posterior` (Matt threshold checkpoint).

**V3.2 — Credit-propagation BLOCK (Codex blocking).** Excluding an unresolved high-impact node from
`demonstrated[]` is NOT enough — `creditFromDiagnostic` propagates to ancestors. Extend it with a
`blocked: Set<string>` param (unresolved-high-impact ∪ NEEDS_WORK ∪ UNCERTAIN nodes); ancestor
propagation must STOP at and never credit a blocked node. Add a test: a demonstrated descendant of a
blocked high-impact node yields NO MasteryUpdate for that high-impact node. (This is the real teeth of
§3a "never inferred-only" — mr-gates/creditFromDiagnostic touch = re-reviewed.)

**V3.3 — Per-serve direct evidence + high-impact re-serve (Codex high).** `responses` may repeat a
skillId. Replay tracks `directByNode: Map<id, boolean[]>` (per-serve). `nextItem`: a high-impact node
with exactly 1 direct-correct and posterior<.85 and budget remaining is re-served ONCE with a DISTINCT
neutral-P3 item (indexed by prior serve count); `settle` never auto-consumes a corroboration re-probe.
Build/test assert each HIGH_IMPACT_NODE_ID has ≥2 eligible neutral-P3 items; nodes with <2 can reach at
most 1 direct → conservatively UNCERTAIN (logged). Determinism preserved (item chosen by count index;
pure replay).

**V3.4 — Acceptance narrowed to covered high-impact (Codex high).** Phase-6 acceptance =
classification on the COVERED curated high-impact set. The simulation marks UNCOVERED bridge gaps
(ordered-pair-as-solution: no node; decimal/fraction/rational split: collapsed into ALG-F02) as
**UNMEASURED** in the report, not merely logged. GOAL "finds the 5-10 break-Algebra-1 gaps" is scoped to
the 9 covered bridges + the 2 named UNMEASURED gaps surfaced for v1.5.

**V3.5 — Fatigue defined from real data (Codex medium).** The pure session exposes only `pauseDue`
(ordinal ≥ fatiguePauseAt). `fatigueRisk` is computed read-side (or in finish with the response order):
accuracy on the last-K vs first-K matched-difficulty-tier items drops ≥25 pts, K≥4 each side; if fewer
than K post-pause matched items, `fatigueRisk` is left undefined (never guessed). Fatigue-flagged
unresolved nodes → UNCERTAIN (never NEEDS_WORK), per §9.

**V3 net:** the diagnostic stays a pure deterministic replay; the ONLY node_mastery path remains
`creditFromDiagnostic` (now blocked-aware); high-impact is never inferred-only AND never 1-item READY;
posteriors are BKT; the sim validates length + high-impact classification (incl. false-READY) and names
the unmeasured gaps. One Matt checkpoint stands (posterior/threshold constants + the pre-existing §12
credit-status-`mastered` semantics).
