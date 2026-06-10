import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/search/route";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock supabase-server so tests run without real DB credentials
// ---------------------------------------------------------------------------
const mockRpc = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: vi.fn().mockResolvedValue({ rpc: mockRpc }),
}));

// server-only guard — must stub before importing route
vi.mock("server-only", () => ({}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(qs: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/search?${qs}`);
}

const makeResult = (overrides: Partial<{
  id: number; type: string; title: string; slug: string;
  overview: string | null; poster_url: string | null; release_year: number | null;
  relevance: number; age_rating: string | null; original_language: string | null;
  runtime_minutes: number | null; genre_names: string[] | null;
}> = {}) => ({
  id: 1, type: "movie", title: "Action Hero", slug: "action-hero-2020",
  overview: "A hero takes action.", poster_url: null, release_year: 2020,
  relevance: 0.9, age_rating: "PG-13", original_language: "en",
  runtime_minutes: 120, genre_names: ["Action"],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/search", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("returns 400 when q param is missing", async () => {
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/at least 2 characters/i);
  });

  it("returns 400 when q param is a single character", async () => {
    const res = await GET(makeRequest("q=a"));
    expect(res.status).toBe(400);
  });

  it("calls search_all RPC with correct defaults", async () => {
    mockRpc.mockResolvedValue({ data: [makeResult()], error: null });
    const res = await GET(makeRequest("q=action"));
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("search_all", {
      query_text:   "action",
      page_size:    20,
      page_offset:  0,
      p_type:       null,
      p_year_start: null,
      p_year_end:   null,
      p_genre:      null,
    });
  });

  it("passes type=movie filter to search_all", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await GET(makeRequest("q=action&type=movie"));
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_type).toBe("movie");
  });

  it("passes type=tv filter to search_all", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await GET(makeRequest("q=action&type=tv"));
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_type).toBe("tv");
  });

  it("ignores invalid type param (not movie|tv)", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await GET(makeRequest("q=action&type=invalid"));
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].p_type).toBeNull();
  });

  it("respects custom page_size up to MAX_PAGE_SIZE", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await GET(makeRequest("q=action&page_size=50"));
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].page_size).toBe(50);
  });

  it("clamps page_size to MAX_PAGE_SIZE (100)", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await GET(makeRequest("q=action&page_size=200"));
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].page_size).toBe(100);
  });

  it("falls back to default page_size=20 for invalid page_size", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await GET(makeRequest("q=action&page_size=abc"));
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].page_size).toBe(20);
  });

  it("calculates page_offset from page number", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await GET(makeRequest("q=action&page=2&page_size=20"));
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].page_offset).toBe(40);
  });

  it("returns results and total in response body", async () => {
    const results = [makeResult({ id: 1 }), makeResult({ id: 2 })];
    mockRpc.mockResolvedValue({ data: results, error: null });
    const res = await GET(makeRequest("q=action&type=movie&page_size=20"));
    expect(res.status).toBe(200);
    const body = await res.json() as { results: unknown[]; total: number };
    expect(body.results).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("returns empty results when RPC returns empty array", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const res = await GET(makeRequest("q=xyzzy"));
    expect(res.status).toBe(200);
    const body = await res.json() as { results: unknown[]; total: number };
    expect(body.results).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("returns 500 when search_all RPC errors", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC failure" } });
    const res = await GET(makeRequest("q=action"));
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/search failed/i);
  });

  it("trims whitespace from query before calling RPC", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await GET(makeRequest("q=+action+"));
    const call = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[1].query_text).toBe("action");
  });
});
