// Onboarding (§D) — sits OUTSIDE the (shell) route group (mr-gates condition
// 4): no nullable-student chrome wraps a student who does not exist yet.

import { OnboardingFlow } from "./OnboardingFlow";

export const metadata = {
  title: "Set up your course — A3 Academy",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
