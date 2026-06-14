// PRACTICE (Phase 4 — phase4-direction.md §2, binding). SERVER shell: cookie →
// server-only repository → computeMasteryAll ONCE for this node's phase/status,
// then selectProblems for the CURRENT phase/sport. ONE sessionId is minted per
// practice session here and threaded through every per-attempt submit and on to
// the Summary (so before/after scopes to this session). The full graph never
// ships — only this node's served problems + content. No third-party requests.

import Link from "next/link";
import { getRepository } from "../../../../../lib/repository/server";
import { computeMasteryAll } from "../../../../../lib/mastery-engine";
import { selectProblems, type ServedProblem } from "../../../../../lib/problem-engine";
import { selectRetentionProbe } from "../../../../../lib/retention";
import { inputNotation } from "../../../../../lib/math-notation/input-notation";
import { getCurrentStudentId } from "../../../../../lib/auth/session";
import { Card } from "../../../../../components/ui/Card";
import { InsetPanel } from "../../../../../components/ui/Panels";
import { Button } from "../../../../../components/ui/Button";
import { PracticeFlow, type ServedItem } from "./PracticeFlow";
import type {
  CurriculumGraph,
  MasteryUpdate,
  Phase,
  StudentAttempt,
  StudentSkillState,
} from "../../../../../types";

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
  const studentId = await getCurrentStudentId();
  if (!studentId) {
    return <EmptyShell skillId={skillId} message="You haven't set up your course yet." />;
  }

  let graph: CurriculumGraph;
  let states: Record<string, StudentSkillState>;
  let attempts: StudentAttempt[];
  let updates: MasteryUpdate[];
  let sport: ServedItem["sport"];
  try {
    const repo = await getRepository();
    const student = await repo.getStudent(studentId);
    if (!student) {
      return <EmptyShell skillId={skillId} message="We couldn't find your course profile." />;
    }
    sport = student.sport;
    // attempts + updates feed the retention scheduler (read-only over the
    // immutable logs); listAttempts is already a read in the practice path.
    [graph, states, attempts, updates] = await Promise.all([
      repo.getGraph(),
      repo.getSkillStates(studentId),
      repo.listAttempts(studentId),
      repo.listMasteryUpdates(studentId),
    ]);
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

  // Narrow per-problem payload — only what the client renders + replays. Each
  // carries the node it is scored against (the session skill, unless a probe).
  const toItem = (s: ServedProblem, itemSkillId: string, source?: "retention"): ServedItem => ({
    problemId: s.problem.id,
    // Only stamp skillId when it differs from the session skill (retention
    // probe); normal items omit it and default to the session skill client-side.
    ...(itemSkillId === skillId ? {} : { skillId: itemSkillId }),
    ...(source ? { source } : {}),
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
    // Multiple-choice options ride the same narrow DTO channel as `visual`;
    // answer.value stays stripped (engine re-checks server-side). Omitted when
    // the problem isn't a choice item. Covers normal items AND the probe.
    ...(s.problem.choices ? { choices: s.problem.choices } : {}),
    // Compute keypad flags from the answer HERE; ship ONLY the booleans (the
    // answer value stays stripped). null → no keypad → omit the field.
    inputNotation: inputNotation(s.problem.answer) ?? undefined,
  });

  const items: ServedItem[] = served.map((s) => toItem(s, skillId));

  // RETENTION (Phase 7C): scheduling + serving ONLY. Called ONCE per minted
  // sessionId — which is what makes maxProbesPerSession:1 structural. If a
  // mastered node is due, PREPEND one neutral-P3 probe (its OWN skillId,
  // source:"retention") at slot 0. It rides the existing slot-validator +
  // scoring path UNCHANGED (phase 3, isProbe:false, a member of selectProblems
  // for the probe node). No mastery/phase/routing math is touched.
  const probe = selectRetentionProbe(graph, states, updates, attempts, sport, nowIso);
  if (probe) {
    items.unshift(toItem(probe, probe.problem.skillId, "retention"));
  }

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
