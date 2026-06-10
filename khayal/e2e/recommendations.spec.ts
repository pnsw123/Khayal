import { test, expect } from "@playwright/test";

test("personalised shelf is hidden for logged-out users", async ({ page }) => {
  await page.goto("/browse");
  const shelf = page.locator('[data-testid="recommendations-shelf"]');
  await expect(shelf).not.toBeVisible();
});

test("API route returns 401 when unauthenticated", async ({ request }) => {
  const res = await request.get("/api/recommendations");
  expect(res.status()).toBe(401);
});

test("browse page loads without JS errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/browse");
  await page.waitForLoadState("networkidle");
  expect(errors).toHaveLength(0);
});
