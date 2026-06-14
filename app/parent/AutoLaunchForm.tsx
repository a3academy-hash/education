"use client";

// AutoLaunchForm (C2 P6) — the one-child zero-friction auto-launch.
//
// WHY A CLIENT COMPONENT: the parent reaches /parent via a CLIENT-SIDE navigation
// (the sign-in 303 → Next router navigation), and React does NOT execute an inline
// RSC-injected <script> on client nav (only on a full document load). The previous
// inline dangerouslySetInnerHTML requestSubmit() therefore never fired → the page
// hung on "Opening…" and launchChild was never called. A useEffect runs on mount
// for BOTH initial load and client navigation, so it reliably submits the launch.
// (Fixes the stuck-on-"Opening" live defect; see also mr-gates NIT to drop the
// inline script.)
//
// The visual is unchanged (pee-wee P6): calm "Opening…" text, no auth machinery.
// launchChild is a server action ("use server"); importing it here and using it as
// the form action is the standard pattern. <noscript> keeps a manual fallback.

import { useEffect, useRef } from "react";
import { launchChild } from "./actions";

export function AutoLaunchForm({ studentId }: { studentId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <div className="fade-in flex min-h-[40vh] flex-col items-center justify-center text-center">
      <p className="text-[14px] text-ink-500">Opening your student&rsquo;s course…</p>
      <form action={launchChild} ref={formRef}>
        <input type="hidden" name="studentId" value={studentId} />
        <noscript>
          <button
            type="submit"
            className="mt-4 inline-flex items-center justify-center rounded-[10px] bg-accent px-[22px] py-[11px] text-[14px] font-semibold text-white"
          >
            Continue
          </button>
        </noscript>
      </form>
    </div>
  );
}
