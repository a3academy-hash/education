// Placeholder — the curriculum graph inspector is built in Phase 5 (dev-only
// surface). mr-gates condition 7: notFound() in production.

import { notFound } from "next/navigation";

export default function GraphInspectorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto max-w-[1140px] px-7 py-12">
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-ink-500">
        Dev only
      </p>
      <h1 className="font-display text-[30px] font-semibold text-ink">Graph inspector</h1>
      <p className="mt-3 text-[15px] text-ink-500">
        The curriculum graph inspector arrives in Phase 5.
      </p>
    </main>
  );
}
