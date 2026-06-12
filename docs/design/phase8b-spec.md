# Phase 8 / B Spec — Wire Visuals to Real Problem Data (binding) — 2026-06-11

Folds pee-wee (interaction direction), mr-gates (types/data-flow, 6 changes), mr-kahn
(content scope). NO engine/mastery/router/grading/evidence change. KaTeX is workstream C
(separate). Scope: /types + components/learning + the 3 screens (one shared mapper) +
validator rules + a SCOPED content pass. Don't touch .authoring-tmp/scripts.

## ROOT CAUSE
DiagnosticFlow ItemVisual (lines ~263-290) + PracticeFlow + LearnClient render a HARDCODED
scratch CoordinatePlane (points [{2,3},{6,7}]) / NumberLine (marker 0) for every item.
ProblemTemplate carries `visual: VisualKind|null` (kind) but NO geometry. Every plane is
decoration today. Fix: geometry lives in an optional per-problem visualSpec; primitives
render from it + auto-frame; decoration is REMOVED where the visual isn't the pedagogy.

## A. /types — visualSpec (mr-gates; additive, optional, NO any). types/visual-spec.ts (re-export from problem.ts):
```ts
export type VisualMode = "display" | "interactive";
export type PlaneAffordance = "place" | "drag" | "clear" | "snap" | "labels" | "readout";
export interface SpecPoint { x: number; y: number; label?: string }
export interface SpecLine { through?: [SpecPoint, SpecPoint]; slope?: number; intercept?: number; style?: "solid"|"dashed" }
export interface Frame { xMin: number; xMax: number; yMin: number; yMax: number }
export interface CoordinateSpec { kind: "coordinate"; mode: VisualMode; points?: SpecPoint[]; lines?: SpecLine[]; segments?: [SpecPoint,SpecPoint][]; xLabel?: string; yLabel?: string; frame?: Frame; snap?: 1|0.5; affordances?: PlaneAffordance[] }
export interface NumberLineSpec { kind: "numberline"; mode: VisualMode; range: { min: number; max: number }; markers?: { value: number; label?: string }[]; operationDelta?: number; affordances?: ("drag"|"clear"|"labels")[] }
export interface TableSpec { kind: "table"; mode: VisualMode; headers: string[]; rows: string[][] }  // display rows only; fillable cells stay on the existing DataCellSpec path
export type VisualSpec = CoordinateSpec | NumberLineSpec | TableSpec;  // renderable kinds ONLY — exclude balance/area-model/graph/boxplot/histogram/scatter
```
ProblemTemplate gains `visualSpec?: VisualSpec`. DEGRADE-SAFE contract: visualSpec absent OR problem.visual not a renderable kind → render NO visual surface (clean prompt + input). visualSpec independent of `visual` (an item may have visual:"coordinate" + no spec → renders nothing).

## B. The 4-mode model (pee-wee) → maps onto VisualMode + affordances:
- display: read-only illustration (geometry shown, student reads + types into the math Input). NO Clear, NO add-on-click, NO drag. labels+line+readout ON. (VisualMode "display", no onChange.)
- interactive/plot: student places/drags ONE point (or a line via 2) and that placement IS graded. Affordances place/drag/snap/labels/clear/readout. Background click MOVES the single answer point (never appends/strays). Cap point count to answer arity. (VisualMode "interactive".)
- interactive/explore (LEARN only): drag changes THIS lesson's math live, seeded from the node's worked example; Reset returns to the seeded example (not empty). (VisualMode "interactive" on Learn.)
- none: no visual.
Default when mode absent on a coordinate/line problem = "display", NEVER explore (decoration must not reappear by omission).

