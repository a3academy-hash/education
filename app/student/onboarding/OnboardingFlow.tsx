"use client";

// Onboarding flow (§D). Three screens, centered column max 620, step indicator
// "STEP n OF 3" + Progress h4, one primary per screen, fade-in only. Register:
// a serious school setting up your course. No exclamation points, no
// "fun/awesome/journey/adventure", no AI mention, no ampersands (§F-7).

import {
  useActionState,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { Sport } from "../../../types";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Progress } from "../../../components/ui/Progress";
import { Table, TableBody, TableRow, Td } from "../../../components/ui/Table";
import { ArrowLeftIcon } from "../../../components/ui/icons";
import { completeOnboarding } from "./actions";
import type { OnboardingResult } from "./constants";
import {
  BaseballMark,
  BasketballMark,
  FootballMark,
  NeutralMark,
  SoccerMark,
  SoftballMark,
  VolleyballMark,
} from "./sport-marks";

const GRADES = [6, 7, 8] as const;

interface SportOption {
  value: Sport;
  name: string;
  descriptor: string;
  Mark: (p: { className?: string }) => React.ReactElement;
}

const SPORTS: SportOption[] = [
  { value: "baseball", name: "Baseball", descriptor: "Box scores, spray charts, season pace.", Mark: BaseballMark },
  { value: "softball", name: "Softball", descriptor: "Hit rates, run differentials, projections.", Mark: SoftballMark },
  { value: "basketball", name: "Basketball", descriptor: "Shooting splits, pace, point totals.", Mark: BasketballMark },
  { value: "soccer", name: "Soccer", descriptor: "Pass maps, goal differential, table math.", Mark: SoccerMark },
  { value: "football", name: "Football", descriptor: "Yardage, drive rates, score projections.", Mark: FootballMark },
  { value: "volleyball", name: "Volleyball", descriptor: "Set scores, hitting percentage, rotations.", Mark: VolleyballMark },
  { value: "neutral", name: "Straight math", descriptor: "Clean, classic problems from the start.", Mark: NeutralMark },
];

type Step = 1 | 2 | 3;

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);

  const [state, formAction, pending] = useActionState<OnboardingResult | null, FormData>(
    completeOnboarding,
    null,
  );

  const validateIdentity = (): boolean => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 30) {
      setNameError("Enter your first name to continue.");
      return false;
    }
    if (grade === null) return false;
    setNameError(null);
    return true;
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-[620px] flex-col px-7 py-16">
      <div className="fade-in">
        <StepIndicator step={step} />

        {step === 1 && (
          <IdentityStep
            name={name}
            setName={(v) => {
              setName(v);
              setNameError(null);
            }}
            nameError={nameError}
            grade={grade}
            setGrade={setGrade}
            onContinue={() => {
              if (validateIdentity()) setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <SportStep
            sport={sport}
            setSport={setSport}
            onBack={() => setStep(1)}
            onContinue={() => sport && setStep(3)}
          />
        )}

        {step === 3 && (
          <ConfirmationStep
            name={name.trim()}
            grade={grade}
            sport={sport}
            formAction={formAction}
            pending={pending}
            error={state?.error}
            onChange={(target) => setStep(target)}
          />
        )}
      </div>
    </main>
  );
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="mb-7">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        Step {step} of 3
      </p>
      <Progress value={step / 3} height={4} />
    </div>
  );
}

