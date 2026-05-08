module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "warn",
      from: { orphan: true, pathNot: ["\\.test\\.", "\\.spec\\.", "e2e/", "setup\\.ts"] },
      to: {},
    },
    {
      name: "components-not-from-app",
      comment: "Components must not import from app/ (prevents tight coupling)",
      severity: "error",
      from: { path: "^src/components" },
      to: { path: "^src/app" },
    },
  ],
  options: { doNotFollow: { path: "node_modules" } },
};
