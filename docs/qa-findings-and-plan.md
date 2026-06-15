# QA — Student Walkthrough Findings + Quality-Assurance Plan

Date: 2026-06-14. Method: live click-through via Chrome DevTools MCP, supabase mode, as a
real student (Coyb, neutral track, post-diagnostic placement). Surfaces exercised:
Learning Home → Learn (ALG-F04) → Practice (full loop) → Summary → Progress; admin
decision-log + roster verified in a prior pass. **Console was clean across the entire
journey** (only the React DevTools dev notice) — no runtime errors; live Supabase
persistence worked on every attempt.

## What's working (baseline confidence)
- No console/runtime errors anywhere in the student journey; every practice attempt
  persisted to Supabase under RLS (Submit → busy → feedback).
- **Dynamic feedback is genuinely good** — references the actual answer and the specific
  misconception ("Not yet — Multiply 4·4, do not double the 4"; "Correct — 64. Why it
  works: six factors of 2").
- Hint progression, streak counter, the N+1 "Stretch ahead" probe framing ("doesn't count
  against you"), adaptive recommendation + "moved you forward" acceleration messaging, the
  worked-example stepper, the standards transcript, and the LB3 choice widget all work.
- KaTeX math renders correctly on screen.

---

## Resolution status (2026-06-14)
All seven findings below were fixed via the `/codexreview` adversarial chain (informed+cold
plan review → mr-kahn/mr-gates/pee-wee gates → implement → diff review), committed:
- **H1** `b2851b3` — summary split into 3 honest states + param-less recovery.
- **H2** `d982eb1` — tutor neutral-bridge suppressed + skill-scoped reframe; double-framing removed.
- **M1** `2ccf3ce` — KaTeX `htmlAndMathml` (math now exposed to assistive tech).
- **M2/M3/L1/L2** `e140ae8` — neutral phase labels; Learn "In context" de-dup; Progress
  practiced-vs-credited split (capped); "Active time on problems" relabel.
Per-fix audit trails live under `.codexreview/reviews/2026-06-14-*`. Suite: 570 → 694 tests.
Remaining: a real screen-reader (NVDA/JAWS/VoiceOver) pass for M1 is a manual QA-matrix item;
plan sections B–F (E2E/axe automation, full matrix, perf) still open.

## Findings (severity-tagged)

### HIGH — correctness / trust
- **H1 — Post-practice Summary is not reconstructable.** After completing a 5-problem set,
  `/student/summary` shows "No session to summarize yet." on direct nav / refresh, and the
  "See your summary" button did not visibly navigate on click. The attempts ARE persisted in
  Supabase, but the summary depends on ephemeral in-session state. A student who refreshes
  or deep-links loses their summary. Fix: reconstruct the summary from the persisted session
  (sessionId → attempts) and/or make the button transition reliable.
- **H2 — AI-tutor panel shows mismatched, generic content.** On a wrong answer to a `4²`
  problem, the TUTOR panel rendered the node's generic `5³` hook ("5³ stacks three factors…
  125") — unrelated to the actual problem — used "the same idea works without the **game**"
  copy for a *neutral*-track student (no game), and showed two near-duplicate lines. This is
  the `lib/ai-tutor` RuleBasedTutor stub surfacing node-level hooks verbatim; in the live
  flow it reads as confusing and undercuts the tutor's credibility. (Known stub, but it is
  student-facing now.)

### MEDIUM — accessibility / content
- **M1 — Math notation has no accessibility text alternative.** KaTeX-rendered math (5³,
  2³, x², …) renders visually but is ABSENT from the accessibility tree across Learn,
  Practice, and the diagnostic — screen readers hear "What  Really Means", "Evaluate ",
  "Why it works:  means 2·2·2". WCAG failure. Fix: add an aria-label / visually-hidden text
  (or MathML) alternative in the MathText component.
- **M2 — "Sports context" label shown to neutral-track students.** The phase chip reads
  "Sports context" even for Coyb (neutral track) with non-sport problems (paper-folding,
  group-message). Copy mismatch — should read e.g. "Real-world context" when sport = neutral.
- **M3 — Learn-page content duplication.** "THE IDEA" and "WORKED EXAMPLE" cards share the
  identical title ("What 5³ Really Means"), and "IN CONTEXT → STANDARD NOTATION" shows the
  SAME sentence as "THE IDEA" for this Foundations skill — the "in context" panel adds
  nothing distinct. (Overlaps the existing E1 backlog note about concept/context alignment.)

### LOW — polish
- **L1 — Progress "LEARNED THIS WEEK" lists ~28 items.** Every diagnostic-credited skill is
  listed individually (a long scroll); consider summarizing ("you proved 28 skills"). Also
  "LEARNED" labels diagnostic-CREDITED (placed-out) skills — the CREDITED tag mitigates, but
  the header verb is slightly off.
- **L2 — "Time on task: 2 min"** underrepresents real engagement — it sums per-item answer
  time (timeMs), not wall-clock. Parent-facing "effort" metric reads low.

---

## Quality-Assurance Plan

### A. Fix the findings (gated as usual; priority order)
1. H1 summary reconstruction, H2 tutor mismatch (highest — correctness/trust).
2. M1 math a11y (also the seed of a broader a11y pass), M2 neutral-context copy.
3. M3 / L1 / L2 (content + polish; fold M3 into the existing E1 content note).

### B. Automated test coverage — close the live-only gap
The unit suite (668) covers pure engine/builders but **nothing covers the live Supabase
paths** (auth mint, persistence, RLS, summary, choice rendering end-to-end). Add:
1. **E2E harness (Playwright)** against a seeded throwaway Supabase test project: the full
   loops — parent signup→confirm→launch, diagnostic (incl. a choice item scoring correct),
   practice (correct/wrong/hint/probe/summary), admin decision-log + the RLS deny cases from
   the browser. New dependency (Playwright) → Matt checkpoint.
2. **Automated a11y checks (axe-core)** on every screen in CI — would have caught M1.
3. **Repository contract tests** that run the SAME suite against InMemory AND a live
   SupabaseRepository (parity), so "in-memory is the contract" is enforced, not asserted.

### C. Manual QA matrix (per release)
Surface × state × variant:
- **Surfaces:** onboarding, diagnostic, home, learn, practice, summary, progress, parent
  dashboard/provision/consent/switch, admin roster/insight, auth (signup/confirm/signin).
- **States:** loading, empty, error, paused-consent, session-expiry (the child-never-sees-
  auth-error path).
- **Answer kinds:** numeric, expression, choice, inequality, numeric-set, coordinate — each
  renders the right widget and scores correctly (the LB3 class).
- **Tracks:** each of the 7 sports + neutral (context copy, hooks) — M2 lives here.
- **Roles:** student, parent, the 3 staff tiers — access + what each sees/can't see.
- **Viewports:** 13–16" laptop primary (desktop-first); a mobile sanity pass.

### D. Content QA pass (mr-kahn)
The tutor/context-hook mismatches (H2), sport-vs-neutral copy (M2), duplicate titles (M3),
and the existing normalization/CCSS backlog (notation unification, §A/§B/§C, the hook
defects E11/F02/F03) are one focused content-and-copy audit.

### E. Process / regression discipline (already in place — keep)
- Every fix runs the four-agent gate + mr-gates diff review; engine stays byte-verified.
- Live-verify each student-facing fix via the chrome-devtools walkthrough (this method).
- Pre-production launch blockers remain: LB1 dashboard toggle, COPPA consent-method counsel.

### F. Performance & resilience (not yet assessed)
- Lighthouse/Core-Web-Vitals on the student surfaces; the per-attempt Supabase round-trip
  latency (Submit "busy" time) under load; graph-bundle size on first load.
