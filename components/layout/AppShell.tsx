// AppShell — the STUDENT adapter over the shared Chrome (§1). Same public
// signature as before (displayName, workingAs) so the (shell) layout call site
// is unchanged. Adds the persistent mode indicator; nav = Learning Home /
// Momentum / Progress. No mastery in the chrome. The dark Focus lesson surface
// is painted by SurfacePanel inside <main>, so the chrome stays Trust/white.

import Link from "next/link";
import type { ReactNode } from "react";
import { Chrome } from "./Chrome";
import { NavLink } from "./NavLink";

export interface AppShellProps {
  children: ReactNode;
  /** First name for the chrome; null when unknown (pre-onboarding). */
  displayName: string | null;
  /**
   * Parent-context chrome (C2 P6): when true (supabase mode, a parent has
   * launched a child), the identity reads "Working as {name}" and a quiet
   * parent-gated "Manage students" entry appears. Defaults false.
   */
  workingAs?: boolean;
}

const NAV = [
  { href: "/student", label: "Learning Home", exact: true },
  { href: "/student/momentum", label: "Momentum" },
  { href: "/student/progress", label: "Progress" },
];

function initials(name: string | null): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || first.toUpperCase() || "—";
}

export function AppShell({ children, displayName, workingAs = false }: AppShellProps) {
  const nav = (
    <>
      {NAV.map((item) => (
        <NavLink key={item.href} href={item.href} exact={item.exact}>
          {item.label}
        </NavLink>
      ))}
      {workingAs && (
        <Link
          href="/parent"
          className="rounded-[7px] px-3 py-2 text-[13px] font-medium text-ink-500 transition-colors duration-150 hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Manage students
        </Link>
      )}
    </>
  );

  const trailing = (
    <>
      {displayName && (
        <span className="flex flex-col leading-tight">
          {workingAs && (
            <span className="text-[10.5px] uppercase tracking-[0.3px] text-ink-400">Working as</span>
          )}
          <span className="text-[13.5px] font-medium text-ink-700">{displayName}</span>
        </span>
      )}
      <span
        aria-hidden
        className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-track text-[12.5px] font-semibold text-ink-500"
      >
        {initials(displayName)}
      </span>
    </>
  );

  return (
    <Chrome
      homeHref="/student"
      eyebrow="A3 ACADEMY · ADAPTIVE"
      nav={nav}
      trailing={trailing}
      showModeIndicator
    >
      {children}
    </Chrome>
  );
}
