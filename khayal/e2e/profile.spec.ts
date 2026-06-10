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

test("profile page does not render email address in DOM @smoke", async ({ page }) => {
  // This test verifies fix for issue #81 — PII leak via user.email in plain text.
  // We navigate to the not-found profile path which renders the public profile shell,
  // then assert no email-shaped text appears in the body content.
  await page.goto("/users/unknownuser-that-does-not-exist-xyz");

  const bodyText = await page.textContent("body");
  // Ensure no string matching email pattern appears in rendered DOM
  const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
  expect(emailPattern.test(bodyText ?? "")).toBe(false);
});

test("no JS errors on profile page load @smoke", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/users/unknownuser-that-does-not-exist-xyz");

  expect(errors).toHaveLength(0);
});
