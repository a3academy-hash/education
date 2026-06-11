# Phase 3 Engine + Architecture Spec (binding) — 2026-06-10

Folds mr-kahn (logic, 6 changes), mr-gates (architecture, 9 changes), and the
resolved StudentAttempt-marker conflict into the implementation contract. Screen
direction is docs/design/phase3-direction.md (pee-wee, binding). Build with the
committed engine + Phase 2 primitives; touch NO committed engine logic.

## A. /types additions (additive only; mr-gates-approved)
- `types/student.ts` StudentAttempt: ADD `source: "practice" | "diagnostic"` (default "practice" at every writer; NewStudentAttempt inherits it as REQUIRED). Provenance, orthogonal to isProbe. ISOLATION RULE: `source` must NEVER enter mastery/phase math — advancePhase/selectProblems/computeMastery ignore it. It is write-side provenance + read-side audit only. (Supabase later: `source text not null default 'practice' check (source in ('practice','diagnostic'))`, no RLS change, additive/reversible.)
- New `types/diagnostic.ts`:
  - `ConfidenceLevel = "high" | "medium" | "low" | "unknown"`
  - `ResponseType = "input" | "plane" | "line" | "table"`
  - `DiagnosticItem { skillId: string; phase: Phase; responseType: ResponseType; problem: ProblemTemplate }` — phase is ALWAYS 3 for credit-bearing items (neutral). The type makes a non-neutral credit-bearing item unrepresentable.
  - `DiagnosticNodeEstimate { status: MasteryStatus; confidence: ConfidenceLevel; evidenceAttemptIds: string[] }` (evidence pointers for audit reconstructability).
  - `DiagnosticClusterEstimate { domainId: string; status: MasteryStatus; confidence: ConfidenceLevel; masteredEstimate: number; total: number; unestimated: boolean }`
  - `DiagnosticSession { studentId: string; config: DiagnosticConfig; asked: string[]; responses: { skillId: string; correct: boolean; attemptIdRef?: string }[]; queue: string[]; localized: Record<string, boolean>; progress: number }` (immutable — recordResponse returns a NEW session)
  - `DiagnosticResult { perNode: Record<string, DiagnosticNodeEstimate>; byCluster: DiagnosticClusterEstimate[]; demonstrated: string[]; recommendedStart: string; recommendedReason: string }` (recommendedStart may be "" when complete, mirroring AdaptiveRecommendation.skillId).
  - `DiagnosticConfig` matching DIAGNOSTIC_CONFIG below.
  - Narrow server-action result DTO `DiagnosticPersistResult { recommendedSkillId: string; recommendedReason: string; creditedCount: number; skippedCount: number }` (NEVER returns graph/overlay to client).
- No `any` at any boundary. byCluster domainId keyed to graph.domains[].id.

## B. NEW pure module lib/diagnostic-engine/index.ts (no React/IO/Date.now/Math.random; deterministic; "now" as ISO param)
export `DIAGNOSTIC_CONFIG` (single home, Matt-checkpoint tuning):
  { maxItems: 15, creditDepthConfirm: 4, anchorMetric: "prereqDepthWithinDomain", confidence: {...} }

