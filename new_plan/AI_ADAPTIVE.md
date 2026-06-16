# AI_ADAPTIVE.md — What "AI Adaptive" Must Mean (Algebra 1)

**Version:** v0.2 (integrates Grok adversarial review per chair decision; ChatGPT pass optional -> v0.3)
**Companion to:** CLAUDE.md, DIAGNOSTIC.md, STYLE_GUIDE.md, SECURITY_DB_REPORTING.md.
**Thesis:** "AI adaptive" = a live, per-student knowledge graph that continuously re-estimates
what the student knows AND how well it will STAY known, optimizing for **durable, transferable
mastery** — **delivered through an interaction that feels fast, fluid, and rewarding.**

---

## 0. THE FIRST-CLASS DESIGN CONSTRAINT (read before anything else)

The fatal question is NOT "can we build a live graph?" It is:

> **Can we optimize durable retained transfer WITHOUT making the experience feel slower, harder,
> clunkier, or more annoying than Alpha-style fast progress?**

If a 15-year-old athlete experiences this as "slow and tedious," they quit before the retention
payoff is ever felt — and the superior metric becomes irrelevant. So this is a hard design
constraint, not a footnote.

**The resolution — separate two things the literature conflates:**
- **Cognitive effort** = the mental work of retrieval, transfer, productive struggle. We keep
  this HIGH on purpose; it is what produces durable learning (desirable difficulties).
- **Interaction friction** = waiting, lag, clunk, confusing flow, busywork. We drive this to
  ZERO.

**The student should feel: fast, fluid, responsive, rewarding — while their brain is working
hard.** Alpha feels good partly because it is snappy AND because it optimizes speed-to-pass. We
keep the snappiness and redirect the effort into durable retrieval instead of removing effort.
The difficulty is in the thinking, never in the interface. Every architecture decision below is
subordinate to this constraint.

---

## 1. What v0.2 changed (from the Grok review)
1. **Level 5 is repositioned as the aspirational, validated target — NOT the v1 build.** v1 is a
   robust, buildable Level 4 (§2, §13).
2. **The engine is modular, not monolithic** — separate, explicitly-interacting layers (§5).
   Naive single-surface fusion double-counts evidence and destabilizes.
3. **Explicit cold-start policy** mapping the diagnostic seed into the live graph (§6).
4. **Alpha critique steelmanned** to its defensible form (§3).
5. **Engagement guardrails added as a first-class subsystem** (§8).
6. **Latency/cost limits + the "must feel fast" rule made hard requirements** (§0, §9).

---

## 2. The adaptivity maturity ladder (narrative tool) + the v1 target

| Level | What it does |
|-------|--------------|
| 0-1 | One sequence / fixed tracks |
| 2 | Rules/branching (if-fail-remediate) — most "adaptive" edtech |
| 3 | **Mastery-gated, personalized pace** — ALEKS, Math Academy, **Alpha** |
| 4 | **Model-based:** live mastery estimate per skill + decay modeling; next item by value |
| 5 | **Durable-mastery adaptive (ASPIRATIONAL, VALIDATED TARGET):** Level 4 + HOW adaptation (representation switching) + transfer-gating + generative LLM re-explanation, validated against delayed retention |

