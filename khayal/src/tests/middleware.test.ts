/**
 * Tests for src/middleware.ts
 * Verifies IP-based rate limiting on /auth/callback.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Re-import the module fresh for each test group so the in-memory store resets.
// Vitest module cache is per-test-file; we use a factory helper instead.

async function importMiddleware() {
  // Invalidate the module so the store Map starts empty each call.
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

describe("middleware — /auth/callback rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows requests under the limit", async () => {
    const middleware = await importMiddleware();
    const req = makeCallbackRequest("1.2.3.4");
    const res = middleware(req);
    expect(res.status).not.toBe(429);
  });

  it("returns 429 after exceeding 10 requests from same IP", async () => {
    const middleware = await importMiddleware();
    const ip = "5.6.7.8";
    let lastRes: Response | undefined;
    for (let i = 0; i < 11; i++) {
      lastRes = middleware(makeCallbackRequest(ip));
    }
    expect(lastRes?.status).toBe(429);
  });

  it("429 response includes Retry-After header", async () => {
    const middleware = await importMiddleware();
    const ip = "9.10.11.12";
    let lastRes: Response | undefined;
    for (let i = 0; i < 11; i++) {
      lastRes = middleware(makeCallbackRequest(ip));
    }
    expect(lastRes?.headers.get("Retry-After")).toBeTruthy();
  });

  it("different IPs have independent counters", async () => {
    const middleware = await importMiddleware();
    // Exhaust IP A
    for (let i = 0; i < 11; i++) {
      middleware(makeCallbackRequest("10.0.0.1"));
    }
    // IP B should still be allowed
    const res = middleware(makeCallbackRequest("10.0.0.2"));
    expect(res.status).not.toBe(429);
  });

  it("passes through non-callback routes without rate limiting", async () => {
    const middleware = await importMiddleware();
    const req = new NextRequest(new URL("/browse", ORIGIN), {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const res = middleware(req);
    expect(res.status).not.toBe(429);
  });
});
