"use client";

// app/preview/pilot/PilotPreviewClient.tsx — the DEV-ONLY pilot preview shell:
// node picker (gold ALG-L06 + three pilot slots) and view tabs
// (Lesson | Item Bank | Compare). All content arrives serialized from the
// server component (local files only); all interaction state is React state —
// nothing persists, nothing leaves the browser.

import { useState } from "react";
import { Card } from "@/components/ui";
// SegmentedControl is not exported from the "@/components/ui" barrel (same as
// ChoiceInput); direct-path import matches existing usage (RewardModeToggle).
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Archetype, PreviewNode } from "@/lib/pilot-preview/types";
import { ARCHETYPES } from "@/lib/pilot-preview/types";
import { ItemCard } from "./ItemRenderers";
import { LessonView } from "./LessonView";
import { Chip, ErrorCard, StubCard } from "./shared";

type ViewTab = "lesson" | "items" | "compare";
type ArchetypeFilter = Archetype | "all";

const GOLD_ID = "ALG-L06";

// ---------------------------------------------------------------------------
// Item bank
// ---------------------------------------------------------------------------

function ItemBank({
  node,
  filter = "all",
}: {
  node: PreviewNode;
  filter?: ArchetypeFilter;
}) {
  if (node.source === "stub") return <StubCard node={node} />;
  const items =
    filter === "all" ? node.items : node.items.filter((it) => it.archetype === filter);
  if (node.items.length === 0) {
    return (
      <Card padding="compact">
        <p className="text-[14px] text-ink-700">
          No items loaded for {node.nodeId}.
          {node.error ? " See the load error above." : ""}
        </p>
      </Card>
    );
  }
  if (items.length === 0) {
    return (
      <Card padding="compact">
        <p className="text-[14px] text-ink-700">
          {node.nodeId} has no {filter} items ({node.items.length} items in other archetypes).
        </p>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {items.map((it) => (
        <ItemCard key={it.item.id} node={node} previewItem={it} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare — gold left, selected pilot right, independent scroll
// ---------------------------------------------------------------------------

function ComparePane({
  node,
  filter,
  side,
}: {
  node: PreviewNode | undefined;
  filter: ArchetypeFilter;
  side: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      {node ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={node.source === "gold" ? "gold" : "muted"}>{node.source}</Chip>
            <span className="font-mono text-[13px] text-ink-700">{node.nodeId}</span>
            <span className="text-[13px] text-ink-500">{node.title}</span>
          </div>
          <div className="max-h-[70vh] overflow-y-auto rounded-[14px] border border-border bg-inset p-4">
            <div className="flex flex-col gap-4">
              {node.error && <ErrorCard nodeId={node.nodeId} error={node.error} />}
              <ItemBank node={node} filter={filter} />
            </div>
          </div>
        </>
      ) : (
        <Card padding="compact">
          <p className="text-[14px] text-ink-700">No node loaded for the {side} pane.</p>
        </Card>
      )}
    </div>
  );
}

function CompareView({ nodes }: { nodes: PreviewNode[] }) {
  const gold = nodes.find((n) => n.nodeId === GOLD_ID);
  const pilots = nodes.filter((n) => n.nodeId !== GOLD_ID);
  const [rightId, setRightId] = useState(pilots[0]?.nodeId ?? "");
  const [filter, setFilter] = useState<ArchetypeFilter>("all");
  const right = pilots.find((n) => n.nodeId === rightId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-6">
        <div className="lg:w-[340px]">
          <SegmentedControl
            options={pilots.map((n) => ({ value: n.nodeId, label: n.nodeId }))}
            value={rightId}
            onChange={setRightId}
            ariaLabel="Pilot node for the right pane"
          />
        </div>
        <div className="min-w-0 flex-1">
          <SegmentedControl<ArchetypeFilter>
            options={[
              { value: "all", label: "all" },
              ...ARCHETYPES.map((a) => ({
                value: a as ArchetypeFilter,
                // "scaffolded-multistep" shortens to fit; the rest render in
                // full (the control wraps if needed) — no truncated jargon.
                label: a.replace("scaffolded-multistep", "scaffolded"),
              })),
            ]}
            value={filter}
            onChange={setFilter}
            ariaLabel="Archetype filter"
          />
        </div>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <ComparePane node={gold} filter={filter} side="left (gold)" />
        <ComparePane node={right} filter={filter} side="right (pilot)" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function PilotPreviewClient({ nodes }: { nodes: PreviewNode[] }) {
  const [nodeId, setNodeId] = useState(nodes[0]?.nodeId ?? GOLD_ID);
  const [tab, setTab] = useState<ViewTab>("lesson");
  const node = nodes.find((n) => n.nodeId === nodeId);

  if (nodes.length === 0) {
    return <ErrorCard nodeId="(none)" error="loadPreviewNode returned no nodes." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <SegmentedControl
          options={nodes.map((n) => ({
            value: n.nodeId,
            label: n.nodeId === GOLD_ID ? `${n.nodeId} (gold)` : n.nodeId,
            sublabel: n.source === "stub" ? "stub — content pending" : n.title,
          }))}
          value={nodeId}
          onChange={setNodeId}
          ariaLabel="Preview node"
        />
        <SegmentedControl<ViewTab>
          options={[
            { value: "lesson", label: "Lesson" },
            { value: "items", label: "Item Bank" },
            { value: "compare", label: "Compare" },
          ]}
          value={tab}
          onChange={setTab}
          ariaLabel="View"
          className="max-w-[420px]"
        />
      </div>

      {tab === "compare" ? (
        <CompareView nodes={nodes} />
      ) : !node ? (
        <ErrorCard nodeId={nodeId} error="node not found in the loaded set." />
      ) : (
        <div className="flex flex-col gap-4">
          {node.error && <ErrorCard nodeId={node.nodeId} error={node.error} />}
          {tab === "lesson" &&
            (node.source === "stub" ? (
              <StubCard node={node} />
            ) : (
              <LessonView node={node} />
            ))}
          {tab === "items" && <ItemBank node={node} />}
        </div>
      )}
    </div>
  );
}
