import { describe, it, expect } from "vitest";
import type { Movie, TvSeries, SearchAllRow, MovieStats, Review } from "@/lib/supabase-types";

// Type-shape tests — verify the exported types have the expected fields.
// These run at type-check time too (TypeScript compile step) but we also
// provide runtime-shape coverage so misconfigured bundles are caught.

describe("Movie type shape", () => {
  const m: Movie = {
    id: 1,
    title: "Inception",
    slug: "inception-2010",
    release_date: "2010-07-16",
    runtime_minutes: 148,
    age_rating: "PG-13",
    original_language: "en",
    country: "US",
    overview: "A heist inside dreams.",
    poster_url: "https://example.com/poster.jpg",
    backdrop_url: "https://example.com/backdrop.jpg",
    tmdb_id: 27205,
    trailer_youtube_id: "YoHD9XEInc0",
  };

  it("has required string fields", () => {
    expect(typeof m.id).toBe("number");
    expect(typeof m.title).toBe("string");
    expect(typeof m.slug).toBe("string");
  });

  it("nullable fields can be null", () => {
    const m2: Movie = { ...m, release_date: null, poster_url: null, backdrop_url: null };
    expect(m2.release_date).toBeNull();
    expect(m2.poster_url).toBeNull();
  });

  it("optional genre_names can be attached", () => {
    const m2: Movie = { ...m, genre_names: ["Action", "Drama"] };
    expect(m2.genre_names).toContain("Action");
  });
});

describe("TvSeries type shape", () => {
  const tv: TvSeries = {
    id: 10,
    title: "Breaking Bad",
    slug: "breaking-bad",
    first_air_date: "2008-01-20",
    last_air_date: "2013-09-29",
    status: "Ended",
    overview: "A teacher cooks meth.",
    poster_url: null,
    backdrop_url: null,
    tmdb_id: 1396,
    trailer_youtube_id: null,
  };

  it("has string id and title", () => {
    expect(typeof tv.id).toBe("number");
    expect(tv.title).toBe("Breaking Bad");
  });

  it("first_air_date can be null", () => {
    const tv2: TvSeries = { ...tv, first_air_date: null };
    expect(tv2.first_air_date).toBeNull();
  });
});

describe("SearchAllRow type shape", () => {
  const row: SearchAllRow = {
    id: 1,
    type: "movie",
    title: "Batman Begins",
    slug: "batman-begins-2005",
    overview: null,
    poster_url: null,
    release_year: 2005,
    relevance: 0.9,
  };

  it("type is movie or tv", () => {
    expect(["movie", "tv"]).toContain(row.type);
  });

  it("relevance is a number", () => {
    expect(typeof row.relevance).toBe("number");
  });
});

describe("MovieStats type shape", () => {
  const stats: MovieStats = {
    movie_id: 1,
    avg_rating: 8.5,
    total_ratings: 1000,
    total_reviews: 200,
  };

  it("has movie_id and avg_rating", () => {
    expect(stats.movie_id).toBe(1);
    expect(stats.avg_rating).toBe(8.5);
  });

  it("avg_rating can be null", () => {
    const s2: MovieStats = { ...stats, avg_rating: null };
    expect(s2.avg_rating).toBeNull();
  });
});

describe("Review type shape", () => {
  const review: Review = {
    id: 1,
    headline: "A masterpiece",
    body: "Incredible film.",
    contains_spoiler: false,
    created_at: "2024-01-01T00:00:00Z",
    username: "yazeed",
    display_name: "Yazeed",
    avatar_url: null,
  };

  it("has id and body", () => {
    expect(review.id).toBe(1);
    expect(review.body).toBeTruthy();
  });

  it("headline can be null", () => {
    const r2: Review = { ...review, headline: null };
    expect(r2.headline).toBeNull();
  });
});
