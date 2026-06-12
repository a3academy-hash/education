# PHASE 8 — Experiential Quality Pass (paste into Claude Code)

Read CLAUDE.md. A human walked the prototype as a student and found that the
framework is solid but the experience feels like a shell — structurally valid,
experientially thin. Structural validation never checked for semantic
repetition or interaction depth, so these passed. This phase closes that gap.
None of this touches the engine, routing, mastery math, or the evidence trail.

## MODEL PLAN (switch inline — run the /model command shown at each step)
The cheapest model that can do each job is named at the start of every step
below. Run the `/model` shown, do the step, switch again when the next step
says so. Default OPUS; spend FABLE only where judgment density is high
(semantic auditing, engine-adjacent logic). Summary:
- A1 feedback bug:    FABLE to locate + design the fix, OPUS to implement.
- A2 dedup audit:     FABLE (must read meaning across thousands of items).
- A2 re-authoring:    OPUS (mechanical, once the defect list is approved).
- B primitives:       OPUS throughout.
- C notation + input: OPUS throughout.
Order: A1 first (global bug). B and C are independent, can interleave. A2 is
the largest. One-window run: start FABLE for A1 + A2-audit, then `/model opus`
and stay there for A2-reauthor, B, and C.

---

## A. Content de-duplication + dynamic feedback (the "everything is 5³" problem)

The reported symptoms, verbatim from the student walkthrough:
- Exponents intro: the first worked example was 5³, and the SECOND worked
  example on the same lesson was ALSO 5³ — same numbers, same explanation.
- Practice reinforcement: after answering 2⁶ correctly, the congratulatory
  feedback referenced 5³. The NEXT problem's feedback ALSO referenced 5³.
  The positive-reinforcement message appears to be a fixed per-node string,
  not built from the student's actual problem.

Two distinct defects:

1. FEEDBACK IS NOT DYNAMIC (bug, fix first — it's global, not per-node).
   `/model fable` — locate where feedback is assembled and design the fix.
   Find where practice feedback (both correct-reinforcement and incorrect-
   remediation) is assembled. If the "why" or the praise pulls a static
   example from the node instead of echoing the STUDENT'S CURRENT PROBLEM
   and their actual answer, that is the bug. Feedback must reference the
   item the student just answered — its numbers, their response — every time.
   mr-kahn defines the faithful templating rule (echo the real values, never
   a canned example); mr-gates confirms it reads from attempt context, not
   node-static copy. This likely fixes the "felt cheap" problem across the
   ENTIRE course in one change. `/model opus` to implement once the fix is
   designed and gated. Verify live on 3 different nodes.

2. SEMANTIC REPETITION IN AUTHORED CONTENT (audit + re-author).
   `/model fable` for the audit — it must judge meaning, not structure.
   Add validator rules (mr-gates) that structural validation lacked:
   - No two worked examples within a node may share the same operands/answer.
   - Within a node's problem bank, flag near-duplicate prompts (same numbers,
     same structure) across phases and sports.
   - Flag explanation/hint text reused verbatim across different problems.
   Run the new rules graph-wide → produces a defect list per node. mr-kahn
   reviews and prioritizes (the intro nodes a new student hits first matter
   most — Foundations + the first node of each domain). Then `/model opus` and
   re-author only the flagged items, varying operands and contexts,
   re-validated by the new rules. Same batch process, now with a semantic gate.

CHECKPOINT after the feedback fix + the graph-wide defect list, BEFORE
re-authoring: show Matt the defect count per node and the fix order.

---

## B. Interactive primitives — make the visuals real (the "graph is for show" problem)

`/model opus` for all of Workstream B.

Reported, verbatim: the diagnostic slope graph always showed the same two
points in the same zoomed-in upper-right quadrant; clicking added stray points
with no clear button; the graph had no relation to the actual problem and
couldn't pan or zoom. pee-wee directs; mr-gates reviews.

CoordinatePlane — bring to "finished," not "functional":
1. It MUST render the actual points/line from the current problem's data
   (the problem's `pts`/visual spec), not a hardcoded default. If a slope
   item is about (2,3) and (6,11), those are the points shown.
2. Auto-frame the viewport to the problem's points with sensible padding;
   support negative quadrants when the data needs them (the always-upper-
   right complaint).
3. If the plane is interactive for an item, give it real affordances: a
   visible Clear button, point labels, snap-to-grid, and a live readout that
   relates to the question. If an item only needs a STATIC illustration,
   render it read-only (no stray-click points) — decide per item via the
   visual spec, and make "display vs interactive" explicit in the data.
4. Every other primitive gets the same "is it actually wired to the problem,
   or is it decoration?" audit: NumberLine, BalanceScale, DataTable.

pee-wee's bar from Phase 2 was "every lesson screen has something touchable
that changes the math." Enforce that it changes THIS problem's math.

CHECKPOINT: render the diagnostic slope items + 3 lesson visuals live, show
they reflect the real problem data and pan/clear correctly.

---

## C. Math notation + input (the "4^2 doesn't look like an exponent" problem)

`/model opus` for all of Workstream C.

Reported: exponents render as `4^2` (caret), not a real raised superscript;
no way shown to the student to type proper notation; no on-screen input aid.
pee-wee + mr-gates.

1. RENDERING: exponents, fractions, radicals, and subscripts must render as
   real math — superscript exponents, stacked or properly-typeset fractions,
   √ with a vinculum where feasible. Use a lightweight, license-clean
   approach (KaTeX is MIT-licensed and the standard choice; confirm it fits
   the artifact/Next constraints — this is a NEW DEPENDENCY, so it is a Matt
   checkpoint before install). Apply graph-wide to prompts, worked examples,
   and feedback.
2. INPUT: students need a way to enter answers without guessing at `^`.
   Provide a minimal on-screen math input — at least a superscript toggle and
   the common symbols (exponent, fraction bar, √, ±, π, negative sign) — as a
   small keypad on items that need them, with the keyboard still working for
   fast typers. Show, near the input, the accepted format with one example.
3. Keep the existing answer-equivalence checker authoritative — the keypad is
   an input convenience, it must normalize to the same accepted forms the
   engine already grades. mr-gates confirms no new grading path is created.

CHECKPOINT: show a rendered exponent lesson + the input keypad on a real item,
confirm a student can enter 4², it grades correctly, and the keyboard path
still works.

---

## Definition of done
A new student walking the same path (diagnostic → exponents intro → practice)
sees: distinct worked examples, feedback that names their actual problem,
a slope graph that shows the real points and can be cleared, and exponents
that look like exponents with a way to type them. No engine/evidence changes.
The new semantic validator rules are committed so this can't regress.
