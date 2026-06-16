// components/gamification/RingTrio — the three daily mastery rings as ONE
// signature instrument (STYLE_GUIDE §3, course §12). Focus (active solving) /
// Mastery (nodes advanced; gold cap at a lock) / Retrieval (spaced reps).
// Rings drive RETURN BEHAVIOR only — never mastery math (course §12). On a
// gated test pass `muted` (or render inside [data-surface="test"]) and all
// three read inactive. Presentational, server-safe.

import { MasteryRing } from "./MasteryRing";

export interface RingTrioData {
  focus: { value: number; label?: string; sublabel?: string };
  mastery: { value: number; label?: string; sublabel?: string; goldCap?: boolean };
  retrieval: { value: number; label?: string; sublabel?: string };
}

export interface RingTrioProps extends RingTrioData {
  size?: number;
  muted?: boolean;
  className?: string;
}

export function RingTrio({
  focus,
  mastery,
  retrieval,
  size = 120,
  muted = false,
  className = "",
}: RingTrioProps) {
  return (
    <div className={`flex flex-wrap items-start justify-center gap-8 ${className}`}>
      <MasteryRing
        kind="focus"
        value={focus.value}
        size={size}
        muted={muted}
        label={focus.label}
        sublabel={focus.sublabel ?? "Focus"}
      />
      <MasteryRing
        kind="mastery"
        value={mastery.value}
        size={size}
        muted={muted}
        goldCap={mastery.goldCap}
        label={mastery.label}
        sublabel={mastery.sublabel ?? "Mastery"}
      />
      <MasteryRing
        kind="retrieval"
        value={retrieval.value}
        size={size}
        muted={muted}
        label={retrieval.label}
        sublabel={retrieval.sublabel ?? "Retrieval"}
      />
    </div>
  );
}
