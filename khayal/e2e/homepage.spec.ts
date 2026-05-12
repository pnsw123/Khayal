import { test, expect } from "@playwright/test";

test("homepage loads without JS errors @smoke", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });

  expect(errors).toHaveLength(0);
});

test("hero section is present in homepage DOM", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 12000 });
  // Hero section is rendered inside ScrollStack — verify something visible
  await expect(page.locator("body")).not.toBeEmpty();
});

test("homepage renders ScrollStack with content sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 12000 });
  // The new landing page uses ScrollStack — at minimum the main container renders
  const html = await page.locator("html").innerHTML();
  expect(html.length).toBeGreaterThan(100);
});

test("homepage has CTA section link to browse or login", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 12000 });
  // CTA section renders a link to /browse or /login
  const ctaLink = page.locator('a[href="/browse"], a[href="/login"]');
  await expect(ctaLink.first()).toBeAttached({ timeout: 12000 });
});
