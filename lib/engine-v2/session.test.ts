import { describe, expect, it } from "vitest";
import { updateNode, evaluateLock, type DelayedCheck } from "./session";
import { TRANSFER_DIMENSIONS, type BktParams, type LearningState } from "./index";

const P: BktParams = { pL0: 0.2, pT: 0.1, pG: 0.2, pS: 0.1 };
const start: LearningState = { acq: { pKnown: 0.5 }, ret: { stability: null, lastRetrievalAtIso: null } };

describe("session — D5 cutover (updateNode never locks)", () => {
  it("an in-session attempt updates provisional state and never locks", () => {
    const u = updateNode(start, { kind: "retrieval", correct: true, elapsedDays: 3 }, P, "2026-06-16T00:00:00.000Z");
    expect(u.provisional).toBe(true);
    expect(u.next.acq.pKnown).toBeGreaterThan(0.5);
  });

  it("THE FIREWALL: any number of perfect in-session attempts cannot lock — no DelayedChecks exist", () => {
    let s = start;
    const noChecks: DelayedCheck[] = []; // in-session updateNode produces NO DelayedCheck
    for (let i = 0; i < 20; i++) {
      s = updateNode(s, { kind: "retrieval", correct: true, elapsedDays: 0.01 }, P, "2026-06-16T00:00:00.000Z").next;
    }
    expect(s.acq.pKnown).toBeGreaterThan(0.9); // mastered in-session...
    expect(evaluateLock(noChecks, { lowerBound: 0.9 })).toBe(false); // ...but NOT locked
  });

  it("locks ONLY from a full delayed-check history (the DelayedCheck-only boundary)", () => {
    const checks: DelayedCheck[] = [1, 7, 21].flatMap((w) =>
      TRANSFER_DIMENSIONS.map((d) => ({
        window: w as 1 | 7 | 21, unseen: true, correct: true, dimension: d, pKnownLB: 0.93,
        atIso: "2026-06-16T00:00:00.000Z",
      })),
    );
    expect(evaluateLock(checks, { lowerBound: 0.9 })).toBe(true);
    // drop the 21-day window -> no lock
    expect(evaluateLock(checks.filter((c) => c.window !== 21), { lowerBound: 0.9 })).toBe(false);
    // a SEEN delayed check does not qualify
    expect(evaluateLock(checks.map((c) => ({ ...c, unseen: false })), { lowerBound: 0.9 })).toBe(false);
  });
});
