// Learning Home (Phase 3 — phase3-direction.md SURFACE 2, binding). SERVER
// component: cookie → server-only repository → profile + states + graph, then
// computeMasteryAll + computeOverlay + recommend run ONCE per request. No
// engine logic is inlined — the committed pure functions decide everything.
// The acceleration strip derives from diagnosticCreditedSkills(updates) fed
// into recommend({ justCredited }). No third-party requests.

import Link from "next/link";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Progress } from "../../../components/ui/Progress";
import { StatusPill } from "../../../components/ui/StatusPill";
import { AlertPanel, InsetPanel } from "../../../components/ui/Panels";
import { CheckIcon } from "../../../components/ui/icons";
import { getRepository } from "../../../lib/repository/server";
import { computeMasteryAll } from "../../../lib/mastery-engine";
import { computeOverlay } from "../../../lib/graph/overlay";
import { recommend } from "../../../lib/adaptive-router";
import {
  diagnosticCreditedSkills,
  diagnosticTaken,
} from "../../../lib/diagnostic-engine";
import { getCurrentStudentId } from "../../../lib/auth/session";
import { phaseLabel } from "../../../lib/session-helpers";
import type {
  CurriculumGraph,
  MasteryUpdate,
  Phase,
  Sport,
  StudentAttempt,
  StudentSkillState,
} from "../../../types";

// Link-as-button styles mirroring the Button primitive (md sizes). Navigation
// from a server component needs <Link>; these copy the committed classes —
// no new primitive, no new tokens.
const LINK_BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-sans " +
  "transition-colors duration-150 ease-[cubic-bezier(.2,.7,.2,1)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "active:translate-y-px";
const LINK_BTN_PRIMARY = `${LINK_BTN_BASE} bg-accent text-white font-semibold hover:bg-accent-hover text-[14px] px-[22px] py-[11px]`;
const LINK_BTN_SECONDARY = `${LINK_BTN_BASE} bg-surface border border-border-strong text-ink font-medium hover:bg-hover text-[14px] px-[22px] py-[11px]`;
const LINK_BTN_QUIET = `${LINK_BTN_BASE} bg-transparent text-ink-500 font-medium hover:bg-hover text-[14px] px-2 py-1`;

const deAmp = (label: string): string => label.replace(/\s*&\s*/g, " and ");

function standingLine(avg: number): string {
  if (avg < 0.25) return "Just getting started";
  if (avg < 0.5) return "Building your foundation";
  if (avg <= 0.8) return "Making strong progress";
  return "Nearly there";
}

