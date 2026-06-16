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
import { LessonVideo } from "../../../../../components/learning/LessonVideo";
import { StepReveal } from "../../../../../components/learning/StepReveal";
import { workedInteractionsFor } from "../../../../../components/learning/alg-f01-worked-interactions";
import { MathText } from "../../../../../components/ui/MathText";
import { ProblemVisual } from "../../../../../components/learning/ProblemVisual";
import { BalanceScale } from "../../../../../components/learning/BalanceScale";
import { phaseLabel } from "../../../../../lib/session-helpers";
import { selectInContext } from "../../../../../lib/learn-content/in-context";
import type { Equation } from "../../../../../components/learning/balance-scale-math";
import type {
  ContextHooks,
  CoordinateSpec,
  MasteryStatus,
  NumberLineSpec,
  Phase,
  Sport,
  VisualKind,
  VisualSpec,
  WorkedExample,
} from "../../../../../types";

/**
 * The Learn lesson area's EXPLORE seed — DERIVED server-side from the node's
 * REAL data (a representative problem's authored visualSpec, or the node's
 * equation), never an authored field. A null seed (no usable data) degrades to
 * the StepReveal manipulable.
 */
export type LearnExploreSeed =
  | { kind: "coordinate"; spec: CoordinateSpec }
  | { kind: "numberline"; spec: NumberLineSpec }
  | { kind: "balance"; equation: Equation };

/**
 * A supplementary lesson video, ready for the player (Phase 11 Workstream D).
 * Carries ONLY a server-minted, signed, expiring URL — NEVER the bare playback
 * id (D4: a leak would be a type error). Empty list → the rail renders nothing.
 */
export interface LearnVideo {
  signedUrl: string;
  captionsUrl?: string;
  title?: string;
  posterUrl?: string;
}

const STATUS_FILL: Record<MasteryStatus, string> = {
  unknown: "var(--color-status-unknown)",
  introduced: "var(--color-status-introduced)",
  developing: "var(--color-status-developing)",
  near_mastery: "var(--color-status-near-mastery)",
  mastered: "var(--color-status-mastered)",
  needs_review: "var(--color-status-needs-review)",
  prerequisite_gap: "var(--color-status-prerequisite-gap)",
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
  /** EXPLORE seed derived from this node's real data; null → StepReveal fallback. */
  exploreSeed: LearnExploreSeed | null;
  contextHooks: ContextHooks;
  workedExamples: WorkedExample[];
  sport: Sport;
  prereqs: { skillId: string; title: string; status: MasteryStatus }[];
  weakPrereq: { skillId: string; title: string } | null;
  gateWorkedExample: boolean;
  hasPractice: boolean;
  /** Supplementary lesson videos (signed URLs only). Empty → no video card. */
  videos: LearnVideo[];
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
    exploreSeed,
    contextHooks,
    workedExamples,
    sport,
    prereqs,
    weakPrereq,
    gateWorkedExample,
    hasPractice,
    videos,
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
          <p className="text-[13.5px] font-medium text-ink-700">{phaseLabel(phase, sport)}</p>
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
          <LessonArea
            visual={visual}
            exploreSeed={exploreSeed}
            contextHooks={contextHooks}
            sport={sport}
            phase={phase}
          />

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

        {/* RIGHT rail: supplementary lesson video (secondary, above the bridge)
            + context bridge. No video / disabled mode → the video Card is not
            rendered at all and the rail reflows (D7). */}
        <div className="flex flex-col gap-5">
          {videos.length > 0 && (
            <Card>
              <LessonVideo
                signedUrl={videos[0].signedUrl}
                captionsUrl={videos[0].captionsUrl}
                title={videos[0].title}
                posterUrl={videos[0].posterUrl}
              />
            </Card>
          )}
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
          <p className="text-[12.5px] text-ink-500">
            Work through the example to the result to start practice.
          </p>
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
  exploreSeed,
  contextHooks,
  sport,
  phase,
}: {
  visual: VisualKind | null;
  exploreSeed: LearnExploreSeed | null;
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
      {/* concept text — notation renders inline at the host size/ink (size+color
          inherit); prose+math segmented by MathText. Raw concept unchanged. */}
      <p className="mb-5 max-w-[44ch] text-[16px] leading-[1.5] text-ink-800">
        <MathText>{concept}</MathText>
      </p>
      <Manipulable
        visual={visual}
        exploreSeed={exploreSeed}
        phase={phase}
        sport={sport}
      />
    </Card>
  );
}

/**
 * The touchable handle.
 *
 * When the node's real data yields an explore seed (B2's authored coordinate /
 * numberline visualSpecs, or an equation parsed from the node), the lesson area
 * renders a GENUINE explore manipulable seeded from that data: drag changes
 * THIS lesson's math, Reset returns to the seed. With NO usable seed it
 * degrades to the StepReveal manipulable (never a blank or broken plane).
 */
