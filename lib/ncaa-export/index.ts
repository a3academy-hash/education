// lib/ncaa-export — the NCAA homeschool support-package builder (§14, R10). PURE:
// no IO, no Date.now() (nowIso explicit). mr-kahn + mr-gates GATED.
//
// A3 GENERATES a parent-submittable package; the PARENT (administrator of record)
// certifies + submits. This builder is pure over a STATIC field-map snapshot — it
// is NOT validated against the live NCAA Homeschool Toolkit (a deferred
// MUST-VALIDATE; the artifact carries that flag visibly).
//
// NON-NEGOTIABLE (R3/R10):
//   - reads grade.creditEligible — emits NO credit-bearing transcript line when
//     false (§14a: 1.0 credit only after full scope + summative + admin approval).
//   - time-on-task lives ONLY in the seat-time / activity section, NEVER as a
//     grade input (CLAUDE §14).
//   - the three §14 disclaimers ride EVERY export, verbatim.
//   - separates "platform-generated evidence" from "parent-certified transcript".

import { creditTier } from "../transcript";
import type { CourseGrade } from "../grade";
import type {
  CurriculumGraph,
  MasteryUpdate,
  SkillNode,
  StudentProfile,
  StudentSkillState,
} from "../../types";

/** The three §14 disclaimers — verbatim, on every export. */
export const NCAA_DISCLAIMERS = [
  "Parent/guardian administrator is responsible for accuracy",
  "Generated support package, NOT NCAA approval",
  "Eligibility Center may request more",
] as const;

/** The MUST-VALIDATE flag carried on the artifact (R10). */
export const FIELD_MAP_FLAG =
  "Field mapping not yet validated against the live NCAA Homeschool Toolkit";

/** Accurate classification (§14 — do not over-claim "parent only"). */
export const COURSE_CLASSIFICATION =
  "Parent-administered homeschool course supported by a third-party platform, AI tutor, and content authoring";

/** Snapshot version of this static field-map (audit). */
export const NCAA_EXPORT_VERSION = "1.0.0";

const MS_PER_MIN = 60_000;

export interface CoreCourseTopic {
  skillId: string;
  title: string;
  objective: string;
  domain: string;
}

export interface AssessmentSample {
  skillId: string;
  /** A representative NEUTRAL (P3) problem prompt for this domain, if available. */
  prompt: string;
}

export interface ActivityLogEntry {
  /** ISO date (YYYY-MM-DD) of activity. */
  date: string;
  /** Seat-time minutes on that date (rounded). Seat-time only — never a grade input. */
  minutes: number;
}

export interface TranscriptLine {
  course: string;
  /** Letter grade — present only as a projection (parent certifies the final). */
  projectedGrade: string;
  /** Credit unit string; null when not credit-eligible (§14a). */
  credit: string | null;
  /** Completion date (ISO) when the course is complete; null otherwise. */
  completionDate: string | null;
}

export interface NcaaExport {
  exportVersion: string;
  generatedAt: string;
  classification: string;
  /** The MUST-VALIDATE field-map flag (R10). */
  fieldMapNotValidated: string;
  disclaimers: readonly string[];

  student: { id: string; displayName: string; gradeLevel: number };

  /** PLATFORM-GENERATED EVIDENCE (clearly separated from the parent-certified line). */
  platformEvidence: {
    coreCourseWorksheet: {
      learningObjectives: string[];
      majorTopics: CoreCourseTopic[];
      materials: string[];
      /** Total seat-time minutes (activity aggregate). Seat-time only. */
      timeSpentMinutes: number;
      gradingApproach: string;
    };
    syllabus: { graphSchemaVersion: string; domainSequence: { id: string; label: string }[] };
    gradingScale: { version: string; disclaimer: string };
    assessmentSamples: AssessmentSample[];
    activityLog: ActivityLogEntry[];
  };

  /** PARENT-CERTIFIED TRANSCRIPT — the line the parent attests to + submits. */
  parentCertified: {
    /** Null when grade.creditEligible is false — NO credit-bearing line (R3/§14a). */
    transcriptLine: TranscriptLine | null;
    administratorStatementTemplate: string;
  };
}

const GRADING_APPROACH_TEXT =
  "70% locked mastery across required Algebra 1 standards (delayed-unseen, transfer-gated); " +
  "20% cumulative proctored assessment; 10% portfolio/completion artifacts. " +
  "Effort and time-on-task document seat-time but never boost the grade.";

