# Phase 7 — Workstream C — Retention Probes — Design Spec (Checkpoint 2 gate)

Status: DRAFT for gate review (mr-kahn AND mr-gates both gate this design BEFORE any
engine-adjacent code — this is the Checkpoint 2 requirement). No code until gated + Matt.

Authored on Fable per the model plan (engine-adjacent scheduling logic; one wrong
interaction with decay/routing cascades).

## The one-sentence contract
Retention probes add **scheduling + serving only**. A probe is a normal P3-neutral
problem on an already-mastered node, **served and scored through the existing engine
unchanged**. Correct → the decay clock is already reset by the existing
`lastAttemptAt` path and the next check lands at the next interval. Incorrect → the
**existing** dip/decay → `needs_review` machinery takes over. **No new demotion path,
no change to `computeMastery`, `recommend`, phase logic, or any threshold.**

All names verified against: lib/mastery-engine/index.ts, lib/problem-engine/index.ts,
lib/practice-session/index.ts, lib/diagnostic-engine/index.ts, types/student.ts,
types/engine.ts.

---

## 1. Where the schedule lives — DERIVED, no new mutable state (recommended)

`StudentSkillState` has **no** retention field today (confirmed: only `masteredAt`,
`lastAttemptAt`, `recent[]`). Rather than add mutable schedule state, **derive** the
schedule from the immutable logs — consistent with the engine's "logs are the source
of truth" philosophy and the sticky-mastery model.

For a node with `status==="mastered"`:
- **anchor** = `max(masteredAt, createdAt of the latest CORRECT neutral-P3 attempt on
  the node)`. (A node the student just answered correctly on a neutral item does not
  need re-probing — the clock is already satisfied.)
- **satisfactions** = count of distinct sessions containing a correct neutral-P3
  attempt after `masteredAt`. This is the interval-escalation index.
- **intervalDays** = `schedule[min(satisfactions, schedule.length-1)]` where
  `schedule` = `creditedFirst ? [14, 60, 120] : [21, 60, 120]` (config — §3).
- **dueAt** = `anchor + intervalDays`.
- **due** iff `status==="mastered"` AND `nowIso >= dueAt`.

