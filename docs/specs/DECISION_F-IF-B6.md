# DECISION_F-IF-B6 — Average Rate of Change coverage gap

**Type:** Decision record (a *proposed* graph change — this document changes **no** graph, registry, or Supabase state).
**Status:** **PROPOSED — awaiting Matt approval.**
**Date:** 2026-07-03. **Author:** main session (remote/mobile design). **Reviewers required:** mr-kahn (curriculum/standards/accreditation), mr-gates (graph/schema) before any implementation.
**Session gates honored:** no graph edits, no registry-diff application, no Supabase writes, no `docs/gold-node/` edits. All graph facts below are **read-only-verified against the pinned baseline `data/algebra1-graph.json` schema `1.11.0`** (git-authoritative per `logs/REMOTE_DESIGN_LOG.md`).

---

## 1. The gap, precisely

**What the standard requires.** CCSS **F-IF.B.6** (HSF.IF.B.6): *"Calculate and interpret the **average rate of change** of a function (presented symbolically or as a table) over a **specified interval**. Estimate the rate of change from a graph. ★"* Three load-bearing pieces: (i) it is an operation on a **function** `f`, computed **symbolically** as `(f(b) − f(a)) / (b − a)`; (ii) it is defined **over an interval [a, b]**, which is meaningful precisely because for a **non-linear** function the rate *varies* by interval (the average/secant rate is the whole point — a constant rate is the degenerate case); (iii) it must be reachable from three representations — **table, symbolic, graph (estimate)**.

**What ALG-L05 actually covers.** ALG-L05 "Slope as Rate of Change" (domain `linear`, tier 2; prereqs `[ALG-L01, ALG-F10]`; standards `[8.EE.B.5, F-IF.B.6]`). Objective (verbatim): *"Interpret slope as a constant rate: change in output per unit input."* This is the **8.EE.B.5** framing — **constant** rate for **proportional/linear** relationships, unit-rate as slope. L05 does not require function notation (that is ALG-L03, `F-IF.A.2`), so it cannot present F-IF.B.6's symbolic form `(f(b) − f(a))/(b − a)`; and its objective is explicitly the **constant**-rate case, the conceptual opposite of the varying, interval-dependent average rate.

**The precise delta (what F-IF.B.6 needs that L05 does not deliver):**
1. Average rate over a **specified interval** as the object of study (the secant slope), not "the" slope of a line.
2. The **symbolic function form** `(f(b) − f(a))/(b − a)` — which presumes function notation (L03).
3. Application to **non-linear** functions, where the rate is interval-dependent — the case that makes "average" meaningful.
4. The **three-representation** demand (table / symbolic / graph-estimate) applied to average rate specifically.

**Current mitigation (short-term patch).** The gold-node work forces the nonlinearity check onto L05: taxonomy entry **§2.14 `assumes-constant-rate-nonlinear`** is authored as L05's *"primary and mandatory home"* precisely because *"F-IF.B.6 lives on L05 with no downstream average-rate node in the current graph"* (`docs/gold-node/misconception-taxonomy-slope.md` §2.14, structural finding §7). Those D3 discrimination items test *"is the rate even constant?"* — a **necessary guard, but not instruction or assessment of** *calculating and interpreting* average rate over an interval. The standard is **claimed on L05 but only partially delivered.**

---

## 2. Options

