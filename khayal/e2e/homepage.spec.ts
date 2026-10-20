import { test, expect } from "@playwright/test";

test("homepage loads without JS errors @smoke", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });

  expect(errors).toHaveLength(0);
});

test("hero section is present", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hero-section")).toBeVisible({ timeout: 12000 });
});

test("landing poster rows link to film pages", async ({ page }) => {
  await page.goto("/");
  const rows = page.getByTestId("landing-rows");
  await expect(rows).toBeAttached({ timeout: 15000 });

  const links = rows.locator('a[href^="/movies/"]');
  await expect(links.first()).toBeAttached({ timeout: 15000 });
  expect(await links.count()).toBeGreaterThanOrEqual(6);
});

test("numbers section shows three counts", async ({ page }) => {
  await page.goto("/");
  const section = page.getByTestId("numbers-section");
  await expect(section).toBeAttached({ timeout: 12000 });
  await expect(section.getByTestId("count-up")).toHaveCount(3);
});

test("CTA links to browse and login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("cta-browse")).toHaveAttribute("href", "/browse", { timeout: 12000 });
  await expect(page.getByTestId("cta-signin")).toHaveAttribute("href", "/login");
});
