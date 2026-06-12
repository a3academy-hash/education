// lib/session-helpers/why.ts — pure assembly of the Practice feedback "why"
// and the Summary "what to firm up" rephrase, from EXISTING v1.6.0 content
// only. NO new per-problem explanation field is invented (spec §B, mr-kahn #1).
// PURE: no React, no IO, no engine traversal, no fetch.
//
// STUDENT-SAFE SOURCES (all already in the graph):
//   problem.prompt + the graded response       — the student's ACTUAL item
//   problem.answer value(s)                     — display form of the answer
//   problem.hints[]                             — progressive, never the answer
//   node.workedExamples[].steps[].reveal        — terminal reveal = the pattern
//
// PHASE 8 / A1 (the "everything is 5³" bug): feedback must echo the STUDENT'S
// actual problem + their answer every time. The worked-example terminal reveal
// is a fixed per-node string ("5³ = 125") and is therefore BANNED from STATE A
// (correct). Where a worked-example reveal is still used as a fallback in the
// incorrect/summary states, it carries MANDATORY attribution so its constants
// are honestly framed as the example's, not the student's item.
//
// BLOCKER B (mr-kahn): misconceptionRegistry[tag].description is AUDIT register
// (expert, sometimes deficit-framed) and must NEVER surface to a student. The
// tutor's `diagnosis` is built verbatim from that description, so it is NOT a
// student-safe source here either. The student-facing copy is therefore sourced
// ONLY from the served item, authored hints, and (attributed) worked examples.

import type { AnswerSpec, ProblemTemplate, WorkedExample } from "@/types";

/** Feedback state, mirroring pee-wee direction §2 (STATE A/B/C). */
export type FeedbackState = "correct" | "incorrect-tag" | "incorrect-no-tag";

/** Non-deficit generic framing — used only when no authored line is available. */
export const GENERIC_RECHECK =
  "Let's recheck this step — compare it against the worked example.";

export interface WhyAssembly {
  /** State A: restated correct result. */
  whatRight?: string;
  /** State A: why the result holds (hint / safe worked-example title / generic). */
  whyItWorks?: string;
  /** State B/C: plain "what happened" line (student-facing, growth-framed). */
  whatHappened?: string;
  /** State B/C: the corrective next step. */
  theFix?: string;
}

// --- R1: deterministic payload extraction (pure, no NLP) ---------------------

/**
 * Anchored exact ordered stem list. LONGER / more-specific stems FIRST so that
 * "Solve for x: " wins over "Solve ". This list was confirmed exhaustive for the
 * authored corpus (data/algebra1-graph.json) against the command-form prompts;
 * stems beyond the original seven were ADDED to cover real authored prompts:
 * "Expand ", "Rewrite ", "Multiply ", "Write ", "Find ". (Word-heavy prompts
 * under these stems are still rejected by the validation gate below and fall
 * through to word-problem mode — the stem list only widens, never weakens.)
 */
const STEMS: readonly string[] = [
  "Solve for x: ",
  "Solve ",
  "Evaluate ",
  "Simplify ",
  "Compute ",
  "Factor ",
  "Graph ",
  "Expand ",
  "Rewrite ",
  "Multiply ",
  "Write ",
  "Find ",
];

/** Stems whose State-A copy reads as an equation solve (x = ...). */
const SOLVE_STEMS: readonly string[] = ["Solve for x: ", "Solve "];

/** First truncation boundary among ". " / "? " / ": " / " — " (or end-of-string). */
function truncateAtBoundary(s: string): string {
  const boundaries = [". ", "? ", ": ", " — "];
  let cut = s.length;
  for (const b of boundaries) {
    const i = s.indexOf(b);
    if (i !== -1 && i < cut) cut = i;
  }
  return s.slice(0, cut);
}

/** Trim trailing punctuation (., ?, :, etc.) and surrounding whitespace. */
function trimTrailingPunct(s: string): string {
  return s.trim().replace(/[.,:;?!\s]+$/u, "");
}

/**
 * "≥1 digit or variable letter": a digit, a math operator/grouping/superscript,
 * or a standalone single letter (a variable like x). Multi-letter words such as
 * "it"/"is" are NOT variables and do not satisfy the gate.
 */
