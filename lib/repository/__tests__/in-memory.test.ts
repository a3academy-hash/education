import { describe, expect, it } from "vitest";
import { InMemoryRepository } from "../in-memory";
import { getLoadedGraphVersion } from "../../curriculum";
import { ENGINE_VERSION } from "../../mastery-engine";
import type { NewStudentAttempt, StudentAttempt, StudentProfile } from "@/types";

const newAttempt = (overrides: Partial<NewStudentAttempt> = {}): NewStudentAttempt => ({
  studentId: "stu-1",
  skillId: "ALG-F01",
  problemId: "P-1",
  phase: 1,
  sport: "baseball",
  response: "3",
  correct: true,
  hintsUsed: 0,
  timeMs: 12000,
  misconceptionTags: [],
  isProbe: false,
  source: "practice",
  sessionId: "sess-1",
  ...overrides,
});

const seededAttempt = (
  id: string,
  createdAt: string,
  overrides: Partial<StudentAttempt> = {},
): StudentAttempt => ({
  ...newAttempt(),
  // Centrally-stamped provenance (C-G2) — present on stored rows, not inputs.
  graphVersion: "0.0.0",
  engineVersion: "0.0.0",
  id,
  createdAt,
  ...overrides,
});

const newStudent = (): Omit<StudentProfile, "id" | "createdAt"> => ({
  displayName: "Avery",
  gradeLevel: 8,
  sport: "softball",
  campusId: null,
  parentalConsent: { status: "pending", updatedAt: null },
});

const seededStudent = (id: string, createdAt: string): StudentProfile => ({
  ...newStudent(),
  displayName: id,
  id,
  createdAt,
});

describe("InMemoryRepository — listStudents (Phase 7)", () => {
  it("returns all seeded students ordered by createdAt then id", async () => {
    const repo = new InMemoryRepository({
      students: [
        seededStudent("c", "2026-06-03T00:00:00.000Z"),
        seededStudent("a", "2026-06-01T00:00:00.000Z"),
        seededStudent("b", "2026-06-01T00:00:00.000Z"),
      ],
    });
    const students = await repo.listStudents();
    expect(students.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array when no students are seeded", async () => {
    expect(await new InMemoryRepository().listStudents()).toEqual([]);
  });

  it("returns copies — mutating a returned profile does not affect the store", async () => {
    const repo = new InMemoryRepository({
      students: [seededStudent("a", "2026-06-01T00:00:00.000Z")],
    });
    (await repo.listStudents())[0].displayName = "mutated";
    expect((await repo.listStudents())[0].displayName).toBe("a");
  });
});

describe("InMemoryRepository — graph", () => {
  it("getGraph returns the validated real graph (and caches)", async () => {
    const repo = new InMemoryRepository();
    const graph = await repo.getGraph();
    expect(graph.nodes).toHaveLength(74);
    expect(graph.edges).toHaveLength(114);
    expect(await repo.getGraph()).toBe(graph); // cached instance
  });

  it("getGraph throws an Error listing issues when the graph is invalid", async () => {
    const repo = new InMemoryRepository({ graph: { not: "a graph" } });
    await expect(repo.getGraph()).rejects.toThrow(/failed validation/);
    await expect(repo.getGraph()).rejects.toThrow(/SCHEMA/);
  });
});

describe("InMemoryRepository — append-only evidence log", () => {
  it("appendAttempt assigns id + createdAt and the attempt becomes listable", async () => {
    const repo = new InMemoryRepository();
    const attempt = await repo.appendAttempt(newAttempt());
    expect(attempt.id).toMatch(/[0-9a-f-]{36}/);
    expect(() => new Date(attempt.createdAt).toISOString()).not.toThrow();
    const listed = await repo.listAttempts("stu-1");
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(attempt);
  });

  it("central-stamps graphVersion + engineVersion on appended attempts (C-G2)", async () => {
    const repo = new InMemoryRepository();
    const attempt = await repo.appendAttempt(newAttempt());
    expect(attempt.graphVersion).toBe(getLoadedGraphVersion());
    expect(attempt.engineVersion).toBe(ENGINE_VERSION);
  });

  it("central-stamps graphVersion on appended mastery updates, keeping engineVersion (C-G2)", async () => {
    const repo = new InMemoryRepository();
    const update = await repo.appendMasteryUpdate({
      studentId: "stu-1",
      skillId: "ALG-F01",
      attemptId: null,
      trigger: "diagnostic",
      prevMastery: 0,
      newMastery: 0.5,
      prevStatus: "unknown",
      newStatus: "developing",
      prevPhase: 1,
      newPhase: 1,
      reason: "diagnostic placement",
      engineVersion: "7.7.7",
      sessionId: "sess-1",
    });
    expect(update.graphVersion).toBe(getLoadedGraphVersion());
    expect(update.engineVersion).toBe("7.7.7"); // retained from the engine input
  });

  it("exposes no update or delete path for attempts or mastery updates", () => {
    const repo = new InMemoryRepository() as unknown as Record<string, unknown>;
    const surface = [
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(repo)),
      ...Object.getOwnPropertyNames(repo),
    ];
    const mutators = surface.filter((name) =>
      /^(update|delete|remove|set).*(attempt|masteryupdate)/i.test(name),
    );
    expect(mutators).toEqual([]);
  });

  it("returned lists are copies — mutating them does not touch the store", async () => {
    const repo = new InMemoryRepository();
    const appended = await repo.appendAttempt(newAttempt({ misconceptionTags: ["tag-a"] }));
    const listed = await repo.listAttempts("stu-1");
    listed[0].correct = false;
    listed[0].misconceptionTags.push("injected");
    listed.pop();
    const fresh = await repo.listAttempts("stu-1");
    expect(fresh).toHaveLength(1);
    expect(fresh[0]).toEqual(appended);
  });

  it("listAttempts orders deterministically: createdAt asc, ties by id asc", async () => {
    const repo = new InMemoryRepository({
      attempts: [
        seededAttempt("bbb", "2026-06-02T10:00:00.000Z"),
        seededAttempt("zzz", "2026-06-01T10:00:00.000Z"),
        seededAttempt("aaa", "2026-06-02T10:00:00.000Z"), // ties with "bbb" on createdAt
        seededAttempt("mmm", "2026-05-30T10:00:00.000Z"),
      ],
    });
    const listed = await repo.listAttempts("stu-1");
    expect(listed.map((a) => a.id)).toEqual(["mmm", "zzz", "aaa", "bbb"]);
  });

  it("listMasteryUpdates orders deterministically and filters by skillId", async () => {
    const repo = new InMemoryRepository();
    const base = {
      studentId: "stu-1",
      attemptId: null,
      trigger: "diagnostic" as const,
      prevMastery: 0,
      newMastery: 0.5,
      prevStatus: "unknown" as const,
      newStatus: "developing" as const,
      prevPhase: 1 as const,
      newPhase: 1 as const,
      reason: "diagnostic placement",
      engineVersion: "0.0.0",
      sessionId: "sess-1",
    };
    await repo.appendMasteryUpdate({ ...base, skillId: "ALG-F02" });
    await repo.appendMasteryUpdate({ ...base, skillId: "ALG-F01" });
    const all = await repo.listMasteryUpdates("stu-1");
    expect(all).toHaveLength(2);
    expect(all.map((u) => u.createdAt)).toEqual([...all.map((u) => u.createdAt)].sort());
    const filtered = await repo.listMasteryUpdates("stu-1", "ALG-F01");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].skillId).toBe("ALG-F01");
  });
});

