// /parent/children/[studentId] — the per-child parent dashboard (Phase 7 §12-13,
// R3/R6/R8/R9/R11). SERVER component, ParentShell, parent-scoped. The grade is
// computed SERVER-SIDE (NO lib/grade import in any client child) and only plain
// data is passed down.
//
// MEMORY MODE: this surface is supabase-only (mirrors /parent). In memory mode it
// renders a calm "not available" rather than throwing.
//
// Renders: course-progress ring (0-100%), projected grade (letter suppressed/grey
// while no summative, R3 disclaimer visible), 5-10 subject masteries (StatusPill
// bands), proof modules, stuck nodes, export + delete (server actions).

import { notFound, redirect } from "next/navigation";
import { getAuthMode } from "../../../../lib/auth/mode";
import { getCurrentParent, parentOwnsChild } from "../../../../lib/auth/parent";
import { getRepository } from "../../../../lib/repository/server";
import { computeMasteryAll } from "../../../../lib/mastery-engine";
import { recommend } from "../../../../lib/adaptive-router";
import { computeFlags } from "../../../../lib/insight/flags";
import { computeGrade } from "../../../../lib/grade";
import { rollUpSubjects } from "../../../../lib/grade/subjects";
import { buildProofModules, buildStuckNodes } from "../../../../lib/insight/proof";
import { creditTier } from "../../../../lib/transcript";
import { ParentShell } from "../../../../components/layout/ParentShell";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { Card } from "../../../../components/ui/Card";
import { InsetPanel, LabeledSection } from "../../../../components/ui/Panels";
import { ProgressRing } from "../../../../components/gamification/ProgressRing";
import { ProofModule } from "../../../../components/insight/ProofModule";
import { SeverityPill } from "../../../../components/insight/SeverityPill";
import { ChildRecordActions } from "./ChildRecordActions";

const SUBJECT_BAND_LABEL: Record<string, string> = {
  not_started: "Not started",
  developing: "Getting started",
  progressing: "Progressing",
  strong: "Strong",
};

export const metadata = {
  title: "Student record — A3 Academy Family",
};

