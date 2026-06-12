import { describe, expect, it } from "vitest";
import {
  assembleCorrect,
  assembleIncorrectTagged,
  assembleIncorrectUntagged,
  extractPayload,
  firmUpStatement,
  GENERIC_RECHECK,
} from "./why";
import type { AnswerSpec, ProblemTemplate, WorkedExample } from "@/types";

interface ProblemOpts {
  prompt?: string;
  answer?: AnswerSpec;
  hints?: string[];
  misconceptionMap?: Record<string, string>;
}

const problem = (opts: ProblemOpts = {}): ProblemTemplate => ({
  id: "P-1",
  version: 1,
  skillId: "ALG-X",
  phase: 1,
  sport: "baseball",
  prompt: opts.prompt ?? "What is 35% of 80?",
  visual: null,
  answer: opts.answer ?? { kind: "numeric", value: "28" },
  misconceptionMap: opts.misconceptionMap,
  hints: opts.hints ?? [],
  difficulty: 1,
});

const workedExamples: WorkedExample[] = [
  {
    id: "we-1",
    title: "Finding a Percent of a Number",
    steps: [
      { prompt: "Rewrite the percent.", reveal: "35% is 0.35." },
      { prompt: "Multiply.", reveal: "0.35 × 80 = 28." },
    ],
  },
];

// The raw audit-register description that must NEVER reach a student field.
const RAW_DESCRIPTION = "fails to form the required pass through the origin";

// ---- R5 invariant helper ----------------------------------------------------
// Every numeral-bearing token in an assembled string must occur in the served
// corpus, EXCEPT tokens inside an attributed clause beginning
// `From the worked example "{title}":` or the R4.2 form. State A has NO exemption.
const NUMERAL = /[0-9²³¹⁰-⁹⁺-⁾]/u;

function attributionPrefix(s: string): boolean {
  return (
    /From the worked example "[^"]*":/u.test(s) ||
    /Revisit the worked example "[^"]*" — last step:/u.test(s)
  );
}