### (a) Extend ALG-L05 to cover F-IF.B.6 in full
Add average-rate-over-interval instruction + items to L05.
- **Cost:** re-author L05 to a much larger objective; likely add `ALG-L03` (function notation) as an L05 prereq to reach the symbolic form — itself a DAG mutation.
- **Risk:** L05 is already **overloaded and load-bearing**. Per the taxonomy it is (i) the mandatory home of the nonlinearity BLOCKER entry, (ii) the carrier of 8.EE.B.5 constant-rate, and (iii) the **backward-routing target** for multiple BLOCKER entries (`forgot-denominator`, `slope-as-difference`, `rate-not-per-unit` all route *to* L05). Fusing "constant rate" (L05's thesis) with "average/secant rate that varies by interval" (F-IF.B.6) into one node conflates two conceptually opposed ideas, muddies the mastery-gate objective, and makes "why NEEDS-WORK" harder to explain. **Rejected.**

### (b) Add a new average-rate-of-change node in the functions cluster ✅
A dedicated node (proposed **ALG-L19**), prereqs L05 + L06, that owns F-IF.B.6.
- **Cost:** one graph mutation (1 node + prereq edges + standards re-home); author it to the regen enriched standard (~100 items). One more node to maintain.
- **Risk:** low and contained — isolates the standard, gives it correct prerequisites, and *relieves* L05. Must be sequenced with the gold-node registry diff (§5) because its misconception surface uses tags the diff adds.

### (c) Accept the gap — discrimination items only
Keep the §2.14 items on L05 as the sole F-IF.B.6 touch; author nothing new.
- **Cost:** $0 now.
- **Risk — accreditation exposure (the decisive factor):** F-IF.B.6 is a **named CCSS standard the course claims**. Cognia-style accreditation and NCAA nontraditional-course review both require a **defined scope & sequence mapping each standard to actual instruction and assessment**. Discrimination items that only ask *"is this rate constant?"* neither **teach** nor **assess** *"calculate and interpret the average rate of change over a specified interval"* symbolically / from a table / from a graph. The standard would be **documented-but-not-delivered** — precisely the finding an accreditation audit flags, and a scope-and-sequence hole against the NCAA "defined scope & sequence" requirement (`CLAUDE.md` compliance posture). Every attempt/mastery event is logged as evidence; a standard with no substantive home makes that evidence trail *show* the gap. **Rejected.**

---

## 3. Recommendation — option (b), a new node

**Add a dedicated average-rate-of-change node.** Justification against (a), grounded in L05's current load:

- L05 is already the **mandatory home** of `assumes-constant-rate-nonlinear` (BLOCKER) and the **backward-routing sink** for several other BLOCKER entries — it is the node the engine sends struggling students *back to*. A node that is a remediation destination should stay conceptually **narrow and stable**, not absorb a second, harder standard.
- L05's thesis is **constant** rate (8.EE.B.5); F-IF.B.6's thesis is **average/varying** rate over an interval. Co-locating opposites on one node weakens the mastery-gate signal and the parent-facing explanation.
- The symbolic form needs **function notation (L03)**, which L05 does not currently require — extending L05 forces a prereq change anyway, so (a) is not even the cheaper mutation it appears to be.
- A dedicated node lets the nonlinearity entry (§2.14) live where it belongs (average-rate reasoning), lets L05 revert to a clean constant-rate/unit-rate node, and gives the standard a defensible scope-and-sequence home for accreditation.

---

## 4. Draft shape of the new node (proposed — verify at authoring)

| Field | Proposed value | Verification / note |
|---|---|---|
| **Node ID** | **`ALG-L19`** | Next free L-index (L01–L18 are contiguous). DAG order is set by `prereqs[]`, **not** by numeric position, so appending L19 with the prereqs below slots it correctly after L05/L06 — **no renumbering** of L07–L18 (which would break the gold node, regen, and every reference). |
| **Title** | "Average Rate of Change over an Interval" | |
| **Domain / tier** | `linear` / `2` | Same band as L05/L06; it is a linear-cluster function node. |
| **Prerequisites** | **`[ALG-L05, ALG-L06]`** (minimum, per task) **+ recommend `ALG-L03`** | Verified against 1.11.0: L05 (rate-as-change-per-unit concept), L06 (two-point slope machinery), L03 (Function Notation, `F-IF.A.2`) all exist. L03 is the *symbolic-form* prereq — F-IF.B.6's `(f(b)−f(a))/(b−a)` presumes function notation; mr-kahn to confirm L03 as prereq vs. optional. |
| **Learning objectives** | 1) Calculate the average rate of change of a function over a specified interval **[a,b]** from a **table**. 2) Compute it **symbolically** as `(f(b) − f(a))/(b − a)`. 3) **Estimate** it from a **graph** (secant slope). 4) Recognize that for a **non-linear** function the average rate **depends on the interval**, and interpret its sign/magnitude in context. | Maps 1:1 to F-IF.B.6's three representations + the interval-dependence idea. |
| **Standards** | **`F-IF.B.6` (primary/assessment home moves here)**; L05 retains `8.EE.B.5` | *Proposed re-home* to avoid double-claiming the standard in scope-and-sequence (accreditation wants one clear assessment home per standard). Whether L05 keeps F-IF.B.6 as an "introduces" cross-reference is an mr-kahn call — part of the gated mutation, **not** done here. |
| **Misconception surface** | See below | Uses registry entries the gold-node diff *adds* — hence the §5 sequencing gate. |
| **Item-count target** | **~100 enriched items** (per the regen enriched standard, `BATCH_REGEN_SPEC` §3.2) | Full enriched shape: P1 sport / P2 blended / **P3 neutral (required for mastery)** + error-analysis + representation-variety (table / graph / symbolic) + rubric explanation + transfer battery D1–D4. |

