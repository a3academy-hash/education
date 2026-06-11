# Evidence Trail — reconstruction + invariants (Phase 5 §G)

The accreditation/NCAA evidence trail is two append-only tables —
`student_attempts` and `mastery_updates` (`StudentAttempt` / `MasteryUpdate` in
`types/student.ts`). Every attempt, hint, time-on-task, and mastery/status/phase
transition is an immutable row. Nothing is ever updated or deleted (enforced in
the migration by REVOKE + a BEFORE UPDATE/DELETE trigger). This document walks
ONE concrete reconstruction and states the invariants an auditor relies on.

---

## One concrete reconstruction

**Question an auditor asks:** "Show me exactly why skill `solving-two-step` was
marked *mastered* for this student, and prove the neutral-notation transfer."

Walk the chain from the mastery transition back to the demonstrated work:

1. **Start at the `MasteryUpdate`.** Find the row where
   `skillId = "solving-two-step"` and `newStatus = "mastered"` (latest, by
   `createdAt` asc / `id` asc). It carries:
   - `trigger = "attempt"` → mastery was earned through practice work (not
     decay, not diagnostic credit, not credit-propagation).
   - `attemptId` → a non-null pointer into `student_attempts` (REQUIRED for
     `trigger:"attempt"` — see Invariant 2). The practice action stamps the real
     attempt id (`lib/practice-session`/the practice server action: `attemptId:
     attempt.id`).
   - `prevStatus / newStatus`, `prevPhase / newPhase`, `prevMastery /
     newMastery` → the exact transition.
   - `engineVersion` (e.g. `"1.0.0"`) → which deterministic engine decided it.
   - `reason` → the human-readable rule that fired
     (e.g. "Mastered — neutral-notation transfer confirmed").
   - `sessionId` → the session this transition belongs to.
   - `createdAt` → the moment of the transition (also the replay clock — see
     Invariant 1).

2. **Follow `attemptId` → the `StudentAttempt`.** That row carries:
   - `phase = 3` and `sport = "neutral"` → this is the **neutral P3 transfer**
     attempt. Mastery REQUIRES a demonstrated neutral P3 transfer (no
     exceptions); this is where the trail proves it.
   - `source = "practice"` and `isProbe` → provenance markers. `source`
     distinguishes practice from diagnostic items; `isProbe` marks N+1
     phase-probe items that are excluded from phase-advance accuracy. Neither
     ever enters mastery/phase math (ISOLATION RULE) — they exist purely so the
     log is reconstructable.
   - `response`, `correct`, `hintsUsed`, `timeMs`, `misconceptionTags` → the
     full work record for the attempt.
   - `sessionId` → matches the update's session.

3. **Scope by `sessionId`.** Filtering both logs by the `sessionId` reconstructs
   the entire session: every attempt that led in, the order, the hints, the
   time-on-task, and each resulting transition. This is how the Summary surface
   reconstructs before/after WITHOUT storing a snapshot — first session update's
   `prev*`, last session update's `new*`.

4. **Close the loop with `engineVersion` + `reason`.** `engineVersion` names the
   deterministic ruleset; `reason` names the specific rule. Together with the
   `prev*`/`new*` fields, the transition is fully explained and **replayable**.

Result: from one `mastery_updates` row, the auditor reaches the exact neutral-P3
attempt that earned mastery, the session it sat in, the engine version that
judged it, and the rule that fired — with no stored snapshot to be trusted or
to drift. The standards transcript (`lib/transcript`) is a regenerable view over
this same log, so it can never claim credit the log does not support.

---

## Invariants (mr-kahn)

**Invariant 1 — decay / credit updates have `attemptId = null`, and `createdAt`
IS the replay clock.**
`trigger:"decay"` and `trigger:"credit-propagation"` updates are not caused by a
single attempt, so their `attemptId` is null *by design* (not a defect). They are
evaluated **at write time** against an explicit `nowIso`; the engine takes "now"
only as a parameter (no `Date.now()` inside `/lib`). Therefore the row's
`createdAt` is exactly the `nowIso` an auditor replays the decision with. There
is no hidden clock.

