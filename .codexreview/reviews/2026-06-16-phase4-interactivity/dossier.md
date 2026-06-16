# Phase 4 — dossier

## Closes
- AUDIT D4: worked-example steppers are reveal-only slideshows (StepReveal default); no predict-then-
  reveal before interactive geometry; no self-explanation. CLAUDE §7: every atom predict/construct ->
  resolve; no advance without a committed output.
- D5 LIVE CUTOVER: engine-v2 (Phase 3, lib/engine-v2) is pure + tested but not yet wired. Phase 4
  composes applyEvidence + canLock into a session-update so in-session attempts feed PROVISIONAL
  state only; locked flips solely via delayed/unseen LockEvidence (the firewall) — at the LOGIC level
  (the React/Supabase wiring rides the existing engine-loop split + 0006 outbox).

## Substrate
- lib/engine-v2: applyEvidence(state, Evidence, BktParams, nowIso); canLock(LockEvidence[], {lowerBound,
  minPerDimension}); Evidence.kind in {new_acquisition, retrieval, delayed_lock_check}.
- lib/engine-loop (Phase 1): gradeAttempt (sync) / buildModelUpdateJob (durable async). 0006:
  submit_attempt RPC + model_update_outbox.
- Existing UI atoms already construct->resolve for typed/choice/coordinate/numberline (AUDIT D4
  positives); the reveal-only worked-example stepper (StepReveal) is the main slideshow violation.

## Review focus
Atom state machine airtight (no advance without committed output); updateNode cannot set locked from
in-session evidence; selector utility + frustration fallback safe (no trapping below level).
