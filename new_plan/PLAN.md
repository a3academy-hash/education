# PLAN.md — A3 Course Full Overhaul: Self-Driving Execution Plan

**For:** Claude Code. **Goal:** see GOAL.md. **Specs (binding):** CLAUDE.md, DIAGNOSTIC.md,
AI_ADAPTIVE.md, STYLE_GUIDE.md, SECURITY_DB_REPORTING.md.
**Mandate:** run every phase through THE PHASE LOOP below — plan it code-wise against the specs,
get an adversarial review from Codex, autonomously decide what to adopt/reject/add/subtract,
update the plan, execute, verify, advance. Keep going with NO human intervention until GOAL.md is
DONE (entire site overhaul). Stop only at a HARD-STOP or at DONE.

---

## THE PHASE LOOP (run this for EVERY phase, in order)

For each phase, execute these 7 steps, then immediately start the next phase's loop:

**1. PLAN (code-level, against the MD files).**
Read the spec sections this phase references. Produce a concrete implementation plan and write it
to `phases/phase-<N>-plan.md`: exact files to create/modify (paths), DB migrations/schema,
components/functions/data structures, interfaces/contracts, tests, performance/accessibility
budgets, and the phase's acceptance criteria mapped to specific GOAL.md checkboxes. Be code-
specific, not abstract. Cross-check every feature the referenced MD sections require is present
in the plan; list any spec requirement you are deferring and why.

**2. ADVERSARIAL REVIEW (Codex).**
Send `phase-<N>-plan.md` + the referenced spec sections to Codex with the review prompt in
`REVIEW_PROMPT` (below). Save Codex's response to `phases/phase-<N>-review.md`.
- Invoke Codex via its available CLI/interface. **If Codex is unreachable, do not stall** — run
  the adversarial review yourself in a dedicated red-team pass (adopt a hostile senior-engineer
  persona, attack your own plan against the specs) and save that as the review. The loop never
  halts on tooling.

**3. ADJUDICATE (autonomous — no human).**
Read the review and decide, on your own authority, what to ADOPT / REJECT / ADD / SUBTRACT, using
the ADJUDICATION CRITERIA below. Write decisions + one-line rationale each to
`phases/phase-<N>-decisions.md`. You are the chair; do not ask the human.

**4. UPDATE PLAN.**
Revise `phase-<N>-plan.md` to v2 incorporating adopted changes. This revised plan is what you build.

**5. EXECUTE.**
Implement the revised plan one task at a time. After each task: build, run/extend tests, fix
breakage before continuing. Small commits, diffs shown, no Co-Authored-By trailers, absolute paths.

**6. VERIFY (phase gate).**
Run the phase's acceptance checks + the mapped GOAL.md checkboxes + `npm run build` + tests.
Attach results to `phases/phase-<N>-verify.md`. If a gate fails, fix and re-verify — do not advance.

**7. LOG + ADVANCE.**
Append what was done/decided/remaining to `OVERHAUL_LOG.md`. Immediately begin Phase <N+1>'s loop.

---

## ADJUDICATION CRITERIA (how Claude decides, autonomously)

- **ADOPT** if it fixes a real spec-conformance gap, a correctness/security/performance/
  accessibility defect, or is a clear improvement that does NOT expand scope beyond GOAL.md.
- **ADD** if Codex surfaces a feature a binding spec actually requires that the plan missed.
- **REJECT** if it contradicts a binding spec decision, adds scope not in the specs/GOAL, is
  over-engineering for v1, or is a taste preference unsupported by the specs or evidence.
- **SUBTRACT** if Codex shows something is redundant or outside v1 scope.
- **Convergence weight:** if Codex independently flags something the specs also imply, weight it
  heavily — that's signal, not opinion.
- **Tie-breakers:** when uncertain, prefer the specs' implied direction and the simpler,
  reversible option. Log the call and proceed. Never present a menu to the human.
- The binding specs win over Codex on any conflict; GOAL.md non-negotiables win over everything.

