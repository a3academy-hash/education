// Button (§B). Variants: primary / secondary / quiet. Sizes md / sm.
// ONE primary per screen (enforced by usage, not code). No icon-only
// primaries, no full-width on desktop, no uppercase labels. Loading =
// inline spinner + disabled, label stays.

"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "md" | "sm";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
  className?: string;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-sans " +
  "transition-colors duration-150 ease-[cubic-bezier(.2,.7,.2,1)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "active:translate-y-px disabled:active:translate-y-0 disabled:cursor-not-allowed";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white font-semibold hover:bg-accent-hover " +
    "disabled:bg-[#c9cfd8] disabled:hover:bg-[#c9cfd8]",
  secondary:
    "bg-surface border border-border-strong text-ink font-medium " +
    "hover:bg-hover disabled:text-ink-400 disabled:bg-inset",
  quiet:
    "bg-transparent text-ink-500 font-medium hover:bg-hover " +
    "disabled:text-ink-400 disabled:hover:bg-transparent",
};

const SIZE: Record<ButtonSize, Record<ButtonVariant, string>> = {
  md: {
    primary: "text-[14px] px-[22px] py-[11px]",
    secondary: "text-[14px] px-[22px] py-[11px]",
    quiet: "text-[14px] px-2 py-1",
  },
  sm: {
    primary: "text-[13px] px-[14px] py-2",
    secondary: "text-[13px] px-[14px] py-2",
    quiet: "text-[13px] px-2 py-1",
  },
};

function Spinner() {
  // 600ms rotation is exempt from the motion ceiling (§B).
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      aria-hidden
      className="shrink-0"
      style={{ animation: "a3-spin 600ms linear infinite" }}
    >
      <circle
        cx={8}
        cy={8}
        r={6}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth={1.5}
      />
      <path
        d="M8 2a6 6 0 0 1 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size][variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
