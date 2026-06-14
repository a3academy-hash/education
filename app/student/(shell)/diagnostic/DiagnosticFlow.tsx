"use client";

// Placement diagnostic flow (phase3-direction.md SURFACE 1 — binding).
// Three states: intro → item loop → summary. Sport context is ABSENT on all
// states (neutral transfer-grade assessment). PER-ITEM FEEDBACK IS SILENT —
// no right/wrong is ever shown per item; the rail advances and the next item
// fades in. No countdown, no "N of M", no timer, no score, no confetti.
//
// The client holds the in-progress session (startDiagnostic → nextItem →
// recordResponse) against the PRUNED graph view; on finish it submits raw
// responses and the server re-checks everything against the real graph.

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { Input } from "../../../../components/ui/Input";
import { ChoiceInput } from "../../../../components/ui/ChoiceInput";
import { widgetForKind } from "../../../../components/learning/answer-widget";
import { Progress } from "../../../../components/ui/Progress";
import { StatusPill } from "../../../../components/ui/StatusPill";
import { AlertPanel, InsetPanel } from "../../../../components/ui/Panels";
import { CheckIcon } from "../../../../components/ui/icons";
import { ProblemVisual } from "../../../../components/learning/ProblemVisual";
import { MathText } from "../../../../components/ui/MathText";
import { MathKeypad } from "../../../../components/learning/MathKeypad";
import { keypadHint } from "../../../../components/learning/math-keypad-hint";
import { inputNotation } from "../../../../lib/math-notation/input-notation";
import {
  DIAGNOSTIC_CONFIG,
  finishDiagnostic,
  nextItem,
  recordResponse,
  startDiagnostic,
} from "../../../../lib/diagnostic-engine";
import { checkAnswer } from "../../../../lib/problem-engine";
import { persistDiagnostic } from "./actions";
import type { DiagnosticAnswer } from "./shared";
import type {
  ConfidenceLevel,
  CurriculumGraph,
  DiagnosticItem,
  DiagnosticSession,
} from "../../../../types";

const FADE_BASE: React.CSSProperties = {
  animation: "a3-fade-in var(--duration-base) var(--ease-calm) both",
};

const deAmp = (label: string): string => label.replace(/\s*&\s*/g, " and ");

export interface DiagnosticFlowProps {
  /** Pruned graph view (neutral p3 only), or null when no student exists. */
  graphView: CurriculumGraph | null;
}

