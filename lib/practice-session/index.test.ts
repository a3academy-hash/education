// lib/practice-session/index.test.ts — the per-attempt ordering core (spec §H)
// and the two end-to-end loop tests (spec §L). Runs the REAL graph through the
// REAL engine via the InMemoryRepository. Deterministic nowIso throughout.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { InMemoryRepository } from "../repository/in-memory";
import { runPracticeAttempt, PracticeAttemptError } from "./index";
import { computeMasteryAll } from "../mastery-engine";
import { recommend } from "../adaptive-router";
import realGraphJson from "../../data/algebra1-graph.json";
import type {
  CurriculumGraph,
  StudentProfile,
  StudentSkillState,
} from "@/types";

const graph = realGraphJson as unknown as CurriculumGraph;
const SKILL = "ALG-F11"; // Percent Fundamentals — prereq ALG-F10
const PREREQ = "ALG-F10";
const STUDENT = "stu-practice";
const SESSION = "sess-A";
const SPORT = "baseball" as const;

const profile = (): StudentProfile => ({
  id: STUDENT,
  displayName: "Sam",
  gradeLevel: 8,
  sport: SPORT,
  campusId: null,
  parentalConsent: { status: "granted", updatedAt: null },
  createdAt: "2026-06-01T00:00:00.000Z",
});

const blank = (over: Partial<StudentSkillState> = {}): StudentSkillState => ({
  mastery: 0,
  status: "unknown",
  phase: 1,
  attempts: 0,
  correct: 0,
  hints: 0,
  timeMs: 0,
  recent: [],
  transfer: false,
  lastAttemptAt: null,
  masteredAt: null,
  ...over,
});

/** Seed a repo with the student and optional per-skill states. */
function makeRepo(states: Record<string, StudentSkillState> = {}): InMemoryRepository {
  return new InMemoryRepository({
    students: [profile()],
    skillStates: { [STUDENT]: states },
  });
}

const T = (n: number) => `2026-06-10T10:${String(n).padStart(2, "0")}:00.000Z`;

describe("runPracticeAttempt — §H ordering + invariants", () => {
  let repo: InMemoryRepository;
  beforeEach(() => {
    // Prereq is mastered so ALG-F11 is unlocked (P1 entry, not gated).
    repo = makeRepo({
      [PREREQ]: blank({ status: "mastered", masteredAt: "2026-06-09T00:00:00.000Z", mastery: 0.9 }),
    });
  });

  it("appends the attempt FIRST and the MasteryUpdate (if any) carries a REAL attempt id", async () => {
    // First P1 item, correct answer "25".
    await runPracticeAttempt(
      repo,
      STUDENT,
      graph,
      SPORT,
      {
        skillId: SKILL,
        problemId: "ALG-F11-p1-baseball-01",
        response: "25",
        timeMs: 30_000,
        hintsUsed: 0,
        phase: 1,
        isProbe: false,
        sessionId: SESSION,
      },
      T(0),
    );

    const attempts = await repo.listAttempts(STUDENT, SKILL);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].source).toBe("practice");
    expect(attempts[0].sessionId).toBe(SESSION);

    const updates = await repo.listMasteryUpdates(STUDENT, SKILL);
    // Whatever update fired must reference a REAL attempt id (never null).
    for (const u of updates) {
      expect(u.attemptId).not.toBeNull();
      expect(attempts.some((a) => a.id === u.attemptId)).toBe(true);
      expect(u.sessionId).toBe(SESSION);
      expect(u.trigger).toBe("attempt");
    }
  });

  it("ensures the parent session row BEFORE the first appendAttempt (FK ordering invariant)", async () => {
    // Record the order of repo calls; ensureSession must precede appendAttempt so
    // student_attempts.session_id never FK-violates against sessions (live bug).
    const calls: string[] = [];
    vi.spyOn(repo, "ensureSession").mockImplementation(async () => {
      calls.push("ensureSession");
    });
    const realAppend = repo.appendAttempt.bind(repo);
    vi.spyOn(repo, "appendAttempt").mockImplementation(async (a) => {
      calls.push("appendAttempt");
      return realAppend(a);
    });

    await runPracticeAttempt(
      repo,
      STUDENT,
      graph,
      SPORT,
      {
        skillId: SKILL,
        problemId: "ALG-F11-p1-baseball-01",
        response: "25",
        timeMs: 30_000,
        hintsUsed: 0,
        phase: 1,
        isProbe: false,
        sessionId: SESSION,
      },
      T(2),
    );

    expect(repo.ensureSession).toHaveBeenCalledWith({
      id: SESSION,
      studentId: STUDENT,
      kind: "practice",
    });
    expect(calls.indexOf("ensureSession")).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf("ensureSession")).toBeLessThan(calls.indexOf("appendAttempt"));
  });

  it("server re-checks: a wrong response logs correct=false regardless of any client claim", async () => {
    const res = await runPracticeAttempt(
      repo,
      STUDENT,
      graph,
      SPORT,
      {
        skillId: SKILL,
        problemId: "ALG-F11-p1-baseball-01",
        response: "2.5", // the misconception-tagged wrong answer
        timeMs: 30_000,
        hintsUsed: 0,
        phase: 1,
        isProbe: false,
        sessionId: SESSION,
      },
      T(1),
    );
    expect(res.correct).toBe(false);
    const attempts = await repo.listAttempts(STUDENT, SKILL);
    expect(attempts[0].correct).toBe(false);
    expect(attempts[0].misconceptionTags).toContain("moves-decimal-wrong-way");
    expect(res.feedbackState).toBe("incorrect-tag");
    expect(res.tutor).not.toBeNull();
  });

  it("rejects a problem that is not a legitimately-served slot for the current phase", async () => {
    await expect(
      runPracticeAttempt(
        repo,
        STUDENT,
        graph,
        SPORT,
        {
          skillId: SKILL,
          problemId: "ALG-F11-p3-neutral-01", // a P3 item served only at phase 3
          response: "0.45",
          timeMs: 30_000,
          hintsUsed: 0,
          phase: 3,
          isProbe: false,
          sessionId: SESSION,
        },
        T(2),
      ),
    ).rejects.toBeInstanceOf(PracticeAttemptError);
  });

  it("rejects a phase/probe mismatch with the served slot", async () => {
    await expect(
      runPracticeAttempt(
        repo,
        STUDENT,
        graph,
        SPORT,
        {
          skillId: SKILL,
          problemId: "ALG-F11-p1-baseball-01",
          response: "25",
          timeMs: 30_000,
          hintsUsed: 0,
          phase: 1,
          isProbe: true, // this slot is NOT a probe
          sessionId: SESSION,
        },
        T(3),
      ),
    ).rejects.toBeInstanceOf(PracticeAttemptError);
  });

  it("exposes no update/delete path on the append-only evidence logs (attempts/mastery)", () => {
    const surface = [
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(repo)),
      ...Object.getOwnPropertyNames(repo),
    ];
    // The append-only rule binds the EVIDENCE LOGS only. Profile mutation
    // (updateStudentSport) and the skill-state snapshot (setSkillState) are
    // legitimately mutable; no method may update/delete an attempt or a
    // mastery-update row.
    const logMutators = surface.filter(
      (n) => /^(update|delete|remove)/i.test(n) && /(attempt|mastery)/i.test(n),
    );
    expect(logMutators).toEqual([]);
  });
});

