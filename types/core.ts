// Core scalar unions shared across the platform.

export type Sport =
  | "baseball"
  | "softball"
  | "basketball"
  | "soccer"
  | "football"
  | "volleyball"
  | "neutral";

/** Context progression: P1 sport context → P2 blended → P3 neutral academic. */
export type Phase = 1 | 2 | 3;

export type MasteryStatus =
  | "unknown"
  | "introduced"
  | "developing"
  | "near_mastery"
  | "mastered"
  | "needs_review"
  | "prerequisite_gap";

export type VisualKind = "numberline" | "coordinate" | "balance" | "table" | "area-model";
