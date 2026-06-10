/**
 * Tests for deleteContent server action (issue #207).
 * Verifies admin check + correct table targeting + error propagation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase-server
const mockFrom = vi.fn();
const mockAuth = { getUser: vi.fn() };
const mockSb = { from: mockFrom, auth: mockAuth };
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: () => Promise.resolve(mockSb),
}));

import { deleteContent } from "@/app/admin/content/actions";

function makeFromChain(returnValue: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(returnValue),
    delete: vi.fn().mockReturnThis(),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteContent server action (issue #207)", () => {
  it("returns not-authenticated error when no user", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await deleteContent(1, "movies");
    expect(result).toEqual({ success: false, error: "Not authenticated." });
  });

  it("returns admin-required error when user role is not admin", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const profileChain = makeFromChain({ data: { role: "user" } });
    mockFrom.mockReturnValueOnce(profileChain);
    const result = await deleteContent(1, "movies");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns admin-required error when profile is null", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const profileChain = makeFromChain({ data: null });
    mockFrom.mockReturnValueOnce(profileChain);
    const result = await deleteContent(1, "movies");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("deletes from movies table when type=movies and user is admin", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    const profileChain = makeFromChain({ data: { role: "admin" } });
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteChain = { delete: vi.fn().mockReturnValue({ eq: deleteEq }) };
    mockFrom
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(deleteChain);
    const result = await deleteContent(5, "movies");
    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith("movies");
    expect(deleteEq).toHaveBeenCalledWith("id", 5);
  });

  it("deletes from tv_series table when type=tv", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    const profileChain = makeFromChain({ data: { role: "admin" } });
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteChain = { delete: vi.fn().mockReturnValue({ eq: deleteEq }) };
    mockFrom
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(deleteChain);
    const result = await deleteContent(7, "tv");
    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith("tv_series");
    expect(deleteEq).toHaveBeenCalledWith("id", 7);
  });

  it("returns error when Supabase delete fails", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    const profileChain = makeFromChain({ data: { role: "admin" } });
    const deleteEq = vi.fn().mockResolvedValue({ error: { message: "foreign key violation" } });
    const deleteChain = { delete: vi.fn().mockReturnValue({ eq: deleteEq }) };
    mockFrom
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(deleteChain);
    const result = await deleteContent(1, "movies");
    expect(result).toEqual({ success: false, error: "foreign key violation" });
  });
});