describe("source/sessionId isolation — neither changes engine output", () => {
  it("two identical attempts under different sessionIds reach the same persisted state", async () => {
    const stateA: Record<string, StudentSkillState> = {
      [PREREQ]: blank({ status: "mastered", masteredAt: "2026-06-09T00:00:00.000Z", mastery: 0.9 }),
    };
    const repoA = makeRepo({ ...stateA });
    const repoB = makeRepo({ ...stateA });

    const submit = (repo: InMemoryRepository, session: string) =>
      runPracticeAttempt(
        repo,
        STUDENT,
        graph,
        SPORT,
        {
          skillId: SKILL,
          problemId: "ALG-F11-p1-baseball-01",
          response: "25",
          timeMs: 30_000,
          hintsUsed: 0,
          phase: 1,
          isProbe: false,
          sessionId: session,
        },
        T(0),
      );

    await submit(repoA, "session-X");
    await submit(repoB, "session-Y");

    const a = (await repoA.getSkillStates(STUDENT))[SKILL];
    const b = (await repoB.getSkillStates(STUDENT))[SKILL];
    // Mastery math is identical; only the provenance column differs.
    expect(a.mastery).toBe(b.mastery);
    expect(a.status).toBe(b.status);
    expect(a.phase).toBe(b.phase);
    expect(a.transfer).toBe(b.transfer);
  });
});

