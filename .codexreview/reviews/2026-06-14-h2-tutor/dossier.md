# H2 dossier — evidence

## lib/ai-tutor/index.ts — the bug
- `remediate(misconceptionTag, node, sport)`:
  - `const sportHook = node.contextHooks[sport];` (index.ts:32)
  - `const neutralHook = node.contextHooks.neutral;` (index.ts:33)
  - `reframe = sport === "neutral" ? \`Look at it this way: ${neutralHook}\` : \`Think about it
    in ${sport} terms: ${sportHook}\`;` (index.ts:34-37)
  - `bridgeToNeutral = \`The same idea works without the game: ${neutralHook}\`;` (index.ts:38)
    ← built unconditionally; for neutral this duplicates the reframe + says "without the game"
    to someone with no game.
- `diagnosis = entry?.description ?? FALLBACK_DIAGNOSIS` (index.ts:31) — audit-only, never shown.

## Call site — problem IS in scope (so problem-specific help already exists)
- `lib/practice-session/index.ts:232-245`: on `check.misconceptionTag`,
  `const t = await tutorRemediation(check.misconceptionTag, node, problem.sport, ...)` (234-238),
  `tutor = { diagnosis, reframe, bridgeToNeutral }` (244),
  `why = assembleIncorrectTagged(problem, hintsUsed, node.workedExamples, raw.response)` (245).
  → the per-PROBLEM help is `why` (problem hints + worked example). The tutor reframe is the
  per-NODE sport/neutral concept reframe — intentionally not problem-specific.

## Render — the double framing + bridge gating
- PracticeFlow.tsx:529 panel shows only when `result.tutor && (reframe || bridgeToNeutral)`.
- :547-549 BLOCKER-B comment: "tutor.diagnosis … is NEVER rendered to a student."
- :551-554 reframe line with a bold `In context:` prefix BEFORE `result.tutor.reframe` (which
  itself begins "Look at it this way:"/"Think about it in … terms:") → double framing.
- :556-560 bridge line renders whenever `result.tutor.bridgeToNeutral` is truthy → empty string
  suppresses it cleanly (no code change needed in the panel for D1).

## The example-laden hook (D3 context)
- data/algebra1-graph.json:4824 ALG node neutral hook: `"5³ stacks three factors: 5 · 5 · 5 =
  125 — never 5 × 3."` — concept reframe with a baked canonical example. Same node's problems
  include other bases (4·4·4, 2·2·2), so the hook's 5³ example won't match every item — but the
  reframe is node-level by design, so this is a framing/labeling question, not a per-item bug.

## Type contract (so "" is safe)
- TutorResponse / TutorPanel / TutorPanelData all type `bridgeToNeutral: string` (required) —
  an empty string is valid and renders nothing. No optionality change needed.
- lib/ai-tutor/index.test.ts asserts keys == {bridgeToNeutral, diagnosis, reframe} and that
  baseball reframe⊇baseball hook, bridge⊇neutral hook, neutral reframe⊇neutral hook. The neutral
  bridge is currently NOT asserted empty — the new test adds that.

## Ruled out
- Threading the problem into the tutor to make the reframe problem-specific: rejected — the
  reframe is the node-level sport on-ramp by design; problem-specific help already exists as
  `why`. Adding it would duplicate `why` and conflate two layers.
- Making bridgeToNeutral optional in the type: unnecessary — "" renders nothing and keeps the
  shape stable for the LLM-backend seam.
