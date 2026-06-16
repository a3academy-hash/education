# CLAUDE.md — Adaptive Math Course

**Version:** v0.2 (post board-review: Claude / Grok / ChatGPT)
**Status:** Authoritative roadmap-driving document. Decisions here are committed unless a section is flagged `MUST-VALIDATE`.
**Stack:** React 19 + Vite + Supabase (Postgres, RLS, RPC), Vercel.
> *Stack adjudication (ADR-0001, 2026-06-15): the React-19 host is **Next.js App Router** (server
> actions are thin wrappers over Postgres `SECURITY DEFINER` RPCs); "Vite" is superseded as an
> implementation default. All RLS/RPC/server-grading behaviors remain binding. See
> `docs/adr/0001-stack-next-over-vite.md`.*

---

## 0. North Star

Teach math so durably that the student can solve the underlying structure **after the surface
context, representation, and story are stripped or swapped.** Engagement is the gateway;
**transfer is the exit exam.** We pair Brilliant's interaction quality with Alpha's no-gaps
mastery spine, add a context/representation transfer gate as the differentiator, run all
mastery decisions on a deterministic skill model (LLM advisory only), and measure learning by
delayed unseen performance — never by engagement.

### What v0.2 changed (provenance)
The board surfaced that v0.1 **conflated three distinct learning mechanisms into one tier
ladder.** v0.2's central fix is separating them (§1). It also: makes the AI tutor advisory and
the skill model authoritative (§8); replaces raw-% mastery with probabilistic confidence (§3);
redefines the top tier from "bare symbolic" to **representation transfer** (§5); adds an item-
certification pipeline with psychometric-equivalence checks (§9); and adds coach/parent
dashboards and a validation protocol as deployment prerequisites (§13, §15).

---

## 1. The core model: THREE AXES (do not conflate)

v0.1's single ladder is replaced by three orthogonal mechanisms. Each does a different job and
is scheduled independently.

| Axis | Mechanism | Job | Where it lives |
|------|-----------|-----|----------------|
| **A. Concreteness** | Concrete → pictorial → symbolic, **same structure**, detail progressively stripped (concreteness fading) | **Teaching.** Build then abstract the intuition. | Inside a node's instruction sequence |
| **B. Discrimination** | Interleave **confusable concepts** (slope / rate / unit-rate / proportion) | **Discrimination.** Learn *which* procedure applies. | Practice sets within and across sibling nodes |
| **C. Transfer** | Vary **context, representation, and problem form** along defined dimensions | **Assessment of generalization.** Prove it isn't welded to one skin. | The mastery gate (transfer battery, §5) |

**Hard rules:**
- Interest skins are an **Axis-A entry point** (the concrete case), never the whole journey.
- Interleaving (Axis B) is **by confusable concept, not by story domain.** Mixing
  baseball/cooking/music is noise; mixing slope/rate/proportion is signal.
- Context-switching to foreign domains (Axis C) is **assessment, not teaching.** It is how we
  *verify* transfer; it is not how we *produce* it.

---

## 2. Node mastery lifecycle

Every knowledge node moves through this pipeline. Advancement is governed by §3, not by raw %.

