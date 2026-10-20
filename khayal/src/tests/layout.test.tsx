import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Root layout is an async server component that cannot render in jsdom
// (uses next/font, imports globals.css, calls currentUser server action).
// We verify source-level contracts instead.

const src = readFileSync(
  resolve(__dirname, "../app/layout.tsx"),
  "utf-8"
);

describe("RootLayout source contract", () => {
  it("exports metadata object with title", () => {
    expect(src).toContain("export const metadata");
    expect(src).toContain("KHAYAL");
  });

  it("includes Arabic title خيال in metadata", () => {
    expect(src).toContain("خيال");
  });

  it("exports default async RootLayout function", () => {
    expect(src).toContain("export default async function RootLayout");
  });

  it("renders the Nav on every page (landing included)", () => {
    expect(src).toContain("<Nav />");
    expect(src).not.toContain("NavGuard");
  });

  it("renders the SiteFooter component, telling it whether a user is signed in", () => {
    expect(src).toContain('import { SiteFooter } from "@/components/site-footer"');
    expect(src).toContain("<SiteFooter signedIn={!!user} />");
  });

  it("no longer inlines footer markup (links live in SiteFooter and its own test)", () => {
    expect(src).not.toContain("<footer");
  });

  it("uses Geist as the single Latin typeface", () => {
    expect(src).toContain("Geist");
    expect(src).not.toContain("Playfair_Display");
  });

  it("uses Reem Kufi for Arabic", () => {
    expect(src).toContain("Reem_Kufi");
  });

  it("sets lang=en on html element", () => {
    expect(src).toContain('lang="en"');
  });
});
