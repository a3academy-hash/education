// Panels (§B):
//  - InsetPanel: inset bg, 1px track border, radius 10, pad 12×14, optional
//    micro-label — the "WHY THIS, NOW" pattern.
//  - AlertPanel: error-bg-soft / error-border, 8px dot, 13.5 error-ink,
//    role=status.
//  - LabeledSection: micro-label + content.

import type { ReactNode } from "react";

export interface InsetPanelProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export function InsetPanel({ label, children, className = "" }: InsetPanelProps) {
  return (
    <div
      className={`rounded-[10px] border border-track bg-inset px-[14px] py-3 ${className}`}
    >
      {label && (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
          {label}
        </p>
      )}
      <div className="text-[13.5px] leading-[1.5] text-ink-700">{children}</div>
    </div>
  );
}

export interface AlertPanelProps {
  children: ReactNode;
  className?: string;
}

export function AlertPanel({ children, className = "" }: AlertPanelProps) {
  return (
    <div
      role="status"
      className={`flex items-start gap-[14px] rounded-[10px] border border-error-border bg-error-bg-soft px-5 py-4 ${className}`}
    >
      <span
        aria-hidden
        className="mt-[5px] inline-block shrink-0 rounded-full"
        style={{ width: 8, height: 8, background: "var(--color-status-prerequisite-gap)" }}
      />
      <div className="text-[13.5px] leading-[1.5] text-error-ink">{children}</div>
    </div>
  );
}

export interface LabeledSectionProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function LabeledSection({ label, children, className = "" }: LabeledSectionProps) {
  return (
    <section className={className}>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        {label}
      </p>
      {children}
    </section>
  );
}