`creditedFirst` (the +14d first-probe priority for diagnostic-credited nodes) is true
when the node's mastery came from `MasteryUpdate.trigger ∈ {diagnostic,
credit-propagation}` AND it has had **zero** correct practice/retention neutral attempts
since (i.e. it was never directly exercised here). Uses the same detection as
`diagnosticCreditedSkills(updates)` (lib/diagnostic-engine).

> **mr-gates / mr-kahn decision A:** derive (no schema change) vs. add a
> `retentionDueAt`/index to `StudentSkillState`. Recommendation: **derive** — zero new
> mutable state, nothing for the Supabase swap to migrate, fully audit-reconstructable,
> deterministic from `nowIso`. The cost is one extra `listAttempts` read at serve time
> (already a read in the practice path).

> **mr-kahn decision B:** does "any correct neutral-P3 attempt satisfies retention"
> (recommended — don't nag a node just practiced) or "only a formally-injected
> retention probe satisfies it"? Recommendation: any correct neutral attempt satisfies;
> the formal probe is merely the *injection mechanism* for nodes that are due AND not
> being naturally exercised.

---

## 2. New provenance marker — `source: "retention"`

`StudentAttempt.source` is today `"practice" | "diagnostic"` — a write-side provenance
marker the ISOLATION RULE already forbids from entering mastery/phase/routing math.
**Extend it to `"practice" | "diagnostic" | "retention"`** (additive; same isolation
rule; Supabase `check` constraint extends to include `'retention'`).

This marks an injected retention probe in the immutable log so the scheduler can
derive `satisfactions`/anchor and so the admin timeline + flags can label it. It is
provenance + audit ONLY — `computeMastery`/`advancePhase`/`recommend` continue to
ignore `source` entirely.

`isProbe` stays **false** for retention probes: `isProbe` means "excluded from
phase-advance accuracy," which is moot at phase 3 (no N+1), and a passed retention
probe SHOULD legitimately count toward the node's mastery/decay-reset (it is a real
demonstration of retained transfer). The `source="retention"` marker is the only new
signal. (mr-gates confirm: marker, not behavior.)

---

## 3. Config — `MASTERY_CONFIG.retention` block

Add a `retention` block to the `MasteryConfig` type (types/engine.ts) and
`MASTERY_CONFIG` (lib/mastery-engine/index.ts), parallel to `decay`/`timing`:

```
retention: {
  intervalsDays: [21, 60, 120],     // normal escalating cadence
  creditedFirstDays: 14,            // diagnostic-credited nodes' FIRST check
  maxProbesPerSession: 1,           // hard cap — one tune-up per session
}
```

Changing these is a **Matt human checkpoint** (same posture as all
MASTERY_CONFIG/PROBLEM_CONFIG values — documented inline).

---

## 4. The scheduler — a NEW PURE module, engine untouched

New file `lib/retention/index.ts`. Pure, `nowIso`-parameterized, no `Date.now()`:

- `retentionStatus(node, state, updates, attempts, nowIso, cfg) → { due, dueAt,
  intervalIndex, creditedFirst }` — the per-node derivation in §1.
- `selectRetentionProbe(graph, states, updates, attempts, sport, nowIso, cfg) →
  ServedProblem | null` — across all mastered nodes:
  1. compute `retentionStatus` for each; keep the **due** ones.
  2. priority order: **diagnostic-credited first**, then most-overdue
     (`nowIso − dueAt` desc), tie-break by `skillId` (deterministic).
  3. for the winner, pick ONE **never-seen** P3-neutral item:
     `bankFor(node, 3, "neutral")` filtered by `!seenProblemIds.has(p.id)`
     (`seenProblemIds` from `attempts.map(a => a.problemId)`), ordered
     easy→hard→id, take first. If the node has no unseen neutral item, fall to the
     next due node. Returns `null` if none.

The scheduler **never** calls `recommend`, `computeMastery`, or any write method. It
is read-only over logs + graph.

---

## 5. Serving — inject ONE probe per session

In the practice-session assembly (lib/practice-session/index.ts, where `selectProblems`
is called and `sessionId` is minted), call `selectRetentionProbe(...)` **once**. If it
returns a probe:
- prepend (or insert at a deterministic slot) ONE `ServedProblem` marked for retention,
  carrying `source:"retention"` through to the appended `StudentAttempt`.
- the `maxProbesPerSession:1` cap is enforced structurally (exactly one selection).

The probe rides the **existing** `runPracticeAttempt` flow unchanged — it is a normal
attempt with its own `skillId` (the mastered node's, which may differ from the session's
main skill) and `source:"retention"`. Scoring, decay-reset, and the dip/decay→needs_review
path are all the existing engine. **Nothing in `runPracticeAttempt`'s mastery math changes.**

> **mr-kahn note:** the probe's `skillId` is the mastered node being checked, NOT the
> session's chosen skill. The attempt is scored against the correct node. Confirm this
> cross-skill injection is curricularly sound (it is the "tune-up" model).

---

## 6. UI framing (pee-wee already endorsed at A.3; full review deferred to C UI)
Framed as the **"90-second tune-up"** — a feature, not remediation. There is an
existing tune-up surface precedent on the home (`TuneUpButton`, "Quick Review"). The
probe is presented calmly as "a quick check on something you proved earlier," never as
a failure or punishment. The A.3 admin "retention probes due" flag stub is now populated
by `retentionStatus`. (Detailed UI gate happens at the C implementation step;
this checkpoint is the scheduling design only.)

---

## 7. Outcome wiring (all via existing machinery — nothing new)
- **Correct probe:** normal attempt → `lastAttemptAt = now` resets `decayFactor` →
  score recovers → stays `mastered`; the derived `anchor` advances (next check lands at
  the next interval). No special code — it falls out of the existing path + §1 derivation.
- **Incorrect probe:** normal attempt enters `recent[]`. The **existing** rules apply
  verbatim: a single wrong attempt (recent.length < `minAttempts.lockConfirm`=2) does
  NOT demote; a second confirms the dip → `needs_review` with the existing reason string.
  Once `needs_review`, the node leaves the retention pool and enters the normal review
  flow (`recommend` `kind="review"`). **No new demotion path** — exactly Phase 1's
  machinery. (This satisfies the prompt's "reuse what Phase 1 built.")

---

## 8. Tests (the prompt's required set)
Pure unit tests on `lib/retention`:
1. **Scheduling determinism** — same `(logs, nowIso)` → identical due set + probe pick.
2. **One-per-session cap** — `selectRetentionProbe` returns at most one; serving injects
   at most one `source:"retention"` attempt per `sessionId`.
3. **Credited-node priority** — a diagnostic-credited due node is chosen over a
   normally-mastered due node; credited first interval is 14d not 21d.
4. **Correct/incorrect outcome wiring** — correct → stays mastered, anchor advances,
   next due at next interval; incorrect ×1 → still mastered (no demote); incorrect ×2 →
   `needs_review` via the EXISTING path (assert reason string is the existing one, not a
   new one).
5. **Isolation test (mandatory)** — for a student with **no** due nodes,
   `selectRetentionProbe` returns null AND `recommend(...)` output + served main-bank
   order are **byte-identical** to a run without the retention module. Proves probe
   scheduling never alters recommendation order for non-due students.
6. **Never-seen filtering** — a node whose entire neutral bank has been seen is skipped;
   falls through to the next due node.

---

## Gates requested
- **mr-kahn**: decision A (derive vs store), decision B (what satisfies retention),
  §5 cross-skill probe soundness, §7 "no new demotion path" fidelity, and that the
  escalating cadence + credited-first priority are pedagogically correct.
- **mr-gates**: decision A (schema impact), the `source:"retention"` union extension +
  Supabase check-constraint note, the new `lib/retention` module boundary (pure,
  read-only, never touches engine/router/write methods), the serving injection point in
  `lib/practice-session`, and confirmation that NOTHING in mastery/phase/routing math
  is altered (the hard constraint).

Verdict format: APPROVE | APPROVE WITH CHANGES (list) | REJECT (reason).

---

## GATE RESOLUTIONS — BINDING (supersedes conflicting text above)

Verdicts: **mr-kahn APPROVE WITH CHANGES (5)** · **mr-gates APPROVE WITH CHANGES
(4 blocker + 4 should-fix + 1 nit)**. No rejections. The core architecture
(derive, `source:"retention"`, pure scheduler, scored through existing engine) is
confirmed faithful and the hard constraint holds — **no mastery/phase/routing MATH
changes**. All corrections are scheduling-derivation precision + serving/provenance
plumbing pointed at the right files. This section is the law mr-grunt builds to.

### Derivation (mr-kahn K1/K2, resolves mr-gates SF5 — everything off the ATTEMPT log)
D1. **`satisfactions`** = count of CORRECT neutral-P3 attempts on the node after
    `masteredAt` (NOT "distinct sessions" — that would lean on `sessionId`, which the
    isolation rule keeps out of routing-adjacent logic). **`anchor`** = `createdAt` of
    the latest such attempt, or `masteredAt` if none. One unit, fully reconstructable
    from the immutable attempt log, deterministic from `nowIso`.
D2. **`creditedFirst`** is true ONLY while `satisfactions === 0` AND mastery came from
    `trigger ∈ {diagnostic, credit-propagation}` (via `diagnosticCreditedSkills`).
    First interval = `creditedFirstDays` (14). From `satisfactions ≥ 1`, the node
    rejoins the normal cadence: `intervalsDays[min(satisfactions-1, len-1)]`. A credited
    node does NOT stay on a separate track forever — once exercised here, it's normal.
D3. **Hard preconditions** (scheduler may select a node only if): `status==="mastered"`
    AND `nowIso >= dueAt` AND it is NOT `needs_review` AND not freshly mastered inside
    its first interval. A node both credited-due and normally-due is counted once,
    credited-first priority.

### Serving — CORRECTED injection point (mr-gates BLOCKER 1/2/3/4)
S1. **Injection happens in the PAGE**, `app/student/(shell)/practice/[skillId]/page.tsx`
    (~lines 90–113), where the served item list is assembled AND `sessionId` is minted
    via `crypto.randomUUID()` — NOT in `lib/practice-session`. (My original §5 was wrong;
    `lib/practice-session`'s `selectProblems` call is a per-attempt slot VALIDATOR, not
    the assembly.)
S2. **One-per-session cap is structural** precisely because `selectRetentionProbe(...)`
    is called ONCE at page assembly (once per minted `sessionId`), never inside the
    per-attempt `runPracticeAttempt` (which runs many times per session).
S3. **Real blast radius (provenance plumbing across modules — spans 4+, mr-gates-gated):**
    per-item `skillId` + `source` must thread through `ServedItem` → `PracticeFlow` →
    `PracticeSubmission` (shared.ts) → `actions.ts` → `RawAttempt` → `appendAttempt`.
    The ONLY edit to `runPracticeAttempt` is line 146 `source:"practice"` →
    `raw.source ?? "practice"` (provenance only — NO scoring/mastery change). The probe
    rides its own `skillId` (the mastered node's, ≠ the session's main skill), so it
    never enters the session skill's `advancePhase` denominator.
S4. **Probe item derived through the SAME committed selector the validator uses.** Export
    a pure `neutralP3Bank(node)` (or equivalent) from `lib/problem-engine`; `lib/retention`
    calls it — it must NOT re-implement bank read/sort (one source of truth). This
    guarantees the probe is always a member of `selectProblems(probeNode, probeState,
    sport)` so the existing `runPracticeAttempt` slot-validator (index.ts:113–118) accepts
    it. Probe is phase 3, `isProbe:false`. Prepend the probe (deterministic slot 0 — reads
    as the "90-second tune-up" warm-up).

### Config (mr-gates SF6 — keep MASTERY_CONFIG as pure mastery math)
C1. Use a **separate `RETENTION_CONFIG`** (own interface in types/engine.ts; constant in
    `lib/retention`), NOT a block inside `MASTERY_CONFIG` — this keeps `lib/mastery-engine`
    entirely UNTOUCHED (a clean isolation win). Shape:
    `{ intervalsDays: [21,60,120], creditedFirstDays: 14, maxProbesPerSession: 1 }`.
    Injected as a defaulted param (mirrors `selectProblems(…, config = PROBLEM_CONFIG)`).
    Changing values = Matt human checkpoint; inline banner saying values do NOT enter
    scoring.

### Schema / provenance (mr-gates SF7)
M1. Extend the PENDING migration's check constraint (one-line edit, not a 2nd migration —
    it hasn't run): `check (source in ('practice','diagnostic','retention'))`
    (0001_compliance_spine.sql:198–199). Update the column comment (line 526), the
    migration header changelog, and the `source` union type comment (types/student.ts:76–78).

### Tests (mr-gates SF8 + mr-kahn) — the prompt's required set, tightened
T1. Determinism; T2 one-per-session cap; T3 credited-first priority + 14d-not-21d first
    interval (provable without a permanent fork, per D2); T4 correct→stays mastered+anchor
    advances, incorrect×1→no demote, incorrect×2→needs_review via the EXISTING reason
    string (assert it's the existing string, not a new one).
T5. **Isolation (mandatory):** for a no-due-nodes fixture — (a) `selectRetentionProbe`
    returns null, (b) served `items[]` is element-wise identical (problemId order +
    isProbe flags) with vs without the module, (c) `recommend(...)` output is deep-equal.
    Plus the due-student delta assertion: the ONLY difference is exactly one prepended
    `source:"retention"` item; `recommend` output unchanged.
T6. Never-seen filtering: a node whose entire neutral bank is seen is skipped → next due.

### Wiring the A.3 stub (mr-gates NIT 9 — expected, not a surprise regression)
W1. As part of C, wire the admin "retention probes due" flag (lib/insight/flags.ts:~190)
    and the per-student page stub (app/admin/students/[studentId]/page.tsx:~237–245) to
    `retentionStatus`. `flags.test.ts` (asserts the flag is never emitted) WILL change —
    this is expected.

### Net surface for C implementation (when Matt approves at Checkpoint 2)
- types: `RETENTION_CONFIG` interface (engine.ts); `source` union + comment (student.ts);
  per-item `skillId`/`source` on the served/submission DTOs (shared.ts).
- lib: NEW `lib/retention/index.ts` (pure scheduler); export `neutralP3Bank` from
  `lib/problem-engine`; thread `source` in `lib/practice-session` line 146 ONLY.
- app: inject in practice `page.tsx`; thread `source` in `actions.ts`; wire admin stub.
- migration: extend `source` check constraint + comments (pending file edit).
- mastery-engine / adaptive-router: **UNTOUCHED** (the hard constraint, now provable).
- Model: Fable for implementation + gate re-reviews; Opus for test cleanup (per plan).
