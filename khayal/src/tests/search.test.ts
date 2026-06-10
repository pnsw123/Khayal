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

  it("calls search_all RPC for valid query with server-side filter defaults", async () => {
    mockRpc.mockResolvedValue({ data: [makeResult()], error: null });
    await searchAll("batman");
    expect(mockRpc).toHaveBeenCalledOnce();
    expect(mockRpc).toHaveBeenCalledWith("search_all", {
      query_text:   "batman",
      page_size:    30,
      page_offset:  0,
      p_type:       null,
      p_year_start: null,
      p_year_end:   null,
      p_genre:      null,
    });
  });

  it("sends correct body params including page_size and page_offset defaults", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman");
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[0]).toBe("search_all");
    expect(call[1].query_text).toBe("batman");
    expect(call[1].page_size).toBe(30);
    expect(call[1].page_offset).toBe(0);
  });

  it("passes pageOffset to RPC for pagination", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman", { pageOffset: 30 });
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[0]).toBe("search_all");
    expect(call[1].page_offset).toBe(30);
  });

  it("passes custom pageSize and pageOffset together", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman", { pageSize: 10, pageOffset: 20 });
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].page_size).toBe(10);
    expect(call[1].page_offset).toBe(20);
  });

  it("passes p_type server-side for type filter", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman", { type: "movie" });
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_type).toBe("movie");
  });

  it("passes p_type=null when type filter is empty string", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman", { type: "" });
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_type).toBeNull();
  });

  it("passes p_year_start for 2020s decade filter", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman", { year: "2020s" });
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_year_start).toBe(2020);
    expect(call[1].p_year_end).toBeNull();
  });

  it("passes correct range for 2010s decade filter", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman", { year: "2010s" });
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_year_start).toBe(2010);
    expect(call[1].p_year_end).toBe(2019);
  });

  it("passes correct range for 2000s decade filter", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman", { year: "2000s" });
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_year_start).toBe(2000);
    expect(call[1].p_year_end).toBe(2009);
  });

  it("passes correct range for 1990s decade filter", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman", { year: "1990s" });
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_year_start).toBe(1990);
    expect(call[1].p_year_end).toBe(1999);
  });

  it("passes correct range for older decade filter", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman", { year: "older" });
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_year_start).toBeNull();
    expect(call[1].p_year_end).toBe(1989);
  });

  it("passes p_genre server-side for genre filter", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman", { genre: "Action" });
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_genre).toBe("Action");
  });

  it("passes p_genre=null when genre filter is empty string", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman", { genre: "" });
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_genre).toBeNull();
  });

  it("returns RPC results directly without client-side re-sorting", async () => {
    const tv = makeResult({ id: 1, type: "tv", title: "Batman TV", slug: "batman-tv", relevance: 0.9 });
    const movie = makeResult({ id: 2, type: "movie", title: "Batman Film", slug: "batman-film", relevance: 0.5 });
    // RPC returns tv first (server orders by relevance) — must be preserved
    mockRpc.mockResolvedValue({ data: [tv, movie], error: null });
    const results = await searchAll("batman");
    expect(results[0].type).toBe("tv");
    expect(results[1].type).toBe("movie");
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

  it("passes all filters to RPC simultaneously", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchAll("batman", { type: "movie", year: "2000s", genre: "Action", pageSize: 10, pageOffset: 20 });
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_type).toBe("movie");
    expect(call[1].p_year_start).toBe(2000);
    expect(call[1].p_year_end).toBe(2009);
    expect(call[1].p_genre).toBe("Action");
    expect(call[1].page_size).toBe(10);
    expect(call[1].page_offset).toBe(20);
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
