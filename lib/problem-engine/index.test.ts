import { describe, expect, it } from "vitest";
import { advancePhase, checkAnswer, computeTransfer, PROBLEM_CONFIG, selectProblems } from "./index";
import type {
  AnswerSpec,
  ContextHooks,
  Phase,
  ProblemTemplate,
  SkillNode,
  Sport,
  StudentAttempt,
  StudentSkillState,
} from "@/types";

const hooks: ContextHooks = {
  baseball: "bb",
  softball: "sb",
  basketball: "bk",
  soccer: "sc",
  football: "fb",
  volleyball: "vb",
  neutral: "nt",
};

const problem = (
  id: string,
  phase: Phase,
  sport: Sport,
  difficulty: 1 | 2 | 3 = 1,
  answer: AnswerSpec = { kind: "numeric", value: "1" },
  misconceptionMap?: Record<string, string>,
): ProblemTemplate => ({
  id,
  version: 1,
  skillId: "S1",
  phase,
  sport,
  prompt: `prompt ${id}`,
  visual: null,
  answer,
  misconceptionMap,
  hints: [],
  difficulty,
});

const nodeWith = (problems: SkillNode["problems"]): SkillNode => ({
  id: "S1",
  title: "Skill One",
  domain: "d1",
  tier: 0,
  prereqs: [],
  standards: { ccss: [], state: null },
  objective: "",
  misconceptionTags: [],
  visual: null,
  contextHooks: hooks,
  workedExamples: [],
  problems,
});

const state = (phase: Phase): StudentSkillState => ({
  mastery: 0,
  status: "developing",
  phase,
  attempts: 0,
  correct: 0,
  hints: 0,
  timeMs: 0,
  recent: [],
  transfer: false,
  lastAttemptAt: null,
  masteredAt: null,
});

const attempt = (over: Partial<StudentAttempt>): StudentAttempt => ({
  id: "a-1",
  studentId: "stu-1",
  skillId: "S1",
  problemId: "P-1",
  phase: 1,
  sport: "baseball",
  response: "1",
  correct: true,
  hintsUsed: 0,
  timeMs: 10_000,
  misconceptionTags: [],
  isProbe: false,
  source: "practice",
  sessionId: "sess-1",
  createdAt: "2026-06-01T00:00:00.000Z",
  ...over,
});

describe("selectProblems", () => {
  const node = nodeWith({
    p1: [
      problem("p1-c", 1, "baseball", 2),
      problem("p1-a", 1, "baseball", 1),
      problem("p1-e", 1, "baseball", 3),
      problem("p1-b", 1, "baseball", 1),
      problem("p1-d", 1, "baseball", 2),
      problem("p1-x", 1, "soccer", 1), // other sport — filtered out
    ],
    p2: [problem("p2-b", 2, "baseball", 2), problem("p2-a", 2, "baseball", 1)],
    p3: [problem("p3-a", 3, "neutral", 1), problem("p3-b", 3, "neutral", 2)],
  });

  it("serves the student's sport bank easy→hard (difficulty, then id) with every 4th slot a probe", () => {
    const served = selectProblems(node, state(1), "baseball");
    expect(served.map((s) => s.problem.id)).toEqual([
      "p1-a",
      "p1-b",
      "p1-c",
      "p2-a", // slot 4 — N+1 probe
      "p1-d",
      "p1-e",
    ]);
    expect(served.map((s) => s.isProbe)).toEqual([false, false, false, true, false, false]);
    expect(served[3].problem.phase).toBe(2);
  });

  it("phase 3 serves neutral problems regardless of sport, with no probes (no N+1)", () => {
    const served = selectProblems(node, state(3), "baseball");
    expect(served.map((s) => s.problem.id)).toEqual(["p3-a", "p3-b"]);
    expect(served.every((s) => !s.isProbe)).toBe(true);
    expect(served.every((s) => s.problem.sport === "neutral")).toBe(true);
  });

  it("phase 2 probes draw from the neutral phase-3 bank", () => {
    const served = selectProblems(node, state(2), "baseball");
    // p2 bank has 2 baseball items: slots 1-2, never reaching slot 4 — extend via config.
    const tight = selectProblems(node, state(2), "baseball", { ...PROBLEM_CONFIG, probeRatio: 2 });
    expect(served.every((s) => !s.isProbe)).toBe(true);
    expect(tight.map((s) => [s.problem.id, s.isProbe])).toEqual([
      ["p2-a", false],
      ["p3-a", true],
      ["p2-b", false],
    ]);
  });

  it("empty banks (Phase 0 reality) return an empty array, no throw", () => {
    const empty = nodeWith({ p1: [], p2: [], p3: [] });
    expect(selectProblems(empty, state(1), "baseball")).toEqual([]);
  });

  it("is deterministic: same inputs → same output", () => {
    expect(selectProblems(node, state(1), "baseball")).toEqual(
      selectProblems(node, state(1), "baseball"),
    );
  });
});

