"use client";

// LessonVideo — the calm, premium, SECONDARY lesson-video player for the Learn
// right rail. Phase 11 Workstream D (pee-wee binding 1/2/4 + D7–D10).
//
// PROP BOUNDARY (D4 — the not-scrapable enforcement): props carry ONLY a
// server-minted, signed, expiring `signedUrl` — there is NO `playbackId` field,
// so leaking the bare id is a TYPE ERROR. The server component mints the URL and
// passes only that. The token + signing happen entirely server-side.
//
// NO dark patterns (D10): no autoplay (loads paused on the CF poster), no
// "watch-to-continue", no %-watched gating, no watch telemetry, no up-next /
// autoplay queue / recommendations. Practice never depends on this. Captions are
// available and OFF by default. Tab-reachable with the standard focus ring; no
// autofocus steal; no global key hijack (the iframe owns its own keys when
// focused). Disabled / no-video → the caller renders NOTHING and the rail
// reflows; this component is only mounted when there is a real signed URL.

import { useState } from "react";

export interface LessonVideoProps {
  /** Server-minted, signed, expiring Cloudflare Stream IFRAME url. The ONLY url. */
  signedUrl: string;
  /** Optional captions/subtitles track url (metadata from the row). */
  captionsUrl?: string;
  /** Optional human title for the asset (accessible name / aria-label). */
  title?: string;
  /** Optional Cloudflare real thumbnail url (poster). Fallback glyph if absent. */
  posterUrl?: string;
}

const FRAME =
  "relative aspect-video w-full overflow-hidden rounded-[10px] bg-inset border border-border";

export function LessonVideo({ signedUrl, captionsUrl, title }: LessonVideoProps) {
  // error → calm inline message (NOT an error-tone Card, NO red, D9). The iframe
  // load error is the only failure surface a child can hit at play time.
  const [errored, setErrored] = useState(false);

  return (
    <section aria-label={title ? `Lesson video: ${title}` : "Lesson video"}>
      {/* Quiet eyebrow — ink-500, NOT accent (D8): secondary by tone + position. */}
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        Lesson video
      </p>
      <p className="mb-3 text-[12.5px] leading-[1.5] text-ink-500">
        Optional — a short explainer for this skill.
      </p>

      {errored ? (
        <div className={`${FRAME} flex items-center justify-center`}>
          <p className="px-6 text-center text-[13px] text-ink-500">
            Video unavailable right now.
          </p>
        </div>
      ) : (
        <div className={FRAME}>
          {/* Cloudflare Stream IFRAME embed (D0) — signed, expiring URL only.
              No autoplay: the embed loads paused on its poster. The iframe is
              tab-reachable and gets the standard focus ring; no autoFocus. */}
          {/* The Cloudflare Stream player shows its own real poster/thumbnail
              (D9); posterUrl is accepted for future use but the embed owns the
              poster, so it is not a separate <iframe> attribute (iframes have no
              `poster`). NO autoplay in `allow` — playback is user-initiated. */}
          <iframe
            src={signedUrl}
            title={title ?? "Lesson video"}
            loading="lazy"
            allow="accelerometer; gyroscope; encrypted-media; picture-in-picture;"
            allowFullScreen
            onError={() => setErrored(true)}
            className="absolute inset-0 h-full w-full border-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>
      )}

      {/* Captions are AVAILABLE; CC is OFF by default and toggled inside the
          Stream player UI (keyboard-reachable). We surface a quiet, keyboard-
          reachable link to the track when present so a child/teacher can always
          reach captions even if the in-player control is missed. */}
      {captionsUrl && !errored && (
        <a
          href={captionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block rounded-[6px] text-[12.5px] text-ink-500 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Captions available
        </a>
      )}
    </section>
  );
}
