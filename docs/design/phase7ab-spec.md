# Phase 7 — Workstreams A & B — Design Spec (for Checkpoint 1 gate)

Status: DRAFT for gate review (mr-gates, pee-wee, mr-kahn). No code until gated + Matt approval.

Hard constraint (whole phase): nothing here changes how mastery is computed or how
routing decides. A and B are **read-only views over the existing immutable evidence
logs**. No engine module is touched. No new mastery/router math.

All field/method names below are verified against the current codebase (types/student.ts,
types/engine.ts, types/compliance.ts, types/repository.ts, lib/mastery-engine,
lib/adaptive-router, lib/transcript).

---

## 0. Shared foundations (both workstreams)

### 0.1 Read models live in `/lib` as pure functions
New pure, unit-testable builders. They consume what `A3Repository` already returns
(`listAttempts`, `listMasteryUpdates`, `getSkillStates`, `getGraph`) plus the existing
engine read functions (`computeMasteryAll`, `computeOverlay`, `recommend`,
`buildStandardTranscript`). **No new repository methods are required for A/B.**

- `lib/insight/decision-timeline.ts` → `buildDecisionTimeline(...)`
- `lib/insight/flags.ts` → `computeFlags(...)`
- `lib/insight/roster.ts` → `buildRoster(...)`
- `lib/digest/progress-digest.ts` → `buildProgressDigest(...)`

All take a `nowIso` parameter (no internal `Date.now()` — determinism + testability,
matching the engine convention).

### 0.2 Staff gate (the open auth question — mr-gates please rule)
RLS helpers (`app.is_staff_for_campus`, role claim) exist in the migration but **auth
is not wired** and `InMemoryRepository` serves every request with no identity.

Proposed honest seam: a single server-only chokepoint `requireStaff()` in
`lib/auth/staff-guard.ts`:
- **Today (pre-auth):** resolves from a server-only env/cookie stub; returns staff or
  `notFound()`. Mirrors the `/dev/*` `notFound()`-in-production posture.
- **When Supabase auth lands:** this one function reads the JWT `role` claim
  (`role === 'staff'`) and `campus_id`, exactly as the RLS policies already expect.
  Every `/admin/*` route calls it; it is the single place auth gets wired later.

This keeps "build for it now, certify later" honest: the chokepoint exists, the
production data path is closed, and there is exactly one seam to wire. **mr-gates owns
this decision — if you prefer `/admin/*` simply mirror `/dev` (notFound in prod) with no
stub identity, say so.**

---

## A. Admin Decision Log & Student Insight

Routes (staff-only, behind `requireStaff()`):
- `/admin/students` — roster
- `/admin/students/[studentId]` — per-student insight

### A.1 Decision Timeline (centerpiece) — `buildDecisionTimeline`

Input: `graph`, `attempts: StudentAttempt[]`, `updates: MasteryUpdate[]`,
`states`, `nowIso`. Output: `DecisionTimelineEntry[]` (reverse-chronological).

**Grouping:** consecutive attempts collapse into a **session-level entry** keyed by
`StudentAttempt.sessionId` (the field already exists on every attempt + update).
Within a session entry we surface: skill title, attempt count, correct count, hints
total, phase span, sport, time-on-task sum. Expandable to the raw attempt rows (the
audit view) — each raw row shows problemId, response, correct, phase, hintsUsed, timeMs.

**Narrative fidelity rule (mr-kahn gate):** every sentence is composed ONLY from
(a) structural facts literally present in the logs (dates, counts, status transitions,
phase, trigger) and (b) the engine's own `MasteryUpdate.reason` string. We do **not**
author interpretive language the engine didn't produce. Mapping:

| Log fact | Timeline sentence (template) |
|---|---|
| `MasteryUpdate.trigger="diagnostic"`, `newStatus="mastered"` | "{date} — Credited {skillTitle} from neutral Phase-3 diagnostic evidence." + verbatim `reason` |
| `trigger="credit-propagation"` | "{date} — Credited {skillTitle} as a prerequisite of demonstrated work." + verbatim `reason` |
| `newStatus="prerequisite_gap"` | "{date} — Locked {skillTitle}; prerequisite below threshold." + verbatim `reason` |
| router `kind="remediate"` (derived from state, not stored) | "{date} — Routed backward to strengthen {prereqTitle} before {blockedTitle}." |
| session of practice attempts on skill X | "{dateRange} — Practiced {skillTitle}: {n} attempts, {c} correct, {phaseSpan}." |
| `trigger="decay"`, `newStatus="needs_review"` | verbatim decay `reason` (already states base × factor = score) |
| `newStatus="mastered"` after practice | "{date} — Mastery proven on {skillTitle} with neutral-phase transfer." + verbatim `reason` |

