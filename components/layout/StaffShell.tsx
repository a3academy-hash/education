// StaffShell — the STAFF adapter over the shared Chrome (§1). Same public
// signature (children) so /admin/* call sites are unchanged. Quieter, NOT
// student-branded ("A3 ACADEMY · STAFF"; ink-700 brand square). Nav = Students.
// No mode indicator, no mastery in the chrome.

import type { ReactNode } from "react";
import { Chrome } from "./Chrome";
import { NavLink } from "./NavLink";

export interface StaffShellProps {
  children: ReactNode;
}

const NAV = [{ href: "/admin/students", label: "Students" }];

export function StaffShell({ children }: StaffShellProps) {
  const nav = NAV.map((item) => (
    <NavLink key={item.href} href={item.href}>
      {item.label}
    </NavLink>
  ));

  return (
    <Chrome
      homeHref="/admin/students"
      eyebrow="A3 ACADEMY · STAFF"
      brandSquareClass="bg-ink-700"
      nav={nav}
      trailing={<span className="text-[12.5px] font-medium text-ink-500">Staff view</span>}
    >
      {children}
    </Chrome>
  );
}
