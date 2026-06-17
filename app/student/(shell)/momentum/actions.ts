// Reward-mode preference server action (Phase 8 R4/R6). Persists the learner's
// Training/Boost CELEBRATION preference. PRESENTATION ONLY — it never enters
// mastery math, the lock gate, the selector, or any [data-surface=test] chrome.
// Persistence is a per-learner cookie (works in memory AND supabase modes with
// no migration); default-by-age applies when unset (resolved at read time).

"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isRewardMode, type RewardMode } from "../../../../lib/gamification/reward-mode";
import { getCurrentStudentId } from "../../../../lib/auth/session";
import { REWARD_MODE_COOKIE } from "./reward-mode-constants";

/** Persist the learner's reward-mode preference, then refresh the momentum view.
 * The preference is SCOPED to the active learner — the cookie carries
 * `${studentId}:${mode}` so switching learners on a shared device (the
 * parent-launches-child model) never leaks one child's preference to another. */
export async function setRewardMode(mode: RewardMode): Promise<{ ok: boolean }> {
  if (!isRewardMode(mode)) return { ok: false };
  const studentId = await getCurrentStudentId();
  if (!studentId) return { ok: false };
  const store = await cookies();
  store.set(REWARD_MODE_COOKIE, `${studentId}:${mode}`, {
    httpOnly: false, // read client-side only as a presentation hint; no PII
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // one year
  });
  revalidatePath("/student/momentum");
  return { ok: true };
}
