// Pure data-table check logic (mr-gates condition 8). No React imports.
// Models the "informs, never blocks" two-miss reveal behavior.

export type CellStatus = "empty" | "confirmed" | "error" | "revealed";

export interface CellState {
  value: string;
  status: CellStatus;
  /** Count of incorrect submissions so far. */
  misses: number;
}

export function initCell(): CellState {
  return { value: "", status: "empty", misses: 0 };
}

export function normalizeAnswer(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

export function isCorrect(input: string, expected: string): boolean {
  if (expected === "") return false;
  return normalizeAnswer(input) === normalizeAnswer(expected);
}

export interface CheckResult {
  next: CellState;
  /** True when the value is now locked (confirmed or revealed). */
  resolved: boolean;
  /** "correct" | "first-miss" | "second-miss" — for caller messaging. */
  outcome: "correct" | "first-miss" | "second-miss";
}

/**
 * Check a cell submission. Correct → confirmed. Wrong first time → error
 * (caller shows a one-line hint). Wrong second time → reveal the expected
 * value with a needs-review marker and move on. Never blocks progress.
 */
export function checkCell(cell: CellState, expected: string): CheckResult {
  if (isCorrect(cell.value, expected)) {
    return {
      next: { ...cell, status: "confirmed" },
      resolved: true,
      outcome: "correct",
    };
  }
  const misses = cell.misses + 1;
  if (misses >= 2) {
    return {
      next: { value: expected, status: "revealed", misses },
      resolved: true,
      outcome: "second-miss",
    };
  }
  return {
    next: { ...cell, status: "error", misses },
    resolved: false,
    outcome: "first-miss",
  };
}