function relativeTime(iso: string, nowMs: number): string {
  const days = Math.floor((nowMs - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "Last week" : `${weeks} weeks ago`;
}

export default async function StudentHomePage() {
  // Identity seam (C2 S1) — memory/supabase resolved in one place, consent-gated.
  const studentId = await getCurrentStudentId();

  if (!studentId) return <NoStudent />;

  let graph: CurriculumGraph;
  let states: Record<string, StudentSkillState>;
  let updates: MasteryUpdate[];
  let attempts: StudentAttempt[];
  let sport: Sport;
  try {
    const repo = await getRepository();
    const student = await repo.getStudent(studentId);
    if (!student) return <NoStudent />;
    sport = student.sport;
    [graph, states, updates, attempts] = await Promise.all([
      repo.getGraph(),
      repo.getSkillStates(studentId),
      repo.listMasteryUpdates(studentId),
      repo.listAttempts(studentId),
    ]);
  } catch {
    // Never render half a dashboard (phase3-direction.md edge state).
    return (
      <div className="fade-in">
        <PageHeader eyebrow="Your course" title="Here's exactly where you are." />
        <AlertPanel>
          We couldn&rsquo;t load your dashboard just now. Refresh to try again.
        </AlertPanel>
      </div>
    );
  }

  // Engine — ONCE per request, committed pure functions only.
  const nowIso = new Date().toISOString();
  const batch = computeMasteryAll(studentId, states, graph, nowIso);
  const overlay = computeOverlay(graph, states, batch.results);
  const credited = diagnosticCreditedSkills(updates);
  const rec = recommend(batch.results, states, graph, { justCredited: credited });
  // Completion comes from the append-only ATTEMPT log (source "diagnostic"),
  // never from credit updates — an all-wrong run completes with zero credit
  // and must still suppress the "Before you start" nag. Acceleration (below)
  // stays credit-driven via diagnosticCreditedSkills.
  const hasTakenDiagnostic = diagnosticTaken(attempts);

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const recNode = rec.skillId ? nodeById.get(rec.skillId) : undefined;
  const recStatus = rec.skillId ? batch.results[rec.skillId]?.status : undefined;
  const recPhase: Phase = states[rec.skillId]?.phase ?? 1;

  const overall =
    overlay.nodes.length === 0
      ? 0
      : overlay.nodes.reduce((a, n) => a + n.mastery, 0) / overlay.nodes.length;

  // Acceleration strip data: directly demonstrated skills (trigger
  // "diagnostic"); shown only when the router is actively accelerating.
  const provenIds: string[] = [];
  for (const u of updates) {
    if (u.trigger === "diagnostic" && !provenIds.includes(u.skillId)) provenIds.push(u.skillId);
  }
  // de-amped: this title is only ever interpolated into a flowing sentence
  // (the strip body). Standalone headings keep the catalog-style "&".
  const topProvenTitle =
    provenIds.length > 0
      ? deAmp(
          nodeById.get(provenIds[provenIds.length - 1])?.title ??
            provenIds[provenIds.length - 1],
        )
      : null;
  const showAcceleration = rec.kind === "accelerate" && topProvenTitle !== null;

  // Recent activity: practice sessions only (the diagnostic is provenance,
  // not a learning session — `source` is read-side audit/display only and
  // never enters any engine math).
  const practice = attempts.filter((a) => a.source === "practice");
  const bySkill = new Map<string, StudentAttempt[]>();
  for (const a of practice) {
    const list = bySkill.get(a.skillId);
    if (list) list.push(a);
    else bySkill.set(a.skillId, [a]);
  }
  const nowMs = Date.parse(nowIso);
  const activity = [...bySkill.entries()]
    .map(([skillId, list]) => ({
      skillId,
      title: nodeById.get(skillId)?.title ?? skillId,
      count: list.length,
      // Fraction form, never a student-facing % (project-wide rule; consistent
      // with the Summary stat row "{correct} of {count}").
      correct: list.filter((a) => a.correct).length,
      latest: list[list.length - 1].createdAt,
    }))
    .sort((a, b) => b.latest.localeCompare(a.latest) || a.skillId.localeCompare(b.skillId))
    .slice(0, 5);

  // Quick review target: the oldest-mastered skill (Phase 4 wires the real
  // tune-up; the link lands on the existing learn placeholder).
  const tuneUpSkillId =
    Object.entries(states)
      .filter(([, s]) => s.masteredAt !== null)
      .sort(
        (a, b) =>
          (a[1].masteredAt as string).localeCompare(b[1].masteredAt as string) ||
          a[0].localeCompare(b[0]),
      )[0]?.[0] ?? null;

  return (
    <div className="fade-in">
      <PageHeader eyebrow="Your course" title="Here's exactly where you are." />

      {!hasTakenDiagnostic && (
        <InsetPanel label="Before you start" className="mb-5">
          <span>
            For the most accurate starting point, take the ten-minute diagnostic
            first.{" "}
            <Link
              href="/student/diagnostic"
              className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Take the diagnostic
            </Link>
          </span>
        </InsetPanel>
      )}

      {/* Hero row */}
      <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-[1.55fr_1fr]">
        {/* Recommended next */}
        <Card>
          <p className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-accent">
            Recommended next
          </p>
          {rec.kind === "complete" || !recNode ? (
            <>
              <h2 className="font-display text-[24px] font-semibold leading-[1.25] text-ink">
                You&rsquo;ve mastered the current map.
              </h2>
              <p className="mt-3 max-w-[460px] text-[14.5px] leading-[1.55] text-ink-500">
                Every skill we&rsquo;ve mapped is solid. New material unlocks as
                the course expands.
              </p>
              <div className="mt-5">
                <TuneUpButton tuneUpSkillId={tuneUpSkillId} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-[24px] font-semibold leading-[1.25] text-ink">
                  {recNode.title}
                </h2>
                {recStatus && <StatusPill status={recStatus} />}
              </div>
              <p className="mb-[18px] mt-3 max-w-[460px] text-[14.5px] leading-[1.55] text-ink-500">
                {recNode.objective}
              </p>
              <InsetPanel label="Why this, now" className="mb-5">
                {/* Router reasons can name skills — de-amp prose only. */}
                {deAmp(rec.reason)}
              </InsetPanel>
              <div className="flex items-center gap-3.5">
                <Link href={`/student/learn/${recNode.id}`} className={LINK_BTN_PRIMARY}>
                  Start learning session
                </Link>
                <p className="text-[12.5px] text-ink-500">
                  Current phase:{" "}
                  <span className="font-medium text-ink-700">{phaseLabel(recPhase, sport)}</span>
                </p>
              </div>
            </>
          )}
        </Card>

        {/* Course standing — qualitative, NO percentage */}
        <Card>
          <p className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            Course standing
          </p>
          <p className="mb-3 text-[14px] leading-[1.55] text-ink-700">
            {standingLine(overall)}
          </p>
          <Progress value={overall} height={6} label="Overall course standing" />
          <div className="mt-5 grid gap-4">
            {graph.domains.map((d) => {
              const dp = overlay.summary.domainProgress[d.id];
              if (!dp) return null;
              return (
                <div key={d.id}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[13px] font-medium text-ink-700">
                      {deAmp(d.label)}
                    </span>
                    <span className="font-mono text-[12px] text-ink-500">
                      {dp.mastered}/{dp.total}
                    </span>
                  </div>
                  <Progress
                    value={dp.avgMastery}
                    height={6}
                    label={`${deAmp(d.label)} progress`}
                    fill={
                      dp.avgMastery > 0.8
                        ? "var(--color-status-mastered)"
                        : "var(--color-accent)"
                    }
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Prerequisite-lock alert */}
      {rec.kind === "remediate" && rec.blockedSkill && (
        <AlertPanel className="mt-5">
          <span>
            <strong className="font-semibold">{deAmp(rec.blockedSkill)}</strong> is
            locked for now. We&rsquo;re routing you to the skill it depends on
            first, so you&rsquo;re never stuck on something you haven&rsquo;t
            been set up for.
          </span>
        </AlertPanel>
      )}

      {/* Acceleration callout — success-toned, NOT the error channel */}
      {showAcceleration && (
        <div
          className="mt-5 flex items-start gap-3.5 rounded-[10px] border border-success-border bg-success-bg px-5 py-4"
          role="status"
        >
          <CheckIcon className="mt-[3px] shrink-0 text-[var(--color-status-mastered)]" />
          <div>
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.4px] text-[var(--color-status-mastered)]">
              Moved you forward
            </p>
            <p className="text-[13.5px] leading-[1.5] text-ink-700">
              {provenIds.length === 1 ? (
                <>
                  You proved {topProvenTitle} in the diagnostic. We&rsquo;re not
                  going to waste your time re-teaching it &mdash; you&rsquo;re
                  starting further along.
                </>
              ) : (
                <>
                  You proved {provenIds.length} skills in the diagnostic &mdash;
                  including {topProvenTitle}. We&rsquo;re not re-teaching what
                  you already know; you&rsquo;re starting further along.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Lower row */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Recent activity */}
        <Card>
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            Recent activity
          </p>
          {activity.length === 0 ? (
            <InsetPanel>
              No sessions yet. Your first learning session will show up here
              &mdash; including a quick way to revisit it later.
            </InsetPanel>
          ) : (
            <div>
              {activity.map((row, i) => (
                <div
                  key={row.skillId}
                  className={`flex items-start justify-between py-[11px] ${
                    i > 0 ? "border-t border-selected" : ""
                  }`}
                >
                  <div>
                    <p className="text-[14px] font-medium text-ink">{row.title}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-500">
                      {row.count} problem{row.count === 1 ? "" : "s"} &middot;{" "}
                      {row.correct} of {row.count} correct
                    </p>
                  </div>
                  <p className="text-[12px] text-ink-500">
                    {relativeTime(row.latest, nowMs)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick review */}
        <Card className="flex flex-col justify-between">
          <div>
            <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
              Quick review
            </p>
            <h2 className="font-display text-[18px] font-semibold leading-[1.4] text-ink">
              90-second tune-up
            </h2>
            <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-500">
              Revisit a skill you mastered a while ago. A short refresher keeps
              it sharp &mdash; it&rsquo;s a feature, not a step back.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-3.5">
            <TuneUpButton tuneUpSkillId={tuneUpSkillId} />
            <Link href="/student/diagnostic" className={LINK_BTN_QUIET}>
              Retake the placement diagnostic
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Secondary tune-up action — disabled until something is mastered. */
function TuneUpButton({ tuneUpSkillId }: { tuneUpSkillId: string | null }) {
  if (!tuneUpSkillId) {
    return (
      <Button variant="secondary" disabled>
        Start a tune-up
      </Button>
    );
  }
  return (
    <Link href={`/student/learn/${tuneUpSkillId}`} className={LINK_BTN_SECONDARY}>
      Start a tune-up
    </Link>
  );
}

/** No-cookie / unknown-student edge state — the committed placeholder copy. */
function NoStudent() {
  return (
    <div className="fade-in">
      <PageHeader eyebrow="Your course" title="Here's exactly where you are." />
      <Card>
        <InsetPanel label="Get started">
          <span>
            You haven&rsquo;t set up your course yet.{" "}
            <Link
              href="/student/onboarding"
              className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Set up your course
            </Link>{" "}
            to begin.
          </span>
        </InsetPanel>
      </Card>
    </div>
  );
}
