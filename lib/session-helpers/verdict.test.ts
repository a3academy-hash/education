import { describe, expect, it } from "vitest";
import { deriveVerdict, VERDICT_COPY } from "./verdict";
import type { AdaptiveRecommendation } from "@/types";

const rec = (kind: AdaptiveRecommendation["kind"]): AdaptiveRecommendation => ({
  skillId: "ALG-X",
  title: "Next skill",
  kind,
  reason: "because",
});

describe("deriveVerdict — router kind → Summary verdict (spec §F)", () => {
  it("maps each router kind to the correct verdict", () => {
    expect(deriveVerdict(rec("accelerate"), "developing")).toBe("advance");
    expect(deriveVerdict(rec("complete"), undefined)).toBe("advance");
    expect(deriveVerdict(rec("continue"), "developing")).toBe("continue");
    expect(deriveVerdict(rec("continue"), "near_mastery")).toBe("continue");
    expect(deriveVerdict(rec("review"), "needs_review")).toBe("review");
    expect(deriveVerdict(rec("remediate"), "prerequisite_gap")).toBe("remediate");
  });

  it("same-skill recommendation (not mastered) reads CONTINUE, not advance (B4)", () => {
    // The router returns kind "accelerate" pointing back at the SAME skill the
    // student just practiced (e.g. placed here, credited prereqs skipped) while
    // that skill is still Developing. Without the practicedSkillId the old code
    // said "Advance — you're moving on", contradicting the Developing state.
    expect(deriveVerdict(rec("accelerate"), "developing", "ALG-X")).toBe("continue");
    expect(deriveVerdict(rec("continue"), "developing", "ALG-X")).toBe("continue");
    // A DIFFERENT next skill keeps the accelerate→advance mapping.
    expect(deriveVerdict(rec("accelerate"), "developing", "ALG-OTHER")).toBe("advance");
    // Mastered still advances even on a same-skill rec (the override wins).
    expect(deriveVerdict(rec("accelerate"), "mastered", "ALG-X")).toBe("advance");
    // Same-skill review/remediate are NOT downgraded — only the advance verdict
    // contradicts a same-skill continuation (codex same-skill-review-remediate).
    expect(deriveVerdict(rec("review"), "needs_review", "ALG-X")).toBe("review");
    expect(deriveVerdict(rec("remediate"), "prerequisite_gap", "ALG-X")).toBe("remediate");
  });

  it("the mastered-override forces advance regardless of router kind", () => {
    // Router has already moved the recommendation to the next skill (continue),
    // but the just-practiced node is itself mastered → advance.
    expect(deriveVerdict(rec("continue"), "mastered")).toBe("advance");
    expect(deriveVerdict(rec("remediate"), "mastered")).toBe("advance");
    expect(deriveVerdict(rec("review"), "mastered")).toBe("advance");
  });

  it("every verdict has copy with a primary verb and a dot status", () => {
    for (const v of ["advance", "continue", "review", "remediate"] as const) {
      const c = VERDICT_COPY[v];
      expect(c.word.length).toBeGreaterThan(0);
      expect(c.note.length).toBeGreaterThan(0);
      expect(["continue", "review"]).toContain(c.primaryVerb);
    }
    expect(VERDICT_COPY.advance.primaryVerb).toBe("continue");
    expect(VERDICT_COPY.remediate.primaryVerb).toBe("review");
    expect(VERDICT_COPY.review.primaryVerb).toBe("review");
  });
});
