# Phase 4 Engine + Persistence + Content Spec (binding) — 2026-06-10

Folds mr-gates (persistence, 8 changes + exact ordering), mr-kahn (content, 12 items),
and reconciliations. Screens: docs/design/phase4-direction.md (pee-wee, binding).
Compose COMMITTED engines only — no new mastery/routing/phase logic. No new deps.

## A. /types changes (additive; mr-gates change #1, APPROVED)
- ADD `sessionId: string` to BOTH StudentAttempt and MasteryUpdate (required on NewStudentAttempt/NewMasteryUpdate via the Omit). Doc-comment mirrors `source`: provenance/audit only; ISOLATION RULE — sessionId must NEVER enter mastery/phase/routing math. Supabase note: `session_id uuid not null` (Phase 5: references sessions(id); bare uuid until then; additive/reversible).
- RIPPLE (gated, do first + typecheck whole tree before screens): update the committed Phase-3 diagnostic action (app/student/(shell)/diagnostic/actions.ts) to generate ONE sessionId per diagnostic submission and stamp every appended attempt + MasteryUpdate; update in-memory + supabase repo insert paths; update any test fixtures constructing attempts/updates. Keeps the column non-null everywhere.

## B. "WHY" assembly (mr-kahn #1 — NO new per-problem explanation field; reconciles pee-wee's templates)
pee-wee's feedback templates ({whatRight}.{whyItWorks}. / {whatYouDid}.{theFix}.) are filled from EXISTING content, never a new field:
- WRONG + matched tag (State B): primary = misconceptionRegistry[tag].description, STUDENT-REPHRASED (item 5), + the tutorRemediation panel (diagnosis/reframe/bridgeToNeutral). theFix from the registry description's corrective clause. CLARIFICATION (2026-06-14): `diagnosis` is audit-only and NEVER student-facing — the panel renders only `reframe` (+ the sport-only `bridgeToNeutral`).
- WRONG + no tag (State C): reveal the next progressive hint as the "why-not-yet" (never fabricate a misconception). Deeper fallback = the node's workedExample terminal reveal step. No tutor panel.
- CORRECT (State A): whyItWorks = the terminal reveal step of the workedExample whose pattern matches the item ("this is the {worked example title} pattern"); whatRight = restated result. No generated prose, no new field.
Binding: assemble "why" from {misconceptionRegistry[tag].description, hints[], workedExamples[].steps[].reveal, tutorRemediation()} — all existing in v1.6.0 graph.

## C. Student-facing weakness rephrase (mr-kahn #5)
Registry descriptions are expert/audit register — do NOT surface raw to students. Student-facing weakness statements (Summary "WHAT TO FIRM UP" + Practice "why") must be growth-framed rephrases, descriptive not evaluative. INTERIM SOURCE (this phase): tutorRemediation().diagnosis + reframe (already student-directed/bounded). The instructor/audit view retains raw description. FLAGGED FOR MATT (non-blocking): an optional `studentMessage` string per misconceptionRegistry entry is the clean permanent home (recommended by mr-kahn); interim fallback ships Phase 4 without it.

## D. Worked-example-first (mr-kahn #2)
REQUIRED before Practice unlocks IF the student enters at Phase 1 with status ∈ {unknown, introduced, developing}: the Learn StepReveal must be advanced through ≥1× this session (record the seen-event). EXPERTISE-REVERSAL GUARD: do NOT gate for status ∈ {near_mastery, needs_review}, phase ≥ 2, or arrival via accelerate/diagnostic credit — worked example optional for them (forcing experts back = redundancy effect + seat-time padding). Plain rule: "See the example once, then you start practicing."

## E. Three-phase fade (mr-kahn #3) — display only, never a mastery path
P1 sport prominent; P2 sport+neutral parity (genuine notation/neutral pairing, not reskin); P3 neutral teaching + a faded "You first saw this as: {sport hook}" breadcrumb (honest scaffold acknowledgement, decorative). P3 problems are neutral (engine sportForPhase forces neutral@3); mastery requires P3 neutral transfer. Fade changes pixels, never the gate.

