// PRACTICE (Phase 4 — phase4-direction.md §2, binding). SERVER shell: cookie →
// server-only repository → computeMasteryAll ONCE for this node's phase/status,
// then selectProblems for the CURRENT phase/sport. ONE sessionId is minted per
// practice session here and threaded through every per-attempt submit and on to
// the Summary (so before/after scopes to this session). The full graph never
// ships — only this node's served problems + content. No third-party requests.

import { cookies } from "next/headers";
import Link from "next/link";
import { getRepository } from "../../../../../lib/repository/server";
import { computeMasteryAll } from "../../../../../lib/mastery-engine";
import { selectProblems } from "../../../../../lib/problem-engine";
import { STUDENT_COOKIE } from "../../../onboarding/constants";
import { Card } from "../../../../../components/ui/Card";
import { InsetPanel } from "../../../../../components/ui/Panels";
import { Button } from "../../../../../components/ui/Button";
import { PracticeFlow, type ServedItem } from "./PracticeFlow";
import type { CurriculumGraph, Phase, StudentSkillState } from "../../../../../types";

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

function EmptyShell({ skillId, message }: { skillId: string; message: string }) {
  return (
    <div className="fade-in mx-auto max-w-[720px]">
      <Card>
        <InsetPanel>{message}</InsetPanel>
        <div className="mt-5">
          <Link href={`/student/learn/${skillId}`}>
            <Button variant="secondary">Back to the lesson</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default async function PracticePage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId } = await params;
  const cookieStore = await cookies();
  const studentId = cookieStore.get(STUDENT_COOKIE)?.value ?? null;
  if (!studentId) {
    return <EmptyShell skillId={skillId} message="You haven't set up your course yet." />;
  }

  let graph: CurriculumGraph;
  let states: Record<string, StudentSkillState>;
  let sport: ServedItem["sport"];
  try {
    const repo = getRepository();
    const student = await repo.getStudent(studentId);
    if (!student) {
      return <EmptyShell skillId={skillId} message="We couldn't find your course profile." />;
    }
    sport = student.sport;
    [graph, states] = await Promise.all([repo.getGraph(), repo.getSkillStates(studentId)]);
  } catch {
    return (
      <EmptyShell skillId={skillId} message="We couldn't load this practice set just now." />
    );
  }

  const node = graph.nodes.find((n) => n.id === skillId);
  if (!node) {
    return <EmptyShell skillId={skillId} message="That skill isn't on your course map." />;
  }

  // Engine — ONCE per request, to know the current phase.
  const nowIso = new Date().toISOString();
  computeMasteryAll(studentId, states, graph, nowIso);
  const state = states[skillId] ?? blankState();
  const phase: Phase = state.phase;

  const served = selectProblems(node, state, sport);
  if (served.length === 0) {
    return <EmptyShell skillId={skillId} message="This practice set is being prepared." />;
  }

  // Narrow per-problem payload — only what the client renders + replays.
  const items: ServedItem[] = served.map((s) => ({
    problemId: s.problem.id,
    phase: s.problem.phase,
    sport: s.problem.sport,
    prompt: s.problem.prompt,
    visual: s.problem.visual,
    // visualSpec rides the same DTO channel as `visual`; answer/misconceptionMap
    // stay stripped (engine re-checks server-side). Absent in B1.
    visualSpec: s.problem.visualSpec,
    hints: s.problem.hints,
    isProbe: s.isProbe,
    answerKind: s.problem.answer.kind,
  }));

  const sessionId = crypto.randomUUID();

  return (
    <PracticeFlow
      skillId={skillId}
      title={node.title}
      phase={phase}
      items={items}
      sessionId={sessionId}
    />
  );
}
