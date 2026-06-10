// Flat ESLint config per eslint-config-next@15 conventions.
// FlatCompat comes from @eslint/eslintrc, a dependency of eslint@9 itself.
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Underscore-prefixed args are intentionally unused (e.g. the unwired
      // SupabaseRepository placeholder must still satisfy A3Repository).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { args: "after-used", argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
