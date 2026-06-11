// BalanceScale (§C, built LAST per §F-8). Flat geometric, zero skeuomorphism.
// Solve via a both-sides action row generated from equation state. Apply →
// tiles fade 250ms, mono equation readout above updates. Free-tile mode: one-
// side removal tilts the beam ≤4° toward the heavy side + a single
// informational line; resets when corrected. Keyboard: action buttons Tab+
// Enter; free tiles are a focusable group, Enter removes.

"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import {
  applyOperation,
  equationString,
  isSolved,
  solution,
  suggestOperations,
  tiltAngle,
  tiltFor,
  type Equation,
  type Operation,
} from "./balance-scale-math";

export interface BalanceScaleProps {
  /** Initial equation, e.g. 3x + 4 = 19. */
  initial: Equation;
  /** Prompt framing (sport context lives here only). */
  prompt?: string;
  /** Enable manual free-tile removal (tilt teaching). Default false. */
  freeTileMode?: boolean;
}

interface Tile {
  id: string;
  kind: "x" | "unit";
}

function buildTiles(side: "left" | "right", xCount: number, unitCount: number): Tile[] {
  const tiles: Tile[] = [];
  const xn = Math.max(0, Math.round(xCount));
  const un = Math.max(0, Math.round(unitCount));
  for (let i = 0; i < xn; i++) tiles.push({ id: `${side}-x-${i}`, kind: "x" });
  for (let i = 0; i < un; i++) tiles.push({ id: `${side}-u-${i}`, kind: "unit" });
  return tiles;
}

export function BalanceScale({
  initial,
  prompt,
  freeTileMode = false,
}: BalanceScaleProps) {
  const [eq, setEq] = useState<Equation>(initial);
  // free-tile overrides: tiles manually removed from one side only.
  const [removed, setRemoved] = useState<{ leftX: number; leftC: number; rightX: number; rightC: number }>(
    { leftX: 0, leftC: 0, rightX: 0, rightC: 0 },
  );
  const liveId = useId();

  const effective: Equation = useMemo(
    () => ({
      leftX: eq.leftX - removed.leftX,
      leftC: eq.leftC - removed.leftC,
      rightX: eq.rightX - removed.rightX,
      rightC: eq.rightC - removed.rightC,
    }),
    [eq, removed],
  );

  const ops = useMemo(() => suggestOperations(eq), [eq]);
  const solved = isSolved(eq);
  const sol = solution(eq);
  const unbalanced =
    removed.leftX !== removed.rightX || removed.leftC !== removed.rightC;
  const tilt = unbalanced ? tiltFor(effective) : "balanced";
  const angle = tiltAngle(tilt);

  const apply = (op: Operation) => {
    setRemoved({ leftX: 0, leftC: 0, rightX: 0, rightC: 0 });
    setEq((cur) => applyOperation(cur, op));
  };

  const removeTile = (side: "left" | "right", kind: "x" | "unit") => {
    if (!freeTileMode) return;
    setRemoved((cur) => {
      const next = { ...cur };
      if (side === "left" && kind === "x") next.leftX += 1;
      else if (side === "left") next.leftC += 1;
      else if (side === "right" && kind === "x") next.rightX += 1;
      else next.rightC += 1;
      return next;
    });
  };

  const resetTiles = () => setRemoved({ leftX: 0, leftC: 0, rightX: 0, rightC: 0 });

  const leftTiles = buildTiles("left", effective.leftX, effective.leftC);
  const rightTiles = buildTiles("right", effective.rightX, effective.rightC);

  return (
    <div className="flex flex-col gap-4">
      {prompt && <p className="text-[14px] leading-[1.55] text-ink-700">{prompt}</p>}

      {/* fixed-height mono equation readout */}
      <div className="flex h-7 items-center font-mono text-[16px] text-ink">
        {equationString(eq)}
      </div>

      {/* beam + pans (flat geometric) */}
      <svg viewBox="0 0 360 150" width="100%" style={{ maxWidth: 360 }} aria-hidden>
        {/* fulcrum triangle (outlined) */}
        <path
          d="M180 118 L168 140 L192 140 Z"
          fill="none"
          stroke="var(--color-ink-700)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <line
          x1={120}
          y1={140}
          x2={240}
          y2={140}
          stroke="var(--color-ink-700)"
          strokeWidth={1.5}
        />
        {/* beam (rotates by tilt angle) */}
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: "180px 118px",
            transition: "transform 250ms var(--ease-calm)",
          }}
        >
          <line x1={60} y1={118} x2={300} y2={118} stroke="var(--color-ink-700)" strokeWidth={2} />
          <line x1={60} y1={118} x2={60} y2={104} stroke="var(--color-ink-700)" strokeWidth={1.5} />
          <line x1={300} y1={118} x2={300} y2={104} stroke="var(--color-ink-700)" strokeWidth={1.5} />
          <rect x={20} y={90} width={80} height={14} rx={4} fill="var(--color-inset)" stroke="var(--color-border-strong)" />
          <rect x={260} y={90} width={80} height={14} rx={4} fill="var(--color-inset)" stroke="var(--color-border-strong)" />
        </g>
      </svg>

      {/* tile rows (HTML for accessible interaction) */}
      <div className="grid grid-cols-2 gap-4">
        <Pan
          label="Left side"
          tiles={leftTiles}
          interactive={freeTileMode}
          onRemove={(kind) => removeTile("left", kind)}
        />
        <Pan
          label="Right side"
          tiles={rightTiles}
          interactive={freeTileMode}
          onRemove={(kind) => removeTile("right", kind)}
        />
      </div>

      {/* unbalanced information line (information, not punishment) */}
      {unbalanced && (
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-track bg-inset px-[14px] py-3">
          <p className="text-[13px] leading-[1.5] text-ink-700">
            The sides are not equal anymore. Whatever you do to one side, do to the other.
          </p>
          <Button variant="quiet" size="sm" onClick={resetTiles}>
            Reset
          </Button>
        </div>
      )}

      {/* both-sides action row */}
      {!solved && !freeTileMode && (
        <div className="flex flex-wrap gap-2">
          {ops.map((o, i) => (
            <Button key={i} variant="secondary" size="sm" onClick={() => apply(o.op)}>
              {o.label}
            </Button>
          ))}
        </div>
      )}

      {/* solved chip */}
      {solved && sol !== null && (
        <div className="flex items-center gap-2 rounded-[10px] border border-success-border bg-success-bg px-[14px] py-3">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--color-status-mastered)" }}
          />
          <span className="font-mono text-[14px] text-ink">{`x = ${sol}`}</span>
        </div>
      )}

      <span id={liveId} className="sr-only" aria-live="polite">
        {`Equation: ${equationString(eq)}.`}
        {unbalanced ? " The sides are not equal." : ""}
        {solved && sol !== null ? ` Solved: x equals ${sol}.` : ""}
      </span>
    </div>
  );
}