describe("InMemoryRepository — students and skill states", () => {
  it("createStudent assigns id + createdAt; getStudent returns a copy", async () => {
    const repo = new InMemoryRepository();
    const created = await repo.createStudent(newStudent());
    expect(created.id).toMatch(/[0-9a-f-]{36}/);
    const fetched = await repo.getStudent(created.id);
    expect(fetched).toEqual(created);
    fetched!.parentalConsent.status = "granted";
    expect((await repo.getStudent(created.id))!.parentalConsent.status).toBe("pending");
  });

  it("updateStudentSport changes the sport; unknown student throws", async () => {
    const repo = new InMemoryRepository();
    const created = await repo.createStudent(newStudent());
    await repo.updateStudentSport(created.id, "soccer");
    expect((await repo.getStudent(created.id))!.sport).toBe("soccer");
    await expect(repo.updateStudentSport("nope", "soccer")).rejects.toThrow(/not found/i);
  });

  it("setSkillState / getSkillStates round-trips with copies", async () => {
    const repo = new InMemoryRepository();
    const state = {
      mastery: 0.4,
      status: "developing" as const,
      phase: 1 as const,
      attempts: 3,
      correct: 2,
      hints: 1,
      timeMs: 90000,
      recent: [
        { correct: true, timeMs: 30000, phase: 1 as const },
        { correct: false, timeMs: 40000, phase: 1 as const },
        { correct: true, timeMs: 20000, phase: 1 as const },
      ],
      transfer: false,
      lastAttemptAt: "2026-06-09T10:00:00.000Z",
      masteredAt: null,
    };
    await repo.setSkillState("stu-1", "ALG-F01", state);
    const states = await repo.getSkillStates("stu-1");
    expect(states["ALG-F01"]).toEqual(state);
    expect(states["ALG-F01"]).not.toBe(state);
    states["ALG-F01"].recent.push({ correct: true, timeMs: 1000, phase: 1 });
    states["ALG-F01"].recent[0].correct = false;
    const fresh = (await repo.getSkillStates("stu-1"))["ALG-F01"];
    expect(fresh.recent).toHaveLength(3);
    expect(fresh.recent[0].correct).toBe(true);
  });
});

describe("InMemoryRepository — listVideoAssets (Phase 11 Workstream D, D6)", () => {
  it("returns [] for any skill (video is a supabase-only feature; the contract)", async () => {
    const repo = new InMemoryRepository();
    expect(await repo.listVideoAssets("ALG-F01")).toEqual([]);
    expect(await repo.listVideoAssets("anything")).toEqual([]);
  });
});