const DIGIT = /[0-9²³¹⁰-⁹]/u;
const MATH_SYMBOL = /[+\-*/^=()<>×·]/u;
const SINGLE_VAR = /(?:^|\s)[a-zA-Z](?:$|\s)/u;
/** An alphabetic WORD (run of ASCII letters) longer than 3 letters. */
const LONG_WORD = /[a-zA-Z]{4,}/u;

/**
 * Extract the math payload of a prompt, or null if none can be safely lifted.
 * Anchored to STEMS, truncated at the first clause boundary, then GATED so only
 * short, symbol-bearing payloads pass (word problems → null → word-problem mode).
 * Unicode superscripts (²³⁶…) ride through verbatim — never re-rendered.
 */
export function extractPayload(prompt: string): string | null {
  const stem = STEMS.find((st) => prompt.startsWith(st));
  if (!stem) return null;
  const rest = prompt.slice(stem.length);
  const payload = trimTrailingPunct(truncateAtBoundary(rest));
  if (payload.length === 0) return null;
  // Validation gate: keep ONLY short, symbol-bearing payloads.
  if (payload.length > 40) return null;
  if (LONG_WORD.test(payload)) return null;
  const hasDigitOrVar =
    DIGIT.test(payload) || MATH_SYMBOL.test(payload) || SINGLE_VAR.test(payload);
  if (!hasDigitOrVar) return null;
  return payload;
}

function isSolveStem(prompt: string): boolean {
  return SOLVE_STEMS.some((st) => prompt.startsWith(st));
}

// --- answer / worked-example display helpers ---------------------------------

/** Display form of an answer spec (R0): value, or values joined for a set. */
function answerDisplay(answer: AnswerSpec): string {
  if (answer.kind === "numeric-set") return answer.values.join(", ");
  return answer.value;
}

/** Terminal reveal step of the node's first worked example (index 0). */
function terminalReveal(workedExamples: WorkedExample[]): { title: string; reveal: string } | null {
  const we = workedExamples[0];
  if (!we || we.steps.length === 0) return null;
  const last = we.steps[we.steps.length - 1];
  return { title: we.title, reveal: last.reveal };
}

/** The most-specific authored hint not yet shown (clamped to the last hint). */
function nextAuthoredHint(problem: ProblemTemplate, hintsAlreadyShown: number): string | null {
  if (problem.hints.length === 0) return null;
  return problem.hints[Math.min(hintsAlreadyShown, problem.hints.length - 1)];
}

/** Tokens (whitespace-separated) that carry a digit or a unicode superscript. */
const NUMERAL_TOKEN = /[0-9²³¹⁰-⁹⁺-⁾]/u;

/**
 * R5 numeral filter for a worked-example TITLE: numeral-safe iff every token in
 * it that contains a digit or superscript also appears in `corpus` (the served
 * prompt + answer + response). Symbol-free titles are always safe.
 */
function titleNumeralSafe(title: string, corpus: string): boolean {
  for (const token of title.split(/\s+/u)) {
    if (token.length === 0) continue;
    if (NUMERAL_TOKEN.test(token) && !corpus.includes(token)) return false;
  }
  return true;
}

// --- R2: STATE A (CORRECT) ---------------------------------------------------

/**
 * STATE A (CORRECT): echo the student's ACTUAL answer (it passed the
 * authoritative checker) against their ACTUAL problem. The worked-example
 * terminal reveal is BANNED here (that is the "everything is 5³" bug); whyItWorks
 * comes from hints[0], else a numeral-SAFE worked-example title, else a generic.
 */
export function assembleCorrect(
  problem: ProblemTemplate,
  workedExamples: WorkedExample[],
  response: string,
): WhyAssembly {
  const echo = response.trim() !== "" ? response.trim() : answerDisplay(problem.answer);
  const payload = extractPayload(problem.prompt);

  let whatRight: string;
  if (payload !== null && isSolveStem(problem.prompt)) {
    whatRight = `You solved ${payload}: x = ${echo}.`;
  } else if (payload !== null) {
    whatRight = `${payload} = ${echo}. Correct.`;
  } else if (problem.answer.kind === "choice") {
    whatRight = `Correct — ${echo}.`;
  } else {
    whatRight = `Correct — ${echo} is the answer.`;
  }

  // whyItWorks precedence: (1) hints[0]; (2) numeral-safe worked-example title;
  // (3) generic. The reveal string is NEVER used in State A.
  const hint = problem.hints[0];
  let whyItWorks: string;
  if (hint && hint.trim() !== "") {
    whyItWorks = `Why it works: ${hint.trim()}`;
  } else {
    const we = terminalReveal(workedExamples);
    const corpus = `${problem.prompt} ${answerDisplay(problem.answer)} ${echo}`;
    if (we && titleNumeralSafe(we.title, corpus)) {
      whyItWorks = `That's the "${we.title}" pattern.`;
    } else {
      whyItWorks = "You applied this skill's rule correctly.";
    }
  }

  return { whatRight, whyItWorks };
}

