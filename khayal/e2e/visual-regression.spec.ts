/**
 * Gate 13 — Visual Regression Snapshots
 *
 * Covers:
 *  1. Hero section on landing page
 *  2. Browse grid — 4-column layout, poster aspect ratios
 *  3. Movie-card hover state — overlay, rating badge visible
 *
 * Run:
 *   npx playwright test visual-regression          # compare against baseline
 *   npx playwright test visual-regression --update-snapshots  # update baseline
 *
 * Snapshots stored in: e2e/__snapshots__/
 */
import { test, expect } from "@playwright/test";

// Stable viewport for all visual tests
const VIEWPORT = { width: 1280, height: 900 };

// Pixel diff threshold (2% tolerance for anti-aliasing, font rendering differences)
const SNAPSHOT_OPTIONS = { maxDiffPixelRatio: 0.02 };

test.describe("Visual regression @visual", () => {
  test.use({ viewport: VIEWPORT });

  test("hero section — landing page baseline", async ({ page }) => {
    // Disable animations to get stable snapshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });

    await page.goto("/");
    const hero = page.locator('[data-testid="hero-section"]');
    await expect(hero).toBeVisible({ timeout: 15000 });

    // Wait for motion animations to settle
    await page.waitForTimeout(300);

    // Hide WebGL/canvas elements — they render non-deterministically per frame.
    // Layout and typography are what this test actually checks.
    await page.evaluate(() => {
      document.querySelectorAll("canvas").forEach((c) => {
        (c as HTMLElement).style.visibility = "hidden";
      });
    });

    // Clip to hero section only — avoids dynamic content below the fold
    const heroBox = await hero.boundingBox();
    expect(heroBox).not.toBeNull();

    await expect(page).toHaveScreenshot("hero-section.png", {
      ...SNAPSHOT_OPTIONS,
      clip: {
        x: heroBox!.x,
        y: heroBox!.y,
        width: heroBox!.width,
        // Capture top 600px of hero — avoids scroll indicator animation noise
        height: Math.min(heroBox!.height, 600),
      },
    });
  });

  test("browse grid — 4-column layout and poster aspect ratios", async ({ page }) => {
    // Disable animations
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });

    // Use sort=popular to get a consistent, populated grid
    await page.goto("/browse?sort=popular");
    await expect(page.locator('[data-testid="browse-page"]')).toBeVisible({ timeout: 12000 });

    // Wait for at least 4 movie cards to appear
    const cards = page.locator('[data-testid="movie-card"]');
    await expect(cards.nth(3)).toBeVisible({ timeout: 12000 });

    // Capture just the grid area — first 2 rows worth
    const firstCard = cards.first();
    const firstCardBox = await firstCard.boundingBox();
    expect(firstCardBox).not.toBeNull();

    // Snapshot the grid container — captures 4-column layout + aspect ratios
    const gridContainer = page.locator('[data-testid="filtered-grid"], [data-testid="top-rated-shelf"]').first();
    const gridBox = await gridContainer.boundingBox();

    if (gridBox) {
      await expect(page).toHaveScreenshot("browse-grid.png", {
        ...SNAPSHOT_OPTIONS,
        clip: {
          x: gridBox.x,
          y: gridBox.y,
          width: gridBox.width,
          // Capture first ~400px — enough for 2 rows of posters
          height: Math.min(gridBox.height, 400),
        },
      });
    } else {
      // Fallback: snapshot viewport area around cards
      await expect(page).toHaveScreenshot("browse-grid.png", {
        ...SNAPSHOT_OPTIONS,
        clip: {
          x: 0,
          y: firstCardBox!.y - 20,
          width: VIEWPORT.width,
          height: Math.min(400, VIEWPORT.height - firstCardBox!.y + 20),
        },
      });
    }
  });

  test("movie-card hover state — overlay and rating badge visible", async ({ page }) => {
    // Disable CSS transitions except for the hover state we're testing
    // (we'll trigger hover manually and wait for it to apply)
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0.01s !important;
          transition-delay: 0s !important;
        }
      `,
    });

    await page.goto("/browse?sort=popular");
    await expect(page.locator('[data-testid="browse-page"]')).toBeVisible({ timeout: 12000 });

    const cards = page.locator('[data-testid="movie-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 12000 });

    // Pick first card with a rating badge for a richer snapshot
    // Try to find a card that has a star rating badge
    const cardWithRating = page.locator('[data-testid="movie-card"]:has(.fill-\\[var\\(--saffron\\)\\])').first();
    const targetCard = (await cardWithRating.count()) > 0 ? cardWithRating : cards.first();

    const cardBox = await targetCard.boundingBox();
    expect(cardBox).not.toBeNull();

    // Hover the card to trigger overlay + hover effects
    await targetCard.hover();
    // Short wait for CSS transitions (0.01s) to complete
    await page.waitForTimeout(100);

    await expect(page).toHaveScreenshot("movie-card-hover.png", {
      ...SNAPSHOT_OPTIONS,
      clip: {
        x: cardBox!.x - 4,
        y: cardBox!.y - 4,
        width: cardBox!.width + 8,
        height: cardBox!.height + 8,
      },
    });
  });

  test("movie-card default state — poster and metadata below", async ({ page }) => {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });

    await page.goto("/browse?sort=popular");
    await expect(page.locator('[data-testid="browse-page"]')).toBeVisible({ timeout: 12000 });

    const card = page.locator('[data-testid="movie-card"]').first();
    await expect(card).toBeVisible({ timeout: 12000 });

    // Move mouse away from card to ensure no hover state
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);

    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();

    await expect(page).toHaveScreenshot("movie-card-default.png", {
      ...SNAPSHOT_OPTIONS,
      clip: {
        x: cardBox!.x - 4,
        y: cardBox!.y - 4,
        width: cardBox!.width + 8,
        height: cardBox!.height + 8,
      },
    });
  });
});
