// Route-group layout (mr-gates condition 4): the (shell) group carries the
// AppShell chrome. Onboarding sits OUTSIDE this group, so the shell never has
// to render for a student who does not exist yet. The first name (if any) is
// read server-side from the opaque cookie via the server-only repository.

import type { ReactNode } from "react";
import { AppShell } from "../../../components/layout/AppShell";
import { getRepository } from "../../../lib/repository/server";
import { resolveStudentSession } from "../../../lib/auth/session";
import { getAuthMode } from "../../../lib/auth/mode";
import { SessionInterstitial } from "./SessionInterstitial";

export default async function ShellLayout({ children }: { children: ReactNode }) {
  // Identity seam (C2 S1/S8/S9): memory → STUDENT_COOKIE; supabase → verified
  // student_id claim, consent-gated per request. The active-student indicator
  // reads this SERVER value (not a cookie) — pee-wee P6.
  const session = await resolveStudentSession();
  const supabaseMode = getAuthMode() === "supabase";

  // S8/S9 — SERVER-SIDE enforcement (not just a banner): in supabase mode a
  // non-active session refuses the practice/evidence surfaces and renders the
  // calm student-register interstitial. The child never sees an auth error (P8).
  // Memory mode never reaches these branches (status is "active" or "none"; a
  // "none" cookie falls through to the children's existing empty states —
  // behavior identical to before).
  if (supabaseMode && session.status !== "active") {
    if (session.status === "revoked") return <SessionInterstitial variant="paused" />;
    if (session.status === "pending") return <SessionInterstitial variant="pending" />;
    return <SessionInterstitial variant="expired" />;
  }

  const studentId = session.studentId;
  let displayName: string | null = null;
  if (studentId) {
    const repo = await getRepository();
    const student = await repo.getStudent(studentId);
    displayName = student?.displayName ?? null;
  }

  // "Working as {name}" is parent-context chrome (P6): show ONLY in supabase
  // mode, where a parent has launched a specific child. In memory mode there is
  // no parent layer, so the chrome stays the plain student identity.
  return (
    <AppShell displayName={displayName} workingAs={supabaseMode}>
      {children}
    </AppShell>
  );
}