// --- R3: STATE B (tagged) + STATE C (untagged) -------------------------------

/** Shared "what happened" line for incorrect states — echoes the student's answer. */
function whatHappenedLine(problem: ProblemTemplate, response: string): string {
  const echo = response.trim();
  const payload = extractPayload(problem.prompt);
  if (echo === "") return "Not yet — here's the step to check.";
  if (payload !== null && isSolveStem(problem.prompt)) {
    return `Not yet — x = ${echo} doesn't make ${payload} true.`;
  }
  if (payload !== null) {
    return `Not yet — ${echo} isn't the value of ${payload}.`;
  }
  if (problem.answer.kind === "choice") {
    return `Not yet — ${echo} isn't it. Here's the step to check.`;
  }
  return "Not yet — here's the step to check.";
}

/**
 * Shared corrective step for incorrect states. NEVER states the correct answer
 * value: (1) next authored hint; (2) ATTRIBUTED worked-example reveal — the
 * attribution is what keeps the example's constants honest; (3) generic.
 */
function theFixStep(problem: ProblemTemplate, hintsAlreadyShown: number, workedExamples: WorkedExample[]): string {
  const hint = nextAuthoredHint(problem, hintsAlreadyShown);
  if (hint && hint.trim() !== "") return hint.trim();
  const we = terminalReveal(workedExamples);
  if (we) return `From the worked example "${we.title}": ${we.reveal}`;
  return GENERIC_RECHECK;
}

/**
 * STATE B (INCORRECT + matched tag): student-facing copy from the served item,
 * authored hints, and (attributed) worked examples ONLY — never the raw registry
 * description or the tutor diagnosis. The tag drives only the tutor panel, which
 * is added separately at the screen; it never alters this surface.
 */
export function assembleIncorrectTagged(
  problem: ProblemTemplate,
  hintsAlreadyShown: number,
  workedExamples: WorkedExample[],
  response: string,
): WhyAssembly {
  return {
    whatHappened: whatHappenedLine(problem, response),
    theFix: theFixStep(problem, hintsAlreadyShown, workedExamples),
  };
}

/**
 * STATE C (INCORRECT, no tag): identical structure to State B (never fabricate a
 * misconception). No tutor panel (honesty — spec §B).
 */
export function assembleIncorrectUntagged(
  problem: ProblemTemplate,
  hintsAlreadyShown: number,
  workedExamples: WorkedExample[],
  response: string,
): WhyAssembly {
  return {
    whatHappened: whatHappenedLine(problem, response),
    theFix: theFixStep(problem, hintsAlreadyShown, workedExamples),
  };
}

// --- R4: Summary "WHAT TO FIRM UP" -------------------------------------------

/**
 * Summary "WHAT TO FIRM UP" rephrase. The Summary has the problem + worked
 * examples but NO single response, so it leans on the served prompt + authored
 * hint, then an ATTRIBUTED worked-example reveal, then a generic line. Never the
 * raw registry description / tutor diagnosis.
 */
export function firmUpStatement(
  problem: ProblemTemplate | null,
  workedExamples: WorkedExample[],
): string {
  if (problem) {
    const hint = nextAuthoredHint(problem, 0);
    if (hint && hint.trim() !== "") {
      const payload = extractPayload(problem.prompt);
      // R4.1 appends a terminal period; strip one already on the hint to avoid "..".
      if (payload !== null) return `On ${payload}: ${hint.trim().replace(/\.$/u, "")}.`;
      if (problem.prompt.length <= 60) return `On "${problem.prompt}": ${hint.trim()}`;
      return `Firm up: ${hint.trim()}`;
    }
  }
  const we = terminalReveal(workedExamples);
  if (we) return `Revisit the worked example "${we.title}" — last step: ${we.reveal}`;
  return GENERIC_RECHECK;
}