**Invariant 2 — `trigger:"attempt"` updates MUST carry a non-null `attemptId`.**
A mastery transition triggered by an attempt without its attempt id is an
**auditability defect** — the chain in step 1→2 above would dead-end. The
practice server action already stamps the real id (`attemptId: attempt.id`,
Phase 4 §H). Treat a null `attemptId` on a `trigger:"attempt"` row as a bug, not
a tolerated state.

**Invariant 3 — `engineVersion` and graph `schema.version` are INDEPENDENT
version lines.**
`engineVersion` (e.g. `"1.0.0"`, `ENGINE_VERSION` in `lib/mastery-engine`)
versions the deterministic decision logic. The curriculum graph
`schema.version` (e.g. `"1.7.x"`, in `data/algebra1-graph.json`) versions the
*content* (nodes, standards, banks). They move independently: authoring new
content bumps the graph version without changing the engine; a rule change bumps
the engine without touching content. The standards transcript header records the
**graph** `schema.version` (content provenance); each `MasteryUpdate` records the
**engine** version (decision provenance). The engine changelog lives with the
engine — `lib/mastery-engine` (`ENGINE_VERSION` + the STATUS LADDER comment block
at the top of `index.ts`); the graph changelog lives in the graph's commit
history / `schema.version` bumps.

---

## Every transition type the log must explain

| Transition | `trigger` | `attemptId` | Where it originates |
|---|---|---|---|
| **Fresh mastery** | `attempt` | non-null (neutral P3 attempt) | practice action applies the engine's proposed update |
| **Restoration** (needs_review → mastered) | `attempt` | non-null | practice action; refreshes `masteredAt`, resets `recent[]` |
| **Dip-demotion** (mastered → needs_review, attempt evidence) | `attempt` | non-null | engine attempt-evidence branch (`recentAcc < recentDip`) |
| **Decay-demotion** (mastered → needs_review, time) | `decay` | **null** | engine decay branch, evaluated at `nowIso` (Invariant 1) |
| **Diagnostic credit** (→ mastered via placement) | `diagnostic` | null today* | `creditFromDiagnostic`; sets `masteredAt` directly (no attempts floor) |
| **Credit-propagation** (ancestor credited) | `credit-propagation` | **null** | diagnostic credit cascading to mastered prerequisites |

\* **Follow-up flag (Phase 5 §H, mr-kahn #6 recommend, NOT done):** populate
`MasteryUpdate.attemptId` on `trigger:"diagnostic"` with the demonstrated node's
neutral-P3 attempt id (leaving null only for pure credit-propagation ancestors).
The `demonstrated[]` evidence already carries `attemptIdRef`, so the data exists;
wiring it would touch the committed diagnostic credit path
(`creditFromDiagnostic` + the diagnostic server action), which Phase 5 left
unchanged to avoid engine regression. Until then, Invariant 1 governs: a
`diagnostic` update's null `attemptId` is acceptable, and `createdAt` is the
replay clock. Tracked for a follow-up.

---

## NCAA / COPPA / FERPA — needs-counsel (cross-ref privacy-checklist.md §5)

- **NCAA:** confirm the current published nontraditional-course checklist
  (defined timeframe, regular interaction, teacher access to student work, scope
  & sequence) before any NCAA claim. The spine stubs the timeframe
  (`course_enrollments`), interaction (`message_threads`/`messages`), and teacher
  access (staff-by-campus RLS); the *certification* is counsel's call.
- **COPPA:** the verifiable-consent **method** (`ConsentEvent.method`) needs
  counsel before wiring; school-consent-as-agent likewise.
- **FERPA:** the read-audit (`record_access_log`) is shape-only; the record-access
  policy and retention schedule need counsel.
- **State privacy statutes:** beyond COPPA/FERPA, per-state student-data-privacy
  laws need counsel (the `standards.state` field is the content placeholder).
