"use client";

// LEARN client (phase4-direction.md §1, binding). The interactive lesson area
// is the spine: a controlled CoordinatePlane / NumberLine, or — when the node
// has no visual — a StepReveal completion-mode promoted as the manipulable
// (every lesson has ONE touchable thing). The worked example below fades its
// support by phase (P1 full → P2 fill one line → P3 more independence). The
// context bridge fades sport → neutral by phase (the fade is the point, spec
// §E). Worked-example-seen is a SESSION UI GATE (spec §D) — not an evidence
// row. NO persistence here. NO third-party requests. Exactly one primary
// ("Start practice"). Reading screen — no autofocus steal.

import { useState } from "react";
import Link from "next/link";
import { Card } from "../../../../../components/ui/Card";
import { Button } from "../../../../../components/ui/Button";
import { Progress } from "../../../../../components/ui/Progress";
import { StatusPill } from "../../../../../components/ui/StatusPill";
import { AlertPanel } from "../../../../../components/ui/Panels";
import { ArrowLeftIcon, ArrowRightIcon } from "../../../../../components/ui/icons";
import { CoordinatePlane } from "../../../../../components/learning/CoordinatePlane";
import { NumberLine } from "../../../../../components/learning/NumberLine";
import { StepReveal } from "../../../../../components/learning/StepReveal";
import type {
  ContextHooks,
  MasteryStatus,
  Phase,
  Sport,
  VisualKind,
  WorkedExample,
} from "../../../../../types";

const STATUS_FILL: Record<MasteryStatus, string> = {
  unknown: "var(--color-status-unknown)",
  introduced: "var(--color-status-introduced)",
  developing: "var(--color-status-developing)",
  near_mastery: "var(--color-status-near-mastery)",
  mastered: "var(--color-status-mastered)",
  needs_review: "var(--color-status-needs-review)",
  prerequisite_gap: "var(--color-status-prerequisite-gap)",
};

const PHASE_LABEL: Record<Phase, string> = {
  1: "Sports context",
  2: "Blended",
  3: "Neutral transfer",
};

const SPORT_LABEL: Record<Sport, string> = {
  baseball: "Baseball",
  softball: "Softball",
  basketball: "Basketball",
  soccer: "Soccer",
  football: "Football",
  volleyball: "Volleyball",
  neutral: "Standard",
};

const deAmp = (s: string): string => s.replace(/\s*&\s*/g, " and ");

const LINK_QUIET =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-sans text-[14px] " +
  "px-2 py-1 bg-transparent text-ink-500 font-medium transition-colors duration-150 " +
  "ease-[cubic-bezier(.2,.7,.2,1)] hover:bg-hover " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const LINK_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-sans text-[14px] " +
  "px-[22px] py-[11px] bg-accent text-white font-semibold transition-colors duration-150 " +
  "ease-[cubic-bezier(.2,.7,.2,1)] hover:bg-accent-hover active:translate-y-px " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export interface LearnClientProps {
  skillId: string;
  title: string;
  objective: string;
  domainLabel: string;
  status: MasteryStatus;
  phase: Phase;
  mastery: number;
  visual: VisualKind | null;
  contextHooks: ContextHooks;
  workedExamples: WorkedExample[];
  sport: Sport;
  prereqs: { skillId: string; title: string; status: MasteryStatus }[];
  weakPrereq: { skillId: string; title: string } | null;
  gateWorkedExample: boolean;
  hasPractice: boolean;
}

