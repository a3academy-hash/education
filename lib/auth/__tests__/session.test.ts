import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/headers so the memory-mode cookie path is exercisable in-process.
// The memory branch of the session seam only ever calls cookies() (never the
// Supabase clients), so this single mock is sufficient for the memory path.
const cookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name) } : undefined,
    getAll: () =>
      [...cookieStore.entries()].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
  }),
}));

import { getCurrentStudentId, resolveStudentSession } from "../session";
import { STUDENT_COOKIE } from "../../../app/student/onboarding/constants";

// S1: memory mode reads STUDENT_COOKIE, UNCHANGED. No Supabase Auth involved.
describe("getCurrentStudentId — memory path (S1)", () => {
  const original = process.env.REPOSITORY_BACKEND;

  beforeEach(() => {
    delete process.env.REPOSITORY_BACKEND; // memory (default)
    cookieStore.clear();
  });
  afterEach(() => {
    if (original === undefined) delete process.env.REPOSITORY_BACKEND;
    else process.env.REPOSITORY_BACKEND = original;
    cookieStore.clear();
  });

  it("returns the STUDENT_COOKIE value when present", async () => {
    cookieStore.set(STUDENT_COOKIE, "stu_123");
    expect(await getCurrentStudentId()).toBe("stu_123");
  });

  it("returns null when no cookie is set", async () => {
    expect(await getCurrentStudentId()).toBeNull();
  });

  it("resolveStudentSession reports active with the id when the cookie is set", async () => {
    cookieStore.set(STUDENT_COOKIE, "stu_abc");
    expect(await resolveStudentSession()).toEqual({
      studentId: "stu_abc",
      status: "active",
    });
  });

  it("resolveStudentSession reports none (never paused/pending) in memory mode", async () => {
    // Memory mode has no parent/consent layer — a missing cookie is "none",
    // never "revoked"/"pending".
    expect(await resolveStudentSession()).toEqual({
      studentId: null,
      status: "none",
    });
  });
});
