// Route-group layout (mr-gates condition 4): the (shell) group carries the
// AppShell chrome. Onboarding sits OUTSIDE this group, so the shell never has
// to render for a student who does not exist yet. The first name (if any) is
// read server-side from the opaque cookie via the server-only repository.

import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppShell } from "../../../components/layout/AppShell";
import { getRepository } from "../../../lib/repository/server";
import { STUDENT_COOKIE } from "../onboarding/constants";

export default async function ShellLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const studentId = cookieStore.get(STUDENT_COOKIE)?.value ?? null;

  let displayName: string | null = null;
  if (studentId) {
    const student = await getRepository().getStudent(studentId);
    displayName = student?.displayName ?? null;
  }

  return <AppShell displayName={displayName}>{children}</AppShell>;
}
