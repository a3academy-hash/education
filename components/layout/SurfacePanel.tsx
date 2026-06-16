// SurfacePanel — paints a register surface that fills the content area beneath
// the shared chrome (STYLE_GUIDE §1/§8). Sets [data-surface], which re-scopes
// EVERY semantic token for descendants (globals.css), so a lesson written
// against bg-surface / text-ink / --color-mastery turns dark with no per-
// component variants. Full-bleeds horizontally to the viewport (not coupled to
// <main>'s exact padding) and cancels <main>'s pt-9/pb-20 so the surface reaches
// the chrome and the footer edge — no light gutter. Content re-centers to 1140.
//
//   • "focus" — immersive dark canvas for interactive lessons (§8.2).
//   • "test"  — faint-navy white for gated diagnostics; rewards are STRUCTURALLY
//     muted by the [data-surface="test"] CSS backstop (§8.3 firewall).

import type { ReactNode } from "react";

export interface SurfacePanelProps {
  surface: "focus" | "test";
  children: ReactNode;
  className?: string;
}

export function SurfacePanel({ surface, children, className = "" }: SurfacePanelProps) {
  return (
    <div
      data-surface={surface}
      className="relative left-1/2 right-1/2 -mx-[50vw] -mt-9 -mb-20 min-h-[calc(100vh-62px)] w-screen bg-canvas px-7 pb-20 pt-9"
    >
      <div className={`mx-auto max-w-[1140px] ${className}`}>{children}</div>
    </div>
  );
}
