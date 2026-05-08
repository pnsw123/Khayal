import { test, expect } from "@playwright/test";

test("/search?q=batman loads without JS errors @smoke", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/search?q=batman");
  await page.waitForLoadState("networkidle");
  expect(errors).toHaveLength(0);
});

test("search input is present on the search page", async ({ page }) => {
  await page.goto("/search");
  const input = page.getByTestId("search-input");
  await expect(input).toBeVisible({ timeout: 8000 });
});

test("facet filters are rendered on the search page", async ({ page }) => {
  await page.goto("/search");
  await expect(page.getByTestId("filter-type")).toBeVisible({ timeout: 8000 });
  await expect(page.getByTestId("filter-year")).toBeVisible({ timeout: 8000 });
});

test("nav search link navigates to /search page", async ({ page }) => {
  // The nav uses a SearchMarquee link (not an inline input) that navigates to /search
  await page.goto("/browse");
  await page.waitForLoadState("networkidle");

  // Click the nav search link
  const searchLink = page.locator('a[href="/search"]').first();
  await expect(searchLink).toBeVisible({ timeout: 10000 });
  await searchLink.click();

  // Should land on search page
  await expect(page).toHaveURL(/\/search/);
});

test("typing in search page input updates URL query param", async ({ page }) => {
  await page.goto("/search");
  const input = page.getByTestId("search-input");
  await input.fill("inception");
  await page.waitForTimeout(400);
  await expect(page).toHaveURL(/q=inception/);
});

test("type filter chip updates URL param", async ({ page }) => {
  await page.goto("/search?q=batman");
  await page.getByTestId("filter-type").getByRole("button", { name: "Films" }).click();
  await expect(page).toHaveURL(/type=movie/);
});
