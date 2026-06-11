import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    testTimeout: 15000,
    exclude: ["**/node_modules/**", "**/e2e/**", "**/*.spec.ts", "**/*.integration.test.*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
      include: ["src/lib/**", "src/hooks/**"],
      exclude: ["src/tests/**", "**/*.test.*", "**/*.spec.*"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
