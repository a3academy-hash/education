// Shared onboarding constants/types. Kept OUT of actions.ts because a
// "use server" module may only export async functions.

export const STUDENT_COOKIE = "a3_student_id";

export interface OnboardingResult {
  ok: boolean;
  error?: string;
}
