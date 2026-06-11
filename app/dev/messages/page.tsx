// /dev/messages — Instructor-message placeholder surface (Phase 5 §E).
// Internal/staff tooling; notFound() in production. Read-only render of the
// MessageThread/Message stub data — NO send wiring (the interaction layer is a
// build-next). This demonstrates the NCAA regular-interaction surface exists
// and that each message can tie to the concrete student work (skillId/attemptId).

import { notFound } from "next/navigation";
import { buildSampleData, SAMPLE_STUDENT_NAME } from "../_sample/data";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { InsetPanel } from "../../../components/ui/Panels";
import type { Message } from "../../../types";

export const metadata = {
  title: "Instructor Messages (dev) — A3 Academy",
};

const MICRO = "text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500";

export default function MessagesPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const { thread, messages } = buildSampleData();
  const ordered = [...messages].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );

  return (
    <main className="mx-auto max-w-[760px] px-7 py-12">
      <PageHeader
        eyebrow="Dev only · staff tooling"
        title="Instructor messages"
        subhead={`Read-only preview of the NCAA regular-interaction surface for ${SAMPLE_STUDENT_NAME} (sample). Each message can reference the specific skill and attempt it concerns. Append-only; send wiring is the next build.`}
      />

      <Card as="section" className="mb-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Header label="Thread" value={thread.id} />
          <Header label="Student" value={thread.studentId} />
          <Header label="Instructor" value={thread.instructorId ?? "—"} />
        </div>
      </Card>

      {ordered.length === 0 ? (
        <Card>
          <InsetPanel>No messages in this thread yet.</InsetPanel>
        </Card>
      ) : (
        <div className="flex flex-col gap-3.5">
          {ordered.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      )}

      <InsetPanel label="Build-next" className="mt-7">
        Composition, delivery, and read receipts are not wired in Phase 5. This
        surface confirms the interaction record exists and links to student work.
      </InsetPanel>
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

function MessageBubble({ message }: { message: Message }) {
  const isInstructor = message.authorRole === "instructor";
  return (
    <Card padding="compact" as="article">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] font-semibold text-ink-800">
          {isInstructor ? "Instructor" : "Student"}
        </span>
        <span className="font-mono text-[11px] text-ink-500">{message.createdAt}</span>
      </div>
      <p className="text-[14px] leading-[1.55] text-ink-800">{message.body}</p>
      {(message.skillId || message.attemptId) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.skillId && <RefChip label="skill" value={message.skillId} />}
          {message.attemptId && <RefChip label="attempt" value={message.attemptId} />}
        </div>
      )}
    </Card>
  );
}

function RefChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-inset px-2 py-0.5">
      <span className={MICRO}>{label}</span>
      <span className="font-mono text-[11.5px] text-ink-700">{value}</span>
    </span>
  );
}