describe("advancePhase", () => {
  it("4/4 non-probe at the current phase advances exactly one phase", () => {
    const attempts = [1, 2, 3, 4].map((i) => attempt({ id: `a-${i}`, phase: 1, correct: true }));
    expect(advancePhase(attempts, 1)).toBe(2);
  });

  it("3/4 (75%) does not advance", () => {
    const attempts = [
      attempt({ id: "a-1", correct: true }),
      attempt({ id: "a-2", correct: true }),
      attempt({ id: "a-3", correct: true }),
      attempt({ id: "a-4", correct: false }),
    ];
    expect(advancePhase(attempts, 1)).toBe(1);
  });

  it("fewer than 4 scored attempts never advances", () => {
    const attempts = [1, 2, 3].map((i) => attempt({ id: `a-${i}`, correct: true }));
    expect(advancePhase(attempts, 1)).toBe(1);
  });

  it("probe misses do not block advancement (probes excluded from the denominator)", () => {
    const attempts = [
      ...[1, 2, 3, 4].map((i) => attempt({ id: `a-${i}`, phase: 1, correct: true })),
      attempt({ id: "probe-1", phase: 2, correct: false, isProbe: true }),
      attempt({ id: "probe-2", phase: 2, correct: false, isProbe: true }),
    ];
    expect(advancePhase(attempts, 1)).toBe(2);
  });

  it("probe successes do not count toward advancement either", () => {
    const attempts = [
      ...[1, 2, 3].map((i) => attempt({ id: `a-${i}`, phase: 1, correct: true })),
      attempt({ id: "probe-1", phase: 1, correct: true, isProbe: true }),
    ];
    expect(advancePhase(attempts, 1)).toBe(1); // only 3 scored attempts
  });

  it("never advances past phase 3", () => {
    const attempts = [1, 2, 3, 4].map((i) => attempt({ id: `a-${i}`, phase: 3, correct: true }));
    expect(advancePhase(attempts, 3)).toBe(3);
  });
});

