// PageHeader (§B): eyebrow (label style, ink-500) + display-xl H1 + optional
// subhead (max 560px). mb-28.

import type { ReactNode } from "react";

export interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  subhead?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, subhead, className = "" }: PageHeaderProps) {
  return (
    <header className={`mb-[28px] ${className}`}>
      {eyebrow && (
        <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-[30px] font-semibold leading-[1.2] tracking-[-0.3px] text-ink">
        {title}
      </h1>
      {subhead && (
        <p className="mt-3 max-w-[560px] text-[15px] leading-[1.55] text-ink-500">
          {subhead}
        </p>
      )}
    </header>
  );
}
