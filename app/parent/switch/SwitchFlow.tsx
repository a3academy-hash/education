"use client";

// Switch flow (C2 P7, S5) — PARENT-GATED child switch via parent PASSWORD
// re-entry, on a parent-register surface (never inside the child's learning
// context). Clean interstitial: "Save {name}'s progress and switch?" The
// outgoing child's in-progress attempt is persisted per-attempt by PracticeFlow
// under the OUTGOING session before this surface is reached; the server action
// establishes the new session LAST (S5 order).

import { useActionState, useState } from "react";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { AlertPanel } from "../../../components/ui/Panels";
import { switchChild, type ProvisionResult } from "../actions";

export interface SwitchTarget {
  studentId: string;
  firstName: string;
}

export interface SwitchFlowProps {
  /** The currently-active child's first name, if known (the outgoing context). */
  outgoingName: string | null;
  /** Active children the parent may switch to. */
  targets: SwitchTarget[];
}

export function SwitchFlow({ outgoingName, targets }: SwitchFlowProps) {
  const [selected, setSelected] = useState<string | null>(
    targets.length === 1 ? targets[0].studentId : null,
  );
  const [state, formAction, pending] = useActionState<ProvisionResult | null, FormData>(
    switchChild,
    null,
  );

  const target = targets.find((t) => t.studentId === selected) ?? null;

  return (
    <div className="fade-in mx-auto max-w-[440px]">
      <h1 className="font-display text-[24px] font-semibold leading-[1.25] text-ink">
        {outgoingName ? `Save ${outgoingName}'s progress and switch?` : "Switch students"}
      </h1>
      <p className="mt-3 text-[14.5px] leading-[1.55] text-ink-500">
        {outgoingName
          ? `${outgoingName}'s work is saved. Choose who to switch to and confirm with your password.`
          : "Choose a student and confirm with your password."}
      </p>

      {targets.length === 0 ? (
        <AlertPanel className="mt-6">
          There are no other active students to switch to.
        </AlertPanel>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-2">
            {targets.map((t) => {
              const active = selected === t.studentId;
              return (
                <button
                  key={t.studentId}
                  type="button"
                  onClick={() => setSelected(t.studentId)}
                  className={[
                    "flex items-center justify-between rounded-[10px] border px-4 py-3 text-left transition-colors duration-150",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    active
                      ? "border-accent bg-accent-tint"
                      : "border-border-strong bg-surface hover:bg-hover",
                  ].join(" ")}
                >
                  <span className="text-[14px] font-medium text-ink">{t.firstName}</span>
                  {active && (
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </button>
              );
            })}
          </div>

          {state?.error && <AlertPanel className="mt-5">{state.error}</AlertPanel>}

          <form action={formAction} className="mt-5 flex flex-col gap-4">
            <input type="hidden" name="studentId" value={selected ?? ""} />
            <Input
              label="Your password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <Button
              variant="primary"
              type="submit"
              loading={pending}
              disabled={!target}
            >
              {target ? `Switch to ${target.firstName}` : "Switch"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
