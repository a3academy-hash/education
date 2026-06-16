// ParentShell — the FAMILY adapter over the shared Chrome (§1). Same public
// signature (children, parentName) so /parent/* call sites are unchanged. Family
// register ("A3 ACADEMY · FAMILY", accent brand square). Nav = Students + the
// parent identity + Sign out. NEVER renders alongside an active child session.

import type { ReactNode } from "react";
import { Chrome } from "./Chrome";
import { NavLink } from "./NavLink";
import { ParentSignOutButton } from "./ParentSignOutButton";

export interface ParentShellProps {
  children: ReactNode;
  /** Parent display name for the chrome; null when unknown. */
  parentName: string | null;
}

const NAV = [{ href: "/parent", label: "Students", exact: true }];

export function ParentShell({ children, parentName }: ParentShellProps) {
  const nav = NAV.map((item) => (
    <NavLink key={item.href} href={item.href} exact={item.exact}>
      {item.label}
    </NavLink>
  ));

  const trailing = (
    <>
      {parentName && (
        <span className="pl-1 pr-1 text-[12.5px] font-medium text-ink-500">{parentName}</span>
      )}
      <ParentSignOutButton />
    </>
  );

  return (
    <Chrome homeHref="/parent" eyebrow="A3 ACADEMY · FAMILY" nav={nav} trailing={trailing}>
      {children}
    </Chrome>
  );
}
