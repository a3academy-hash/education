# Phase 11 — Workstream D — Video Pipeline (Cloudflare Stream) — Design Spec

Status: DRAFT for gate review (mr-gates — signed-URL security + token isolation + repo
contract; pee-wee — the Learn video slot UX; mr-kahn — light: skill mapping, no
evidence/mastery impact). Keep-moving: gate → implement → mr-gates diff → commit.

External dependency: a Cloudflare Stream account + API token + signing key — **Matt
provides these later**. Per the C1/C2 pattern, all credentials are env-stubbed (read
server-side only, never committed/shipped/logged); the integration is authored now and goes
live when Matt drops the values into .env.local. Files live on Cloudflare Stream, NOT in
Supabase — Supabase holds only `video_assets` METADATA (table already in migration 0003).

---

## 1. Env (stubs in .env.local, gitignored; Matt fills real values)
- `CLOUDFLARE_ACCOUNT_ID` (server-only)
- `CLOUDFLARE_STREAM_API_TOKEN` (server-only — upload/management; NEVER client, NEVER logged)
- `CLOUDFLARE_STREAM_SIGNING_KEY_ID` + `CLOUDFLARE_STREAM_SIGNING_KEY_PEM` (server-only —
  mint signed, expiring playback tokens)
All read ONLY in `lib/video/*` behind a server-only guard (mirror lib/supabase/service.ts).
No NEXT_PUBLIC_ video vars. A "video mode" seam (`getVideoMode()` from env presence)
disables video gracefully when unconfigured (dev/test) — no throw.

## 2. lib/video/ (server-only)
- `client.ts` — Cloudflare Stream REST client (account id + API token). Upload + asset
  management. Server-only guard + missing-env → clear error (only when invoked, not import).
- `signed-url.ts` — `getSignedPlaybackUrl(playbackId, { ttlSeconds })`: mints a Cloudflare
  Stream **signed token** (JWT signed with the signing key) for the playback id, expiring
  (default ~2h), returns the signed HLS/dash URL or the signed iframe/token. Server-side
  ONLY, at play time. The raw playback id is never enough to view — a signed token is
  required (Stream "require signed URLs" on the asset). This is the "not publicly scrapable"
  guarantee.
- `mode.ts` — `getVideoMode()`: `enabled` iff the CF env vars are present; else `disabled`.

## 3. Repository / data
`video_assets` (migration 0003): metadata only (skill_id, provider, playback_id, kind,
duration_seconds, captions_url). Read = any authenticated (RLS, 0004). Add a read method to
the contract:
- `A3Repository.listVideoAssets(skillId: string): Promise<VideoAsset[]>` (types/ change —
  mr-gates gates). InMemory → returns [] (or an optional dev fixture); Supabase → reads
  video_assets via userClient (RLS-permitted authenticated read). `VideoAsset` type in /types.
Writes are service-role only (the upload script), never the app — consistent with 0003/0004.

## 4. Signed playback at play time (server-side)
The Learn page (server component) for a skill: `listVideoAssets(skillId)` → for each asset,
mint a signed URL server-side (`getSignedPlaybackUrl`) and pass ONLY the signed, expiring
URL to the client player. The client never receives the API token, the signing key, or a
bare playback id that works unsigned. No video URL in any client-visible static prop that
outlives the token TTL.

