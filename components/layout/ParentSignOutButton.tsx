"use client";

// Sign-out control for the ParentShell (C2 P1). A quiet form posting the
// signOut server action — no auth machinery surfaced to the user.

import { signOut } from "../../app/auth/actions";

export function ParentSignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-[7px] px-3 py-2 text-[13px] font-medium text-ink-500 transition-colors duration-150 hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Sign out
      </button>
    </form>
  );
}
