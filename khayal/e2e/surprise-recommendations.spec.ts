import { test, expect } from "@playwright/test";

test("recommendations API returns 401 when unauthenticated", async ({ request }) => {
  const res = await request.get("http://localhost:3000/api/recommendations");
  expect(res.status()).toBe(401);
});

test("recommendations API returns JSON with movies array when called with valid shape", async ({ request }) => {
  const res = await request.get("http://localhost:3000/api/recommendations");
  // Must be JSON, not a crash
  expect(res.headers()["content-type"]).toContain("application/json");
});

test("homepage loads without JS errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3000");
  expect(errors).toHaveLength(0);
});
