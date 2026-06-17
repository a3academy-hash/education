// components/ui/SegmentedControl — a generic, reusable segmented control / radio
// group (Phase 8 R6 / pee-wee 8). A real ARIA radiogroup: ONE tab stop (roving
// tabindex), arrow keys move selection + focus, Space/Enter selects. Tokens-only
// (no invented colors); reduced-motion respected (only a 150ms color transition,
// never scale/entrance). Colorblind-safe: the selected segment carries an accent
// border + tint AND bold ink — never color alone. Presentational + controlled
// (parent owns `value`), client-side for keyboard handling.
//
// Generic over the option value type T (string-like ids). Used by
// RewardModeToggle, but holds no gamification/mastery knowledge.

"use client";

import { useId, useRef, type KeyboardEvent } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional smaller helper line under the label. */
  sublabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible group label. */
  ariaLabel: string;
  /** Disable all interaction (e.g. while a server action is in flight). */
  disabled?: boolean;
  className?: string;
}

const SEG_BASE =
  "flex-1 rounded-[8px] px-4 py-2.5 text-[13.5px] font-medium text-center " +
  "transition-colors duration-150 ease-[cubic-bezier(.2,.7,.2,1)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  className = "",
}: SegmentedControlProps<T>) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0;

  const move = (from: number, delta: number) => {
    if (disabled) return;
    const next = (from + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(index, -1);
        break;
      case " ":
      case "Enter":
        e.preventDefault();
        onChange(options[index].value);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={labelId}
      className={`inline-flex w-full gap-1 rounded-[10px] border border-border bg-inset p-1 ${className}`}
    >
      {options.map((opt, index) => {
        const selected = opt.value === value;
        const stateClasses = selected
          ? "border border-accent bg-surface text-ink shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          : `border border-transparent text-ink-500 ${disabled ? "" : "hover:text-ink-700"}`;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={disabled || undefined}
            ref={(el) => {
              refs.current[index] = el;
            }}
            tabIndex={index === tabStop ? 0 : -1}
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`${SEG_BASE} ${stateClasses}`}
          >
            <span className={selected ? "font-semibold" : ""}>{opt.label}</span>
            {opt.sublabel && (
              <span className="mt-0.5 block text-[11.5px] font-normal leading-tight text-ink-500">
                {opt.sublabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
