// lib/insight/intervention — DISPLAY-band derivation for staff/coach reporting
// (§12-13, R7). PURE: no IO, no Date.now().
//
// This derives a three-step DISPLAY band — on_track | watch | intervention
// (green / amber / rose, STYLE_GUIDE §8.5) — from a student's open FlagEntry set
// OR a single FlagEntry.kind, plus a plain-language "what to do next" string.
//
// IMPORTANT (R7): this does NOT touch FlagEntry.severity (info | attention) — that
// union is unchanged. The band is a separate presentation layer. The pill token
// mapping lives in components/insight/SeverityPill.tsx (mastered/retrieval/error).

import type { FlagEntry } from "../../types";

/** Display band — green/amber/rose. Distinct from FlagEntry.severity (R7). */
export type InterventionBand = "on_track" | "watch" | "intervention";

/**
 * Per-kind band weight. "intervention" (rose) = a genuine plateau/decay needing
 * a teacher's hand; "watch" (amber) = a habit signal worth a look; absent kinds
 * leave the student on_track (green). days-since-session escalates by severity
 * (an attention-level inactivity is a watch), so it is handled in interventionBand.
 */
const KIND_BAND: Record<FlagEntry["kind"], InterventionBand> = {
  "stalled-node": "intervention",
  "decayed-review-queue": "intervention",
  "high-hint-dependence": "watch",
  rushing: "watch",
  "retention-probes-due": "watch",
  "fast-but-fragile": "watch",
  "days-since-session": "watch",
};

/** Plain-language next step per kind (§12-13 "what to do next"). */
const KIND_NEXT_ACTION: Record<FlagEntry["kind"], string> = {
  "stalled-node": "Sit with this skill together — the same prerequisite keeps blocking progress.",
  "decayed-review-queue": "Schedule a short review session — a mastered skill is due to be refreshed.",
  "high-hint-dependence": "Try a few problems without hints to confirm the skill is sticking.",
  rushing: "Encourage slowing down — answers are coming in very fast.",
  "retention-probes-due": "A spaced retention check is due — let the student work it when next active.",
  "fast-but-fragile": "Schedule a short review — this skill was picked up fast and a delayed check hasn't confirmed it's holding.",
  "days-since-session": "Check in — it has been a while since the last session.",
};

const BAND_RANK: Record<InterventionBand, number> = {
  on_track: 0,
  watch: 1,
  intervention: 2,
};

/** The band for a single flag kind (days-since-session escalates by severity). */
function bandForFlag(flag: FlagEntry): InterventionBand {
  if (flag.kind === "days-since-session") {
    return flag.severity === "attention" ? "watch" : "on_track";
  }
  return KIND_BAND[flag.kind];
}

/**
 * The student's overall band = the most severe band across their open flags.
 * No flags → on_track. PURE.
 */
export function interventionBand(flags: FlagEntry[]): InterventionBand {
  let band: InterventionBand = "on_track";
  for (const f of flags) {
    const b = bandForFlag(f);
    if (BAND_RANK[b] > BAND_RANK[band]) band = b;
  }
  return band;
}

/**
 * The single most useful "what to do next" string for a student — the next
 * action for their most-severe open flag. Empty string when on_track. PURE.
 */
export function nextAction(flags: FlagEntry[]): string {
  let best: FlagEntry | null = null;
  let bestRank = -1;
  for (const f of flags) {
    const rank = BAND_RANK[bandForFlag(f)];
    if (rank > bestRank) {
      bestRank = rank;
      best = f;
    }
  }
  if (!best || bestRank <= 0) return "";
  return KIND_NEXT_ACTION[best.kind];
}

/** The next-action string for a specific flag kind (used in detail surfaces). */
export function nextActionForKind(kind: FlagEntry["kind"]): string {
  return KIND_NEXT_ACTION[kind];
}
