import { describe, it, expect, vi, beforeEach } from "vitest";

// auth.ts uses supabase-server which requires next/headers (server-only).
// We test the module's observable behaviour by mocking its dependency.

const mockGetUser = vi.fn();
const _mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  })),
}));

import { currentUser, currentProfile } from "@/lib/auth";

const FAKE_USER = { id: "user-123", email: "test@example.com" };
const FAKE_PROFILE = { id: "user-123", username: "testuser", display_name: "Test", avatar_url: null, bio: null };

describe("currentUser", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  it("returns user when authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    const user = await currentUser();
    expect(user).toEqual(FAKE_USER);
  });

  it("returns null when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const user = await currentUser();
    expect(user).toBeNull();
  });
});

describe("currentProfile", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockMaybeSingle.mockReset();
  });

  it("returns null when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const profile = await currentProfile();
    expect(profile).toBeNull();
  });

  it("returns profile data when user is authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    mockMaybeSingle.mockResolvedValue({ data: FAKE_PROFILE });
    const profile = await currentProfile();
    expect(profile).toEqual(FAKE_PROFILE);
  });

  it("returns null when profile row does not exist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    mockMaybeSingle.mockResolvedValue({ data: null });
    const profile = await currentProfile();
    expect(profile).toBeNull();
  });
});
