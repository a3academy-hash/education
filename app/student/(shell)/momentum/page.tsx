// /student/momentum — the incentive layer (Phase "06", Alpha-style, NO currency).
// SERVER component, self-scoped via getCurrentStudentId() like the rest of
// /student/(shell). Reads committed state + the attempt log, runs the committed
// pure functions ONCE (computeMasteryAll + computeMomentum + recommend), and
// renders competence-anchored momentum: a course-mastery ring, a daily
// productive-minutes (XP) ring, a "time given back" estimate, and a current-skill
// mastery ring toward the 90% bar. No engine logic is inlined.
//
// STANDARD NOTE: this surface introduces XP (= productive minutes), progress
// rings, and a mastery percentage — a deliberate, Matt-approved evolution of the
// prior "no gamification / no percentages" product standard. There is no
// currency, leaderboard, streak, or confetti.

import Link from "next/link";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { Card } from "../../../../components/ui/Card";
import { InsetPanel } from "../../../../components/ui/Panels";
import { StatusPill } from "../../../../components/ui/StatusPill";
import { ProgressRing } from "../../../../components/gamification/ProgressRing";
import { RingTrio } from "../../../../components/gamification/RingTrio";
import { getRepository } from "../../../../lib/repository/server";
import { computeMasteryAll, MASTERY_CONFIG } from "../../../../lib/mastery-engine";
import { recommend } from "../../../../lib/adaptive-router";
import { getCurrentStudentId } from "../../../../lib/auth/session";
import {
  computeMomentum,
  humanizeMinutes,
  masteryRingFraction,
} from "../../../../lib/gamification";

const LINK_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-sans bg-accent text-white " +
  "font-semibold hover:bg-accent-hover text-[14px] px-[22px] py-[11px] transition-colors " +
  "duration-150 ease-[cubic-bezier(.2,.7,.2,1)] focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px";

function standingLine(fraction: number): string {
  if (fraction <= 0) return "Just getting started";
  if (fraction < 0.34) return "Building your foundation";
  if (fraction < 0.75) return "Making strong progress";
  if (fraction < 1) return "Nearly there";
  return "Course mastered";
}

