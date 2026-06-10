import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SimilarMovie, SimilarTv } from "@/lib/similar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMockSupabase = (rpcResult: { data: unknown; error: unknown }) => ({
  rpc: vi.fn().mockResolvedValue(rpcResult),
});

// We mock the supabase-server module so no real network calls happen.
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: vi.fn(),
}));

async function importSimilar() {
  const mod = await import("@/lib/similar");
  return mod;
}

// ---------------------------------------------------------------------------
// getSimilarMovies
// ---------------------------------------------------------------------------

describe("getSimilarMovies", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns an array of SimilarMovie objects on success", async () => {
    const mockMovie: SimilarMovie = {
      id: 42,
      title: "Blade Runner",
      slug: "blade-runner",
      poster_url: "https://example.com/blade.jpg",
      release_date: "1982-06-25",
      genre_names: ["Sci-Fi", "Thriller"],
    };
    const { supabaseServer } = await import("@/lib/supabase-server");
    vi.mocked(supabaseServer).mockResolvedValue(
      makeMockSupabase({ data: [mockMovie], error: null }) as unknown as Awaited<ReturnType<typeof import("@/lib/supabase-server").supabaseServer>>,
    );

    const { getSimilarMovies } = await importSimilar();
    const result = await getSimilarMovies(1);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Blade Runner");
  });

  it("returns empty array when RPC returns no rows", async () => {
    const { supabaseServer } = await import("@/lib/supabase-server");
    vi.mocked(supabaseServer).mockResolvedValue(
      makeMockSupabase({ data: [], error: null }) as unknown as Awaited<ReturnType<typeof import("@/lib/supabase-server").supabaseServer>>,
    );

    const { getSimilarMovies } = await importSimilar();
    const result = await getSimilarMovies(99);

    expect(result).toEqual([]);
  });

  it("returns empty array and does not throw when Supabase returns an error", async () => {
    const { supabaseServer } = await import("@/lib/supabase-server");
    vi.mocked(supabaseServer).mockResolvedValue(
      makeMockSupabase({ data: null, error: { message: "RPC not found" } }) as unknown as Awaited<ReturnType<typeof import("@/lib/supabase-server").supabaseServer>>,
    );

    const { getSimilarMovies } = await importSimilar();
    const result = await getSimilarMovies(1);

    expect(result).toEqual([]);
  });

  it("returns empty array when RPC returns null data", async () => {
    const { supabaseServer } = await import("@/lib/supabase-server");
    vi.mocked(supabaseServer).mockResolvedValue(
      makeMockSupabase({ data: null, error: null }) as unknown as Awaited<ReturnType<typeof import("@/lib/supabase-server").supabaseServer>>,
    );

    const { getSimilarMovies } = await importSimilar();
    const result = await getSimilarMovies(1);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getSimilarTvSeries
// ---------------------------------------------------------------------------

describe("getSimilarTvSeries", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns an array of SimilarTv objects on success", async () => {
    const mockTv: SimilarTv = {
      id: 7,
      title: "Breaking Bad",
      slug: "breaking-bad",
      poster_url: "https://example.com/bb.jpg",
      first_air_date: "2008-01-20",
      genre_names: ["Crime", "Drama"],
    };
    const { supabaseServer } = await import("@/lib/supabase-server");
    vi.mocked(supabaseServer).mockResolvedValue(
      makeMockSupabase({ data: [mockTv], error: null }) as unknown as Awaited<ReturnType<typeof import("@/lib/supabase-server").supabaseServer>>,
    );

    const { getSimilarTvSeries } = await importSimilar();
    const result = await getSimilarTvSeries(1);

    expect(Array.isArray(result)).toBe(true);
    expect(result[0].slug).toBe("breaking-bad");
  });

  it("returns empty array when RPC returns no rows", async () => {
    const { supabaseServer } = await import("@/lib/supabase-server");
    vi.mocked(supabaseServer).mockResolvedValue(
      makeMockSupabase({ data: [], error: null }) as unknown as Awaited<ReturnType<typeof import("@/lib/supabase-server").supabaseServer>>,
    );

    const { getSimilarTvSeries } = await importSimilar();
    const result = await getSimilarTvSeries(5);

    expect(result).toEqual([]);
  });

  it("returns empty array and does not throw when Supabase returns an error", async () => {
    const { supabaseServer } = await import("@/lib/supabase-server");
    vi.mocked(supabaseServer).mockResolvedValue(
      makeMockSupabase({ data: null, error: { message: "permission denied" } }) as unknown as Awaited<ReturnType<typeof import("@/lib/supabase-server").supabaseServer>>,
    );

    const { getSimilarTvSeries } = await importSimilar();
    const result = await getSimilarTvSeries(1);

    expect(result).toEqual([]);
  });
});
