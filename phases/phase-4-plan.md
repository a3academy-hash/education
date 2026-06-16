# Phase 4 — INTERACTIVITY + SPEED — Plan

**Plan against:** CLAUDE §7, AI_ADAPTIVE §0/§9. **Closes AUDIT D4** (reveal-only slideshows; no
predict-then-reveal) **+ the D5 live cutover** (route mastery through engine-v2's gate so no
in-session path locks). All new logic is PURE + framework-neutral (lib/), fully tested; UI wiring
(React) is thin over it.

## Deliverables (pure, tested)
1. **Predict→resolve atom contract — `lib/atoms/`:** a pure state machine for the CLAUDE §7
   invariant "every atom is predict/construct → resolve; no advance without a committed output."
   `type AtomState = "awaiting_prediction" | "resolving" | "resolved"`. `predict(atom, input)`
   requires a committed output before `resolve()`; `canAdvance(state)` is false until `resolved`.
   Worked-example fading ladder (full → fill-step → independent) as a pure `fadeStage(phase, n)`.
   This makes "no slideshow" a typed invariant, not a per-screen hope.
2. **engine-v2 session update — `lib/engine-v2/session.ts`:** `updateNode(state, evidence, params,
   nowIso) -> { next, masteryUpdate }` composing applyEvidence + the gate. The D5 cutover at the
   LOGIC level: a session's in-session attempts feed PROVISIONAL state + tutor routing; `locked`
   flips true ONLY via `canLock(lockEvidenceHistory)` (delayed/unseen) — never from an in-session
   attempt. A `recordLockCheck()` appends a LockEvidence row only for kind delayed_lock_check.
3. **Selector — `lib/engine-v2/selector.ts`:** composite utility (BKT info-gain + retention-
   preservation + transfer-coverage) targeting the §8 success band; frustration-fallback hook
   (consecutive errors → easier). Pure, deterministic given inputs.

## Speed (architecture, measured in §verify with the engine-loop split)
- The optimistic/async split (lib/engine-loop, Phase 1) + the submit_attempt RPC + outbox (0006)
  are the speed substrate. Phase 4 confirms the loop returns the grade before the model update; the
  <800ms end-to-end profile is a documented target (live profiling needs the running Supabase, a
  Matt-run infra check — logged), with the architecture proven to not block on persistence.

## Out of scope (logged)
- The actual React rebuild of every lesson atom (large; the contract + fading ladder land here, the
  per-atom UI migration is incremental and rides the existing components which already construct→
  resolve for typed/choice/coordinate). The reveal-only worked-example stepper is the priority UI fix.
- LLM-on-stuck-state remains advisory/out (frontier).

## Codex review ask
Is the atom state machine actually airtight (no path to advance without a committed output)? Does
updateNode guarantee no in-session path sets locked=true? Is the selector utility well-defined and
the frustration fallback safe (can't trap a student below their level)?
