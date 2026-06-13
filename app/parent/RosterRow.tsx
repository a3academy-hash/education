"use client";

// One roster row (C2 P3): compact Card with avatar + first name + grade +
// ConsentPill + ONE primary action keyed to the consent state:
//   active   → "Launch"          (launchChild)
//   pending  → "Finish setup"    (→ /parent/children/new, completes consent)
//   revoked  → "Re-grant access" (regrantConsent)
// No progress/analytics (P3). Calm, never accusatory.

import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConsentPill, type ConsentState } from "../../components/ui/ConsentPill";
import { launchChild, regrantConsent } from "./actions";

export interface RosterRowProps {
  studentId: string;
  firstName: string;
  gradeLevel: number | null;
  consent: ConsentState;
}

function initials(name: string): string {
  const ch = name.trim()[0];
  return ch ? ch.toUpperCase() : "—";
}

export function RosterRow({ studentId, firstName, gradeLevel, consent }: RosterRowProps) {
  return (
    <Card padding="compact" className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full bg-track text-[14px] font-semibold text-ink-500"
        >
          {initials(firstName)}
        </span>
        <div>
          <p className="text-[15px] font-semibold text-ink">{firstName}</p>
          <p className="mt-0.5 text-[12.5px] text-ink-500">
            {gradeLevel !== null ? `Grade ${gradeLevel}` : "Grade not set"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ConsentPill state={consent} />
        <RowAction studentId={studentId} consent={consent} />
      </div>
    </Card>
  );
}

function RowAction({ studentId, consent }: { studentId: string; consent: ConsentState }) {
  if (consent === "active") {
    return (
      <form action={launchChild}>
        <input type="hidden" name="studentId" value={studentId} />
        <Button variant="primary" size="sm" type="submit">
          Launch
        </Button>
      </form>
    );
  }
  if (consent === "revoked") {
    return (
      <form action={regrantConsent}>
        <input type="hidden" name="studentId" value={studentId} />
        <Button variant="secondary" size="sm" type="submit">
          Re-grant access
        </Button>
      </form>
    );
  }
  // pending — finish the consent step.
  return (
    <a
      href="/parent/children/new"
      className="inline-flex items-center justify-center rounded-[10px] border border-border-strong bg-surface px-[14px] py-2 text-[13px] font-medium text-ink transition-colors duration-150 hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Finish setup
    </a>
  );
}