Use the ladder to explain to parents/coaches/investors why A3 differs from Alpha ("Alpha is
Level 3; we build Level 4 toward 5"). But **the build does not jump to Level 5.**

**v1 BUILD TARGET (explicit):** BKT/KST acquisition + FSRS-style retention decay + diagnostic
seed + a **rule-based selector**, with the **LLM advisory only.** Full generative re-explanation
and transfer-gating are Phase 3-4 (research-frontier), not v1.

---

## 3. The standard (Alpha) and the steelmanned critique

**Alpha gets right (strong Level 3):** mastery-gated no-gaps progression (90% gate), content to
knowledge-grade not age, spaced revisits baked in, a vision model watching process, a closed
feedback loop, motivation engineered first-class. Keep all of it.

**The critique, steelmanned (the defensible version):**
- Steelman: Alpha's 90% gate + baked-in revisits ARE a partial form of spaced practice; MAP is a
  semi-delayed measure; their closed loop likely analyzes durable growth internally; they **may
  have internal retention logic not visible publicly.**
- The standing critique: **there is no public evidence of explicit per-node decay modeling,
  scheduling review before predicted lapse, or controlled delayed post-tests.** Alpha lets
  retention **emerge as a side effect** of mastery gates and optimizes a **speed** narrative
  ("a grade in 20-30 hours").
- **A3's differentiator:** make retention and transfer **first-class, explicitly optimized, and
  reportable** (per-node decay, review scheduled before lapse, mastery validated at delay) —
  rather than emergent and unmeasured.

(This is the fair version: not "Alpha optimizes against retention," but "Alpha leaves retention
implicit; we make it explicit and prove it.")

---

## 4. The full adaptation surface (what the engine decides)
WHAT (which node) | HOW (representation/modality/context) | HOW MUCH (dose/load) | DIFFICULTY
(success-band target) | MASTERED? (probabilistic, transfer-gated) | REVISIT? (spaced schedule) |
RETAINING? (decay estimate) | PACE + CURRICULUM (re-estimated; meta-loop). HOW-adaptation is
Phase 3; the rest are v1.

---

## 5. The modular engine architecture (replaces v0.1's monolithic surface)

**Separate, explicitly-interacting components — NOT one probability surface** (naive fusion
double-counts a single retrieval as evidence in two models and destabilizes).

- **Acquisition layer (BKT/PFA spine):** per-node `p_known` with params (prior/learn/guess/slip),
  hierarchical or per-node. Updates on every graded attempt.
- **Retention layer (FSRS / half-life regression):** per-node stability/halflife. Updates ONLY
  on retrieval attempts (success strengthens stability/extends halflife; failure weakens;
  time-since-last modulates). Decays between sessions to compute current `p_recall(t)`.
- **Explicit interaction rule (not implicit):**
  - Successful retrieval -> raise BKT `p_known` AND extend retention stability.
  - Failed retrieval -> BKT slip/guess handling AND weaken retention.
  - New-node acquisition attempt -> primarily BKT update; retention params inherit population
    prior until the first retrieval.
- **Prerequisite propagation (damped, soft KST):** after each update, light probabilistic
  propagation along prereq edges (success on a dependent softly raises prereqs; failure on a
  foundational softly lowers dependents). Damped to avoid over-inference.
- **Selector utility (composite score):** expected immediate learning gain (BKT uncertainty
  reduction / info gain) + expected **retention-preservation** benefit (probability the node
  would decay below threshold without review) + small transfer-coverage bonus.
- **Advisory layer (LLM / DKT only):** feeds the selector as features; **never the gating
  authority.**
- **Gating layer:** BKT/KST/IRT decide mastery lock, revisit scheduling, and all reporting —
  interpretable, so "why NEEDS-WORK" is explainable to parents/NCAA.

Modular = independently calibratable, interpretable, and buildable in Phase 1-2 with existing
libraries (BKT implementations, FSRS ports), with room for later DKT enrichment.

---

## 6. Cold-start policy (diagnostic seed -> live graph)

**Initialize from the diagnostic (DIAGNOSTIC.md) labels:**
- `READY` -> high `p_known`, high confidence.
- `NEEDS WORK` -> low `p_known`.
- `UNCERTAIN` -> mid probability, high uncertainty.
- `INFERRED-READY` -> provisional only (KST-propagated, not locked).
- Use diagnostic evidence count as initial BKT "attempts seen."

**Retention bootstrap:**
- Every node starts with **population/literature priors** (e.g., FSRS default stability of a few
  days for novel math; halflife ~2-7 days).
- After the **first successful retrieval**, switch to personalized update.
- For the **first 3-5 retrievals** per node, blend personalized + population prior
  (empirical-Bayes style) to stabilize early estimates.
- **Shadow decay predictor** runs on literature priors alongside scheduled delayed re-tests;
  discrepancies refine population priors in the first 4-6 weeks.
- **First-cohort mitigation:** bias the selector toward easier difficulty (~75-80% success),
  more explicit scaffolding, short prereq chains; flag early placements as "provisional - high
  model uncertainty" with "building your model" messaging.

Item cold-start: expert/pilot-calibrated IRT difficulty as the starting point, updated online.

---

## 7. Performance vs. learning (the retention firewall)
Never lock mastery on massed/immediate performance (it may be cramming, not learning). **Mastery
locks only on spaced, delayed, UNSEEN retrieval** (CLAUDE §3, DIAGNOSTIC §3), and the retention
model must confirm the node is holding over time. The objective is **retained, transferable
mastery at delay**, never time-to-first-pass — but governed by the engagement guardrails (§8) so
it never becomes punishing.

---

## 8. Engagement guardrails (first-class subsystem — durable retention must not become misery)

Durable-retention optimization without guardrails Goodharts into punishing pacing and churn.
Hard guardrails:
- **Composite objective:** primary = expected retained transfer at delay; **guardrail =
  engagement/completion + session-level success rate.**
- **Target success band: 70-90%** per session (avoid both no-learning ease and frustration).
- **Max review burden per session** (cap how much "maintenance" retrieval can crowd out
  forward progress; never let a session feel like all re-testing).
- **"Fast but fragile" dashboard flag** — surfaces the Alpha failure mode (fast acquisition,
  poor retention) early, to student/parent/coach.
- **Visible retained-mastery progress** — show "retained nodes" alongside the effort rings
  (STYLE_GUIDE) so the durable-learning value is felt, not just asserted.
- **Frustration fallback:** on detected frustration patterns (consecutive errors, rage-quit
  signals, latency spikes in responses), drop to an easier scaffold / reachable win.
- Affective + engagement signals (rings, session cadence, frustration detection) feed the
  selector to modulate difficulty, dose, and representation in real time.

---

## 9. Latency, cost & the "must feel fast" rule (hard requirements)

The interaction must be **quick, fluid, and snappy — never slow or clunky.** Hard rules:
- **No LLM call on every interaction.** The common path NEVER waits on a model call.
- **LLM only after a stuck / low-confidence state** (consecutive errors, or low `p_known` + high
  uncertainty).
- **Cached explanations + misconception tags;** precompute likely next-item candidates.
- **<800ms target for normal selector response;** profile end-to-end under load.
- **Graceful non-LLM fallback** if the model path is slow or unavailable — the lesson never
  stalls.
- **Async model updates:** knowledge-graph and retention updates run server-side without
  blocking the UI; optimistic UI on submit. The student feels instant; the math happens behind
  the curtain.
- The only "slowness" the student should ever feel is their own thinking — never the system.

---

## 10. The meta-loop (curriculum improves itself — open + validated)
Continuous IRT recalibration from aggregate responses; representation/sequence A/B tested against
**durable retention at delay** (not engagement); prereq-edge + granularity refinement from data;
validated against a control (CLAUDE §15). Needs an explicit experimental design: control
condition, defined delay intervals for retention/transfer tests, primary endpoint, power
analysis. Add fairness/bias auditing of the per-student model and the A/B tests.

---

## 11. Pace & reporting integration
The graph yields a live pace estimate (mastery velocity x retention stability vs. the course node
set) -> dashboards (SECURITY_DB_REPORTING §12) as ahead/on-track/behind, distinguishing "behind"
from "wasting time" (high time, low durable gain) from "fast but fragile." Re-projected
continuously.

---

## 12. Hard problems / honest limits
Cold-start (mitigated §6); credit assignment (KST imperfect — wrong attribution misroutes
remediation); retention bootstrap (needs longitudinal data — §6 shadow predictor bridges it);
Goodhart/proxy risk (validation firewall + guardrails); interpretability vs. power (interpretable
gates, advisory DKT/LLM); generative content quality (item-equivalence, DIAGNOSTIC §9);
**cost/latency (§9 hard budget)**; long-inactivity gaps (strong decay + a "welcome back" review
sequence / lightweight re-diagnostic on return); multi-session/device + family continuity.

---

## 13. Build roadmap
- **Phase 0:** knowledge graph schema (per-node `p_known` + retention state); BKT + damped-KST
  update + propagation; diagnostic-seed initialization (§6). Hand-set priors.
- **Phase 1:** modular engine (§5) + rule-based selector (acquire/resolve/maintain) + FSRS-style
  spaced scheduling; <800ms budget + non-LLM fallback (§9).
- **Phase 2:** retention firewall (lock only on delayed unseen) + engagement guardrails (§8) +
  pace estimate to dashboards.
- **Phase 3 (research-frontier):** HOW adaptation (representation switching) + LLM advisory layer
  (stuck-state diagnosis, Socratic scaffolding, generative re-explanation — governed, gated).
- **Phase 4:** meta-loop (IRT recalibration, representation A/B, graph refinement, fairness
  audit), validated vs. delayed-retention control.
- **Phase 5 (optional):** DKT/transformer signal as advisory input where it beats the
  interpretable spine; kept out of gating.

---

## 14. Assumptions to attack (remaining)
1. **[ELEVATED TO PRIMARY]** Durable-retention optimization can be delivered through a fast,
   fluid interaction without feeling slower/harder/clunkier than Alpha — i.e., the §8 guardrails
   + §9 latency rules actually hold in practice. *This is the make-or-break assumption.*
2. The modular acquisition + retention layers (§5) compose cleanly via the explicit interaction
   rule without double-counting or instability.
3. The diagnostic seed + empirical-Bayes retention bootstrap (§6) gives usable early behavior
   without systematically misplacing first cohorts.
4. Interpretable gates + advisory DKT/LLM capture the value without leaving fatal accuracy on the
   table.
5. Per-interaction tracing + decay + (stuck-state) LLM stays within the <800ms budget at A3 scale.
6. Credit assignment via damped KST is accurate enough that remediation routing is usually right.

## 15. Note for the chair
This v0.2 integrates Grok per your direction. A ChatGPT pass (watch-points: monolithic-vs-modular
fusion; whether it also ranks the engagement/speed tension as fatal; interpretability-vs-power)
can fold into a v0.3. Given this is doc #5, a cross-doc consistency pass is now warranted — the
engagement-vs-rigor tension and the shared mastery definition thread through all five docs and
should say the same thing everywhere.
