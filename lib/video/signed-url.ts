// lib/video/signed-url.ts — mint a short-lived SIGNED Cloudflare Stream playback
// URL, SERVER-ONLY. Phase 11 Workstream D (D0/D3/D4).
//
// The bare playback id is NOT enough to view an asset: every asset is created
// with "require signed URLs" (D5), so playback requires a SIGNED, EXPIRING token
// minted here at play time. This is the "not publicly scrapable" guarantee. The
// signed token is produced by the Stream token API (lib/video/client.ts) — no
// local JWT signing, no new dependency (D0).
//
// The returned value is the Cloudflare Stream IFRAME embed URL:
//   https://customer-<CODE>.cloudflarestream.com/<SIGNED_TOKEN>/iframe
// which the client renders in an <iframe> (no @cloudflare/stream-react). Only
// this signed URL crosses the server→client boundary — never the playback id,
// the API token, or any unsigned URL (D4).

import { mintStreamToken } from "./client";

// Server-only guard (mirror lib/supabase/service.ts). Fails fast if pulled into
// a client bundle.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/video/signed-url.ts is server-only and must never run in the browser.",
  );
}

const DEFAULT_TTL_SECONDS = 7200; // ~2h (D3 default)

/**
 * Resolve the Cloudflare Stream customer subdomain CODE. Cloudflare exposes
 * playback under https://customer-<CODE>.cloudflarestream.com. The code is the
 * account's stream subdomain identifier. It is read LAZILY and is NOT a secret
 * (it appears in the iframe URL), but it is account-specific, so it lives in env
 * (CLOUDFLARE_STREAM_CUSTOMER_CODE) and falls back to the account id, which
 * Cloudflare also accepts for the customer subdomain in most configurations.
 */
function customerSubdomainCode(): string {
  const explicit = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;
  if (explicit) return explicit;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    throw new Error(
      "Cloudflare Stream is not configured: CLOUDFLARE_ACCOUNT_ID (or " +
        "CLOUDFLARE_STREAM_CUSTOMER_CODE) is required to build the playback URL.",
    );
  }
  return accountId;
}

export interface SignedPlaybackOptions {
  /** Token lifetime in seconds. Default ~2h. */
  ttlSeconds?: number;
}

/**
 * Mint a signed, expiring IFRAME embed URL for a playback id. Server-side ONLY,
 * called at play time (the Learn server component). Throws loudly (via the client
 * config read) if Cloudflare is unconfigured — call sites guard with
 * getVideoMode() first so this only runs when video is enabled.
 */
export async function getSignedPlaybackUrl(
  playbackId: string,
  options: SignedPlaybackOptions = {},
): Promise<string> {
  const ttl = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const { token } = await mintStreamToken(playbackId, exp);
  const code = customerSubdomainCode();
  return `https://customer-${code}.cloudflarestream.com/${token}/iframe`;
}