1. **Diagnostic placement** → student enters at true knowledge frontier, not grade.
2. **Teach (Axis A):** concreteness fading on one structure, entering through a *structural*
   interest skin (§4). Include an explicit **abstraction prompt** ("strip the story — what
   relationship remains?") before leaving the concrete stage.
3. **Practice + discriminate (Axis B):** interleave confusable sibling concepts.
4. **Provisional mastery:** probabilistic confidence threshold met on recent items (§3).
5. **Transfer battery (the gate, Axis C):** multi-dimensional transfer items (§5).
6. **Lock as MASTERED:** only after **delayed, unseen** items clear at 1/7/21-day checks with
   lower-bound confidence above threshold (§3). One-sitting accuracy never locks a node.
7. **Spaced re-circulation:** mastered nodes re-enter as embedded sub-steps in later problems.

Prerequisite nodes must be MASTERED (not provisional) before dependents unlock. No gaps.

---

## 3. Mastery definition — probabilistic, delayed, unseen

Replaces v0.1's 70/80/85% cutoffs. Those were arbitrary product rules.

- **Model:** Bayesian Knowledge Tracing or IRT estimate of P(mastery) per skill variant.
- **Lock criterion:** lower-bound confidence > **0.90 for prerequisite nodes, 0.85 for leaf
  nodes** (`MUST-VALIDATE` — calibrate from pilot data, do not treat as final).
- **Evidence required:** >=3-5 successful items *per transfer dimension*, not per node.
- **Delayed checks:** scheduled at **1, 7, and 21 days** on **unseen** item instances.
- **Locked mastery is computed only from delayed unseen items.** In-session accuracy and
  practiced items feed *provisional* state and tutor routing, never the lock.
- All thresholds are A/B-testable parameters wired to telemetry from day one. No parameter is
  a design commitment until pilot-calibrated.

---

## 4. Interest Graph + the structural-skin rule

- On onboarding, run a **diagnostic preference sampler**, not a bare interest form: show
  example problems across `sports / money / games / science / no-story / surprise me`, let the
  student pick after *seeing* them. **"No-story / abstract-first" is a first-class path,** not a
  fallback — abstract-first learners are not second-class.
- Declared interest is a **personalization layer on a strong default floor**, never the
  foundation the experience depends on. Cold-start students get the same quality, just a
  curated broad-appeal context instead of a tailored one.
- **Structural-skin rule (hard authoring constraint):** an interest context is allowed only
  when the math *is* the context. "Batting average" for ratios = allowed. A multi-paragraph
  player-drama wrapper around a generic ratio = banned (seductive-details effect: irrelevant
  narrative reduces retention and transfer by adding extraneous load).
- **Interest-suitability triage:** not all interests map cleanly to math. Tag each interest by
  contextualization quality; high-fidelity interests get full skinning, weak ones get light
  treatment or route to the strong default.

---

## 5. Transfer battery (the mastery gate)

"Different skin" is **not** transfer by default (Barnett & Ceci: transfer varies by what
changes — context, representation, problem form, temporal distance). The gate tests defined
dimensions, scored separately:

1. **Same structure, changed story** — interest domain → foreign domain (>=2 foreign domains).
2. **Changed representation, same structure** — table <-> graph <-> equation <-> word <-> verbal.
3. **No story, symbolic** — decontextualized form.
4. **Novel problem form** — a question shape not seen during teaching.

**Tier 3 is REPRESENTATION TRANSFER, not bare symbolic.** Bare symbolic is one representation,
not the apex. True mastery is fluent mapping *across* representations. (Corrects v0.1.)

A node passes the gate only when it clears all four dimensions at the §3 confidence bound on
**delayed, unseen** items.

---

## 6. Knowledge graph, spacing, interleaving

- Concepts are nodes with hard prerequisite edges; dependents unlock only on MASTERED prereqs.
- **Spaced re-circulation** on expanding intervals + as embedded sub-steps in later problems.
- **Interleaving is by confusable concept** (Axis B), node-adaptive: higher interleave for
  concept clusters students reliably confuse, lower for isolated skills.

---

## 7. Interaction design rules

- **Every atom is `predict / construct -> resolve`.** If a screen can advance without the
  student committing an output first, it is a slideshow. No click-throughs.
- **Predict-then-reveal** before any simulation. The wrong prediction is the teaching moment.
- **Construct, don't select.** Build the line, drag the vector, partition the bar. Multiple
  choice is a last resort (recognition crutch + brute-forceable).
- **Worked-example -> fading** for novices (full example -> fill step 2 -> steps 2-3 -> whole).
- **Self-explanation prompts** on key nodes, scored by rubric (§10), not vibes.

---

## 8. AI tutor — hybrid, ADVISORY ONLY

Both external reviewers ranked autonomous LLM gating as the #1 deployment risk; a cited
middle-school algebra misconception study runs ~84% precision — unacceptable for deciding
whether a child advances.

- **The deterministic skill model decides. The LLM advises.** Mastery, routing, and
  remediation decisions come from: known error patterns, structured answer traces, step-level
  math state, and a verified misconception taxonomy.
- **LLM role:** open natural-language scaffolding *after* rule-based diagnosis is exhausted or
  low-confidence. Never states the solution; asks the question that exposes the misconception.
- **Confidence gating + human-review queue** before any LLM output influences a hard gate.
- **Every tutor turn logged with full state** for offline audit, taxonomy growth, and tuning.
- **Build order:** tutor prototyping + validation moves to the **front** of the roadmap
  (§16), not the middle. We validate diagnosis against expert labels before gating anything.

---

## 9. Item-certification pipeline

"Author once, render many" is the load-bearing scaling assumption and the single most likely
fatal flaw (re-skinning can silently change difficulty, reading load, units, ambiguity, or the
actual math). Every generated/rendered item passes:

1. **Symbolic solution validation** — a solver confirms the math is correct and the intended
   structure is what's actually being assessed.
2. **Distractor / misconception validation** — wrong options map to real, tagged misconceptions.
3. **Readability + grade-band check** — reading load appropriate to the student's band (§13).
4. **Unit / context sanity check** — no impossible quantities, no domain absurdities.
5. **Psychometric-equivalence check (`MUST-VALIDATE`):** re-skinned variants of the same node
   must be calibrated to equivalent difficulty before a score delta across contexts is
   interpreted as transfer success/failure. *Without this, the transfer signal is corrupted.*
6. **Human QA** on high-stakes / prerequisite nodes.
7. **Live calibration** from student response data, feeding back into difficulty estimates.

Prefer **constrained slot-filling with solver verification** over open-ended LLM skinning.
Content curation is a **core operating cost**, budgeted, not an afterthought. Do not scale item
volume until transfer efficacy is demonstrated in a controlled pilot (§15).

---

## 10. Open-response & self-explanation scoring

Heavily weighted in mastery, so it cannot be "good explanation" vibe-grading (LLMs reward
fluent nonsense). Use **rubrics requiring specific semantic elements**, e.g. for an equation-
solving explanation: must identify the variable, the operation, the invariant, and *why* the
transformation preserves equality. Score against required elements; log for audit; sample for
human review.

---

## 11. Anti-gaming

- **Locked mastery uses delayed, unseen items only** — defeats template memorization and
  in-session cramming.
- Randomize numeric parameters per render; novel item families at the gate.
- **Latency + revision-pattern models** flag too-fast-correct, oscillation, and
  fail-to-farm-worked-steps behavior for re-test.
- Occasional **cumulative cold probes** on supposedly-mastered nodes.
- Ring/streak activity is never evidence of learning (§12, §14).

---

## 12. Motivation system (rings) — return behavior ONLY

- Three daily rings (Apple-Watch style): **Focus** (active solving minutes), **Mastery** (nodes
  advanced), **Retrieval** (spaced-review items cleared). Streaks + close animations.
- **Hard governance rule:** ring/streak metrics never enter mastery math or any learning-
  outcome report. They drive frequency of return; nothing else.

---

## 13. Dashboards — three surfaces + the coach/parent layer

Product pressure *will* push to soften gates and inflate progress; separation must be
hardcoded, not intended.

- **Learner dashboard:** effort, streaks, rings, section radials, distance-to-mastery, and the
  explicit transfer status per node (`comprehending -> transferring -> mastered`) so the student
  sees that staying in the comfort domain is not the finish line.
- **Academic dashboard:** locked mastery, delayed retention, transfer-dimension breakdown.
  This is the truth surface.
- **Coach / parent dashboard (deployment prerequisite — A3 has coaches, parents, players):**
  per-student mastery, stuck nodes + which transfer dimension is failing, intervention
  recommendations, cohort views. Student-facing rings are insufficient for real deployment.
- **Internal KPI rule:** daily-active-use is never treated as learning success.

---

## 14. Measurement & KPIs (learning, not vibes)

- **Primary KPI:** delayed-retrieval accuracy (1/7/21d) and **transfer accuracy by dimension**
  (§5) on unseen items.
- **Secondary:** time-to-mastery, prerequisite-reroute frequency, misconception-tag frequency,
  item difficulty drift.
- **Explicitly excluded from "did they learn":** session time, ring closes, streaks, self-
  reported satisfaction. (Deslauriers 2019: active learners learn more while *feeling* they
  learned less — engagement and learning can diverge.)

---

## 15. Validation protocol (`MUST-VALIDATE` — the thesis lives or dies here)

The differentiator is unproven until it beats a simpler baseline on far transfer.

- **Controlled comparison:** the three-axis model vs. a **concreteness-fading-only control**
  (and ideally a Brilliant-style linear control), pre/post + **delayed far-transfer** to novel
  domains.
- **Psychometric prerequisite:** establish item equivalence (§9.5) *before* interpreting any
  cross-context score delta as transfer.
- **Tutor validation:** LLM diagnosis vs. expert misconception labels before any gating use.
- **Equity tracking:** engagement, time-to-mastery, and transfer outcomes broken out by
  interest-declaration status, grade band, and demographics from the first pilot.
- Publish outcome claims only against this protocol — the bar Alpha skipped, and our
  credibility moat when selling the platform.

---

## 16. Roadmap (phased)

**Phase 0 — Foundations & de-risking (front-loaded by board mandate)**
- Knowledge graph + prerequisite gating + diagnostic placement.
- Misconception taxonomy + deterministic skill model (BKT/IRT) skeleton.
- Tutor diagnosis prototype validated against expert labels (advisory-only contract).
- Item-certification pipeline w/ solver verification on a single node family.

**Phase 1 — One node, end to end**
- Lesson Player with one real interactive atom (predict-then-reveal) + concreteness fading.
- Structural interest-skin rendering + the no-story default path.
- Probabilistic provisional mastery on that node.

**Phase 2 — The gate**
- Transfer battery (4 dimensions) + representation-transfer items.
- Delayed unseen re-checks (1/7/21d) + lock criterion.
- Psychometric-equivalence calibration across re-skinned variants.

**Phase 3 — Scale the engine**
- Spaced re-circulation + confusable-concept interleaving.
- Hybrid tutor full escalation ladder + human-review queue.
- Open-response rubric scoring.

**Phase 4 — Surfaces & motivation**
- Rings + learner/academic/coach-parent dashboards (governance-separated).
- Anti-gaming instrumentation.

**Phase 5 — Validate before volume**
- Run the §15 controlled pilot. **Do not scale item volume or expand node coverage until
  transfer efficacy clears the control.**

**Phase 6 — Deployment hardening**
- Standards mapping, grade-band parameterization, accessibility (§17 prerequisites).

---

## 17. Data architecture (sketch) & deployment prerequisites

**Supabase tables (RLS per-student; coach/parent scoped reads):**
- `students`, `preference_profiles` (sampler results, ranked + suitability tags)
- `knowledge_nodes` (id, concept, prereq_edges, confusable_cluster_id, standard_codes)
- `node_mastery` (student_id, node_id, p_mastery, provisional bool, locked bool, per-dimension
  status, last_seen, next_review_at)
- `item_templates` (concept_id, axis, context_domain, representation, difficulty, render_spec,
  certification_status, equivalence_class)
- `attempts` (student_id, item_id, answer, correct, latency, revision_pattern, misconception_tag,
  seen_before bool)
- `review_queue` (student_id, node_id, due_at, dimension)
- `tutor_turns` (student_id, item_id, rule_diagnosis, llm_advice, confidence, state_snapshot)

**Deployment prerequisites (not polish — gating for any non-internal launch):**
- **Standards mapping** of the graph to Common Core / state codes (priority scales with
  whether this ships beyond A3).
- **Grade-band parameterization** (5th-12th is not homogeneous: reading load of skins,
  scaffolding, abstract-reasoning readiness all vary).
- **Accessibility:** UDL, screen-reader support for construct interactions (note the real
  tension — "construct not select" is hard to make accessible; design for it early).
- **LLM cost / privacy / latency** plan at scale (per-turn inference budget, student-data
  handling).

---

## 18. Ranked fatal risks (reconciled across the board)

1. **Transfer efficacy** — does the three-axis model beat concreteness-fading on delayed far
   transfer? *No engineering fix; only the §15 trial.* The true thesis-killer.
2. **Psychometric equivalence of re-skinned items** — if variants aren't difficulty-equivalent,
   the transfer signal is uninterpretable. Prerequisite to even running risk #1's trial.
3. **LLM diagnosis reliability** — highest priority *to de-risk*, but solvable via the hybrid
   architecture (§8). Important, not existential.
4. **Churn before transfer benefits appear** — desirable difficulty + untuned thresholds +
   weak defaults could lose the users whose data validates the system. Mitigate via the strong
   default floor (§4) and ring motivation (§12), measured against §14.

## 19. Standing principles (never trade away under pressure)

- Mastery is the spine; interactivity is the muscle.
- Interest is the gateway, not the destination — the gate is transfer.
- The skill model decides; the LLM advises.
- Motivation drives return; it never measures learning.
- Teach with concreteness fading; discriminate with concept interleaving; *assess* with context
  and representation transfer. Three axes — never collapse them again.
