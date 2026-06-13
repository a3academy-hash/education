import { describe, expect, it } from "vitest";
import { mapVideoAssetRow, type VideoAssetRow } from "../asset-map";

// D1/D6: video_assets row → StreamVideoAsset (snake → camel). Pure mapper.
describe("mapVideoAssetRow — snake→camel video_assets mapping (D1/D6)", () => {
  const row: VideoAssetRow = {
    id: "vid-1",
    skill_id: "ALG-F01",
    provider: "cloudflare-stream",
    playback_id: "uid-abc123",
    kind: "lesson",
    duration_seconds: 360,
    captions_url: "https://example.test/cc.vtt",
    created_at: "2026-01-01T00:00:00.000Z",
  };

  it("maps every field to its camelCase app-surface name", () => {
    expect(mapVideoAssetRow(row)).toEqual({
      id: "vid-1",
      skillId: "ALG-F01",
      provider: "cloudflare-stream",
      playbackId: "uid-abc123",
      kind: "lesson",
      durationSeconds: 360,
      captionsUrl: "https://example.test/cc.vtt",
    });
  });

  it("preserves nulls for optional columns", () => {
    const out = mapVideoAssetRow({
      ...row,
      kind: null,
      duration_seconds: null,
      captions_url: null,
    });
    expect(out.kind).toBeNull();
    expect(out.durationSeconds).toBeNull();
    expect(out.captionsUrl).toBeNull();
  });

  it("does not leak created_at into the app surface", () => {
    expect("createdAt" in mapVideoAssetRow(row)).toBe(false);
  });
});
