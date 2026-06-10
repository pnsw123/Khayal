/**
 * Tests for auth/callback/route.ts
 * Verifies open redirect fix: ?next= param must be a same-origin relative path.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock supabase-server before importing route
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: vi.fn(),
}));

import { supabaseServer } from "@/lib/supabase-server";
import { GET } from "@/app/auth/callback/route";

const ORIGIN = "https://khayal.app";

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL("/auth/callback", ORIGIN);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

function mockSupabase(error: null | { message: string } = null) {
  (supabaseServer as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error }),
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /auth/callback — next param validation", () => {
  it("redirects to /login when code missing", async () => {
    const req = makeRequest({});
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/login`);
  });

  it("redirects to /browse by default when no next param", async () => {
    mockSupabase();
    const req = makeRequest({ code: "valid-code" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/browse`);
  });

  it("allows safe relative path /admin", async () => {
    mockSupabase();
    const req = makeRequest({ code: "valid-code", next: "/admin" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/admin`);
  });

  it("allows nested relative path /profile/settings", async () => {
    mockSupabase();
    const req = makeRequest({ code: "valid-code", next: "/profile/settings" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/profile/settings`);
  });

  it("blocks protocol-relative redirect //evil.com → falls back to /browse", async () => {
    mockSupabase();
    const req = makeRequest({ code: "valid-code", next: "//evil.com" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toBe(`${ORIGIN}/browse`);
    expect(location).not.toContain("evil.com");
  });

  it("blocks absolute https URL → falls back to /browse", async () => {
    mockSupabase();
    const req = makeRequest({ code: "valid-code", next: "https://evil.com/steal" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toBe(`${ORIGIN}/browse`);
    expect(location).not.toContain("evil.com");
  });

  it("blocks URL-encoded double-slash bypass %2F%2Fevil.com → falls back to /browse", async () => {
    mockSupabase();
    const req = makeRequest({ code: "valid-code", next: "%2F%2Fevil.com" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toBe(`${ORIGIN}/browse`);
    expect(location).not.toContain("evil.com");
  });

  it("blocks single-encoded slash prefix /%2F/evil.com → falls back to /browse", async () => {
    mockSupabase();
    const req = makeRequest({ code: "valid-code", next: "/%2F/evil.com" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toBe(`${ORIGIN}/browse`);
    expect(location).not.toContain("evil.com");
  });

  it("blocks bare external domain without leading slash → falls back to /browse", async () => {
    mockSupabase();
    const req = makeRequest({ code: "valid-code", next: "evil.com/path" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toBe(`${ORIGIN}/browse`);
    expect(location).not.toContain("evil.com");
  });

  it("redirects to /login?error=... on auth error", async () => {
    mockSupabase({ message: "invalid_code" });
    const req = makeRequest({ code: "bad-code", next: "/browse" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toContain("/login");
    expect(location).toContain("error=invalid_code");
  });
});
