import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Nav is an async server component — we test source-level contracts
// (structure, imports, expected patterns) rather than rendering it,
// because rendering async server components requires a full Next.js runtime.

const navSource = readFileSync(
  resolve(__dirname, "../components/nav.tsx"),
  "utf-8"
);

describe("Nav component source", () => {
  it("imports NavLink", () => {
    expect(navSource).toContain("NavLink");
  });

  it("imports ProfileStub and TicketEnter from nav-controls", () => {
    expect(navSource).toContain("TicketEnter");
    expect(navSource).toContain("ProfileStub");
  });

  it("uses max-w-[1600px] container width", () => {
    expect(navSource).toContain("max-w-[1600px]");
  });

  it("has a /browse link", () => {
    expect(navSource).toContain('"/browse"');
  });

  it("has a /search link", () => {
    expect(navSource).toContain('"/search"');
  });

  it("exports Nav function", () => {
    expect(navSource).toContain("export async function Nav");
  });

  it("calls currentUser from auth lib", () => {
    expect(navSource).toContain("currentUser");
  });

  it("calls currentProfile from auth lib", () => {
    expect(navSource).toContain("currentProfile");
  });

  it("links homepage via href=/", () => {
    expect(navSource).toContain('href="/"');
  });

  it("shows KHAYAL wordmark", () => {
    expect(navSource).toContain("KHAYAL");
  });
});