function IdentityStep({
  name,
  setName,
  nameError,
  grade,
  setGrade,
  onContinue,
}: {
  name: string;
  setName: (v: string) => void;
  nameError: string | null;
  grade: number | null;
  setGrade: (g: number) => void;
  onContinue: () => void;
}) {
  const valid = name.trim().length > 0 && name.trim().length <= 30 && grade !== null;
  return (
    <section>
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        Welcome to A3 Academy
      </p>
      <h1 className="font-display text-[30px] font-semibold leading-[1.2] tracking-[-0.3px] text-ink">
        Let&rsquo;s set up your course.
      </h1>
      <p className="mt-3 max-w-[560px] text-[15px] leading-[1.55] text-ink-500">
        Two quick questions. They shape how Algebra 1 is taught to you — nothing
        here is graded.
      </p>

      <form
        className="mt-8 flex flex-col gap-7"
        onSubmit={(e) => {
          e.preventDefault();
          onContinue();
        }}
      >
        <Input
          label="First name"
          name="displayName"
          value={name}
          autoFocus
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          helperText="First name only — that&rsquo;s all we need."
          errorText={nameError ?? undefined}
        />

        <GradeSegmented grade={grade} setGrade={setGrade} />

        <div>
          <Button variant="primary" type="submit" disabled={!valid}>
            Continue
          </Button>
        </div>
      </form>
    </section>
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

function SportStep({
  sport,
  setSport,
  onBack,
  onContinue,
}: {
  sport: Sport | null;
  setSport: (s: Sport) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (idx: number) => (e: ReactKeyboardEvent) => {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % SPORTS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (idx - 1 + SPORTS.length) % SPORTS.length;
    else return;
    e.preventDefault();
    setSport(SPORTS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <section>
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        Personalization
      </p>
      <h1 className="font-display text-[30px] font-semibold leading-[1.2] tracking-[-0.3px] text-ink">
        Pick the examples you want to learn through.
      </h1>
      <p className="mt-3 max-w-[560px] text-[15px] leading-[1.55] text-ink-500">
        Algebra shows up in box scores, pace charts, and season projections.
        Choose a sport and your early lessons use its numbers. The math is
        identical either way — and the examples shift to standard notation as you
        advance.
      </p>

      <div
        role="radiogroup"
        aria-label="Examples"
        className="mt-8 grid grid-cols-2 gap-[14px] sm:grid-cols-4"
      >
        {SPORTS.map((opt, i) => {
          const selected = sport === opt.value;
          const Mark = opt.Mark;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (sport === null && i === 0) ? 0 : -1}
              onClick={() => setSport(opt.value)}
              onKeyDown={onKeyDown(i)}
              className={[
                "relative flex flex-col items-start gap-3 rounded-[14px] border bg-surface p-[18px] text-left transition-colors duration-150",
                "focus-visible:outline-none",
                selected
                  ? "border-accent shadow-[0_0_0_3px_rgba(42,72,120,.12)]"
                  : "border-border hover:border-axis",
              ].join(" ")}
            >
              {selected && (
                <span
                  aria-hidden
                  className="absolute right-3 top-3 inline-block h-1.5 w-1.5 rounded-full bg-accent"
                />
              )}
              <span className="text-ink-700">
                <Mark />
              </span>
              <span className="text-[15px] font-semibold text-ink">{opt.name}</span>
              <span className="text-[12.5px] leading-[1.45] text-ink-500">
                {opt.descriptor}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-4">
        <Button variant="primary" onClick={onContinue} disabled={sport === null}>
          Continue
        </Button>
        <Button variant="quiet" onClick={onBack}>
          <ArrowLeftIcon /> Back
        </Button>
      </div>
    </section>
  );
}

function ConfirmationStep({
  name,
  grade,
  sport,
  formAction,
  pending,
  error,
  onChange,
}: {
  name: string;
  grade: number | null;
  sport: Sport | null;
  formAction: (formData: FormData) => void;
  pending: boolean;
  error?: string;
  onChange: (target: Step) => void;
}) {
  const sportName = SPORTS.find((s) => s.value === sport)?.name ?? "";
  return (
    <section>
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        You&rsquo;re set
      </p>
      <h1 className="font-display text-[30px] font-semibold leading-[1.2] tracking-[-0.3px] text-ink">
        Here&rsquo;s your setup, {name}.
      </h1>

      <div className="mt-7 rounded-[14px] border border-border bg-surface">
        <Table>
          <TableBody>
            <ConfirmRow label="Name" value={name} onChange={() => onChange(1)} first />
            <ConfirmRow
              label="Grade"
              value={grade !== null ? `Grade ${grade}` : ""}
              onChange={() => onChange(1)}
            />
            <ConfirmRow label="Examples" value={sportName} onChange={() => onChange(2)} />
          </TableBody>
        </Table>
      </div>

      <p className="mt-6 max-w-[560px] text-[15px] leading-[1.55] text-ink-500">
        Next, a short diagnostic finds your exact starting point — what you
        already know, and the one place to begin. It takes about ten minutes, and
        nothing is graded.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 text-[13px] text-[var(--color-status-prerequisite-gap)]"
        >
          {error}
        </p>
      )}

      <form action={formAction} className="mt-7">
        <input type="hidden" name="displayName" value={name} />
        <input type="hidden" name="gradeLevel" value={grade ?? ""} />
        <input type="hidden" name="sport" value={sport ?? ""} />
        <Button variant="primary" type="submit" loading={pending}>
          Go to your learning home
        </Button>
      </form>
    </section>
  );
}

function ConfirmRow({
  label,
  value,
  onChange,
  first,
}: {
  label: string;
  value: string;
  onChange: () => void;
  first?: boolean;
}) {
  return (
    <TableRow first={first}>
      <Td secondary density="dense" className="pl-[18px]">
        {label}
      </Td>
      <Td density="dense">{value}</Td>
      <Td align="right" density="dense" className="pr-[18px]">
        <Button variant="quiet" size="sm" onClick={onChange}>
          Change
        </Button>
      </Td>
    </TableRow>
  );
}
