// /auth/sign-up (C2 P2) — parent account creation. Server component resolves the
// auth mode (S11) and hands the client form the availability flag + the signUp
// action. Memory mode renders the calm "not available" notice.

import { AuthForm } from "../AuthForm";
import { signUp } from "../actions";
import { getAuthMode } from "../../../lib/auth/mode";

export default function SignUpPage() {
  return <AuthForm mode="sign-up" action={signUp} available={getAuthMode() === "supabase"} />;
}
