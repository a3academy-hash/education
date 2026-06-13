"use server";

// Onboarding server action (mr-gates conditions 3 & 5). Server-side validation
// of grade range and the Sport union; supplies campusId: null and a pending
// parentalConsent itself (COPPA posture). On success it persists a
// StudentProfile via the server-only repository singleton, sets an httpOnly
// cookie carrying ONLY the opaque student id (no PII), then redirects to the
// learning home.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRepository } from "../../../lib/repository/server";
import type { Sport } from "../../../types";
import { STUDENT_COOKIE, type OnboardingResult } from "./constants";

const SPORTS: readonly Sport[] = [
  "baseball",
  "softball",
  "basketball",
  "soccer",
  "football",
  "volleyball",
  "neutral",
];

const MIN_GRADE = 6;
const MAX_GRADE = 8;

function isSport(value: string): value is Sport {
  return (SPORTS as readonly string[]).includes(value);
}

export async function completeOnboarding(
  _prev: OnboardingResult | null,
  formData: FormData,
): Promise<OnboardingResult> {
  const rawName = String(formData.get("displayName") ?? "").trim();
  const rawGrade = String(formData.get("gradeLevel") ?? "");
  const rawSport = String(formData.get("sport") ?? "");

  // --- server-side validation (do not trust the client) ---
  if (!rawName || rawName.length > 30) {
    return { ok: false, error: "Enter your first name to continue." };
  }
  const gradeLevel = Number(rawGrade);
  if (!Number.isInteger(gradeLevel) || gradeLevel < MIN_GRADE || gradeLevel > MAX_GRADE) {
    return { ok: false, error: "Select your grade to continue." };
  }
  if (!isSport(rawSport)) {
    return { ok: false, error: "Choose a set of examples to continue." };
  }

  const repo = await getRepository();
  const profile = await repo.createStudent({
    displayName: rawName,
    gradeLevel,
    sport: rawSport,
    campusId: null,
    parentalConsent: { status: "pending", updatedAt: null },
  });

  // Opaque id only — no PII in the cookie (condition 3).
  const cookieStore = await cookies();
  cookieStore.set(STUDENT_COOKIE, profile.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/student");
}