## C. CoordinatePlane FINISHED spec (components/learning):
- Auto-frame in the PURE math sibling: `frameFor(points, lines): Frame` in coordinate-plane-math.ts (+ vitest). Algorithm: collect all geometry x/y PLUS 0 on each axis; min=floor(min)−pad, max=ceil(max)+pad, pad = max(1, ceil(10% span)); enforce min span 4; SQUARE the frame (larger span → both axes, center the smaller); integer ticks (tick every 2 if span>16, label-thin not gridline-remove). Screen passes `spec.frame ?? frameFor(geometry)`.
- AXES AT ZERO: draw axes at data-0 when 0 ∈ frame (current code draws at range.min — move to 0 so the four quadrants read). Negative quadrants render whenever min<0.
- mode-gated interactivity: REPLACE the "onChange presence = interactive" signal (the stray-point bug at ~line 143). display → no onChange (read-only); interactive/plot → repositions the single answer point on background click (no append); explore (Learn) → append up to concept cap.
- Reset button (secondary sm, right-aligned below plane) in interactive modes only; label "Reset" (returns plot→empty, explore→seeded). Keyboard reachable, focus returns to handle.
- Live readout per mode: display slope → m = .. · y = ..x + .. (existing equationReadout); plot → the placed coord (x, y) only (don't hand them a derived equation); explore → full live equation. Fixed-height strip.
- Empty/invalid: render the framed plane (origin-centered −5..5 default), suppress bad point, console.warn dev — NEVER blank.

## D. Shared mapper (mr-gates #6): collapse the 3 duplicated ItemVisual/scratch impls into ONE component components/learning/ProblemVisual.tsx (or visualSpecToProps) — single source of truth mapping problem.visualSpec → primitive props, with the degrade-safe branch. DiagnosticFlow ItemVisual (~263-290), PracticeFlow, LearnClient all use it. DELETE the hardcoded [{2,3},{6,7}] / marker 0 / value=2,delta=3 seeds. Learn passes the node's worked-example seed for explore. NumberLine/BalanceScale/DataTable get NO new features — callers just stop rendering them as decoration.

## E. Per-primitive disposition (pee-wee + mr-kahn):
- CoordinatePlane: WIRED (display/interactive) on the Wave-1 nodes; explore on Learn coordinate nodes.
- NumberLine: mostly REMOVED (decoration on typed-answer items → none); display marker on F01/F02/F09 (mark start/given value only, never the result); Learn explore seeded from lesson.
- BalanceScale: Diagnostic absent (keep), Practice absent (keep), Learn-only explore seeded from the node's real equation.
- DataTable: Diagnostic null (keep), Practice null unless genuine fill-task, Learn explore only on tabular nodes with authored cells; display tables on L02/L04/L07/D03.

## F. Data flow + answer-leak (mr-gates #3,4; mr-kahn #2):
- visualSpec rides the SAME DTO channel as `visual`. Practice ServedItem (PracticeFlow ~line 41) adds ONLY `visualSpec?: VisualSpec`; keep stripping answer/misconceptionMap. Diagnostic already ships full ProblemTemplate in DiagnosticItem.problem (existing posture; engine re-checks server-side).
- ANSWER-LEAK: interactive coordinate spec (answer.kind "coordinate", ~219 items) carries ONLY given context, NEVER the target point. Server grades the placed point against the withheld answer (same equivalence class as typed "(x, y)"). L01 QUADRANT items: axes-only display, do NOT plot the prompt's point (plotting (−3,5) gives away "top-left"). F01 numberlines: mark the START value, never the landing point. Read-off items (S01 intersection) are display-by-design (the answer is geometrically present = the extraction skill, not a leak). L09 may show a prior point only when the prompt text states it.
- EVIDENCE: a plot item moving from typed "(4,2)" to click-to-place must keep the IDENTICAL accepted equivalence class and the StudentAttempt must still log the response (the placed coordinate as the response string) — NO second grading path, server checkAnswer stays authoritative. (mr-gates verify.)

## G. Validator rules (extend lib/validation/semantic.ts or index.ts; fold into the committed validator — regression guard like A2):
1. visualSpec.kind (when present) MUST equal problem.visual.
2. `visual` must be in the supported set (coordinate|numberline|table|balance|area-model) ∪ null — FLAG the drift values (graph/boxplot/histogram/scatter) as invalid (they're being nulled in this pass).
3. ANSWER-LEAK: mode "interactive" + answer.kind "coordinate" ⇒ spec.points must NOT contain the answer coordinate.
4. DECORATION (optional, warning): a `coordinate`/`numberline`/`table` visual with NO visualSpec and a choice/numeric/expression/inequality answer = leftover decoration → flag (so the strip is complete + non-regressable).

## H. CONTENT PASS (mr-kahn-scoped; edits data/algebra1-graph.json; mr-kahn reviews after):
WAVE-1 AUTHOR visualSpec (geometry from the prompt's own data; P3 specs use NEUTRAL axis labels — no sport):
- Interactive coordinate (plot): ALG-L01 (plot-the-point items), ALG-L09 (plot intercept/rise-run), ALG-L10 (coordinate-answer items only — strip its numeric/choice), ALG-L07 (plot-a-row items).
- Display coordinate: ALG-L05 / ALG-L06 (slope — render the item's REAL two points/table; THE diagnostic-slope fix), ALG-S01 (render both real lines, read the intersection), ALG-L02 (vertical-line-test point sets; mapping tables), ALG-L16 (real scatter point clouds — CoordinatePlane draws points, no new primitive).
- Display table: ALG-L04 (Domain & Range), ALG-D03 (Two-Way Tables — render the actual 2×2 cells), ALG-L07 tables.
- Display numberline: ALG-F01/ALG-F02 (mark the start value only), ALG-F09 (read-a-numberline canonical node).
STRIP (null the `visual` field, no spec) everything else: E07 tables, E09–E12 numberlines (shading IS the answer — drawing it leaks), L08/L11/L12/L13/L14/L15/S02/S04/S06/Q06 coordinate (compute-from-given-equation), E01–E04/E14 balance, F08/P07–P09 area-model, stray F03/F04 tables, and the DRIFT values graph/boxplot/histogram/scatter (P04/Q06/D04 graph, D02 boxplot/histogram, D04 scatter) → null now (all answerable as shipped; no primitive built in B).
L16 TEXT: once real point clouds render, REMOVE giveaway sentences ("the dots slope upward") from L16 prompts — that's a content edit, mr-kahn reviews.
STRIPPING changes zero math/answers/phase tags.

LOG FOR LATER PHASE (not fixed in B): D02/D04 assess display-reading standards (6.SP/8.SP/S-ID) without displays — needs boxplot/histogram/scatter primitives + item re-authoring (real curriculum gap, log in PLATFORM build-next). Later-phase primitive wishlist: boxplot/histogram → parabola curve (Q06/Q12) → region shading (L15/S06) → balance worked-examples.

## I. Tests + CHECKPOINT render items (pee-wee D):
- frameFor unit tests (negative quadrants, square frame, min span, padding); validator rule tests (kind===visual, answer-leak, drift-flag).
- CHECKPOINT (render live, prove real geometry + frame + clear): (1) ALG-L01 quadrant item "(−3,5)" → display, all four quadrants, origin centered, point in QII labeled; (2) ALG-L01 plot item "Plot (5,−6)" → interactive, one draggable snap point, Reset clears, readout shows placed coord, negative-y quadrant framed; (3) a slope-from-graph item (L05/L06) → display + line + rise/run, the REAL two points, m in readout (not hardcoded (2,3),(6,7)); (4-6) three Learn lesson visuals: a coordinate node (explore seeded from worked example, drag changes m/b, Reset to seed), a numberline node (explore seeded value+operationDelta, arc follows), an equation node (BalanceScale seeded from the node's real equation). Each: reflects real data, auto-frame incl. negatives, Reset works, keyboard parity, reduced-motion, NO stray clicks in display/plot.

## SCOPE GUARD: no new deps (KaTeX = C). No engine/mastery/router/grading/evidence change. Pure presentational components + screen mapping + additive types + scoped content + validator rules.
