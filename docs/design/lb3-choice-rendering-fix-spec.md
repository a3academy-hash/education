# LB3 fix — Diagnostic/Practice render `choice` items as a text box — Design Spec

Status: DRAFT for gate review (pee-wee — the choice widget + student-surface UX; mr-gates —
widget selection, DTO change, validator structure, no-engine-change; mr-kahn — the data fix
+ validator semantics + diagnostic measurement integrity). HIGH priority — closes LB3
before real students take the diagnostic. Matt approved the full scope; implement after
gates (no further Matt stop per standing autonomy). Implementation on Opus.

## Root cause (confirmed, live)
**RENDER (primary):** `DiagnosticFlow.tsx` (line 262) and `PracticeFlow.tsx` (line 279)
unconditionally render one free-text `<Input placeholder="Type your answer">` and never
branch on `answer.kind`. So `kind:"choice"` items show a blank box → the student must type
the exact canonical option string (whitespace-exact) → `checkAnswer` exact-match fails
correct answers → engine under-credits → routes the student backward into mastered material.
**Blast radius:** 193/444 P3-neutral items (43%) are `choice`, all 7 domains; app-wide
(diagnostic AND practice). Data is CORRECT (choice items carry `choices[]` + `answer.value`
+ `misconceptionMap`; the diagnostic even ships the full ProblemTemplate, so `choices` is
already client-side).
**SECONDARY DATA:** 6 items `ALG-E14-p3-neutral-01…06` are `kind:"choice"` with a valid
`answer.value` ("one solution"/"no solution"/"infinitely many solutions") but **no
`choices[]` array**. (Possibly more across p1/p2 — the new validator rule will enumerate.)
**VALIDATOR GAP:** `scripts/validate-graph.ts` has no `choice ⇒ choices[]` rule and can't
see render mismatches.

Answer kinds in graph: numeric 2002, choice 1956, expression 142, inequality 138,
numeric-set 47, coordinate 303. Only `choice` is mis-rendered; the rest are typeable and
already score correctly (numeric/expression/inequality/numeric-set/coordinate all answer via
the text Input + keypad — confirmed live, e.g. coordinate "(3, 7)" scored correct).

---

## Fix A — RENDER (mr-gates + pee-wee)
A1. New shared component **`components/learning/ChoiceInput.tsx`** — renders `choices[]` as
    selectable options (one selected → its exact string becomes the response). Calm/premium
    (Card/InsetPanel/Button token vocabulary), keyboard-accessible (arrow/Tab + Enter/Space,
    visible focus ring), `prefers-reduced-motion` respected, no shuffle on re-render
    (stable order). pee-wee directs the exact treatment (radio-list vs option cards).
A2. **Widget selection** in DiagnosticFlow + PracticeFlow: branch on `answer.kind` —
    `"choice"` → `ChoiceInput` (no keypad, no MathText-as-input); everything else
    (numeric/expression/inequality/numeric-set/coordinate) → the EXISTING text `<Input>` +
    `inputNotation` keypad, unchanged. Submit stays disabled until a selection/entry exists.
    The selected choice string flows through the SAME submission path as today (response =
    the chosen string); `checkAnswer` is UNCHANGED (exact match on the chosen string; the
    `misconceptionMap` already maps wrong choices → tags). NO engine/checkAnswer change.
A3. **Practice served DTO**: the practice server→client item is narrow and does NOT carry
    `choices`. Add `choices?: string[]` to the served item DTO + thread it from the problem
    in the practice page assembly (and the retention-probe item) so PracticeFlow can render
    options. (Diagnostic already ships the full ProblemTemplate → no DTO change there.)
    mr-gates gates the cross-module DTO change.

## Fix B — DATA (mr-kahn)
B1. Populate `choices[]` on every `kind:"choice"` item missing it (the validator rule in
    Fix C enumerates the full set; known: the 6 `ALG-E14-p3-neutral-*`). For E14 the option
    set is the standard solution-count trio — exact strings + ordering + `answer.value ∈
    choices` are mr-kahn's call. Content change → mr-kahn APPROVE; keep validator green +
    tests green; re-run `npm run validate:graph`.

## Fix C — VALIDATOR (mr-kahn semantics + mr-gates structure)
C1. Add a `scripts/validate-graph.ts` rule, errors (not warnings):
    - every problem with `answer.kind === "choice"` MUST have `choices` as a string[] of
      length ≥ 2, AND `answer.value` MUST be an element of `choices`.
    - every `answer.kind` MUST be in the known renderable set
      (numeric|expression|choice|coordinate|inequality|numeric-set) — codifies the
      kind↔widget contract so a future unknown kind fails loudly.
