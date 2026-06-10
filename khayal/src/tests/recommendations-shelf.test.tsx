import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// RecommendationsShelf is an async server component that calls supabase-server.
// We test source-level contracts via static analysis.

const src = readFileSync(
  resolve(__dirname, "../components/recommendations-shelf.tsx"),
  "utf-8"
);

describe("RecommendationsShelf source", () => {
  it("exports RecommendationsShelf", () => {
    expect(src).toContain("export async function RecommendationsShelf");
  });

  it("exports RecommendationsSkeleton", () => {
    expect(src).toContain("export function RecommendationsSkeleton");
  });

  it("queries recommendations table", () => {
    expect(src).toContain('"recommendations"');
  });

  it("queries movies table for details", () => {
    expect(src).toContain('"movies"');
  });

  it("has testid recommendations-shelf on section", () => {
    expect(src).toContain('data-testid="recommendations-shelf"');
  });

  it("renders MovieCard components", () => {
    expect(src).toContain("MovieCard");
  });

  it("returns null when user is not authenticated", () => {
    expect(src).toContain("if (!user) return null");
  });

  it("returns null when movies list is empty", () => {
    expect(src).toContain("if (movies.length === 0) return null");
  });

  it("shows 'Picked for you' heading", () => {
    expect(src).toContain("Picked for you");
  });

  it("has fallback path using movie_stats for unseen movies", () => {
    expect(src).toContain("movie_stats");
  });

  it("orders recommendations by score descending", () => {
    expect(src).toContain('"score"');
    expect(src).toContain("ascending: false");
  });
});