describe("computeTransfer", () => {
  const p3 = (id: string, createdAt: string, correct: boolean): StudentAttempt =>
    attempt({ id, phase: 3, correct, createdAt });

  it("2 correct among the most recent 5 phase-3 attempts → true", () => {
    const attempts = [
      p3("a-1", "2026-06-01T00:00:00.000Z", false),
      p3("a-2", "2026-06-02T00:00:00.000Z", false),
      p3("a-3", "2026-06-03T00:00:00.000Z", true),
      p3("a-4", "2026-06-04T00:00:00.000Z", false),
      p3("a-5", "2026-06-05T00:00:00.000Z", true),
      p3("a-6", "2026-06-06T00:00:00.000Z", false),
    ];
    expect(computeTransfer(attempts)).toBe(true);
  });

  it("1 correct among the most recent 5 phase-3 attempts → false", () => {
    const attempts = [
      p3("a-0", "2026-05-01T00:00:00.000Z", true), // correct, but outside the window
      p3("a-1", "2026-06-01T00:00:00.000Z", false),
      p3("a-2", "2026-06-02T00:00:00.000Z", false),
      p3("a-3", "2026-06-03T00:00:00.000Z", true),
      p3("a-4", "2026-06-04T00:00:00.000Z", false),
      p3("a-5", "2026-06-05T00:00:00.000Z", false),
      p3("a-6", "2026-06-06T00:00:00.000Z", false),
    ];
    expect(computeTransfer(attempts)).toBe(false);
  });

  it("phase 1/2 attempts never count toward transfer", () => {
    const attempts = [
      attempt({ id: "a-1", phase: 1, correct: true }),
      attempt({ id: "a-2", phase: 2, correct: true }),
      attempt({ id: "a-3", phase: 2, correct: true }),
    ];
    expect(computeTransfer(attempts)).toBe(false);
  });
});

describe("checkAnswer — numeric", () => {
  const p = problem("n1", 3, "neutral", 1, { kind: "numeric", value: "5" });

  it.each(["5", "x=5", "x = 5", "5.0", " 5 ", "X=5"])("accepts %j", (resp) => {
    expect(checkAnswer(p, resp).correct).toBe(true);
  });

  it("rejects a wrong value", () => {
    expect(checkAnswer(p, "6").correct).toBe(false);
    expect(checkAnswer(p, "-5").correct).toBe(false);
    expect(checkAnswer(p, "five").correct).toBe(false);
  });

  it("accepts fraction/decimal equivalence", () => {
    const frac = problem("n2", 3, "neutral", 1, { kind: "numeric", value: "1/2" });
    expect(checkAnswer(frac, "0.5").correct).toBe(true);
    expect(checkAnswer(frac, "1/2").correct).toBe(true);
    expect(checkAnswer(frac, "2/4").correct).toBe(true);
    expect(checkAnswer(frac, "0.51").correct).toBe(false);
  });

  it("applies optional tolerance", () => {
    const tol = problem("n3", 3, "neutral", 1, { kind: "numeric", value: "3.14", tolerance: 0.01 });
    expect(checkAnswer(tol, "3.1415").correct).toBe(true);
    expect(checkAnswer(tol, "3.2").correct).toBe(false);
  });
});

describe("checkAnswer — expression", () => {
  it("commutative-sum canonicalization only when acceptEquivalent", () => {
    const eq = problem("e1", 3, "neutral", 1, {
      kind: "expression",
      value: "2+3x",
      acceptEquivalent: true,
    });
    expect(checkAnswer(eq, "3x + 2").correct).toBe(true);
    expect(checkAnswer(eq, "2+3X").correct).toBe(true);
    expect(checkAnswer(eq, "3x+1").correct).toBe(false);

    const strict = problem("e2", 3, "neutral", 1, { kind: "expression", value: "2+3x" });
    expect(checkAnswer(strict, "3x+2").correct).toBe(false);
    expect(checkAnswer(strict, "2 + 3X").correct).toBe(true); // case/space still normalized
  });
});

describe("checkAnswer — inequality", () => {
  it("canonicalizes direction: '5<x' ≡ 'x>5'", () => {
    const p1 = problem("i1", 3, "neutral", 1, { kind: "inequality", value: "x>5" });
    expect(checkAnswer(p1, "5<x").correct).toBe(true);
    expect(checkAnswer(p1, "x > 5").correct).toBe(true);
    expect(checkAnswer(p1, "x>=5").correct).toBe(false);
    expect(checkAnswer(p1, "x<5").correct).toBe(false);
  });

  it("normalizes ≤/<= forms and compound chains", () => {
    const p2 = problem("i2", 3, "neutral", 1, { kind: "inequality", value: "-3 < x <= 4" });
    expect(checkAnswer(p2, "-3<x<=4").correct).toBe(true);
    expect(checkAnswer(p2, "−3 < x ≤ 4").correct).toBe(true);
    expect(checkAnswer(p2, "4 >= x > -3").correct).toBe(true); // reversed chain
    expect(checkAnswer(p2, "-3 <= x <= 4").correct).toBe(false);
  });
});