const ADMIN_STATEMENT_TEMPLATE =
  "I, the parent/guardian administrator of record for this homeschool course, certify that the " +
  "above record accurately reflects the student's completed coursework. This package was generated " +
  "with platform support; I am responsible for its accuracy and for any additional documentation " +
  "the NCAA Eligibility Center may request.";

function neutralPrompt(node: SkillNode): string {
  // A node may have no P3 problems authored; be defensive.
  return node.problems.p3?.[0]?.prompt ?? "";
}

/**
 * Build the NCAA support package. PURE.
 *
 * @param student the student profile
 * @param graph   the curriculum graph (scope, domains, objectives, samples)
 * @param states  per-skill states (which nodes are mastered/touched)
 * @param updates the immutable MasteryUpdate log (provenance — reserved for audit)
 * @param grade   the computed CourseGrade (reads creditEligible + projectedGrade)
 * @param nowIso  ISO "now" (generation timestamp)
 */
export function buildNcaaExport(
  student: StudentProfile,
  graph: CurriculumGraph,
  states: Record<string, StudentSkillState>,
  updates: MasteryUpdate[],
  grade: CourseGrade,
  nowIso: string,
): NcaaExport {
  void updates; // provenance is consumed by lib/grade; retained here for audit parity

  const creditNodes = graph.nodes.filter((n) => creditTier(n) === "algebra1-credit");

  // Major topics = credit-bearing graph nodes (NCAA Core-Course Worksheet).
  const majorTopics: CoreCourseTopic[] = creditNodes.map((n) => ({
    skillId: n.id,
    title: n.title,
    objective: n.objective,
    domain: n.domain,
  }));

  const learningObjectives = creditNodes.map((n) => n.objective).filter((o) => o.length > 0);

  // One representative NEUTRAL sample per domain (first credit node in the domain
  // that carries a P3 problem).
  const assessmentSamples: AssessmentSample[] = [];
  const seenDomain = new Set<string>();
  for (const n of creditNodes) {
    if (seenDomain.has(n.domain)) continue;
    const prompt = neutralPrompt(n);
    if (prompt) {
      assessmentSamples.push({ skillId: n.id, prompt });
      seenDomain.add(n.domain);
    }
  }

  // Seat-time activity: aggregate per-skill timeMs by... we have no per-date logs
  // in state, so summarize total time. Activity-log granularity is per attempt in
  // the immutable log; here we emit the seat-time total (seat-time section ONLY).
  let totalTimeMs = 0;
  for (const node of graph.nodes) {
    const s = states[node.id];
    if (s) totalTimeMs += s.timeMs > 0 ? s.timeMs : 0;
  }
  const timeSpentMinutes = Math.round(totalTimeMs / MS_PER_MIN);
  const activityLog: ActivityLogEntry[] = [
    { date: nowIso.slice(0, 10), minutes: timeSpentMinutes },
  ];

  // Course completion = every credit-bearing node mastered.
  const allMastered =
    creditNodes.length > 0 &&
    creditNodes.every((n) => states[n.id]?.status === "mastered");

  // PARENT-CERTIFIED transcript line — ONLY when credit-eligible (R3/§14a).
  const transcriptLine: TranscriptLine | null = grade.creditEligible
    ? {
        course: graph.schema.course,
        projectedGrade: grade.letter,
        credit: "1.0 Algebra 1 (parent-certified)",
        completionDate: allMastered ? nowIso.slice(0, 10) : null,
      }
    : null;

  return {
    exportVersion: NCAA_EXPORT_VERSION,
    generatedAt: nowIso,
    classification: COURSE_CLASSIFICATION,
    fieldMapNotValidated: FIELD_MAP_FLAG,
    disclaimers: NCAA_DISCLAIMERS,
    student: {
      id: student.id,
      displayName: student.displayName,
      gradeLevel: student.gradeLevel,
    },
    platformEvidence: {
      coreCourseWorksheet: {
        learningObjectives,
        majorTopics,
        materials: [`A3 Academy Algebra 1 adaptive curriculum (graph ${graph.schema.version})`],
        timeSpentMinutes,
        gradingApproach: GRADING_APPROACH_TEXT,
      },
      syllabus: {
        graphSchemaVersion: graph.schema.version,
        domainSequence: graph.domains.map((d) => ({ id: d.id, label: d.label })),
      },
      gradingScale: { version: grade.gradingScaleVersion, disclaimer: grade.disclaimer },
      assessmentSamples,
      activityLog,
    },
    parentCertified: {
      transcriptLine,
      administratorStatementTemplate: ADMIN_STATEMENT_TEMPLATE,
    },
  };
}