describe("END-TO-END — accelerating student reaches mastery via P3 neutral transfer → advance", () => {
  it("correct P3 neutral answers set transfer, recompute to mastered, and route forward", async () => {
    // Seed: prereq mastered, ALG-F11 already advanced to Phase 3 with prior
    // correct P3 evidence (one transfer-counting correct already on the log).
    const repo = new InMemoryRepository({
      students: [profile()],
      skillStates: {
        [STUDENT]: {
          [PREREQ]: blank({
            status: "mastered",
            masteredAt: "2026-06-09T00:00:00.000Z",
            mastery: 0.9,
          }),
          [SKILL]: blank({
            status: "near_mastery",
            phase: 3,
            attempts: 4,
            correct: 4,
            mastery: 0.8,
            transfer: false,
            recent: [
              { correct: true, timeMs: 30_000, phase: 3 },
              { correct: true, timeMs: 30_000, phase: 3 },
              { correct: true, timeMs: 30_000, phase: 3 },
              { correct: true, timeMs: 30_000, phase: 3 },
            ],
            lastAttemptAt: T(0),
          }),
        },
      },
      // Prior P3 attempts on the immutable log so computeTransfer has history.
      attempts: [0, 1, 2, 3].map((i) => ({
        id: `seed-${i}`,
        studentId: STUDENT,
        skillId: SKILL,
        problemId: `ALG-F11-p3-neutral-0${i + 1}`,
        phase: 3 as const,
        sport: "neutral" as const,
        response: "x",
        correct: true,
        hintsUsed: 0,
        timeMs: 30_000,
        misconceptionTags: [],
        isProbe: false,
        source: "practice" as const,
        sessionId: "prior",
        graphVersion: "1.9.2",
        engineVersion: "1.0.0",
        createdAt: T(i),
      })),
    });

    // Submit a correct P3 neutral item.
    const res = await runPracticeAttempt(
      repo,
      STUDENT,
      graph,
      SPORT,
      {
        skillId: SKILL,
        problemId: "ALG-F11-p3-neutral-05", // answer "78"
        response: "78",
        timeMs: 30_000,
        hintsUsed: 0,
        phase: 3,
        isProbe: false,
        sessionId: SESSION,
      },
      T(5),
    );

    expect(res.correct).toBe(true);

    const finalState = (await repo.getSkillStates(STUDENT))[SKILL];
    expect(finalState.transfer).toBe(true); // P3 transfer demonstrated
    expect(finalState.status).toBe("mastered");
    expect(finalState.masteredAt).toBe(T(5));
    expect(finalState.recent).toEqual([]); // reset coincides with mastery

    // A mastered-restoration/fresh-mastery update referencing the real id.
    const updates = await repo.listMasteryUpdates(STUDENT, SKILL);
    const last = updates[updates.length - 1];
    expect(last.newStatus).toBe("mastered");
    expect(last.attemptId).not.toBeNull();
    expect(last.sessionId).toBe(SESSION);

    // Routing: the just-practiced node is mastered → recommend moves forward.
    const states = await repo.getSkillStates(STUDENT);
    const batch = computeMasteryAll(STUDENT, states, graph, T(6));
    const rec = recommend(batch.results, states, graph);
    expect(["continue", "accelerate", "complete"]).toContain(rec.kind);
    expect(rec.skillId).not.toBe(SKILL); // not re-serving the mastered node
  });
});

describe("END-TO-END — struggling student: miss + tag → tutor → backward route", () => {
  it("a tagged miss surfaces tutor inputs, keeps status low, and routes to the weak prerequisite", async () => {
    // Prereq is WEAK (below the gate, with attempt evidence) so ALG-F11 locks
    // and the router remediates backward.
    const repo = new InMemoryRepository({
      students: [profile()],
      skillStates: {
        [STUDENT]: {
          [PREREQ]: blank({
            status: "developing",
            phase: 1,
            attempts: 4,
            correct: 1,
            mastery: 0.3,
            recent: [
              { correct: false, timeMs: 30_000, phase: 1 },
              { correct: false, timeMs: 30_000, phase: 1 },
              { correct: true, timeMs: 30_000, phase: 1 },
              { correct: false, timeMs: 30_000, phase: 1 },
            ],
            lastAttemptAt: T(0),
          }),
        },
      },
    });

    // The student attempts ALG-F11 P1 and misses with the tagged answer.
    const res = await runPracticeAttempt(
      repo,
      STUDENT,
      graph,
      SPORT,
      {
        skillId: SKILL,
        problemId: "ALG-F11-p1-baseball-01",
        response: "2.5",
        timeMs: 30_000,
        hintsUsed: 1,
        phase: 1,
        isProbe: false,
        sessionId: SESSION,
      },
      T(1),
    );

    expect(res.correct).toBe(false);
    expect(res.feedbackState).toBe("incorrect-tag");
    expect(res.tutor).not.toBeNull();
    expect(res.tutor?.diagnosis.length).toBeGreaterThan(0);
    expect(res.masteredNow).toBe(false);

    const f11 = (await repo.getSkillStates(STUDENT))[SKILL];
    expect(f11.status).not.toBe("mastered");
    // Hint penalty is recorded, never suppressed.
    expect(f11.hints).toBe(1);

    // Backward route: ALG-F11 is locked by the weak prereq; recommend → review
    // or remediate, never advancing past the gap.
    const states = await repo.getSkillStates(STUDENT);
    const batch = computeMasteryAll(STUDENT, states, graph, T(2));
    const rec = recommend(batch.results, states, graph);
    expect(["remediate", "review", "continue"]).toContain(rec.kind);
    // The router never recommends the locked dependent itself.
    expect(rec.skillId).not.toBe(SKILL);
  });
});
