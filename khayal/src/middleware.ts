import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Next.js middleware (Node.js runtime, `output: "standalone"`).
 *
 * Rate-limits /auth/callback to stop ?code= enumeration attacks.
 *
 * Distributed store: Upstash Redis — sliding window, 10 req / 60 s per IP.
 * All instances share a single atomic counter via `INCR + EXPIRE` over HTTP,
 * so the limit holds correctly under Fly.io multi-machine / multi-process
 * deploys and Vercel serverless scaling.
 *
 * Required env vars:
 *   UPSTASH_REDIS_REST_URL   — copy from Upstash console → REST API tab
 *   UPSTASH_REDIS_REST_TOKEN — copy from Upstash console → REST API tab
 *
 * Dev / CI fallback: when the env vars are absent the middleware still runs
 * but rate limiting is disabled (every request passes through). A warning is
 * logged once per cold-start so it is visible in dev server output.
 */

const WINDOW_MS = 60_000; // 60 seconds
const MAX_HITS = 10;

// ---------------------------------------------------------------------------
// Build the rate-limiter once per cold-start.
// Returns null when Upstash credentials are not configured (dev / CI).
// ---------------------------------------------------------------------------

function buildRatelimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      // Hard-fail in production: running without rate limiting exposes /auth/callback
      // to ?code= enumeration attacks. Throw so the process exits on cold-start
      // rather than silently serving requests unprotected.
      throw new Error(
        "[middleware] FATAL: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN " +
          "must be set in production. Rate limiting cannot be disabled in production."
      );
    }

    console.warn(
      "[middleware] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — " +
        "rate limiting DISABLED. Set these vars in production."
    );
    return null;
  }

  const redis = new Redis({ url, token });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX_HITS, `${WINDOW_MS / 1000} s`),
    prefix: "khayal:rl",
    analytics: false,
  });
}

// Module-level singleton — one limiter per process cold-start.
const ratelimiter = buildRatelimiter();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only gate the auth callback route.
  if (pathname === "/auth/callback") {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    if (ratelimiter) {
      const { success } = await ratelimiter.limit(ip);

      if (!success) {
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
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on /auth/callback to keep cold-start latency minimal.
  matcher: ["/auth/callback"],
};
