// lib/video/client.ts — a thin Cloudflare Stream REST client. SERVER-ONLY.
// Phase 11 Workstream D (D0/D3). NO new dependency: uses global `fetch`. NO
// JWT lib, NO @cloudflare/stream-react.
//
// Scope: account-id + API-token authenticated calls used to (a) mint signed
// playback tokens (consumed by signed-url.ts) and (b) upload/manage assets
// (consumed by scripts/upload-video.mjs). The browser NEVER imports this module
// — the byte-for-byte server-only guard below fails fast if it is ever bundled
// client-side (mirror lib/supabase/service.ts). Credentials are read LAZILY,
// inside functions, so importing the module in `memory`/test mode never requires
// any Cloudflare env to be present (no import-time throw, D3).

// Server-only guard (mirror lib/supabase/service.ts). Fails fast if pulled into
// a client bundle.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/video/client.ts is server-only and must never run in the browser.",
  );
}

const STREAM_API_BASE = "https://api.cloudflare.com/client/v4";

export interface CloudflareStreamConfig {
  accountId: string;
  apiToken: string;
}

/**
 * Read the Cloudflare Stream credentials from the environment, LAZILY. Throws a
 * LOUD, named error ONLY when invoked without configuration — never at import
 * time. Returns the minimal config (account id + API token); no signing key
 * (D0: signed tokens are minted via the Stream token API, not local PEM).
 */
export function readStreamConfig(): CloudflareStreamConfig {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error(
      "Cloudflare Stream is not configured: CLOUDFLARE_ACCOUNT_ID and " +
        "CLOUDFLARE_STREAM_API_TOKEN must be set (server-only, never NEXT_PUBLIC_). " +
        "Video is disabled until these are present.",
    );
  }
  return { accountId, apiToken };
}

/** Authorization headers for the Stream API. Never logged, never client-shipped. */
function authHeaders(config: CloudflareStreamConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.apiToken}` };
}

interface CloudflareEnvelope<T> {
  success: boolean;
  errors?: { code: number; message: string }[];
  messages?: unknown[];
  result: T;
}

async function streamFetch<T>(
  config: CloudflareStreamConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${STREAM_API_BASE}/accounts/${config.accountId}/stream${path}`, {
    ...init,
    headers: {
      ...authHeaders(config),
      ...(init.headers ?? {}),
    },
  });
  // Cloudflare wraps responses in { success, errors, result }. Treat both a
  // non-2xx status and success:false as failures (do NOT echo the token).
  let body: CloudflareEnvelope<T> | null = null;
  try {
    body = (await res.json()) as CloudflareEnvelope<T>;
  } catch {
    // fall through to the status check below
  }
  if (!res.ok || !body || body.success === false) {
    const detail = body?.errors?.map((e) => `${e.code}: ${e.message}`).join("; ");
    throw new Error(
      `Cloudflare Stream API ${path} failed (HTTP ${res.status})${detail ? ` — ${detail}` : ""}`,
    );
  }
  return body.result;
}

// ── Token minting ────────────────────────────────────────────────────────────

export interface StreamTokenResult {
  /** The signed, expiring token string to embed in the playback URL. */
  token: string;
}

/**
 * Mint a signed playback token for an asset via the Stream token API
 * (D0: POST /accounts/{account}/stream/{uid}/token). Needs only the account id +
 * API token — no local signing key. `exp` is a UNIX seconds expiry.
 */
export async function mintStreamToken(
  uid: string,
  expUnixSeconds: number,
): Promise<StreamTokenResult> {
  const config = readStreamConfig();
  const result = await streamFetch<{ token: string }>(config, `/${uid}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exp: expUnixSeconds }),
  });
  return { token: result.token };
}

// ── Asset upload / management (used by scripts/upload-video.mjs) ───────────────

export interface StreamUploadResult {
  uid: string;
  requireSignedURLs: boolean;
  thumbnail?: string;
  duration?: number;
}

/**
 * Upload an mp4 to Cloudflare Stream via the copy/basic-upload API, REQUIRING
 * signed URLs from creation so the asset is never publicly viewable (D5). The
 * caller supplies the raw bytes; we set requireSignedURLs:true in the same call.
 *
 * NOTE: large files should prefer tus/resumable upload; this direct path is fine
 * for the Matt-run lesson-upload script. Returns the new asset's uid.
 */
export async function uploadStreamAsset(
  fileBytes: Uint8Array,
  meta: { name?: string } = {},
): Promise<StreamUploadResult> {
  const config = readStreamConfig();
  const form = new FormData();
  // Cast to BlobPart: a Uint8Array IS a valid Blob part at runtime; the cast
  // sidesteps the ArrayBufferLike/SharedArrayBuffer variance in lib.dom types.
  form.append(
    "file",
    new Blob([fileBytes as BlobPart], { type: "video/mp4" }),
    meta.name ?? "lesson.mp4",
  );
  // requireSignedURLs at creation: the row can never point at a public asset (D5).
  form.append("requireSignedURLs", "true");

  const result = await streamFetch<StreamUploadResult>(config, "", {
    method: "POST",
    body: form,
  });
  return result;
}

/** Force "require signed URLs" on an existing asset (idempotent safety net, D5). */
export async function setRequireSignedUrls(uid: string): Promise<void> {
  const config = readStreamConfig();
  await streamFetch<unknown>(config, `/${uid}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requireSignedURLs: true }),
  });
}
