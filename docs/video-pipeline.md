# Video Pipeline (Cloudflare Stream)

Phase 11 — Workstream D. Supplementary lesson video delivery for the Learn view.

> **Supplementary instruction — never the assessment of record.** A lesson video
> is optional support. It NEVER gates mastery, routing, phase, or credit, and a
> watch is NEVER written to the evidence trail. Mastery/credit derive SOLELY from
> `mastery_updates` and `grade_artifacts`. There is no "complete this video to
> continue", no %-watched gating, and no checkmark that reads as mastery.
> (NCAA-positive note: instructor-authored lesson video supports the
> regular-interaction + defined-scope posture — but it is never the assessment.)

---

## Architecture

```
  render mp4
      │
      ▼  scripts/upload-video.mjs  (Matt-run, service-role)
  Cloudflare Stream  ──────────────►  asset (requireSignedURLs = true)
      │                                     │ playback_id (uid)
      ▼                                     ▼
  Supabase  video_assets row  ◄────── metadata only (no playable URL)
      │
      ▼  Learn server component (getVideoMode enabled)
  repo.listVideoAssets(skillId)  ──►  getSignedPlaybackUrl(playbackId)
      │                                     │  POST /accounts/{acct}/stream/{uid}/token
      ▼                                     ▼  signed, expiring token (~2h)
  LessonVideo (client)  ◄── signedUrl ONLY  https://customer-<code>.cloudflarestream.com/<token>/iframe
```

- **Files live on Cloudflare Stream**, NOT in Supabase. Supabase holds only the
  `video_assets` METADATA row (migration 0003): `skill_id` (opaque graph node id,
  no FK), `provider`, `playback_id`, `kind`, `duration_seconds`, `captions_url`.
- **`skill_id` is the same opaque graph node id used everywhere** — no new content
  authority is created. A video is content delivery, not evidence.

---

## Disabled-by-default seam

`lib/video/mode.ts` `getVideoMode()` returns `enabled` IFF:

1. `getAuthMode() === "supabase"` (the live, RLS-backed world), AND
2. `CLOUDFLARE_ACCOUNT_ID` **and** `CLOUDFLARE_STREAM_API_TOKEN` are both present.

It reads env *presence* only (never a credential value), never touches Cloudflare,
and never throws. In the default `memory` world (dev / test / CI) video is OFF:
`listVideoAssets` returns `[]`, the Learn rail renders no video card, and nothing
about Cloudflare is required. The integration goes live the moment Matt drops the
real values into `.env.local`.

---

## Environment variables (server-only)

Add to `.env.local` (gitignored). **No `NEXT_PUBLIC_` video vars** — these are
server-only and must never reach the browser or be logged.

| Var | Required | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | yes (live) | Cloudflare account id; also the default playback customer-subdomain code. |
| `CLOUDFLARE_STREAM_API_TOKEN` | yes (live) | Stream API token — upload/management AND minting signed playback tokens. |
| `CLOUDFLARE_STREAM_CUSTOMER_CODE` | optional | Override the `customer-<code>` subdomain if it differs from the account id. |
| `CLOUDFLARE_STREAM_SIGNING_KEY_ID` | optional | Only for the local-PEM signing fallback (NOT used by default). |
| `CLOUDFLARE_STREAM_SIGNING_KEY_PEM` | optional | Only for the local-PEM signing fallback (NOT used by default). |

Default signing path (D0): signed tokens are minted via the **Stream token API**
(`POST /accounts/{account}/stream/{uid}/token`) using only the account id + API
token — **no local signing key, no JWT library, no new npm dependency.** The
signing-key vars exist only as an optional fallback and are not required.

---

## Signed-URL security rationale

Every asset is created with **`requireSignedURLs: true`** (set at upload time,
D5), so a bare `playback_id` is **not enough to view it**. At play time the Learn
server component mints a **signed, expiring** token (~2h default) and passes ONLY
the resulting signed iframe URL to the client. Consequences:

- The bare `playback_id` is **never serialized to the client** — the player
  component's props have no `playbackId` field (a leak would be a TypeScript
  error). It is not in any client prop, data-attribute, or `__NEXT_DATA__`.
- The CF API token and the Supabase service-role key are read **server-side only**
  and are never logged or shipped.
- A scraped URL stops working after the token TTL — the library is not publicly
  enumerable.

`video_assets` READ is RLS authenticated-wide (non-PII metadata; policy
`video_assets_select_authenticated`, migration 0004) via the **userClient** — not
service-role. WRITE is service-role-only (the upload script); there is
deliberately no client write policy.

---

## Upload script

```
node D:\a3_education\scripts\upload-video.mjs <mp4Path> <skillId> <kind> [captionsUrl]
```

Example:

```
node D:\a3_education\scripts\upload-video.mjs .\lessons\ALG-F01.mp4 ALG-F01 lesson
```

What it does:

1. Reads the mp4 bytes.
2. Uploads to Cloudflare Stream with `requireSignedURLs: true` set at creation.
3. Reads any existing `video_assets` row for `(skill_id, kind)`; updates it to the
   new playback id, else inserts a new row (service-role).

Idempotency is **read-then-write by `(skill_id, kind)`** — documented as
racy-but-fine (single-user, Matt-run, not CI; no DB unique constraint added).
Requires `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`,
`NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Does
NOT run in CI.

---

## Cost model

> **Verify all figures against current Cloudflare pricing** — the numbers below
> are illustrative of the *model*, not a quote.

Cloudflare Stream bills on two axes:

- **Storage** — per **minute of video stored** per month.
- **Delivery** — per **minute of video delivered** (watched) per month.

Illustrative model (verify against current Cloudflare pricing):

- Indicative rates (historically ≈ **$5 / 1,000 minutes stored / mo** and
  ≈ **$1 / 1,000 minutes delivered**). _Verify._
- Library: say **74 skills × ~6 min average ≈ 444 minutes stored**.
  - Storage ≈ `444 / 1000 × $5 ≈ $2.20 / mo`. _Verify._
- Delivery: say **500 students × 30 min watched / mo ≈ 15,000 minutes delivered**.
  - Delivery ≈ `15,000 / 1000 × $1 ≈ $15 / mo`. _Verify._
- **Rough total ≈ $17 / mo at this scale.** Storage is ~flat (set by library
  size); delivery scales with active watch-minutes. _Verify all figures._

---

## What this pipeline does NOT do (by design)

- No autoplay (the player loads paused on the Cloudflare poster).
- No watch telemetry, no %-watched, no "watch-to-continue", no streak/momentum
  tied to viewing.
- No write to any evidence table from the video path.
- No effect on `lib/mastery-engine`, `lib/adaptive-router`, phase logic, or the
  diagnostic — `practiceReady` has zero dependency on video.