DEPTH METRIC (mr-kahn #1 — BLOCKING): node `tier` == domain tier (validator-enforced), so tier is USELESS for within-domain depth. Compute `prereqDepthWithinDomain(node)` = longest prerequisite chain back to a domain root, counting only same-domain edges. Anchors and descent use THIS, never tier.

PROBEABILITY GATE (mr-kahn #2 — BLOCKING): a node is probeable iff its p3 bank is non-empty. Currently only Foundations/Equations/Linear authored; Systems/Polynomials/Quadratics/Data have empty p3. nextItem selects ONLY probeable nodes; if descent/advance lands on an empty-bank node, fall through deterministically to the nearest probeable neighbor (documented rule), else mark the domain unprobed. finishDiagnostic reports any unprobed domain as confidence "unknown", cluster unestimated:true — NEVER medium/high without authored p3 evidence. recommendedStart must NOT route a student past an unprobed domain on inference alone.

NEUTRAL-P3 GATE (mr-kahn #3 / mr-gates #1): diagnostic serves ONLY p3 (neutral) problems for any credit-bearing item. A node enters demonstrated[] ONLY on a correct neutral-p3 item. DiagnosticItem.phase===3 enforces it at the type level.

APIs:
- `startDiagnostic(graph, studentId, config) → DiagnosticSession`: seed queue with ONE anchor per PROBEABLE domain (mr-kahn #5 minimum coverage — anchors allocated FIRST, costing ≤ #probeable-domains of the budget; remaining budget spent on descent/confirmation, deepest-uncertainty domain first). Anchor = max prereqDepthWithinDomain node (probeable), tie-break fewest unlocalized dependents then lexicographic skillId.
- `nextItem(session, graph) → DiagnosticItem | null`: pull a neutral p3 problem (deterministic: lowest problem id) from the head probeable node; null when every probeable domain localized OR maxItems hit. Also expose `progress` 0..1 on the session (fraction of probeable domains localized, blended with budget used) for the UI rail.
- `recordResponse(session, graph, skillId, correct) → DiagnosticSession` (immutable, deterministic, pure of (graph,config,responses)):
  - CORRECT on X → infer X + same-domain prereq ancestry provisionally mastered; do NOT probe ancestors; advance FORWARD/deeper to an un-inferred dependent or next anchor. CONFIRMATION PROBE (mr-kahn #4): if crediting X's correctness would credit ancestry crossing a DOMAIN boundary OR ≥ creditDepthConfirm ancestors, enqueue ONE confirming probe on a mid-depth ancestor BEFORE those ancestors enter demonstrated[]. Correct confirm → credit chain (both probed = high, between = medium). Incorrect confirm → do NOT credit above the confirm point; descend from the confirm node.
  - INCORRECT on X → gap at/below X; descend to X's weakest un-probed same-domain prerequisite (greatest prereqDepthWithinDomain, then lexicographic). If none un-probed, X is the gap locus.
- `finishDiagnostic(session, graph) → DiagnosticResult`:
  - perNode: directly-probed = high (evidenceAttemptIds = that probe); inferred-by-correct-descendant = medium (evidence = the descendant probe); descended-past-but-not-answered = low; never-touched-never-inferred = unknown. (mr-kahn #6 — split low vs unknown; every estimate carries evidenceAttemptIds.)
  - demonstrated = nodes answered correctly on a neutral-p3 item (and, for confirmation-gated chains, only those whose confirm passed).
  - byCluster rollup per domain (unestimated:true for unprobed domains).
  - recommendedStart/Reason: via committed recommend() over POST-credit state (see persistence ordering).
- Pure helpers (mr-gates #3, no repo interface change): `wasDiagnosticRun(updates: MasteryUpdate[]): boolean` (any trigger "diagnostic"); `diagnosticCreditedSkills(updates): string[]`. Used by Learning Home for the completion signal + acceleration callout — derived, not stored.

DETERMINISM (mr-gates #4): item sequencing is a pure function of (graph, config, responses). Same responses → identical sequence; permuted graph node order → identical sequence. Unit-tested.

## C. Diagnostic UI app/student/(shell)/diagnostic/page.tsx (+ client flow component, per phase3-direction.md)
Client component holds in-progress session (startDiagnostic → nextItem loop → recordResponse). On finish, calls a server action.
SERVER ACTION (app/student/(shell)/diagnostic/actions.ts, "use server"; constants/DTO in a sibling non-"use server" module per the onboarding pattern). ORDER (mr-gates #5, exact): (a) append ONE StudentAttempt per diagnostic item via appendAttempt — phase 3, sport "neutral", real problemId, real response, source:"diagnostic", isProbe:false, hintsUsed:0, misconceptionTags from checkAnswer; (b) compute demonstrated[]; (c) creditFromDiagnostic(studentId, graph, demonstrated, states, nowIso); (d) persist each returned NewMasteryUpdate via appendMasteryUpdate; (e) for each credited node setSkillState with masteredAt set + recent:[] (StudentSkillState convention); (f) return narrow DiagnosticPersistResult DTO only. Repo accessed via lib/repository/server.ts (server-only). NEVER serialize graph/overlay to client.
RETAKE (mr-gates #2): strictly ADDITIVE — appends fresh attempt rows + can only ever credit more; cannot revoke prior diagnostic credit (sticky ever-mastered + lockConfirm floor). Document this in the engine header AND ensure the summary UI does not imply re-placement.

## D. Learning Home app/student/(shell)/page.tsx (server component; replaces placeholder)
Reads a3_student_id cookie → lib/repository/server.ts → profile + states + graph. Runs computeMasteryAll + computeOverlay + recommend ONCE per request (O(nodes+edges); no per-render traversal). Composes per phase3-direction.md §3. Acceleration strip driven by diagnosticCreditedSkills(...) vs recommend justCredited. NO engine logic inlined — call committed pure functions. Recent history from listMasteryUpdates/listAttempts. No third-party requests.

## E. Scope guard (mr-gates #8)
"Start learning session" routes to the existing app/student/(shell)/learn/[skillId] PLACEHOLDER. Do NOT build the practice/learning runtime (Phase 4). No new repo interface methods.

## F. Dependency note (mr-gates #9 — Matt checkpoint)
server-only npm package is RECOMMENDED but NOT added in this phase (new dependency = Matt human-checkpoint; not yet approved). Keep the existing runtime guard in lib/repository/server.ts (typeof window throw). Phase 3 ships safely on the guard. Flag for Matt.

## G. Tests (vitest)
- prereqDepthWithinDomain correctness; anchors are deepest probeable per domain.
- ≤15-item bound across the real graph (3 authored domains) — assert maxItems never exceeded; assert every probeable domain probed ≥1×.
- Determinism: same responses → deep-equal sequence; permuted node order → identical sequence.
- Probeability gate: a node with empty p3 is never served; unprobed domain → unknown/unestimated in result.
- Neutral-P3 gate: only phase-3 items credit; a (hypothetical) non-neutral item can never enter demonstrated[].
- Confirmation probe: a correct anchor crediting a cross-domain/≥4 ancestry requires a confirm; incorrect confirm blocks credit above the confirm node and descends.
- Acceleration: advanced simulated student (mostly correct) → demonstrated ancestry credited, recommendedStart is forward, credited nodes never recommended for teaching.
- Backward routing: weak simulated student (incorrect at a mid node) → descends to weakest prereq; recommendedStart is that prereq.
- Evidence: every perNode estimate carries evidenceAttemptIds; demonstrated nodes traceable.
- source isolation: a source:"diagnostic" attempt does NOT change advancePhase output.
- Two end-to-end simulated students (weak → backward routing; advanced → acceleration), mirroring lib/engine-walkthrough.test.ts style.
