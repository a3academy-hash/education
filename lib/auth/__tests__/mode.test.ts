import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAuthMode } from "../mode";

// S3: getAuthMode DERIVES from REPOSITORY_BACKEND (one source of truth, fail
// closed). No independent AUTH_MODE env.
describe("getAuthMode — derives from REPOSITORY_BACKEND (S3)", () => {
  const original = process.env.REPOSITORY_BACKEND;

  beforeEach(() => {
    delete process.env.REPOSITORY_BACKEND;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.REPOSITORY_BACKEND;
    else process.env.REPOSITORY_BACKEND = original;
  });

  it("defaults to memory when REPOSITORY_BACKEND is unset (fail closed)", () => {
    expect(getAuthMode()).toBe("memory");
  });

  it("is memory when REPOSITORY_BACKEND=memory", () => {
    process.env.REPOSITORY_BACKEND = "memory";
    expect(getAuthMode()).toBe("memory");
  });

  it("is supabase ONLY for the exact 'supabase' value", () => {
    process.env.REPOSITORY_BACKEND = "supabase";
    expect(getAuthMode()).toBe("supabase");
  });

  it("treats any other value as memory (no AUTH_MODE drift)", () => {
    process.env.REPOSITORY_BACKEND = "postgres";
    expect(getAuthMode()).toBe("memory");
  });
});