C2. This catches the E14 defect and prevents recurrence of the whole class.

## Tests (mr-gates + mr-kahn)
T1. Component widget-mapping test: for each `answer.kind`, the diagnostic/practice item
    renders the correct widget — `choice` → ChoiceInput (options present, selectable);
    every other kind → text Input. Asserts the contract so a regression can't silently
    revert to text-for-choice.
T2. Validator rule tests: a `kind:"choice"` item with no/short `choices[]` FAILS; an item
    whose `answer.value ∉ choices` FAILS; an unknown `answer.kind` FAILS.
T3. Live regression (post-merge, via the running app): re-run the diagnostic, SELECT the
    correct option on a choice item (e.g. ALG-P09), confirm it scores correct and the
    placement no longer under-credits those domains.

## Invariants
- `checkAnswer`, the mastery engine, adaptive router, and diagnostic-engine credit logic
  are UNCHANGED — this is render + data + validator only. The selected choice string is the
  same `response` the checker already expects.
- All existing tests stay green; `npm run validate:graph` stays VALID after B1.

## Gates
- **pee-wee**: ChoiceInput visual/interaction (calm, premium, keyboard, reduced-motion) +
  its integration into the diagnostic and practice surfaces; confirm choice items now read
  as honest multiple-choice, not a quiz gimmick.
- **mr-gates**: widget-selection branching, the practice DTO `choices` addition
  (cross-module), validator rule structure, the no-engine-change invariant, tests.
- **mr-kahn**: the E14 (+ any other) `choices[]` content, the validator SEMANTICS
  (choice⇒choices, value∈choices, kind set), and that rendering choices preserves diagnostic
  measurement integrity (choice items become genuinely measurable; scoring semantics
  unchanged).

Verdict: APPROVE | APPROVE WITH CHANGES | REJECT.

---

## GATE RESOLUTIONS — BINDING (supersedes conflicting text above)
pee-wee APPROVE WITH NOTES (11) · mr-gates APPROVE WITH CHANGES (2 blocker + 2 nit) ·
mr-kahn APPROVE WITH CHANGES (3, incl. a scope correction). No rejections. Implement on
Opus to this section. checkAnswer/engine/router/diagnostic-credit stay byte-unchanged.

### ChoiceInput component (pee-wee) — `components/ui/ChoiceInput.tsx` (it's a primitive)
W1. Vertical stack of full-width selectable **option rows** (NOT native radio dots, NOT
    free cards). Per row: rounded-[10px], border, bg-surface, px-4 py-[13px], gap-2.5; an
    18px leading selection indicator (border-[1.5px] border-border-strong, mr-3); option
    text via `<MathText>` from **`./MathText`** (it's components/ui/MathText, sans host,
    text-[15px] text-ink, left-aligned, wraps at leading-[1.5]) — NOT fieldMode math/mono.
W2. States (reuse tokens): default border-border-strong/bg-surface; hover bg-hover
    (pointer only, transition-colors duration-150 ease-[cubic-bezier(.2,.7,.2,1)]); selected
    border-accent bg-accent-tint + indicator fills (border-accent + ~9px bg-accent dot);
    focus the standard focus-visible:outline-2 outline-offset-2 outline-accent. Colorblind-
    safe (filled dot + border, not color alone). No scale/bounce.
W3. Real **radiogroup**: container role="radiogroup" + a "Choose one" micro-label
    (text-[13px] font-medium text-ink-700); rows role="radio" + aria-checked; **roving
    tabindex** (one tab stop); Arrow Up/Down/Left/Right move selection+focus; Space/Enter
    selects. NO auto-advance/auto-submit. Avoid the Enter double-fire (select-then-submit
    must be two deliberate presses; acceptable fallback: arrow/Space selects, Enter submits).
W4. **Stable order** — render choices[] in array order every render, key by string/index,
    never shuffle (incl. on hint reveal). reduced-motion: only the 150ms color transition +
    inherited fade; no per-row entrance animation.
W5. **value-as-string contract (mr-gates nit + pee-wee)**: ChoiceInput sets the parent's
    `value` to the selected choice's exact string — the SAME single response state as Input.
    NO parallel selection state. Existing `disabled={!value.trim()}` / `if (!response)`
    guards then work unchanged.

