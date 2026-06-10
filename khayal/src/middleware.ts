import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Next.js middleware (Node.js runtime, `output: "standalone"`).
 *
 * Rate-limits:
 *   /auth/callback    — sliding window 10 req / 60 s per IP (code enumeration guard)
 *   /api/image-proxy  — sliding window 60 req / 10 s per IP (bandwidth amplification guard)
 *
 * Distributed store: Upstash Redis — sliding window counters are atomic via HTTP,
 * so limits hold correctly under Fly.io multi-machine / multi-process deploys and
 * Vercel serverless scaling.
 *
 * Required env vars:
 *   UPSTASH_REDIS_REST_URL   — copy from Upstash console → REST API tab
 *   UPSTASH_REDIS_REST_TOKEN — copy from Upstash console → REST API tab
 *
 * Dev / CI fallback: when the env vars are absent the middleware still runs
 * but rate limiting is disabled (every request passes through). A warning is
 * logged once per cold-start so it is visible in dev server output.
 */

// Auth callback limiter config
const AUTH_WINDOW_MS = 60_000; // 60 seconds
const AUTH_MAX_HITS = 10;

// Image proxy limiter config — higher throughput, shorter window
const IMG_WINDOW_MS = 10_000; // 10 seconds
const IMG_MAX_HITS = 60;

// ---------------------------------------------------------------------------
// Build the rate-limiter once per cold-start.
// Returns null when Upstash credentials are not configured (dev / CI).
// ---------------------------------------------------------------------------

interface Limiters {
  auth: Ratelimit;
  imageProxy: Ratelimit;
}

function buildRatelimiters(): Limiters | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      // Hard-fail in production: running without rate limiting exposes /auth/callback
      // to ?code= enumeration attacks and /api/image-proxy to bandwidth amplification.
      // Throw so the process exits on cold-start rather than silently serving unprotected.
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

  return {
    auth: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(AUTH_MAX_HITS, `${AUTH_WINDOW_MS / 1000} s`),
      prefix: "khayal:rl:auth",
      analytics: false,
    }),
    imageProxy: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(IMG_MAX_HITS, `${IMG_WINDOW_MS / 1000} s`),
      prefix: "khayal:rl:img",
      analytics: false,
    }),
  };
}

// Module-level singleton — one set of limiters per process cold-start.
const limiters = buildRatelimiters();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function tooManyRequestsResponse(retryAfterSeconds: number): NextResponse {
  return new NextResponse(
    JSON.stringify({ error: "Too many requests. Please wait before trying again." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // Gate: /auth/callback — stop ?code= enumeration attacks.
  if (pathname === "/auth/callback") {
    if (limiters) {
      const { success } = await limiters.auth.limit(ip);
      if (!success) {
        return tooManyRequestsResponse(Math.ceil(AUTH_WINDOW_MS / 1000));
      }
    }
  }

  // Gate: /api/image-proxy — stop bandwidth amplification.
  if (pathname === "/api/image-proxy") {
    if (limiters) {
      const { success } = await limiters.imageProxy.limit(ip);
      if (!success) {
        return tooManyRequestsResponse(Math.ceil(IMG_WINDOW_MS / 1000));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on auth callback (enumeration guard) and image proxy (bandwidth guard).
  matcher: ["/auth/callback", "/api/image-proxy"],
};
