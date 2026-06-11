// Root entry — sends visitors into the student area, which routes to
// onboarding or the learning home depending on session state.

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/student");
}
