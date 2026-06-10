// Video asset placeholder architecture only (Phase 0). "external-resource"
// means link out — third-party content is never copied or rehosted.

export type VideoSlot =
  | "primary"
  | "alternate"
  | "remediation"
  | "worked-example"
  | "external-resource";

export interface VideoAsset {
  id: string;
  skillId: string;
  slot: VideoSlot;
  title: string;
  provider: "self-hosted" | "licensed" | "external-link";
  url: string | null;
  durationSec: number | null;
  licenseNote: string | null;
}
