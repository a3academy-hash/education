import { describe, expect, it } from "vitest";
import { resolveLatestSession } from "./latest-session";
import type { StudentAttempt } from "@/types";

function attempt(o: Partial<StudentAttempt> & Pick<StudentAttempt, "id">): StudentAttempt {
  return {
    id: o.id,
    studentId: o.studentId ?? "stu-1",
    skillId: o.skillId ?? "ALG-A",
    problemId: o.problemId ?? "p-1",
    phase: o.phase ?? 1,
    sport: o.sport ?? "baseball",
    response: o.response ?? "",
    correct: o.correct ?? true,
    hintsUsed: o.hintsUsed ?? 0,
    timeMs: o.timeMs ?? 1000,
    misconceptionTags: o.misconceptionTags ?? [],
    isProbe: o.isProbe ?? false,
    source: o.source ?? "practice",
    sessionId: o.sessionId ?? "sess-1",
    graphVersion: o.graphVersion ?? "1.0.0",
    engineVersion: o.engineVersion ?? "1.0.0",
    createdAt: o.createdAt ?? "2026-06-14T00:00:00.000Z",
  };
}

describe("resolveLatestSession — display provenance for param-less Summary", () => {
  it("empty input -> null", () => {
    expect(resolveLatestSession([])).toBeNull();
  });

  it("single session -> that sessionId + its practice skill", () => {
    const attempts = [
      attempt({ id: "a1", sessionId: "sess-1", skillId: "ALG-A", createdAt: "2026-06-14T00:00:01.000Z" }),
      attempt({ id: "a2", sessionId: "sess-1", skillId: "ALG-A", createdAt: "2026-06-14T00:00:02.000Z" }),
    ];
    expect(resolveLatestSession(attempts)).toEqual({ sessionId: "sess-1", skillId: "ALG-A" });
  });

  it("retention probe (different skill) mixed in -> picks the practice skill, not the probe's", () => {
    const attempts = [
      attempt({ id: "a1", sessionId: "sess-1", skillId: "ALG-A", source: "practice", createdAt: "2026-06-14T00:00:01.000Z" }),
      // probe arrives LAST (latest overall) but must not win the skill resolution
      attempt({ id: "a2", sessionId: "sess-1", skillId: "ALG-PROBE", source: "retention", createdAt: "2026-06-14T00:00:02.000Z" }),
    ];
    expect(resolveLatestSession(attempts)).toEqual({ sessionId: "sess-1", skillId: "ALG-A" });
  });

  it("unordered input -> still picks the truly-latest session by createdAt", () => {
    const attempts = [
      attempt({ id: "a3", sessionId: "sess-2", skillId: "ALG-B", createdAt: "2026-06-14T00:00:09.000Z" }),
      attempt({ id: "a1", sessionId: "sess-1", skillId: "ALG-A", createdAt: "2026-06-14T00:00:01.000Z" }),
      attempt({ id: "a2", sessionId: "sess-1", skillId: "ALG-A", createdAt: "2026-06-14T00:00:02.000Z" }),
    ];
    expect(resolveLatestSession(attempts)).toEqual({ sessionId: "sess-2", skillId: "ALG-B" });
  });

  it("skillId arg present and found -> that session + skill", () => {
    const attempts = [
      attempt({ id: "a1", sessionId: "sess-1", skillId: "ALG-A", createdAt: "2026-06-14T00:00:01.000Z" }),
      attempt({ id: "a2", sessionId: "sess-2", skillId: "ALG-B", createdAt: "2026-06-14T00:00:02.000Z" }),
    ];
    expect(resolveLatestSession(attempts, "ALG-A")).toEqual({ sessionId: "sess-1", skillId: "ALG-A" });
  });

  it("skillId arg present but no session has a practice attempt for it -> null", () => {
    const attempts = [
      // only a retention probe for ALG-A exists -> not a practice attempt
      attempt({ id: "a1", sessionId: "sess-1", skillId: "ALG-A", source: "retention", createdAt: "2026-06-14T00:00:01.000Z" }),
      attempt({ id: "a2", sessionId: "sess-1", skillId: "ALG-B", source: "practice", createdAt: "2026-06-14T00:00:02.000Z" }),
    ];
    expect(resolveLatestSession(attempts, "ALG-A")).toBeNull();
    expect(resolveLatestSession(attempts, "ALG-Z")).toBeNull();
  });

  it("missing/unknown source is treated as practice", () => {
    // cast to bypass the union — simulates a row without an explicit source
    const attempts = [
      attempt({ id: "a1", sessionId: "sess-1", skillId: "ALG-A", source: undefined as unknown as StudentAttempt["source"], createdAt: "2026-06-14T00:00:01.000Z" }),
    ];
    expect(resolveLatestSession(attempts)).toEqual({ sessionId: "sess-1", skillId: "ALG-A" });
    expect(resolveLatestSession(attempts, "ALG-A")).toEqual({ sessionId: "sess-1", skillId: "ALG-A" });
  });

  it("a newer diagnostic attempt never selects a diagnostic session (regression)", () => {
    const attempts = [
      // practice session is older...
      attempt({ id: "a1", sessionId: "sess-practice", skillId: "ALG-A", source: "practice", createdAt: "2026-06-14T00:00:01.000Z" }),
      // ...a diagnostic attempt is NEWER and carries its own sessionId — must be ignored
      attempt({ id: "a2", sessionId: "sess-diag", skillId: "ALG-Z", source: "diagnostic", createdAt: "2026-06-14T00:00:09.000Z" }),
    ];
    expect(resolveLatestSession(attempts)).toEqual({ sessionId: "sess-practice", skillId: "ALG-A" });
  });

  it("only diagnostic attempts -> null (diagnostic has its own results flow)", () => {
    const attempts = [
      attempt({ id: "a1", sessionId: "sess-diag", skillId: "ALG-A", source: "diagnostic", createdAt: "2026-06-14T00:00:01.000Z" }),
      attempt({ id: "a2", sessionId: "sess-diag", skillId: "ALG-B", source: "diagnostic", createdAt: "2026-06-14T00:00:02.000Z" }),
    ];
    expect(resolveLatestSession(attempts)).toBeNull();
    expect(resolveLatestSession(attempts, "ALG-A")).toBeNull();
  });
});
