// StreamVideoAsset — the app surface for a row of the `video_assets` table
// (migration 0003). Phase 11 Workstream D (D1, BLOCKER B1).
//
// DELIBERATELY DISTINCT from the curriculum `VideoAsset` (types/video.ts), which
// models the JSON-graph `SkillNode.videos` placeholder and must stay untouched.
// This type mirrors the DB row (snake → camel) and carries the OPAQUE Cloudflare
// Stream playback id. The bare playbackId is NEVER serialized to the client —
// the server mints a short-lived SIGNED iframe URL from it (D4). Video is
// SUPPLEMENTARY instruction: it never writes evidence, never gates mastery.

export interface StreamVideoAsset {
  /** video_assets.id (uuid). */
  id: string;
  /** Opaque graph node id (video_assets.skill_id) — no FK, matches everywhere. */
  skillId: string;
  /** video_assets.provider (default 'cloudflare-stream'). */
  provider: string;
  /**
   * Cloudflare Stream playback id / uid (video_assets.playback_id). Server-only:
   * used to MINT a signed URL. Never placed in a client prop / data-attr (D4).
   */
  playbackId: string;
  /** Optional kind, e.g. lesson | worked-example | explain (video_assets.kind). */
  kind: string | null;
  /** Optional duration in seconds (video_assets.duration_seconds). */
  durationSeconds: number | null;
  /** Optional captions/subtitle track URL (video_assets.captions_url). */
  captionsUrl: string | null;
}
