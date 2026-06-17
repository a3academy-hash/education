import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)));

export default defineConfig({
  // Component tests (.test.tsx) use the automatic JSX runtime (no React import).
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": root,
    },
  },
  test: {
    // Engine tests in /lib; co-located math-helper tests in /components/learning
    // (mr-gates condition 8 keeps the kahn-gate boundary crisp).
    include: [
      "lib/**/*.test.ts",
      "components/**/*.test.ts",
      "components/**/*.test.tsx",
      // Phase-6 diagnostic simulation runs via the vitest resolver (§V2 R11 /
      // G2) — NOT bare node. Deterministic seeded LCG; no clock, no RNG.
      "scripts/diagnostic-sim.test.ts",
      "scripts/phase9-verify.test.ts",
    ],
  },
});
