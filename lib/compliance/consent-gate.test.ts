// lib/compliance/consent-gate tests (Phase 7 R11) — VPC ordering predicate. PURE.

import { describe, expect, it } from "vitest";
import { consentGate } from "./consent-gate";

describe("consentGate", () => {
  it("allows collection only when consent is granted", () => {
    expect(consentGate({ parentalConsent: { status: "granted", updatedAt: null } })).toBe(true);
  });

  it("blocks collection while pending or revoked", () => {
    expect(consentGate({ parentalConsent: { status: "pending", updatedAt: null } })).toBe(false);
    expect(consentGate({ parentalConsent: { status: "revoked", updatedAt: null } })).toBe(false);
  });
});