export default async function MomentumPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) return <NoStudent />;

  const repo = await getRepository();
  const profile = await repo.getStudent(studentId);
  if (!profile) return <NoStudent />;

  const [graph, states, attempts] = await Promise.all([
    repo.getGraph(),
    repo.getSkillStates(studentId),
    repo.listAttempts(studentId),
  ]);

  const nowIso = new Date().toISOString();
  const momentum = computeMomentum(states, graph, attempts, nowIso);
  const batch = computeMasteryAll(studentId, states, graph, nowIso);
  const rec = recommend(batch.results, states, graph);

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const focusNode = rec.skillId ? nodeById.get(rec.skillId) : undefined;
  const focusResult = rec.skillId ? batch.results[rec.skillId] : undefined;
  const focusRing = focusResult ? masteryRingFraction(focusResult.score) : 0;
  const focusPct = Math.round(focusRing * 100);
  const focusFlags = focusResult?.flags ?? [];
  const masteryBarPct = Math.round(MASTERY_CONFIG.thresholds.mastered * 100);

  // §3 daily ring trio (return-behaviour only — never mastery math, course §12).
  // Focus = active minutes today; Mastery = course nodes advanced (gold cap when
  // the course is complete); Retrieval = spaced reps cleared today (correct
  // attempts on already-mastered nodes).
  const RETRIEVAL_GOAL = 10;
  const dayStartMs = Date.parse(`${nowIso.slice(0, 10)}T00:00:00.000Z`);
  const retrievalRepsToday = attempts.filter((a) => {
    const t = Date.parse(a.createdAt);
    if (!Number.isFinite(t) || t < dayStartMs || !a.correct) return false;
    // A true retrieval rep is a correct attempt AFTER the node was mastered
    // (a spaced review), not the attempts that earned mastery earlier today.
    const masteredAt = states[a.skillId]?.masteredAt;
    return masteredAt != null && t > Date.parse(masteredAt);
  }).length;
  const retrievalFraction = Math.min(1, retrievalRepsToday / RETRIEVAL_GOAL);

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow={`${profile.displayName}'s momentum`}
        title="Mastery, minutes, and time saved"
        subhead={`Every minute here is active practice. Skills count only once you cross the ${masteryBarPct}% mastery bar — not just for finishing.`}
      />

      {/* Hero: the signature A3 ring instrument — Focus / Mastery / Retrieval
          (STYLE_GUIDE §3). The earlier course/XP/time stats move to secondary
          cards below so there is ONE three-ring concept, not two. */}
      <Card className="flex flex-col items-center">
        <p className="mb-5 self-start text-[12px] font-semibold uppercase tracking-[0.4px] text-accent">
          Today&rsquo;s rings
        </p>
        <RingTrio
          focus={{
            value: momentum.dailyGoalFraction,
            label: `${momentum.todayXp}`,
            sublabel: `Focus · of ${momentum.dailyGoalXp} min`,
          }}
          mastery={{
            value: momentum.courseFraction,
            goldCap: momentum.courseFraction >= 1,
            label: `${momentum.masteredCount}/${momentum.totalSkills}`,
            sublabel: "Mastery · skills",
          }}
          retrieval={{
            value: retrievalFraction,
            label: `${retrievalRepsToday}`,
            sublabel: `Retrieval · reps`,
          }}
        />
        <p className="mt-5 text-[14px] font-medium text-ink-700">
          {standingLine(momentum.courseFraction)}
        </p>
      </Card>

      {/* Secondary stats. */}
      <div className="stagger mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* All-time productive minutes (XP). */}
        <Card className="flex flex-col items-center text-center">
          <p className="mb-4 self-start text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            Active learning
          </p>
          <ProgressRing
            value={momentum.dailyGoalFraction}
            ariaLabel={`Today's productive learning: ${momentum.todayXp} of ${momentum.dailyGoalXp} XP`}
            label={`${momentum.todayXp} XP`}
            sublabel={`of ${momentum.dailyGoalXp} today`}
          />
          <p className="mt-4 text-[13px] leading-[1.5] text-ink-500">
            1 XP = 1 minute of active learning.
            <br />
            <span className="font-medium text-ink-700">
              {humanizeMinutes(momentum.productiveMinutes)}
            </span>{" "}
            all-time.
          </p>
        </Card>

        {/* Time given back — Alpha's TimeBack metric, labelled as an estimate. */}
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="mb-4 self-start text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            Time given back
          </p>
          <div className="font-display text-[44px] font-semibold leading-none text-ink">
            {humanizeMinutes(momentum.timeGivenBackMinutes)}
          </div>
          <p className="mt-4 max-w-[230px] text-[13px] leading-[1.5] text-ink-500">
            Estimated time saved vs. a traditional classroom pace by mastering
            skills efficiently. An estimate, not a graded measure.
          </p>
        </Card>
      </div>

      {/* Current skill — the mastery ring toward the 90% bar. */}
      <div className="mt-5">
        {rec.kind === "complete" || !focusNode || !focusResult ? (
          <Card>
            <InsetPanel label="Working on now">
              Every skill we&rsquo;ve mapped is mastered. New material unlocks as
              the course expands.
            </InsetPanel>
          </Card>
        ) : (
          <Card>
            <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[auto_1fr]">
              <div className="flex justify-center">
                <ProgressRing
                  value={focusRing}
                  ariaLabel={`${focusNode.title}: ${focusPct}% toward the ${masteryBarPct}% mastery bar`}
                  label={`${focusPct}%`}
                  sublabel={`to mastery`}
                />
              </div>
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
                    Working on now
                  </p>
                  <StatusPill status={focusResult.status} />
                </div>
                <h2 className="font-display text-[22px] font-semibold leading-[1.3] text-ink">
                  {focusNode.title}
                </h2>
                <p className="mt-2 max-w-[460px] text-[14px] leading-[1.55] text-ink-500">
                  {focusNode.objective}
                </p>

                {/* Non-punitive focus nudge from the existing timing flags. */}
                {focusFlags.includes("rushing") && (
                  <p className="mt-3 text-[13px] leading-[1.5] text-ink-700">
                    You&rsquo;ve been moving quickly here — slowing down a touch
                    and working each step through helps it stick.
                  </p>
                )}
                {focusFlags.includes("stalling") && (
                  <p className="mt-3 text-[13px] leading-[1.5] text-ink-700">
                    Taking your time is good — if you&rsquo;re stuck, a hint or a
                    quick worked example can get you moving again.
                  </p>
                )}

                <div className="mt-5">
                  <Link href={`/student/learn/${focusNode.id}`} className={LINK_PRIMARY}>
                    Continue learning
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function NoStudent() {
  return (
    <div className="fade-in">
      <PageHeader eyebrow="Your momentum" title="Mastery, minutes, and time saved" />
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
