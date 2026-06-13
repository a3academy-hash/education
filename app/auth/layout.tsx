// Auth route layout (C2 P1/P2): NO shell. Centered single column, max 420,
// calm white canvas. Parent-only surface — children never reach it.

import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-[420px]">{children}</div>
    </main>
  );
}