Every entry carries an **evidence footer**: `attemptIds[]`, `masteryUpdateIds[]`,
`engineVersion` (from `MasteryUpdate.engineVersion`). This is the audit link.

> Open question for mr-kahn: the example sentence in the prompt ("Detected prerequisite
> gap … Routed backward … transfer proven Jun 14. Resumed …") spans MULTIPLE log events
> (a lock, a remediation arc, a later mastery). Do you want (a) one composite arc entry
> that stitches lock→remediation→resume, or (b) strict one-entry-per-log-event with the
> arc implied by adjacency? (b) is maximally faithful; (a) reads better for an academic
> director. Recommendation: (b) per event, with a lightweight "arc" grouping header that
> only joins events that share the same locked/blocked skill — no invented causality.

### A.2 Live Mastery Map
Reuses the **existing** `computeOverlay(graph, states, masteryResults)` →
`StudentOverlay`. Rendered visually:
- per-domain bars from `overlay.summary.domainProgress[d].avgMastery` (reuse `Progress`)
- per-node `StatusChip` from `OverlayNode.effectiveStatus` (reuse `StatusPill`)
- current recommendation + reason from `recommend(...)` (reuse)
- locked nodes show `OverlayNode.blockedBy` → blocking node title
- diagnostic-credited nodes marked: a node is credited-not-taught when its mastery came
  from a `MasteryUpdate` with `trigger ∈ {diagnostic, credit-propagation}` and it has no
  `source="practice"` attempts. Mark with a "Credited" chip.

No new math — this is the same overlay the student home already computes.

### A.3 Flags Panel (deterministic, rule-based — NO LLM) — `computeFlags`
All thresholds read from `MASTERY_CONFIG` / `PROBLEM_CONFIG` where one exists; any
flag-specific constant is declared in a `FLAGS_CONFIG` literal (documented, human-checkpoint
to change — same posture as MASTERY_CONFIG).

| Flag | Rule (from logs) |
|---|---|
| Stalled node | ≥3 distinct sessions on a skill with no `status` improvement across them |
| High hint dependence | rolling hint rate over recent attempts above a `FLAGS_CONFIG.hintRate` floor |
| Rushing | attempts under `MASTERY_CONFIG.timing.rushingMs` (5000ms) above a frequency floor |
| Decayed-mastery review queue | states with `status="needs_review"` that were once `masteredAt != null` |
| Retention probes due | **stub until Workstream C lands** — panel slot present, populated later |
| Days since last session | `nowIso − max(StudentAttempt.createdAt)` |

Each flag is `{ kind, severity, skillId?, detail, evidenceAttemptIds[] }`. No
editorializing — detail is a factual count/date.

### A.4 Roster — `/admin/students` — `buildRoster`
One row per student: current node (from `recommend`), status, last active
(`max createdAt`), open-flags count (`computeFlags` length). Sortable columns. Reuses
`Table`. This is the "is the AI working across the whole school" view.

> Note: a "list all students" repository read does not exist yet
> (`A3Repository` is per-student). For the demo/in-memory era, roster iterates the known
> student set the in-memory store holds. A real `listStudents(campusId)` is a future
> repository addition (mr-gates gates `types/`); flag it, don't build it now.

---

## B. Parent / Student Progress Digest

Route: `/student/progress` (self-scoped via the existing `STUDENT_COOKIE` → studentId;
a student/parent only ever sees their own record — same posture as the rest of
`/student/(shell)`). Lives **inside** the `(shell)` group; add "Progress" to the
`AppShell` nav.

### B.1 Weekly Digest View — `buildProgressDigest`
Pure builder returning a serializable `ProgressDigest` DTO (so a later Resend email job
reuses it unchanged — **no email sending this phase**). Fields:
- **Skills mastered this week**: nodes whose `masteredAt` (or mastery `MasteryUpdate`
  `createdAt` with `newStatus="mastered"`) falls in `[nowIso−7d, nowIso]`, each with
  **what it unlocks** (`OverlayNode.unlocks` → titles).
- **Current focus + reason**: `recommend(...)` title + its one-sentence `reason`
  (verbatim — already written for a 12-year-old).
- **Time on task**: sum of `StudentAttempt.timeMs` in the window, humanized.
- **What's next**: the recommended skill's objective + what it leads to.

**Honesty rule (carried from Phase 3, mr-kahn gate):** no percentage is shown for a
domain with no measured evidence. A domain with zero attempted/probeable nodes renders
"Not yet assessed", never "0%". Register: grades-6–8 parent, plain language, no inflated
claims ("mastered" only where the engine says `mastered`).

### B.2 Mastery Transcript (family view)
Reuses the **existing** `buildStandardTranscript(graph, states, masteryUpdates, opts)`
→ `StudentStandardTranscript` (the Phase 5 artifact). Rendered readable:
standard code → plain-language description → status → date proven.

- "Plain-language description" source: per-standard human text. The transcript row
  currently carries `ccss` + `componentSkillIds` but **no prose description**. Options:
  derive from component node titles (no new content) or add an authored CCSS→prose map.
  **mr-kahn: which?** Recommendation: derive from component skill titles for now (zero
  new content, fully evidence-backed), and log "authored CCSS descriptions" as a content
  backlog item — avoids fabricating standards prose ahead of the CCSS verification pass.
- "Date proven": the `createdAt` of the qualifying mastery update (already in
  `evidenceUpdateIds`). Credit-bearing vs prerequisite-review split is preserved from the
  builder. This is the artifact a parent shows a receiving school.

### B.3 Architecture note
`buildProgressDigest` is a pure function of (graph, states, updates, attempts, nowIso) →
DTO. The page server-component calls it; a future email job calls the same function.
Query is structured window-first so the email cadence (weekly) maps directly.

---

## Gates requested
- **mr-gates**: the read-model boundary (no engine mutation, pure builders, repository
  reads only), the `requireStaff()` seam decision, RLS posture for `/admin/*`, and the
  `listStudents` deferral.
- **pee-wee**: admin screens (internal, but must be calm + scannable per standards) and
  `/student/progress` (paying-family surface = full quality bar). Layout/IA direction.
- **mr-kahn**: narrative-template fidelity (A.1 — no editorializing), the timeline
  arc-grouping question, the CCSS plain-language description source (B.2), and the
  honesty rule enforcement (B.1).

Verdict format: APPROVE | APPROVE WITH CHANGES (list) | REJECT (reason).

---

## GATE RESOLUTIONS — BINDING (supersedes any conflicting text above)

Verdicts: mr-gates APPROVE WITH CHANGES · pee-wee APPROVE WITH NOTES · mr-kahn
APPROVE WITH CHANGES. No rejections. The following is the law mr-grunt builds to.

### Architecture / boundary (mr-gates)
G1. Builders consume `computeMasteryAll(...).results` ONLY — never persist
    `proposedUpdates`. Zero write-method calls in any builder.
G2. `requireStaff()` (lib/auth/staff-guard.ts): in production with no JWT →
    `notFound()` (mirror the `/dev/*` posture). A stub staff identity is permitted
    ONLY when `NODE_ENV !== "production"` and must be inert in a prod bundle.
    Returns `{ role: "staff", campusId: string | null }` to match the JWT claims
    the RLS already reads (`role`, `campus_id`). No backdoor to real data.
G3. All read builders accept a `campusId` parameter NOW (in-memory era passes the
    single seeded campus) so the later RLS swap doesn't change signatures.
G4. Add `listStudents(): Promise<StudentProfile[]>` to `A3Repository` NOW (no
    campusId param yet). InMemoryRepository iterates its own Map; SupabaseRepository
    throws "not implemented" like its siblings. This is the ONE gated `types/`
    change A requires — reaching past `private` is rejected. **→ Matt-visible.**
G5. New cross-module DTOs (`DecisionTimelineEntry`, `ProgressDigest`, `FlagEntry`,
    `RosterRow`) live in `/types`, no `any` at the boundary.
G6. `FLAGS_CONFIG` is a documented literal (rationale inline per constant); not a
    Matt-checkpoint (it holds no mastery weights). Reused thresholds read from
    `MASTERY_CONFIG`/`PROBLEM_CONFIG`.
G7. All builders take `nowIso`; no `Date.now()`. `/student/progress` and `/admin/*`
    are server-component only — no client fetch of the digest/timeline.

### Narrative fidelity (mr-kahn) — these change the A.1 template table
K1. **REMOVE the dated "Routed backward…" timeline template.** A router
    recommendation is NOT a logged event and must not carry a fabricated date.
    Surface current routing in A.2 Live Mastery Map (present tense), using the
    engine's VERBATIM router `reason` ("{blocked} is waiting on this skill, so we
    strengthen it first."), never a paraphrase.
K2. Arc grouping = **option (b)**: one entry per log event; a non-causal arc header
    keyed on shared blocked `skillId` ("{blockedTitle} — prerequisite arc"). No
    "because/so that" prose. No synthesized "resume" event. Composite (a) rejected.
K3. Lock template: use the engine's verbatim `reason` ("Locked: the prerequisite
    skill {title} needs strengthening first."); drop the "below threshold"
    paraphrase; key the template on `newStatus="prerequisite_gap"`, NOT on a
    nonexistent "lock" trigger (real trigger is "attempt" or "decay").
K4. Credited-not-taught chip: true only when there is NO `source="practice"` attempt
    **newer than the latest `newStatus="mastered"` update** (not lifetime). Else a
    credited-then-practiced node would mislabel.
K5. Transcript CCSS column derives from component skill titles, labeled **"Skills in
    this standard"** — never presented as an official definition of the standard.
K6. Digest "mastered this week" window INCLUDES restoration (`needs_review→mastered`)
    and diagnostic/credit-propagation masteries — but visually distinguishes
    **credited** from **practiced** mastery (CreditedTag). Relabel "unlocks" →
    **"helps unlock"** / "a prerequisite for" (a node isn't open until ALL prereqs
    clear).

### UX / IA (pee-wee)
P1. Per-student admin page: two-column, **timeline-dominant** (wide left ~1.6fr).
    Sticky right rail ~1fr: Flags on top, Mastery Map below. Thin full-width
    standing strip under the header (staff MAY see per-domain `avgMastery` bars —
    the no-% honesty rule is student/parent-only). No CTA button on this page.
P2. `DecisionTimeline`: left-rail 1px spine + 7px outcome dot per entry. Collapsed =
    3 lines max (date + templated/verbatim sentence; quiet mono metadata line;
    nothing else). Expand via one "Show {n} attempts" disclosure → dense `Table`
    inside `InsetPanel`; evidence footer (`attemptIds`/`masteryUpdateIds`/
    `engineVersion`) as 11px mono "Evidence" receipt. Dot color = outcome status
    token; **never tint whole rows red.** Reduced-motion + keyboard + AA contrast.
P3. Flags use `InsetPanel` (NOT `AlertPanel`). No red, no warning triangles, no
    badge pills. Severity = 7px dot only (info=ink-500, attention=developing token).
    Plain-language labels ("Frequent hints"). Empty state: "No signals to review —
    {name} is progressing as expected." Retention-probes-due = disabled
    "available soon" slot (show the seam).
P4. `/student/progress`: digest first (hero Card), transcript second (`Table`,
    default density). Parent-legible voice; no engine jargon (no "trigger/overlay/
    phase span"). No %, no empty 0-bars, no comparative/normative language, no raw
    audit rows, no "AI" framing. Primary action = "Continue learning" → /student.
P5. New components: `DecisionTimeline`; **`StaffShell`** (separate from student
    `AppShell` — staff nav "Students", quieter, NOT student-branded) wrapping
    `/admin/*`; `CreditedTag` (faint chip, both admin map + parent transcript).
    Add `{ href: "/student/progress", label: "Progress" }` to `AppShell` NAV.

### Net new surface area for implementation
- types: `listStudents()` on `A3Repository` (G4); DTOs (G5).
- lib: `insight/decision-timeline.ts`, `insight/flags.ts`, `insight/roster.ts`,
  `digest/progress-digest.ts`, `auth/staff-guard.ts`, `FLAGS_CONFIG`.
- components: `DecisionTimeline`, `StaffShell`, `CreditedTag`.
- routes: `/admin/students`, `/admin/students/[studentId]`, `/student/progress`.
- All read-only over existing logs; engine modules untouched; unit tests per builder.
