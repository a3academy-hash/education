# H2 — Tutor panel shows mismatched / duplicate content — Fix Spec

## Problem (observed live, neutral-track student)
On a wrong answer with a matched misconception tag, the bounded TUTOR panel showed:
- the node's generic example-laden hook (`"5³ stacks three factors: 5·5·5 = 125 — never
  5×3."`) even though the on-screen problem was a different item — reads as "the tutor is
  talking about a different problem";
- TWO near-duplicate lines for a NEUTRAL student: the reframe (neutral hook) AND a
  `bridgeToNeutral` of `"The same idea works without the game: <same neutral hook>"` — the
  "without the game" copy is nonsensical for a student who never chose a sport, and it repeats
  the reframe.

## Root cause (verified)
`lib/ai-tutor/index.ts` `RuleBasedTutor.remediate(tag, node, sport)`:
- `reframe = sport === "neutral" ? "Look at it this way: " + neutralHook : "Think about it in
  " + sport + " terms: " + sportHook` (index.ts:34-37).
- `bridgeToNeutral = "The same idea works without the game: " + neutralHook` (index.ts:38) —
  built UNCONDITIONALLY, so a neutral student gets reframe = neutralHook AND bridge =
  neutralHook ⇒ duplicate + meaningless "without the game".
- The hook strings are NODE-level and may contain a canonical numeric example
  (data/algebra1-graph.json:4824) — they are the per-node sport/neutral on-ramp reframe, NOT a
  per-problem explanation (the per-problem help is the `why`, assembled from the matched
  problem's hints + worked example in `assembleIncorrectTagged`, lib/practice-session/index.ts:245).
- The Practice panel ALSO prepends a bold `"In context:"` before the reframe
  (PracticeFlow.tsx:551-554), so the student sees DOUBLE framing: "In context: Look at it this
  way: 5³ …". And it renders the bridge whenever non-empty (PracticeFlow.tsx:556-560).

## Design (best solution)
Two honest code fixes + one content ruling. The reframe stays a NODE-level concept reframe by
design (sport on-ramp → neutral transfer is the whole P1→P3 model); we fix the neutral
duplication and the double-framing, and ask mr-kahn to rule on example-laden hooks.

### D1 — Neutral students: no bridge (suppress the duplicate + "without the game")
In `RuleBasedTutor.remediate`, when `sport === "neutral"`:
- `reframe` = the neutral reframe (unchanged content), and
- `bridgeToNeutral = ""` (empty → the panel renders nothing; PracticeFlow.tsx:556 already gates
  on truthiness). There is no sport context to bridge FROM, so the bridge is meaningless and
  must not appear.
For a SPORT student, KEEP both: `reframe` = sport hook, `bridgeToNeutral` = neutral hook — this
is the intended on-ramp→neutral transfer (CLAUDE.md three-phase progression). The "without the
game" framing is appropriate there (the student DID pick a sport).

### D2 — Remove the double-framing
The reframe string carries its own lead-in ("Look at it this way:" / "Think about it in {sport}
terms:"). The panel's separate bold `"In context:"` label (PracticeFlow.tsx:553) is redundant
and, stacked with the lead-in, reads awkwardly. Drop the redundant UI label so a single, clean
framing remains. pee-wee directs whether to (a) keep the lib lead-in and drop the UI label, or
(b) drop the lib lead-in and keep a single UI label — pick ONE framing, not both. The bridge
line keeps its quieter treatment.

### D3 — Example-laden hooks (mr-kahn ruling, likely DEFER)
The neutral/sport hooks sometimes embed a specific numeric example (e.g. 5³=125). Because the
reframe is a NODE-level concept reframe (not problem-specific), showing a canonical example is
defensible IF the framing makes clear it's "the core idea for this skill," not "about this exact
problem." mr-kahn rules: (a) acceptable as-is given the framing fix in D2, or (b) hooks must be
de-exampled to be problem-agnostic — a broad content pass across nodes → if so, DEFER to the
content/normalization backlog (out of scope for this code fix), not built here.

## Tests
- `lib/ai-tutor/index.test.ts`: update/extend — sport student still gets sport hook in reframe
  AND neutral hook in bridge (existing assertions hold); ADD: a NEUTRAL student gets the neutral
  hook in the reframe AND an EMPTY `bridgeToNeutral` (no duplicate). Keys still exactly
  {diagnosis, reframe, bridgeToNeutral} (the TutorResponse shape is unchanged; bridge is "" not
  absent). The swapped-backend seam test is unaffected.
- Full unit suite stays green.

## Invariants
- The tutor still returns STRINGS ONLY; never routes / sets mastery / reorders (TutorResponse
  unchanged; bridge stays a `string`, just possibly empty).
- `diagnosis` STILL never reaches the student (PracticeFlow renders only reframe + bridge;
  BLOCKER-B comment at PracticeFlow.tsx:547-549 stands).
- No engine/evidence/RLS/SQL change. No new dependency. No graph data change (D3 deferred).
- `why` (the per-problem feedback) is untouched — it remains the primary, problem-specific help.

## Gates
- **mr-kahn:** the D3 example-laden-hook ruling; confirm that suppressing the neutral bridge and
  keeping the sport on-ramp→neutral bridge preserves the three-phase transfer pedagogy; confirm
  the reframe staying node-level (not problem-specific) is correct and the per-problem help still
  lives in `why`.
- **pee-wee:** the D2 single-framing decision (exact label/treatment) + that the neutral panel
  now reads as ONE clean reframe line (no duplicate, no "without the game").
- **mr-gates (light):** the `bridgeToNeutral = ""` branch + that nothing else consumes a
  non-empty bridge; no cross-module break.

---

## REVISION (codexreview round 1 — BINDING; supersedes conflicting text above)
informed + cold reviewers; all concerns accepted. The cold reviewer raised a BLOCKING concern
that D3 cannot be DEFERRED (it is the observed symptom). Implement to this section.

### R1 — D3 is a PRECONDITION ruling, NOT deferred (concern: node-hook-mismatch, blocking)
mr-kahn MUST rule before mr-grunt implements. RECOMMENDED path (concept-framing): the reframe's
lead-in frames the line as "the core idea for this skill," so an embedded canonical example
(5³=125) reads as ILLUSTRATIVE of the principle, not a claim about the on-screen problem — this
resolves the "talking about a different problem" perception with NO broad content rewrite, and the
per-problem help stays in `why`. If mr-kahn instead requires example-free hooks, that scoped
content change becomes the implementation. Either way the symptom is fixed here, not deferred.
The exact reframe lead-in copy is set by the mr-kahn (pedagogy) + pee-wee (voice) rulings below.

### R2 — Single framing, fully in the lib seam (concern: d2-framing)
DROP the UI `In context:` label (PracticeFlow.tsx:553). Keep the framing lead-in INSIDE the lib
`reframe` string so the FINAL display string is unit-tested in lib/ai-tutor (the repo has no
jsdom/RTL, so there is no React-render test; coverage = the lib output strings + the existing
truthiness render-gate at PracticeFlow.tsx:556). The panel then renders `reframe` (and, for sport
only, `bridge`) verbatim. pee-wee confirms the exact lead-in wording.

### R3 — Neutral branch + input contract (concerns: empty-bridge-contract, neutral-value-assumption)
`remediate(tag, node, sport: Sport)`. `Sport` is a closed union (types/core.ts:3-10) incl
"neutral"; `problem.sport` is always a valid member. Build the bridge ONLY when
`sport !== "neutral"`: `const bridgeToNeutral = sport === "neutral" ? "" : <neutral-bridge>;`.
`""` is safe across ALL consumers (enumerated in round-1.claude.json: produced in lib/ai-tutor,
carried verbatim through TutorPanel/TutorPanelData, rendered only in PracticeFlow gated on
truthiness and OUTSIDE the aria-live region; never serialized/logged/announced).

### R4 — Tests (concern: d2-ui-untested)
lib/ai-tutor/index.test.ts: sport student → reframe ⊇ sport hook AND bridge ⊇ neutral hook
(existing); NEUTRAL student → reframe ⊇ neutral hook AND `bridgeToNeutral === ""` (NEW); the
reframe carries the agreed concept-framing lead-in (NEW, assert the lead-in substring); keys still
exactly {diagnosis, reframe, bridgeToNeutral}; the swapped-backend seam test unaffected. Full
suite green.

### R5 — Doc supersede (concern: doc-framing-conflict)
Add a binding addendum to docs/design/phase4-direction.md at the `"In context: {tutor.reframe}"`
line: the UI label is removed; framing now lives in the lib reframe string; diagnosis is never
rendered. Adjust phase4-spec.md if it implies the label/diagnosis rendering.

### R6 — FINAL COPY (BINDING — mr-kahn + pee-wee resolved, orchestrator-reconciled)
mr-kahn ruled (a) concept-framing (no content rewrite). pee-wee set voice + "drop the bold label."
Minor divergence reconciled: mr-kahn's skill-scoped generality signal is a binding PEDAGOGICAL
requirement (so the reframe lead-ins use "the core idea … for this skill / in {sport} terms",
NOT problem-deictic "here/of this"); pee-wee owns VOICE (so the bridge drops "without the game").
Exact strings in lib/ai-tutor/index.ts:

```ts
const sportHook = node.contextHooks[sport];
const neutralHook = node.contextHooks.neutral;
const reframe =
  sport === "neutral"
    ? `The core idea for this skill: ${neutralHook}`
    : `The core idea, in ${sport} terms: ${sportHook}`;
const bridgeToNeutral =
  sport === "neutral"
    ? ""
    : `Stripped of the ${sport} context, it's the same move: ${neutralHook}`;
return { diagnosis, reframe, bridgeToNeutral };
```

PracticeFlow.tsx: DELETE the bold `<span className="font-medium">In context:</span>` (line 553);
render `{result.tutor.reframe}` as plain `text-ink-700` body (uniform weight, no eyebrow). The
bridge line keeps its quieter `text-[13px] text-ink-500` treatment (sport-only; neutral "" renders
nothing via the existing truthiness gate at :556).

Test substrings (R4 — corrected in round 2):
- neutral reframe ⊇ `"The core idea for this skill:"` AND ⊇ the neutral hook; neutral
  `bridgeToNeutral === ""`.
- sport reframe ⊇ `"The core idea, in "` AND ⊇ the sport hook; sport bridge ⊇
  `"Stripped of the " + sport + " context"` AND (SEPARATELY) ⊇ the neutral hook (the phrase and
  the hook are NOT contiguous — assert each with its own toContain).
- **End-to-end exact-string lock (R4.e2e, from cold round 2):** with a hook that carries a
  concrete example (e.g. neutral hook `"5³ = 5·5·5 = 125"`), assert the FULL neutral reframe
  EQUALS `"The core idea for this skill: 5³ = 5·5·5 = 125"` and the baseball reframe EQUALS
  `"The core idea, in baseball terms: <baseball hook>"`. This locks the skill-scoped framing so
  the rendered line cannot read as a claim about the on-screen problem.
- **All-sports sanity (R4.sports, from cold round 2):** iterate every non-neutral `Sport`
  (baseball, softball, basketball, soccer, football, volleyball) and assert the reframe contains
  `"The core idea, in " + sport + " terms:"` and `bridgeToNeutral` is non-empty; neutral asserts
  `bridgeToNeutral === ""`. (pee-wee confirmed all six are display-ready; no label table.)
