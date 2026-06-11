// Card (§B): surface bg, 1px border, radius 14, shadow-card. No hover lift
// on static cards; no nested cards. Tones: default / error / success.

import type { ReactNode } from "react";

export type CardTone = "default" | "error" | "success";
export type CardPadding = "default" | "compact" | "flush";

const PADDING: Record<CardPadding, string> = {
  default: "p-6", // 24
  compact: "p-[18px]",
  flush: "p-0",
};

const TONE: Record<CardTone, string> = {
  default: "bg-surface border-border",
  // error tone uses the soft error tint per §B
  error: "bg-error-bg-soft border-error-border",
  success: "bg-success-bg border-success-border",
};

export interface CardProps {
  children: ReactNode;
  tone?: CardTone;
  padding?: CardPadding;
  className?: string;
  /** Renders as a semantic <section> when a label id is associated. */
  as?: "div" | "section" | "article";
}

export function Card({
  children,
  tone = "default",
  padding = "default",
  className = "",
  as: Tag = "div",
}: CardProps) {
  return (
    <Tag
      className={`rounded-[14px] border shadow-card ${TONE[tone]} ${PADDING[padding]} ${className}`}
    >
      {children}
    </Tag>
  );
}
