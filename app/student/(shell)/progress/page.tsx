// /student/progress — parent/student weekly progress digest + family transcript
// (Phase 7 §B). SERVER component (mr-gates G7); self-scoped via STUDENT_COOKIE
// like the rest of /student/(shell). Layout P4: digest first (hero Card),
// transcript second (Table, default density). Parent-legible voice: no engine
// jargon, no percentages, no empty 0-bars, no comparative language, no raw audit
// rows, no "AI" framing. Primary action = "Continue learning" → /student.

import { cookies } from "next/headers";
import Link from "next/link";
import { getRepository } from "../../../../lib/repository/server";
import { buildProgressDigest } from "../../../../lib/digest/progress-digest";
import { buildStandardTranscript } from "../../../../lib/transcript";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { Card } from "../../../../components/ui/Card";
import { InsetPanel, LabeledSection } from "../../../../components/ui/Panels";
import { StatusPill } from "../../../../components/ui/StatusPill";
import { CreditedTag } from "../../../../components/insight/CreditedTag";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "../../../../components/ui/Table";
import { CheckIcon } from "../../../../components/ui/icons";
import { STUDENT_COOKIE } from "../../onboarding/constants";
import type { StandardTranscriptRow } from "../../../../types";

const LINK_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-sans bg-accent text-white " +
  "font-semibold hover:bg-accent-hover text-[14px] px-[22px] py-[11px] transition-colors " +
  "duration-150 ease-[cubic-bezier(.2,.7,.2,1)] focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px";

const deAmp = (label: string): string => label.replace(/\s*&\s*/g, " and ");

export default async function ProgressPage() {
  const cookieStore = await cookies();
  const studentId = cookieStore.get(STUDENT_COOKIE)?.value ?? null;
  if (!studentId) return <NoStudent />;

  const repo = await getRepository();
  const profile = await repo.getStudent(studentId);
  if (!profile) return <NoStudent />;

  const [graph, states, updates, attempts] = await Promise.all([
    repo.getGraph(),
    repo.getSkillStates(studentId),
    repo.listMasteryUpdates(studentId),
    repo.listAttempts(studentId),
  ]);

  const nowIso = new Date().toISOString();
  const digest = buildProgressDigest(
    graph,
    profile,
    states,
    updates,
    attempts,
    profile.campusId,
    nowIso,
  );
  const transcript = buildStandardTranscript(graph, states, updates, {
    studentId,
    courseId: "algebra1",
    generatedAt: nowIso,
  });

  // K5: plain-language column = the component skill titles ("Skills in this
  // standard") — never presented as an official definition of the standard.
  const titleOf = (id: string): string =>
    graph.nodes.find((n) => n.id === id)?.title ?? id;
  const skillsLabel = (row: StandardTranscriptRow): string =>
    row.componentSkillIds.map(titleOf).map(deAmp).join(", ");

  const creditRows = transcript.creditBearing;

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow={`${profile.displayName}'s progress`}
        title="This week at a glance"
        subhead="A plain-language summary of what's been learned, what's next, and the standards proven so far."
      />

      {/* Hero digest Card. */}
      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Left: mastered this week + current focus. */}
          <div>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.4px] text-accent">
              Learned this week
            </p>
            {digest.masteredThisWeek.length === 0 ? (
              <InsetPanel>
                Nothing newly mastered in the last week yet — steady practice this
                week will get there.
              </InsetPanel>
            ) : (
              <ul className="grid gap-2.5">
                {digest.masteredThisWeek.map((m) => (
                  <li key={m.skillId} className="flex items-start gap-2.5">
                    <CheckIcon className="mt-[3px] shrink-0 text-[var(--color-status-mastered)]" />
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-ink">
                        {deAmp(m.title)}
                        {m.credited && <CreditedTag className="ml-2 align-middle" />}
                      </p>
                      {m.helpsUnlock.length > 0 && (
                        <p className="mt-0.5 text-[12.5px] leading-[1.5] text-ink-500">
                          Helps unlock {deAmp(m.helpsUnlock.slice(0, 2).join(", "))}
                          {m.helpsUnlock.length > 2 ? ", and more" : ""}.
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
                Working on now
              </p>
              {digest.courseComplete || !digest.currentFocus ? (
                <p className="text-[14px] leading-[1.55] text-ink-700">
                  Every skill we&rsquo;ve mapped is solid. New material unlocks as
                  the course expands.
                </p>
              ) : (
                <>
                  <p className="text-[15px] font-medium text-ink">
                    {deAmp(digest.currentFocus.title)}
                  </p>
                  <p className="mt-1.5 max-w-[440px] text-[13.5px] leading-[1.55] text-ink-500">
                    {deAmp(digest.currentFocus.reason)}
                  </p>
                </>
              )}
            </div>

            <div className="mt-6">
              <Link href="/student" className={LINK_PRIMARY}>
                Continue learning
              </Link>
            </div>
          </div>

          {/* Right: effort summary (no percentages, no comparative language). */}
          <div className="lg:border-l lg:border-selected lg:pl-6">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
              This week&rsquo;s effort
            </p>
            <dl className="grid gap-3.5">
              <div>
                <dt className="text-[12.5px] text-ink-500">Time on task</dt>
                <dd className="mt-0.5 text-[18px] font-semibold text-ink">
                  {digest.timeOnTask}
                </dd>
              </div>
              <div>
                <dt className="text-[12.5px] text-ink-500">Problems worked</dt>
                <dd className="mt-0.5 text-[18px] font-semibold text-ink">
                  {digest.attemptsThisWeek}
                </dd>
              </div>
            </dl>

            <p className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
              By topic
            </p>
            <ul className="grid gap-2">
              {digest.domains.map((d) => (
                <li key={d.domainId} className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-ink-700">{deAmp(d.label)}</span>
                  <span className="shrink-0 text-[12.5px] text-ink-500">
                    {d.assessed ? `${d.mastered} of ${d.total} mastered` : "Not yet assessed"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Transcript — credit-bearing standards, family-readable. */}
      <LabeledSection label="Standards proven">
        <p className="mb-3 max-w-[640px] text-[13px] leading-[1.5] text-ink-500">
          The Algebra 1 standards {profile.displayName} has demonstrated. A standard
          shows as mastered only when every skill inside it is mastered.
        </p>
        {creditRows.length === 0 ? (
          <Card>
            <InsetPanel>
              No standards proven yet — they&rsquo;ll appear here as skills are
              mastered.
            </InsetPanel>
          </Card>
        ) : (
          <Card padding="flush">
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow first>
                    <Th className="px-[18px]">Standard</Th>
                    <Th>Skills in this standard</Th>
                    <Th>Status</Th>
                    <Th align="right" className="pr-[18px]">
                      Skills mastered
                    </Th>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {creditRows.map((row, i) => (
                    <TableRow key={row.ccss} first={i === 0}>
                      <Td className="px-[18px] font-mono !text-[12.5px] !text-ink-700">
                        {row.ccss}
                      </Td>
                      <Td secondary>{skillsLabel(row)}</Td>
                      <Td>
                        <StatusPill status={row.status} />
                      </Td>
                      <Td align="right" className="pr-[18px]" secondary>
                        {row.masteredCount} of {row.totalCount}
                      </Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </LabeledSection>
    </div>
  );
}

function NoStudent() {
  return (
    <div className="fade-in">
      <PageHeader eyebrow="Your progress" title="This week at a glance" />
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
