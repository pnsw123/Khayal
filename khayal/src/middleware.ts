import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js edge-compatible middleware.
 *
 * Responsibilities:
 *  1. Rate-limit /auth/callback — prevents ?code= enumeration attacks.
 *     Supabase codes expire quickly (~60 s) but without IP-level throttling
 *     an attacker can still fire many requests in that window.
 *
 * Limit: 10 requests / 60 s per IP (sliding window, in-memory Map).
 * Returns HTTP 429 with a JSON body when exceeded.
 *
 * Note: This middleware runs in the Node.js runtime (not Edge) because the
 * project uses `output: "standalone"` on Fly.io. The in-memory Map is
 * process-scoped; for multi-instance deployments upgrade to Redis/Upstash.
 */

interface Window {
  hits: number;
  resetAt: number;
}

// Module-level store — survives across requests in the same process.
const store = new Map<string, Window>();

const WINDOW_MS = 60_000; // 60 seconds
const MAX_HITS = 10;

/** Sliding-window counter. Returns true when request should be blocked. */
function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Prune expired entries every ~100 requests to prevent unbounded growth.
  if (store.size > 500) {
    for (const [key, win] of store.entries()) {
      if (win.resetAt <= now) store.delete(key);
    }
  }

  const win = store.get(ip);
  if (!win || win.resetAt <= now) {
    store.set(ip, { hits: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  win.hits += 1;
  return win.hits > MAX_HITS;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only gate the auth callback route.
  if (pathname === "/auth/callback") {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    if (isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please wait before trying again." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(WINDOW_MS / 1000)),
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on /auth/callback to keep cold-start latency minimal.
  matcher: ["/auth/callback"],
};
