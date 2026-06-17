// lib/insight/suppression tests (Phase 7 B1/R4/R13) — n<5 suppressed, n>=5 passes.

import { describe, expect, it } from "vitest";
import { suppressCohort, type CohortCell } from "./suppression";

const cells: CohortCell[] = [
  { key: "on_track", n: 12, value: 0.8 },
  { key: "watch", n: 4, value: 0.3 },
  { key: "intervention", n: 5, value: 0.1 },
  { key: "empty", n: 0, value: 0 },
];

describe("suppressCohort", () => {
  it("suppresses cells with n < minCell (default 5) and passes n >= 5", () => {
    const out = suppressCohort(cells);
    const byKey = Object.fromEntries(out.map((c) => [c.key, c]));

    expect(byKey.on_track.suppressed).toBe(false);
    expect(byKey.on_track.value).toBe(0.8);
    expect(byKey.on_track.n).toBe(12);

    expect(byKey.watch.suppressed).toBe(true);
    expect(byKey.watch.value).toBeNull();
    expect(byKey.watch.n).toBeNull();

    // n === 5 is at the threshold and is NOT suppressed.
    expect(byKey.intervention.suppressed).toBe(false);
    expect(byKey.intervention.n).toBe(5);

    expect(byKey.empty.suppressed).toBe(true);
  });

  it("honors a custom minCell", () => {
    const out = suppressCohort([{ key: "k", n: 3, value: 1 }], { minCell: 3 });
    expect(out[0].suppressed).toBe(false);
  });

  it("preserves input order", () => {
    const out = suppressCohort(cells);
    expect(out.map((c) => c.key)).toEqual(["on_track", "watch", "intervention", "empty"]);
  });
});
