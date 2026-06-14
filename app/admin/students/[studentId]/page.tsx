// /admin/students/[studentId] — per-student insight (Phase 7 §A). SERVER
// component (mr-gates G7). Behind requireStaff(). Layout P1: a thin full-width
// standing strip under the header (staff MAY see per-domain avgMastery bars — the
// no-% honesty rule is student/parent-only), then a two-column body:
// timeline-dominant wide left (~1.6fr) + sticky right rail (Flags on top, Mastery
// Map below). No CTA button. All views are read-only over the immutable logs.

import { notFound } from "next/navigation";
import { requireStaff } from "../../../../lib/auth/staff-guard";
import { getRepository } from "../../../../lib/repository/server";
import { computeMasteryAll } from "../../../../lib/mastery-engine";
import { computeOverlay } from "../../../../lib/graph/overlay";
import { recommend } from "../../../../lib/adaptive-router";
import {
  buildDecisionTimeline,
  isCreditedNotTaught,
} from "../../../../lib/insight/decision-timeline";
import { computeFlags } from "../../../../lib/insight/flags";
import { StaffShell } from "../../../../components/layout/StaffShell";
import { DecisionTimeline } from "../../../../components/insight/DecisionTimeline";
import { CreditedTag } from "../../../../components/insight/CreditedTag";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { Card } from "../../../../components/ui/Card";
import { Progress } from "../../../../components/ui/Progress";
import { StatusPill } from "../../../../components/ui/StatusPill";
import { InsetPanel, LabeledSection } from "../../../../components/ui/Panels";
import type { FlagEntry, OverlayNode } from "../../../../types";

export const metadata = {
  title: "Student insight — A3 Academy Staff",
};

const FLAG_LABEL: Record<FlagEntry["kind"], string> = {
  "stalled-node": "Stalled",
  "high-hint-dependence": "Frequent hints",
  rushing: "Moving fast",
  "decayed-review-queue": "Due for review",
  "retention-probes-due": "Retention check",
  "days-since-session": "Inactivity",
};

function flagDotColor(severity: FlagEntry["severity"]): string {
  return severity === "attention"
    ? "var(--color-status-developing)"
    : "var(--color-ink-500)";
}

export default async function StudentInsightPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const staff = await requireStaff();
  const { studentId } = await params;

  const repo = await getRepository();
  const profile = await repo.getStudent(studentId);
  if (!profile) notFound();
  // Campus scope: scoped staff only see their own campus's students.
  if (staff.campusId !== null && profile.campusId !== staff.campusId) notFound();

  const [graph, states, attempts, updates] = await Promise.all([
    repo.getGraph(),
    repo.getSkillStates(studentId),
    repo.listAttempts(studentId),
    repo.listMasteryUpdates(studentId),
  ]);

  const nowIso = new Date().toISOString();
  const batch = computeMasteryAll(studentId, states, graph, nowIso);
  const overlay = computeOverlay(graph, states, batch.results);
  const rec = recommend(batch.results, states, graph);
  const timeline = buildDecisionTimeline(
    graph,
    attempts,
    updates,
    states,
    staff.campusId,
    nowIso,
  );
  const flags = computeFlags(
    graph,
    attempts,
    updates,
    states,
    batch.results,
    staff.campusId,
    nowIso,
  );

  const titleOf = (id: string): string =>
    graph.nodes.find((n) => n.id === id)?.title ?? id;

  // Nodes the student has any state on — the meaningful slice for the map.
  const mapNodes: OverlayNode[] = overlay.nodes.filter(
    (n) => states[n.skillId] !== undefined,
  );

  return (
    <StaffShell>
      <div className="fade-in">
        <PageHeader
          eyebrow={`Staff · ${profile.displayName}`}
          title="Decision log & insight"
          subhead={`Every adaptive decision for ${profile.displayName}, composed only from logged facts and the engine's own reasons. Sport: ${profile.sport}.`}
        />

        {/* Thin full-width standing strip — staff MAY see per-domain bars. */}
        <Card className="mb-5" padding="compact">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            Standing by domain
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
            {graph.domains.map((d) => {
              const dp = overlay.summary.domainProgress[d.id];
              if (!dp) return null;
              return (
                <div key={d.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12px] font-medium text-ink-700">
                      {d.label}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-500">
                      {dp.mastered}/{dp.total}
                    </span>
                  </div>
                  <Progress value={dp.avgMastery} height={4} label={`${d.label} avg mastery`} />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Two-column body: timeline-dominant left, sticky right rail. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
          <section>
            <LabeledSection label="Decision timeline">
              <Card>
                <DecisionTimeline entries={timeline} emptyName={profile.displayName} />
              </Card>
            </LabeledSection>
          </section>

          <aside className="lg:sticky lg:top-[76px] lg:self-start">
            {/* Flags first. */}
            <LabeledSection label="Signals" className="mb-5">
              <Card>
                <FlagsPanel flags={flags} name={profile.displayName} titleOf={titleOf} />
              </Card>
            </LabeledSection>

            {/* Mastery Map below. */}
            <LabeledSection label="Mastery map">
              <Card>
                <InsetPanel label="Current recommendation" className="mb-4">
                  {rec.kind === "complete" ? "Every mapped skill is mastered." : rec.reason}
                </InsetPanel>
                {mapNodes.length === 0 ? (
                  <InsetPanel>No skills attempted yet.</InsetPanel>
                ) : (
                  <ul className="grid gap-2.5">
                    {mapNodes.map((n) => {
                      const credited =
                        n.effectiveStatus === "mastered" &&
                        isCreditedNotTaught(n.skillId, attempts, updates);
                      return (
                        <li
                          key={n.skillId}
                          className="flex items-center justify-between gap-3 border-b border-selected pb-2.5 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-ink">
                              {n.title}
                            </p>
                            {n.blockedBy && (
                              <p className="mt-0.5 text-[11.5px] text-ink-500">
                                Waiting on {titleOf(n.blockedBy)}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {credited && <CreditedTag />}
                            <StatusPill status={n.effectiveStatus} small />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </LabeledSection>
          </aside>
        </div>
      </div>
    </StaffShell>
  );
}

function FlagsPanel({
  flags,
  name,
  titleOf,
}: {
  flags: FlagEntry[];
  name: string;
  titleOf: (id: string) => string;
}) {
  return (
    <div>
      {flags.length === 0 ? (
        <InsetPanel>
          No signals to review — {name} is progressing as expected.
        </InsetPanel>
      ) : (
        <ul className="grid gap-3">
          {flags.map((f, i) => (
            <li key={`${f.kind}-${f.skillId ?? "global"}-${i}`} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-[6px] inline-block shrink-0 rounded-full"
                style={{ width: 7, height: 7, background: flagDotColor(f.severity) }}
              />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-700">
                  {FLAG_LABEL[f.kind]}
                  {f.skillId ? (
                    <span className="font-normal text-ink-500"> · {titleOf(f.skillId)}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-[1.5] text-ink-500">{f.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Retention checks now flow into the signal list above as
          "retention-probes-due" flags (Phase 7C — lib/retention, scheduling
          only; the probe itself is served + scored through the unchanged
          engine). No separate stub row. */}
    </div>
  );
}
