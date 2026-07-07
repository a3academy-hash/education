// /parent (C2 P3/P6) — the parent dashboard: child roster + provision-new +
// consent management + launch. ParentShell + PageHeader (eyebrow FAMILY). Roster
// is a VERTICAL STACK of compact rows (not a grid); NO progress/analytics.
//
// MEMORY MODE (S11): this surface is supabase-only. In memory mode it renders a
// calm "not available in this mode" rather than throwing on missing env — the
// dev/test path is the local student flow.
//
// ONE-CHILD ZERO-FRICTION (P6): a parent with exactly ONE active child is sent
// straight into that child's session → student home (skip the dashboard). They
// reach the dashboard via the quiet "Manage students" entry in the student shell.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthMode } from "../../lib/auth/mode";
import { getCurrentParent, getRoster } from "../../lib/auth/parent";
import { AutoLaunchForm } from "./AutoLaunchForm";
import { ParentShell } from "../../components/layout/ParentShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { InsetPanel } from "../../components/ui/Panels";
import { RosterRow } from "./RosterRow";

export default async function ParentDashboardPage() {
  if (getAuthMode() !== "supabase") return <NotAvailable />;

  const parent = await getCurrentParent();
  if (!parent) redirect("/auth/sign-in");

  const roster = await getRoster(parent.uid);
  const active = roster.filter((c) => c.consent === "active");

  // P6: exactly one active child → auto-launch into their session.
  if (active.length === 1 && roster.length === 1) {
    return <AutoLaunch studentId={active[0].studentId} />;
  }

  return (
    <ParentShell parentName={parent.name}>
      <div className="fade-in flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Family"
          title="Your students"
          subhead="Launch a student to begin, or add another to your account."
        />
        <Link
          href="/parent/children/new"
          className="mt-1 inline-flex shrink-0 items-center justify-center rounded-[10px] bg-accent px-[22px] py-[11px] text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Add a student
        </Link>
      </div>

      {roster.length === 0 ? (
        <Card>
          <InsetPanel label="Get started">
            Add your first student to begin. You will set up their profile and
            confirm consent in two short steps.
          </InsetPanel>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {roster.map((child) => (
            <RosterRow
              key={child.studentId}
              studentId={child.studentId}
              firstName={child.firstName}
              gradeLevel={child.gradeLevel}
              consent={child.consent}
            />
          ))}
        </div>
      )}
    </ParentShell>
  );
}

/** Auto-launch interstitial (P6): the auto-submit runs in a client component
 *  (useEffect on mount) so it fires on client-side navigation too — an inline
 *  RSC <script> does not execute on client nav. */
function AutoLaunch({ studentId }: { studentId: string }) {
  return (
    <ParentShell parentName={null}>
      <AutoLaunchForm studentId={studentId} />
    </ParentShell>
  );
}

function NotAvailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-[420px] text-center">
        <h1 className="font-display text-[22px] font-semibold text-ink">
          Family accounts are not available here
        </h1>
        <p className="mt-3 text-[14px] leading-[1.55] text-ink-500">
          This environment uses the local student flow. Family accounts and parent
          management are available in the hosted school environment.
        </p>
      </div>
    </main>
  );
}
