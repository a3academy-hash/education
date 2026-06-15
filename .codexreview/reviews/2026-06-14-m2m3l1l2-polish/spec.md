# M2 / M3 / L1 / L2 — Copy & content polish batch — Fix Spec

Four lower-severity QA findings from the live student walkthrough. Each is scoped small;
all are display/copy (no engine/evidence/RLS/SQL change, no new dependency).

---

## M2 — "Sports context" phase label shown to neutral-track students
### Problem
The phase chip reads "Sports context" (Phase 1) even for a NEUTRAL-track student whose
problems are not sport-themed. The label map `{1:"Sports context",2:"Blended",3:"Neutral
transfer"}` is duplicated in FOUR surfaces and never consults the student's sport:
- PracticeFlow.tsx:42-46 (render :226) — `phase` is a prop; student sport NOT currently passed.
- summary/page.tsx:51-55 (render :290 "Phase reached") — student IS loaded (repo.getStudent →
  StudentProfile.sport available in build()).
- LearnClient.tsx:72-76 (render :188) — `sport` prop already in scope.
- student home page.tsx:45-49 (render :235) — `student` loaded server-side (student.sport avail).

### Design
1. Add ONE shared pure helper `phaseLabel(phase: Phase, sport: Sport): string` in lib (e.g.
   `lib/session-helpers/phase-label.ts`, re-exported from the barrel). Replace all four local
   PHASE_LABEL maps with it (DRY). Unit-test it.
2. For a real sport, labels are unchanged ("Sports context"/"Blended"/"Neutral transfer").
   For `sport === "neutral"`, return non-sport labels. mr-kahn defines the exact neutral wording
   (phase semantics is curriculum); RECOMMENDED: P1 "Applied context", P2 "Blended", P3 "Standard
   notation". pee-wee confirms voice.
3. Thread the student's sport to the 3 surfaces that lack it: Practice (pass `sport` from the
   practice server page, which already resolves `student.sport`), Summary (use `student.sport`
   from the already-loaded profile in build()), Home (pass `student.sport`). Learn already has it.

### Gates: mr-kahn (neutral phase-label semantics/wording), pee-wee (voice), mr-gates (light: the
shared helper + threading sport through the 3 surfaces; no behavior change beyond the label).

---

## M3 — Learn page: "THE IDEA" and "IN CONTEXT" render the same contextHook
### Problem
LearnClient: "THE IDEA" body = `concept = phase===3 ? contextHooks.neutral : contextHooks[sport]`
(LearnClient.tsx:335,344). "IN CONTEXT" ALSO renders that same hook (sport hook P1-2 at :586;
neutral hook P3 at :561) — so the two cards repeat the identical string. For a Foundations skill
the "in context" panel adds nothing distinct. (Overlaps the existing E1 backlog note.)

