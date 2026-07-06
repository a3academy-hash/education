# MANIFEST — A3 Archetype Library

**Status:** DRAFT (authoring). Gated: mr-kahn APPROVE required before freeze (BATCH_REGEN_SPEC §8 gate 1).
**Consumers:** BATCH_REGEN_SPEC §4.2 (`archetypes/manifest.json` contract), §3.2 (item-count target), §7 F-DEP; BATCH_REGEN_PATCH_voice §2–§3 (voice floors).
**Scope:** distribution rules for the 73 non-gold nodes. ALG-L06 is the frozen reference; it is never regenerated.

---

## 1. Version pin

```
archetypeLibraryVersion: 1.0.0
```

This is THE value the BATCH_REGEN harness F-DEP precondition checks. Freezing semantics:

- **Any** change to any archetype entry file (§2) **or to this manifest** bumps `archetypeLibraryVersion`. No silent edits at a pinned version, ever.
- The harness **refuses to run** (F-DEP hard stop, BATCH_REGEN_SPEC §7) if the run's pinned version is unset, or does not match the version stated here, or if any entry file's `version` disagrees.
- The machine-readable `archetypes/manifest.json` (nodeId → archetype set + target item count) is **DERIVED from this document at harness build time** — a separate gated task (mr-gates: harness; mr-kahn: content). **This document is the source of truth.** A derivation that disagrees with this document is a build bug, not a content decision.

## 2. Archetype inventory

Seven archetypes. Five populate the enriched item bank; two are lesson-embedded and are counted in the lesson, **not** in the item bank.

| Archetype | File | Role (one line) | Counted in |
|---|---|---|---|
| scaffolded-multistep | `archetype-scaffolded-multistep.md` | Multi-part item walking one problem in logged steps; capstone part asks meaning | Item bank |
| error-analysis | `archetype-error-analysis.md` | Shown work instantiating a registry misconception signature; student diagnoses the flaw | Item bank |
| predict-reveal | `archetype-predict-reveal.md` | Commit-then-see: student predicts, the resolve shows the consequence | Item bank |
| interactive | `archetype-interactive.md` | Manipulable visual (plot, drag, build); the interaction IS the answer | Item bank |
| discrimination | `archetype-discrimination.md` | Near-miss choice sets forcing a concept-vs-lookalike distinction (`interpretationSlot: false` — interpretation floors ride on scaffolded-multistep) | Item bank |
| embedded-check | `archetype-embedded-check.md` | One check per lesson fading stage; at least one in interpretation form | Lesson |
| worked-example | `archetype-worked-example.md` | Faded worked example (concrete → representational → abstract) | Lesson |

**Namespace caution:** the gold **deliverables** D1–D6 (lesson, items, …) and RUNTIME_TUTOR_SPEC's **transfer-battery dimensions** "D1–D4" are different namespaces (REVIEW_DIGEST warning). Files in this library citing "D4 rubric contract" mean the *deliverable* (taxonomy §3.3 + element table); citations of transfer dimensions say "transfer dimension" explicitly.

## 3. Node-type classification

Every node resolves to exactly one class. A classifier applies these criteria to node fields only (`objective`, `standards.ccss`, `domain`) — no human judgment call needed except at declared ties.

| Class | Decision criteria (from node fields) | Sample fits |
|---|---|---|
| **procedural** | Objective verb is algorithm execution: *solve, simplify, factor, compute, evaluate, isolate, extract*. Standards in EE.C/A-REI/A-SSE/N-RN families. The skill is a repeatable move sequence. | ALG-F01 (integer ops), ALG-E03 (multi-step equations), ALG-S02 (substitution), ALG-Q05 (radicals), ALG-Q10 (quadratic formula) |
| **conceptual** | Objective verb is *interpret, contrast, explain, identify the meaning of*; the target is a relationship or definition (slope-as-rate, function concept, parallel/perpendicular slope relations). Standards in F-IF/F-LE/8.F concept strands. | ALG-L05 (slope as rate), ALG-L14 (parallel/perpendicular) |
| **word-problem / modeling** | Objective centers on context→math translation: *model, write an equation for, represent a situation*. Standards in F-LE.A/A-CED families or objective names a real-world quantity class. | ALG-P04 (growth & decay modeling) |
| **graphing / representation** | Objective centers on the coordinate plane or on moving between representations: *graph, plot, construct, read from a graph/table/display*. Standards in S-ID.A/8.F.A representation strands. | ALG-D02 (data displays), graph-a-line nodes |

