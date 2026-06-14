// /auth/sign-in (C2 P2) — parent sign-in. Server component resolves the auth
// mode (S11) and hands the client form the availability flag + the signIn
// action. Memory mode renders the calm "not available" notice (no Supabase env
// touched).
//
// LB1: the Supabase confirmation link returns the parent here with ?confirmed=1
// (Matt configures the redirect URL). We render a calm one-time success banner
// above the form — InsetPanel, NOT the error AlertPanel.

import { AuthForm } from "../AuthForm";
import { signIn } from "../actions";
import { getAuthMode } from "../../../lib/auth/mode";
import { InsetPanel } from "../../../components/ui/Panels";

export default async function SignInPage({
  searchParams,
}: {
  // Next 15: searchParams is a Promise in server components.
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { confirmed } = await searchParams;
  return (
    <div className="w-full">
      {confirmed === "1" && (
        <InsetPanel className="mb-5">
          Your email is confirmed. Sign in to continue.
        </InsetPanel>
      )}
      <AuthForm mode="sign-in" action={signIn} available={getAuthMode() === "supabase"} />
    </div>
  );
}
