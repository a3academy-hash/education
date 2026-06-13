"use client";

// Child provisioning flow (C2 P5) — two steps:
//   (a) child profile: first name + grade (mirrors the onboarding IdentityStep)
//   (b) consent: the scope rendered as a legible InsetPanel list + the literal
//       policy version in quiet ink; a real (NOT pre-checked) checkbox with a
//       full-sentence guardian label; primary disabled until checked.
// Calm, non-celebratory. Submits the provisionChild server action.

import {
  useActionState,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Input } from "../../../../components/ui/Input";
import { Button } from "../../../../components/ui/Button";
import { InsetPanel } from "../../../../components/ui/Panels";
import { ArrowLeftIcon } from "../../../../components/ui/icons";
import { provisionChild, type ProvisionResult } from "../../actions";
import type { ConsentScopeItem } from "../../consent-policy";

const GRADES = [6, 7, 8] as const;

export interface ProvisionFlowProps {
  parentName: string | null;
  policyVersion: string;
  scope: readonly ConsentScopeItem[];
}

export function ProvisionFlow({ parentName, policyVersion, scope }: ProvisionFlowProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [consented, setConsented] = useState(false);

  const [state, formAction, pending] = useActionState<ProvisionResult | null, FormData>(
    provisionChild,
    null,
  );

  const validProfile = firstName.trim().length > 0 && firstName.trim().length <= 30 && grade !== null;

  return (
    <div className="fade-in mx-auto max-w-[560px]">
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        Step {step} of 2
      </p>

      {step === 1 && (
        <section>
          <h1 className="font-display text-[28px] font-semibold leading-[1.2] tracking-[-0.3px] text-ink">
            Add a student
          </h1>
          <p className="mt-3 text-[15px] leading-[1.55] text-ink-500">
            Start with your student&rsquo;s first name and grade. You can change
            these later.
          </p>

          <form
            className="mt-8 flex flex-col gap-7"
            onSubmit={(e) => {
              e.preventDefault();
              if (!validProfile) {
                if (!firstName.trim()) setNameError("Enter a first name to continue.");
                return;
              }
              setNameError(null);
              setStep(2);
            }}
          >
            <Input
              label="Student first name"
              value={firstName}
              autoFocus
              maxLength={30}
              onChange={(e) => {
                setFirstName(e.target.value);
                setNameError(null);
              }}
              helperText="First name only — that&rsquo;s all we need."
              errorText={nameError ?? undefined}
            />
            <GradeSegmented grade={grade} setGrade={setGrade} />
            <div>
              <Button variant="primary" type="submit" disabled={!validProfile}>
                Continue
              </Button>
            </div>
          </form>
        </section>
      )}

      {step === 2 && (
        <section>
          <h1 className="font-display text-[28px] font-semibold leading-[1.2] tracking-[-0.3px] text-ink">
            Review and confirm consent
          </h1>
          <p className="mt-3 text-[15px] leading-[1.55] text-ink-500">
            Please review what A3 Academy collects for {firstName.trim() || "your student"} and
            confirm your consent as their parent or guardian.
          </p>

          <div className="mt-7 flex flex-col gap-3">
            {scope.map((item) => (
              <InsetPanel key={item.what} label={item.what}>
                {item.detail}
              </InsetPanel>
            ))}
          </div>

          <p className="mt-4 text-[12.5px] text-ink-500">
            Consent policy version {policyVersion}
          </p>

          {state?.error && (
            <p
              role="alert"
              className="mt-4 text-[13px] text-[var(--color-status-prerequisite-gap)]"
            >
              {state.error}
            </p>
          )}

          <form action={formAction} className="mt-6">
            <input type="hidden" name="firstName" value={firstName.trim()} />
            <input type="hidden" name="gradeLevel" value={grade ?? ""} />
            <input type="hidden" name="relationship" value="parent" />

            <label className="flex items-start gap-3 rounded-[10px] border border-border-strong bg-surface p-4">
              <input
                type="checkbox"
                name="consent"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
              />
              <span className="text-[13.5px] leading-[1.5] text-ink-700">
                I am {firstName.trim() || "this student"}&rsquo;s parent or legal
                guardian, and I consent to A3 Academy collecting and using their
                information as described above
                {parentName ? `, on behalf of ${parentName}` : ""}.
              </span>
            </label>

            <div className="mt-7 flex items-center gap-4">
              <Button variant="primary" type="submit" loading={pending} disabled={!consented}>
                Add student
              </Button>
              <Button variant="quiet" type="button" onClick={() => setStep(1)}>
                <ArrowLeftIcon /> Back
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function GradeSegmented({
  grade,
  setGrade,
}: {
  grade: number | null;
  setGrade: (g: number) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (idx: number) => (e: ReactKeyboardEvent) => {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % GRADES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (idx - 1 + GRADES.length) % GRADES.length;
    else return;
    e.preventDefault();
    setGrade(GRADES[next]);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-ink-700">Grade</p>
      <div role="radiogroup" aria-label="Grade" className="flex gap-2">
        {GRADES.map((g, i) => {
          const selected = grade === g;
          return (
            <button
              key={g}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (grade === null && i === 0) ? 0 : -1}
              onClick={() => setGrade(g)}
              onKeyDown={onKeyDown(i)}
              className={[
                "flex h-11 w-16 items-center justify-center rounded-[10px] border font-sans text-[15px] font-medium transition-colors duration-150",
                "focus-visible:outline-none",
                selected
                  ? "border-accent bg-accent-tint text-ink shadow-[0_0_0_3px_rgba(42,72,120,.12)]"
                  : "border-border-strong bg-surface text-ink-700 hover:bg-hover",
              ].join(" ")}
            >
              {g}
            </button>
          );
        })}
      </div>
    </div>
  );
}
