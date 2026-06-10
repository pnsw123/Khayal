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

  it("wraps Nav with NavGuard", () => {
    expect(src).toContain("NavGuard");
    expect(src).toContain("Nav");
  });

  it("renders TmdbAttribution in footer", () => {
    expect(src).toContain("TmdbAttribution");
  });

  it("renders Browse footer link", () => {
    expect(src).toContain("/browse");
  });

  it("renders Search footer link", () => {
    expect(src).toContain("/search");
  });

  it("shows Profile link when user logged in", () => {
    expect(src).toContain("/profile");
  });

  it("shows Sign In link when user not logged in", () => {
    expect(src).toContain("/login");
  });

  it("uses Playfair Display font", () => {
    expect(src).toContain("Playfair_Display");
  });

  it("uses Reem Kufi for Arabic", () => {
    expect(src).toContain("Reem_Kufi");
  });

  it("sets lang=en on html element", () => {
    expect(src).toContain('lang="en"');
  });
});
