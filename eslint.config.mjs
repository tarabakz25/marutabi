import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // generated assets (Prisma client/runtime, wasm, etc.)
      "lib/generated/**",
      "lib/generated/prisma/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}", "**/*.js"],
    rules: {
      // Allow "any" in application code to reduce friction; can tighten later
      "@typescript-eslint/no-explicit-any": "off",
      // Prefer const often noisy; we'll keep default except for our fix below
      // "prefer-const": "warn",
    },
  },
];

export default eslintConfig;
