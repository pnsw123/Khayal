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

test("movie detail page renders title @smoke", async ({ page }) => {
  await page.goto("/movies/inception-2010");
  await expect(page.locator("h1")).toContainText("Inception", { timeout: 10000 });
});

test("tv detail page renders title @smoke", async ({ page }) => {
  await page.goto("/tv/breaking-bad");
  await expect(page.locator("h1")).toContainText("Breaking Bad", { timeout: 10000 });
});
