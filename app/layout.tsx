import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font (MANDATORY DEVIATION §F-1: no third-party
// Google Fonts requests from student surfaces — COPPA posture).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display-src",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-src",
  display: "swap",
});

const splineMono = Spline_Sans_Mono({
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
      className={`${fraunces.variable} ${hanken.variable} ${splineMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
