"use client";

// app/preview/pilot/shared.tsx — small shared client pieces for the DEV-ONLY
// pilot preview: inline-span text, badge chips, wrong/correct feedback,
// one-rung-at-a-time hint ladders, and the numeric answer field (the REAL
// ui/Input in math mode). All state is React state only; nothing persists,
// nothing leaves the browser.

import { useState, type ReactNode } from "react";
import { Button, Card, Input, InsetPanel } from "@/components/ui";
// ChoiceInput is not exported from the "@/components/ui" barrel; the existing
// student surfaces (PracticeFlow, DiagnosticFlow) import it by direct path, so
// the preview follows the same convention rather than widening the barrel.
import { ChoiceInput } from "@/components/ui/ChoiceInput";
import type { HintLadder, InlineSpan, ItemChoice, PreviewItem, PreviewNode } from "@/lib/pilot-preview/types";

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export function InlineText({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((s, i) => {
        if (s.code) {
          // Preformatted span (also used for tables inside blockquotes).
          return s.text.includes("\n") ? (
            <span
              key={i}
              className="block overflow-x-auto whitespace-pre font-mono text-[12.5px] text-ink-700"
            >
              {s.text}
            </span>
          ) : (
            <code key={i} className="rounded bg-inset px-1 font-mono text-[13px]">
              {s.text}
            </code>
          );
        }
        if (s.bold) return <strong key={i} className="font-semibold text-ink">{s.text}</strong>;
        if (s.italic) return <em key={i}>{s.text}</em>;
        return <span key={i}>{s.text}</span>;
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "muted" | "green" | "amber";
}) {
  // gold is exclusive to provenance (GOLD hand-authored); described-not-built
  // labels use the retrieval amber, matching their panel borders.
  const color =
    tone === "gold"
      ? "var(--color-gold)"
      : tone === "green"
        ? "var(--color-success)"
        : tone === "amber"
          ? "var(--color-retrieval)"
          : tone === "muted"
            ? "var(--color-ink-500)"
            : "var(--color-ink-700)";
  return (
    <span
      className="inline-flex items-center rounded-full bg-chip px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.4px]"
      style={{ color }}
    >
      {children}
    </span>
  );
}

const SOURCE_LABEL: Record<PreviewItem["source"] | "stub", string> = {
  gold: "GOLD hand-authored",
  machine: "MACHINE generated",
  stub: "STUB",
};

export function BadgeRow({ item }: { item: PreviewItem }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip tone={item.source === "gold" ? "gold" : "neutral"}>
        {SOURCE_LABEL[item.source]}
      </Chip>
      <Chip>{item.archetype}</Chip>
      <Chip tone="muted">difficulty {item.difficulty}</Chip>
      <Chip tone="muted">
        {item.phase}
        {item.sport !== "neutral" ? ` · ${item.sport}` : " · neutral"}
      </Chip>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback + hint ladder (one rung at a time; rung 3 never auto-shows)
// ---------------------------------------------------------------------------

export function CorrectPanel({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-success-border bg-success-bg px-4 py-3">
      <p className="text-[13.5px] leading-[1.5]" style={{ color: "var(--color-success)" }}>
        <span className="font-semibold">Correct.</span> {children}
      </p>
    </div>
  );
}

export function WrongPanel({
  tag,
  signature,
}: {
  tag: string | null;
  signature?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Student-visible feedback: the red panel with the tag chip only. */}
      <div className="rounded-[10px] border border-error-border bg-error-bg-soft px-4 py-3">
        <p className="text-[13.5px] font-semibold text-error-ink">Not yet.</p>
        {tag ? (
          <p className="mt-1 text-[13px] leading-[1.5] text-error-ink">
            <span className="rounded bg-error-bg px-1.5 py-0.5 font-mono text-[12px]">{tag}</span>
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-error-ink">
            No misconception signature matched — untagged wrong answer (generic ladder below).
          </p>
        )}
      </div>
      {/* Detection rationale is authoring metadata (GOLD_NODE_LESSON.md contract:
          "recorded here, not in feedback") — rendered as a muted dev strip,
          never inside the student-styled panel. */}
      {tag && signature ? (
        <p className="rounded-[8px] border border-track bg-inset px-3 py-1.5 text-[12px] leading-[1.5] text-ink-500">
          <span className="font-mono font-semibold">detection:</span> {signature}
        </p>
      ) : null}
    </div>
  );
}

export function HintLadderPanel({ ladder }: { ladder: HintLadder | null }) {
  const [shown, setShown] = useState(0);
  if (!ladder) {
    return (
      <p className="text-[12.5px] text-ink-500">
        No hint ladder available for this response (machine banks carry no ladders yet).
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {ladder.rungs.slice(0, shown).map((rung, i) => (
        <InsetPanel key={i} label={`${ladder.id} — hint ${i + 1} of 3`}>
          {rung}
        </InsetPanel>
      ))}
      {shown < 3 && (
        <div>
          <Button size="sm" variant="secondary" onClick={() => setShown((n) => n + 1)}>
            {shown === 0 ? "Show a hint" : `Show hint ${shown + 1} of 3`}
          </Button>
        </div>
      )}
      {/* The parsed neverSay line is an authoring contract, not a hint —
          available (collapsed, muted) only once the full ladder is out. */}
      {shown >= 3 && ladder.neverSay && (
        <details>
          <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            neverSay contract — dev metadata
          </summary>
          <p className="mt-1 font-mono text-[12px] leading-[1.6] text-ink-500">
            {ladder.neverSay}
          </p>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Answer inputs
// ---------------------------------------------------------------------------

/**
 * Numeric answers use the REAL ui/Input in math mode (mono, 16px) WITHOUT the
 * MathKeypad. Chosen over MathKeypad because: this is a desktop dev-review
 * surface, not a student touch surface; check.ts already accepts typed "a/b"
 * fractions and both minus glyphs, so the keypad's notation help adds nothing
 * a hardware keyboard can't do; and a keypad under every scaffolded part
 * (up to four per item, many items per page) would bury the content being
 * reviewed under input chrome.
 */
export function NumericAnswerField({
  label,
  value,
  onChange,
  onSubmit,
  disabled = false,
}: {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && value.trim() !== "") onSubmit();
      }}
    >
      <div className="flex items-end gap-2">
        <Input
          label={label}
          fieldMode="math"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="max-w-[220px]"
          aria-label={label ?? "Your answer"}
        />
        <Button type="submit" variant="secondary" disabled={disabled || value.trim() === ""}>
          Check
        </Button>
      </div>
    </form>
  );
}

/** Choice options rendered through the REAL ChoiceInput; option TEXT is the
 * row value (ids map back by index). */
export function ChoiceAnswer({
  options,
  selectedId,
  onSelect,
  disabled = false,
  marked,
  ariaLabel,
}: {
  options: ItemChoice[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
  marked?: Record<string, "you-correct" | "you-wrong" | "correct">;
  ariaLabel?: string;
}) {
  const display = options.map((o) => o.text);
  const selected = options.find((o) => o.id === selectedId);
  const markedRows: Record<string, "you-correct" | "you-wrong" | "correct"> = {};
  if (marked) {
    for (const [id, mark] of Object.entries(marked)) {
      const opt = options.find((o) => o.id === id);
      if (opt) markedRows[opt.text] = mark;
    }
  }
  return (
    <ChoiceInput
      choices={display}
      value={selected?.text ?? ""}
      onChange={(text) => {
        const idx = display.indexOf(text);
        if (idx >= 0) onSelect(options[idx].id);
      }}
      disabled={disabled}
      markedRows={markedRows}
      ariaLabel={ariaLabel ?? "Choose one"}
    />
  );
}

// ---------------------------------------------------------------------------
// Stub / error cards
// ---------------------------------------------------------------------------

export function StubCard({ node }: { node: PreviewNode }) {
  return (
    <Card padding="compact">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Chip tone="muted">STUB</Chip>
          <span className="font-mono text-[13px] text-ink-700">{node.nodeId}</span>
          <span className="text-[13px] text-ink-500">{node.title}</span>
        </div>
        <p className="text-[14px] leading-[1.6] text-ink-700">{node.stubNotice}</p>
        <p className="font-mono text-[12px] text-ink-500">
          .authoring-tmp/taxonomies/{node.nodeId}/taxonomy.md present:{" "}
          {node.taxonomyPresent ? "yes" : "no"} · .authoring-tmp/regen/{node.nodeId}
          /node.json present: no
        </p>
      </div>
    </Card>
  );
}

export function ErrorCard({ nodeId, error }: { nodeId: string; error: string }) {
  return (
    <Card tone="error" padding="compact">
      <p className="text-[13.5px] font-semibold text-error-ink">
        Could not load content for {nodeId}
      </p>
      <p className="mt-1 font-mono text-[12.5px] leading-[1.5] text-error-ink">{error}</p>
    </Card>
  );
}

/** Collapsible authoring-metadata aside — never presented as student text. */
export function AuthoringAside({ text }: { text: string }) {
  return (
    <details className="rounded-[10px] border border-border bg-inset px-4 py-2">
      <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        authoring metadata — not student-visible
      </summary>
      <div className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-[1.6] text-ink-500">
        {text}
      </div>
    </details>
  );
}
