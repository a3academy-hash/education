// =============================================================================
// upload-video.mjs — upload a lesson mp4 to Cloudflare Stream and register its
// metadata in the `video_assets` table. Phase 11 Workstream D (D5).
//
// Matt-run ONLY (never CI). Requires the SERVER-ONLY credentials in .env.local:
//   CLOUDFLARE_ACCOUNT_ID            (required)
//   CLOUDFLARE_STREAM_API_TOKEN      (required — upload + signed-URL scope)
//   NEXT_PUBLIC_SUPABASE_URL         (required)
//   SUPABASE_SERVICE_ROLE_KEY        (required — service-role write to video_assets)
//
// USAGE:
//   node D:\a3_education\scripts\upload-video.mjs <mp4Path> <skillId> <kind> [captionsUrl]
// EXAMPLE:
//   node D:\a3_education\scripts\upload-video.mjs .\lessons\ALG-F01.mp4 ALG-F01 lesson
//
// WHAT IT DOES:
//   1. Reads the mp4 bytes from <mp4Path>.
//   2. Uploads to Cloudflare Stream with requireSignedURLs:true set AT CREATION
//      (D5 — a video_assets row can NEVER point at a publicly-viewable asset).
//   3. Reads any existing video_assets row for (skill_id, kind); if present,
//      UPDATES it to the new playback id, else INSERTs (service-role).
//      Idempotency = read-then-write by (skill_id, kind). This is RACY by design
//      (no DB unique constraint) — fine for single-user, Matt-run, not-CI usage.
//
// SECURITY: the CF API token + Supabase service-role key are read here, server-
// side, and are NEVER logged. This script does NOT import Next/React or the app
// repository layer — it talks to the Cloudflare + Supabase APIs directly.
// =============================================================================

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

// ── tiny .env.local loader (no dotenv dep) ───────────────────────────────────
async function loadEnvLocal() {
  try {
    const raw = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env) || process.env[key] === "") process.env[key] = value;
    }
  } catch {
    // no .env.local — rely on the ambient environment.
  }
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name} (set it in .env.local).`);
    process.exit(1);
  }
  return v;
}

async function main() {
  await loadEnvLocal();

  const [mp4Path, skillId, kind, captionsUrl] = process.argv.slice(2);
  if (!mp4Path || !skillId || !kind) {
    console.error(
      "Usage: node scripts/upload-video.mjs <mp4Path> <skillId> <kind> [captionsUrl]",
    );
    process.exit(1);
  }

  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = requireEnv("CLOUDFLARE_STREAM_API_TOKEN");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  // 1. read the mp4 bytes
  const fileBytes = await readFile(resolve(process.cwd(), mp4Path));
  console.log(`Read ${fileBytes.length} bytes from ${mp4Path}`);

  // 2. upload to Cloudflare Stream with require-signed-URLs at creation (D5)
  const form = new FormData();
  form.append(
    "file",
    new Blob([fileBytes], { type: "video/mp4" }),
    mp4Path.split(/[\\/]/).pop() || "lesson.mp4",
  );
  form.append("requireSignedURLs", "true");

  const uploadRes = await fetch(`${CF_API_BASE}/accounts/${accountId}/stream`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}` },
    body: form,
  });
  const uploadBody = await uploadRes.json().catch(() => null);
  if (!uploadRes.ok || !uploadBody?.success) {
    const detail = uploadBody?.errors?.map((e) => `${e.code}: ${e.message}`).join("; ");
    console.error(`Cloudflare upload failed (HTTP ${uploadRes.status})${detail ? ` — ${detail}` : ""}`);
    process.exit(1);
  }
  const uid = uploadBody.result.uid;
  const durationSeconds = uploadBody.result.duration ?? null;
  console.log(`Uploaded to Cloudflare Stream. uid=${uid} (requireSignedURLs=true)`);

  // 3. read-then-write video_assets by (skill_id, kind) — service-role (D5/D6)
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: selErr } = await supabase
    .from("video_assets")
    .select("id")
    .eq("skill_id", skillId)
    .eq("kind", kind)
    .maybeSingle();
  if (selErr) {
    console.error(`video_assets read failed: ${selErr.message}`);
    process.exit(1);
  }

  const row = {
    skill_id: skillId,
    provider: "cloudflare-stream",
    playback_id: uid,
    kind,
    duration_seconds: durationSeconds,
    captions_url: captionsUrl ?? null,
  };

  if (existing) {
    const { error } = await supabase.from("video_assets").update(row).eq("id", existing.id);
    if (error) {
      console.error(`video_assets update failed: ${error.message}`);
      process.exit(1);
    }
    console.log(`Updated existing video_assets row ${existing.id} → playback_id=${uid}`);
  } else {
    const { error } = await supabase.from("video_assets").insert(row);
    if (error) {
      console.error(`video_assets insert failed: ${error.message}`);
      process.exit(1);
    }
    console.log(`Inserted video_assets row for ${skillId}/${kind} → playback_id=${uid}`);
  }

  console.log("Done. The asset requires signed URLs; playback is server-minted at view time.");
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