**Misconception surface (verified against the slope taxonomy; extends here — confirm/extend at authoring, new IDs gated to mr-kahn):**
- **`assumes-constant-rate-nonlinear` (§2.14)** — *nonlinearity blindness.* This is L19's **natural primary home**; it is currently forced onto L05 *only because L19 does not exist yet*. Moving/sharing it here is the structural point of this proposal.
- **`rate-not-per-unit` (§2.10)** — *non-normalized rate.* Extends directly: students report `f(b) − f(a)` over the raw interval without dividing by `(b − a)` — the average-rate analogue of the slope-chunk error.
- **`slope-as-single-point-ratio` (§2.9)** — adjacent: reading an average rate off a single point (`f(x)/x`) instead of across the interval.
- **`forgot-denominator` (§2.1), `slope-as-difference` (§2.6)** — recur as prerequisite-gap symptoms; on L19 they route **backward to L05** (their stated remediation surface), which is exactly why L19 depends on L05.
- **Candidate NEW entry for mr-kahn (do not add here):** an *"average-rate-as-endpoint-value"* / *"reads average rate as `f(b)`"* belief specific to the function-notation form — flag as engineering-candidate for validation, **not** an approved registry entry.

---

## 5. Sequencing — a hard gate

> **GATE (Matt, on desktop return):** This graph mutation (new node ALG-L19 + prereq edges + F-IF.B.6 re-home) applies **together with the gold-node misconception registry diff** (`docs/gold-node/misconception-taxonomy-slope.md` §4: 4 redefine, 10 add, 1 re-key) in **one atomic, Matt-reviewed batch**. It is **not** applied independently and **not** applied in this session.

**Why coupled:** L19's misconception surface keys to registry entries the diff *adds* — `assumes-constant-rate-nonlinear` and `rate-not-per-unit` are ADD items (#14, #10) in the diff. The node cannot be validly keyed until those entries exist, so shipping the node before the diff would produce an invalid graph state, and shipping them separately doubles the review surface. One batch = one coherent review.

**Inherits the existing promotion preconditions** (`BATCH_REGEN_SPEC` §8): the diff's **1 live-item re-key must be re-verified against the 1.11.0 bank** (7a, mr-kahn) and **Supabase must be reconciled to 1.11.0** before promotion (7b, mr-gates). This proposal adds nothing to those; it rides the same gated batch.

**This document updates nothing else.** No node, edge, registry entry, standard mapping, or Supabase record is changed by authoring this record.

---

## 6. Status

**PROPOSED — awaiting Matt approval.** On approval: mr-kahn confirms the node objectives + prereq set (esp. L03) + misconception re-home and the F-IF.B.6 standards move; mr-gates confirms the DAG mutation; the node is authored to the enriched standard via the regen pipeline; and the whole thing lands in the single gated batch of §5.
