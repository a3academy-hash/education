// /admin/students — staff roster (Phase 7 §A.4). SERVER component (mr-gates G7:
// no client fetch). Behind requireStaff(): production with no JWT → notFound().
// Iterates every known student through the repository, builds the roster via the
// pure builder, and renders a scannable Table. The "is the engine working across
// the whole school" view.

import Link from "next/link";
import { requireStaff } from "../../../lib/auth/staff-guard";
import { getRepository } from "../../../lib/repository/server";
import { buildRoster, type RosterStudentInput } from "../../../lib/insight/roster";
import { StaffShell } from "../../../components/layout/StaffShell";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { InsetPanel } from "../../../components/ui/Panels";
import { StatusPill } from "../../../components/ui/StatusPill";
import { SeverityPill } from "../../../components/insight/SeverityPill";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "../../../components/ui/Table";

export const metadata = {
  title: "Students — A3 Academy Staff",
};

function relativeDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default async function AdminStudentsPage() {
  const staff = await requireStaff();

  const repo = await getRepository();
  const graph = await repo.getGraph();
  const profiles = await repo.listStudents();

  const inputs: RosterStudentInput[] = await Promise.all(
    profiles.map(async (profile) => {
      const [states, attempts, updates] = await Promise.all([
        repo.getSkillStates(profile.id),
        repo.listAttempts(profile.id),
        repo.listMasteryUpdates(profile.id),
      ]);
      return { profile, states, attempts, updates };
    }),
  );

  const nowIso = new Date().toISOString();
  const rows = buildRoster(graph, inputs, staff.campusId, staff.role, nowIso);
  const isCoach = staff.role === "coach";

  // Coach lead (R7): amber + rose count first, with the single next action.
  const attentionCount = rows.filter((r) => r.band !== "on_track").length;
  const leadAction = rows.find((r) => r.band === "intervention")?.nextAction ??
    rows.find((r) => r.band === "watch")?.nextAction ??
    "";

  const PACE_LABEL: Record<string, string> = {
    ahead: "Ahead",
    on_track: "On track",
    behind: "Behind",
  };

  return (
    <StaffShell>
      <div className="fade-in">
        <PageHeader
          eyebrow="Staff · roster"
          title="Students"
          subhead={
            isCoach
              ? "Roster-scoped severity bands and signals. Coaches see need-to-know bands only."
              : "Every student's current adaptive decision, last activity, and any signals worth a look. Read-only over the immutable evidence logs."
          }
        />

        {isCoach && rows.length > 0 && (
          <Card className="mb-5" padding="compact">
            <p className="text-[13px] font-medium text-ink">
              {attentionCount === 0
                ? "All students on track."
                : `${attentionCount} student${attentionCount === 1 ? "" : "s"} need a look.`}
            </p>
            {leadAction && (
              <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-500">{leadAction}</p>
            )}
          </Card>
        )}

        {rows.length === 0 ? (
          <Card>
            <InsetPanel>No students yet.</InsetPanel>
          </Card>
        ) : (
          <Card padding="flush">
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow first>
                    <Th className="px-[18px]">Student</Th>
                    {!isCoach && <Th>Current focus</Th>}
                    {!isCoach && <Th>Status</Th>}
                    <Th>Standing</Th>
                    <Th>Pace</Th>
                    <Th>Last active</Th>
                    <Th align="right" className="pr-[18px]">
                      Signals
                    </Th>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={row.studentId} first={i === 0} interactive>
                      <Td className="px-[18px]">
                        {isCoach ? (
                          <span className="text-ink">{row.displayName}</span>
                        ) : (
                          <Link
                            href={`/admin/students/${row.studentId}`}
                            className="rounded-[6px] text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            {row.displayName}
                          </Link>
                        )}
                      </Td>
                      {!isCoach && (
                        <Td secondary>{row.currentSkillTitle || "Course complete"}</Td>
                      )}
                      {!isCoach && (
                        <Td>{row.currentStatus && <StatusPill status={row.currentStatus} />}</Td>
                      )}
                      <Td>
                        <SeverityPill band={row.band} />
                      </Td>
                      <Td secondary>{PACE_LABEL[row.pace]}</Td>
                      <Td secondary>{relativeDate(row.lastActiveAt)}</Td>
                      <Td align="right" className="pr-[18px]" secondary>
                        {row.openFlags}
                      </Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </StaffShell>
  );
}
