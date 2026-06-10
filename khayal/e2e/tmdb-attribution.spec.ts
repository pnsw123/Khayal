import { test, expect } from "@playwright/test";

test("TMDB attribution text visible in footer @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 12000 });

  const attributionText = page.getByTestId("tmdb-attribution-text");
  await expect(attributionText).toBeVisible({ timeout: 8000 });
  await expect(attributionText).toContainText(
    "This product uses the TMDB API but is not endorsed or certified by TMDB"
  );
});

test("TMDB logo present in footer @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 12000 });

  const logo = page.getByAltText("TMDB logo");
  await expect(logo).toBeAttached({ timeout: 8000 });
});

test("TMDB attribution link points to themoviedb.org @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 12000 });

  const link = page.getByTestId("tmdb-attribution-link");
  await expect(link).toBeAttached({ timeout: 8000 });
  await expect(link).toHaveAttribute("href", "https://www.themoviedb.org");
});
