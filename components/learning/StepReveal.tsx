// StepReveal (§C). Worked-example stepper: steps hidden; a secondary button
// reveals one at a time (fade 250ms + 4px rise; instant under reduced-motion).
// Label → "Show result" before the final. Then a success-tinted result chip +
// the caller's continue action. blankStepIndex = completion mode (that step is
// an inline math Input gating the next reveal). Focus stays on the button.

"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { MathText } from "../ui/MathText";
import {
  initRevealState,
  isComplete,
  nextButtonLabel,
  revealNext,
} from "./step-reveal-logic";

export interface StepRevealProps {
  /** Problem prompt, shown in a mono inset strip. */
  problem: string;
  steps: string[];
  /** Final result text shown in the success chip. */
  result: string;
  /** Index of the step rendered as a fill-in input (completion mode). */
  blankStepIndex?: number | null;
  /** Expected answer for the blank step (case/space-insensitive). */
  blankAnswer?: string;
  /** Continue affordance rendered after the result chip. */
  continueAction?: ReactNode;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

export function StepReveal({
  problem,
  steps,
  result,
  blankStepIndex = null,
  blankAnswer = "",
  continueAction,
}: StepRevealProps) {
  const [state, setState] = useState(() =>
    initRevealState(steps.length, blankStepIndex),
  );
  const [blankValue, setBlankValue] = useState("");
  const [blankError, setBlankError] = useState<string | null>(null);
  const liveId = useId();

  const blankSatisfied = useMemo(() => {
    if (state.blankStepIndex === null) return true;
    return normalize(blankValue) === normalize(blankAnswer) && blankAnswer !== "";
  }, [state.blankStepIndex, blankValue, blankAnswer]);

  const complete = isComplete(state);

  const checkBlankAndAdvance = () => {
    if (state.blankStepIndex !== null && state.revealed === state.blankStepIndex) {
      if (!blankSatisfied) {
        setBlankError("Not quite — match the worked step above.");
        return;
      }
      setBlankError(null);
    }
    setState((s) => revealNext(s, true));
  };

  const handleAdvance = () => {
    if (state.blankStepIndex !== null && state.revealed === state.blankStepIndex) {
      checkBlankAndAdvance();
    } else {
      setState((s) => revealNext(s, blankSatisfied));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* problem strip — mono host kept for the literal echo; notation renders
          via MathText (displayStyle: standalone equation line → \dfrac / tall
          radicals). The raw `problem` string is unchanged. */}
      <div className="rounded-[10px] border border-track bg-inset px-[14px] py-3 font-mono text-[15px] text-ink">
        <MathText displayStyle>{problem}</MathText>
      </div>

      {/* revealed steps */}
      <ol className="flex flex-col gap-3">
        {steps.map((text, i) => {
          if (i >= state.revealed) return null;
          const isBlank = state.blankStepIndex === i;
          return (
            <li key={i} className="fade-in flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-chip font-mono text-[12px] font-semibold text-accent"
              >
                {i + 1}
              </span>
              {isBlank ? (
                <span className="text-[14px] leading-[1.5] text-ink-800">
                  {/* satisfied blank shows the confirmed (raw) answer; notation
                      renders inline at the step size/ink (size+color inherit). */}
                  <MathText>{blankValue || text}</MathText>
                </span>
              ) : (
                <span className="text-[14px] leading-[1.5] text-ink-800">
                  <MathText>{text}</MathText>
                </span>
              )}
            </li>
          );
        })}

        {/* active blank (completion mode), shown when it's the next step */}
        {state.blankStepIndex !== null && state.revealed === state.blankStepIndex && (
          <li className="fade-in flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-chip font-mono text-[12px] font-semibold text-accent"
            >
              {state.blankStepIndex + 1}
            </span>
            <div className="flex-1">
              <Input
                fieldMode="math"
                label="Your step"
                placeholder="Fill in this step"
                value={blankValue}
                onChange={(e) => {
                  setBlankValue(e.target.value);
                  setBlankError(null);
                }}
                errorText={blankError ?? undefined}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    checkBlankAndAdvance();
                  }
                }}
              />
            </div>
          </li>
        )}
      </ol>

      {/* result chip */}
      {complete && (
        <div className="fade-in flex items-center gap-2 rounded-[10px] border border-success-border bg-success-bg px-[14px] py-3">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: "var(--color-status-mastered)" }}
          />
          <span className="font-mono text-[14px] text-ink">
            {/* result chip — mono host kept; notation renders inline at host size+ink. */}
            <MathText>{result}</MathText>
          </span>
        </div>
      )}

      {/* controls */}
      <div className="flex items-center gap-3">
        {!complete ? (
          <Button variant="secondary" onClick={handleAdvance}>
            {nextButtonLabel(state)}
          </Button>
        ) : (
          continueAction
        )}
      </div>

      <span id={liveId} className="sr-only" aria-live="polite">
        {complete
          ? `All steps revealed. Result: ${result}.`
          : `Step ${state.revealed} of ${steps.length} revealed.`}
      </span>
    </div>
  );
}
