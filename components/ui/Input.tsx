// Input (§B). Modes: math (16px mono) / text (15px sans). Visible label
// above; placeholder is never a label. Error: prerequisite-gap border +
// 12% ring + message below wired via aria-describedby.

"use client";

import { useId, type InputHTMLAttributes, type Ref } from "react";

export type InputMode = "text" | "math";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "mode"> {
  label?: string;
  /** Visual/semantic mode — "math" renders mono 16px. */
  fieldMode?: InputMode;
  helperText?: string;
  errorText?: string;
  className?: string;
  /** Forwarded ref to the underlying <input> (e.g. for the math keypad). */
  inputRef?: Ref<HTMLInputElement>;
}

export function Input({
  label,
  fieldMode = "text",
  helperText,
  errorText,
  id,
  disabled,
  className = "",
  inputRef,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(errorText);

  const describedBy =
    [hasError ? errorId : null, helperText ? helperId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const fieldClasses = [
    "w-full rounded-[10px] border bg-surface px-[15px] py-[13px] text-ink",
    "transition-shadow duration-150 ease-[cubic-bezier(.2,.7,.2,1)]",
    "placeholder:text-ink-400 focus:outline-none",
    fieldMode === "math"
      ? "font-mono text-[16px]"
      : "font-sans text-[15px]",
    hasError
      ? "border-[var(--color-status-prerequisite-gap)] focus:shadow-[0_0_0_3px_rgba(180,84,63,.12)]"
      : "border-border-strong focus:border-accent focus:shadow-[0_0_0_3px_rgba(42,72,120,.12)]",
    disabled ? "bg-inset text-ink-400 placeholder:text-ink-300" : "",
  ].join(" ");

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium text-ink-700"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={inputRef}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        className={fieldClasses}
        {...rest}
      />
      {hasError ? (
        <p
          id={errorId}
          role="alert"
          className="text-[13px] text-[var(--color-status-prerequisite-gap)]"
        >
          {errorText}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-[13px] text-ink-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
