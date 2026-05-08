import { test, expect } from "@playwright/test";

test("homepage loads without JS errors @smoke", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.locator("main")).toBeVisible({ timeout: 10000 });

  expect(errors).toHaveLength(0);
});

test("trending-shelf is visible on homepage", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-testid="trending-shelf"]')).toBeVisible({ timeout: 12000 });
});

test("now-playing-shelf is visible on homepage", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-testid="now-playing-shelf"]')).toBeVisible({ timeout: 12000 });
});

test("upcoming-shelf is visible on homepage", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-testid="upcoming-shelf"]')).toBeVisible({ timeout: 12000 });
});
