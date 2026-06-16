// lib/item-certification — the item-certification pipeline (overhaul Phase 2;
// CLAUDE §9 "author once, render many" — the single most likely fatal flaw;
// DIAGNOSTIC §5/§9). PURE + framework-neutral; runs in validate-graph (the CI
// gate) and over the bank.
//
// HONEST SCOPE (codexreview-bounded): items carry NO machine-readable derivation
// metadata, so this does NOT re-derive answers from natural-language prompts. It
// verifies what IS mechanically checkable — WELL-FORMEDNESS (the stated answer
// parses under its kind), ROUND-TRIP (the engine's own checker confirms the stated
// answer is correct against itself), and CHOICE-INTEGRITY — and FLAGS everything
// else for human-QA. It never fabricates a verdict or a tag. True symbolic
// re-derivation needs an authored derivationSpec (future).

import { checkAnswer } from "../problem-engine";
import type { ProblemTemplate, AnswerSpec } from "@/types";

export type CalculatorFlag = "no_calculator" | "calculator_allowed" | "calc_neutral_arithmetic_light";

export interface CertifyResult {
  certified: boolean;
  /** Reasons it was FLAGGED (empty when certified). Drives the human-QA queue. */
  flags: string[];
}

/**
 * The canonical response string for an item's OWN stated answer (round-trip input
 * + dedup key). numeric-set is ORDER-INSENSITIVE in the engine (it sorts before
 * comparing), so we canonicalize the order here too (codexreview numeric-set-dup-
 * order) — reversed-order sets produce the same key.
 */
export function answerAsResponse(answer: AnswerSpec): string {
  if (answer.kind === "numeric-set") return [...answer.values].sort().join(", ");
  return answer.value;
}

/**
 * certify(item) — mechanically verifiable gates only:
 *  1. well-formedness: the stated answer is non-empty and parses under its kind
 *     (the round-trip below proves parseability — an unparseable answer fails it).
 *  2. round-trip: checkAnswer(item, item.answer) === correct (the engine's own
 *     checker confirms the authored answer; catches malformed/incorrectly-typed
 *     answers and answers the checker cannot accept).
 *  3. choice-integrity: choice items have choices[], answer∈choices, ≥1 distractor,
 *     no duplicate choices.
 * Anything not confirmable here is a FLAG (human-QA), never a silent pass.
 */
export function certify(item: ProblemTemplate): CertifyResult {
  const flags: string[] = [];
  const a = item.answer;

  // (1) well-formedness FIRST — validate the answer SHAPE before computing the
  // round-trip response, so a malformed item flags instead of throwing.
  if (a.kind === "numeric-set") {
    if (!Array.isArray(a.values) || a.values.length === 0 || a.values.some((v) => typeof v !== "string" || v.trim() === "")) {
      flags.push("numeric-set answer empty, non-array, or contains a blank value");
    }
  } else if (typeof a.value !== "string" || a.value.trim() === "") {
    flags.push(`${a.kind} answer is empty`);
  }
  // (2) round-trip — only once the shape is well-formed (answerAsResponse is safe here).
  if (flags.length === 0) {
    let roundTrip = false;
    try {
      roundTrip = checkAnswer(item, answerAsResponse(a)).correct;
    } catch {
      roundTrip = false;
    }
    if (!roundTrip) {
      flags.push("round-trip failed: the engine checker does not confirm the stated answer (malformed or untyped answer)");
    }
  }

  // (3) choice-integrity
  if (a.kind === "choice") {
    const choices = item.choices ?? [];
    if (choices.length < 2) flags.push("choice item has fewer than 2 choices");
    if (!choices.includes(a.value)) flags.push("choice answer is not among the choices");
    if (new Set(choices).size !== choices.length) flags.push("choice item has duplicate choices");
    if (choices.filter((c) => c !== a.value).length < 1) flags.push("choice item has no distractor");
  } else if (item.choices && item.choices.length > 0) {
    flags.push(`non-choice item (${a.kind}) carries a choices[] array`);
  }

  return { certified: flags.length === 0, flags };
}

/**
 * Mask every number (int/decimal/fraction/negative) in a prompt to '#', normalize
 * ws. Normalizes the Unicode minus (− U+2212, used throughout the bank) to ASCII
 * '-' FIRST so negatives mask uniformly (codexreview unicode-minus-mask).
 */
export function maskNumbers(prompt: string): string {
  return prompt
    .replace(/−/g, "-")
    .replace(/-?\d+(?:\.\d+)?(?:\/\d+)?/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * equivalenceClassOf — a STRUCTURAL family signature (NOT a calibrated psychometric
 * class; calibration refines §9.5 later). Discriminators beyond the masked skeleton
 * (answer.kind + difficulty) keep same-skeleton-different-concept items in distinct
 * classes (codexreview equivalence-too-coarse).
 */
export function equivalenceClassOf(item: ProblemTemplate): string {
  return `${item.skillId}|${item.answer.kind}|d${item.difficulty}|${maskNumbers(item.prompt)}`;
}

/**
 * calculatorFlagFor — explicit rule (codexreview auto-tagging-premise): a numeric
 * answer is a computation the student should perform (no_calculator); all other
 * kinds are reasoning/structured items kept arithmetic-light (calc_neutral). The
 * calculator_allowed flag is reserved for explicitly-authored modeling items (none
 * auto-assigned). Deterministic; never fabricated per-item.
 */
export function calculatorFlagFor(item: ProblemTemplate): CalculatorFlag {
  return item.answer.kind === "numeric" ? "no_calculator" : "calc_neutral_arithmetic_light";
}

export interface DuplicateGroup {
  /** node|phase|sport|prompt|answer key — a TRUE within-bucket duplicate group. */
  key: string;
  ids: string[];
}

/**
 * detectDuplicates — TRUE within-bucket exact duplicates only (same node+phase+
 * sport+prompt+answer). Cross-bucket same-prompt items (different phase/sport) are
 * legitimate coverage and are NOT grouped (codexreview exact-dup-collapse). Returns
 * groups with >1 member; the caller reports before any collapse.
 */
export function detectDuplicates(items: ProblemTemplate[]): DuplicateGroup[] {
  const byKey = new Map<string, string[]>();
  for (const it of items) {
    const key = `${it.skillId}|${it.phase}|${it.sport}|${it.prompt.trim().toLowerCase()}|${answerAsResponse(it.answer)}`;
    const arr = byKey.get(key) ?? [];
    arr.push(it.id);
    byKey.set(key, arr);
  }
  const groups: DuplicateGroup[] = [];
  for (const [key, ids] of byKey) if (ids.length > 1) groups.push({ key, ids });
  return groups;
}
