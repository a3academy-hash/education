// Student-facing session interstitials (C2 P8, S8). FULL-CANVAS, student
// register, Card DEFAULT tone (NOT error — a paused/expired session is not a
// failure the child caused). The child NEVER sees 401/"session"/"token"/stack.
// In-progress work is preserved by the per-attempt persistence already in
// PracticeFlow; these screens never discard it.
//
// Three calm states:
//   expired  → "Let's get a grown-up to sign back in." + "Get a parent"
//   paused   → "Access is paused" — a parent can re-grant (re-grant reachable)
//   pending  → "Almost ready" — a parent needs to finish setup
//
// Reduced-motion: a plain fade-in (the project fade-in class respects the global
// reduced-motion rule).

import Link from "next/link";
import { Card } from "../../../components/ui/Card";

type Variant = "expired" | "paused" | "pending";

const COPY: Record<Variant, { eyebrow: string; title: string; body: string; cta: string }> = {
  expired: {
    eyebrow: "Take a quick break",
    title: "Let's get a grown-up to sign back in.",
    body: "Your work is saved. A parent can sign in to pick up right where you left off.",
    cta: "Get a parent",
  },
  paused: {
    eyebrow: "Paused for now",
    title: "Your course is paused.",
    body: "Everything you've done is saved. Ask a parent to turn your course back on whenever you're ready.",
    cta: "Get a parent",
  },
  pending: {
    eyebrow: "Almost ready",
    title: "A grown-up needs to finish setting up.",
    body: "You're all set to start once a parent finishes a couple of quick steps. Your work will be saved.",
    cta: "Get a parent",
  },
};

export function SessionInterstitial({ variant }: { variant: Variant }) {
  const c = COPY[variant];
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-16">
      <div className="fade-in w-full max-w-[440px]">
        <Card tone="default" className="text-center">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
            {c.eyebrow}
          </p>
          <h1 className="font-display text-[24px] font-semibold leading-[1.25] text-ink">
            {c.title}
          </h1>
          <p className="mx-auto mt-3 max-w-[360px] text-[14.5px] leading-[1.55] text-ink-500">
            {c.body}
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center justify-center rounded-[10px] bg-accent px-[22px] py-[11px] text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {c.cta}
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
