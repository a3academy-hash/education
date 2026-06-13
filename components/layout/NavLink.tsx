"use client";

// Nav button (§E): 13.5/500, radius 7. Active = selected-bg + ink; inactive =
// ink-500; hover = bg-hover. Active state derives from the pathname.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface NavLinkProps {
  href: string;
  children: ReactNode;
  /** Exact match only — for a parent route that shares a prefix with siblings. */
  exact?: boolean;
}

export function NavLink({ href, children, exact = false }: NavLinkProps) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "rounded-[7px] px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active ? "bg-selected text-ink" : "text-ink-500 hover:bg-hover",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