function foreignNumeralTokens(assembled: string, corpus: string, allowAttribution: boolean): string[] {
  if (allowAttribution && attributionPrefix(assembled)) return [];
  const foreign: string[] = [];
  for (const token of assembled.split(/\s+/u)) {
    const cleaned = token.replace(/[.,:;?!"'()]+$/u, "").replace(/^[.,:;?!"'()]+/u, "");
    if (cleaned.length === 0) continue;
    if (NUMERAL.test(cleaned) && !corpus.includes(cleaned)) foreign.push(cleaned);
  }
  return foreign;
}

// =============================================================================
describe("extractPayload — anchored, gated, deterministic", () => {
  it("lifts a solve-for-x equation, trailing punctuation trimmed", () => {
    expect(extractPayload("Solve for x: 4/10 = x/5.")).toBe("4/10 = x/5");
  });

  it("prefers the longer 'Solve for x:' stem over 'Solve '", () => {
    expect(extractPayload("Solve for x: 6/9 = 10/x.")).toBe("6/9 = 10/x");
  });

  it("truncates at the first '. ' boundary (decimals survive — no following space)", () => {
    expect(extractPayload("Simplify 0.25x + 0.5x. Type with no spaces.")).toBe("0.25x + 0.5x");
  });

  it("passes unicode superscripts through verbatim", () => {
    expect(extractPayload("Evaluate 2⁶: a power of two.")).toBe("2⁶");
    expect(extractPayload("Write 5³.")).toBe("5³");
  });

  it("rejects word-problem payloads (alphabetic word > 3 letters)", () => {
    expect(extractPayload("Find the area of the left piece, with sides 4 and x.")).toBeNull();
    expect(extractPayload("Solve the problem about run differential.")).toBeNull();
  });

  it("returns null when there is no recognized stem", () => {
    expect(extractPayload("What is 35% of 80?")).toBeNull();
    expect(extractPayload("Your team trails by 1 run; what is the differential?")).toBeNull();
  });

  it("rejects payloads with no digit or variable, or longer than 40 chars", () => {
    expect(extractPayload("Graph it.")).toBeNull();
    expect(extractPayload(`Evaluate ${"1+".repeat(25)}1 here.`)).toBeNull();
  });
});

// =============================================================================
describe("assembleCorrect — STATE A echoes the student's actual problem + answer", () => {
  it("solve-stem: 'You solved {payload}: x = {echo}.'", () => {
    const p = problem({ prompt: "Solve for x: 2x = 10.", answer: { kind: "numeric", value: "5" } });
    const w = assembleCorrect(p, workedExamples, "5");
    expect(w.whatRight).toBe("You solved 2x = 10: x = 5.");
  });

  it("other stem with payload: '{payload} = {echo}. Correct.'", () => {
    const p = problem({ prompt: "Evaluate 2⁶.", answer: { kind: "numeric", value: "64" } });
    const w = assembleCorrect(p, workedExamples, "64");
    expect(w.whatRight).toBe("2⁶ = 64. Correct.");
  });

  it("choice item: 'Correct — {echo}.'", () => {
    const p = problem({ prompt: "Which is larger?", answer: { kind: "choice", value: "B" } });
    const w = assembleCorrect(p, [], "B");
    expect(w.whatRight).toBe("Correct — B.");
  });

  it("word problem (no payload): 'Correct — {echo} is the answer.'", () => {
    const p = problem({ prompt: "Your team trails by 1, then scores 2. Differential?" });
    const w = assembleCorrect(p, [], "1");
    expect(w.whatRight).toBe("Correct — 1 is the answer.");
  });

  it("uses the answer display form when the response is empty (defensive)", () => {
    const p = problem({ prompt: "Evaluate 2⁶.", answer: { kind: "numeric", value: "64" } });
    const w = assembleCorrect(p, [], "");
    expect(w.whatRight).toBe("2⁶ = 64. Correct.");
  });

  it("joins a numeric-set answer for the echo fallback", () => {
    const p = problem({
      prompt: "Solve x^2 = 9.",
      answer: { kind: "numeric-set", values: ["3", "-3"] },
    });
    const w = assembleCorrect(p, [], "");
    expect(w.whatRight).toBe("You solved x^2 = 9: x = 3, -3.");
  });

  it("THE BUG: a 2⁶→64 correct shows hints[0], NEVER the foreign 5³/125 reveal", () => {
    const fiveCubedWE: WorkedExample[] = [
      { id: "we", title: "What 5³ Really Means", steps: [{ prompt: "p", reveal: "5³ = 125." }] },
    ];
    const p = problem({
      prompt: "Evaluate 2⁶ as a power.",
      answer: { kind: "numeric", value: "64" },
      hints: ["A power means repeated multiplication."],
    });
    const w = assembleCorrect(p, fiveCubedWE, "64");
    expect(w.whyItWorks).toBe("Why it works: A power means repeated multiplication.");
    expect(w.whyItWorks).not.toContain("125");
    expect(w.whyItWorks).not.toContain("5³");
    expect(JSON.stringify(w)).not.toContain("125");
  });

  it("whyItWorks falls to a numeral-SAFE worked-example title when no hints", () => {
    const safeWE: WorkedExample[] = [
      { id: "we", title: "Parentheses First, Inside Out", steps: [{ prompt: "p", reveal: "= 12." }] },
    ];
    const p = problem({ prompt: "Simplify 2(x + 1).", answer: { kind: "expression", value: "2x+2" } });
    const w = assembleCorrect(p, safeWE, "2x+2");
    expect(w.whyItWorks).toBe('That\'s the "Parentheses First, Inside Out" pattern.');
  });

  it("rejects a numeral-UNSAFE worked-example title (R5 filter) → generic", () => {
    const unsafeWE: WorkedExample[] = [
      { id: "we", title: "What 5³ Really Means", steps: [{ prompt: "p", reveal: "5³ = 125." }] },
    ];
    const p = problem({ prompt: "Evaluate 2⁶.", answer: { kind: "numeric", value: "64" } });
    const w = assembleCorrect(p, unsafeWE, "64");
    expect(w.whyItWorks).toBe("You applied this skill's rule correctly.");
  });

  it("keeps a numeral-safe title when its constant IS in the served item", () => {
    const we: WorkedExample[] = [
      { id: "we", title: "What 5³ Really Means", steps: [{ prompt: "p", reveal: "5³ = 125." }] },
    ];
    const p = problem({ prompt: "Write 5³.", answer: { kind: "numeric", value: "125" } });
    const w = assembleCorrect(p, we, "125");
    expect(w.whyItWorks).toBe('That\'s the "What 5³ Really Means" pattern.');
  });
});

// =============================================================================
describe("assembleIncorrect — STATE B/C echo the response, never leak the answer", () => {
  it("solve-stem: 'x = {echo} doesn't make {payload} true.'", () => {
    const p = problem({ prompt: "Solve for x: 2x = 10.", answer: { kind: "numeric", value: "5" } });
    const w = assembleIncorrectTagged(p, 0, workedExamples, "7");
    expect(w.whatHappened).toBe("Not yet — x = 7 doesn't make 2x = 10 true.");
  });

  it("other stem with payload: '{echo} isn't the value of {payload}.'", () => {
    const p = problem({ prompt: "Evaluate 2⁶.", answer: { kind: "numeric", value: "64" } });
    const w = assembleIncorrectUntagged(p, 0, workedExamples, "12");
    expect(w.whatHappened).toBe("Not yet — 12 isn't the value of 2⁶.");
  });

  it("choice item: '{echo} isn't it. Here's the step to check.'", () => {
    const p = problem({ prompt: "Which is larger?", answer: { kind: "choice", value: "B" } });
    const w = assembleIncorrectTagged(p, 0, workedExamples, "A");
    expect(w.whatHappened).toBe("Not yet — A isn't it. Here's the step to check.");
  });

  it("word problem / empty response: no echo clause, never fabricated", () => {
    const wordProblem = problem({ prompt: "Your team trails by 1; what is the differential?" });
    expect(assembleIncorrectTagged(wordProblem, 0, workedExamples, "9").whatHappened).toBe(
      "Not yet — here's the step to check.",
    );
    const p = problem({ prompt: "Evaluate 2⁶." });
    expect(assembleIncorrectUntagged(p, 0, workedExamples, "").whatHappened).toBe(
      "Not yet — here's the step to check.",
    );
  });

  it("theFix uses the next authored hint", () => {
    const p = problem({ prompt: "Evaluate 2⁶.", hints: ["First hint.", "Second hint."] });
    expect(assembleIncorrectTagged(p, 1, workedExamples, "9").theFix).toBe("Second hint.");
    expect(assembleIncorrectUntagged(p, 9, workedExamples, "9").theFix).toBe("Second hint.");
  });

  it("theFix falls to an ATTRIBUTED worked-example reveal when hints are gone", () => {
    const p = problem({ prompt: "Evaluate 2⁶." });
    const w = assembleIncorrectTagged(p, 0, workedExamples, "9");
    expect(w.theFix).toBe('From the worked example "Finding a Percent of a Number": 0.35 × 80 = 28.');
  });

  it("theFix falls to the generic line when no authored content exists", () => {
    const p = problem({ prompt: "Evaluate 2⁶." });
    expect(assembleIncorrectUntagged(p, 0, [], "9").theFix).toBe(GENERIC_RECHECK);
  });

  it("NO-ANSWER-LEAK: State B/C never state the correct answer value", () => {
    const p = problem({
      prompt: "Solve for x: 2x = 10.",
      answer: { kind: "numeric", value: "5" },
      hints: ["Divide both sides by 2."],
    });
    const b = assembleIncorrectTagged(p, 0, workedExamples, "7");
    const c = assembleIncorrectUntagged(p, 0, workedExamples, "7");
    for (const w of [b, c]) {
      // The wrong echo (7) is fine; the correct value (5) must not be asserted.
      expect(w.whatHappened).not.toMatch(/(^|[^x])\b5\b/u);
      expect(w.theFix).not.toContain("= 5");
    }
  });
});

// =============================================================================
describe("firmUpStatement — Summary, growth-framed, attributed fallbacks", () => {
  it("uses the payload + hint when extractable", () => {
    const p = problem({ prompt: "Solve for x: 2x = 10.", hints: ["Divide both sides by 2."] });
    expect(firmUpStatement(p, workedExamples)).toBe("On 2x = 10: Divide both sides by 2.");
  });

  it("uses a short prompt clause when no payload but prompt ≤ 60 chars", () => {
    const p = problem({ prompt: "What is 35% of 80?", hints: ["Percent means out of 100."] });
    expect(firmUpStatement(p, workedExamples)).toBe('On "What is 35% of 80?": Percent means out of 100.');
  });

  it("drops the prompt clause for a long word problem", () => {
    const longPrompt =
      "Your travel team trails by three runs after the third inning, then plates five runs.";
    const p = problem({ prompt: longPrompt, hints: ["Add the runs scored to the deficit."] });
    expect(firmUpStatement(p, workedExamples)).toBe("Firm up: Add the runs scored to the deficit.");
  });

  it("falls to an ATTRIBUTED worked-example reveal when no hint exists", () => {
    const p = problem({ prompt: "Evaluate 2⁶." });
    expect(firmUpStatement(p, workedExamples)).toBe(
      'Revisit the worked example "Finding a Percent of a Number" — last step: 0.35 × 80 = 28.',
    );
  });

  it("falls to the generic line when there is no authored content at all", () => {
    expect(firmUpStatement(null, [])).toBe(GENERIC_RECHECK);
    expect(firmUpStatement(problem({ prompt: "Evaluate 2⁶." }), [])).toBe(GENERIC_RECHECK);
  });
});

// =============================================================================
describe("R5 INVARIANT — no foreign numerals; different problems → different copy", () => {
  // A representative served corpus spanning the stem families.
  const cases: Array<{ p: ProblemTemplate; response: string; we: WorkedExample[] }> = [
    {
      p: problem({ prompt: "Solve for x: 2x = 10.", answer: { kind: "numeric", value: "5" }, hints: ["Halve it."] }),
      response: "5",
      we: workedExamples,
    },
    {
      p: problem({ prompt: "Evaluate 2⁶.", answer: { kind: "numeric", value: "64" }, hints: ["Multiply twos."] }),
      response: "64",
      we: workedExamples,
    },
    {
      p: problem({ prompt: "Simplify 3a + 2a.", answer: { kind: "expression", value: "5a" } }),
      response: "5a",
      we: workedExamples,
    },
    {
      p: problem({ prompt: "Your team trails by 7; what is the differential?", answer: { kind: "numeric", value: "7" } }),
      response: "7",
      we: workedExamples,
    },
  ];

  it("STATE A carries zero foreign constants (no attribution exemption)", () => {
    for (const { p, response, we } of cases) {
      const corpus = `${p.prompt} ${p.answer.kind === "numeric-set" ? p.answer.values.join(", ") : p.answer.value} ${response} ${p.hints.join(" ")}`;
      const a = assembleCorrect(p, we, response);
      for (const s of [a.whatRight, a.whyItWorks]) {
        expect(foreignNumeralTokens(s ?? "", corpus, false)).toEqual([]);
      }
    }
  });

  it("STATE B/C carry no foreign constants outside an attributed clause", () => {
    for (const { p, response, we } of cases) {
      const corpus = `${p.prompt} ${p.answer.kind === "numeric-set" ? p.answer.values.join(", ") : p.answer.value} ${response} ${p.hints.join(" ")}`;
      const b = assembleIncorrectTagged(p, 9, we, response); // hints exhausted → reveal fallback
      const c = assembleIncorrectUntagged(p, 0, we, response);
      for (const w of [b, c]) {
        expect(foreignNumeralTokens(w.whatHappened ?? "", corpus, true)).toEqual([]);
        expect(foreignNumeralTokens(w.theFix ?? "", corpus, true)).toEqual([]);
      }
    }
  });

  it("PROPERTY: two prompts from the same node give different whatRight strings", () => {
    const we = workedExamples;
    const p1 = problem({ prompt: "Evaluate 2⁶.", answer: { kind: "numeric", value: "64" } });
    const p2 = problem({ prompt: "Evaluate 5³.", answer: { kind: "numeric", value: "125" } });
    const a1 = assembleCorrect(p1, we, "64");
    const a2 = assembleCorrect(p2, we, "125");
    expect(a1.whatRight).not.toBe(a2.whatRight);
    expect(a1.whatRight).toContain("2⁶");
    expect(a2.whatRight).toContain("5³");
  });

  it("PROPERTY: same problem, different responses give different whatHappened", () => {
    const p = problem({ prompt: "Solve for x: 2x = 10.", answer: { kind: "numeric", value: "5" } });
    const w1 = assembleIncorrectTagged(p, 0, workedExamples, "7");
    const w2 = assembleIncorrectTagged(p, 0, workedExamples, "8");
    expect(w1.whatHappened).not.toBe(w2.whatHappened);
  });
});

// =============================================================================
describe("BLOCKER B — the raw registry description never reaches a student field", () => {
  it("no assembler echoes a description-shaped string (no channel for it)", () => {
    const p = problem({ prompt: "Evaluate 2⁶.", misconceptionMap: { wrong: "tag-x" } });
    const tagged = assembleIncorrectTagged(p, 0, workedExamples, "9");
    const correct = assembleCorrect(p, workedExamples, "64");
    const firm = firmUpStatement(p, workedExamples);
    for (const s of [tagged.whatHappened, tagged.theFix, correct.whatRight, correct.whyItWorks, firm]) {
      expect(s).not.toContain(RAW_DESCRIPTION);
    }
  });
});
