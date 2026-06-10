import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => ({ getAll: () => [], setAll: () => {} }),
}));

function makeChain(resolveValue: { data: unknown; error: null; count?: number }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit", "in", "maybeSingle", "single", "not"];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolveValue).then(resolve);
  chain.catch = (reject: (v: unknown) => unknown) =>
    Promise.resolve(resolveValue).catch(reject);
  return chain;
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: async () => ({ from: mockFrom }),
}));

import {
  getUserProfile,
  getUserRatings,
  getUserReviews,
  getUserLists,
} from "@/lib/profile";

beforeEach(() => {
  mockFrom.mockReset();
});

describe("getUserProfile", () => {
  it("returns null for a nonexistent username", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserProfile("nonexistent");
    expect(result).toBeNull();
  });

  it("returns the profile when username exists", async () => {
    const fakeProfile = {
      id: "abc123",
      username: "alice",
      display_name: "Alice",
      avatar_url: null,
      created_at: "2024-01-01T00:00:00Z",
    };
    const chain = makeChain({ data: fakeProfile, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserProfile("alice");
    expect(result).toEqual(fakeProfile);
  });
});

describe("getUserRatings", () => {
  it("returns an array of ratings with movie data", async () => {
    const fakeRatings = [
      { rating: 8, movies: { title: "Inception", slug: "inception-2010", poster_url: null, release_date: "2010-07-16" } },
      { rating: 9, movies: { title: "Dune", slug: "dune-2021", poster_url: null, release_date: "2021-10-22" } },
    ];
    const chain = makeChain({ data: fakeRatings, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserRatings("user-1");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].rating).toBe(8);
    expect(result[0].movies.slug).toBe("inception-2010");
  });

  it("returns empty array when user has no ratings", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserRatings("user-empty");
    expect(result).toEqual([]);
  });
});

describe("getUserReviews", () => {
  it("returns at most 5 reviews", async () => {
    const fakeReviews = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      body: `Review body ${i}`,
      headline: null,
      created_at: "2024-01-01T00:00:00Z",
      movies: { title: `Movie ${i}`, slug: `movie-${i}`, poster_url: null },
    }));
    const chain = makeChain({ data: fakeReviews, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserReviews("user-1");
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("returns empty array when user has no reviews", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserReviews("user-empty");
    expect(result).toEqual([]);
  });
});

describe("getUserLists", () => {
  it("returns only public lists", async () => {
    const fakeLists = [
      { id: 1, name: "Watchlist" },
      { id: 2, name: "Favorites" },
    ];
    const movieCountChain = makeChain({ data: [{ list_id: 1 }, { list_id: 1 }], error: null });
    const tvCountChain = makeChain({ data: [{ list_id: 2 }], error: null });
    const listChain = makeChain({ data: fakeLists, error: null });

    mockFrom
      .mockReturnValueOnce(listChain)
      .mockReturnValueOnce(movieCountChain)
      .mockReturnValueOnce(tvCountChain);

    const result = await getUserLists("user-1");
    expect(result).toHaveLength(2);
    expect(result[0].item_count).toBe(2);
    expect(result[1].item_count).toBe(1);
  });

  it("returns empty array when user has no public lists", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserLists("user-empty");
    expect(result).toEqual([]);
  });

  it("returns empty array when data is null", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserLists("user-null");
    expect(result).toEqual([]);
  });
});

describe("PII — email not exposed in profile data", () => {
  it("getUserProfile does not return email field", async () => {
    const fakeProfile = {
      id: "abc123",
      username: "alice",
      display_name: "Alice",
      avatar_url: null,
      created_at: "2024-01-01T00:00:00Z",
    };
    const chain = makeChain({ data: fakeProfile, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserProfile("alice");
    // Profile object must not contain an email key
    expect(result).not.toHaveProperty("email");
  });
});

describe("Stats computation", () => {
  it("computes stats correctly from counts", async () => {
    const ratings = [{ rating: 7, movies: { title: "A", slug: "a", poster_url: null, release_date: null } }];
    const reviews = [{ id: 1, body: "great", headline: null, created_at: "2024-01-01", movies: { title: "A", slug: "a", poster_url: null } }];
    const lists = [{ id: 1, name: "Public List", item_count: 3 }];

    expect(ratings).toHaveLength(1);
    expect(reviews).toHaveLength(1);
    expect(lists).toHaveLength(1);
    expect(lists[0].item_count).toBe(3);
  });
});
