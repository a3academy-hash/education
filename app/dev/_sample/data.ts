// Dev-only sample data for the internal compliance surfaces (Phase 5 §D/§E).
// NOT shipped to students — these surfaces all notFound() in production. This
// builds an in-memory repository seeded with one sample student plus a few
// mastered skills so buildStandardTranscript renders meaningful rows, and a
// sample MessageThread/Message set so the NCAA interaction surface has content.
//
// PURE construction from the real graph (no network, no DB). The sample student
// is fictional; displayName is first-name-only per the COPPA posture.

import graphJson from "../../../data/algebra1-graph.json";
import { validateGraph } from "../../../lib/validation";
import { isCreditBearingCode } from "../../../lib/transcript";
import type {
  CurriculumGraph,
  Message,
  MessageThread,
  MasteryUpdate,
  MasteryStatus,
  StudentSkillState,
} from "../../../types";

export const SAMPLE_STUDENT_ID = "sample-student-01";
export const SAMPLE_STUDENT_NAME = "Jordan";
export const SAMPLE_COURSE_ID = "algebra1";
export const SAMPLE_INSTRUCTOR_ID = "sample-instructor-01";

function masteredState(masteredAt: string): StudentSkillState {
  return {
    mastery: 0.94,
    status: "mastered",
    phase: 3,
    attempts: 6,
    correct: 5,
    hints: 1,
    timeMs: 240_000,
    recent: [],
    transfer: true,
    lastAttemptAt: masteredAt,
    masteredAt,
  };
}

function partialState(status: MasteryStatus, mastery: number): StudentSkillState {
  return {
    mastery,
    status,
    phase: status === "prerequisite_gap" ? 1 : 2,
    attempts: 3,
    correct: 1,
    hints: 2,
    timeMs: 120_000,
    recent: [],
    transfer: false,
    lastAttemptAt: "2026-06-05T10:00:00.000Z",
    masteredAt: null,
  };
}

export interface SampleData {
  graph: CurriculumGraph;
  states: Record<string, StudentSkillState>;
  masteryUpdates: MasteryUpdate[];
  thread: MessageThread;
  messages: Message[];
}

/**
 * Deterministically pick a small, representative slice of the real graph:
 *  - the first few credit-bearing nodes → mastered (with provenance updates)
 *  - one credit-bearing node → developing (so a credit standard shows N-of-M)
 *  - one prerequisite-review node → mastered
 * Everything else is left absent (status "unknown").
 */
export function buildSampleData(): SampleData {
  const report = validateGraph(graphJson);
  if (!report.valid) {
    throw new Error("Sample data: bundled graph is invalid — cannot build dev sample.");
  }
  const graph = graphJson as unknown as CurriculumGraph;

  const creditNodes = graph.nodes.filter((n) =>
    n.standards.ccss.some(isCreditBearingCode),
  );
  const reviewNodes = graph.nodes.filter(
    (n) => !n.standards.ccss.some(isCreditBearingCode),
  );

  const states: Record<string, StudentSkillState> = {};
  const masteryUpdates: MasteryUpdate[] = [];

  const masteredCredit = creditNodes.slice(0, 3);
  const developingCredit = creditNodes.slice(3, 4);
  const masteredReview = reviewNodes.slice(0, 2);

  let day = 1;
  const stamp = (): string =>
    `2026-06-${String(day++).padStart(2, "0")}T09:00:00.000Z`;

  for (const node of [...masteredCredit, ...masteredReview]) {
    const at = stamp();
    states[node.id] = masteredState(at);
    masteryUpdates.push({
      id: `mu-${node.id}`,
      studentId: SAMPLE_STUDENT_ID,
      skillId: node.id,
      attemptId: `att-${node.id}`,
      trigger: "attempt",
      prevMastery: 0.62,
      newMastery: 0.94,
      prevStatus: "near_mastery",
      newStatus: "mastered",
      prevPhase: 3,
      newPhase: 3,
      reason: "Mastered — neutral-notation transfer confirmed.",
      engineVersion: "1.0.0",
      sessionId: "sample-session-01",
      graphVersion: "1.9.2",
      createdAt: at,
    });
  }

  for (const node of developingCredit) {
    states[node.id] = partialState("developing", 0.48);
  }

  const thread: MessageThread = {
    id: "sample-thread-01",
    studentId: SAMPLE_STUDENT_ID,
    instructorId: SAMPLE_INSTRUCTOR_ID,
    createdAt: "2026-06-04T08:00:00.000Z",
  };

  const firstMasteredSkill = masteredCredit[0]?.id ?? null;
  const messages: Message[] = [
    {
      id: "sample-msg-01",
      threadId: thread.id,
      studentId: SAMPLE_STUDENT_ID,
      authorRole: "instructor",
      authorId: SAMPLE_INSTRUCTOR_ID,
      body:
        "Nice work clearing your first credit-bearing standard. Your neutral-notation transfer attempt was clean — that's the part that actually confirms mastery.",
      skillId: firstMasteredSkill,
      attemptId: firstMasteredSkill ? `att-${firstMasteredSkill}` : null,
      createdAt: "2026-06-04T08:05:00.000Z",
    },
    {
      id: "sample-msg-02",
      threadId: thread.id,
      studentId: SAMPLE_STUDENT_ID,
      authorRole: "student",
      authorId: SAMPLE_STUDENT_ID,
      body: "Thanks — the blended-phase problems clicked once I stopped relying on the sport framing.",
      skillId: firstMasteredSkill,
      attemptId: null,
      createdAt: "2026-06-04T18:20:00.000Z",
    },
    {
      id: "sample-msg-03",
      threadId: thread.id,
      studentId: SAMPLE_STUDENT_ID,
      authorRole: "instructor",
      authorId: SAMPLE_INSTRUCTOR_ID,
      body:
        "Exactly the goal. The next standard is still at developing — let's do one focused session this week and I'll check your work after.",
      skillId: developingCredit[0]?.id ?? null,
      attemptId: null,
      createdAt: "2026-06-05T09:10:00.000Z",
    },
  ];

  return { graph, states, masteryUpdates, thread, messages };
}
