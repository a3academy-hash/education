// /dev/transcript — Standards Transcript surface (Phase 5 §D). Internal/staff
// tooling; notFound() in production (never ships to a student bundle). Renders
// buildStandardTranscript for the sample student. Two sections (credit-bearing
// vs prerequisite-review), per-standard weakest-link status + N-of-M + a
// provenance link to the MasteryUpdate ids. The transcript is a REGENERABLE
// VIEW computed here at request time — never stored.

import { notFound } from "next/navigation";
import { buildStandardTranscript } from "../../../lib/transcript";
import { buildSampleData, SAMPLE_COURSE_ID, SAMPLE_STUDENT_ID, SAMPLE_STUDENT_NAME } from "../_sample/data";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { LabeledSection, InsetPanel } from "../../../components/ui/Panels";
import { StatusPill } from "../../../components/ui/StatusPill";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "../../../components/ui/Table";
import type { StandardTranscriptRow } from "../../../types";

export const metadata = {
  title: "Standards Transcript (dev) — A3 Academy",
};

const MICRO = "text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500";

export default function TranscriptPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const { graph, states, masteryUpdates } = buildSampleData();
  const transcript = buildStandardTranscript(graph, states, masteryUpdates, {
    studentId: SAMPLE_STUDENT_ID,
    courseId: SAMPLE_COURSE_ID,
    generatedAt: new Date().toISOString(),
  });

  return (
    <main className="mx-auto max-w-[980px] px-7 py-12">
      <PageHeader
        eyebrow="Dev only · staff tooling"
        title="Standards transcript"
        subhead={`Per-CCSS roll-up for ${SAMPLE_STUDENT_NAME} (sample). Status is the weakest-link of every contributing skill — a standard is mastered only when every component skill is. Regenerated at request time from the immutable mastery log.`}
      />

      <Card as="section">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Header label="Student" value={`${SAMPLE_STUDENT_NAME} · ${transcript.studentId}`} />
          <Header label="Course" value={transcript.courseId} />
          <Header label="Graph schema" value={transcript.graphSchemaVersion} />
          <Header label="Generated" value={transcript.generatedAt} />
        </div>
      </Card>

      <div className="mt-7">
        <Section
          label="Credit-bearing standards · Algebra 1"
          note="HS conceptual-category codes (A-/F-/N-/S-/G-). Credit and NCAA claims derive ONLY from this section."
          rows={transcript.creditBearing}
        />
      </div>

      <div className="mt-7">
        <Section
          label="Prerequisite-review standards"
          note="Middle-school support codes. These build readiness but do not carry Algebra 1 credit."
          rows={transcript.prerequisiteReview}
        />
      </div>
    </main>
  );
}

function Header({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className={MICRO}>{label}</p>
      <p className="mt-1 break-words font-mono text-[12.5px] text-ink-800">{value}</p>
    </div>
  );
}

function Section({
  label,
  note,
  rows,
}: {
  label: string;
  note: string;
  rows: StandardTranscriptRow[];
}) {
  return (
    <LabeledSection label={`${label} · ${rows.length}`}>
      <p className="mb-3 max-w-[640px] text-[13px] leading-[1.5] text-ink-500">{note}</p>
      {rows.length === 0 ? (
        <Card>
          <InsetPanel>No standards in this section for this student.</InsetPanel>
        </Card>
      ) : (
        <Card padding="flush">
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow first>
                  <Th density="dense" className="px-[18px]">
                    CCSS
                  </Th>
                  <Th density="dense">Status</Th>
                  <Th align="right" density="dense">
                    Mastered
                  </Th>
                  <Th density="dense" className="pr-[18px]">
                    Evidence (MasteryUpdate ids)
                  </Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={row.ccss} first={i === 0}>
                    <Td density="dense" className="px-[18px] font-mono !text-[12.5px] !text-ink">
                      {row.ccss}
                    </Td>
                    <Td density="dense">
                      <StatusPill status={row.status} />
                    </Td>
                    <Td align="right" density="dense">
                      {row.masteredCount} of {row.totalCount}
                    </Td>
                    <Td density="dense" className="pr-[18px]">
                      {row.evidenceUpdateIds.length === 0 ? (
                        <span className="text-ink-400">—</span>
                      ) : (
                        <span className="font-mono text-[11.5px] text-ink-500">
                          {row.evidenceUpdateIds.join(", ")}
                        </span>
                      )}
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </LabeledSection>
  );
}
