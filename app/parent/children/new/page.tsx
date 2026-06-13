// /parent/children/new (C2 P5) — provision a child. Memory-mode safe (S11):
// renders the calm "not available" notice instead of throwing on missing env.
// Supabase mode: ParentShell + the two-step ProvisionFlow.

import { redirect } from "next/navigation";
import { getAuthMode } from "../../../../lib/auth/mode";
import { getCurrentParent } from "../../../../lib/auth/parent";
import { ParentShell } from "../../../../components/layout/ParentShell";
import { ProvisionFlow } from "./ProvisionFlow";
import { CONSENT_POLICY_VERSION, CONSENT_SCOPE } from "../../consent-policy";

export default async function NewChildPage() {
  if (getAuthMode() !== "supabase") return <NotAvailable />;

  const parent = await getCurrentParent();
  if (!parent) redirect("/auth/sign-in");

  return (
    <ParentShell parentName={parent.name}>
      <ProvisionFlow
        parentName={parent.name}
        policyVersion={CONSENT_POLICY_VERSION}
        scope={CONSENT_SCOPE}
      />
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
