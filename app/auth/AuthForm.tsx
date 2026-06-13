"use client";

// AuthForm (C2 P2) — the shared sign-in / sign-up form. Centered single column
// (the page wrapper sizes it to 420). Calm onboarding voice; AlertPanel for the
// server error; autofocus email; Enter submits (native form submit). The primary
// is w-full INSIDE the auth card only (P2 allows this exception). Generic errors
// only — never reveal whether an email exists.

import { useActionState } from "react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { AlertPanel } from "../../components/ui/Panels";
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

export function AuthForm({ mode, action, available }: AuthFormProps) {
  const [state, formAction, pending] = useActionState<AuthResult | null, FormData>(
    action,
    null,
  );

  const isSignUp = mode === "sign-up";
  const heading = isSignUp ? "Create your family account" : "Sign in";
  const subhead = isSignUp
    ? "One parent account manages your students and their consent."
    : "Sign in to manage your students.";
  const cta = isSignUp ? "Create account" : "Sign in";

  return (
    <div className="fade-in w-full">
      <div className="mb-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-accent">
            <span className="font-display text-[15px] font-semibold text-white">A</span>
          </span>
          <span className="text-[11px] uppercase tracking-[0.3px] text-ink-500">
            A3 Academy · Family
          </span>
        </div>
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
