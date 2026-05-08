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

test("nav search input triggers fetch after 2+ characters", async ({ page }) => {
  const fetchCalls: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("search_all")) fetchCalls.push(req.url());
  });

  await page.goto("/browse");
  const navInput = page.getByRole("textbox").first();
  await navInput.fill("ba");
  await page.waitForTimeout(400);
  expect(fetchCalls.length).toBeGreaterThan(0);
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
