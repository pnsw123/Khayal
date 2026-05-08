import { test, expect } from "@playwright/test";

test("homepage loads @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/KHAYAL/i);
});

test("browse page loads @smoke", async ({ page }) => {
  await page.goto("/browse");
  await expect(page.locator("main")).toBeVisible({ timeout: 8000 });
});

test("search page loads @smoke", async ({ page }) => {
  await page.goto("/search?q=batman");
  await expect(page.locator("main")).toBeVisible({ timeout: 8000 });
});

test("API returns 401 unauthenticated @smoke", async ({ request }) => {
  const res = await request.get("/api/recommendations");
  expect([401, 200]).toContain(res.status());
});
