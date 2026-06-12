// LEARN (Phase 4 — phase4-direction.md §1, binding). SERVER component:
// cookie → server-only repository → computeMasteryAll ONCE for this node's
// status/phase/mastery, computeOverlay for the prereq lock. Read-only: NO
// persistence happens here (the worked-example-seen gate is a client-side UI
// precondition, not an evidence row — spec §J/§D). The interactive lesson area
// + worked-example StepReveal are the client spine (LearnClient). No
// third-party requests; the full graph never ships — only this node's content.

import { cookies } from "next/headers";
import Link from "next/link";
import { getRepository } from "../../../../../lib/repository/server";
import { computeMasteryAll } from "../../../../../lib/mastery-engine";
import { computeOverlay } from "../../../../../lib/graph/overlay";
import { selectProblems } from "../../../../../lib/problem-engine";
import { STUDENT_COOKIE } from "../../../onboarding/constants";
import { Card } from "../../../../../components/ui/Card";
import { InsetPanel } from "../../../../../components/ui/Panels";
import { ArrowLeftIcon } from "../../../../../components/ui/icons";
import {
  coordinateSeedFromProblems,
  numberlineSeedFromProblems,
  equationSeedFromNode,
  flattenProblems,
} from "../../../../../components/learning/learn-explore-seed";
import {
  LearnClient,
  type LearnClientProps,
  type LearnExploreSeed,
} from "./LearnClient";
import type {
  CurriculumGraph,
  MasteryStatus,
  Phase,
  SkillNode,
  StudentSkillState,
} from "../../../../../types";

const LINK_QUIET =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-sans text-[14px] " +
  "px-2 py-1 bg-transparent text-ink-500 font-medium transition-colors duration-150 " +
  "ease-[cubic-bezier(.2,.7,.2,1)] hover:bg-hover " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const blankState = (): StudentSkillState => ({
  mastery: 0,
  status: "unknown",
  phase: 1,
  attempts: 0,
  correct: 0,
  hints: 0,
  timeMs: 0,
  recent: [],
  transfer: false,
  lastAttemptAt: null,
  masteredAt: null,
});

/** Worked-example-seen gate (spec §D): REQUIRED only for a Phase-1 entry whose
 * status is unknown/introduced/developing. Experts (near_mastery / phase ≥ 2 /
 * accelerated-credit) are exempt — forcing them back is the redundancy effect. */
function requiresWorkedExample(phase: Phase, status: MasteryStatus): boolean {
  if (phase >= 2) return false;
  return status === "unknown" || status === "introduced" || status === "developing";
}

/**
 * Derive the Learn lesson area's EXPLORE seed from a node's REAL data:
 *  - coordinate node → the first problem with a coordinate visualSpec (L05/L06);
 *  - numberline node → the first numberline-spec problem (F09);
 *  - balance/equation node → an equation parsed from the node (E01–E04/E14).
 * Returns null when nothing usable is extractable → the client degrades to the
 * StepReveal manipulable. Reads existing content only; authors no new field.
 */
function deriveExploreSeed(node: SkillNode): LearnExploreSeed | null {
  const problems = flattenProblems(node);

  if (node.visual === "coordinate") {
    const spec = coordinateSeedFromProblems(problems);
    if (spec) return { kind: "coordinate", spec };
  }
  if (node.visual === "numberline") {
    const spec = numberlineSeedFromProblems(problems);
    if (spec) return { kind: "numberline", spec };
  }
  if (node.visual === "balance") {
    const equation = equationSeedFromNode(node.workedExamples, problems);
    if (equation) return { kind: "balance", equation };
  }
  return null;
}

function MissingShell({ message }: { message: string }) {
  return (
    <div className="fade-in mx-auto max-w-[1140px]">
      <Link href="/student" className={`${LINK_QUIET} mb-[18px]`}>
        <ArrowLeftIcon aria-hidden />
        Learning home
      </Link>
      <Card>
        <InsetPanel>{message}</InsetPanel>
      </Card>
    </div>
  );
}

export default async function LearnPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId } = await params;
  const cookieStore = await cookies();
  const studentId = cookieStore.get(STUDENT_COOKIE)?.value ?? null;
  if (!studentId) {
    return (
      <MissingShell message="You haven't set up your course yet. Head back to your learning home to begin." />
    );
  }

  let graph: CurriculumGraph;
  let states: Record<string, StudentSkillState>;
  let sport: LearnClientProps["sport"];
  try {
    const repo = getRepository();
    const student = await repo.getStudent(studentId);
    if (!student) {
      return (
        <MissingShell message="We couldn't find your course profile. Head back to your learning home to begin." />
      );
    }
    sport = student.sport;
    [graph, states] = await Promise.all([
      repo.getGraph(),
      repo.getSkillStates(studentId),
    ]);
  } catch {
    return (
      <MissingShell message="We couldn't load this lesson just now. Refresh to try again." />
    );
  }

  const node = graph.nodes.find((n) => n.id === skillId);
  if (!node) {
    return <MissingShell message="That skill isn't on your course map." />;
  }

  // Engine — ONCE per request. No per-render graph traversal beyond this.
  const nowIso = new Date().toISOString();
  const batch = computeMasteryAll(studentId, states, graph, nowIso);
  const overlay = computeOverlay(graph, states, batch.results);
  const overlayNode = overlay.nodes.find((o) => o.skillId === skillId);

  const state = states[skillId] ?? blankState();
  const result = batch.results[skillId];
  const status = result?.status ?? "unknown";
  const phase = state.phase;
  const mastery = result?.score ?? 0;

  const domain = graph.domains.find((d) => d.id === node.domain);

  // Prereq strip: each declared prerequisite with its computed status.
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const prereqs = node.prereqs.map((p) => ({
    skillId: p,
    title: nodeById.get(p)?.title ?? p,
    status: batch.results[p]?.status ?? "unknown",
  }));

  // Lock: the overlay's blockedBy is the first prerequisite whose evidence
  // locks this node (engine-decided — never re-derived here). Route there.
  const blockedBy = overlayNode?.blockedBy ?? null;
  const weakPrereq = blockedBy
    ? { skillId: blockedBy, title: nodeById.get(blockedBy)?.title ?? blockedBy }
    : null;

  // Empty phase bank → Start practice disabled (direction §1.7 edge).
  const served = selectProblems(node, state, sport);
  const hasPractice = served.length > 0;

  // EXPLORE seed for the Learn lesson area — DERIVED from this node's own real
  // data (a representative problem's authored visualSpec, or the node's parsed
  // equation), never an authored field. Computed server-side so only the seed
  // (given context, no withheld answer) ships to the client — not the full
  // problem bank. Null → the client degrades to the StepReveal manipulable.
  const exploreSeed = deriveExploreSeed(node);

  return (
    <LearnClient
      skillId={skillId}
      title={node.title}
      objective={node.objective}
      domainLabel={domain?.label ?? node.domain}
      status={status}
      phase={phase}
      mastery={mastery}
      visual={node.visual}
      exploreSeed={exploreSeed}
      contextHooks={node.contextHooks}
      workedExamples={node.workedExamples}
      sport={sport}
      prereqs={prereqs}
      weakPrereq={weakPrereq}
      gateWorkedExample={requiresWorkedExample(phase, status)}
      hasPractice={hasPractice}
    />
  );
}
