"use client";

// DecisionTimeline — the Admin Decision Log centerpiece (Phase 7, pee-wee P2).
// Left-rail 1px spine + a 7px outcome-status dot per entry. Collapsed entry =
// 3 lines max (date + templated/verbatim sentence; quiet mono metadata line).
// One "Show {n} attempts" disclosure expands a dense Table inside an InsetPanel;
// the evidence footer renders as an 11px mono "Evidence" receipt. The dot color
// is the outcome status token — we NEVER tint a whole row red. Reduced motion is
// handled globally (app/globals.css); disclosures are real <button>s, keyboard
// accessible with focus-visible; text stays ≥ ink-500 at 12.5px for AA contrast.

import { useState } from "react";
import { InsetPanel } from "../ui/Panels";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "../ui/Table";
import type { DecisionTimelineEntry, MasteryStatus } from "@/types";

const STATUS_TOKEN: Record<MasteryStatus, string> = {
  unknown: "var(--color-status-unknown)",
  introduced: "var(--color-status-introduced)",
  developing: "var(--color-status-developing)",
  near_mastery: "var(--color-status-near-mastery)",
  mastered: "var(--color-status-mastered)",
  needs_review: "var(--color-status-needs-review)",
  prerequisite_gap: "var(--color-status-prerequisite-gap)",
};

/** Sessions (no outcome status) use a neutral ink dot. */
const SESSION_DOT = "var(--color-ink-400)";

function dotColor(entry: DecisionTimelineEntry): string {
  return entry.outcomeStatus ? STATUS_TOKEN[entry.outcomeStatus] : SESSION_DOT;
}

export interface DecisionTimelineProps {
  entries: DecisionTimelineEntry[];
  /** Empty-state copy noun, e.g. the student's first name. */
  emptyName?: string;
}

export function DecisionTimeline({ entries, emptyName }: DecisionTimelineProps) {
  if (entries.length === 0) {
    return (
      <InsetPanel>
        No decisions logged yet
        {emptyName ? ` — ${emptyName} hasn't started a session.` : "."}
      </InsetPanel>
    );
  }
  return (
    <ol className="relative ml-1">
      {/* Spine */}
      <span aria-hidden className="absolute left-[3px] top-1 bottom-1 w-px bg-border" />
      {entries.map((entry, i) => (
        <TimelineRow
          key={entry.evidence.masteryUpdateIds[0] ?? entry.evidence.attemptIds[0] ?? `${entry.skillId}-${i}`}
          entry={entry}
          showArc={i === 0 || entries[i - 1].arcLabel !== entry.arcLabel}
        />
      ))}
    </ol>
  );
}

function TimelineRow({
  entry,
  showArc,
}: {
  entry: DecisionTimelineEntry;
  showArc: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rows = entry.session?.rows ?? [];
  const ev = entry.evidence;

  return (
    <li className="relative pl-6 pb-6 last:pb-0">
      {/* Outcome dot on the spine */}
      <span
        aria-hidden
        className="absolute left-0 top-[5px] inline-block rounded-full ring-2 ring-canvas"
        style={{ width: 7, height: 7, background: dotColor(entry) }}
      />

      {entry.arcLabel && showArc && (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
          {entry.arcLabel}
        </p>
      )}

      {/* Line 1+2: the factual/verbatim sentence (3 lines max collapsed). */}
      <p className="text-[13.5px] leading-[1.5] text-ink-700">{entry.sentence}</p>

      {/* Quiet mono metadata line. */}
      {entry.session && (
        <p className="mt-1 font-mono text-[11.5px] text-ink-500">
          {entry.session.correctCount}/{entry.session.attemptCount} correct ·{" "}
          {entry.session.hintsTotal} hint{entry.session.hintsTotal === 1 ? "" : "s"} ·{" "}
          {Math.round(entry.session.timeMsTotal / 1000)}s · {entry.session.sport}
        </p>
      )}

      {/* One disclosure → dense Table inside an InsetPanel. */}
      {rows.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-[7px] px-1 py-0.5 text-[12.5px] font-medium text-accent transition-colors duration-150 hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {open ? "Hide attempts" : `Show ${rows.length} attempt${rows.length === 1 ? "" : "s"}`}
          </button>
          {open && (
            <InsetPanel className="mt-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow first>
                      <Th density="dense">Problem</Th>
                      <Th density="dense">Response</Th>
                      <Th density="dense">Correct</Th>
                      <Th density="dense">Phase</Th>
                      <Th align="right" density="dense">
                        Hints
                      </Th>
                      <Th align="right" density="dense">
                        Time
                      </Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={r.attemptId} first={i === 0}>
                        <Td density="dense" className="font-mono !text-[12px] !text-ink-700">
                          {r.problemId}
                        </Td>
                        <Td density="dense" secondary>
                          {r.response}
                        </Td>
                        <Td density="dense" secondary>
                          {r.correct ? "Yes" : "No"}
                        </Td>
                        <Td density="dense" secondary>
                          {r.phase}
                        </Td>
                        <Td align="right" density="dense" secondary>
                          {r.hintsUsed}
                        </Td>
                        <Td align="right" density="dense" secondary>
                          {Math.round(r.timeMs / 1000)}s
                        </Td>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </InsetPanel>
          )}
        </div>
      )}

      {/* Evidence receipt — 11px mono audit link. */}
      <p className="mt-2 font-mono text-[11px] leading-[1.5] text-ink-400">
        <span className="font-semibold uppercase tracking-[0.4px]">Evidence</span>
        {ev.engineVersion ? ` · engine ${ev.engineVersion}` : ""}
        {ev.masteryUpdateIds.length > 0 ? ` · mu ${ev.masteryUpdateIds.join(", ")}` : ""}
        {ev.attemptIds.length > 0 ? ` · att ${ev.attemptIds.length}` : ""}
      </p>
    </li>
  );
}
