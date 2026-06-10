// Problem authoring contract — FROZEN in Phase 0; banks are authored later
// per prompts/03-curriculum-graph-builder.md.

import type { Phase, Sport, VisualKind } from "./core";

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
  choices?: string[];
  answer: AnswerSpec;
  /** Wrong-answer pattern → misconception tag (must exist in the owning node's misconceptionTags). */
  misconceptionMap?: Record<string, string>;
  hints: string[];
  difficulty: 1 | 2 | 3;
}
