import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: vi.fn(() =>
    Promise.resolve({ from: mockFrom })
  ),
}));

function makeChain(result: { data: unknown[] | null }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "not", "gte", "lte", "gt", "lt", "order", "limit", "eq", "contains"];
  methods.forEach((m) => { chain[m] = vi.fn(() => chain); });
  (chain as unknown as Promise<unknown>) ;
  chain.then = undefined;
  Object.defineProperty(chain, Symbol.iterator, { value: undefined });
  chain.limit = vi.fn(() => Promise.resolve(result));
  return chain;
}

const MOCK_MOVIES = [
  { id: 1, title: "Inception", slug: "inception-2010", release_date: "2025-04-01", poster_url: "/p1.jpg", runtime_minutes: 148, age_rating: "PG-13", original_language: "en" },
  { id: 2, title: "Parasite",  slug: "parasite-2019",  release_date: "2025-03-15", poster_url: "/p2.jpg", runtime_minutes: 132, age_rating: "R",     original_language: "ko" },
];

describe("getTrending", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("returns array of movies from the movies_with_genres table", async () => {
    const chain = makeChain({ data: MOCK_MOVIES });
    mockFrom.mockReturnValue(chain);

    const { getTrending } = await import("@/lib/shelves");
    const result = await getTrending();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith("movies_with_genres");
  });

  it("returns empty array when query returns null data", async () => {
    const chain = makeChain({ data: null });
    mockFrom.mockReturnValue(chain);

    const { getTrending } = await import("@/lib/shelves");
    const result = await getTrending();

    expect(result).toEqual([]);
  });

  it("calls select with correct fields", async () => {
    const chain = makeChain({ data: [] });
    mockFrom.mockReturnValue(chain);

    const { getTrending } = await import("@/lib/shelves");
    await getTrending();

    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining("id"));
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining("title"));
  });
});

describe("getNowPlaying", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    vi.resetModules();
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("returns array of movies", async () => {
    const chain = makeChain({ data: MOCK_MOVIES });
    mockFrom.mockReturnValue(chain);

    const { getNowPlaying } = await import("@/lib/shelves");
    const result = await getNowPlaying();

    expect(Array.isArray(result)).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("movies_with_genres");
  });

  it("filters with gte for 60 days ago date", async () => {
    const chain = makeChain({ data: [] });
    mockFrom.mockReturnValue(chain);

    const { getNowPlaying } = await import("@/lib/shelves");
    await getNowPlaying();

    expect(chain.gte).toHaveBeenCalledWith("release_date", expect.any(String));
  });

  it("filters with lte for today's date", async () => {
    const chain = makeChain({ data: [] });
    mockFrom.mockReturnValue(chain);

    const { getNowPlaying } = await import("@/lib/shelves");
    await getNowPlaying();

    expect(chain.lte).toHaveBeenCalledWith("release_date", expect.any(String));
  });

  it("returns empty array gracefully when query returns nothing", async () => {
    const chain = makeChain({ data: null });
    mockFrom.mockReturnValue(chain);

    const { getNowPlaying } = await import("@/lib/shelves");
    const result = await getNowPlaying();

    expect(result).toEqual([]);
  });
});

describe("getUpcoming", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    vi.resetModules();
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("returns array of future movies", async () => {
    const chain = makeChain({ data: MOCK_MOVIES });
    mockFrom.mockReturnValue(chain);

    const { getUpcoming } = await import("@/lib/shelves");
    const result = await getUpcoming();

    expect(Array.isArray(result)).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("movies_with_genres");
  });

  it("filters with gt for release_date after today", async () => {
    const chain = makeChain({ data: [] });
    mockFrom.mockReturnValue(chain);

    const { getUpcoming } = await import("@/lib/shelves");
    await getUpcoming();

    expect(chain.gt).toHaveBeenCalledWith("release_date", expect.any(String));
  });

  it("filters with lte for 90 days ahead", async () => {
    const chain = makeChain({ data: [] });
    mockFrom.mockReturnValue(chain);

    const { getUpcoming } = await import("@/lib/shelves");
    await getUpcoming();

    expect(chain.lte).toHaveBeenCalledWith("release_date", expect.any(String));
  });

  it("returns empty array gracefully when query returns nothing", async () => {
    const chain = makeChain({ data: null });
    mockFrom.mockReturnValue(chain);

    const { getUpcoming } = await import("@/lib/shelves");
    const result = await getUpcoming();

    expect(result).toEqual([]);
  });
});
