// /parent/switch (C2 P7) — the parent-gated child switch surface. Memory-mode
// safe (S11). Lists the parent's active children as switch targets; the actual
// switch (password re-entry + atomic session swap) is the switchChild action.

import { redirect } from "next/navigation";
import { getAuthMode } from "../../../lib/auth/mode";
import { getCurrentParent, getRoster } from "../../../lib/auth/parent";
import { ParentShell } from "../../../components/layout/ParentShell";
import { SwitchFlow } from "./SwitchFlow";

export default async function SwitchPage() {
  if (getAuthMode() !== "supabase") return <NotAvailable />;

  const parent = await getCurrentParent();
  if (!parent) redirect("/auth/sign-in");

  const roster = await getRoster(parent.uid);
  const targets = roster
    .filter((c) => c.consent === "active")
    .map((c) => ({ studentId: c.studentId, firstName: c.firstName }));

  return (
    <ParentShell parentName={parent.name}>
      {/* outgoingName is unknown on the parent surface (we are outside the child
          session); the interstitial copy degrades gracefully without it. */}
      <SwitchFlow outgoingName={null} targets={targets} />
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
          This environment uses the local student flow.
        </p>
      </div>
    </main>
  );
}