export function LearnClient(props: LearnClientProps) {
  const {
    skillId,
    title,
    objective,
    domainLabel,
    status,
    phase,
    mastery,
    visual,
    contextHooks,
    workedExamples,
    sport,
    prereqs,
    weakPrereq,
    gateWorkedExample,
    hasPractice,
  } = props;

  const [exampleSeen, setExampleSeen] = useState(false);
  const locked = weakPrereq !== null;

  // Practice unlock: not locked, has a bank, and (if gated) the example was
  // marked reviewed this session.
  const practiceReady = !locked && hasPractice && (!gateWorkedExample || exampleSeen);

  return (
    <div className="fade-in mx-auto max-w-[1140px]">
      <Link href="/student" className={`${LINK_QUIET} mb-[18px]`}>
        <ArrowLeftIcon aria-hidden />
        Learning home
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            {deAmp(domainLabel)}
          </p>
          <h1 className="font-display text-[30px] font-semibold leading-[1.2] tracking-[-0.3px] text-ink">
            {title}
          </h1>
          <p className="mt-3 max-w-[560px] text-[16px] leading-[1.55] text-ink-500">
            {objective}
          </p>
        </div>
        {/* Standing card — NO numeral score (direction §0.3). */}
        <Card padding="compact" className="w-full shrink-0 lg:w-[220px]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            Mastery
          </p>
          <StatusPill status={status} />
          <Progress
            value={mastery}
            height={6}
            fill={STATUS_FILL[status]}
            label="Mastery on this skill"
            className="mt-2.5"
          />
          <div className="my-3.5 h-px bg-selected" />
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            Context phase
          </p>
          <p className="text-[13.5px] font-medium text-ink-700">{PHASE_LABEL[phase]}</p>
        </Card>
      </div>

      {/* Prereq strip */}
      <div className="mb-5 mt-5">
        {locked && weakPrereq ? (
          <AlertPanel>
            <span>
              <strong className="font-semibold">{deAmp(title)}</strong> builds on{" "}
              {deAmp(weakPrereq.title)}, which isn&rsquo;t solid yet. Start there first
              &mdash; this skill stays ready for you.
            </span>
          </AlertPanel>
        ) : (
          <Card padding="compact">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
                Prerequisites
              </span>
              {prereqs.length === 0 ? (
                <span className="text-[13.5px] text-ink-500">
                  Foundational skill — nothing required before this.
                </span>
              ) : (
                prereqs.map((p) => (
                  <span key={p.skillId} className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-ink-700">
                      {deAmp(p.title)}
                    </span>
                    <StatusPill status={p.status} small />
                  </span>
                ))
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* LEFT: lesson area + worked example */}
        <div className="flex flex-col gap-5">
          <LessonArea visual={visual} contextHooks={contextHooks} sport={sport} phase={phase} />

          <Card>
            <p className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-accent">
              Worked example
            </p>
            <WorkedExampleArea
              workedExamples={workedExamples}
              onAdvanced={() => setExampleSeen(true)}
            />
            {gateWorkedExample && !exampleSeen && !locked && (
              <p className="mt-4 text-[12.5px] text-ink-500">
                See the example once, then you start practicing.
              </p>
            )}
          </Card>
        </div>

        {/* RIGHT rail: video slots + context bridge */}
        <div className="flex flex-col gap-5">
          <VideoSlots />
          <ContextBridge contextHooks={contextHooks} sport={sport} phase={phase} />
        </div>
      </div>

      {/* Primary */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {locked && weakPrereq ? (
          <Link href={`/student/learn/${weakPrereq.skillId}`} className={LINK_PRIMARY}>
            Go to {deAmp(weakPrereq.title)}
            <ArrowRightIcon aria-hidden />
          </Link>
        ) : practiceReady ? (
          <Link href={`/student/practice/${skillId}`} className={LINK_PRIMARY}>
            Start practice
            <ArrowRightIcon aria-hidden />
          </Link>
        ) : hasPractice ? (
          // Gated but example not yet reviewed — a quiet review confirmation
          // (UI gate, spec §D). Marking it reviewed unlocks the primary.
          <Button variant="primary" disabled>
            Start practice
            <ArrowRightIcon aria-hidden />
          </Button>
        ) : (
          <Button variant="primary" disabled>
            Practice for this skill is being prepared.
          </Button>
        )}
        {!locked && hasPractice && (
          <p className="text-[12.5px] text-ink-500">A short set in this phase.</p>
        )}
        {gateWorkedExample && !exampleSeen && !locked && hasPractice && (
          <Button variant="quiet" onClick={() => setExampleSeen(true)}>
            I&rsquo;ve read through the example
          </Button>
        )}
        {!hasPractice && (
          <Link href="/student" className={LINK_QUIET}>
            Back to learning home
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lesson area — THE interactive core. One touchable thing per node.visual.
// ---------------------------------------------------------------------------

function LessonArea({
  visual,
  contextHooks,
  sport,
  phase,
}: {
  visual: VisualKind | null;
  contextHooks: ContextHooks;
  sport: Sport;
  phase: Phase;
}) {
  const concept = phase === 3 ? contextHooks.neutral : contextHooks[sport];
  return (
    <Card>
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.4px] text-accent">
        The idea
      </p>
      <p className="mb-5 max-w-[44ch] text-[16px] leading-[1.5] text-ink-800">{concept}</p>
      <Manipulable visual={visual} phase={phase} sport={sport} />
    </Card>
  );
}

/** The touchable handle. Axis labels carry the sport→neutral fade (spec §E). */
function Manipulable({
  visual,
  phase,
  sport,
}: {
  visual: VisualKind | null;
  phase: Phase;
  sport: Sport;
}) {
  const [points, setPoints] = useState([
    { x: 2, y: 3 },
    { x: 6, y: 7 },
  ]);
  const [marker, setMarker] = useState(2);

  if (visual === "coordinate") {
    // P1 sport semantics on the axes; neutral x/y by P3.
    const sportAxes = phase <= 1 && sport !== "neutral";
    return (
      <div>
        <CoordinatePlane
          points={points}
          onChange={setPoints}
          showLine
          showRiseRun
          xLabel={sportAxes ? "games" : "x"}
          yLabel={sportAxes ? "total" : "y"}
        />
        <p className="mt-2 text-[13px] text-ink-500">
          Drag a point. Watch the line and its equation change.
        </p>
      </div>
    );
  }
  if (visual === "numberline") {
    return (
      <div>
        <NumberLine value={marker} onChange={setMarker} from={-10} to={10} operationDelta={3} />
        <p className="mt-2 text-[13px] text-ink-500">
          Drag the marker. Watch the operation arc move with it.
        </p>
      </div>
    );
  }
  // null visual → a completion-mode StepReveal promoted as the manipulable.
  return (
    <div>
      <StepReveal
        problem="Try the idea step by step."
        steps={[
          "Read what the problem is asking.",
          "Set up the one operation that answers it.",
          "Carry it out and state the result.",
        ]}
        result="That's the shape of every problem in this skill."
        blankStepIndex={1}
        blankAnswer="multiply"
      />
      <p className="mt-2 text-[13px] text-ink-500">
        Reveal each step. Fill the blank to keep going.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Worked example — support fades by phase (spec §E / direction §1).
// ---------------------------------------------------------------------------

function WorkedExampleArea({
  workedExamples,
  onAdvanced,
}: {
  workedExamples: WorkedExample[];
  onAdvanced: () => void;
}) {
  const we = workedExamples[0];
  if (!we || we.steps.length === 0) {
    return (
      <p className="text-[13.5px] text-ink-500">
        A worked example for this skill is being prepared.
      </p>
    );
  }
  const steps = we.steps.map((s) => s.reveal);
  const result = steps[steps.length - 1];
  // BLOCKER A (mr-kahn option a): these steps are full PROSE reveal paragraphs,
  // not short tokens — feeding one as a fill-in answer is an un-passable wall
  // for exactly the P2/P3 learners it was shown to. Prose worked examples are
  // REVEAL-ONLY at every phase (no completion blank). The phase fade becomes
  // reveal-pacing only — the accepted tradeoff. (The standalone Manipulable
  // StepReveal that uses a short token like "multiply" keeps its blank.)

  return (
    // Marking the example seen on any interaction within the stepper satisfies
    // the session gate (spec §D) — a UI precondition, never an evidence row.
    <div onPointerDownCapture={onAdvanced} onKeyDownCapture={onAdvanced}>
      <StepReveal problem={we.title} steps={steps} result={result} blankStepIndex={null} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video slots — calm empty slot, no dark theme, no fake thumbnail (§0.10).
// ---------------------------------------------------------------------------

function VideoSlots() {
  const chips = ["Alternate explanation", "Remediation clip", "Worked example", "External resource"];
  return (
    <Card>
      <p className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        Lesson video
      </p>
      <div className="flex aspect-video items-center justify-center rounded-[10px] border border-border bg-inset">
        <div className="flex flex-col items-center gap-2 px-6 text-center">
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-400 text-ink-400"
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M5 3.5v9l7-4.5z" />
            </svg>
          </span>
          <p className="text-[13px] text-ink-500">
            Primary lesson video — not yet added for this skill.
          </p>
        </div>
      </div>
      <div className="mt-3.5 flex flex-col gap-2">
        {chips.map((c, i) => (
          <div
            key={c}
            className="flex items-center justify-between rounded-[8px] bg-inset px-3 py-2 text-[13px] text-ink-500"
          >
            <span>{c}</span>
            {i === chips.length - 1 && <ArrowRightIcon aria-hidden />}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Context bridge — phase fade IS the point (spec §E / direction §1).
// ---------------------------------------------------------------------------

function ContextBridge({
  contextHooks,
  sport,
  phase,
}: {
  contextHooks: ContextHooks;
  sport: Sport;
  phase: Phase;
}) {
  const sportHook = contextHooks[sport];
  const neutralHook = contextHooks.neutral;
  const sportName = SPORT_LABEL[sport].toUpperCase();

  // P3 (or neutral-track): only the neutral half, at full emphasis. For a
  // sport learner at P3, a faded breadcrumb back to where they first met the
  // idea (mr-kahn #3, direction §1.6) — decorative, muted; teaching stays
  // neutral. Suppressed on the neutral track (there is no prior sport framing).
  if (phase >= 3 || sport === "neutral") {
    const showBreadcrumb = phase >= 3 && sport !== "neutral";
    return (
      <Card>
        <p className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-accent">
          In context
        </p>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
          Standard notation
        </p>
        <p className="text-[14px] leading-[1.55] text-ink-800">{neutralHook}</p>
        {showBreadcrumb && (
          <p className="mt-3.5 text-[12.5px] leading-[1.5] text-ink-500">
            You first saw this as: {sportHook}
          </p>
        )}
      </Card>
    );
  }

  // P1: sport prominent (ink-800) → neutral muted (ink-500).
  // P2: both halves at parity (ink-700); sport label drops to "EXAMPLE".
  const parity = phase === 2;
  return (
    <Card>
      <p className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-accent">
        In context
      </p>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        {parity ? "Example" : `${sportName} example`}
      </p>
      <p
        className={`text-[14px] leading-[1.55] ${parity ? "text-ink-700" : "text-ink-800"}`}
      >
        {sportHook}
      </p>
      <div className="my-3.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.4px] text-ink-400">
        <span className="h-px flex-1 bg-selected" />
        transfers to
        <span className="h-px flex-1 bg-selected" />
      </div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        Standard notation
      </p>
      <p
        className={`text-[13.5px] leading-[1.55] ${parity ? "text-ink-700" : "text-ink-500"}`}
      >
        {neutralHook}
      </p>
    </Card>
  );
}
