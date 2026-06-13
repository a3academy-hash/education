// /auth/sign-in (C2 P2) — parent sign-in. Server component resolves the auth
// mode (S11) and hands the client form the availability flag + the signIn
// action. Memory mode renders the calm "not available" notice (no Supabase env
// touched).

import { AuthForm } from "../AuthForm";
import { signIn } from "../actions";
import { getAuthMode } from "../../../lib/auth/mode";

export default function SignInPage() {
  return <AuthForm mode="sign-in" action={signIn} available={getAuthMode() === "supabase"} />;
}
