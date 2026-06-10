import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Source-level checks — motion/react-client not available in jsdom
const src = readFileSync(
  resolve(__dirname, "../components/landing/scroll-reveal.tsx"),
  "utf-8"
);

describe("ScrollReveal source contract", () => {
  it("exports ScrollReveal", () => {
    expect(src).toContain("export function ScrollReveal");
  });

  it("uses motion/react-client for SSR-safe import", () => {
    expect(src).toContain("motion/react-client");
  });

  it("defines offscreen variant with y offset", () => {
    expect(src).toContain("offscreen");
    expect(src).toContain("y:");
  });

  it("defines onscreen variant", () => {
    expect(src).toContain("onscreen");
  });

  it("uses viewport once:true to avoid re-firing on scroll-up", () => {
    expect(src).toContain("once: true");
  });

  it("accepts children prop", () => {
    expect(src).toContain("children");
  });

  it("accepts optional className prop", () => {
    expect(src).toContain("className");
  });

  it("uses spring transition", () => {
    expect(src).toContain("spring");
  });
});
