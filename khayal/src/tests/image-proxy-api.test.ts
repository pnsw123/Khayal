/**
 * Tests for src/app/api/image-proxy/route.ts
 * Verifies Content-Type whitelist fix: only image/* types allowed; SVG/HTML blocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const ORIGIN = "https://khayal.app";

function makeRequest(url: string): NextRequest {
  const req = new URL("/api/image-proxy", ORIGIN);
  if (url) req.searchParams.set("url", url);
  return new NextRequest(req.toString());
}

function mockFetch(contentType: string, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-type" ? contentType : null,
      },
      arrayBuffer: async () => new ArrayBuffer(8),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/image-proxy — Content-Type whitelist", () => {
  it("returns 400 when url param missing", async () => {
    const { GET } = await import("@/app/api/image-proxy/route");
    const url = new URL("/api/image-proxy", ORIGIN);
    const req = new NextRequest(url.toString());
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 for non-TMDB url", async () => {
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://evil.com/xss.svg");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("passes through image/jpeg unchanged", async () => {
    mockFetch("image/jpeg");
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://image.tmdb.org/t/p/w500/poster.jpg");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("passes through image/png unchanged", async () => {
    mockFetch("image/png");
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://image.tmdb.org/t/p/w500/poster.png");
    const res = await GET(req);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("passes through image/webp unchanged", async () => {
    mockFetch("image/webp");
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://image.tmdb.org/t/p/w500/poster.webp");
    const res = await GET(req);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
  });

  it("passes through image/gif unchanged", async () => {
    mockFetch("image/gif");
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://image.tmdb.org/t/p/w500/poster.gif");
    const res = await GET(req);
    expect(res.headers.get("Content-Type")).toBe("image/gif");
  });

  it("passes through content-type with params e.g. image/jpeg; charset=utf-8", async () => {
    mockFetch("image/jpeg; charset=utf-8");
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://image.tmdb.org/t/p/w500/poster.jpg");
    const res = await GET(req);
    // base type is whitelisted — returns original raw header value
    expect(res.headers.get("Content-Type")).toBe("image/jpeg; charset=utf-8");
  });

  it("blocks image/svg+xml — falls back to image/jpeg", async () => {
    mockFetch("image/svg+xml");
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://image.tmdb.org/t/p/w500/xss.svg");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("blocks text/html — falls back to image/jpeg", async () => {
    mockFetch("text/html");
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://image.tmdb.org/t/p/w500/error");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("blocks text/html; charset=utf-8 — falls back to image/jpeg", async () => {
    mockFetch("text/html; charset=utf-8");
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://image.tmdb.org/t/p/w500/error");
    const res = await GET(req);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("handles missing Content-Type header — defaults to image/jpeg", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
        arrayBuffer: async () => new ArrayBuffer(8),
      })
    );
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://image.tmdb.org/t/p/w500/unknown");
    const res = await GET(req);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns upstream error status when upstream not ok", async () => {
    mockFetch("text/html", 404);
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://image.tmdb.org/t/p/w500/missing.jpg");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns 502 when fetch throws a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    );
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://image.tmdb.org/t/p/w500/poster.jpg");
    const res = await GET(req);
    expect(res.status).toBe(502);
  });

  it("returns 502 when fetch times out (AbortError)", async () => {
    const abortErr = Object.assign(new Error("The operation was aborted"), {
      name: "AbortError",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortErr));
    const { GET } = await import("@/app/api/image-proxy/route");
    const req = makeRequest("https://image.tmdb.org/t/p/w500/poster.jpg");
    const res = await GET(req);
    expect(res.status).toBe(502);
  });
});