function Manipulable({
  exploreSeed,
  phase,
  sport,
}: {
  visual: VisualKind | null;
  exploreSeed: LearnExploreSeed | null;
  phase: Phase;
  sport: Sport;
}) {
  if (exploreSeed) {
    return <ExploreManipulable seed={exploreSeed} phase={phase} sport={sport} />;
  }

  // No usable seed → a GENERIC "try the idea" stepper. It must NOT clone the
  // node's worked example (the Worked-example card already shows that below —
  // rendering it here too was the "idea == worked example" duplication bug).
  // Seedless numberline nodes get a synthesized interactive line instead via
  // deriveExploreSeed, so they never reach this fallback.
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
        blankStepIndex={null}
      />
      <p className="mt-2 text-[13px] text-ink-500">Reveal each step.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Explore manipulable — a genuine touchable seeded from THIS node's real data.
// coordinate/numberline run interactive+explore through the shared ProblemVisual
// mapper (controlled here so the live geometry changes the lesson's math); a
// "Start over" returns to the seed. balance wraps BalanceScale, which owns its
// own action row + reset. All three are degrade-safe at the caller (a null seed
// never reaches here).
// ---------------------------------------------------------------------------

function ExploreManipulable({
  seed,
  phase,
  sport,
}: {
  seed: LearnExploreSeed;
  phase: Phase;
  sport: Sport;
}) {
  if (seed.kind === "balance") {
    return (
      <div>
        <BalanceScale initial={seed.equation} />
        <p className="mt-2 text-[13px] text-ink-500">
          Do the same to both sides until x stands alone.
        </p>
      </div>
    );
  }
  return <ExplorePlane seed={seed} phase={phase} sport={sport} />;
}

/**
 * Controlled coordinate/numberline explore. The seed (from the node's real
 * visualSpec) becomes interactive geometry the student drags; "Start over"
 * restores the seed. The spec's mode is forced to "interactive" so the lesson
 * primitive is genuinely touchable, and `explore` is passed so the coordinate
 * plane appends up to its concept cap (the adapter fix routes append on this
 * flag, not on affordances).
 */
function ExplorePlane({
  seed,
  phase,
  sport,
}: {
  seed: { kind: "coordinate"; spec: CoordinateSpec } | { kind: "numberline"; spec: NumberLineSpec };
  phase: Phase;
  sport: Sport;
}) {
  const seedSpec: VisualSpec = { ...seed.spec, mode: "interactive" };
  const [live, setLive] = useState<VisualSpec>(seedSpec);
  return (
    <div>
      <ProblemVisual
        visual={seed.kind}
        visualSpec={live}
        sport={sport}
        phase={phase}
        explore
        onChange={setLive}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-500">
          {seed.kind === "coordinate"
            ? "Drag the points — the line and its equation follow."
            : "Drag the marker — the jump follows."}
        </p>
        <Button variant="quiet" size="sm" type="button" onClick={() => setLive(seedSpec)}>
          Start over
        </Button>
      </div>
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
  // Worked-example interactivity (Phase 06): when a skill has an authored
  // interaction script (ALG-F01 today, via workedInteractionsFor) the stepper
  // MIXES reveal + predict-the-next-move + type-a-short-step. Skills without a
  // script pass `undefined` → every step is a plain reveal (unchanged). Long
  // prose steps are never forced into a type-in wall — only authored short
  // tokens become fills; everything else reveals or is a 2–3 option predict.
  const interactions = workedInteractionsFor(we.id);

  return (
    // §7 no-slideshow gate: practice unlocks only when the student steps/commits all
    // the way to the result (onComplete) — NOT on any stray pointer/key. For nodes
    // with fill/predict interactions, completion required committing those answers.
    <StepReveal
      problem={we.title}
      steps={steps}
      result={result}
      interactions={interactions}
      onComplete={onAdvanced}
    />
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
  // M3 de-dup (Option B): IN CONTEXT shows ONLY what THE IDEA card did not.
  // The pure selector drops anything equal to THE IDEA's concept and returns
  // "none" when nothing distinct remains (then this card renders nothing — no
  // filler). THE IDEA card itself is unchanged.
  const view = selectInContext(phase, sport, contextHooks);
  if (view.kind === "none") return null;

  if (view.kind === "breadcrumb") {
    // Sport P3: THE IDEA already showed the neutral hook. A faded breadcrumb
    // back to where the student first met the idea (mr-kahn #3) — muted only.
    return (
      <Card>
        <p className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-accent">
          In context
        </p>
        <p className="text-[12.5px] leading-[1.5] text-ink-500">
          You first saw this as: <MathText>{view.sportHook}</MathText>
        </p>
      </Card>
    );
  }

  // Sport P1/P2: THE IDEA showed the sport hook; IN CONTEXT shows the standard
  // notation it bridges to.
  return (
    <Card>
      <p className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-accent">
        In context
      </p>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        Standard notation
      </p>
      <p className="text-[14px] leading-[1.55] text-ink-800">
        <MathText>{view.body}</MathText>
      </p>
    </Card>
  );
}
