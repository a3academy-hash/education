"use client";

// app/preview/pilot/LessonView.tsx — renders the parsed lesson (DEV-ONLY
// preview) in document order: prose blocks, visuals through VisualBlock's
// honest mapping, authoring-metadata asides collapsed, and §4 embedded checks
// interactive wherever parse-lesson produced a keyed MC (select → deterministic
// check → tagged feedback + one-rung-at-a-time ladder). React state only;
// nothing persists, nothing leaves the browser.

import { useState } from "react";
import { Card } from "@/components/ui";
import type {
  EmbeddedCheck,
  HintLadder,
  InlineSpan,
  LessonBlock,
  LessonSection,
  PreviewNode,
} from "@/lib/pilot-preview/types";
import { checkChoice } from "@/lib/pilot-preview/check";
import { LessonVisualBlock } from "./VisualBlock";
import {
  AuthoringAside,
  ChoiceAnswer,
  CorrectPanel,
  HintLadderPanel,
  InlineText,
  WrongPanel,
} from "./shared";

// ---------------------------------------------------------------------------
// Ladder lookup for lesson checks: traps carry a tag, ladders carry a tag.
// ---------------------------------------------------------------------------

function ladderByTag(
  ladders: Record<string, HintLadder>,
  tag: string | null,
): HintLadder | null {
  if (tag !== null) {
    const hit = Object.values(ladders).find((l) => l.tag === tag);
    if (hit) return hit;
  }
  // Generic ladder = the one with no tag (HL-L06-generic in the gold node).
  return Object.values(ladders).find((l) => l.tag === null) ?? null;
}

// ---------------------------------------------------------------------------
// Embedded check — the only interactive lesson block.
// ---------------------------------------------------------------------------

function EmbeddedCheckBlock({
  check,
  ladders,
}: {
  check: EmbeddedCheck;
  ladders: Record<string, HintLadder>;
}) {
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [attempt, setAttempt] = useState(0);

  // Spec behavior: selecting an option IS the answer (select → check).
  const onSelect = (id: string) => {
    if (status === "correct") return;
    setSelected(id);
    setStatus(checkChoice(id, check.correct) ? "correct" : "wrong");
    setAttempt((n) => n + 1);
  };

  const trap =
    status === "wrong" ? (check.traps.find((t) => t.option === selected) ?? null) : null;
  const marked: Record<string, "you-correct" | "you-wrong" | "correct"> = {};
  if (status === "correct") marked[selected] = "you-correct";
  if (status === "wrong") {
    marked[selected] = "you-wrong";
  }

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-border-strong bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        embedded check · {check.id}
      </p>
      <p className="text-[14px] font-semibold text-ink">{check.title}</p>
      {check.question.map((spans, i) => (
        <p key={i} className="text-[14px] leading-[1.7] text-ink-700">
          <InlineText spans={spans} />
        </p>
      ))}
      <ChoiceAnswer
        options={check.options.map((o) => ({ id: o.id, text: `${o.id}) ${o.text}` }))}
        selectedId={selected}
        onSelect={onSelect}
        disabled={status === "correct"}
        marked={marked}
        ariaLabel={`${check.id} — choose one`}
      />
      {status === "correct" && <CorrectPanel>{check.correctFeedback}</CorrectPanel>}
      {status === "wrong" && (
        <>
          <WrongPanel tag={trap?.tag ?? null} signature={trap?.note} />
          <HintLadderPanel
            key={`${check.id}-${attempt}`}
            ladder={ladderByTag(ladders, trap?.tag ?? null)}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plain blocks
// ---------------------------------------------------------------------------

function Blockquote({ paragraphs }: { paragraphs: InlineSpan[][] }) {
  return (
    <blockquote className="flex flex-col gap-2 border-l-2 border-border-strong pl-4">
      {paragraphs.map((spans, i) => (
        <p key={i} className="text-[14px] leading-[1.7] text-ink-700">
          <InlineText spans={spans} />
        </p>
      ))}
    </blockquote>
  );
}

function Block({
  block,
  ladders,
}: {
  block: LessonBlock;
  ladders: Record<string, HintLadder>;
}) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p className="text-[14px] leading-[1.7] text-ink-700">
          <InlineText spans={block.spans} />
        </p>
      );
    case "subheading":
      return <h3 className="mt-2 text-[15px] font-semibold text-ink">{block.text}</h3>;
    case "blockquote":
      return <Blockquote paragraphs={block.paragraphs} />;
    case "table":
      // Minimal transform (parser contract): markdown tables render preformatted.
      return (
        <pre className="overflow-x-auto rounded-[10px] border border-track bg-inset p-3 font-mono text-[12px] leading-[1.6] text-ink-700">
          {block.lines.join("\n")}
        </pre>
      );
    case "list":
      return (
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {block.items.map((spans, i) => (
            <li key={i} className="text-[14px] leading-[1.7] text-ink-700">
              <InlineText spans={spans} />
            </li>
          ))}
        </ul>
      );
    case "visual":
      return (
        <LessonVisualBlock raw={block.raw} visualId={block.visualId} visualType={block.visualType} />
      );
    case "authoring-aside":
      return <AuthoringAside text={block.lines.join("\n")} />;
    case "embedded-check":
      return <EmbeddedCheckBlock check={block.check} ladders={ladders} />;
  }
}

// ---------------------------------------------------------------------------
// Sections → the full lesson
// ---------------------------------------------------------------------------

function SectionBody({
  section,
  ladders,
}: {
  section: LessonSection;
  ladders: Record<string, HintLadder>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {section.blocks.map((block, i) => (
        <Block key={i} block={block} ladders={ladders} />
      ))}
    </div>
  );
}

export function LessonView({ node }: { node: PreviewNode }) {
  if (!node.lesson || node.lesson.length === 0) {
    return (
      <Card padding="compact">
        <p className="text-[14px] text-ink-700">
          No lesson content loaded for {node.nodeId}.
        </p>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {node.lesson.map((section) =>
        section.authoringOnly ? (
          // Whole authoring-metadata sections (front matter, appendix) are
          // collapsed — never presented as student text.
          <details
            key={section.id}
            className="rounded-[14px] border border-border bg-inset px-5 py-3"
          >
            <summary className="cursor-pointer select-none text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
              {section.title} — authoring metadata, not student-visible
            </summary>
            <div className="mt-4">
              <SectionBody section={section} ladders={node.ladders} />
            </div>
          </details>
        ) : (
          <Card key={section.id} as="section">
            <h2 className="mb-4 text-[17px] font-semibold text-ink">
              {section.number !== null ? `${section.number}. ` : ""}
              {section.title}
            </h2>
            <SectionBody section={section} ladders={node.ladders} />
          </Card>
        ),
      )}
    </div>
  );
}
