# A3 — Project TODO (living, prioritized)

Single source of open work. **Check this at the start of each feature and re-prioritize as items
are added/closed.** Newest context wins; convert relative dates to absolute. When an item ships,
move it to "Done (recent)" with its commit, or delete once it's old news. Detailed backlogs live in
the linked docs — keep this list to the *decision-level* items.

Last reviewed: 2026-06-15.

---

## P0 — Launch blockers (must clear before real families)
- [ ] **LB1 — re-enable Supabase email confirmation.** App code already handles the
      pending-confirmation flow; remaining is Matt's **dashboard** action: Confirm email ON; Site
      URL + redirect `/auth/sign-in?confirmed=1`; confirmation email template. (docs/design/lb1-…md)
- [ ] **COPPA parental-consent method.** Verifiable-consent mechanism counsel for under-13
      (separate from LB1). Accreditation/legal — needs Matt + counsel decision.

## Pre-pilot required — must clear before any BATCH_REGEN pilot gate
- [ ] **diagnostic-sim estimator variance: raise N 500 → 2000** (~4× the 11s runtime) to shrink the
      false-READY estimate's variance. PROMOTED 2026-07-06: the false-READY ≤.05 bound tipped on a
      pure RNG reshuffle when node 75 landed (~1-count margin at N=500) — the estimator lacks the
      power to support pilot verdicts; raise N before any BATCH_REGEN pilot gate reads this bound.
      Any future trip of that bound is a REAL signal (universe rescoping is a one-time correction,
      never repeatable).

## P1 — Quality & test coverage (QA plan §B–F, docs/qa-findings-and-plan.md)
- [ ] **E2E harness (Playwright)** vs a seeded throwaway Supabase test project — full loops
      (signup→confirm→launch, diagnostic incl. a choice item, practice correct/wrong/hint/probe/
      summary, admin decision-log + RLS deny cases). **New dependency → Matt gate.**
- [ ] **Automated a11y (axe-core) in CI** on every screen (would have caught M1). **New dep → gate.**
- [ ] **Repository contract/parity tests** — run the same suite against InMemory AND a live
      SupabaseRepository so "in-memory is the contract" is enforced.
- [ ] **Real screen-reader pass for M1** — verify MathML reads correctly in NVDA/JAWS/VoiceOver
      (code ships MathML; only the Chrome a11y tree was verified).
- [ ] **Full manual QA matrix** — surface × state (loading/empty/error/paused-consent) ×
      answer-kind × track (7 sports + neutral) × role (student/parent/3 staff) × viewport.
- [ ] **Performance** — Lighthouse/Core-Web-Vitals on student surfaces; Supabase per-attempt
      round-trip latency under load; first-load graph bundle size.

## P2 — Content / curriculum backlog
- [ ] **Normalization & standards pass** — docs/content/normalization-backlog.md §A–I (notation
      unification, etc.).
- [ ] **CCSS verification pass** — deferred standards/hook/granularity defects (memory:
      ccss-verification-pass-queue).
- [ ] **Batch minor defects** — deferred MINORs from the batch-1…7 content audits (memory).
- [ ] **Phase 7D — summative/grading** — own checkpoint (memory: phase-7-trust-credit).
- [ ] **Phase 7C — retention probes** — verify shipped vs TODO before scheduling.

## P3 — Smaller follow-ups
- [ ] PLATFORM.md P1 items: campus_id denormalization, studentMessage field, hook defects
      E11/F02/F03.
- [ ] Phase 11 §I nits (deferred during Supabase wiring).

---

## Working conventions (apply to every item)
- Substantive fixes go through `/codexreview` (informed+cold plan → diff review) **and** the
  CLAUDE.md agent gates (mr-kahn / mr-gates / pee-wee) before mr-grunt implements; audit trail
  under `.codexreview/reviews/`.
- Honor the trust-layer rules: never date a non-event; always distinguish credited vs practiced
  mastery; never inflate metrics.
- Hard human checkpoints stand: SQL migrations, mastery-weight/threshold changes, new
  dependencies, accreditation/NCAA ambiguity.

## Done (recent)
- 2026-06-14 — All 7 live-QA findings fixed via /codexreview: H1 `b2851b3`, H2 `d982eb1`,
  M1 `2ccf3ce`, M2/M3/L1/L2 `e140ae8` (570→694 tests). See docs/qa-findings-and-plan.md.
- 2026-06-14 — Phase 11 live verification + LB2 (FERPA read-audit) + LB3 (choice render) closed
  (memory: phase-11-supabase-wiring).

## P0-adjacent — graph 1.12.0 follow-ups (added 2026-07-06)
- [ ] **ALG-L19 bank lands before any student ships.** The stub node is router-recommendable once
      L03/L05/L06 are mastered and shows "being prepared" empty states; progress/transcript
      denominators include an uncompletable 75th node until the Phase-3 enriched bank lands.
      (mr-gates SHOULD-FIX, DECISION_F-IF-B6 §7.)
- ~~diagnostic-sim estimator variance (N 500 → 2000)~~ — PROMOTED 2026-07-06 to
      "Pre-pilot required" above (the bound tipped on a pure RNG reshuffle at node-75 landing;
      pilot verdicts need the power).
