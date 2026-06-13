// AppShell (§E). 60px white sticky header with 1px bottom border; brand block
// (28px accent square + "Algebra 1" over "A3 ACADEMY · ADAPTIVE"); right-side
// nav (Phase 2 = Learning Home only) + divider + first name + initials avatar.
// Container max 1140, 28px gutters, main pad 36 top / 80 bottom. No mastery in
// the chrome. Body bg = canvas (set globally).

import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "./NavLink";

export interface AppShellProps {
  children: ReactNode;
  /** First name for the chrome; null when unknown (pre-onboarding). */
  displayName: string | null;
}

const NAV = [
  { href: "/student", label: "Learning Home", exact: true },
  { href: "/student/progress", label: "Progress" },
];

function initials(name: string | null): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || first.toUpperCase() || "—";
}

export function AppShell({ children, displayName }: AppShellProps) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="mx-auto flex h-[60px] max-w-[1140px] items-center justify-between px-7">
          <Link href="/student" className="flex items-center gap-3 rounded-[7px]">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-accent">
              <span className="font-display text-[15px] font-semibold text-white">A</span>
            </span>
            <span className="flex flex-col">
              <span className="font-display text-[16.5px] font-semibold leading-none text-ink">
                Algebra 1
              </span>
              <span className="mt-0.5 text-[11px] tracking-[0.3px] text-ink-500">
                A3 ACADEMY · ADAPTIVE
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href} exact={item.exact}>
                {item.label}
              </NavLink>
            ))}
            <span aria-hidden className="mx-2 h-6 w-px bg-border" />
            <div className="flex items-center gap-2.5 pl-1">
              {displayName && (
                <span className="text-[13.5px] font-medium text-ink-700">{displayName}</span>
              )}
              <span
                aria-hidden
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-track text-[12.5px] font-semibold text-ink-500"
              >
                {initials(displayName)}
              </span>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1140px] px-7 pb-20 pt-9">{children}</main>
    </div>
  );
}
