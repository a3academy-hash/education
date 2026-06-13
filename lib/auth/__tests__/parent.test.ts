import { describe, it, expect, vi } from "vitest";

// parent.ts imports the SSR server client (which imports next/headers); mock it
// so the module loads in-process. We only exercise the PURE deriveConsent here.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: () => {},
  }),
}));

import { deriveConsent } from "../parent";

// S7/P4: consent truth = link.status + the current consent event's status.
describe("deriveConsent (S7)", () => {
  it("active link + granted event → active", () => {
    expect(deriveConsent("active", "granted")).toBe("active");
  });

  it("revoked link → revoked regardless of any stale event", () => {
    expect(deriveConsent("revoked", "granted")).toBe("revoked");
    expect(deriveConsent("revoked", null)).toBe("revoked");
  });

  it("revoked current event → revoked even if the link still reads active", () => {
    expect(deriveConsent("active", "revoked")).toBe("revoked");
  });

  it("active link with no granted event yet → pending (setup not finished)", () => {
    expect(deriveConsent("active", null)).toBe("pending");
    expect(deriveConsent("active", "pending")).toBe("pending");
  });
});