`REVIEW_PROMPT` (use for step 2): "You are a hostile senior engineer reviewing an implementation
plan for one phase of an adaptive-learning platform overhaul. The binding specs are attached.
Find what is missing, wrong, non-conformant to the specs, over-engineered, or will break at
scale, on performance (<800ms loop), security/RLS, accessibility, or data integrity. For each:
flaw, why, concrete fix. Rank your top concerns and name the single thing most likely to be
fatally wrong. Be specific and code-level; do not be agreeable."

---

## DESTRUCTION POLICY + PRE-LAUNCH GATES (almost nothing pauses the build)
**There are no real users — all current data is test data.** During this overhaul the build is
free to be destructive; nothing pauses for data loss except the one content artifact below.
- **Test user data: freely destructible.** Wipe, rebuild, reseed user tables; run destructive
  migrations; drop/recreate at will. No backup ceremony, no pause.
- **Question bank: back up ONCE, then purge freely.** Before Phase 2 touches the 4,000+ items,
  write a full versioned snapshot to `backups/question-bank-<timestamp>.json` (the only artifact
  with real authoring work in it). Then dedup/purge/rewrite freely; restore-by-diff if a threshold
  over-deletes. This makes the purge fully reversible instead of high-regret.
- **Unrecoverable architecture forks with no defensible spec default** — pick the implied default,
  log it, proceed; pause only if truly none exists.

**PRE-LAUNCH GATES (build + test through these freely against test data; they gate SHIPPING to a
real user, they never pause the build):**
- The COPPA VPC consent flow must EXIST and pass tests before any real user is onboarded. Build it,
  run fake/test kids through it freely — just don't ship real under-13 collection without it.
- Attorney-pending values (VPC method, retention timers, FERPA stance) — implement configurable
  with documented defaults, mark `ATTORNEY-PENDING`; confirm with counsel before launch, not
  before building.

Everything else (including all Codex-review adjudication): decide and keep building. Do not stop
until DONE.

## GLOBAL PROTOCOL
Read all five specs + GOAL.md before Phase 0. Decide-and-proceed on ambiguity. Maintain
`OVERHAUL_LOG.md` for resumability. Loop, don't halt.

---

## PHASE 0 — AUDIT
**Plan against:** all five specs + the four named v0.1 failures.
**Code deliverables:** `AUDIT.md` gap report — latency profile vs <800ms; item-bank scan (dedup
count, solver-fail count, slop count); lesson-atom inventory (click-through flags); adaptivity
reality-check vs AI_ADAPTIVE §5-7; visual/contrast/register audit vs STYLE_GUIDE; schema/RLS/
identity/data-class audit vs SECURITY doc.
**Gate:** `AUDIT.md` exists with gap list + severity per domain. (Run via PHASE LOOP; the "plan"
here is the audit methodology, Codex reviews the audit approach for blind spots.)

## PHASE 1 — THE SPINE
**Plan against:** SECURITY §2-3/§16, DIAGNOSTIC §2, AI_ADAPTIVE §9.
**Code deliverables:** knowledge graph (nodes + prereq edges + CCSS codes + 5-10 subject
clusters); data-class + retention policy THEN schema with RLS on every table, family_id/
student_id scoping, parent-root/child-subaccount, server-side grading, audit log (no PII bodies),
secrets/MFA scaffolding; async-update + optimistic-UI + <800ms-selector skeleton + non-LLM fallback.
**Gate:** migrations clean; RLS tests pass; trivial interaction round-trips <800ms.

## PHASE 2 — ITEM BANK REMEDIATION
**Plan against:** DIAGNOSTIC §9, CLAUDE §9.
**Code deliverables:** FIRST write the versioned snapshot to `backups/question-bank-<timestamp>.json`
(mandatory, before any deletion). Then dedup pass (-> 0 above threshold); solver-verification pass;
quality/slop removal+rewrite; tag+certify every item (node_id, difficulty_tier, misconception_map,
response_type, calculator_flag, item_version, equivalence_class); build the certification pipeline
for all future items.
**Gate:** snapshot exists; dedup = 0; 100% live items solver-verified + tagged; quality scan clean.
**(Backup makes the purge fully reversible — diff against the snapshot to recover any over-deleted items, so purge aggressively.)**

