import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => ({ getAll: () => [], setAll: () => {} }),
}));

const mockGetUser = vi.fn();

// Build a thennable query chain that resolves to { data, error }
function makeChain(resolveValue: { data: unknown; error: { message: string } | null }) {
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

function makeErrorChain(message: string) {
  return makeChain({ data: null, error: { message } });
}

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
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

// Fallback RPC rows include avg_rating (stripped before returning to client)
const MOCK_FALLBACK_ROWS = [
  { id: 1, title: "Inception", slug: "inception-2010", release_date: "2010-07-16",
    poster_url: null, runtime_minutes: 148, age_rating: "PG-13", original_language: "en",
    avg_rating: 9.0 },
  { id: 2, title: "Dune", slug: "dune-2021", release_date: "2021-10-22",
    poster_url: null, runtime_minutes: 155, age_rating: "PG-13", original_language: "en",
    avg_rating: 8.5 },
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
    // recommendations empty → fallback RPC; just return empty so test completes
    mockRpc.mockResolvedValue({ data: [], error: null });

    await GET(makeRequest({ limit: "9999" }));
    expect(capturedLimit).toBe(100);
  });

  // ── Fallback path (issue #255) — single RPC replaces 3-query sequence ────

  it("fallback triggered when recommendations table is empty — calls get_fallback_recommendations RPC", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-2" } } });

    // recommendations table empty → fallback
    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: MOCK_FALLBACK_ROWS, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.algo).toBe("fallback");
    expect(Array.isArray(body.movies)).toBe(true);
    expect(body.movies.length).toBe(2);

    // Confirm RPC called with correct args
    expect(mockRpc).toHaveBeenCalledWith("get_fallback_recommendations", {
      p_user_id: "user-2",
      p_limit: 12,
    });
  });

  it("fallback passes correct p_limit to RPC", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-2" } } });

    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: [], error: null });

    await GET(makeRequest({ limit: "50" }));

    expect(mockRpc).toHaveBeenCalledWith("get_fallback_recommendations", {
      p_user_id: "user-2",
      p_limit: 50,
    });
  });

  it("fallback response strips avg_rating field from movies", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-2" } } });

    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: MOCK_FALLBACK_ROWS, error: null });

    const res = await GET(makeRequest());
    const body = await res.json();
    for (const movie of body.movies as Record<string, unknown>[]) {
      expect(Object.keys(movie)).not.toContain("avg_rating");
    }
  });

  it("fallback returns empty array when RPC returns no rows", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-4" } } });

    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: [], error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.algo).toBe("fallback");
    expect(body.movies).toEqual([]);
  });

  it("fallback uses only 1 round-trip (no from() calls after recs empty)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-5" } } });

    let fromCallCount = 0;
    mockFrom.mockImplementation(() => {
      fromCallCount++;
      return makeChain({ data: [], error: null }); // recs empty → fallback
    });
    mockRpc.mockResolvedValue({ data: MOCK_FALLBACK_ROWS, error: null });

    await GET(makeRequest());

    // Only 1 from() call (the initial recommendations query), then 1 rpc() call
    expect(fromCallCount).toBe(1);
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  // ── Error-propagation tests (issue #239) ─────────────────────────────────

  it("returns 500 when recommendations query errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-5" } } });
    mockFrom.mockImplementation(() => makeErrorChain("RLS policy violation"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/RLS policy violation/);
  });

  it("returns 500 when movies fetch errors after recommendations found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-6" } } });

    const recRows = [{ movie_id: 1, score: 9.1, source: "cornac-als", created_at: "2026-01-01T00:00:00Z" }];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: recRows, error: null });
      return makeErrorChain("movies table not found");
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/movies table not found/);
  });

  it("returns 500 when fallback RPC errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-7" } } });

    mockFrom.mockImplementation(() => makeChain({ data: [], error: null })); // no recs → fallback
    mockRpc.mockResolvedValue({ data: null, error: { message: "get_fallback_recommendations not found" } });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/get_fallback_recommendations not found/);
  });
});
