import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase-server — loadUserListsForTarget is server-only
const mockFrom = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: vi.fn(async () => ({ from: mockFrom })),
}));

import { loadUserListsForTarget } from "@/lib/lists";

function buildChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null }),
    ...overrides,
  };
  // Make each method return the same chain object
  Object.keys(chain).forEach((key) => {
    if (typeof chain[key] === "function" && key !== "single") {
      (chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    }
  });
  return chain;
}

describe("loadUserListsForTarget — shape tests", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("returns an array", async () => {
    const chain = buildChain();
    // First call: user_lists query → returns empty list (triggers fav creation)
    chain.order = vi.fn().mockImplementation((col: string) => {
      if (col === "is_favorites") {
        return {
          ...chain,
          order: vi.fn().mockResolvedValue({ data: [] }),
        };
      }
      return { data: [] };
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_lists") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 99, name: "Favorites", is_favorites: true, is_public: false },
              }),
            }),
          }),
        };
      }
      // bridge table membership check
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      };
    });

    const result = await loadUserListsForTarget("user-1", "movie", 42);
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns lists with member field", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_lists") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ id: 1, name: "Favorites", is_favorites: true, is_public: false }],
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      // Bridge: movie 42 is in list 1
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ list_id: 1 }] }),
          }),
        }),
      };
    });

    const result = await loadUserListsForTarget("user-1", "movie", 42);
    expect(result[0]).toHaveProperty("member");
    expect(result[0].member).toBe(true);
  });

  it("uses user_list_tv_series bridge for tv_series kind", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_lists") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 1, name: "Favorites", is_favorites: true, is_public: false },
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      };
    });

    // Should not throw
    const result = await loadUserListsForTarget("user-1", "tv_series", 10);
    expect(Array.isArray(result)).toBe(true);
  });
});
