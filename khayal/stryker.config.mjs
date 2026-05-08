export default {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  coverageAnalysis: "perTest",
  thresholds: { high: 80, low: 60, break: 0 },
  mutate: [
    "src/hooks/**/*.ts",
    "src/lib/**/*.ts",
    "src/app/api/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
  ],
};
