// Problem authoring contract — FROZEN in Phase 0; banks are authored later
// per prompts/03-curriculum-graph-builder.md.

import type { Phase, Sport, VisualKind } from "./core";
import type { VisualSpec } from "./visual-spec";

// Re-export the visual-spec surface so consumers can import everything
// problem-related from "./problem" (and transitively from "@/types").
export type {
  VisualMode,
  PlaneAffordance,
  SpecPoint,
  SpecLine,
  Frame,
  CoordinateSpec,
  NumberLineSpec,
  TableSpec,
  VisualSpec,
  RenderableVisualKind,
} from "./visual-spec";
export { RENDERABLE_VISUAL_KINDS } from "./visual-spec";

/**
 * Discriminated union over answer kinds. All values are strings to keep
 * authoring uniform; the problem engine (Phase 1) interprets them.
 */
export type AnswerSpec =
  | { kind: "numeric"; value: string; tolerance?: number }
  | { kind: "expression"; value: string; acceptEquivalent?: boolean }
  | { kind: "choice"; value: string }
  | { kind: "coordinate"; value: string; tolerance?: number }
  /** e.g. "x > 5", "-3 < x <= 4" */
  | { kind: "inequality"; value: string; acceptEquivalent?: boolean }
  /** Multi-root solution sets; [] convention reserved for no-solution alongside choice items. */
  | { kind: "numeric-set"; values: string[] };

export interface ProblemTemplate {
  id: string;
  /** Immutable evidence-trail versioning: edits bump version, never rewrite history. */
  version: number;
  skillId: string;
  phase: Phase;
  sport: Sport;
  prompt: string;
  visual: VisualKind | null;
  /**
   * Optional per-problem geometry. DEGRADE-SAFE: when absent (or when its
   * kind is not renderable), the item renders no visual surface. Independent
   * of `visual` — decoration never reappears by omission. Authored in B2.
   */
  visualSpec?: VisualSpec;
  choices?: string[];
  answer: AnswerSpec;
  /** Wrong-answer pattern → misconception tag (must exist in the owning node's misconceptionTags). */
  misconceptionMap?: Record<string, string>;
  hints: string[];
  difficulty: 1 | 2 | 3;
  /**
   * Structural family signature (overhaul Phase 2; CLAUDE §9.5). Groups
   * re-skinned/number-swapped variants of the same structure so a cross-context
   * score delta is interpretable as transfer, not difficulty drift. STRUCTURAL,
   * not yet calibrated — pilot data refines it. Derived by item-certification.
   */
  equivalenceClass?: string;
  /**
   * Calculator policy (overhaul Phase 2; DIAGNOSTIC §10). numeric computation =
   * no_calculator; reasoning/structured items kept arithmetic-light =
   * calc_neutral_arithmetic_light; calculator_allowed reserved for authored
   * modeling items. Derived by item-certification.
   */
  calculatorFlag?: "no_calculator" | "calculator_allowed" | "calc_neutral_arithmetic_light";
}
