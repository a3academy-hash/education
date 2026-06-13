import { describe, it, expect } from "vitest";
import { CONSENT_META, type ConsentState } from "./ConsentPill";

// P4: ConsentPill is a SEPARATE neutral-palette component (NOT the
// MasteryStatus-typed StatusPill). Three values, calm labels. The dot is never
// the sole signal — every state carries a label.
describe("ConsentPill meta (P4)", () => {
  it("maps exactly the three consent states", () => {
    const keys = Object.keys(CONSENT_META).sort();
    expect(keys).toEqual(["active", "pending", "revoked"]);
  });

  it("uses the calm, non-accusatory labels", () => {
    expect(CONSENT_META.active.label).toBe("Active");
    expect(CONSENT_META.pending.label).toBe("Setup not finished");
    expect(CONSENT_META.revoked.label).toBe("Access paused");
  });

  it("every state has a non-empty dot color (dot is never the sole signal but is present)", () => {
    (Object.keys(CONSENT_META) as ConsentState[]).forEach((s) => {
      expect(CONSENT_META[s].color.length).toBeGreaterThan(0);
      expect(CONSENT_META[s].label.length).toBeGreaterThan(0);
    });
  });
});
