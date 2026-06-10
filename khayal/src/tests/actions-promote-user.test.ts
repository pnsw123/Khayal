/**
 * Tests for promoteUser server action (issue #201).
 * Verifies: admin-only access, self-promotion blocked, correct update issued,
 * error propagation from Supabase, unauthenticated rejection.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase-server
const mockFrom = vi.fn();
const mockAuth = { getUser: vi.fn() };
const mockSb = { from: mockFrom, auth: mockAuth };
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: () => Promise.resolve(mockSb),
}));

import { promoteUser } from "@/app/admin/users/actions";

function makeSelectChain(returnValue: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(returnValue),
  };
  return chain;
}

function makeUpdateChain(returnValue: unknown) {
  const eqFn = vi.fn().mockResolvedValue(returnValue);
  const chain = {
    update: vi.fn().mockReturnValue({ eq: eqFn }),
    _eqFn: eqFn,
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("promoteUser server action (issue #201)", () => {
  it("returns error when userId is empty string", async () => {
    const result = await promoteUser("");
    expect(result).toEqual({ success: false, error: "userId is required." });
  });

  it("returns not-authenticated error when no user session", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await promoteUser("target-user");
    expect(result).toEqual({ success: false, error: "Not authenticated." });
  });

  it("returns admin-required error when caller role is 'user'", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "caller-1" } } });
    const profileChain = makeSelectChain({ data: { role: "user" } });
    mockFrom.mockReturnValueOnce(profileChain);
    const result = await promoteUser("target-user");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns admin-required error when caller profile is null", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "caller-1" } } });
    const profileChain = makeSelectChain({ data: null });
    mockFrom.mockReturnValueOnce(profileChain);
    const result = await promoteUser("target-user");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("blocks self-promotion — returns error when userId === caller.id", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    const profileChain = makeSelectChain({ data: { role: "admin" } });
    mockFrom.mockReturnValueOnce(profileChain);
    const result = await promoteUser("admin-1");
    expect(result).toEqual({ success: false, error: "Cannot promote yourself." });
  });

  it("promotes target user when caller is admin and target is different user", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    const profileChain = makeSelectChain({ data: { role: "admin" } });
    const updateChain = makeUpdateChain({ error: null });
    mockFrom
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(updateChain);
    const result = await promoteUser("target-user-99");
    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(updateChain._eqFn).toHaveBeenCalledWith("id", "target-user-99");
  });

  it("passes { role: 'admin' } to update call", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    const profileChain = makeSelectChain({ data: { role: "admin" } });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce({ update: updateFn });
    await promoteUser("target-user-99");
    expect(updateFn).toHaveBeenCalledWith({ role: "admin" });
  });

  it("returns error when Supabase update fails", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    const profileChain = makeSelectChain({ data: { role: "admin" } });
    const updateChain = makeUpdateChain({ error: { message: "RLS blocked update" } });
    mockFrom
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(updateChain);
    const result = await promoteUser("target-user-99");
    expect(result).toEqual({ success: false, error: "RLS blocked update" });
  });
});
