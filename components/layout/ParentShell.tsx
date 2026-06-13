// ParentShell (C2 P1) — the FAMILY chrome for /parent/*. Mirrors StaffShell:
// same 60px header / 1140 container / token vocabulary, but a FAMILY register
// (accent square like the student brand; "A3 ACADEMY · FAMILY"). Nav = "Students"
// + the parent identity + a Sign out action. NEVER renders alongside an active
// child session (the student AppShell owns that surface) — /parent and the
// student (shell) are separate route trees.

import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "./NavLink";
import { ParentSignOutButton } from "./ParentSignOutButton";

export interface ParentShellProps {
  children: ReactNode;
  /** Parent display name for the chrome; null when unknown. */
  parentName: string | null;
}

const NAV = [{ href: "/parent", label: "Students", exact: true }];

export function ParentShell({ children, parentName }: ParentShellProps) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="mx-auto flex h-[60px] max-w-[1140px] items-center justify-between px-7">
          <Link href="/parent" className="flex items-center gap-3 rounded-[7px]">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-accent">
              <span className="font-display text-[15px] font-semibold text-white">A</span>
            </span>
            <span className="flex flex-col">
              <span className="font-display text-[16.5px] font-semibold leading-none text-ink">
                Algebra 1
              </span>
              <span className="mt-0.5 text-[11px] tracking-[0.3px] text-ink-500">
                A3 ACADEMY · FAMILY
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
            {parentName && (
              <span className="pl-1 pr-1 text-[12.5px] font-medium text-ink-500">
                {parentName}
              </span>
            )}
            <ParentSignOutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1140px] px-7 pb-20 pt-9">{children}</main>
    </div>
  );
}
