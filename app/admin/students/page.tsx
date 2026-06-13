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
import { Table, TableHead, TableBody, TableRow, Th, Td } from "../../../components/ui/Table";

export const metadata = {
  title: "Students — A3 Academy Staff",
};

function relativeDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default async function AdminStudentsPage() {
  const staff = requireStaff();

  const repo = getRepository();
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
  const rows = buildRoster(graph, inputs, staff.campusId, nowIso);

  return (
    <StaffShell>
      <div className="fade-in">
        <PageHeader
          eyebrow="Staff · roster"
          title="Students"
          subhead="Every student's current adaptive decision, last activity, and any signals worth a look. Read-only over the immutable evidence logs."
        />

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
                    <Th>Current focus</Th>
                    <Th>Status</Th>
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
                        <Link
                          href={`/admin/students/${row.studentId}`}
                          className="rounded-[6px] text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {row.displayName}
                        </Link>
                      </Td>
                      <Td secondary>{row.currentSkillTitle || "Course complete"}</Td>
                      <Td>
                        <StatusPill status={row.currentStatus} />
                      </Td>
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
