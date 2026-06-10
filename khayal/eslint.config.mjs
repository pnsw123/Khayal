import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { "@typescript-eslint": tsPlugin },
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
        React: "readonly",
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // TypeScript itself catches undefined identifiers — disable redundant ESLint rule
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      // Disallow all console.* in production source; error blocks regardless of how ESLint is invoked
      "no-console": "error",
    },
  },
  // Server-side files: allow console.warn and console.error for structured logging
  {
    files: ["src/app/api/**/*.ts", "src/middleware.ts"],
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: ["node_modules/**", ".next/**", "out/**"],
  },
];

export default eslintConfig;
