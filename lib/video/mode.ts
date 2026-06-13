// lib/video/mode.ts — the ONE seam that decides whether video playback is live.
// Phase 11 Workstream D (D2/D3). Mirrors lib/auth/mode.ts: PURE, dependency-free,
// reads ONLY process.env presence — never a credential VALUE, never touches
// Cloudflare, never throws. Safe to import from client components, server
// components, and unit tests alike.
//
// SOURCE OF TRUTH (D2): video is enabled IFF we are in the `supabase` world AND
// the Cloudflare Stream credentials are present. Tying it to getAuthMode() means
// there is no independent video flag to drift: in the default `memory` world
// (dev/test/CI) video is OFF and nothing about Cloudflare is required. With the
// CF env absent, the integration degrades gracefully — no card, no throw.

import { getAuthMode } from "../auth/mode";

export type VideoMode = "enabled" | "disabled";

/**
 * Resolve the video mode. `enabled` requires BOTH:
 *   - getAuthMode() === "supabase" (the live, RLS-backed world), AND
 *   - CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN both present.
 *
 * Reads only env *presence* (Boolean), never the values themselves. The signing
 * key vars are OPTIONAL (D0 uses the Stream token API, not local PEM signing) and
 * are intentionally not part of this check.
 */
export function getVideoMode(): VideoMode {
  if (getAuthMode() !== "supabase") return "disabled";
  const hasAccount = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);
  const hasToken = Boolean(process.env.CLOUDFLARE_STREAM_API_TOKEN);
  return hasAccount && hasToken ? "enabled" : "disabled";
}

/** Convenience boolean for call sites that just gate a branch. */
export function isVideoEnabled(): boolean {
  return getVideoMode() === "enabled";
}
