"use client";

// PRACTICE client flow (phase4-direction.md §2, binding). ONE problem at a
// time; the server action re-checks every answer and persists per §H. The
// FEEDBACK MOMENT keeps the prompt + visual in place and renders one of three
// states (Correct / Not quite + tag / Not quite, no tag) with MARKED-UP visuals
// (student dashed/hollow "you" vs solid "correct"), a bounded TUTOR panel (no
// "AI magic", no avatar, never routes/sets mastery), a momentum streak (a miss
// quietly RESETS — never a punishment color), and hints one-at-a-time (logged,
// never the answer). NO numeric score, NO "n of N", NO confetti. Reduced-motion
// honored via the global tokens. Correctness shown is ALWAYS the server's.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/Card";
import { Button } from "../../../../../components/ui/Button";
import { Input } from "../../../../../components/ui/Input";
import { ChoiceInput } from "../../../../../components/ui/ChoiceInput";
import { widgetForKind } from "../../../../../components/learning/answer-widget";
import { Progress } from "../../../../../components/ui/Progress";
import { AlertPanel, InsetPanel } from "../../../../../components/ui/Panels";
import { ArrowLeftIcon, CheckIcon, CrossIcon } from "../../../../../components/ui/icons";
import { ProblemVisual } from "../../../../../components/learning/ProblemVisual";
import { MathText } from "../../../../../components/ui/MathText";
import { MathKeypad } from "../../../../../components/learning/MathKeypad";
import { keypadHint } from "../../../../../components/learning/math-keypad-hint";
import type { InputNotation } from "../../../../../lib/math-notation/input-notation";
import { submitPractice } from "./actions";
import type { PracticeResult } from "./shared";
import type {
  AnswerSpec,
  Phase,
  Sport,
  VisualKind,
  VisualSpec,
} from "../../../../../types";

const FADE: React.CSSProperties = {
  animation: "a3-fade-in var(--duration-base) var(--ease-calm) both",
};

const PHASE_LABEL: Record<Phase, string> = {
  1: "Sports context",
  2: "Blended",
  3: "Neutral transfer",
};

const LINK_QUIET =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-sans text-[14px] " +
  "px-2 py-1 bg-transparent text-ink-500 font-medium transition-colors duration-150 " +
  "ease-[cubic-bezier(.2,.7,.2,1)] hover:bg-hover " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export interface ServedItem {
  problemId: string;
  /**
   * The node this item is scored against. Usually the session skill; a
   * retention probe carries its OWN mastered-node skillId (≠ the session skill).
   * Absent → the session skill (the common case).
   */
  skillId?: string;
  /** Per-item provenance — "retention" for an injected probe; else "practice". */
  source?: "practice" | "retention";
  phase: Phase;
  sport: Sport;
  prompt: string;
  visual: VisualKind | null;
  /** Geometry for a degrade-safe ProblemVisual; absent in B1. */
  visualSpec?: VisualSpec;
  hints: string[];
  isProbe: boolean;
  answerKind: AnswerSpec["kind"];
  /**
   * Multiple-choice options (only for answerKind === "choice"). Carries the
   * option strings — NEVER the answer value (engine re-checks server-side).
   * Absent for non-choice items.
   */
  choices?: string[];
  /**
   * Answer-FREE keypad flags computed server-side from the served problem's
   * answer (page.tsx). Only the booleans ship — never the answer value. Absent
   * (undefined) → NO keypad.
   */
  inputNotation?: InputNotation;
}

export interface PracticeFlowProps {
  skillId: string;
  title: string;
  phase: Phase;
  items: ServedItem[];
  sessionId: string;
}

