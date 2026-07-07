// Ladder-parser tests against the REAL gold-node hints file.

import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parseHintLadders } from "./parse-hints";
import type { HintLadder } from "./types";

const HINTS_PATH = path.join(process.cwd(), "docs", "gold-node", "GOLD_NODE_HINTS.md");

let ladders: Record<string, HintLadder>;

beforeAll(() => {
  ladders = parseHintLadders(readFileSync(HINTS_PATH, "utf8"));
});

describe("parseHintLadders on GOLD_NODE_HINTS.md", () => {
  it("finds exactly 15 ladders (14 tag ladders + generic)", () => {
    expect(Object.keys(ladders)).toHaveLength(15);
    expect(ladders["HL-L06-generic"]).toBeDefined();
  });

  it("gives every ladder 3 non-empty rungs and a neverSay line", () => {
    for (const ladder of Object.values(ladders)) {
      expect(ladder.rungs).toHaveLength(3);
      for (const rung of ladder.rungs) expect(rung.length).toBeGreaterThan(10);
      expect(ladder.neverSay.length).toBeGreaterThan(10);
    }
  });

  it("tags every non-generic ladder with its taxonomy tag", () => {
    expect(ladders["HL-L06-generic"].tag).toBeNull();
    for (const [id, ladder] of Object.entries(ladders)) {
      if (id === "HL-L06-generic") continue;
      expect(ladder.tag).toBe(id.replace(/^HL-/, ""));
    }
  });

  it("spot-checks HL-forgot-denominator's rung text (renumbered 14-in-4 pair)", () => {
    const l = ladders["HL-forgot-denominator"];
    expect(l.rungs[0]).toContain("A rate compares two changes");
    expect(l.rungs[1]).toContain("14 more hits");
    expect(l.rungs[2]).toContain("14 ÷ 4");
    expect(l.neverSay).toContain("divide");
    // Rungs 1–2 must stay formula-free (the file's own A.2 contract).
    expect(l.rungs[0]).not.toMatch(/divid|formula/i);
    expect(l.rungs[1]).not.toMatch(/divid|formula/i);
  });

  it("does not misread SH1-SIGN-PAIR (collision service text) as a ladder", () => {
    expect(ladders["SH1-SIGN-PAIR"]).toBeUndefined();
  });
});
