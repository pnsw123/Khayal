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

// Mock the supabase-browser module so tests don't need real Supabase credentials
const mockRpc = vi.fn();
vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: () => ({ rpc: mockRpc }),
}));

describe("searchAll", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array without calling API for empty string", async () => {
    const result = await searchAll("");
    expect(result).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns empty array without calling API for single character", async () => {
    const result = await searchAll("b");
    expect(result).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("calls search_all RPC for valid query", async () => {
    mockRpc.mockResolvedValue({ data: [makeResult()], error: null });
    await searchAll("batman");
    expect(mockRpc).toHaveBeenCalledOnce();
    expect(mockRpc).toHaveBeenCalledWith("search_all", {
      query_text: "batman",
      page_size: 30,
    });
  });

  it("sends correct body params including page_size", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman");
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[0]).toBe("search_all");
    expect(call[1].query_text).toBe("batman");
    expect(call[1].page_size).toBe(30);
  });

  it("passes type filter by client-side filtering", async () => {
    const movie = makeResult({ id: 1, type: "movie", title: "Batman" });
    const tv = makeResult({ id: 2, type: "tv", title: "Batman TV", slug: "batman-tv" });
    mockRpc.mockResolvedValue({ data: [movie, tv], error: null });
    const results = await searchAll("batman", { type: "movie" });
    expect(results.every((r) => r.type === "movie")).toBe(true);
    expect(results.length).toBe(1);
  });

  it("sorts movies before TV when type unspecified", async () => {
    const tv = makeResult({ id: 1, type: "tv", title: "Batman TV", slug: "batman-tv", relevance: 0.9 });
    const movie = makeResult({ id: 2, type: "movie", title: "Batman Film", slug: "batman-film", relevance: 0.5 });
    mockRpc.mockResolvedValue({ data: [tv, movie], error: null });
    const results = await searchAll("batman");
    expect(results[0].type).toBe("movie");
    expect(results[1].type).toBe("tv");
  });

  it("sorts exact title match first", async () => {
    const partial = makeResult({ id: 1, title: "Batman Returns", slug: "batman-returns", relevance: 0.9 });
    const exact = makeResult({ id: 2, title: "batman", slug: "batman-2022", relevance: 0.5 });
    mockRpc.mockResolvedValue({ data: [partial, exact], error: null });
    const results = await searchAll("batman");
    expect(results[0].title).toBe("batman");
  });

  it("handles empty results gracefully", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const results = await searchAll("xyzzy");
    expect(results).toEqual([]);
  });

  it("returns empty array on RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC failed" } });
    const results = await searchAll("batman");
    expect(results).toEqual([]);
  });

  it("filters by year decade", async () => {
    const old = makeResult({ id: 1, release_year: 1989, slug: "batman-89" });
    const modern = makeResult({ id: 2, release_year: 2022, slug: "batman-22" });
    mockRpc.mockResolvedValue({ data: [old, modern], error: null });
    const results = await searchAll("batman", { year: "2020s" });
    expect(results.length).toBe(1);
    expect(results[0].release_year).toBe(2022);
  });

  it("filters by genre", async () => {
    const action = makeResult({ id: 1, genre_names: ["Action"], slug: "batman-action" });
    const comedy = makeResult({ id: 2, genre_names: ["Comedy"], slug: "batman-comedy" });
    mockRpc.mockResolvedValue({ data: [action, comedy], error: null });
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