export function PracticeFlow({ skillId, title, phase, items, sessionId }: PracticeFlowProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [hintsShown, setHintsShown] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<PracticeResult | null>(null);
  const [submittedResponse, setSubmittedResponse] = useState("");
  const [streak, setStreak] = useState(0);
  const [persistError, setPersistError] = useState(false);
  const startRef = useRef<number>(Date.now());
  const answerRef = useRef<HTMLInputElement>(null);

  const item = items[index];
  const isLast = index >= items.length - 1;
  // Non-numeric engine progress: items completed / total (direction §0.4).
  const progress = items.length === 0 ? 0 : index / items.length;

  const resetForNext = () => {
    setValue("");
    setHintsShown(0);
    setFeedback(null);
    setSubmittedResponse("");
    setPersistError(false);
    startRef.current = Date.now();
  };

  const submit = async () => {
    if (!item || pending || feedback) return;
    const response = value.trim();
    if (!response) return;
    setPending(true);
    setPersistError(false);
    const res = await submitPractice({
      // A retention probe carries its OWN mastered-node skillId; normal items
      // are scored against the session skill.
      skillId: item.skillId ?? skillId,
      problemId: item.problemId,
      response,
      timeMs: Date.now() - startRef.current,
      hintsUsed: hintsShown,
      phase: item.phase,
      isProbe: item.isProbe,
      sessionId,
      source: item.source ?? "practice",
    });
    setPending(false);
    if (!res.ok) {
      // Persist failure mid-session: keep the answer, surface a calm retry.
      setPersistError(true);
      return;
    }
    setSubmittedResponse(response);
    setFeedback(res.result);
    // Momentum: each server-confirmed correct extends the run; a miss resets
    // it quietly (no punishment color, direction §0.5 / §2 momentum).
    setStreak((s) => (res.result.correct ? s + 1 : 0));
  };

  const next = () => {
    if (isLast) {
      router.push(`/student/summary?skill=${encodeURIComponent(skillId)}&session=${sessionId}`);
      return;
    }
    setIndex((i) => i + 1);
    resetForNext();
  };

  const tryAgain = () => {
    setFeedback(null);
    setSubmittedResponse("");
    setValue("");
    startRef.current = Date.now();
  };

  const showHint = () => {
    setHintsShown((n) => Math.min(n + 1, Math.min(2, item?.hints.length ?? 0)));
  };

  if (!item) {
    return (
      <div className="fade-in mx-auto max-w-[720px]">
        <Card>
          <InsetPanel>This practice set is being prepared.</InsetPanel>
        </Card>
      </div>
    );
  }

  const hintsAvailable = Math.min(2, item.hints.length);
  const canShowHint = hintsShown < hintsAvailable && !feedback;
  const visibleHints = item.hints.slice(0, hintsShown);
  const isChoice = widgetForKind(item.answerKind) === "choice";
  // Keypad shows ONLY when the served answer carries typeable notation (never
  // for choice items). The flags are answer-free (computed server-side).
  const keypad = isChoice ? null : (item.inputNotation ?? null);
  const hint = keypad ? keypadHint(keypad) : null;

  // Feedback-moment marks for the choice widget (R2): mark ONLY the chosen row
  // and, if missed, the correct row. The correct option string is derivable
  // here only at feedback time — server-confirmed via the response/correctness.
  // We never receive answer.value; the chosen row is `submittedResponse`, and
  // the correct row is supplied by the server feedback (result.correctChoice).
  const choiceMarks: Record<string, "you-correct" | "you-wrong" | "correct"> | undefined =
    feedback && isChoice
      ? (() => {
          const marks: Record<string, "you-correct" | "you-wrong" | "correct"> = {};
          if (feedback.correct) {
            marks[submittedResponse] = "you-correct";
          } else {
            marks[submittedResponse] = "you-wrong";
            if (feedback.correctChoice && feedback.correctChoice !== submittedResponse) {
              marks[feedback.correctChoice] = "correct";
            }
          }
          return marks;
        })()
      : undefined;

  return (
    <div className="mx-auto max-w-[720px]">
      {/* Top rail */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className={LINK_QUIET}
          onClick={() => router.push(`/student/learn/${skillId}`)}
        >
          <ArrowLeftIcon aria-hidden />
          {title}
        </button>
        <span className="text-[13px] text-ink-500">{PHASE_LABEL[phase]}</span>
      </div>
      <Progress value={progress} height={4} label="Practice progress" className="mb-6" />

      <div key={index} style={FADE}>
        <Card className="px-8 py-8" padding="flush">
          {/* Problem header row. A probe is an N+1 stretch slot — it is already
              EXCLUDED from phase-advance math server-side, so we label it as a
              low-stakes stretch rather than a hidden trap (mr-kahn #4). */}
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
              {item.source === "retention"
                ? "Quick tune-up"
                : item.isProbe
                  ? "Stretch ahead"
                  : "Problem"}
            </p>
            <Momentum streak={streak} />
          </div>
          {/* A retention probe is a calm 90-second check on something already
              proved — a feature, never remediation. (Source takes precedence
              over isProbe: a probe is always isProbe:false.) */}
          {item.source === "retention" ? (
            <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-500">
              A quick check on something you proved earlier &mdash; about 90 seconds to keep it
              sharp.
            </p>
          ) : (
            item.isProbe && (
              <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-500">
                A peek at what&rsquo;s coming next. It doesn&rsquo;t count against you &mdash; just
                give it a try.
              </p>
            )
          )}

          <h2 className="mt-3 font-display text-[22px] font-medium leading-[1.4] text-ink">
            {/* Notation rendered inline at the prompt size/ink (size+color inherit);
                mixed prose+math is segmented by MathText. The RAW item.prompt is
                unchanged — this is presentation only, downstream of checkAnswer. */}
            <MathText>{item.prompt}</MathText>
          </h2>

          {/* Spec-driven geometry (no split-attention). Degrade-safe: with no
              visualSpec (B1) this renders nothing — a clean prompt + input.
              Shown pre-submit only; the marked-up comparison takes over once
              feedback exists. */}
          {!feedback && (
            <div className="empty:hidden">
              <div className="mt-5 empty:mt-0">
                <ProblemVisual
                  visual={item.visual}
                  visualSpec={item.visualSpec}
                  sport={item.sport}
                  phase={item.phase}
                />
              </div>
            </div>
          )}

          {/* Integrated visual (no split-attention) — marked up AFTER submit only.
              Pre-submit there is nothing to show in the frame; the prompt carries
              the context. The bordered box appears only once feedback exists. */}
          {/* Typed-answer marked-up comparison. Suppressed for choice items —
              the chosen/correct rows are marked in the ChoiceInput itself (R2). */}
          {item.visual && feedback && !isChoice && (
            <div className="mt-5 rounded-[10px] border border-border bg-inset px-4 py-4">
              <MarkedUpVisual
                visual={item.visual}
                feedback={feedback}
                response={submittedResponse}
              />
            </div>
          )}

          {!feedback ? (
            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {isChoice ? (
                // Multiple-choice → ChoiceInput. The chosen option's exact
                // string becomes `value` (same submission path); keypad/format
                // hint/live echo are suppressed. Enter submits via the form.
                <ChoiceInput
                  choices={item.choices ?? []}
                  value={value}
                  onChange={setValue}
                  autoFocus
                />
              ) : (
                <>
              {/* When the response IS the manipulable the Input is suppressed;
                  these banks are typed-answer, so the Input is the input. */}
              <Input
                label="Your answer"
                fieldMode="math"
                placeholder="Type your answer"
                autoFocus
                inputRef={answerRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                helperText={hint?.text}
              />
              {/* FORMAT HINT example, rendered notation (ink-500), continues the
                  helperText sentence above. */}
              {hint && hint.example && (
                <p className="-mt-1 text-[13px] text-ink-500">
                  <MathText>{hint.example}</MathText>
                </p>
              )}
              {/* The keypad — answer-free; only present when notation applies. */}
              {keypad && (
                <MathKeypad
                  notation={keypad}
                  inputRef={answerRef}
                  value={value}
                  onValueChange={setValue}
                />
              )}
              {/* LIVE ECHO — the grader-eye view of the current value forming. */}
              {keypad && (
                <p className="mt-2 text-[13px] text-ink-500">
                  {value.trim() ? <MathText>{value}</MathText> : " "}
                </p>
              )}
                </>
              )}
              {visibleHints.length > 0 && (
                <InsetPanel label="Hint" className="mt-4">
                  <div className="flex flex-col gap-2">
                    {visibleHints.map((h, i) => (
                      <p key={i} className="fade-in text-[13.5px] leading-[1.5] text-ink-700">
                        {h}
                      </p>
                    ))}
                  </div>
                </InsetPanel>
              )}
              <div className="mt-5 flex items-center gap-3">
                <Button variant="primary" type="submit" disabled={!value.trim()} loading={pending}>
                  Submit
                </Button>
                {canShowHint && (
                  <Button variant="quiet" type="button" onClick={showHint}>
                    {hintsShown === 0 ? "Need a hint" : "Another hint"}
                  </Button>
                )}
              </div>
              {persistError && (
                <AlertPanel className="mt-4">
                  We&rsquo;re saving your work and will retry automatically. Submit that answer
                  once more to sync.
                </AlertPanel>
              )}
            </form>
          ) : (
            <>
              {/* Choice feedback (R2): the options stay on screen, locked, with
                  ONLY the chosen row marked (and the correct row if missed).
                  Other distractors stay neutral. */}
              {isChoice && (
                <div className="mt-6">
                  <ChoiceInput
                    choices={item.choices ?? []}
                    value={submittedResponse}
                    onChange={() => {}}
                    disabled
                    markedRows={choiceMarks}
                  />
                </div>
              )}
              <Feedback
                result={feedback}
                isLast={isLast}
                isProbe={item.isProbe}
                onNext={next}
                onTryAgain={tryAgain}
              />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Momentum — streak-of-correct ONLY; a miss resets quietly (no red).
// ---------------------------------------------------------------------------

function Momentum({ streak }: { streak: number }) {
  const dots = Math.min(streak, 5);
  const green = streak >= 3;
  const color = green ? "var(--color-status-mastered)" : "var(--color-accent)";
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`Correct in a row: ${streak}`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block rounded-full"
          style={{
            width: 7,
            height: 7,
            background: i < dots ? color : "var(--color-track)",
          }}
        />
      ))}
      {streak > 5 && <span className="font-mono text-[11px] text-ink-500">5+</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Feedback moment — 3 states (direction §2).
// ---------------------------------------------------------------------------

function Feedback({
  result,
  isLast,
  isProbe,
  onNext,
  onTryAgain,
}: {
  result: PracticeResult;
  isLast: boolean;
  isProbe: boolean;
  onNext: () => void;
  onTryAgain: () => void;
}) {
  const correct = result.correct;
  const reAttemptable = !correct; // a miss may be retried before moving on
  // A missed probe is explicitly low-stakes — it never feeds phase-advance math
  // (server-side), so we say so rather than letting it read as a failure.
  const missedProbe = !correct && isProbe;

  return (
    <div className="mt-6 flex flex-col gap-4" style={FADE}>
      {/* aria-live region spans BOTH the icon+word header and the WHY InsetPanel
          so screen readers announce the full verdict + explanation on feedback. */}
      <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-4">
        {/* Header: icon + word (color is never the sole signal) */}
        <div className="flex items-center gap-2.5">
          {correct ? (
            <span
              aria-hidden
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full"
              style={{ background: "var(--color-success-bg)" }}
            >
              <CheckIcon className="text-[var(--color-status-mastered)]" />
            </span>
          ) : (
            <span
              aria-hidden
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full"
              style={{ background: "var(--color-error-bg-soft)" }}
            >
              <CrossIcon className="text-error-ink" />
            </span>
          )}
          <span
            className="text-[15px] font-semibold"
            style={{ color: correct ? "var(--color-status-mastered)" : "var(--color-error-ink)" }}
          >
            {correct ? "Correct" : "Not quite"}
          </span>
        </div>

        {/* WHY (assembled from existing content, spec §B). why.ts stays PURE —
            its strings flow UNCHANGED; MathText only renders notation inline at
            the panel's 14px / ink-800 (size+color inherit). */}
        <InsetPanel>
          {correct ? (
            <span className="text-ink-800">
              <MathText>
                {[result.why.whatRight, result.why.whyItWorks].filter(Boolean).join(" ")}
              </MathText>
            </span>
          ) : (
            <span className="text-ink-800">
              <MathText>
                {[result.why.whatHappened, result.why.theFix].filter(Boolean).join(" ")}
              </MathText>
            </span>
          )}
        </InsetPanel>
      </div>

      {missedProbe && (
        <p className="text-[13px] leading-[1.5] text-ink-500">
          This one was a stretch ahead &mdash; it doesn&rsquo;t count against you.
        </p>
      )}

      {/* Bounded TUTOR panel — STATE B only (matched tag). Never on correct,
          never on an untagged miss (honesty). Explains/reframes ONLY. */}
      {result.tutor && (result.tutor.reframe || result.tutor.bridgeToNeutral) && (
        <div className="rounded-[10px] border border-border-strong">
          <div className="flex items-center gap-2 rounded-t-[10px] border-b border-border bg-inset px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
              Tutor
            </span>
            <svg width={14} height={14} viewBox="0 0 16 16" aria-hidden className="text-ink-400">
              <circle cx={8} cy={8} r={6.5} fill="none" stroke="currentColor" strokeWidth={1.5} />
              <path
                d="M6.2 6.2a1.8 1.8 0 1 1 2.4 1.7c-.4.2-.6.5-.6 1"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <path d="M8 11.2v.05" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
            </svg>
          </div>
          {/* BLOCKER B (mr-kahn): tutor.diagnosis is the raw audit-register
              description and is NEVER rendered to a student. Only the
              contextHook-built reframe + bridge (student-appropriate) show. */}
          <div className="flex flex-col gap-2.5 px-4 py-3.5">
            {result.tutor.reframe && (
              <p className="text-[14px] leading-[1.5] text-ink-700">{result.tutor.reframe}</p>
            )}
            {result.tutor.bridgeToNeutral && (
              <p className="text-[13px] leading-[1.5] text-ink-500">
                {result.tutor.bridgeToNeutral}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-1 flex items-center gap-3">
        {reAttemptable ? (
          <Button variant="primary" autoFocus onClick={onTryAgain}>
            Try again
          </Button>
        ) : (
          <Button variant="primary" autoFocus onClick={onNext}>
            {isLast ? "See your summary" : "Next problem"}
          </Button>
        )}
        {reAttemptable && (
          <Button variant="quiet" onClick={onNext}>
            {isLast ? "See your summary" : "Skip for now"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Marked-up visual — student "you" (dashed/hollow, error) vs "correct" (solid,
// green). The gap is visible (direction §2 STATE B). Degrades to a text
// comparison when the problem carries no diagram or the response isn't numeric.
// ---------------------------------------------------------------------------

function MarkedUpVisual({
  visual: _visual,
  feedback,
  response,
}: {
  visual: VisualKind;
  feedback: PracticeResult | null;
  response: string;
}) {
  // The frame is only rendered when feedback exists (caller gate); this guard
  // is belt-and-suspenders — the component is never called without feedback.
  if (!feedback) return null;
  if (feedback.correct) {
    return (
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--color-status-mastered)" }}
        />
        <span className="font-mono text-[14px] text-ink">
          {/* RAW submitted response is echoed; MathText renders notation (e.g. a
              typed 4^2 → 4²) at the mono host's size+ink. Render only — the raw
              string already reached checkAnswer. */}
          <MathText>{response}</MathText>
        </span>
        <span className="text-[12.5px] text-ink-500">your answer</span>
      </div>
    );
  }
  // Incorrect — show the student's mark as hollow/dashed "you". The correct
  // value is not echoed verbatim (no answer leak); the worked example/tutor
  // carry the fix. The shape contrast is the readable signal.
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full border-2 border-dashed"
          style={{ borderColor: "var(--color-error-ink)" }}
        />
        <span className="font-mono text-[14px] text-error-ink">
          {/* The "you" mark inherits error-ink; MathText renders the student's
              raw response as notation (no red KaTeX error — degrade holds). */}
          <MathText>{response}</MathText>
        </span>
        <span className="text-[12.5px] text-ink-500">you</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--color-status-mastered)" }}
        />
        <span className="text-[12.5px] text-ink-500">
          correct — walk the worked example one line at a time
        </span>
      </div>
    </div>
  );
}
