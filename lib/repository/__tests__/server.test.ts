import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InMemoryRepository } from "../in-memory";
import { getRepository } from "../server";

// C-R3: getRepository is async; the default/test backend is `memory` and returns
// the process-local InMemoryRepository singleton (Supabase mode is exercised by
// the Matt-run live integration check, NOT this deterministic unit suite).
describe("getRepository — backend selection", () => {
  const original = process.env.REPOSITORY_BACKEND;

  beforeEach(() => {
    delete process.env.REPOSITORY_BACKEND;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.REPOSITORY_BACKEND;
    else process.env.REPOSITORY_BACKEND = original;
  });

  it("defaults to the InMemoryRepository when REPOSITORY_BACKEND is unset", async () => {
    const repo = await getRepository();
    expect(repo).toBeInstanceOf(InMemoryRepository);
  });

  it("returns the InMemoryRepository when REPOSITORY_BACKEND=memory", async () => {
    process.env.REPOSITORY_BACKEND = "memory";
    const repo = await getRepository();
    expect(repo).toBeInstanceOf(InMemoryRepository);
  });

  it("returns the SAME singleton across calls in memory mode", async () => {
    const a = await getRepository();
    const b = await getRepository();
    expect(a).toBe(b);
  });
});