### Design (mr-kahn rules the approach — curriculum content)
Option A (RECOMMENDED if objectives are student-suitable): "THE IDEA" body = `node.objective`
(the concept), so it is DISTINCT from the sport/neutral hook bridge. Objectives are authored but
in teacher-voice imperative ("Interpret and evaluate whole-number exponents…"); mr-kahn rules
whether to use as-is, lightly reframe, or reject. "IN CONTEXT" keeps the hook→standard-notation
bridge unchanged.
Option B (display-only, no content dependency): keep "THE IDEA" = hook, but stop "IN CONTEXT" from
re-rendering the SAME hook already shown in "THE IDEA" — IN CONTEXT shows only the part THE IDEA
did not (the standard-notation/neutral line + the sport→neutral breadcrumb). For P3 where both are
inherently the neutral hook, collapse to a single card or show only the breadcrumb.
mr-kahn picks A or B (or defers M3 to the E1 content pass if a minimal fix can't be honest).

### Gates: mr-kahn (which option; content correctness), pee-wee (card structure/copy),
mr-gates (light if Option B touches only render).

---

## L1 — Progress "LEARNED THIS WEEK": uncapped wall + credited-as-learned
### Problem
`digest.masteredThisWeek` includes EVERY `newStatus==="mastered"` update in the 7-day window
(progress-digest.ts:76-87,98-107) — diagnostic-credit + credit-propagation + practiced — with NO
cap, so a freshly-placed student sees ~28 items the first week. Each is tagged `credited`
(CreditedTag) when diagnostic-credit (good — the trust-layer distinction exists), but the header
"LEARNED THIS WEEK" frames placed-out skills as "learned."
### Design (honors the standing trust-layer rule: distinguish credited vs practiced)
1. In the digest, SPLIT `masteredThisWeek` by `credited`: `provenThisWeek` (credited = diagnostic
   placement) vs `learnedThisWeek` (practiced/taught). (Keep the existing combined field or derive
   the split in the page — mr-gates picks the cleaner seam; prefer splitting in the digest with a
   unit test.)
2. Progress page: lead with "Learned through practice" (the taught list, usually short), and show
   the credited set under a separate, honest heading ("Proved on your diagnostic") that is CAPPED
   (show first N, e.g. 6, then "and X more") so it is not a wall. pee-wee sets the exact headings,
   cap N, and treatment; mr-kahn confirms the credited-vs-learned framing is accreditation-honest.
### Gates: mr-kahn (credited-vs-learned honesty), pee-wee (headings/cap/treatment), mr-gates
(light: the digest split + test).

---

## L2 — "Time on task" reads low (sums per-attempt answer time)
### Problem
`digest.timeOnTask` = `sum(windowAttempts.timeMs)` (progress-digest.ts:125-128), where each
`timeMs` is client start-to-submit per item (PracticeFlow.tsx:134). This is ACTIVE answer time,
not wall-clock; it reads low ("2 min") to a parent.
### Design (honesty over inflation — do NOT switch to wall-clock, which would count idle time)
The metric is honest as "active time on problems"; the fix is the LABEL, not the number. Relabel
"Time on task" → a clearer phrase that sets the right expectation (e.g. "Active time on problems"
or "Time working problems"). pee-wee sets the exact label; mr-kahn confirms it is an honest effort
descriptor (not inflated, not implying wall-clock). No computation change.
### Gates: pee-wee (label), mr-kahn (honest-metric confirm). No mr-gates needed (label only).

---

## Cross-cutting invariants
- No engine/mastery/router/checkAnswer/evidence/RLS/SQL change. No new dependency.
- New pure helpers (phaseLabel; possibly the digest split) are unit-tested. The repo has no
  jsdom/RTL → component visuals verified by reading + (optionally) a live chrome-devtools pass.
- Full unit suite stays green.

## Tests
- phaseLabel: every (phase × {a real sport, neutral}) returns the expected label; neutral never
  returns "Sports context".
- digest split (if done in lib): a diagnostic-credited update lands in proven, a practiced mastery
  lands in learned; counts correct; window respected.
- M3/L2 are copy/structure — covered by reading + gate sign-off (no pure seam unless the digest
  split is extracted).

---

## FINAL (codexreview round 1 + mr-kahn + pee-wee — BINDING; supersedes conflicting text above)
Contract pinned (concern: undefined-domain-types): `Phase` = 1|2|3; `Sport` = closed union
baseball|softball|basketball|soccer|football|volleyball|neutral (types/core.ts:3-10); "neutral" IS
a Sport member; student.sport/problem.sport always a valid member. Helpers are total over these.

### M2 — phaseLabel(phase: Phase, sport: Sport): string  (new lib/session-helpers/phase-label.ts, re-export from barrel)
- sport !== "neutral": {1:"Sports context", 2:"Blended", 3:"Neutral transfer"} (unchanged).
- sport === "neutral": {1:"Concrete examples", 2:"Bridging to notation", 3:"Standard notation"}.
Replace the 4 local PHASE_LABEL maps with this helper. Thread the student's sport: Practice (pass
`sport` from the practice server page → PracticeFlow prop; render at :226 `phaseLabel(phase, sport)`);
Summary (use `student.sport` from the loaded profile in build()); Home (use `student.sport`);
Learn (already has `sport`). Unit-test: every phase × {a real sport, neutral}; neutral NEVER yields
"Sports context"/"Blended"/"Neutral transfer".