describe("checkAnswer — numeric-set", () => {
  const p = problem("s1", 3, "neutral", 1, { kind: "numeric-set", values: ["1", "3"] });

  it("is order-insensitive over normalized numerics", () => {
    expect(checkAnswer(p, "1, 3").correct).toBe(true);
    expect(checkAnswer(p, "3,1").correct).toBe(true);
    expect(checkAnswer(p, "{3, 1}").correct).toBe(true);
    expect(checkAnswer(p, "3.0, 1.0").correct).toBe(true);
  });

  it("is a multiset: wrong size or members fail", () => {
    expect(checkAnswer(p, "1").correct).toBe(false);
    expect(checkAnswer(p, "1, 2").correct).toBe(false);
    expect(checkAnswer(p, "1, 1, 3").correct).toBe(false);
  });

  it("strips only MATCHED bracket pairs: '{1,3)' is not a clean set", () => {
    expect(checkAnswer(p, "{1,3)").correct).toBe(false);
    expect(checkAnswer(p, "(1,3}").correct).toBe(false);
    expect(checkAnswer(p, "[1,3]").correct).toBe(true); // matched pair still fine
  });
});

describe("checkAnswer — coordinate", () => {
  const p = problem("c1", 3, "neutral", 1, { kind: "coordinate", value: "(2,3)" });

  it("parses '(a, b)' forms and compares componentwise", () => {
    expect(checkAnswer(p, "(2, 3)").correct).toBe(true);
    expect(checkAnswer(p, "2,3").correct).toBe(true);
    expect(checkAnswer(p, "(2.0, 3.0)").correct).toBe(true);
    expect(checkAnswer(p, "(3,2)").correct).toBe(false);
  });

  it("applies optional tolerance componentwise", () => {
    const tol = problem("c2", 3, "neutral", 1, {
      kind: "coordinate",
      value: "(2,3)",
      tolerance: 0.1,
    });
    expect(checkAnswer(tol, "(2.05, 2.95)").correct).toBe(true);
    expect(checkAnswer(tol, "(2.5, 3)").correct).toBe(false);
  });
});

describe("checkAnswer — choice", () => {
  const p = problem("ch1", 3, "neutral", 1, { kind: "choice", value: "B" });

  it("is an exact match (whitespace-trimmed only)", () => {
    expect(checkAnswer(p, "B").correct).toBe(true);
    expect(checkAnswer(p, " B ").correct).toBe(true);
    expect(checkAnswer(p, "b").correct).toBe(false);
    expect(checkAnswer(p, "A").correct).toBe(false);
  });
});

describe("checkAnswer — misconception classification", () => {
  it("matches the normalized wrong response against normalized map keys", () => {
    const p = problem(
      "m1",
      3,
      "neutral",
      1,
      { kind: "numeric", value: "5" },
      { "-5": "sign-error-addition" },
    );
    expect(checkAnswer(p, "x=-5")).toEqual({
      correct: false,
      misconceptionTag: "sign-error-addition",
    });
    expect(checkAnswer(p, "-5.0").misconceptionTag).toBe("sign-error-addition");
  });

  it("NEVER guesses: unmatched wrong answers carry no tag", () => {
    const p = problem(
      "m2",
      3,
      "neutral",
      1,
      { kind: "numeric", value: "5" },
      { "-5": "sign-error-addition" },
    );
    expect(checkAnswer(p, "7")).toEqual({ correct: false });
    const noMap = problem("m3", 3, "neutral", 1, { kind: "numeric", value: "5" });
    expect(checkAnswer(noMap, "-5")).toEqual({ correct: false });
  });
});
