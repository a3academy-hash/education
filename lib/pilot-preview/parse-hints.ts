// lib/pilot-preview/parse-hints.ts — extract the HL-<tag> hint ladders from
// GOLD_NODE_HINTS.md for the DEV-ONLY pilot preview. Each ladder is three
// blockquoted rungs ("> **Rung n (role):** text") plus a "- **neverSay:**"
// bullet. Ladders missing any of the three rungs are excluded (the preview
// never serves a partial ladder). Pure string → data; no React, no IO.

import type { HintLadder } from "./types";

const LADDER_HEADING_RE = /^### +`([A-Za-z0-9-]+)`/;
const RUNG_RE = /^> \*\*Rung ([123])[^:]*:\*\*\s*(.+)$/;
const NEVER_SAY_RE = /^- \*\*neverSay:\*\*\s*(.+)$/;
const TAG_RE = /\*\*Tag:\*\*\s*`([a-z0-9-]+)`/;

/** Strip inline markdown emphasis markers from rung / neverSay text. */
function plain(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

/** Parse GOLD_NODE_HINTS.md into a ladder-id → HintLadder record. */
export function parseHintLadders(md: string): Record<string, HintLadder> {
  const lines = md.split(/\r?\n/);
  const ladders: Record<string, HintLadder> = {};

  let currentId: string | null = null;
  let rungs: Record<number, string> = {};
  let neverSay = "";
  let tag: string | null = null;

  const flush = () => {
    if (
      currentId !== null &&
      rungs[1] !== undefined &&
      rungs[2] !== undefined &&
      rungs[3] !== undefined
    ) {
      ladders[currentId] = {
        id: currentId,
        tag,
        rungs: [rungs[1], rungs[2], rungs[3]],
        neverSay,
      };
    }
    rungs = {};
    neverSay = "";
    tag = null;
  };

  for (const line of lines) {
    const heading = LADDER_HEADING_RE.exec(line);
    if (heading) {
      flush();
      currentId = heading[1];
      continue;
    }
    if (currentId === null) continue;
    if (line.startsWith("## ")) {
      // Left the ladder listing (e.g. into Appendix A) — close out.
      flush();
      currentId = null;
      continue;
    }
    const rung = RUNG_RE.exec(line);
    if (rung) {
      rungs[Number(rung[1])] = plain(rung[2]);
      continue;
    }
    const never = NEVER_SAY_RE.exec(line);
    if (never) {
      neverSay = plain(never[1]);
      continue;
    }
    const tm = TAG_RE.exec(line);
    if (tm && line.startsWith("- **Tag:**")) {
      tag = tm[1];
    }
  }
  flush();
  return ladders;
}
