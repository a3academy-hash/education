import { describe, expect, it } from "vitest";
import { gradeAttempt, buildModelUpdateJob, runSubmitLoop } from "./index";
import type { ProblemTemplate } from "@/types";

function problem(o: Partial<ProblemTemplate> & Pick<ProblemTemplate, "answer">): ProblemTemplate {
  return {
    id: o.id ?? "p-1",
    version: o.version ?? 1,
    skillId: o.skillId ?? "ALG-F04",
    phase: o.phase ?? 1,
    sport: o.sport ?? "neutral",
    prompt: o.prompt ?? "Evaluate.",
    visual: o.visual ?? null,
    choices: o.choices,
    answer: o.answer,
    misconceptionMap: o.misconceptionMap,
    hints: o.hints ?? [],
    difficulty: o.difficulty ?? 1,
  };
}

describe("engine-loop gradeAttempt — authoritative synchronous grade", () => {
  it("grades a correct numeric answer", () => {
    const p = problem({ answer: { kind: "numeric", value: "16" } });
    expect(gradeAttempt(p, "16")).toEqual({ correct: true });
  });

  it("grades an incorrect answer and surfaces a mapped misconception tag", () => {
    const p = problem({
      answer: { kind: "numeric", value: "16" },
      misconceptionMap: { "8": "doubled-instead-of-squared" },
    });
    expect(gradeAttempt(p, "8")).toEqual({ correct: false, misconceptionTag: "doubled-instead-of-squared" });
  });

  it("incorrect with no matching misconception -> correct:false, no tag", () => {
    const p = problem({ answer: { kind: "numeric", value: "16" } });
    expect(gradeAttempt(p, "99")).toEqual({ correct: false });
  });

  it("is PURE — same (problem, response) yields the same outcome (no I/O, deterministic)", () => {
    const p = problem({ answer: { kind: "expression", value: "2x+3", acceptEquivalent: true } });
    const a = gradeAttempt(p, "3+2x");
    const b = gradeAttempt(p, "3+2x");
    expect(a).toEqual(b);
  });

  it("returns synchronously (not a Promise) — the optimistic path never awaits", () => {
    const p = problem({ answer: { kind: "numeric", value: "1" } });
    const out = gradeAttempt(p, "1");
    expect(out).not.toBeInstanceOf(Promise);
    expect(typeof out.correct).toBe("boolean");
  });
});

describe("engine-loop durable async contract (R5)", () => {
  it("buildModelUpdateJob carries ONLY the replay keys (no grade/derived state)", () => {
    const job = buildModelUpdateJob({ id: "att-1", studentId: "stu-1" });
    expect(job).toEqual({ attemptId: "att-1", studentId: "stu-1" });
    // exactly two keys — nothing derived that could drift from the immutable attempt
    expect(Object.keys(job).sort()).toEqual(["attemptId", "studentId"]);
  });

  it("runSubmitLoop separates the immediate grade from the deferred job", () => {
    const p = problem({ answer: { kind: "numeric", value: "5" } });
    const loop = runSubmitLoop(p, "5");
    // step 1: the grade is available immediately, independent of persistence
    expect(loop.grade).toEqual({ correct: true });
    // step 2: only AFTER persistence (which yields the attempt id) is the job built
    const job = loop.afterPersist({ id: "att-9", studentId: "stu-9" });
    expect(job).toEqual({ attemptId: "att-9", studentId: "stu-9" });
  });
});