### Render integration (mr-gates A2 + pee-wee 5/6/7)
R1. DiagnosticFlow.tsx (~line 262) + PracticeFlow.tsx (~line 279): branch on
    `answer.kind === "choice"` → render ChoiceInput; SUPPRESS the keypad + format hint +
    live echo for choice. All other kinds → existing Input+keypad UNCHANGED. autoFocus →
    move initial focus to the radiogroup for choice.
R2. Practice feedback moment (pee-wee 7): once feedback exists, LOCK the group
    (aria-disabled, no hover). Mark ONLY two rows: the student's chosen row (correct →
    mastered-dot + success border; wrong → error-bg-soft + hollow/dashed indicator +
    "you" caption, the MarkedUpVisual vocabulary) and, if the student missed, the CORRECT
    row (mastered-dot + "correct" caption — showing it is informative, not a leak, since
    options are already on screen). NO gotcha styling on the other distractors (stay
    neutral). `Try again` clears marks + re-enables.

### Practice DTO (mr-gates A3) — exact
D1. Add `choices?: string[]` to `ServedItem` (PracticeFlow.tsx ~line 52). Thread it in
    `toItem` (app/student/(shell)/practice/[skillId]/page.tsx ~lines 111-130) with the
    existing conditional-spread style (`...(s.problem.choices ? { choices: s.problem.choices }
    : {})`). `toItem` covers BOTH normal items AND the retention probe (page.tsx ~line 142)
    → one edit. NEVER serialize answer.value. Diagnostic needs no DTO change (ships the full
    ProblemTemplate). Render must read choices from the parsed object (key position is
    irrelevant — no positional logic).

### DATA (mr-kahn 1/2) — SCOPE: 51 items, validator-enumerated
B1. It is **51** choice items missing `choices[]` (1956 choice vs 1905 arrays), NOT 6 —
    E14 is broken across p1/p2/p3. Fix EVERY item the new validator rule flags; do NOT
    hand-list (key ordering is inconsistent). For E14 items the option set is the canonical
    trio in the healthy E14 p2 ordering: `["one solution","no solution","infinitely many
    solutions"]`; answer.value already ∈ that trio (no value edits); their misconceptionMaps
    already exist + are correct (keep as-is). For any flagged NON-E14 item, author its
    distractors (mr-kahn content gate) — surface them if found. Land B WITH C so the build
    is never red (mr-gates blocker 2). `npm run validate:graph` must return VALID after.

### VALIDATOR (mr-gates blocker 1 + mr-kahn 3) — in lib/validation/index.ts
V1. Add the rule in `validateGraph()`'s per-problem loop (lib/validation/index.ts ~lines
    345-394), NOT scripts/validate-graph.ts (that's a thin runner). Emit ERRORS under the
    existing `PROBLEM_MISMATCH` code (no /types change; only add a `CHOICE_INTEGRITY` code
    to types/validation.ts if a distinct filter is wanted — default: reuse PROBLEM_MISMATCH).
    Rules (all errors), for `answer.kind === "choice"`:
    - `choices` is string[] with length ≥ 2 AND `answer.value ∈ choices`.
    - **3a** no duplicate choices AND at least one choice ≠ answer.value (not all-correct).
    - **3b** every misconceptionMap key ∈ choices AND ≠ answer.value.
    - **3c** every misconceptionMap key's tag ∈ the node's misconceptionTags.
    Plus, for ALL problems: `answer.kind ∈` the known set
    (numeric|expression|choice|coordinate|inequality|numeric-set) — unknown kind fails.

### Tests (mr-gates 5)
T1. Widget-mapping component test: `choice` → ChoiceInput (options present/selectable);
    every other kind → text Input. Locks the contract.
T2. Validator tests in lib/validation/__tests__/validate-graph.test.ts (extend the
    `makeProblem` factory): choice with no choices / len<2 / value∉choices / duplicate /
    misconceptionMap-key∉choices / unknown-kind each FAIL with PROBLEM_MISMATCH. The
    existing real-graph `validateGraph(realGraph)` assertion auto-covers B (stays VALID).
T3. Live regression (post-merge, running app): re-run diagnostic, SELECT the correct option
    on a choice item → scores correct; placement no longer under-credits.

### Invariants
checkAnswer (choice path lib/problem-engine ~line 300-301), mastery engine, adaptive
router, diagnostic-credit UNCHANGED. The chosen string is the same `response` the checker
expects. All existing tests green; validate:graph VALID.
