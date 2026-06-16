"use client";

// ModeIndicator (STYLE_GUIDE §1) — the persistent chrome signal of WHERE the
// student is inside the one product. Pathname-driven so it is genuinely always
// present without threading props through the shared route-group layout:
//   • gated test/diagnostic → "Measurement mode — focus on accuracy" (sober,
//     no reward dot — reinforces the firewall behaviourally)
//   • everywhere else       → "Training mode" (calm)
// Reward intensity (Training/Boost) is a separate Phase-8 preference; this only
// names the measurement-vs-training register.

import { usePathname } from "next/navigation";

export function ModeIndicator() {
  const pathname = usePathname() ?? "";
  const measurement = pathname.startsWith("/student/diagnostic");

  if (measurement) {
    return (
      <span className="hidden items-center gap-1.5 rounded-full border border-border-meaningful bg-inset px-2.5 py-1 text-[11.5px] font-medium text-ink-700 sm:inline-flex">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink-400" />
        Measurement mode — focus on accuracy
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-1.5 rounded-full bg-accent-tint px-2.5 py-1 text-[11.5px] font-medium text-ink-700 sm:inline-flex">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-mastery)]" />
      Training mode
    </span>
  );
}
