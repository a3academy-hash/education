// lib/video/asset-map.ts — the PURE snake→camel mapper for a video_assets row.
// Phase 11 Workstream D. Lives here (not in the supabase repo) so it is unit-
// testable WITHOUT importing the Supabase client, and is the single source of
// truth for the row shape mapping (used by lib/repository/supabase.ts).
//
// Dependency-free + no IO — safe to import anywhere, including tests.

import type { StreamVideoAsset } from "../../types";

/** The video_assets row shape (migration 0003) — metadata only, no playable URL. */
export interface VideoAssetRow {
  id: string;
  skill_id: string;
  provider: string;
  playback_id: string;
  kind: string | null;
  duration_seconds: number | null;
  captions_url: string | null;
  created_at: string;
}

/** Map a video_assets row to the app-surface StreamVideoAsset (camelCase). */
export function mapVideoAssetRow(r: VideoAssetRow): StreamVideoAsset {
  return {
    id: r.id,
    skillId: r.skill_id,
    provider: r.provider,
    playbackId: r.playback_id,
    kind: r.kind,
    durationSeconds: r.duration_seconds,
    captionsUrl: r.captions_url,
  };
}
