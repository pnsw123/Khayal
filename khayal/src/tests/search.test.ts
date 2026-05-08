import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchAll, buildSearchHref } from "@/lib/search";

const makeResult = (overrides: Partial<{
  id: number; type: "movie" | "tv"; title: string; slug: string;
  overview: string | null; poster_url: string | null; release_year: number | null;
  relevance: number; age_rating: string | null; original_language: string | null;
  runtime_minutes: number | null; genre_names: string[] | null;
}> = {}) => ({
  id: 1, type: "movie" as const, title: "Batman Begins", slug: "batman-begins",
  overview: null, poster_url: null, release_year: 2005, relevance: 0.8,
  age_rating: "PG-13", original_language: "en", runtime_minutes: 140,
  genre_names: ["Action", "Drama"],
  ...overrides,
});

describe("searchAll", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns empty array without calling API for empty string", async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;
    const result = await searchAll("");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty array without calling API for single character", async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;
    const result = await searchAll("b");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls correct RPC endpoint for valid query", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [makeResult()],
    });
    global.fetch = mockFetch;
    await searchAll("batman");
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://test.supabase.co/rest/v1/rpc/search_all");
  });

  it("sends POST with correct body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    global.fetch = mockFetch;
    await searchAll("batman");
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string);
    expect(body.query_text).toBe("batman");
    expect(body.page_size).toBe(30);
  });

  it("passes type filter by client-side filtering", async () => {
    const movie = makeResult({ id: 1, type: "movie", title: "Batman" });
    const tv = makeResult({ id: 2, type: "tv", title: "Batman TV", slug: "batman-tv" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [movie, tv],
    });
    const results = await searchAll("batman", { type: "movie" });
    expect(results.every((r) => r.type === "movie")).toBe(true);
    expect(results.length).toBe(1);
  });

  it("sorts movies before TV when type unspecified", async () => {
    const tv = makeResult({ id: 1, type: "tv", title: "Batman TV", slug: "batman-tv", relevance: 0.9 });
    const movie = makeResult({ id: 2, type: "movie", title: "Batman Film", slug: "batman-film", relevance: 0.5 });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [tv, movie],
    });
    const results = await searchAll("batman");
    expect(results[0].type).toBe("movie");
    expect(results[1].type).toBe("tv");
  });

  it("sorts exact title match first", async () => {
    const partial = makeResult({ id: 1, title: "Batman Returns", slug: "batman-returns", relevance: 0.9 });
    const exact = makeResult({ id: 2, title: "batman", slug: "batman-2022", relevance: 0.5 });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [partial, exact],
    });
    const results = await searchAll("batman");
    expect(results[0].title).toBe("batman");
  });

  it("handles empty results gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    const results = await searchAll("xyzzy");
    expect(results).toEqual([]);
  });

  it("returns empty array on non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const results = await searchAll("batman");
    expect(results).toEqual([]);
  });

  it("filters by year decade", async () => {
    const old = makeResult({ id: 1, release_year: 1989, slug: "batman-89" });
    const modern = makeResult({ id: 2, release_year: 2022, slug: "batman-22" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [old, modern],
    });
    const results = await searchAll("batman", { year: "2020s" });
    expect(results.length).toBe(1);
    expect(results[0].release_year).toBe(2022);
  });

  it("filters by genre", async () => {
    const action = makeResult({ id: 1, genre_names: ["Action"], slug: "batman-action" });
    const comedy = makeResult({ id: 2, genre_names: ["Comedy"], slug: "batman-comedy" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [action, comedy],
    });
    const results = await searchAll("batman", { genre: "Action" });
    expect(results.length).toBe(1);
    expect(results[0].genre_names).toContain("Action");
  });
});

describe("buildSearchHref", () => {
  it("builds href with new param", () => {
    const sp = new URLSearchParams("q=batman");
    expect(buildSearchHref(sp, "type", "movie")).toBe("/search?q=batman&type=movie");
  });

  it("removes param when value is empty", () => {
    const sp = new URLSearchParams("q=batman&type=movie");
    expect(buildSearchHref(sp, "type", "")).toBe("/search?q=batman");
  });

  it("returns /search when all params cleared", () => {
    const sp = new URLSearchParams("q=batman");
    expect(buildSearchHref(sp, "q", "")).toBe("/search");
  });
});
