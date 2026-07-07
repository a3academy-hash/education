// lib/pilot-preview/load.ts — SERVER-ONLY content adapter for the DEV-ONLY
// /preview/pilot route. Reads local files (docs/gold-node/* for the gold node;
// .authoring-tmp/* for the pilot nodes) and returns serializable PreviewNode
// records. NO Supabase, NO writes, NO network. Pilot content that has not
// landed yet returns an honest stub — content is NEVER fabricated. Import this
// module only from server components (it uses node:fs).

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseLesson } from "./parse-lesson";
import { parseHintLadders } from "./parse-hints";
import {
  ARCHETYPES,
  type Archetype,
  type EnrichedItem,
  type PreviewItem,
  type PreviewNode,
} from "./types";

export const PREVIEW_NODE_IDS = ["ALG-L06", "ALG-L19", "ALG-L11", "ALG-L09"] as const;
export type PreviewNodeId = (typeof PREVIEW_NODE_IDS)[number];

/** Titles verified against data/algebra1-graph.json (v1.9.x). Display only. */
const NODE_TITLES: Record<PreviewNodeId, string> = {
  "ALG-L06": "Slope from Two Points",
  "ALG-L19": "Average Rate of Change over an Interval",
  "ALG-L11": "Point-Slope Form",
  "ALG-L09": "Graphing Linear Equations",
};

const STUB_NOTICE =
  "Pilot content not yet generated — the taxonomy/bank pipeline is key-blocked; " +
  "this slot renders the moment content lands in .authoring-tmp/.";

const GOLD_DIR = ["docs", "gold-node"];

function repoPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

function isArchetype(v: unknown): v is Archetype {
  return typeof v === "string" && (ARCHETYPES as readonly string[]).includes(v);
}

/** Wrap raw enriched items; anything without an id + known archetype is
 * rejected with an error rather than rendered half-fabricated. */
function toPreviewItems(
  rawItems: unknown,
  source: PreviewItem["source"],
): { items: PreviewItem[]; error?: string } {
  if (!Array.isArray(rawItems)) {
    return { items: [], error: "items is not an array" };
  }
  const items: PreviewItem[] = [];
  for (const raw of rawItems) {
    const it = raw as Partial<EnrichedItem>;
    if (typeof it?.id !== "string" || !isArchetype(it.archetype)) {
      return {
        items: [],
        error: "an item is missing id/archetype — refusing to render a partial bank",
      };
    }
    items.push({
      source,
      archetype: it.archetype,
      difficulty: typeof it.difficulty === "number" ? it.difficulty : 0,
      phase: typeof it.phase === "string" ? it.phase : "?",
      sport: typeof it.sport === "string" ? it.sport : "?",
      item: it as EnrichedItem,
    });
  }
  return { items };
}

function loadGoldNode(): PreviewNode {
  const node: PreviewNode = {
    nodeId: "ALG-L06",
    title: NODE_TITLES["ALG-L06"],
    source: "gold",
    lesson: null,
    items: [],
    ladders: {},
  };
  const errors: string[] = [];

  try {
    const md = readFileSync(repoPath(...GOLD_DIR, "GOLD_NODE_LESSON.md"), "utf8");
    node.lesson = parseLesson(md);
  } catch (e) {
    errors.push(`GOLD_NODE_LESSON.md: ${message(e)}`);
  }

  try {
    const json = readFileSync(repoPath(...GOLD_DIR, "gold-node-items.json"), "utf8");
    const file = JSON.parse(json) as { items?: unknown };
    const { items, error } = toPreviewItems(file.items, "gold");
    if (error) errors.push(`gold-node-items.json: ${error}`);
    node.items = items;
  } catch (e) {
    errors.push(`gold-node-items.json: ${message(e)}`);
  }

  try {
    const md = readFileSync(repoPath(...GOLD_DIR, "GOLD_NODE_HINTS.md"), "utf8");
    node.ladders = parseHintLadders(md);
  } catch (e) {
    errors.push(`GOLD_NODE_HINTS.md: ${message(e)}`);
  }

  if (errors.length > 0) node.error = errors.join(" | ");
  return node;
}

function loadPilotNode(nodeId: PreviewNodeId): PreviewNode {
  const taxonomyPath = repoPath(".authoring-tmp", "taxonomies", nodeId, "taxonomy.md");
  const nodeJsonPath = repoPath(".authoring-tmp", "regen", nodeId, "node.json");
  const taxonomyPresent = existsSync(taxonomyPath);

  if (!existsSync(nodeJsonPath)) {
    return {
      nodeId,
      title: NODE_TITLES[nodeId],
      source: "stub",
      lesson: null,
      items: [],
      ladders: {},
      stubNotice: STUB_NOTICE,
      taxonomyPresent,
    };
  }

  try {
    const file = JSON.parse(readFileSync(nodeJsonPath, "utf8")) as { items?: unknown };
    const { items, error } = toPreviewItems(file.items, "machine");
    return {
      nodeId,
      title: NODE_TITLES[nodeId],
      source: "machine",
      lesson: null,
      items,
      ladders: {},
      taxonomyPresent,
      ...(error ? { error: `regen/${nodeId}/node.json: ${error}` } : {}),
    };
  } catch (e) {
    return {
      nodeId,
      title: NODE_TITLES[nodeId],
      source: "machine",
      lesson: null,
      items: [],
      ladders: {},
      taxonomyPresent,
      error: `regen/${nodeId}/node.json: ${message(e)}`,
    };
  }
}

/** Load one preview node. Never throws — failures land in PreviewNode.error. */
export function loadPreviewNode(nodeId: PreviewNodeId): PreviewNode {
  return nodeId === "ALG-L06" ? loadGoldNode() : loadPilotNode(nodeId);
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
