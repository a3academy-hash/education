// SUMMARY (Phase 4 — phase4-direction.md §3 + spec §I, binding). SERVER
// component: cookie → server-only repository → this session's attempts +
// MasteryUpdate rows (scoped by sessionId). Before/after is RECONSTRUCTED from
// the immutable update rows (first prev / last new) — no snapshot is stored.
// The verdict is DERIVED from recommend() (single source of truth, spec §F) +
// the just-practiced node's freshly-computed status. NO %, NO "+pts", NO
// celebration. WHAT TO FIRM UP is student-rephrased (tutor diagnosis, spec §C).
// The full graph never ships; the engine runs ONCE per request.

import Link from "next/link";
import { getRepository } from "../../../../lib/repository/server";
import { computeMasteryAll } from "../../../../lib/mastery-engine";
import { recommend } from "../../../../lib/adaptive-router";
import { diagnosticCreditedSkills } from "../../../../lib/diagnostic-engine";
import { deriveVerdict, firmUpStatement, VERDICT_COPY } from "../../../../lib/session-helpers";
import { getCurrentStudentId } from "../../../../lib/auth/session";
import { Card } from "../../../../components/ui/Card";
import { Progress } from "../../../../components/ui/Progress";
import { StatusPill } from "../../../../components/ui/StatusPill";
import { InsetPanel } from "../../../../components/ui/Panels";
import { ArrowRightIcon } from "../../../../components/ui/icons";
import type {
  CurriculumGraph,
  MasteryStatus,
  MasteryUpdate,
  Phase,
  StudentAttempt,
  StudentSkillState,
} from "../../../../types";

const STATUS_FILL: Record<MasteryStatus, string> = {
  unknown: "var(--color-status-unknown)",
  introduced: "var(--color-status-introduced)",
  developing: "var(--color-status-developing)",
  near_mastery: "var(--color-status-near-mastery)",
  mastered: "var(--color-status-mastered)",
  needs_review: "var(--color-status-needs-review)",
  prerequisite_gap: "var(--color-status-prerequisite-gap)",
};

const STATUS_LABEL: Record<MasteryStatus, string> = {
  unknown: "Unknown",
  introduced: "Introduced",
  developing: "Developing",
  near_mastery: "Near mastery",
  mastered: "Mastered",
  needs_review: "Needs review",
  prerequisite_gap: "Prerequisite gap",
};

const PHASE_LABEL: Record<Phase, string> = {
  1: "Sports context",
  2: "Blended",
  3: "Neutral transfer",
};

// Status ordinal for the up/held/dipped delta direction (display only — never
// feeds engine math; the engine already decided every status).
const STATUS_RANK: Record<MasteryStatus, number> = {
  prerequisite_gap: 0,
  unknown: 1,
  introduced: 2,
  developing: 3,
  near_mastery: 4,
  needs_review: 4,
  mastered: 5,
};

const deAmp = (s: string): string => s.replace(/\s*&\s*/g, " and ");

