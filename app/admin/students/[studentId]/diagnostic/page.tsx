// /admin/students/[studentId]/diagnostic — STAFF/dev diagnostic grading-
// verification view (read-only, behind requireStaff). For every diagnostic item
// the student saw: the prompt, their answer, the authored answer, whether the
// engine marked it correct, AND an INDEPENDENT re-grade so grading can be
// verified item-by-item. Grouped by section with right/wrong counts. The
// diagnostic deliberately hides feedback from the STUDENT (measurement firewall);
// this surface is for staff/QA only and re-checks every answer.

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "../../../../../lib/auth/staff-guard";
import { getRepository } from "../../../../../lib/repository/server";
import { buildDiagnosticReport } from "../../../../../lib/insight/diagnostic-report";
import { StaffShell } from "../../../../../components/layout/StaffShell";
import { PageHeader } from "../../../../../components/ui/PageHeader";
import { Card } from "../../../../../components/ui/Card";
import { InsetPanel } from "../../../../../components/ui/Panels";
import { MathText } from "../../../../../components/ui/MathText";

export const metadata = {
  title: "Diagnostic responses — A3 Academy Staff",
};

export default async function DiagnosticReportPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const staff = await requireStaff();
  const { studentId } = await params;

  const repo = await getRepository();
  const profile = await repo.getStudent(studentId);
  if (!profile) notFound();
  if (staff.campusId !== null && profile.campusId !== staff.campusId) notFound();

  // FERPA read-audit — staff record disclosure is logged (no PII body).
  try {
    await repo.appendAccessLog({
      actorId: staff.actorId ?? "",
      actorRole: staff.role,
      studentId,
      recordType: "student_insight",
    });
  } catch {
    /* audit is best-effort; never block the staff read */
  }

  const [graph, attempts] = await Promise.all([repo.getGraph(), repo.listAttempts(studentId)]);
  const report = buildDiagnosticReport(attempts, graph);

  return (
    <StaffShell>
      <div className="fade-in">
        <Link
          href={`/admin/students/${studentId}`}
          className="mb-4 inline-block text-[13px] font-medium text-accent hover:underline"
        >
          ← Back to {profile.displayName}
        </Link>
        <PageHeader
          eyebrow={`Staff · ${profile.displayName}`}
          title="Diagnostic responses"
          subhead="Every diagnostic item, the student's answer, the authored answer, and an independent re-grade. Read-only; the student never sees this (measurement firewall)."
        />

        {!report ? (
          <Card>
            <InsetPanel>This student has not taken a diagnostic yet.</InsetPanel>
          </Card>
        ) : (
          <>
            {/* Verification banner — the dev/QA proof. */}
            <Card
              className="mb-5"
              tone={report.allGradesMatch ? "success" : "error"}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-[14px] font-semibold text-ink">
                  {report.totalCorrect} of {report.totalItems} correct
                </p>
                <p
                  className="text-[13px] font-medium"
                  style={{
                    color: report.allGradesMatch
                      ? "var(--color-status-mastered)"
                      : "var(--color-status-prerequisite-gap)",
                  }}
                >
                  {report.allGradesMatch
                    ? `✓ Grading verified — all ${report.totalItems} answers re-graded consistently`
                    : `⚠ ${report.mismatchCount} of ${report.totalItems} disagree with the re-grade — investigate`}
                </p>
              </div>
            </Card>

            {report.sections.map((section) => (
              <Card key={section.domainId} className="mb-5">
                <div className="mb-3 flex items-baseline justify-between">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
                    {section.label}
                  </p>
                  <p className="font-mono text-[12px] text-ink-700">
                    {section.correct} / {section.total}
                  </p>
                </div>
                <ul className="flex flex-col divide-y divide-border">
                  {section.items.map((it) => (
                    <li key={it.attemptId} className="flex items-start gap-3 py-2.5">
                      <span
                        aria-hidden
                        className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{
                          background: it.storedCorrect
                            ? "var(--color-status-mastered)"
                            : "var(--color-status-prerequisite-gap)",
                        }}
                        title={it.storedCorrect ? "marked correct" : "marked incorrect"}
                      >
                        {it.storedCorrect ? "✓" : "✗"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] leading-[1.5] text-ink">
                          <MathText>{it.prompt}</MathText>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[12px]">
                          <span className="text-ink-700">
                            answered: <span className="text-ink">{it.studentAnswer || "—"}</span>
                          </span>
                          <span className="text-ink-500">
                            correct: <span className="text-ink-700">{it.correctAnswer}</span>
                          </span>
                          <span className="text-ink-400">{it.skillId}</span>
                          {it.misconceptionTag && (
                            <span style={{ color: "var(--color-status-needs-review)" }}>
                              ↳ {it.misconceptionTag}
                            </span>
                          )}
                          {!it.gradesMatch && (
                            <span style={{ color: "var(--color-status-prerequisite-gap)" }}>
                              ⚠ re-grade: {it.regradedCorrect ? "correct" : "incorrect"} (mismatch)
                            </span>
                          )}
                          {it.problemMissing && (
                            <span className="text-ink-400">(problem not in current graph)</span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </>
        )}
      </div>
    </StaffShell>
  );
}
