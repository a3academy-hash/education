// Pure balance-scale equation reduction (mr-gates condition 8). No React.
// Models a linear equation a*x + b = c*x + d as tiles on two pans, the
// both-sides operations that reduce it, and the tilt state for free-tile mode.

export interface Equation {
  /** left side: coefficient of x and constant. */
  leftX: number;
  leftC: number;
  /** right side: coefficient of x and constant. */
  rightX: number;
  rightC: number;
}

export type Operation =
  | { kind: "subtractConst"; amount: number } // subtract a constant from both sides
  | { kind: "addConst"; amount: number }
  | { kind: "subtractX"; amount: number } // subtract n·x from both sides
  | { kind: "divide"; by: number }; // divide both sides by a coefficient

/** Apply a both-sides operation, returning the reduced equation. */
export function applyOperation(eq: Equation, op: Operation): Equation {
  switch (op.kind) {
    case "subtractConst":
      return { ...eq, leftC: eq.leftC - op.amount, rightC: eq.rightC - op.amount };
    case "addConst":
      return { ...eq, leftC: eq.leftC + op.amount, rightC: eq.rightC + op.amount };
    case "subtractX":
      return { ...eq, leftX: eq.leftX - op.amount, rightX: eq.rightX - op.amount };
    case "divide": {
      if (op.by === 0) return eq;
      return {
        leftX: eq.leftX / op.by,
        leftC: eq.leftC / op.by,
        rightX: eq.rightX / op.by,
        rightC: eq.rightC / op.by,
      };
    }
  }
}

/** True once the equation reads x = value (isolated, unit coefficient). */
export function isSolved(eq: Equation): boolean {
  const onlyXLeft = eq.leftX === 1 && eq.rightX === 0;
  const onlyConstLeft = eq.leftC === 0;
  return onlyXLeft && onlyConstLeft;
}

/** Numeric solution if the equation is linear and well-posed, else null. */
export function solution(eq: Equation): number | null {
  const a = eq.leftX - eq.rightX;
  const b = eq.rightC - eq.leftC;
  if (a === 0) return null;
  return b / a;
}

/** Typographic-minus formatting for a term list on one side. */
function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(Math.abs(n));
  return String(Math.abs(Number(n.toFixed(2))));
}

function sideToString(xCoef: number, c: number): string {
  const parts: string[] = [];
  if (xCoef !== 0) {
    const coef = xCoef === 1 ? "" : xCoef === -1 ? "−" : `${fmtNum(xCoef)}`;
    parts.push(`${xCoef < 0 && xCoef !== -1 ? "−" : ""}${coef}x`);
  }
  if (c !== 0 || parts.length === 0) {
    if (parts.length === 0) {
      parts.push(`${c < 0 ? "−" : ""}${fmtNum(c)}`);
    } else {
      parts.push(`${c < 0 ? "− " : "+ "}${fmtNum(c)}`);
    }
  }
  return parts.join(" ");
}

/** Mono equation readout, e.g. "3x + 4 = 19". Uses real minus signs. */
export function equationString(eq: Equation): string {
  return `${sideToString(eq.leftX, eq.leftC)} = ${sideToString(eq.rightX, eq.rightC)}`;
}

/**
 * Suggest the next both-sides operations from the current equation state —
 * these drive the secondary action buttons beneath the scale.
 */
export function suggestOperations(eq: Equation): { op: Operation; label: string }[] {
  const out: { op: Operation; label: string }[] = [];
  // 1) clear x from whichever side has the smaller x-coefficient
  if (eq.rightX !== 0 && eq.leftX !== 0) {
    const amount = Math.min(eq.leftX, eq.rightX);
    if (amount > 0) {
      out.push({
        op: { kind: "subtractX", amount },
        label: `− ${amount === 1 ? "" : amount}x from both sides`,
      });
    }
  }
  // 2) clear the constant attached to the x-side
  if (eq.leftX !== 0 && eq.leftC !== 0) {
    if (eq.leftC > 0) {
      out.push({
        op: { kind: "subtractConst", amount: eq.leftC },
        label: `− ${eq.leftC} from both sides`,
      });
    } else {
      out.push({
        op: { kind: "addConst", amount: -eq.leftC },
        label: `+ ${-eq.leftC} to both sides`,
      });
    }
  }
  // 3) divide to isolate x
  if (eq.leftX > 1 && eq.leftC === 0) {
    out.push({
      op: { kind: "divide", by: eq.leftX },
      label: `÷ ${eq.leftX} on both sides`,
    });
  }
  return out;
}

// ---- free-tile (manual) mode: tilt when a single side is altered ----

export type Tilt = "balanced" | "left-heavy" | "right-heavy";

/** Compare the two pans' total "weight" at a probe x to decide tilt. */
export function tiltFor(eq: Equation, probeX = 1): Tilt {
  const left = eq.leftX * probeX + eq.leftC;
  const right = eq.rightX * probeX + eq.rightC;
  if (left === right) return "balanced";
  return left > right ? "left-heavy" : "right-heavy";
}

/** Beam rotation in degrees (heavy side dips). Clamped to ±4° per §C. */
export function tiltAngle(tilt: Tilt): number {
  if (tilt === "left-heavy") return 4;
  if (tilt === "right-heavy") return -4;
  return 0;
}
