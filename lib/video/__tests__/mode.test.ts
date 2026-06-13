import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getVideoMode, isVideoEnabled } from "../mode";

// D2/D3: getVideoMode is enabled IFF getAuthMode()==="supabase" AND both CF env
// vars present. Reads env presence only, never throws, no Cloudflare contact.
describe("getVideoMode — disabled by default, gated on supabase + CF env (D2/D3)", () => {
  const keys = [
    "REPOSITORY_BACKEND",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_STREAM_API_TOKEN",
  ] as const;
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of keys) {
      original[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of keys) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  });

  it("is disabled with no env at all (the dev/test/CI default — 638 baseline)", () => {
    expect(getVideoMode()).toBe("disabled");
    expect(isVideoEnabled()).toBe(false);
  });

  it("is disabled in memory mode even when CF env is present", () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    process.env.CLOUDFLARE_STREAM_API_TOKEN = "tok";
    // REPOSITORY_BACKEND unset → memory
    expect(getVideoMode()).toBe("disabled");
  });

  it("is disabled in supabase mode when CF env is missing", () => {
    process.env.REPOSITORY_BACKEND = "supabase";
    expect(getVideoMode()).toBe("disabled");
  });

  it("is disabled in supabase mode when only one CF var is present", () => {
    process.env.REPOSITORY_BACKEND = "supabase";
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    expect(getVideoMode()).toBe("disabled");
  });

  it("is enabled ONLY when supabase mode AND both CF vars present", () => {
    process.env.REPOSITORY_BACKEND = "supabase";
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    process.env.CLOUDFLARE_STREAM_API_TOKEN = "tok";
    expect(getVideoMode()).toBe("enabled");
    expect(isVideoEnabled()).toBe(true);
  });

  it("does not throw on any env combination (no import-time/runtime throw)", () => {
    expect(() => getVideoMode()).not.toThrow();
  });
});