**Hybrids take the dominant class** (the class whose criteria match the objective's main verb). **Tie-break order for enrichment purposes: conceptual > graphing > word-problem > procedural** — conceptual first because enrichment exists to force meaning; graphing outranks word-problem because the representation is typically the node-specific *new* skill and the graphing row places enrichment where that skill is assessable (interactive-heavy), while modeling verbs recur across many nodes. ALG-L06 ("compute slope from coordinate pairs") is the canonical hard case: a conceptual/graphing hybrid whose objective verb reads procedural — it resolves **conceptual**, and the gold reference distribution is the conceptual anchor row below.

The full 74-node class assignment lands in the derived `manifest.json`; mr-kahn signs the assignment as part of the §8 gate-1 approval.

## 4. Distribution rules — enriched-archetype instances per node

Instances of the five item-bank archetypes, as a function of node class. Anchor: the gold reference (ALG-L06, conceptual) = **4 scaf / 3 ea / 2 pr / 3 int / 3 disc = 15** (`gold-node-items.json` counts block). Every class total stays in **12–15**.

| Node class | scaffolded-multistep | error-analysis | predict-reveal | interactive | discrimination | **Total** | Rationale |
|---|---|---|---|---|---|---|---|
| conceptual | 4 | 3 | 2 | 3 | 3 | **15** | Gold anchor row verbatim — meaning-heavy nodes get the full mix. |
| procedural | 5 | 4 | 1 | 1 | 2 | **13** | Algorithm nodes live on stepwise execution and buggy-work diagnosis; predict-reveal and interactive have little to reveal or manipulate. |
| word-problem / modeling | 4 | 3 | 2 | 2 | 3 | **14** | Translation nodes keep the scaf/ea/disc core; the scaf capstones carry the interpretation load, and modeling contexts make meaning asks cheapest and most valuable. |
| graphing / representation | 3 | 2 | 2 | 5 | 2 | **14** | The manipulable plane is the point of the node — interactive dominates; error-analysis on graphs is harder to stage faithfully, so it thins. |

**Lesson-side counts (fixed, all classes — from the gold lesson `GOLD_NODE_LESSON.md`):**

- **4 worked examples** with fading (§3: concrete P1 → representational P2 → negative-case P2 → abstract P3).
- **4 embedded checks**, one per fading stage (§4: EC1–EC4).
- **≥1 embedded check in interpretation form** (meaning ask, not computation — gold EC2 per QUESTION_VOICE §11 ADJUST #8).
- **Degradation (adopted rule):** a node with no honest signed/degenerate variant AND no Axis-B contrast runs a **3-stage lesson with 3 embedded checks**, flagged `stage3-absent` in the batch report and lesson appendix (GAP_NOTES §1.3); never a filler stage. mr-kahn adjudicates flagged lessons at the batch gate.

## 5. Phase split rules

**The phase bands bind the whole node bank** (core + enriched) — that is where the harness checks them (mr-kahn ruling, gate 1). At enriched granularity the bands are *targets*, not integer-satisfiable constraints (a 13-item enriched set has no integer P1 count inside 25–30%). The hard enriched-level constraints are **(i) P3 non-empty** and **(ii) ≥1 P3 scaffolded instance** (required independently by archetype-scaffolded-multistep §a.7's fading capstone and §7's carrier arithmetic). Bands, from the gold spread — 4 P1 / 6 P2 / 5 P3 of 15 (`gold-node-items.json`):

- **P1 (sport context): 25–30%**
- **P2 (blended): 35–40%**
- **P3 (neutral academic): ≥30%**, and **P3 non-empty is a hard structural invariant** (BATCH_REGEN_SPEC §5.2 step 3) — mastery requires demonstrated neutral transfer, so a node with an empty P3 set fails validation regardless of anything else.
- **Standalone-P3 realistic values: 30–40%**, binding the **whole-bank standalone-P3 slice** (harness scope). Anchors: SAT 30% (operative); gold post-ADJUST 2/5 of P3 enriched items per the instrument's own denominator (QUESTION_VOICE §11.1 row 10). Construct-integrity exemptions apply: integer-snap interactives and boundary-construct clean numbers are exempt by design (archetype-interactive §a.2, archetype-discrimination §a.8).

**Phase discipline (no exceptions):** P1 = sport context, P2 = blended, P3 = neutral. An archetype instance's declared phase binds its context register; the archetype's `phaseApplicability` field limits where it may instantiate. No sport skin in P3, ever — P3 items are the mastery-transfer evidence.

## 6. Enriched item-count target

- The manifest's per-node number (§4 row totals, 12–15) is the **enriched-instance count only**.
- The enriched set is **ADDITIVE** on top of the regenerated core bank: baseline ~62 items/node (28 P1 / 28 P2 / 6 P3 pull, BATCH_REGEN_SPEC §0) is regenerated to the new quality bar, and the enriched archetype instances land on top, toward the **~100 items/node total-bank target** (BATCH_REGEN_SPEC §3.2 — which defers the exact number to this manifest by design).
- Arithmetic: regenerated core (~85–88, after the core regen rebalances the thin 6-item P3 pull upward to meet §5) + enriched instances (12–15) ≈ 100.
- **Procedural nodes may run lower** (thin conceptual surface = fewer defensible enriched instances and a smaller natural core). Under-target procedural nodes are **GAP_NOTES territory**: the harness flags them in the batch report; they are not padded with filler items to hit a number.

## 7. Voice-floor satisfaction rule

Per BATCH_REGEN_PATCH_voice §2: `manifest.json` MUST select, per node, an archetype mix whose `interpretationSlot` coverage can meet the §3.1 floors. The rule is stated against the **`interpretationSlot` field**, not a hard-coded archetype list (entries are drafted in parallel; the field is authoritative):

- **Floor 1 — instruction register:** ≥25% of the node's instruction-register items carry a meaning-in-context ask **anywhere** in the item.
- **Floor 2 — standalone-P3 bank:** ≥13% of standalone-P3 items ask interpretation as the **final** ask.
- **Manifest obligation:** floor satisfiability = the enriched slice in-band (below) **plus** explicit core-regen quotas for BOTH floors carried in the core-regen prompt. A row/phase combination out of band, or a core-regen prompt missing either quota, is a manifest defect, fixed here — not a generation prompt problem.

**Carriers (per the entry files — the field decides):** **scaffolded-multistep is the only item-bank archetype with `interpretationSlot: true`.** Its entry requires every instance to carry a meaning ask somewhere: interpretation capstone on instruction instances, interpret-then-generalize progression on P3 fading instances (compute → use → interpret → generalize; gold scaf-03 carries its meaning ask mid-item). The embedded-check interpretation form carries the lesson side; it does not feed the bank floors. Discrimination, error-analysis, predict-reveal, and interactive all declare `interpretationSlot: false`.

**Floor 1 binds the whole node bank** (mr-kahn ruling, gate 1): the patch §3.1 check runs per node over all generated items, so ~4 scaf instances among ~60 core instruction-register items is ~7% without a core obligation. The core-regen prompt MUST therefore carry the explicit quota: **≥25% of the bank's instruction-register items carry a meaning-in-context ask anywhere.**

**Enriched-slice self-conformance** (guarantees the interpretation-capstone and fading-capstone forms exist in every bank and that the enriched slice never dilutes the floor — it is NOT the satisfaction proof): interpretation-anywhere carriers = the row's scaf count; enriched instruction items = row total minus standalone-P3 instances (~3–4), with the P3 scaf counting as instruction-register per QUESTION_VOICE §10's scoping:
conceptual 4/≈11 ≈ 36% · procedural 5/≈10 ≈ 50% · word-problem 4/≈10 ≈ 40% · graphing 3/≈10 ≈ 30% — all ≥25%. Graphing has the least slack; below 3 scaf the enriched slice itself falls out of band — a manifest defect.

**Floor 2 (standalone-P3 final-ask interpretation ≥13%) binds at the whole-bank level, not the enriched set.** Stated plainly: the gold *enriched* standalone-P3 slice (ea-03, pr-02, int-03, disc-01) contains **zero** interpretation-final asks — QUESTION_VOICE §11.1's "20% final" is an all-items figure, not this slice. The floor is therefore a **core-regen obligation**: the regenerated core bank's standalone-P3 slice MUST schedule ≥13% single-ask interpretation items in the assessment register ("which sentence says what N means" — the EC2 belief-form keying mode, per archetype-embedded-check, worn as a bank item). The harness's per-node voice validation checks the whole bank, so this lands automatically — but the manifest states the obligation so the core-regen prompt carries it explicitly.

## 8. F-DEP checklist — harness preconditions

Before any run, the harness verifies ALL of the following; any failure is a **hard stop** (BATCH_REGEN_SPEC §7 F-DEP class):

1. **Version pinned + matches:** run config pins `archetypeLibraryVersion`; it equals §1's value; derived `manifest.json` carries the same value.
2. **All 7 entry files present** (§2 inventory) at the pinned version, each entry's `version` consistent with the library version.
3. **Every target node classified:** each of the 73 nodes resolves to exactly one §3 class in `manifest.json` (ties resolved per the declared tie-break, mr-kahn-signed).
4. **Distribution row resolved:** each node's class maps to exactly one §4 row; per-node enriched-instance count is in 12–15; the enriched hard constraints hold (P3 non-empty, ≥1 P3 scaffolded instance); §5 bands are checked whole-bank post-generation.
5. **Voice floors satisfiable:** per node, (i) the enriched mix's `interpretationSlot` coverage is in-band per §7, AND (ii) the core-regen prompt carries both §7 core quotas (≥25% instruction-register meaning-anywhere; ≥13% standalone-P3 interpretation-final) — deterministic check before any generation tokens are spent.
6. *(Inherited from BATCH_REGEN_SPEC §7 / voice patch §1, restated for completeness):* post-diff misconception registry frozen; voice-contract slice present and commit-pinned.

## 9. F-OVERFLOW split flag (mr-kahn ruling, gate 1)

Every derived `manifest.json` node entry carries **`splitPreemptively: bool`**, computed
deterministically: *estimated output tokens* = Σ(archetype-instance counts × per-archetype
median token weight, measured from the gold JSON) + (core item count × core-item weight)
**> safety-factor × the run's `max_tokens`**. The weights and the safety factor are
engineering constants fixed at the `manifest.json` derivation gate (mr-gates); the criterion
shape is content law now. Non-negotiable in the rule text:

- The split unit is **phase** — separate P1/P2/P3 requests merged host-side (BATCH_REGEN_SPEC §7 F-OVERFLOW handling).
- All whole-bank properties (§5 phase bands, §7 voice floors) are validated **only on the merged bank, never per fragment**; per-fragment item counts are validated **before** merge — agents demonstrably under-produce P1/P2 in fragments (batch-6 record).
