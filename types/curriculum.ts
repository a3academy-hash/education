// Canonical curriculum graph types. Source of truth: data/algebra1-graph.json
// (validated on import by lib/validation).

import type { MasteryStatus, Sport, VisualKind } from "./core";
import type { ProblemTemplate } from "./problem";
import type { VideoAsset } from "./video";

export interface Domain {
  id: string;
  label: string;
  tier: number;
}

export interface CourseSchema {
  version: string;
  course: string;
  audience: string;
  sports: Sport[];
  phases: Record<"p1" | "p2" | "p3", string>;
  masteryStatuses: MasteryStatus[];
  notes?: string;
}

export interface Course {
  schema: CourseSchema;
  domains: Domain[];
}

export interface MisconceptionRegistryEntry {
  id: string;
  description: string;
}

/** One hook per sport (including "neutral"). Keys are exhaustive — validated. */
export type ContextHooks = Record<Sport, string>;

export interface WorkedExample {
  id: string;
  title: string;
  steps: { prompt: string; reveal: string }[];
}

export interface SkillNode {
  id: string;
  title: string;
  domain: string;
  tier: number;
  /** prereqs[] are the source of truth; edges[] must mirror them exactly. */
  prereqs: string[];
  standards: { ccss: string[]; state: string | null };
  objective: string;
  misconceptionTags: string[];
  visual: VisualKind | null;
  contextHooks: ContextHooks;
  workedExamples: WorkedExample[];
  problems: { p1: ProblemTemplate[]; p2: ProblemTemplate[]; p3: ProblemTemplate[] };
}

export interface SkillEdge {
  from: string;
  to: string;
}

export interface CurriculumGraph extends Course {
  misconceptionRegistry: MisconceptionRegistryEntry[];
  nodes: SkillNode[];
  edges: SkillEdge[];
}

/** Assembled teaching content for one skill (consumed by Learn surfaces, Phase 4). */
export interface SkillContent {
  skillId: string;
  objective: string;
  workedExamples: WorkedExample[];
  visual: VisualKind | null;
  contextHooks: ContextHooks;
  videos: VideoAsset[];
}
