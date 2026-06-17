// components/gamification/RewardModeToggle — the Training/Boost CELEBRATIONS
// preference (Phase 8 R4/R6). Composes the generic SegmentedControl with the
// reward-mode vocabulary + the honesty subline. PRESENTATION ONLY: this changes
// HOW wins are shown, never the mastery math, the lock, or anything on the test
// surface. Lives ONLY on the learner momentum surface (never Focus chrome, never
// a test). Persists via the setRewardMode server action; optimistic local state
// keeps the toggle responsive while the action commits.
//
// COPY (pee-wee R6, binding): "Celebrations" framing; "Training (quiet)" /
// "Boost (a little more energy)"; the subline "Either way, skills count the same
// — this only changes how wins are shown." NO "for younger players" copy.

"use client";

import { useState, useTransition } from "react";
import { SegmentedControl, type SegmentedOption } from "../ui/SegmentedControl";
import type { RewardMode } from "../../lib/gamification/reward-mode";
import { setRewardMode } from "../../app/student/(shell)/momentum/actions";

const OPTIONS: SegmentedOption<RewardMode>[] = [
  { value: "training", label: "Training", sublabel: "quiet" },
  { value: "boost", label: "Boost", sublabel: "a little more energy" },
];

export interface RewardModeToggleProps {
  /** The resolved current mode (stored preference, or the age default). */
  value: RewardMode;
  className?: string;
}

export function RewardModeToggle({ value, className = "" }: RewardModeToggleProps) {
  const [mode, setMode] = useState<RewardMode>(value);
  const [pending, startTransition] = useTransition();

  const onChange = (next: RewardMode) => {
    if (next === mode) return;
    setMode(next); // optimistic
    startTransition(async () => {
      const res = await setRewardMode(next);
      if (!res.ok) setMode(value); // revert on failure
    });
  };

  return (
    <div className={className}>
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        Celebrations
      </p>
      <SegmentedControl
        options={OPTIONS}
        value={mode}
        onChange={onChange}
        ariaLabel="Celebration style"
        disabled={pending}
      />
      <p className="mt-3 text-[13px] leading-[1.5] text-ink-500">
        Either way, skills count the same &mdash; this only changes how wins are shown.
      </p>
    </div>
  );
}
