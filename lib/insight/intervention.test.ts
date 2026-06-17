// lib/insight/intervention tests (Phase 7 R7/R13) — kind→band mapping, most-severe
// rollup, next-action string. PURE.

import { describe, expect, it } from "vitest";
import { interventionBand, nextAction, nextActionForKind } from "./intervention";
import type { FlagEntry } from "../../types";

function flag(over: Partial<FlagEntry> & { kind: FlagEntry["kind"] }): FlagEntry {
  return {
    severity: "info",
    detail: "",
    evidenceAttemptIds: [],
    ...over,
  };
}

describe("interventionBand", () => {
  it("returns on_track with no flags", () => {
    expect(interventionBand([])).toBe("on_track");
  });

  it("maps stalled-node and decayed-review-queue to intervention (rose)", () => {
    expect(interventionBand([flag({ kind: "stalled-node" })])).toBe("intervention");
    expect(interventionBand([flag({ kind: "decayed-review-queue" })])).toBe("intervention");
  });

  it("maps habit signals to watch (amber)", () => {
    expect(interventionBand([flag({ kind: "high-hint-dependence" })])).toBe("watch");
    expect(interventionBand([flag({ kind: "rushing" })])).toBe("watch");
    expect(interventionBand([flag({ kind: "retention-probes-due" })])).toBe("watch");
  });

  it("escalates days-since-session by severity", () => {
    expect(interventionBand([flag({ kind: "days-since-session", severity: "info" })])).toBe(
      "on_track",
    );
    expect(
      interventionBand([flag({ kind: "days-since-session", severity: "attention" })]),
    ).toBe("watch");
  });

  it("returns the most-severe band across flags", () => {
    const flags = [
      flag({ kind: "rushing" }),
      flag({ kind: "stalled-node" }),
      flag({ kind: "high-hint-dependence" }),
    ];
    expect(interventionBand(flags)).toBe("intervention");
  });
});

describe("nextAction", () => {
  it("returns empty when on_track", () => {
    expect(nextAction([])).toBe("");
    expect(nextAction([flag({ kind: "days-since-session", severity: "info" })])).toBe("");
  });

  it("returns the next action for the most-severe open flag", () => {
    const flags = [flag({ kind: "rushing" }), flag({ kind: "stalled-node" })];
    expect(nextAction(flags)).toBe(nextActionForKind("stalled-node"));
  });
});
