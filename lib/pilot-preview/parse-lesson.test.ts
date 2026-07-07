// Parser tests against the REAL gold-node lesson file (no fixtures — the
// preview's whole job is to render this exact document faithfully).

import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parseLesson, parseInline } from "./parse-lesson";
import type { LessonSection } from "./types";

const LESSON_PATH = path.join(process.cwd(), "docs", "gold-node", "GOLD_NODE_LESSON.md");

let sections: LessonSection[];

beforeAll(() => {
  sections = parseLesson(readFileSync(LESSON_PATH, "utf8"));
});

describe("parseLesson on GOLD_NODE_LESSON.md", () => {
  it("finds the preamble, all 7 numbered sections, and the appendix", () => {
    const numbered = sections.filter((s) => s.number !== null);
    expect(numbered.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(sections).toHaveLength(9); // preamble + 7 + appendix
    expect(sections[0].id).toBe("preamble");
    expect(sections[0].authoringOnly).toBe(true);
    const appendix = sections[sections.length - 1];
    expect(appendix.authoringOnly).toBe(true);
    expect(appendix.title).toMatch(/authoring metadata/i);
  });

  it("keeps section order and titles", () => {
    const s1 = sections.find((s) => s.number === 1);
    expect(s1?.title).toMatch(/^HOOK/);
    const s7 = sections.find((s) => s.number === 7);
    expect(s7?.title).toMatch(/^BRIDGE/);
  });

  it("parses all 11 fenced visual specs (doc self-check table says 10 — actual fence count is 11)", () => {
    const visuals = sections.flatMap((s) => s.blocks.filter((b) => b.kind === "visual"));
    expect(visuals).toHaveLength(11);
    const ids = visuals.map((v) => (v.kind === "visual" ? v.visualId : null));
    expect(ids).toContain("V-HOOK-01");
    expect(ids).toContain("V-BRIDGE-01");
    const we2 = visuals.find((v) => v.kind === "visual" && v.visualId === "V-WE2-01");
    expect(we2 && we2.kind === "visual" ? we2.visualType : null).toBe("coordinate-plane");
  });

  it("parses all four §4 embedded checks with keys inside their options", () => {
    const s4 = sections.find((s) => s.number === 4);
    const checks = (s4?.blocks ?? []).flatMap((b) =>
      b.kind === "embedded-check" ? [b.check] : [],
    );
    expect(checks.map((c) => c.id)).toEqual(["EC1", "EC2", "EC3", "EC4"]);
    for (const c of checks) {
      const ids = c.options.map((o) => o.id);
      expect(ids).toContain(c.correct);
      expect(c.question.length).toBeGreaterThan(0);
      expect(c.correctFeedback.length).toBeGreaterThan(0);
      for (const t of c.traps) {
        expect(ids).toContain(t.option);
        expect(t.option).not.toBe(c.correct);
        expect(t.tag).toMatch(/^[a-z0-9-]+$/);
      }
    }
  });

  it("keys EC1/EC2 to A with the taxonomy-cited traps", () => {
    const s4 = sections.find((s) => s.number === 4);
    const checks = (s4?.blocks ?? []).flatMap((b) =>
      b.kind === "embedded-check" ? [b.check] : [],
    );
    const ec1 = checks.find((c) => c.id === "EC1");
    expect(ec1?.correct).toBe("A");
    expect(ec1?.options).toHaveLength(3);
    expect(ec1?.traps.map((t) => t.tag).sort()).toEqual([
      "slope-as-difference",
      "slope-as-height",
    ]);
    const ec3 = checks.find((c) => c.id === "EC3");
    expect(ec3?.correct).toBe("A");
    expect(ec3?.options.map((o) => o.id)).toEqual(["A", "B", "C", "D"]);
    expect(ec3?.traps).toHaveLength(3);
  });

  it("collects Authoring notes groups as asides, never as student prose", () => {
    const s1 = sections.find((s) => s.number === 1);
    const asides = (s1?.blocks ?? []).filter((b) => b.kind === "authoring-aside");
    expect(asides.length).toBeGreaterThan(0);
    // No student-facing paragraph should start with the aside marker.
    for (const s of sections) {
      for (const b of s.blocks) {
        if (b.kind === "paragraph") {
          const text = b.spans.map((sp) => sp.text).join("");
          expect(text.startsWith("Authoring notes")).toBe(false);
        }
      }
    }
  });

  it("renders section 1's hook as a blockquote with bold spans", () => {
    const s1 = sections.find((s) => s.number === 1);
    const quote = s1?.blocks.find((b) => b.kind === "blockquote");
    expect(quote).toBeDefined();
    const flat =
      quote?.kind === "blockquote"
        ? quote.paragraphs.flat().map((sp) => sp.text).join(" ")
        : "";
    expect(flat).toContain("After game 2: 4 hits.");
  });
});

describe("parseInline", () => {
  it("splits bold / italic / code into spans", () => {
    expect(parseInline("a **b** *c* `d` e")).toEqual([
      { text: "a " },
      { text: "b", bold: true },
      { text: " " },
      { text: "c", italic: true },
      { text: " " },
      { text: "d", code: true },
      { text: " e" },
    ]);
  });
});
