import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => ({ getAll: () => [], setAll: () => {} }),
}));

const mockGetUser = vi.fn();

// Build a thennable query chain that resolves to { data, error }
function makeChain(resolveValue: { data: unknown; error: null }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit", "in", "not"];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  // Make it awaitable
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolveValue).then(resolve);
  chain.catch = (reject: (v: unknown) => unknown) => Promise.resolve(resolveValue).catch(reject);
  return chain;
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

import { GET } from "@/app/api/recommendations/route";

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/recommendations");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

const MOCK_MOVIES = [
  { id: 1, title: "Inception", slug: "inception-2010", release_date: "2010-07-16",
    poster_url: null, runtime_minutes: 148, age_rating: "PG-13", original_language: "en" },
  { id: 2, title: "Dune", slug: "dune-2021", release_date: "2021-10-22",
    poster_url: null, runtime_minutes: 155, age_rating: "PG-13", original_language: "en" },
];

describe("GET /api/recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns movies array when session exists and recommendations found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const recRows = [
      { movie_id: 1, score: 9.1, algo: "surprise-svd", generated_at: "2026-05-07T00:00:00Z" },
      { movie_id: 2, score: 8.5, algo: "surprise-svd", generated_at: "2026-05-07T00:00:00Z" },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: recRows, error: null });
      return makeChain({ data: MOCK_MOVIES, error: null });
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.movies)).toBe(true);
    expect(body.movies.length).toBeGreaterThan(0);
  });

  it("algo field in response matches what is in the DB", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const recRows = [
      { movie_id: 1, score: 9.1, algo: "surprise-svd", generated_at: "2026-05-07T00:00:00Z" },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: recRows, error: null });
      return makeChain({ data: [MOCK_MOVIES[0]], error: null });
    });

    const res = await GET(makeRequest({ algo: "surprise-svd" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.algo).toBe("surprise-svd");
  });

  it("non-numeric limit param falls back to DEFAULT_LIMIT (no NaN passed to Supabase)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const recRows = [
      { movie_id: 1, score: 9.1, algo: "surprise-svd", generated_at: "2026-05-07T00:00:00Z" },
    ];

    let callCount = 0;
    let capturedLimit: unknown;
    mockFrom.mockImplementation(() => {
      callCount++;
      const chain = makeChain({ data: callCount === 1 ? recRows : [MOCK_MOVIES[0]], error: null });
      const origLimit = (chain as Record<string, unknown>).limit as (...args: unknown[]) => unknown;
      (chain as Record<string, unknown>).limit = vi.fn((...args: unknown[]) => {
        if (callCount === 1) capturedLimit = args[0];
        return origLimit(...args);
      });
      return chain;
    });

    await GET(makeRequest({ limit: "abc" }));
    // limit passed to Supabase must be a finite number (DEFAULT_LIMIT = 12), not NaN
    expect(Number.isFinite(capturedLimit as number)).toBe(true);
    expect(capturedLimit).toBe(12);
  });

  it("limit param capped at 100 to prevent over-fetching", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    let callCount = 0;
    let capturedLimit: unknown;
    mockFrom.mockImplementation(() => {
      callCount++;
      const chain = makeChain({ data: [], error: null });
      const origLimit = (chain as Record<string, unknown>).limit as (...args: unknown[]) => unknown;
      (chain as Record<string, unknown>).limit = vi.fn((...args: unknown[]) => {
        if (callCount === 1) capturedLimit = args[0];
        return origLimit(...args);
      });
      return chain;
    });

    await GET(makeRequest({ limit: "9999" }));
    expect(capturedLimit).toBe(100);
  });

  it("fallback triggered when recommendations table is empty for user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-2" } } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: [], error: null }); // no recs
      if (callCount === 2) return makeChain({ data: [], error: null }); // no rated
      if (callCount === 3) return makeChain({ data: [{ movie_id: 1, avg_rating: 9 }, { movie_id: 2, avg_rating: 8 }], error: null }); // stats
      return makeChain({ data: MOCK_MOVIES, error: null }); // fallback movies
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.algo).toBe("fallback");
    expect(Array.isArray(body.movies)).toBe(true);
  });

  it("fallback excludes seen movies via Set (O(1) lookup)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-3" } } });

    // movie_id 1 already seen — must not appear in fallback
    const seenMovieId = 1;

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: [], error: null }); // no recs
      if (callCount === 2) return makeChain({ data: [{ movie_id: seenMovieId }], error: null }); // rated
      if (callCount === 3)
        return makeChain({
          data: [
            { movie_id: seenMovieId, avg_rating: 9.5 }, // seen — must be excluded
            { movie_id: 2, avg_rating: 8.0 },
          ],
          error: null,
        }); // stats
      return makeChain({ data: [MOCK_MOVIES[1]], error: null }); // only unseen movie fetched
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.algo).toBe("fallback");
    const returnedIds: number[] = (body.movies as Array<{ id: number }>).map((m) => m.id);
    expect(returnedIds).not.toContain(seenMovieId);
  });

  it("fallback returns empty array when all top-rated movies already seen", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-4" } } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: [], error: null }); // no recs
      if (callCount === 2)
        return makeChain({ data: [{ movie_id: 1 }, { movie_id: 2 }], error: null }); // both seen
      if (callCount === 3)
        return makeChain({
          data: [
            { movie_id: 1, avg_rating: 9.5 },
            { movie_id: 2, avg_rating: 8.0 },
          ],
          error: null,
        }); // stats — all seen
      return makeChain({ data: [], error: null });
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.algo).toBe("fallback");
    expect(body.movies).toEqual([]);
  });
});
