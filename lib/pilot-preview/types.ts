// lib/pilot-preview/types.ts — types for the DEV-ONLY /preview/pilot route.
// Pure data shapes: the content adapter (load.ts) produces PreviewNode records
// from local files (docs/gold-node/* and .authoring-tmp/*) and the client
// renders them. Nothing here touches React, IO, or the live engine.

// ---------------------------------------------------------------------------
// Enriched-item schema (gold-node-items.json / future .authoring-tmp regen)
// ---------------------------------------------------------------------------

export type Archetype =
  | "scaffolded-multistep"
  | "error-analysis"
  | "predict-reveal"
  | "interactive"
  | "discrimination";

export const ARCHETYPES: readonly Archetype[] = [
  "scaffolded-multistep",
  "error-analysis",
  "predict-reveal",
  "interactive",
  "discrimination",
];

export interface MisconceptionMapEntry {
  /** Trap value; scaffolded item-level entries are part-prefixed ("c:20"). */
  trigger: string;
  tag: string;
  signature: string;
}

export interface ItemChoice {
  id: string;
  text: string;
}

export type PartAnswerType = "numeric" | "choice";

export interface ItemPart {
  partId: string;
  prompt: string;
  answerType: PartAnswerType;
  correctAnswer: string;
  acceptedEquivalents?: string[];
  choices?: ItemChoice[];
  misconceptionMap?: MisconceptionMapEntry[];
}

export interface ItemQuestion {
  questionId: string;
  prompt: string;
  answerType: "choice";
  choices: ItemChoice[];
  correctAnswer: string;
}

export interface ItemInteraction {
  tool: string;
  manipulates: string;
  submittedState: unknown;
  scoring: { type: string; correctWhen: string; note?: string };
}

export interface ItemVisual {
  id: string;
  type: string;
  purpose: string;
  data: Record<string, unknown>;
  annotations?: string[];
  reveal_beats?: string[];
}

export interface EnrichedItem {
  id: string;
  archetype: Archetype;
  phase: "P1" | "P2" | "P3";
  sport: string;
  difficulty: number;
  standard: string;
  skillId: string;
  prompt?: string;
  // scaffolded-multistep
  parts?: ItemPart[];
  // error-analysis
  errorAnalysisOf?: string;
  shownWork?: string[];
  questions?: ItemQuestion[];
  // predict-reveal
  predictPrompt?: string;
  commitRequired?: boolean;
  predictionLogged?: boolean;
  predictAnswerType?: string;
  predictChoices?: ItemChoice[];
  reveal?: { visualRef: string; shows: string };
  resolvePrompt?: string;
  resolveAnswerType?: string;
  resolveCorrectAnswer?: string;
  resolveAcceptedEquivalents?: string[];
  // interactive
  interaction?: ItemInteraction;
  // discrimination
  answerType?: PartAnswerType;
  correctAnswer?: string;
  choices?: ItemChoice[];
  // shared
  misconceptionMap: MisconceptionMapEntry[];
  visual: ItemVisual;
  hintLadderRef: { generic: string; perTag: Record<string, string> };
  authoringNote?: string;
}

// ---------------------------------------------------------------------------
// Parsed lesson (GOLD_NODE_LESSON.md)
// ---------------------------------------------------------------------------

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

export interface EmbeddedCheckTrap {
  option: string;
  tag: string;
  note: string;
}

export interface EmbeddedCheck {
  /** "EC1" … "EC4" */
  id: string;
  /** Full heading text, e.g. "EC1 — Concrete stage (after 3.1)". */
  title: string;
  /** Question paragraphs (student text before the option markers). */
  question: InlineSpan[][];
  options: ItemChoice[];
  /** Keyed answer (option id). Present ONLY when the block parsed cleanly. */
  correct: string;
  /** Student-visible feedback from the "Correct:" line. */
  correctFeedback: string;
  traps: EmbeddedCheckTrap[];
}

export type LessonBlock =
  | { kind: "paragraph"; spans: InlineSpan[] }
  | { kind: "subheading"; text: string }
  | { kind: "blockquote"; paragraphs: InlineSpan[][] }
  | { kind: "table"; lines: string[] }
  | { kind: "list"; items: InlineSpan[][] }
  | { kind: "visual"; raw: string; visualId: string | null; visualType: string | null }
  | { kind: "authoring-aside"; lines: string[] }
  | { kind: "embedded-check"; check: EmbeddedCheck };

export interface LessonSection {
  id: string;
  /** Section number from "## N. TITLE"; null for preamble/appendix. */
  number: number | null;
  title: string;
  /** Front matter and the appendix are authoring metadata, not student text. */
  authoringOnly: boolean;
  blocks: LessonBlock[];
}

// ---------------------------------------------------------------------------
// Parsed hint ladders (GOLD_NODE_HINTS.md)
// ---------------------------------------------------------------------------

export interface HintLadder {
  /** Ladder id, e.g. "HL-forgot-denominator". */
  id: string;
  /** Misconception tag, or null for the generic ladder. */
  tag: string | null;
  /** Exactly three rungs, revealed one at a time. */
  rungs: [string, string, string];
  neverSay: string;
}

// ---------------------------------------------------------------------------
// PreviewNode — what the route serves per node
// ---------------------------------------------------------------------------

export type PreviewSource = "gold" | "machine" | "stub";

export interface PreviewItem {
  source: Exclude<PreviewSource, "stub">;
  archetype: Archetype;
  difficulty: number;
  phase: string;
  sport: string;
  item: EnrichedItem;
}

export interface PreviewNode {
  nodeId: string;
  title: string;
  source: PreviewSource;
  lesson: LessonSection[] | null;
  items: PreviewItem[];
  ladders: Record<string, HintLadder>;
  /** Honest stub copy (source "stub" only). */
  stubNotice?: string;
  /** Whether .authoring-tmp/taxonomies/<id>/taxonomy.md exists (pilots). */
  taxonomyPresent?: boolean;
  /** File/parse failure — the UI renders this as an error card, never a crash. */
  error?: string;
}