const LINK_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-sans text-[14px] " +
  "px-[22px] py-[11px] bg-accent text-white font-semibold transition-colors duration-150 " +
  "ease-[cubic-bezier(.2,.7,.2,1)] hover:bg-accent-hover active:translate-y-px " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const LINK_QUIET =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-sans text-[14px] " +
  "px-2 py-1 bg-transparent text-ink-500 font-medium transition-colors duration-150 " +
  "ease-[cubic-bezier(.2,.7,.2,1)] hover:bg-hover " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function NoSession() {
  return (
    <div className="fade-in mx-auto max-w-[680px]">
      <Card>
        <InsetPanel>No session to summarize yet.</InsetPanel>
        <p className="mt-3 text-[13.5px] text-ink-500">
          Finish a practice session and your summary shows up here.
        </p>
        <div className="mt-5">
          <Link href="/student" className={LINK_QUIET}>
            Back to home
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string; session?: string }>;
}) {
  const { skill: skillId, session: sessionId } = await searchParams;
  const studentId = await getCurrentStudentId();
  if (!studentId || !skillId || !sessionId) return <NoSession />;

  let graph: CurriculumGraph;
  let states: Record<string, StudentSkillState>;
  let allAttempts: StudentAttempt[];
  let allUpdates: MasteryUpdate[];
  let credited: string[];
  try {
    const repo = await getRepository();
    const student = await repo.getStudent(studentId);
    if (!student) return <NoSession />;
    [graph, states, allAttempts, allUpdates] = await Promise.all([
      repo.getGraph(),
      repo.getSkillStates(studentId),
      repo.listAttempts(studentId),
      repo.listMasteryUpdates(studentId),
    ]);
    credited = diagnosticCreditedSkills(allUpdates);

    // Scope to THIS session via sessionId (provenance only).
    const sessionAttempts = allAttempts.filter((a) => a.sessionId === sessionId);
    if (sessionAttempts.length === 0) return <NoSession />;
    const sessionUpdates = allUpdates
      .filter((u) => u.sessionId === sessionId && u.skillId === skillId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

    const node = graph.nodes.find((n) => n.id === skillId);
    if (!node) return <NoSession />;

    // Engine — ONCE per request (post-session truth + routing).
    const nowIso = new Date().toISOString();
    const batch = computeMasteryAll(studentId, states, graph, nowIso);
    const rec = recommend(batch.results, states, graph, { justCredited: credited });

    const practicedStatus = batch.results[skillId]?.status;
    const verdict = deriveVerdict(rec, practicedStatus);
    const copy = VERDICT_COPY[verdict];

    // Stat row from this session's attempts.
    const skillAttempts = sessionAttempts.filter((a) => a.skillId === skillId);
    const attempted = skillAttempts.length;
    const correctCount = skillAttempts.filter((a) => a.correct).length;
    const hintsUsed = skillAttempts.reduce((a, x) => a + x.hintsUsed, 0);
    const phaseReached = skillAttempts.reduce<Phase>(
      (mx, a) => (a.phase > mx ? a.phase : mx),
      1,
    );

    // Before/after reconstruction (spec §I): first session update's prev,
    // last session update's new. No status change → current state, delta 0.
    const current = states[skillId] ?? null;
    const before: { status: MasteryStatus; mastery: number } =
      sessionUpdates.length > 0
        ? { status: sessionUpdates[0].prevStatus, mastery: sessionUpdates[0].prevMastery }
        : {
            status: practicedStatus ?? current?.status ?? "unknown",
            mastery: current?.mastery ?? 0,
          };
    const after: { status: MasteryStatus; mastery: number } =
      sessionUpdates.length > 0
        ? {
            status: sessionUpdates[sessionUpdates.length - 1].newStatus,
            mastery: sessionUpdates[sessionUpdates.length - 1].newMastery,
          }
        : before;

    const direction: "up" | "held" | "dipped" | "mastered" =
      after.status === "mastered"
        ? "mastered"
        : STATUS_RANK[after.status] > STATUS_RANK[before.status]
          ? "up"
          : STATUS_RANK[after.status] < STATUS_RANK[before.status]
            ? "dipped"
            : "held";

    const deltaSentence: Record<typeof direction, string> = {
      up: `You moved from ${STATUS_LABEL[before.status]} to ${STATUS_LABEL[after.status]} on this skill — clear progress this session.`,
      held: `You held at ${STATUS_LABEL[after.status]}. Another focused session should move this up.`,
      dipped: `This slipped to ${STATUS_LABEL[after.status]}. That's information, not a setback — a short review brings it back.`,
      mastered:
        "You reached Mastered — including the standard-notation transfer that confirms it. This skill is solid.",
    };

    // WHAT TO FIRM UP (spec §C / BLOCKER B): sourced from AUTHORED student
    // content — for each misconception tag SEEN this session, the matched
    // node problem's most-specific hint, then the worked-example terminal
    // reveal. NEVER the raw registry description / tutor diagnosis. Lines are
    // de-duped; the section is omitted entirely if empty.
    const tagsSeen: string[] = [];
    for (const a of skillAttempts) {
      for (const t of a.misconceptionTags) if (!tagsSeen.includes(t)) tagsSeen.push(t);
    }
    const nodeProblems = [...node.problems.p1, ...node.problems.p2, ...node.problems.p3];
    const firmUp: string[] = [];
    for (const tag of tagsSeen) {
      const matched =
        nodeProblems.find(
          (p) => p.misconceptionMap && Object.values(p.misconceptionMap).includes(tag),
        ) ?? null;
      const line = firmUpStatement(matched, node.workedExamples);
      if (!firmUp.includes(line)) firmUp.push(line);
    }

    // Next target + primary route.
    const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
    const isComplete = rec.kind === "complete" || !rec.skillId;
    const nextTitle = rec.skillId ? (nodeById.get(rec.skillId)?.title ?? rec.title) : "";
    const primaryLabel = isComplete
      ? "Back to home"
      : `${copy.primaryVerb === "review" ? "Review" : "Continue to"} ${deAmp(nextTitle)}`;
    const primaryHref = isComplete ? "/student" : `/student/learn/${rec.skillId}`;

    const stats = [
      { label: "Problems", value: String(attempted) },
      { label: "Accuracy", value: `${correctCount} of ${attempted}` },
      { label: "Hints", value: String(hintsUsed) },
      { label: "Phase reached", value: PHASE_LABEL[phaseReached] },
    ];

    return (
      <div className="fade-in mx-auto max-w-[680px]">
        {/* Header */}
        <div className="mb-7">
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            Session complete · {deAmp(node.title)}
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.2] tracking-[-0.3px] text-ink">
            Here&rsquo;s what changed.
          </h1>
          <p className="mt-3 max-w-[520px] text-[14px] leading-[1.55] text-ink-500">
            A precise read on this session — what moved, what to firm up, and where you go next.
          </p>
        </div>

        {/* Stat row */}
        <div className="stagger mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} padding="compact">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
                {s.label}
              </p>
              <p className="text-[15px] font-medium text-ink">{s.value}</p>
            </Card>
          ))}
        </div>

        {/* Mastery change — NO %/pts */}
        <Card className="mb-5">
          <p className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            Mastery
          </p>
          <div className="mb-3.5 flex items-center gap-3">
            <StatusPill status={before.status} />
            <ArrowRightIcon aria-hidden className="text-ink-400" />
            <StatusPill status={after.status} />
          </div>
          <Progress
            value={after.mastery}
            height={6}
            fill={STATUS_FILL[after.status]}
            label="Mastery after this session"
            className="mb-3.5"
          />
          <p className="text-[14px] leading-[1.55] text-ink-800">{deltaSentence[direction]}</p>
        </Card>

        {/* What to firm up — only if there are misconceptions */}
        {firmUp.length > 0 && (
          <Card className="mb-5">
            <p className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
              What to firm up
            </p>
            <ul className="flex flex-col gap-2.5">
              {firmUp.map((line, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-[7px] inline-block h-[6px] w-[6px] shrink-0 rounded-full"
                    style={{ background: "var(--color-ink-400)" }}
                  />
                  <span className="text-[13.5px] leading-[1.5] text-ink-700">{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Verdict + next + ONE primary */}
        <InsetPanel label="What's next">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ background: STATUS_FILL[copy.dotStatus] }}
            />
            <span className="text-[14px] font-semibold text-ink-800">{copy.word}</span>
          </div>
          <p className="mt-2 text-[14px] leading-[1.55] text-ink-700">{copy.note}</p>
          {!isComplete && (
            <div className="mt-4">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
                Next
              </p>
              <p className="font-display text-[18px] font-semibold leading-[1.3] text-ink">
                {deAmp(nextTitle)}
              </p>
              <p className="mt-1 text-[13px] leading-[1.5] text-ink-500">{deAmp(rec.reason)}</p>
            </div>
          )}
        </InsetPanel>

        <div className="mt-7 flex flex-col items-start gap-3">
          <Link href={primaryHref} className={LINK_PRIMARY} autoFocus>
            {primaryLabel}
            {!isComplete && <ArrowRightIcon aria-hidden />}
          </Link>
          {!isComplete && (
            <Link href="/student" className={LINK_QUIET}>
              Back to home
            </Link>
          )}
        </div>
      </div>
    );
  } catch {
    return <NoSession />;
  }
}
