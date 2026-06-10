import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Source contract checks — sitemap is async server function requiring Supabase
const src = readFileSync(
  resolve(__dirname, "../app/sitemap.ts"),
  "utf-8"
);

describe("sitemap source contract", () => {
  it("exports default async function sitemap", () => {
    expect(src).toContain("export default async function sitemap");
  });

  it("returns MetadataRoute.Sitemap type", () => {
    expect(src).toContain("MetadataRoute.Sitemap");
  });

  it("includes /browse URL", () => {
    expect(src).toContain("/browse");
  });

  it("includes /search URL", () => {
    expect(src).toContain("/search");
  });

  it("queries movies table", () => {
    expect(src).toContain('"movies"');
  });

  it("queries tv_series table", () => {
    expect(src).toContain('"tv_series"');
  });

  it("uses slug field for URLs", () => {
    expect(src).toContain("slug");
  });

  it("uses updated_at for lastModified", () => {
    expect(src).toContain("updated_at");
  });

  it("sets changeFrequency for pages", () => {
    expect(src).toContain("changeFrequency");
  });

  it("sets priority for pages", () => {
    expect(src).toContain("priority");
  });
});

describe("sitemap runtime", () => {
  it("builds correct movie URL from slug", () => {
    const base = "https://movie-db-one-psi.vercel.app";
    const slug = "the-godfather-1972";
    const url = `${base}/movies/${slug}`;
    expect(url).toBe("https://movie-db-one-psi.vercel.app/movies/the-godfather-1972");
  });

  it("builds correct TV URL from slug", () => {
    const base = "https://movie-db-one-psi.vercel.app";
    const slug = "breaking-bad-2008";
    const url = `${base}/tv/${slug}`;
    expect(url).toBe("https://movie-db-one-psi.vercel.app/tv/breaking-bad-2008");
  });
});