## PHASE 3 — THE ADAPTIVE ENGINE
**Plan against:** AI_ADAPTIVE §5-7, §6 (cold-start), §13.
**Code deliverables:** per-node p_known (BKT/PFA) + retention stability/halflife (FSRS-style) +
confidence; explicit inter-layer interaction rule (no double-count); damped KST propagation;
rule-based selector (acquire+resolve+maintain, ~85% difficulty); retention firewall (lock only on
delayed unseen); diagnostic-seed init + empirical-Bayes retention priors.
**Gate:** session updates graph live, schedules future review, never locks on massed performance.

## PHASE 4 — INTERACTIVITY + SPEED
**Plan against:** CLAUDE §7, AI_ADAPTIVE §0/§9.
**Code deliverables:** rebuild atoms as predict/construct -> resolve (zero click-through);
construct/structured input for symbolic+graph; enforce <800ms loop; LLM only on stuck states;
cached explanations; kill audited UI stalls.
**Gate:** zero advance-without-commit screens; measured loop <800ms; interactions feel instant.

## PHASE 5 — VISUAL SYSTEM
**Plan against:** STYLE_GUIDE (all).
**Code deliverables:** one A3 instrument system + shared chrome; contrast-fixed resolve-by-surface
palette (fix all AA failures); rings (Focus solid blue / Mastery green+gold-cap-at-lock /
Retrieval dashed amber; hue+icon+pattern; ARIA); trust register for tests (rewards muted, same
chrome); sober severity-tiered adult dashboards; baseball-native visuals (strike-zone grids,
film-room annotation, Plex-Mono stat panels); type system (Source Serif 4 + Plex Sans/Hanken +
Plex Mono + KaTeX per surface).
**Gate:** contrast audit passes AA; one coherent skin; rings + registers per spec.

## PHASE 6 — DIAGNOSTIC
**Plan against:** DIAGNOSTIC.md (all).
**Code deliverables:** structured multistage routing diagnostic; high-impact nodes tested
directly; KST routing; minimal-context items; calm progress / no rewards; outputs four labels +
remediation + entry frontier; writes provisional seed for Phase 3.
**Gate:** new student completes placement; engine starts seeded.

## PHASE 7 — REPORTING + COMPLIANCE
**Plan against:** SECURITY_DB_REPORTING (all).
**Code deliverables:** COPPA VPC flow + notices + parent access/delete; parent dashboard (course-
progress ring, overall mastery, 5-10 subject masteries, proof modules); admin/teacher + coach
reporting (pace vs plan, severity + next-step, n>=5 suppression, coach role narrowed); NCAA export
(CCW content + transcript line + administrator statement + disclaimers) + 70/20/10 grade rubric.
**Gate:** under-13 flow consent-gated; parent/admin/coach views work; export generates.

## PHASE 8 — ENGAGEMENT GUARDRAILS + MOTIVATION
**Plan against:** AI_ADAPTIVE §8, STYLE_GUIDE.
**Code deliverables:** 70-90% success band; capped review burden; "fast but fragile" flag;
visible retained-mastery; frustration fallback; rings (return behavior only, never in mastery
math, muted in tests); Training/Boost mode default-by-age + switchable.
**Gate:** guardrails active; rewards never contaminate measurement.

## PHASE 9 — FULL VERIFICATION (prove DONE)
**Plan against:** GOAL.md (every checkbox).
**Code deliverables:** reports for performance (<800ms under load), WCAG-AA contrast, dedup (0),
solver-verification (100%), accessibility (keyboard/screen-reader on construct+coordinate items),
end-to-end journey (diagnostic -> lesson -> mastery lock -> dashboard -> export), tests +
`npm run build` green. Walk GOAL.md checkbox by checkbox.
**Gate = DONE:** every GOAL.md checkbox true + all reports clean. Only now stop.

---

## Dependency order
Schema/retention gates everything -> the knowledge graph is the spine the engine/items/diagnostic/
reporting attach to -> clean items before the engine serves them -> engine before interactivity
wraps it -> style/diagnostic/reporting on top -> guardrails + verification last. The fast-
interaction skeleton goes in at Phase 1 so speed is designed in, not retrofitted.
