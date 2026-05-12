import { test, expect } from "@playwright/test";

test("/users/unknownuser shows not-found gracefully", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  const response = await page.goto("/users/unknownuser-that-does-not-exist-xyz");

  expect([404, 200]).toContain(response?.status());

  const body = await page.content();
  const isNotFound =
    body.toLowerCase().includes("not found") ||
    body.toLowerCase().includes("404") ||
    body.toLowerCase().includes("page not found");
  expect(isNotFound).toBe(true);

  expect(errors).toHaveLength(0);
});

test("no JS errors on profile page load @smoke", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/users/unknownuser-that-does-not-exist-xyz");

  expect(errors).toHaveLength(0);
});