export function DiagnosticFlow({ graphView }: DiagnosticFlowProps) {
  const router = useRouter();
  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [answers, setAnswers] = useState<DiagnosticAnswer[]>([]);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [persistError, setPersistError] = useState(false);
  const itemStartRef = useRef(0);

  const item: DiagnosticItem | null = useMemo(
    () => (graphView && session ? nextItem(session, graphView) : null),
    [graphView, session],
  );

  // Client-side preview of the result (server recomputes authoritatively).
  const result = useMemo(
    () =>
      graphView && session && !item
        ? finishDiagnostic(session, graphView, new Date().toISOString())
        : null,
    [graphView, session, item],
  );

  if (!graphView) {
    return (
      <div className="fade-in mx-auto max-w-[600px]">
        <Card>
          <h2 className="font-display text-[24px] font-semibold leading-[1.25] text-ink">
            Let&rsquo;s set up your course first.
          </h2>
          <p className="mt-3 text-[14px] leading-[1.55] text-ink-500">
            The diagnostic needs your course profile. It takes about a minute to
            set up.
          </p>
          <div className="mt-5">
            <Button variant="secondary" onClick={() => router.push("/student/onboarding")}>
              Set up your course
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const begin = () => {
    setSession(startDiagnostic(graphView, "preview", DIAGNOSTIC_CONFIG));
    itemStartRef.current = Date.now();
  };

  const submit = () => {
    if (!session || !item) return;
    const response = value.trim();
    if (!response) return;
    // SILENT: correctness drives sequencing only — never shown to the student.
    const { correct } = checkAnswer(item.problem, response);
    setAnswers((cur) => [
      ...cur,
      {
        skillId: item.skillId,
        problemId: item.problem.id,
        response,
        timeMs: Date.now() - itemStartRef.current,
      },
    ]);
    setSession(recordResponse(session, graphView, item.skillId, correct));
    setValue("");
    itemStartRef.current = Date.now();
  };

  const persist = async () => {
    setPending(true);
    setPersistError(false);
    const res = await persistDiagnostic(answers);
    if (res.ok) {
      router.push("/student");
    } else {
      setPersistError(true);
      setPending(false);
    }
  };

  if (!session) return <Intro onBegin={begin} />;
  if (item) {
    const node = graphView.nodes.find((n) => n.id === item.skillId);
    const domainLabel =
      graphView.domains.find((d) => d.id === node?.domain)?.label ?? "";
    return (
      <ItemScreen
        key={item.skillId}
        item={item}
        domainLabel={deAmp(domainLabel)}
        progress={session.progress}
        value={value}
        onChange={setValue}
        onSubmit={submit}
      />
    );
  }
  return (
    <SummaryScreen
      graphView={graphView}
      result={result}
      pending={pending}
      persistError={persistError}
      onPersist={persist}
    />
  );
}

// ---------------------------------------------------------------------------
// Intro
// ---------------------------------------------------------------------------

function Intro({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="fade-in mx-auto max-w-[600px] text-center">
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        Placement diagnostic
      </p>
      <h1 className="font-display text-[30px] font-semibold leading-[1.2] tracking-[-0.3px] text-ink">
        Let&rsquo;s find your exact starting point.
      </h1>
      <p className="mx-auto mt-4 max-w-[480px] text-[15px] leading-[1.6] text-ink-500">
        This is a short set of questions across the major skill areas of
        Algebra 1. It is not graded and it does not count against you. We are
        only measuring what you already know, so the path we build starts in
        exactly the right place. About ten minutes.
      </p>
      <InsetPanel className="mx-auto mt-7 max-w-[480px] text-left">
        <ul className="flex flex-col gap-2.5">
          {[
            "One question at a time. Answer in standard math notation.",
            "If you are unsure, give your best answer and move on.",
            "When you finish, you go straight to your learning home.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <CheckIcon className="mt-[3px] shrink-0 text-ink-700" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </InsetPanel>
      <div className="mt-7">
        <Button variant="primary" autoFocus onClick={onBegin}>
          Begin
        </Button>
      </div>
      <p className="mt-4 text-[12.5px] text-ink-500">Nothing here is graded.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------

function ItemScreen({
  item,
  domainLabel,
  progress,
  value,
  onChange,
  onSubmit,
}: {
  item: DiagnosticItem;
  domainLabel: string;
  progress: number;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const answerRef = useRef<HTMLInputElement>(null);
  // The diagnostic ships the full ProblemTemplate, so compute the answer-free
  // keypad flags client-side from problem.answer. null → no keypad.
  const isChoice = widgetForKind(item.problem.answer.kind) === "choice";
  const keypad = isChoice ? null : inputNotation(item.problem.answer);
  const hint = keypad ? keypadHint(keypad) : null;
  return (
    <div className="mx-auto max-w-[600px]" style={FADE_BASE}>
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        {domainLabel}
      </p>
      <Progress value={progress} height={4} label="Diagnostic progress" className="mb-6" />
      <Card className="px-8 py-8" padding="flush">
        <h2 className="font-display text-[20px] font-medium leading-[1.45] text-ink">
          {/* Notation rendered inline at the prompt size/ink (size+color inherit).
              RAW prompt unchanged; checkAnswer is unaffected (render only). */}
          <MathText>{item.problem.prompt}</MathText>
        </h2>
        {/* Spec-driven, degrade-safe. The diagnostic ships the full problem, so
            visualSpec rides along; without one (B1) this renders nothing — a
            clean prompt + math input. The diagnostic measures with typed
            answers, so any geometry here is display-only (no answer sink). */}
        <div className="mt-5 empty:mt-0">
          <ProblemVisual
            visual={item.problem.visual}
            visualSpec={item.problem.visualSpec}
            sport="neutral"
            phase={item.problem.phase}
          />
        </div>
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {isChoice ? (
            // Multiple-choice → ChoiceInput. The selected choice's exact string
            // becomes `value` (same submission path); keypad/hint/echo suppressed.
            <ChoiceInput
              choices={item.problem.choices ?? []}
              value={value}
              onChange={onChange}
              autoFocus
            />
          ) : (
            <>
              <Input
                label="Your answer"
                fieldMode="math"
                placeholder="Type your answer"
                autoFocus
                inputRef={answerRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                helperText={hint?.text}
              />
              {hint && hint.example && (
                <p className="-mt-1 text-[13px] text-ink-500">
                  <MathText>{hint.example}</MathText>
                </p>
              )}
              {keypad && (
                <MathKeypad
                  notation={keypad}
                  inputRef={answerRef}
                  value={value}
                  onValueChange={onChange}
                />
              )}
              {keypad && (
                <p className="mt-2 text-[13px] text-ink-500">
                  {value.trim() ? <MathText>{value}</MathText> : " "}
                </p>
              )}
            </>
          )}
          <div className="mt-5">
            <Button variant="primary" type="submit" disabled={!value.trim()}>
              Submit
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function SummaryScreen({
  graphView,
  result,
  pending,
  persistError,
  onPersist,
}: {
  graphView: CurriculumGraph;
  result: ReturnType<typeof finishDiagnostic> | null;
  pending: boolean;
  persistError: boolean;
  onPersist: () => void;
}) {
  if (!result) return null;
  const startNode = graphView.nodes.find((n) => n.id === result.recommendedStart);
  // Router reasons can name skill titles — de-amp everything interpolated
  // into this flowing sentence (titles keep "&" only in standalone headings).
  const reason = result.recommendedReason
    ? deAmp(
        result.recommendedReason.charAt(0).toLowerCase() +
          result.recommendedReason.slice(1),
      )
    : "";
  return (
    <div className="fade-in mx-auto max-w-[680px]">
      <div className="mb-7 text-center">
        <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
          Diagnostic complete
        </p>
        <h1 className="font-display text-[30px] font-semibold leading-[1.2] tracking-[-0.3px] text-ink">
          Here&rsquo;s what we found.
        </h1>
        <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-[1.55] text-ink-500">
          Nothing here is a grade. This is a snapshot of where you are today, so
          we know exactly where to begin and what to skip.
        </p>
      </div>

      <Card padding="flush">
        {result.byCluster.map((cluster, i) => {
          const label = deAmp(
            graphView.domains.find((d) => d.id === cluster.domainId)?.label ??
              cluster.domainId,
          );
          return (
            <div
              key={cluster.domainId}
              className={`flex items-center justify-between px-[18px] py-4 ${
                i > 0 ? "border-t border-selected" : ""
              }`}
            >
              <span className="text-[14.5px] font-medium text-ink">{label}</span>
              <span className="flex items-center gap-5">
                <StatusPill status={cluster.status} className="w-[120px]" />
                <ConfidenceMeter level={cluster.unestimated ? "unknown" : cluster.confidence} />
              </span>
            </div>
          );
        })}
      </Card>

      <InsetPanel label="Where we'll start" className="mt-5">
        {startNode ? (
          <span>
            We&rsquo;re starting you at <strong>{deAmp(startNode.title)}</strong> &mdash; {reason}
          </span>
        ) : (
          <span>{deAmp(result.recommendedReason)}</span>
        )}
      </InsetPanel>

      <div className="mt-7 text-center">
        <Button variant="primary" autoFocus loading={pending} onClick={onPersist}>
          Go to my learning home
        </Button>
        {persistError && (
          <AlertPanel className="mt-4 text-left">
            Something went wrong saving your profile. Your answers are safe
            &mdash; try that button once more.
          </AlertPanel>
        )}
      </div>
    </div>
  );
}

/**
 * Confidence meter — about the MEASUREMENT, never a mastery bar or a percent.
 * Three 4×18px segments: Low/Medium/High = 1/2/3 filled; unknown = 0 filled
 * with "Not yet measured".
 */
function ConfidenceMeter({ level }: { level: ConfidenceLevel }) {
  const filled = level === "high" ? 3 : level === "medium" ? 2 : level === "low" ? 1 : 0;
  const word =
    level === "high"
      ? "High confidence"
      : level === "medium"
        ? "Medium confidence"
        : level === "low"
          ? "Low confidence"
          : "Not yet measured";
  return (
    <span className="inline-flex w-[170px] items-center gap-2.5">
      <span className="inline-flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block rounded-full"
            style={{
              width: 4,
              height: 18,
              background: i < filled ? "var(--color-ink-700)" : "var(--color-track)",
            }}
          />
        ))}
      </span>
      <span className="text-[12.5px] font-medium text-ink-500">{word}</span>
    </span>
  );
}