## 5. Learn video slot (pee-wee)
Wire the EXISTING VideoAsset slot in the Learn view (mr-grunt: find it — likely a
placeholder in app/student/(shell)/learn/[skillId] or a components/learn/* slot). Render a
calm, white, premium player (Cloudflare Stream `<Stream>`/iframe or a thin HLS player) for
the signed URL. States: loading (calm skeleton), no-video (the slot simply doesn't render —
not an error), error (calm "video unavailable" inline, never a broken frame). Captions if
captions_url present. No autoplay; respect reduced-motion. Video is SUPPLEMENTARY teaching,
not gated — a child can always proceed to practice without watching (mr-kahn: video never
gates mastery).

## 6. Upload script (Matt-run, with the token)
`scripts/upload-video.mjs`: args (mp4 path, skillId, kind, optional captions). Uploads the
mp4 to Cloudflare Stream via the API (resumable/tus or direct), sets "require signed URLs"
on the asset, then writes a `video_assets` row (service-role) with the returned playback id.
Idempotent-ish (re-run updates/replaces by skill+kind, or warns). Documented usage. Does
NOT run in CI; Matt runs it when uploading rendered lessons.

## 7. docs/video-pipeline.md
Architecture (render → Stream → video_assets → signed playback), the env vars, how to run
the upload script, and **cost** (Cloudflare Stream pricing: storage per minute stored +
delivery per minute delivered — document the model + a rough monthly estimate for a lesson
library; mark figures "verify against current Cloudflare pricing"). The signed-URL security
rationale (why bare playback ids aren't enough).

## 8. mr-kahn (light)
- Video is curriculum CONTENT delivery, keyed by opaque skill_id (no FK, graph is JSON).
- Video NEVER affects mastery, routing, phase, or the evidence trail — it's supplementary.
- Confirm the skill_id mapping is the same opaque graph node id used everywhere; no new
  content authority is created (a video is not evidence).

## Gates requested
- **mr-gates**: signed-URL security (server-side mint, expiring, not scrapable), CF token +
  signing key isolation (server-only, never client/committed/logged), the `listVideoAssets`
  contract + VideoAsset type, video_assets read via userClient (RLS) not service-role, the
  graceful disabled-mode seam (no throw when unconfigured → tests/dev green), upload script
  service-role boundary.
- **pee-wee**: the Learn video slot — calm premium player, loading/empty/error states,
  supplementary-not-gating, captions, reduced-motion.
- **mr-kahn**: skill mapping + the no-evidence/no-mastery-impact invariant.

Verdict: APPROVE | APPROVE WITH CHANGES (list) | REJECT (reason).

---

## GATE RESOLUTIONS — BINDING (supersedes conflicting text above)

mr-gates APPROVE WITH CHANGES (1 blocker + 4 should + 3 nit) · pee-wee APPROVE WITH NOTES
(3 binding + guidance) · mr-kahn APPROVE. Law for mr-grunt.

### NO NEW DEPENDENCIES (hard — avoids a CLAUDE.md dep checkpoint)
D0. Do NOT add @cloudflare/stream-react or any JWT lib. Playback = the Cloudflare Stream
   **iframe embed** (`https://customer-<code>.cloudflarestream.com/<SIGNED_TOKEN>/iframe`).
   Signed token = minted SERVER-SIDE via the Stream API `POST
   /accounts/{account}/stream/{uid}/token` (needs only CLOUDFLARE_ACCOUNT_ID +
   CLOUDFLARE_STREAM_API_TOKEN; returns a signed, expiring token — no local signing key, no
   JWT lib). Use global `fetch`. (Local-PEM signing is an optional fallback only; default to
   the API token endpoint, so the signing-key env vars are OPTIONAL, not required.)

### Type collision (mr-gates B1 — BLOCKER)
D1. The new metadata type is **`StreamVideoAsset`** (NOT `VideoAsset` — that already exists
   in types/video.ts for the curriculum graph `SkillNode.videos` and must stay untouched).
   `listVideoAssets(skillId): Promise<StreamVideoAsset[]>`. `StreamVideoAsset` mirrors the
   video_assets row (id, skillId, provider, playbackId, kind, durationSeconds, captionsUrl).

### Mode + isolation (mr-gates S1/S2)
D2. `getVideoMode()` = enabled iff `getAuthMode()==="supabase"` AND CF env present (one
   source of truth with the repo/auth seam; no drift). Lazy env reads; NO import-time throw.
D3. lib/video/{client,signed-url}.ts each carry the byte-for-byte `typeof window` throw
   (mirror lib/supabase/service.ts); credential `process.env` reads happen LAZILY inside the
   mint/upload functions (loud named error only when invoked without creds). `mode.ts` reads
   NO credential — pure, client-import-safe (like lib/auth/mode.ts).

### Prop boundary (mr-gates S3 — the not-scrapable enforcement)
D4. The player component props are `{ signedUrl: string; captionsUrl?: string; title?: ...;
   posterUrl?: string }` — **NO `playbackId` field**, so a leak is a TYPE ERROR. The bare
   playback_id from the row is NEVER serialized into client props / data-attrs / __NEXT_DATA__.
   The server component mints the signed URL and passes only that.

### Upload script (mr-gates S4/N1)
D5. scripts/upload-video.mjs: imports `createServiceClient` from lib/supabase/service.ts
   (node-safe, server-only) or builds its own — NEVER pulls in Next/React or
   lib/repository/server.ts. Sets "require signed URLs" on the asset BEFORE/atomically with
   writing the video_assets row (a row can never point at a publicly-viewable asset).
   Idempotency = read-then-write by (skill_id, kind), documented as racy-but-fine
   (single-user, Matt-run, not CI) — no DB unique constraint added.

### Repo contract (mr-gates 4/N3)
D6. Add `listVideoAssets(skillId)` to A3Repository. InMemory → returns `[]` (deterministic;
   documented as the contract). Supabase → reads video_assets via the **userClient** (RLS
   authenticated read), NOT service-role. Writes service-role-only (upload script).

### Learn slot (pee-wee binding 1/2/4 + states + a11y)
D7. **Replace the existing always-present `VideoSlots()` placeholder** (LearnClient.tsx
   ~506-541) and KILL the four static chips. No-video / disabled-mode → render NOTHING (no
   card, no frame, no chips); the right rail reflows.
D8. Placement: stays in the RIGHT RAIL, in a Card, above ContextBridge — secondary by
   position, never the left/primary column. `aspect-video`, full rail width,
   rounded-[10px] overflow-hidden. Quiet eyebrow `text-ink-500` (NOT accent) "Lesson video";
   one secondary line "Optional — a short explainer for this skill." (text-[12.5px] ink-500).
D9. States: loading → `bg-inset` aspect-video skeleton, shimmer GATED on prefers-reduced-
   motion (static block under reduced-motion; reuse the existing shimmer pattern). no-video →
   nothing (D7). error → `bg-inset` aspect-video, centered "Video unavailable right now."
   (text-[13px] ink-500, NO red, NOT error-tone Card). Captions: available + CC control
   visible but OFF by default, keyboard-reachable. Poster = CF real thumbnail (not fake);
   fallback bg-inset + one thin-stroke centered play glyph (reuse existing affordance).
D10. NO dark patterns (verify in diff): autoplay OFF, loads paused on poster; no
   "watch-to-continue", no %-watched gating/telemetry to the student; `practiceReady`
   (LearnClient ~133) keeps ZERO dependency on video; no watch events into the evidence trail
   or any student-visible streak/momentum; calm chrome (no up-next/autoplay queue/recs).
   Player tab-reachable with the standard focus ring; NO autofocus steal; no global key hijack.

### Docs/copy (mr-kahn advisory)
D11. docs/video-pipeline.md + slot copy label video as **supplementary instruction** —
   never "complete this video to continue", no checkmark reading as mastery. Mastery/credit
   derive solely from mastery_updates/grade_artifacts. (NCAA positive: instructor-authored
   lesson video supports the regular-interaction + defined-scope posture — fine to note, never
   as the assessment of record.) Cost section marks all figures "verify against current
   Cloudflare pricing."

### Env stubs (mr-gates N2)
D12. Add commented stubs to .env.local (gitignored): CLOUDFLARE_ACCOUNT_ID,
   CLOUDFLARE_STREAM_API_TOKEN (required for live); signing-key vars optional. Documented in
   docs/video-pipeline.md. No NEXT_PUBLIC_ video vars. Matt fills real values.
