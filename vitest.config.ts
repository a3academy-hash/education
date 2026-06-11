import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
    },
  },
  test: {
    // Engine tests in /lib; co-located math-helper tests in /components/learning
    // (mr-gates condition 8 keeps the kahn-gate boundary crisp).
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
  },
});
