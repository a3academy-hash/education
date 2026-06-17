// lib/compliance/subprocessors tests (Phase 7 R11/R12/R13) — notice filter never
// leaks dpaStatus/securityCommitments; register seeds pending DPAs.

import { describe, expect, it } from "vitest";
import {
  SUBPROCESSOR_REGISTER,
  parentNoticeSection,
} from "./subprocessors";

describe("SUBPROCESSOR_REGISTER", () => {
  it("seeds the §15 minimum vendor set with all DPAs pending (launch blocker visible)", () => {
    const providers = SUBPROCESSOR_REGISTER.map((e) => e.provider);
    expect(providers).toContain("Supabase");
    expect(providers).toContain("Vercel");
    expect(providers).toContain("LLM tutor provider");
    expect(providers).toContain("Payment processor");
    for (const e of SUBPROCESSOR_REGISTER) {
      expect(e.dpaStatus).toBe("pending");
    }
  });
});

describe("parentNoticeSection", () => {
  it("returns only inParentNotice entries", () => {
    const notice = parentNoticeSection();
    const expected = SUBPROCESSOR_REGISTER.filter((e) => e.inParentNotice).map((e) => e.provider);
    expect(notice.map((n) => n.provider)).toEqual(expected);
    // analytics + error logging are NOT in the parent notice.
    expect(notice.map((n) => n.provider)).not.toContain("Analytics");
    expect(notice.map((n) => n.provider)).not.toContain("Error logging");
  });

  it("NEVER leaks dpaStatus or securityCommitments into the parent notice", () => {
    const notice = parentNoticeSection();
    for (const row of notice) {
      expect(row).not.toHaveProperty("dpaStatus");
      expect(row).not.toHaveProperty("securityCommitments");
      expect(row).not.toHaveProperty("sccStatus");
      expect(row).not.toHaveProperty("inParentNotice");
    }
  });

  it("accepts a custom register", () => {
    const notice = parentNoticeSection([
      {
        provider: "X",
        dataShared: "d",
        purpose: "p",
        childData: true,
        retention: "r",
        region: "US",
        dpaStatus: "pending",
        sccStatus: "not_applicable",
        securityCommitments: "s",
        deletionSupport: "x",
        inParentNotice: false,
      },
    ]);
    expect(notice).toEqual([]);
  });
});
