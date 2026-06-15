# Polish-batch dossier — evidence (from a read-only map of the four surfaces)

## M2 — PHASE_LABEL duplicated in 4 surfaces
- PracticeFlow.tsx:42-46 map; render :226 `{PHASE_LABEL[phase]}`. `phase` is a prop
  (PracticeFlowProps); student sport NOT passed today. The practice SERVER page resolves
  `sport = student.sport` and calls selectProblems(node,state,sport) — so sport is available to
  pass into PracticeFlow.
- summary/page.tsx:51-55 map; render :290 `value: PHASE_LABEL[phaseReached]`. build() loads the
  student via repo.getStudent(studentId) → StudentProfile has `sport`.
- LearnClient.tsx:72-76 map; render :188. `sport: Sport` already a prop (:114). Easiest.
- student home page.tsx:45-49 map; render :235. `student` loaded server-side (:81); student.sport
  available, just not threaded to the render.
- Sport union (types/core.ts:3-10): baseball|softball|basketball|soccer|football|volleyball|neutral.

## M3 — Learn duplication
- LearnClient.tsx:335 `const concept = phase === 3 ? contextHooks.neutral : contextHooks[sport];`
- THE IDEA card: label :339 "The idea"; body :344 `<MathText>{concept}</MathText>`.
- WORKED EXAMPLE: :242 label; body from workedExamples[0].title + steps (distinct field — NOT a
  duplication).
- IN CONTEXT (ContextBridge): P3/neutral branch :550-569 renders neutralHook (:561) + optional
  sport breadcrumb (:565); P1-2 branch :574-601 renders sportHook (:586) + neutralHook (:599).
- DUPLICATION: THE IDEA shows the hook (sport hook P1-2, neutral hook P3); IN CONTEXT re-renders
  that SAME hook. node.objective (authored, teacher-voice imperative — e.g. "Interpret and evaluate
  whole-number exponents as repeated multiplication.") is a candidate distinct source for THE IDEA.

## L1 — Progress masteredThisWeek
- progress/page.tsx:47-55 buildProgressDigest(...); render :87-112 maps digest.masteredThisWeek;
  CreditedTag shown when m.credited (:99-101).
- lib/digest/progress-digest.ts:76-87 collects EVERY newStatus==="mastered" update in the 7-day
  window (WINDOW_DAYS=7, no cap); :98-107 maps to DigestMasteredSkill with
  `credited: isCreditedNotTaught(skillId, attempts, updates)` (from lib/insight/decision-timeline).
- So credited (diagnostic placement) and practiced mastery are in ONE uncapped list under the
  "LEARNED THIS WEEK" header. The credited/practiced distinction EXISTS as a per-row tag.

## L2 — Time on task
- progress/page.tsx render :149-152 `{digest.timeOnTask}`.
- progress-digest.ts:125-128 `windowAttempts = attempts.filter(inWindow); timeMs =
  reduce(s + a.timeMs)`. humanizeMs (:35-44) → "X min". a.timeMs = client start-to-submit per item
  (PracticeFlow.tsx:134 `Date.now() - startRef.current`). Active answer time, not wall-clock.

## Standing constraint
- Matt's trust-layer rule (memory trust-layer-integrity-principles): always distinguish credited
  vs practiced mastery; never inflate. Drives L1 (split) and L2 (relabel, don't pad).
