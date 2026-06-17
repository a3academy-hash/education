// Shared reward-mode preference constants. Kept OUT of actions.ts because a
// "use server" module may only export async functions (mirrors the onboarding
// constants split).

/**
 * Per-learner reward-mode preference cookie. A cookie is the source of truth in
 * BOTH memory and supabase modes (no schema migration needed now); when the
 * dedicated education Supabase is wired, a generated `students.reward_mode`
 * column can supersede it. Default-by-age applies when the cookie is unset.
 */
export const REWARD_MODE_COOKIE = "a3_reward_mode";
