// StaffShell — the staff-only chrome for /admin/* (Phase 7, pee-wee P5).
// SEPARATE from the student AppShell: same 60px header / 1140 container / token
// vocabulary, but quieter and NOT student-branded ("A3 Academy · Staff", not the
// "Adaptive" student voice). Staff nav = "Students". No mastery in the chrome.

import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "./NavLink";

export interface StaffShellProps {
  children: ReactNode;
}

const NAV = [{ href: "/admin/students", label: "Students" }];

export function StaffShell({ children }: StaffShellProps) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="mx-auto flex h-[60px] max-w-[1140px] items-center justify-between px-7">
          <Link href="/admin/students" className="flex items-center gap-3 rounded-[7px]">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-ink-700">
              <span className="font-display text-[15px] font-semibold text-white">A</span>
            </span>
            <span className="flex flex-col">
              <span className="font-display text-[16.5px] font-semibold leading-none text-ink">
                Algebra 1
              </span>
              <span className="mt-0.5 text-[11px] tracking-[0.3px] text-ink-500">
                A3 ACADEMY · STAFF
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
            <span aria-hidden className="mx-2 h-6 w-px bg-border" />
            <span className="pl-1 text-[12.5px] font-medium text-ink-500">Staff view</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1140px] px-7 pb-20 pt-9">{children}</main>
    </div>
  );
}