## F. Transfer-gate + verdict mapping (mr-kahn #4) — INVIOLABLE
Practice/Summary NEVER write a mastered status directly — persist attempts, recompute via computeMasteryAll, display result. computeTransfer counts phase===3 only; sport (P1/P2) success advances phase but never transfer. Probes counting toward transfer is correct (a P2 student's probe is neutral P3); log isProbe + true phase on every probe. SUMMARY VERDICT derived from recommend() output (single source of truth, never a parallel mapping): advance ⇐ kind ∈ {accelerate, complete} OR just-practiced node status mastered; continue ⇐ developing/near_mastery (router continue); review ⇐ needs_review (router review); remediate ⇐ prerequisite_gap (router remediate).

## G. Hints (mr-kahn #6)
One at a time in hints[] order; max two; never the answer. Hints DO carry the committed mastery penalty (baseScoreFor hintFactor via hintRate) — log hintsUsed per attempt + increment StudentSkillState.hints (never suppress to flatter score — REJECT-level). A hint read is not an attempt; only a submitted answer is. Plain: "Hints are always here; leaning on them a lot just means we practice a bit more before it counts as mastered."

## H. Persistence — PER-ATTEMPT (mr-gates decisions 1–6); EXACT ordering for ONE submit
Server action (app/student/(shell)/practice/[skillId]/actions.ts, "use server"; DTO/constants in sibling non-"use server" module). studentId from cookie. All via getRepository() (server-only). Client sends RAW {skillId, problemId, response, timeMs, hintsUsed, phase, isProbe, sessionId}; server re-checks (never trusts client correctness). Ordering:
0. Validate: studentId present + exists; problem belongs to node; phase/isProbe consistent with a legitimately-served slot for current phase/sport. Else FAIL DTO.
1. nowIso = explicit ISO.
2. check = checkAnswer(problem, rawResponse); correct = check.correct; misconceptionTags = check.misconceptionTag ? [check.misconceptionTag] : [].
3. attempt = appendAttempt({studentId, skillId, problemId, phase, sport, response: rawResponse, correct, hintsUsed, timeMs(clamped), misconceptionTags, isProbe, source:"practice", sessionId}) — IMMUTABLE log FIRST.
4. prev = getSkillStates(studentId)[skillId] ?? blankState().
5. attempts = listAttempts(studentId, skillId) (includes step-3 row).
6. Build running state: nextRecent = [...prev.recent, {correct, timeMs, phase}].slice(-5); accumulate attempts+1/correct/hints/timeMs; nextPhase = advancePhase(attempts, prev.phase, PROBLEM_CONFIG); nextTransfer = computeTransfer(attempts, PROBLEM_CONFIG); lastAttemptAt = nowIso.
7. setSkillState(candidateState) so computeMasteryAll sees new recent/phase/transfer/counters.
8. batch = computeMasteryAll(studentId, getSkillStates(studentId), graph, nowIso) — EXACTLY ONCE.
9. proposed = batch.proposedUpdates.find(u => u.skillId===skillId). IF exists: (a) appendMasteryUpdate({...proposed, attemptId: attempt.id, trigger:"attempt", sessionId, engineVersion: ENGINE_VERSION}); (b) finalState = {...candidateState, mastery: proposed.newMastery, status: proposed.newStatus, phase: proposed.newPhase}; IF newStatus==="mastered": finalState.masteredAt = nowIso; finalState.recent = [] (SAME write, never recompute recent after reset); setSkillState(finalState). ELSE finalState = {...candidateState, mastery: batch.results[skillId].score}; setSkillState(finalState).
10. Return NARROW DTO (correct, misconceptionTags, tutor inputs as needed, phaseChanged flag) — never serialize graph/overlay.
RULES: append-attempt always first (evidence before decision); computeMasteryAll exactly once; MasteryUpdate.attemptId = real attempt.id (diagnostic used null; practice uses real id); recent[] reset coincides with the mastered transition in the single setSkillState; setSkillState is the ONLY mutable write — no update/delete on attempts/mastery (BLOCKER). advancePhase/computeTransfer fed from the PERSISTED log not client-accumulated arrays.

## I. Summary data (mr-gates decision 5) — before/after from MasteryUpdate rows
Scope session via sessionId: listAttempts/listMasteryUpdates filtered by this session's sessionId. For a node touched this session: before = prevMastery/prevStatus of FIRST session update; after = newMastery/newStatus of LAST. No status change → before===after from current StudentSkillState, delta 0. Fully reconstructable from immutable rows; no snapshot stored. Verdict cites driving attempt ids + MasteryUpdate reason/engineVersion (instructor view); student sees the human reason.

## J. Learn screen (read-only; no persistence)
Server component: cookie→repo→computeMasteryAll for this node's status/phase/mastery + node content (objective, workedExamples, contextHooks, visual, videos placeholder). Renders per phase4-direction §1. Records the worked-example-seen precondition (D) client-side for the session gate; the precondition is a UI gate, not an evidence row (no attempt logged for "saw example").

## K. Scope guard (mr-gates #6) + open items
No Phase-5 surface: no sessions table (sessionId is a stamped column only), no migrations, no graph inspector, no compliance spine. "Next" routes to existing learn/[skillId] / practice/[skillId] / home. tutorRemediation is presentation-only — never written to any row, never influences correct/mastery, in-process (no fetch). OPEN FOR MATT at checkpoint (non-blocking, do NOT fix in screens): advancePhase's denominator spans prior same-phase attempts across sessions (committed behavior) — if product wants strictly within-session phase advance that's an mr-kahn engine change, flag don't inline.

## L. Tests (vitest)
- The sessionId ripple typechecks/passes across diagnostic action + repos + fixtures.
- Practice action ordering: append-attempt-first; exactly one computeMasteryAll; MasteryUpdate.attemptId = real id; recent[] reset only on mastered transition; no update/delete path.
- source/sessionId isolation: neither changes advancePhase/computeMastery output.
- Server re-check: a client-claimed-correct wrong answer logs correct=false (correctness from server checkAnswer).
- Verdict mapping: each router kind → correct Summary verdict.
- Before/after reconstruction from MasteryUpdate rows (first prev / last new) for a multi-attempt session.
- Worked-example gate: required for P1 unknown/introduced/developing; not gated for near_mastery/phase≥2/accelerated.
- Two end-to-end loop tests mirroring engine-walkthrough style: struggling student (miss+tag → tutor inputs present → verdict review/remediate, backward route) and accelerating student (P3 neutral correct → transfer set → mastered → verdict advance, forward route).
