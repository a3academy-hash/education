import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

// Self-hosted via next/font (MANDATORY DEVIATION §F-1: no third-party
// Google Fonts requests from student surfaces — COPPA posture).
// STYLE_GUIDE §4: Source Serif 4 (display, institutional — replaces Fraunces);
// IBM Plex Sans (body — the spec's lean for TrackMan/Plex-Mono coherence);
// IBM Plex Mono (numerics/telemetry). Body font A/B-flagged for humans (§11).
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display-src",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-src",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-src",
  display: "swap",
});

export const metadata: Metadata = {
  title: "A3 Academy — Algebra 1",
  description: "Algebra 1 adaptive learning platform.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
