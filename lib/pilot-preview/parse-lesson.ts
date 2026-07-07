// lib/pilot-preview/parse-lesson.ts — split GOLD_NODE_LESSON.md into typed
// sections for the DEV-ONLY pilot preview. MINIMAL markdown transform:
// paragraphs, blockquotes, bold/italic/`code` strip-to-spans, tables →
// preformatted, ```visual fences → visual blocks, "Authoring notes" groups →
// collapsible asides. §4 EC1–EC4 blocks become interactive checks ONLY when
// the structure parses cleanly (question + options + "Correct:" key +
// tag-attributed distractors); otherwise the blocks pass through as prose —
// an answer key is never guessed. Pure string → data; no React, no IO.

import type {
  EmbeddedCheck,
  EmbeddedCheckTrap,
  InlineSpan,
  ItemChoice,
  LessonBlock,
  LessonSection,
} from "./types";

// ---------------------------------------------------------------------------
// Inline spans: **bold**, *italic*, `code`. Everything else passes through.
// ---------------------------------------------------------------------------

const INLINE_RE = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;

export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let last = 0;
  INLINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) spans.push({ text: text.slice(last, m.index) });
    if (m[2] !== undefined) spans.push({ text: m[2], bold: true });
    else if (m[4] !== undefined) spans.push({ text: m[4], italic: true });
    else if (m[6] !== undefined) spans.push({ text: m[6], code: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans.length > 0 ? spans : [{ text }];
}

// ---------------------------------------------------------------------------
// Raw grouping: blank-line-delimited groups + fenced blocks.
// ---------------------------------------------------------------------------

interface RawGroup {
  fence: boolean;
  lines: string[];
}

function splitGroups(lines: string[]): RawGroup[] {
  const groups: RawGroup[] = [];
  let cur: string[] = [];
  let i = 0;
  const flush = () => {
    if (cur.length > 0) {
      groups.push({ fence: false, lines: cur });
      cur = [];
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    if (line.trimStart().startsWith("```")) {
      flush();
      const fenceLines: string[] = [];
      i += 1; // skip the opening fence line
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        fenceLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip the closing fence line (if present)
      groups.push({ fence: true, lines: fenceLines });
      continue;
    }
    if (line.trim() === "") {
      flush();
      i += 1;
      continue;
    }
    cur.push(line);
    i += 1;
  }
  flush();
  return groups;
}

// ---------------------------------------------------------------------------
// Group → block
// ---------------------------------------------------------------------------

function blockquoteParagraphs(lines: string[]): InlineSpan[][] {
  const stripped = lines.map((l) => l.replace(/^>\s?/, ""));
  const paragraphs: InlineSpan[][] = [];
  let cur: string[] = [];
  const flush = () => {
    if (cur.length === 0) return;
    if (cur.every((l) => l.trimStart().startsWith("|"))) {
      // Table inside a blockquote → preformatted span (minimal transform).
      paragraphs.push([{ text: cur.join("\n"), code: true }]);
    } else {
      paragraphs.push(parseInline(cur.join(" ")));
    }
    cur = [];
  };
  for (const l of stripped) {
    if (l.trim() === "") flush();
    else cur.push(l);
  }
  flush();
  return paragraphs;
}

function listItems(lines: string[]): string[] {
  const items: string[] = [];
  for (const line of lines) {
    if (/^\s*- /.test(line)) items.push(line.replace(/^\s*- /, ""));
    else if (items.length > 0) items[items.length - 1] += ` ${line.trim()}`;
    else items.push(line.trim());
  }
  return items;
}

function groupToBlock(g: RawGroup): LessonBlock | null {
  if (g.fence) {
    const raw = g.lines.join("\n");
    return {
      kind: "visual",
      raw,
      visualId: /^id:\s*(\S+)/m.exec(raw)?.[1] ?? null,
      visualType: /^type:\s*(\S+)/m.exec(raw)?.[1] ?? null,
    };
  }
  const first = g.lines[0];
  if (/^-{3,}\s*$/.test(first)) return null;
  if (first.startsWith("### ")) {
    return { kind: "subheading", text: first.slice(4).trim() };
  }
  if (g.lines.every((l) => l.startsWith(">"))) {
    return { kind: "blockquote", paragraphs: blockquoteParagraphs(g.lines) };
  }
  if (first.startsWith("**Authoring notes")) {
    return { kind: "authoring-aside", lines: g.lines };
  }
  if (first.trimStart().startsWith("|")) {
    return { kind: "table", lines: g.lines };
  }
  if (/^\s*- /.test(first)) {
    return { kind: "list", items: listItems(g.lines).map(parseInline) };
  }
  return { kind: "paragraph", spans: parseInline(g.lines.join(" ")) };
}

// ---------------------------------------------------------------------------
// Embedded checks (§4). Parsed ONLY when the structure is clean; otherwise
// the raw groups render as prose — never guess an answer key.
// ---------------------------------------------------------------------------

const OPTION_MARK_RE = /\*\*([A-Z])\)\*\*/g;
const EC_HEADING_RE = /^EC(\d+)\s*[—–-]\s*(.*)$/;
const CORRECT_RE = /^\*\*Correct:\s*([A-Z])\.?\*\*\s*(.*)$/;
const DISTRACTOR_RE = /^\*\*Distractor\s+([A-Z])[^`]*`([a-z0-9-]+)`\s*(.*)$/;

function extractOptions(lines: string[]): { question: string[]; options: ItemChoice[] } {
  const question: string[] = [];
  const options: ItemChoice[] = [];
  for (const line of lines) {
    OPTION_MARK_RE.lastIndex = 0;
    const marks = [...line.matchAll(/\*\*([A-Z])\)\*\*/g)];
    if (marks.length === 0) {
      if (options.length === 0) question.push(line);
      continue;
    }
    for (let i = 0; i < marks.length; i += 1) {
      const start = (marks[i].index ?? 0) + marks[i][0].length;
      const end = i + 1 < marks.length ? marks[i + 1].index : line.length;
      options.push({ id: marks[i][1], text: line.slice(start, end).trim() });
    }
  }
  return { question, options };
}

function tryParseEmbeddedCheck(
  heading: string,
  quote: RawGroup | undefined,
  list: RawGroup | undefined,
): EmbeddedCheck | null {
  const hm = EC_HEADING_RE.exec(heading);
  if (!hm || !quote || !list) return null;

  const quoteLines = quote.lines
    .map((l) => l.replace(/^>\s?/, ""))
    .filter((l) => l.trim() !== "");
  const { question, options } = extractOptions(quoteLines);
  if (question.length === 0 || options.length < 2) return null;
  const ids = new Set(options.map((o) => o.id));
  if (ids.size !== options.length) return null;

  let correct: string | null = null;
  let correctFeedback = "";
  const traps: EmbeddedCheckTrap[] = [];
  for (const item of listItems(list.lines)) {
    const cm = CORRECT_RE.exec(item);
    if (cm) {
      if (correct !== null) return null; // two "Correct" lines → ambiguous
      correct = cm[1];
      correctFeedback = stripMarkdown(cm[2]);
      continue;
    }
    const dm = DISTRACTOR_RE.exec(item);
    if (dm) {
      traps.push({ option: dm[1], tag: dm[2], note: stripMarkdown(dm[3]) });
    }
  }
  if (correct === null || !ids.has(correct)) return null;
  if (traps.some((t) => !ids.has(t.option) || t.option === correct)) return null;

  return {
    id: `EC${hm[1]}`,
    title: heading,
    question: question.map(parseInline),
    options,
    correct,
    correctFeedback,
    traps,
  };
}

/** Strip inline markdown markers to plain text (feedback lines). */
function stripMarkdown(text: string): string {
  return parseInline(text)
    .map((s) => s.text)
    .join("")
    .replace(/^[←:\s]+/, "")
    .trim();
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

const SECTION_RE = /^## (?:(\d+)\.\s*)?(.+)$/;

function buildBlocks(groups: RawGroup[]): LessonBlock[] {
  const blocks: LessonBlock[] = [];
  let i = 0;
  while (i < groups.length) {
    const g = groups[i];
    const firstLine = g.fence ? "" : g.lines[0];
    const isEcHeading =
      !g.fence && firstLine.startsWith("### ") && EC_HEADING_RE.test(firstLine.slice(4).trim());
    if (isEcHeading) {
      // Look ahead (until the next subheading) for the blockquote + bullet list.
      let quote: RawGroup | undefined;
      let list: RawGroup | undefined;
      let quoteIdx = -1;
      let listIdx = -1;
      for (let j = i + 1; j < groups.length; j += 1) {
        const h = groups[j];
        if (!h.fence && h.lines[0].startsWith("### ")) break;
        if (!quote && !h.fence && h.lines.every((l) => l.startsWith(">"))) {
          quote = h;
          quoteIdx = j;
        } else if (!list && !h.fence && /^\s*- /.test(h.lines[0])) {
          list = h;
          listIdx = j;
        }
        if (quote && list) break;
      }
      const check = tryParseEmbeddedCheck(firstLine.slice(4).trim(), quote, list);
      if (check) {
        blocks.push({ kind: "embedded-check", check });
        // Consume ONLY the heading + the two groups the check absorbed; any
        // visual fence / authoring aside in between still renders normally.
        const consumed = new Set([i, quoteIdx, listIdx]);
        for (let j = i + 1; j < groups.length; j += 1) {
          const h = groups[j];
          if (!h.fence && h.lines[0].startsWith("### ")) break;
          if (consumed.has(j)) continue;
          const b = groupToBlock(h);
          if (b) blocks.push(b);
          consumed.add(j);
        }
        i = Math.max(...consumed) + 1;
        continue;
      }
      // Parse failed → fall through: heading + everything renders as prose.
    }
    const b = groupToBlock(g);
    if (b) blocks.push(b);
    i += 1;
  }
  return blocks;
}

/** Split GOLD_NODE_LESSON.md into typed sections. Pure; throws only on the
 * degenerate empty-input case (callers guard). */
export function parseLesson(md: string): LessonSection[] {
  const lines = md.split(/\r?\n/);
  const sections: LessonSection[] = [];
  let heading: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    const groups = splitGroups(buf);
    if (heading === null) {
      if (groups.length > 0) {
        sections.push({
          id: "preamble",
          number: null,
          title: "Document front matter",
          authoringOnly: true,
          blocks: buildBlocks(groups),
        });
      }
    } else {
      const m = SECTION_RE.exec(heading);
      const number = m?.[1] ? Number(m[1]) : null;
      const title = (m?.[2] ?? heading.replace(/^## /, "")).trim();
      sections.push({
        id: number !== null ? `section-${number}` : slugify(title),
        number,
        title,
        authoringOnly: number === null && /authoring metadata/i.test(title),
        blocks: buildBlocks(groups),
      });
    }
    buf = [];
  };

  for (const line of lines) {
    if (line.startsWith("## ") && !line.startsWith("###")) {
      flush();
      heading = line;
    } else {
      buf.push(line);
    }
  }
  flush();
  // Drop the top-level "# title" line from the preamble's first paragraph.
  return sections;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "section"
  );
}
