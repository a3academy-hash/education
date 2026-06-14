"use client";

// AuthForm (C2 P2) — the shared sign-in / sign-up form. Centered single column
// (the page wrapper sizes it to 420). Calm onboarding voice; AlertPanel for the
// server error; autofocus email; Enter submits (native form submit). The primary
// is w-full INSIDE the auth card only (P2 allows this exception). Generic errors
// only — never reveal whether an email exists.

import { useActionState, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { AlertPanel, InsetPanel } from "../../components/ui/Panels";
import type { AuthResult } from "./actions";

type AuthAction = (
  prev: AuthResult | null,
  formData: FormData,
) => Promise<AuthResult>;

export interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  action: AuthAction;
  /** Disabled with a calm notice in memory mode (S11). */
  available: boolean;
}

const Eyebrow = () => (
  <div className="mb-5 flex items-center gap-3">
    <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-accent">
      <span className="font-display text-[15px] font-semibold text-white">A</span>
    </span>
    <span className="text-[11px] uppercase tracking-[0.3px] text-ink-500">
      A3 Academy · Family
    </span>
  </div>
);

export function AuthForm({ mode, action, available }: AuthFormProps) {
  const [state, formAction, pending] = useActionState<AuthResult | null, FormData>(
    action,
    null,
  );
  // Controlled so the pending-confirmation panel can echo "SENT TO {email}"
  // without round-tripping the address through AuthResult (LB1 L5).
  const [email, setEmail] = useState("");

  const isSignUp = mode === "sign-up";

  // Pending confirmation only applies to the sign-up action path; sign-in is
  // unaffected (signIn never returns pendingConfirmation) (LB1 L4).
  if (isSignUp && state?.pendingConfirmation) {
    return (
      <div className="fade-in w-full">
        <Eyebrow />
        <h1 className="font-display text-[23px] font-semibold leading-[1.25] text-ink">
          Check your email
        </h1>
        <p className="mt-2 text-[14px] leading-[1.55] text-ink-500">
          We sent a confirmation link to the address below. Open it to finish
          setting up your family account, then come back and sign in.
        </p>
        <InsetPanel label="SENT TO" className="mt-6">
          <span className="text-ink-700">{email}</span>
        </InsetPanel>
        <p className="mt-4 text-[13px] leading-[1.55] text-ink-500">
          The link can take a minute to arrive. If you don&apos;t see it, check
          your spam folder.
        </p>
        <p className="mt-6 text-center text-[13px] text-ink-500">
          Already confirmed?{" "}
          <a
            href="/auth/sign-in"
            className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Sign in
          </a>
        </p>
      </div>
    );
  }

  const heading = isSignUp ? "Create your family account" : "Sign in";
  const subhead = isSignUp
    ? "One parent account manages your students and their consent."
    : "Sign in to manage your students.";
  const cta = isSignUp ? "Create account" : "Sign in";

  return (
    <div className="fade-in w-full">
      <div className="mb-7">
        <Eyebrow />
        <h1 className="font-display text-[23px] font-semibold leading-[1.25] text-ink">
          {heading}
        </h1>
        <p className="mt-2 text-[14px] leading-[1.55] text-ink-500">{subhead}</p>
      </div>

      {!available && (
        <AlertPanel className="mb-5">
          Parent accounts are not available in this environment. The dev and test
          paths use the local student flow.
        </AlertPanel>
      )}

      {available && state?.error && (
        <AlertPanel className="mb-5">{state.error}</AlertPanel>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        {isSignUp && (
          <Input
            label="Your name"
            name="displayName"
            type="text"
            autoComplete="name"
            disabled={!available}
          />
        )}
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          disabled={!available}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          disabled={!available}
          helperText={isSignUp ? "At least 8 characters." : undefined}
        />
        <Button
          variant="primary"
          type="submit"
          loading={pending}
          disabled={!available}
          className="w-full"
        >
          {cta}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-500">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <a
              href="/auth/sign-in"
              className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Sign in
            </a>
          </>
        ) : (
          <>
            New to A3 Academy?{" "}
            <a
              href="/auth/sign-up"
              className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Create an account
            </a>
          </>
        )}
      </p>
    </div>
  );
}
