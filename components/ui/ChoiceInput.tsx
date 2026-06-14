// ChoiceInput (LB3 / pee-wee W1–W5). A calm, premium multiple-choice primitive:
// a vertical stack of full-width selectable option rows behaving as a real ARIA
// radiogroup (roving tabindex, one tab stop, arrow keys move selection+focus,
// Space/Enter selects). It holds NO parallel selection state — the selected
// choice's EXACT string becomes the parent's `value` (W5), so the existing
// `disabled={!value.trim()}` / `if (!response)` guards work unchanged and the
// chosen string flows through the SAME submission path checkAnswer expects.
//
// Option text renders via MathText (sans host, inherited size/color) — never
// fieldMode math/mono. Stable order: choices[] are rendered in array order
// every render, never shuffled. Reduced-motion-safe (only the 150ms color
// transition; no scale/bounce/entrance). NO auto-submit.

"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { MathText } from "./MathText";

export interface ChoiceInputProps {
  /** Options in stable authored order. Rendered verbatim; never shuffled. */
  choices: string[];
  /** The currently selected choice's exact string ("" = none), parent-owned. */
  value: string;
  /** Called with the selected choice's exact string. */
  onChange: (value: string) => void;
  /** Move initial focus to the group (mirrors Input's autoFocus). */
  autoFocus?: boolean;
  /**
   * Lock the group at the feedback moment (no hover, no keyboard selection,
   * no focus changes). Marked rows are applied by the caller via markedRows.
   */
  disabled?: boolean;
  /**
   * Per-row feedback marks at the feedback moment (practice). Keyed by the
   * exact choice string. Only the chosen + (if missed) correct rows are marked;
   * other distractors stay neutral.
   */
  markedRows?: Record<string, "you-correct" | "you-wrong" | "correct">;
  /** Accessible label for the group; defaults to "Choose one". */
  ariaLabel?: string;
  className?: string;
}

const ROW_BASE =
  "flex w-full items-center gap-2.5 rounded-[10px] border px-4 py-[13px] text-left " +
  "transition-colors duration-150 ease-[cubic-bezier(.2,.7,.2,1)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function ChoiceInput({
  choices,
  value,
  onChange,
  autoFocus = false,
  disabled = false,
  markedRows,
  ariaLabel = "Choose one",
  className = "",
}: ChoiceInputProps) {
  const labelId = useId();
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Roving tabindex: the selected row is the single tab stop; if nothing is
  // selected yet, the first row is. Locked group keeps the chosen row reachable.
  const selectedIndex = choices.indexOf(value);
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0;

  const move = (from: number, delta: number) => {
    if (disabled) return;
    const next = (from + delta + choices.length) % choices.length;
    onChange(choices[next]);
    rowRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        move(index, 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        move(index, -1);
        break;
      case " ":
      case "Enter":
        // Space selects; Enter selects but ALSO lets the surrounding <form>
        // submit (single deliberate flow) — we do not preventDefault Enter so
        // a selected-then-Enter submits, while Space never submits.
        if (e.key === " ") {
          e.preventDefault();
          onChange(choices[index]);
        } else {
          onChange(choices[index]);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div role="radiogroup" aria-labelledby={labelId} className={className}>
      <p id={labelId} className="mb-2 text-[13px] font-medium text-ink-700">
        {ariaLabel}
      </p>
      <div className="flex flex-col gap-2.5">
        {choices.map((choice, index) => {
          const selected = choice === value;
          const mark = markedRows?.[choice];

          // Token states. Default: strong border / surface. Selected (pre-mark):
          // accent border + tint. Feedback marks override visuals on chosen +
          // correct rows only.
          let rowStateClasses = "border-border-strong bg-surface";
          if (mark === "you-correct") {
            rowStateClasses = "border-[var(--color-status-mastered)] bg-success-bg";
          } else if (mark === "you-wrong") {
            rowStateClasses = "border-error-border bg-error-bg-soft";
          } else if (mark === "correct") {
            rowStateClasses = "border-[var(--color-status-mastered)] bg-success-bg";
          } else if (selected) {
            rowStateClasses = "border-accent bg-accent-tint";
          } else if (!disabled) {
            rowStateClasses += " hover:bg-hover";
          }

          return (
            <button
              key={`${index}-${choice}`}
              type="button"
              ref={(el) => {
                rowRefs.current[index] = el;
              }}
              role="radio"
              aria-checked={selected}
              aria-disabled={disabled || undefined}
              tabIndex={disabled ? (selected ? 0 : -1) : index === tabStop ? 0 : -1}
              autoFocus={autoFocus && index === tabStop}
              onClick={() => {
                if (disabled) return;
                onChange(choice);
              }}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`${ROW_BASE} ${rowStateClasses}`}
            >
              <SelectionIndicator selected={selected} mark={mark} />
              <span className="flex-1 text-[15px] leading-[1.5] text-ink">
                <MathText>{choice}</MathText>
              </span>
              {mark === "you-correct" && (
                <span className="text-[12.5px] text-ink-500">you</span>
              )}
              {mark === "you-wrong" && (
                <span className="text-[12.5px] text-ink-500">you</span>
              )}
              {mark === "correct" && (
                <span className="text-[12.5px] text-ink-500">correct</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 18px leading indicator. Colorblind-safe: a filled dot + border, never color
// alone. Selected fills accent; the correct mark fills mastered-green; the
// wrong mark is a hollow/dashed error ring.
function SelectionIndicator({
  selected,
  mark,
}: {
  selected: boolean;
  mark?: "you-correct" | "you-wrong" | "correct";
}) {
  const base = "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px]";

  if (mark === "you-correct" || mark === "correct") {
    return (
      <span aria-hidden className={`${base} border-[var(--color-status-mastered)]`}>
        <span
          className="block h-[9px] w-[9px] rounded-full"
          style={{ background: "var(--color-status-mastered)" }}
        />
      </span>
    );
  }
  if (mark === "you-wrong") {
    return (
      <span
        aria-hidden
        className={`${base} border-dashed`}
        style={{ borderColor: "var(--color-error-ink)" }}
      />
    );
  }
  if (selected) {
    return (
      <span aria-hidden className={`${base} border-accent`}>
        <span
          className="block h-[9px] w-[9px] rounded-full"
          style={{ background: "var(--color-accent)" }}
        />
      </span>
    );
  }
  return <span aria-hidden className={`${base} border-border-strong`} />;
}