function Pan({
  label,
  tiles,
  interactive,
  onRemove,
}: {
  label: string;
  tiles: Tile[];
  interactive: boolean;
  onRemove: (kind: "x" | "unit") => void;
}) {
  return (
    <div
      role={interactive ? "group" : undefined}
      aria-label={interactive ? `${label} — remove tiles` : label}
      className="flex min-h-[44px] flex-wrap content-start gap-1.5 rounded-[10px] border border-border-strong bg-inset p-2"
    >
      {tiles.length === 0 && <span className="text-[12px] text-ink-400">empty</span>}
      {tiles.map((t) =>
        interactive ? (
          <button
            key={t.id}
            type="button"
            onClick={() => onRemove(t.kind)}
            className={tileClass(t.kind, true)}
            aria-label={`Remove ${t.kind === "x" ? "x" : "1"} tile`}
          >
            {t.kind === "x" ? "x" : "1"}
          </button>
        ) : (
          <span key={t.id} className={tileClass(t.kind, false)} aria-hidden>
            {t.kind === "x" ? "x" : "1"}
          </span>
        ),
      )}
    </div>
  );
}

function tileClass(kind: "x" | "unit", interactive: boolean): string {
  const base =
    "fade-in inline-flex h-7 w-7 items-center justify-center rounded-[7px] font-mono text-[13px]";
  const tone =
    kind === "x"
      ? "bg-chip text-accent"
      : "bg-inset text-ink border border-border";
  const focus = interactive
    ? "transition-colors duration-150 hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    : "";
  return `${base} ${tone} ${focus}`;
}
