import { test, expect } from "@playwright/test";

test("browse page loads with data-testid @smoke", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/browse");
  await expect(page.locator('[data-testid="browse-page"]')).toBeVisible({ timeout: 10000 });
  expect(errors).toHaveLength(0);
});

test("year filter updates URL when selected", async ({ page }) => {
  await page.goto("/browse");
  await expect(page.locator('[data-testid="browse-page"]')).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: /year/i }).first().click();
  const popover = page.locator('[data-radix-popper-content-wrapper]');
  await expect(popover).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "2010s" }).click();

  await expect(page).toHaveURL(/year=2010s/, { timeout: 8000 });
});

test("genre filter updates URL when selected", async ({ page }) => {
  await page.goto("/browse");
  await expect(page.locator('[data-testid="browse-page"]')).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: /genre/i }).first().click();
  // Wait for the Radix Popover portal content to appear
  const popoverContent = page.locator('[data-radix-popper-content-wrapper]');
  await expect(popoverContent).toBeVisible({ timeout: 5000 });

  // Skip the "All" option (index 0) and pick the first genre
  const firstOption = popoverContent.locator('button').nth(1);
  await expect(firstOption).toBeVisible({ timeout: 3000 });
  const label = await firstOption.textContent();
  await firstOption.click();

  if (label?.trim()) {
    await expect(page).toHaveURL(/genre=/, { timeout: 8000 });
  }
});

test("sort filter updates URL when selected", async ({ page }) => {
  await page.goto("/browse");
  await expect(page.locator('[data-testid="browse-page"]')).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: /sort/i }).first().click();
  await page.getByRole("button", { name: "Most Popular" }).click();

  await expect(page).toHaveURL(/sort=popular/, { timeout: 5000 });
});

test("page shows movie cards after filtering", async ({ page }) => {
  await page.goto("/browse?sort=popular");
  await expect(page.locator('[data-testid="browse-page"]')).toBeVisible({ timeout: 10000 });

  const cards = page.locator("a[href^='/movies/']");
  await expect(cards.first()).toBeVisible({ timeout: 8000 });
});
