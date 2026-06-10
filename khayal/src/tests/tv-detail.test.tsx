import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve } from "path";
import TvDetailLoading from "@/app/tv/[slug]/loading";

// Source contract check for TV page (async server component — not renderable in jsdom)
const tvPageSrc = readFileSync(
  resolve(__dirname, "../app/tv/[slug]/page.tsx"),
  "utf-8"
);

describe("TV detail page source contract", () => {
  it("exports default async function", () => {
    const hasDefault =
      tvPageSrc.includes("export default async function") ||
      tvPageSrc.includes("export default function");
    expect(hasDefault).toBe(true);
  });

  it("queries tv_series table", () => {
    const hasQuery =
      tvPageSrc.includes("tv_series") || tvPageSrc.includes("tv-series");
    expect(hasQuery).toBe(true);
  });

  it("uses slug param for lookup", () => {
    expect(tvPageSrc).toContain("slug");
  });

  it("calls notFound when series missing", () => {
    expect(tvPageSrc).toContain("notFound");
  });
});

describe("TvDetailLoading skeleton", () => {
  it("renders without crashing", () => {
    render(<TvDetailLoading />);
  });

  it("is aria-hidden (decorative skeleton)", () => {
    const { container } = render(<TvDetailLoading />);
    // Top-level div has aria-hidden
    const hidden = container.querySelector('[aria-hidden]');
    expect(hidden).toBeInTheDocument();
  });

  it("renders poster placeholder", () => {
    const { container } = render(<TvDetailLoading />);
    // Poster aspect-ratio div
    const poster = container.querySelector('.aspect-\\[2\\/3\\]');
    expect(poster).toBeInTheDocument();
  });

  it("renders cast row placeholder", () => {
    const { container } = render(<TvDetailLoading />);
    // Should have multiple circle skeletons for cast
    const circles = container.querySelectorAll('.rounded-full');
    expect(circles.length).toBeGreaterThan(0);
  });
});
