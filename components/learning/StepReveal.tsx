// StepReveal (§C) — worked-example stepper. Steps reveal one at a time; some
// steps can be INTERACTIVE: a "fill" step asks the student to type a short token
// before it reveals, and a "predict" step asks them to choose what happens next
// from 2–3 options. With no `interactions` (and no legacy blankStepIndex) every
// step is a plain reveal — today's behavior, unchanged. Focus stays usable; the
// reveal fade is 250ms (neutralized under reduced-motion via globals.css).

"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { MathText } from "../ui/MathText";
import {
  buildInteractions,
  normalizeAnswer,
  type StepInteraction,
} from "./step-reveal-logic";

export interface StepRevealProps {
  /** Problem prompt, shown in a mono inset strip. */
  problem: string;
  steps: string[];
  /** Final result text shown in the success chip. */
  result: string;
  /** Legacy single fill-in step (case/space-insensitive). Superseded by `interactions`. */
  blankStepIndex?: number | null;
  blankAnswer?: string;
  /**
   * Optional per-step interactions aligned to `steps`. Each entry is reveal /
   * fill / predict; a null/missing entry is a plain reveal. Overrides the legacy
   * blankStepIndex/blankAnswer when provided.
   */
  interactions?: (StepInteraction | null)[];
  /** Continue affordance rendered after the result chip. */
  continueAction?: ReactNode;
  /**
   * Fires ONCE when the student has stepped/committed all the way to the result
   * (revealed >= total). The §7 no-slideshow gate hangs off genuine completion —
   * NOT any stray pointer/key event. For nodes with fill/predict interactions,
   * reaching completion required committing those answers.
   */
  onComplete?: () => void;
}

export function StepReveal({
  problem,
  steps,
  result,
  blankStepIndex = null,
  blankAnswer = "",
  interactions,
  continueAction,
  onComplete,
}: StepRevealProps) {
  const eff = useMemo(
    () => buildInteractions(steps.length, interactions, blankStepIndex, blankAnswer),
    [steps.length, interactions, blankStepIndex, blankAnswer],
  );

  const [revealed, setRevealed] = useState(0);
  const [fillValue, setFillValue] = useState("");
  const [fillError, setFillError] = useState<string | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);
  const liveId = useId();

  const total = steps.length;
  const complete = revealed >= total;
  const active: StepInteraction | null = revealed < total ? eff[revealed] : null;

  // Fire onComplete ONCE, when the student genuinely reaches the result (not on a
  // stray interaction, and not re-fired if the parent recreates the callback). §7.
  const completeFiredRef = useRef(false);
  useEffect(() => {
    if (complete && !completeFiredRef.current) {
      completeFiredRef.current = true;
      onComplete?.();
    }
  }, [complete, onComplete]);

  const revealStep = () => {
    setPredictError(null);
    setFillError(null);
    setRevealed((r) => Math.min(total, r + 1));
  };

  const checkFill = () => {
    if (active?.kind !== "fill") return;
    if (active.answer !== "" && normalizeAnswer(fillValue) === normalizeAnswer(active.answer)) {
      setFillValue("");
      revealStep(); // reveal shows the step's full worked reasoning
    } else {
      setFillError("Not quite — match the worked step above.");
    }
  };

  const choosePredict = (opt: string) => {
    if (active?.kind !== "predict") return;
    if (normalizeAnswer(opt) === normalizeAnswer(active.answer)) {
      revealStep();
    } else {
      setPredictError("Not quite — picture the move and try again.");
    }
  };

  const advanceLabel = revealed >= total - 1 ? "Show result" : "Show next step";

  return (
    <div className="flex flex-col gap-4">
      {/* problem strip */}
      <div className="rounded-[10px] border border-track bg-inset px-[14px] py-3 font-mono text-[15px] text-ink">
        <MathText displayStyle>{problem}</MathText>
      </div>

      {/* revealed steps */}
      <ol className="flex flex-col gap-3">
        {steps.map((text, i) => {
          if (i >= revealed) return null;
          return (
            <li key={i} className="fade-in flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-chip font-mono text-[12px] font-semibold text-accent"
              >
                {i + 1}
              </span>
              <span className="text-[14px] leading-[1.5] text-ink-800">
                <MathText>{text}</MathText>
              </span>
            </li>
          );
        })}

        {/* active interactive step (fill / predict) shown before it reveals */}
        {active && active.kind !== "reveal" && (
          <li className="fade-in flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-chip font-mono text-[12px] font-semibold text-accent"
            >
              {revealed + 1}
            </span>
            <div className="flex-1">
              {active.kind === "fill" ? (
                <Input
                  fieldMode="math"
                  label="Your step"
                  placeholder="Fill in this step"
                  value={fillValue}
                  onChange={(e) => {
                    setFillValue(e.target.value);
                    setFillError(null);
                  }}
                  errorText={fillError ?? undefined}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      checkFill();
                    }
                  }}
                />
              ) : (
                <div>
                  <p className="mb-2 text-[14px] font-medium text-ink-800">
                    {active.prompt ?? "What happens next?"}
                  </p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Predict the next step">
                    {active.options.map((opt) => (
                      <Button
                        key={opt}
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => choosePredict(opt)}
                      >
                        <MathText>{opt}</MathText>
                      </Button>
                    ))}
                  </div>
                  {predictError && (
                    <p className="mt-2 text-[13px] text-error-ink">{predictError}</p>
                  )}
                </div>
              )}
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
            <MathText>{result}</MathText>
          </span>
        </div>
      )}

      {/* controls */}
      <div className="flex items-center gap-3">
        {complete ? (
          continueAction
        ) : active?.kind === "reveal" ? (
          <Button variant="secondary" onClick={revealStep}>
            {advanceLabel}
          </Button>
        ) : active?.kind === "fill" ? (
          <Button variant="secondary" onClick={checkFill}>
            Check step
          </Button>
        ) : null}
        {/* predict has no advance button — choosing the right option advances. */}
      </div>

      <span id={liveId} className="sr-only" aria-live="polite">
        {complete
          ? `All steps revealed. Result: ${result}.`
          : `Step ${revealed} of ${total} revealed.`}
      </span>
    </div>
  );
}