PRECONDITION (concern: profile-sport-authority): a student has exactly ONE track = `student.sport`.
The practice server selects problems via `selectProblems(node, state, student.sport)`, so ALL
rendered content is in that track; the P1/P2/P3 phase captures the scaffolding within it. There is
no per-route/per-session sport override (retention probes still render in the student's sport).
Therefore `student.sport` is the authoritative source for the LABEL SET and the phase picks the word
within it — no display-context divergence to reconcile.

### M3 — Option B, IN CONTEXT de-dup (LearnClient ContextBridge ~533-603)
THE IDEA unchanged: body = `concept = phase===3 ? contextHooks.neutral : contextHooks[sport]`.
IN CONTEXT general rule: compute its candidate line(s), DROP any equal (trimmed) to `concept`, and
render NULL (no card, no filler) if nothing remains. Concretely:
- Neutral track (any phase): render NULL (would only echo the neutral hook THE IDEA shows).
- Sport P1/P2: render eyebrow "In context" + sub-label "Standard notation" + body = neutralHook.
  DROP the sport-hook "Example/{sport} example" line and the "transfers to" divider.
- Sport P3: render eyebrow "In context" + a MUTED breadcrumb "You first saw this as: {sportHook}"
  (text-[12.5px] text-ink-500). Do NOT show neutralHook (THE IDEA already did). If
  `sportHook === neutralHook` → render NULL.
Reuse existing strings ("In context", "Standard notation", "You first saw this as:"). Extract a
PURE selector (inputs: phase, sport, contextHooks, → { idea: string; inContext: {kind:"none"} |
{kind:"notation"; body:string} | {kind:"breadcrumb"; sportHook:string} }) so the de-dup logic is
unit-tested for P1/P2/P3 × sport/neutral and the sportHook===neutralHook case; assert IN CONTEXT
never equals THE IDEA's idea string and is "none" for the neutral track.

### L1 — Progress: split practiced vs credited (digest + page)
Digest (lib/digest/progress-digest.ts): split the in-window mastered set by the EXISTING per-row
`credited` boolean — which is already computed via `isCreditedNotTaught(skillId, attempts, updates)`
(progress-digest.ts:100-102). Do NOT split by the raw latest-trigger: mastery is STICKY, so a
credited skill later practiced emits no new mastered update; `isCreditedNotTaught` correctly
excludes credited rows that have a `source="practice"` attempt newer than the latest mastered
update (decision-timeline.ts:247-267). So: `learnedThisWeek` = rows with `credited === false`;
`creditedThisWeek` = rows with `credited === true`. This matches the per-row CreditedTag exactly.
Keep titles/helpsUnlock shape. Unit-test: an attempt-mastered row → learned; a diagnostic row →
credited; a credit-propagation row → credited; a diagnostic-mastered row WITH a newer
`source="practice"` attempt and no later mastered update → learned (the sticky-mastery case);
window respected.
Progress page (~87-112): render two sections in the existing hero Card, practiced FIRST:
1. "Learned through practice" — `learnedThisWeek`, UNCAPPED, keep the CheckIcon. (Empty → keep the
   existing InsetPanel encouragement.)
2. "Credited from your diagnostic and earlier skills" — `creditedThisWeek`, separated by `mt-6` +
   the eyebrow (no hard rule, same Card), CAPPED at N=6 (most-recent first); after the 6th a single
   muted line `and {X} more` (text-[12.5px] text-ink-500, mt-2, no icon/link); if ≤6 show all, no
   "and X more". Use CreditedTag only (NO CheckIcon — avoid double-signal). Empty → render nothing.

### L2 — Progress: relabel only (no computation change)
"Time on task" → "Active time on problems" (progress/page.tsx ~149). Add a sub-caption under the
value: "Focused time spent answering, not counting breaks." (text-[11.5px] text-ink-400, mt-0.5).
`digest.timeOnTask` computation UNCHANGED.
