/**
 * Tests for src/middleware.ts
 * Verifies IP-based rate limiting on /auth/callback via mocked Upstash Ratelimit.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Shared spy — controls what `limit()` resolves to in each test.
// ---------------------------------------------------------------------------
const mockLimit = vi.fn();

// ---------------------------------------------------------------------------
// Top-level module mocks (hoisted by Vitest).
// Uses function constructors so `new Redis()` and `new Ratelimit()` work.
// ---------------------------------------------------------------------------
vi.mock("@upstash/redis", () => {
  return {
    Redis: function RedisMock() {
      return {};
    },
  };
});

vi.mock("@upstash/ratelimit", () => {
  function RatelimitMock() {
    return { limit: mockLimit };
  }
  RatelimitMock.slidingWindow = vi.fn().mockReturnValue("sliding-window-config");
  return { Ratelimit: RatelimitMock };
});

// Provide env vars so `buildRatelimiter()` returns a real (mocked) instance.
vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");

// ---------------------------------------------------------------------------
// Re-import module fresh for each test group so the module-level singleton
// (ratelimiter) is reconstructed with the current mockLimit state.
// ---------------------------------------------------------------------------
async function importMiddleware() {
  vi.resetModules();
  const mod = await import("@/middleware");
  return mod.middleware;
}

const ORIGIN = "https://khayal.app";

function makeCallbackRequest(ip: string): NextRequest {
  return new NextRequest(new URL("/auth/callback?code=test", ORIGIN), {
    headers: { "x-forwarded-for": ip },
  });
}

describe("middleware — /auth/callback rate limiting (Upstash)", () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it("allows requests when Upstash returns success=true", async () => {
    mockLimit.mockResolvedValue({ success: true });
    const middleware = await importMiddleware();
    const res = await middleware(makeCallbackRequest("1.2.3.4"));
    expect(res.status).not.toBe(429);
  });

  it("returns 429 when Upstash returns success=false", async () => {
    mockLimit.mockResolvedValue({ success: false });
    const middleware = await importMiddleware();
    const res = await middleware(makeCallbackRequest("5.6.7.8"));
    expect(res.status).toBe(429);
  });

  it("429 response includes Retry-After header", async () => {
    mockLimit.mockResolvedValue({ success: false });
    const middleware = await importMiddleware();
    const res = await middleware(makeCallbackRequest("9.10.11.12"));
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("different IPs call limit() with their own identifier", async () => {
    mockLimit.mockResolvedValue({ success: true });
    const middleware = await importMiddleware();
    await middleware(makeCallbackRequest("10.0.0.1"));
    await middleware(makeCallbackRequest("10.0.0.2"));
    const calls = mockLimit.mock.calls;
    expect(calls[0][0]).toBe("10.0.0.1");
    expect(calls[1][0]).toBe("10.0.0.2");
  });

  it("passes through non-callback routes without calling limit()", async () => {
    mockLimit.mockResolvedValue({ success: true });
    const middleware = await importMiddleware();
    const req = new NextRequest(new URL("/browse", ORIGIN), {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const res = await middleware(req);
    expect(res.status).not.toBe(429);
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it("passes through all requests when env vars absent (no rate limiter)", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const middleware = await importMiddleware();
    const res = await middleware(makeCallbackRequest("1.2.3.4"));
    expect(res.status).not.toBe(429);
    // Restore so subsequent tests get a limiter instance.
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
  });
});
