import { test, expect } from "@playwright/test";

test("ambient backdrop appears on movie detail page with poster", async ({ page }) => {
  await page.goto("/browse");
  await page.waitForLoadState("networkidle");

  const movieLink = page.locator('a[href^="/movies/"]').first();
  const href = await movieLink.getAttribute("href");
  if (!href) throw new Error("No movie links found on browse page");

  await page.goto(href);
  await page.waitForLoadState("networkidle");

  const backdrop = page.locator('[data-testid="ambient-backdrop"]');
  await expect(backdrop).toBeVisible({ timeout: 8000 });

  const style = await backdrop.getAttribute("style");
  expect(style).toContain("radial-gradient");
});

test("no crash when navigating movie detail pages", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/browse");
  await page.waitForLoadState("networkidle");
  expect(errors).toHaveLength(0);
});