export default async function ParentChildDashboard({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  if (getAuthMode() !== "supabase") return <NotAvailable />;

  const { studentId } = await params;
  const parent = await getCurrentParent();
  if (!parent) redirect("/auth/sign-in");

  // Authz: the verified parent must own this child (R5).
  if (!(await parentOwnsChild(parent.uid, studentId))) notFound();

  const repo = await getRepository();
  const profile = await repo.getStudent(studentId);
  if (!profile) notFound();

  // FERPA read-audit seam (§8): a parent reading their child's detailed record is
  // a logged access. No-PII row; no-op in memory mode. Best-effort — an audit
  // failure must never break the parent's own dashboard. (Full read-audit wiring
  // across all surfaces is the deferred B12 ship-gate.)
  try {
    await repo.appendAccessLog({
      actorId: parent.uid,
      actorRole: "parent",
      studentId,
      recordType: "parent_child_record",
    });
  } catch {
    /* audit is best-effort here; never block the read */
  }

  const [graph, states, attempts, updates] = await Promise.all([
    repo.getGraph(),
    repo.getSkillStates(studentId),
    repo.listAttempts(studentId),
    repo.listMasteryUpdates(studentId),
  ]);

  const nowIso = new Date().toISOString();
  const batch = computeMasteryAll(studentId, states, graph, nowIso);
  void recommend(batch.results, states, graph); // parity with other surfaces

  // SERVER-SIDE grade (R6). Summative intake deferred → not credit-eligible.
  const grade = computeGrade(states, graph, updates, { nowIso });
  const lockedIds = new Set(grade.locked);

  const subjects = rollUpSubjects(graph, states, batch.results, lockedIds);

  const creditNodeIds = graph.nodes
    .filter((n) => creditTier(n) === "algebra1-credit")
    .map((n) => n.id);
  const proofModules = buildProofModules(
    graph,
    states,
    batch.results,
    updates,
    lockedIds,
    creditNodeIds,
  ).slice(0, 8);

  const flags = computeFlags(graph, attempts, updates, states, batch.results, null, nowIso);
  const stuckNodes = buildStuckNodes(graph, batch.results, flags).slice(0, 6);

  // Phase 8 — fast-but-fragile: mastered FAST and not yet holding on a delayed
  // check. Sober + actionable for the parent (the term "fragile" is OK here).
  const titleOf = (id?: string): string =>
    (id ? graph.nodes.find((n) => n.id === id)?.title : undefined) ?? id ?? "";
  const fragileFlags = flags.filter((f) => f.kind === "fast-but-fragile").slice(0, 6);

  // Course-progress 0-100% = mastered credit-bearing nodes / credit-bearing scope.
  const creditTotal = creditNodeIds.length;
  const masteredCredit = creditNodeIds.filter((id) => states[id]?.status === "mastered").length;
  const courseProgress = creditTotal === 0 ? 0 : masteredCredit / creditTotal;

  return (
    <ParentShell parentName={parent.name}>
      <div className="fade-in">
        <PageHeader
          eyebrow={`Family · ${profile.displayName}`}
          title={`${profile.displayName}'s progress`}
          subhead="Course progress, projected grade, and the evidence behind each placement. Read-only."
        />

        {/* Top: progress ring + projected grade. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <LabeledSection label="Course progress">
              <div className="flex items-center gap-6">
                <ProgressRing
                  value={courseProgress}
                  ariaLabel={`Course progress: ${masteredCredit} of ${creditTotal} skills`}
                  label={`${Math.round(courseProgress * 100)}%`}
                  sublabel={`${masteredCredit} of ${creditTotal} skills`}
                />
                <p className="text-[13px] leading-[1.55] text-ink-500">
                  Share of the credit-bearing Algebra 1 skills {profile.displayName} has
                  mastered so far.
                </p>
              </div>
            </LabeledSection>
          </Card>

          <Card>
            <LabeledSection label="Projected grade">
              <ProjectedGrade
                pct={grade.pct}
                letter={grade.letter}
                summativePresent={grade.summativePresent}
                disclaimer={grade.disclaimer}
              />
            </LabeledSection>
          </Card>
        </div>

        {/* Subject masteries. */}
        <LabeledSection label="Subject areas" className="mt-5">
          <Card>
            <ul className="grid gap-2.5">
              {subjects.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 border-b border-selected pb-2.5 last:border-0 last:pb-0"
                >
                  <span className="truncate text-[13px] font-medium text-ink">{s.label}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-[11px] text-ink-500">
                      {s.masteredLocked}/{s.total}
                    </span>
                    <span className="text-[12.5px] font-medium text-ink-700">
                      {SUBJECT_BAND_LABEL[s.band]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </LabeledSection>

        {/* Proof modules + stuck nodes. */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <LabeledSection label="Why these placements?">
            <Card>
              {proofModules.length === 0 ? (
                <InsetPanel>No skills attempted yet.</InsetPanel>
              ) : (
                <div className="grid gap-3">
                  {proofModules.map((p) => (
                    <ProofModule key={p.skillId} data={p} />
                  ))}
                </div>
              )}
            </Card>
          </LabeledSection>

          <LabeledSection label="Where to help">
            <Card>
              {stuckNodes.length === 0 ? (
                <InsetPanel>
                  Nothing stuck right now — {profile.displayName} is progressing well.
                </InsetPanel>
              ) : (
                <ul className="grid gap-2.5">
                  {stuckNodes.map((n) => (
                    <li key={n.skillId} className="text-[13px] leading-[1.5] text-ink-700">
                      {n.message}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </LabeledSection>
        </div>

        {/* Fast but fragile — mastered fast, not yet confirmed on a delayed check.
            Sober, actionable; shown only when there is something to surface. */}
        {fragileFlags.length > 0 && (
          <LabeledSection label="Worth refreshing soon" className="mt-5">
            <Card>
              <p className="mb-4 text-[13px] leading-[1.55] text-ink-500">
                {profile.displayName} picked these up quickly, but a delayed check hasn&rsquo;t
                yet confirmed they&rsquo;re holding. A short review in the next day or two locks
                them in.
              </p>
              <ul className="grid gap-3">
                {fragileFlags.map((f, i) => (
                  <li
                    key={`${f.skillId ?? "global"}-${i}`}
                    className="flex items-start justify-between gap-3 border-b border-selected pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink">{titleOf(f.skillId)}</p>
                      <p className="mt-0.5 text-[12.5px] leading-[1.5] text-ink-500">{f.detail}</p>
                    </div>
                    <SeverityPill band="watch" small className="shrink-0" />
                  </li>
                ))}
              </ul>
            </Card>
          </LabeledSection>
        )}

        {/* Export + delete. */}
        <LabeledSection label="Your record" className="mt-5">
          <Card>
            <p className="mb-4 text-[13px] leading-[1.55] text-ink-500">
              Export {profile.displayName}&rsquo;s full record anytime. Deleting it
              anonymizes their work — export first.
            </p>
            <ChildRecordActions studentId={studentId} childName={profile.displayName} />
          </Card>
        </LabeledSection>
      </div>
    </ParentShell>
  );
}

function ProjectedGrade({
  pct,
  letter,
  summativePresent,
  disclaimer,
}: {
  pct: number;
  letter: string;
  summativePresent: boolean;
  disclaimer: string;
}) {
  return (
    <div>
      <div className="flex items-end gap-3">
        <span className="font-display text-[34px] font-semibold leading-none text-ink">
          {Math.round(pct)}
        </span>
        {/* Letter grade suppressed / greyed while no summative exists (R3). */}
        <span
          className={`text-[18px] font-semibold ${
            summativePresent ? "text-ink-700" : "text-ink-400"
          }`}
          title={summativePresent ? undefined : "Letter grade pending a summative assessment"}
        >
          {summativePresent ? letter : "—"}
        </span>
        <span className="pb-1 text-[12px] font-medium uppercase tracking-[0.3px] text-ink-500">
          Projected
        </span>
      </div>
      <p className="mt-3 text-[12px] leading-[1.5] text-ink-500">{disclaimer}</p>
    </div>
  );
}

function NotAvailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-[420px] text-center">
        <h1 className="font-display text-[22px] font-semibold text-ink">
          Family accounts are not available here
        </h1>
        <p className="mt-3 text-[14px] leading-[1.55] text-ink-500">
          This environment uses the local student flow. Family dashboards are
          available in the hosted school environment.
        </p>
      </div>
    </main>
  );
}
