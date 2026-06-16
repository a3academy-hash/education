// Chrome — the ONE shared A3 instrument header (STYLE_GUIDE §1). Student/staff/
// family shells are now thin adapters over this (same 60px white sticky header,
// same brand lockup, same nav vocabulary, same container) so every surface reads
// as one product. The header stays Trust/white on EVERY surface, including the
// dark Focus lessons (§1: "dark lessons still carry navy/white trust elements").
// A restrained navy pinstripe under the header is the baseball Trust DNA (§6).
// Server-safe; the only client island is NavLink (+ the optional ModeIndicator).

import Link from "next/link";
import type { ReactNode } from "react";
import { ModeIndicator } from "./ModeIndicator";

export interface ChromeProps {
  children: ReactNode;
  /** Brand lockup target. */
  homeHref: string;
  /** Small caps line under "Algebra 1" — e.g. "A3 ACADEMY · ADAPTIVE". */
  eyebrow: string;
  /** Brand square fill class (student/family = bg-accent; staff = bg-ink-700). */
  brandSquareClass?: string;
  /** Nav links (NavLink list). */
  nav: ReactNode;
  /** Trailing chrome after the divider (identity, sign-out, etc.). */
  trailing?: ReactNode;
  /** Show the persistent measurement/training mode pill (student surfaces). */
  showModeIndicator?: boolean;
}

export function Chrome({
  children,
  homeHref,
  eyebrow,
  brandSquareClass = "bg-accent",
  nav,
  trailing,
  showModeIndicator = false,
}: ChromeProps) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        {/* navy pinstripe — restrained baseball Trust DNA (§6) */}
        <div aria-hidden className="h-[2px] w-full bg-accent/90" />
        <div className="mx-auto flex h-[60px] max-w-[1140px] items-center justify-between px-7">
          <Link href={homeHref} className="flex items-center gap-3 rounded-[7px]">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-[7px] ${brandSquareClass}`}
            >
              <span className="font-display text-[15px] font-semibold text-white">A</span>
            </span>
            <span className="flex flex-col">
              <span className="font-display text-[16.5px] font-semibold leading-none text-ink">
                Algebra 1
              </span>
              <span className="mt-0.5 text-[11px] tracking-[0.3px] text-ink-500">{eyebrow}</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {showModeIndicator && (
              <>
                <ModeIndicator />
                <span aria-hidden className="mx-2 hidden h-6 w-px bg-border sm:block" />
              </>
            )}
            {nav}
            {trailing != null && (
              <>
                <span aria-hidden className="mx-2 h-6 w-px bg-border" />
                <div className="flex items-center gap-2.5 pl-1">{trailing}</div>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1140px] px-7 pb-20 pt-9">{children}</main>
    </div>
  );
}
