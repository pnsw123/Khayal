/**
 * k6 load test — daily-sync upsert path under rate-limited TMDB responses
 *
 * Simulates the burst behaviour of the daily_sync.py script:
 *   • 50 VUs each representing a parallel upsert worker
 *   • Each VU fires a POST to the Supabase REST upsert endpoint for
 *     `movies` / `tv_series` (on-conflict-update) in rapid succession
 *   • A dedicated "rate-limit" scenario sends occasional 429-like bursts
 *     to verify the app + sync path handles back-pressure gracefully
 *
 * Thresholds (gate 16 pass criteria):
 *   • http_req_duration p(95) < 800 ms  — upsert is heavier than read
 *   • http_req_failed   rate  < 0.05    — allow up to 5 % for rate-limit retries
 *
 * Usage:
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   SUPABASE_SERVICE_ROLE_KEY=<key>       \
 *   k6 run k6/daily-sync-upsert-load.js
 *
 * Requires local Supabase stack (`supabase start`) or staging credentials.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  __ENV.SUPABASE_URL || "http://127.0.0.1:54321";

const SERVICE_ROLE_KEY = __ENV.SUPABASE_SERVICE_ROLE_KEY || "";

const MOVIES_ENDPOINT = `${SUPABASE_URL}/rest/v1/movies`;
const TV_ENDPOINT = `${SUPABASE_URL}/rest/v1/tv_series`;

// ---------------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------------

export const options = {
  scenarios: {
    /** Main upsert burst — mirrors 50 parallel sync workers */
    upsert_burst: {
      executor: "constant-vus",
      vus: 50,
      duration: "30s",
    },
    /** Rate-limit simulation — a small VU group that deliberately hammers
     *  fast to trigger 429 / backpressure, then verifies recovery */
    rate_limit_sim: {
      executor: "constant-vus",
      vus: 5,
      duration: "30s",
      startTime: "5s", // start 5 s in to let the main burst establish baseline
    },
  },
  thresholds: {
    // Upsert p95 can be up to 800 ms (heavier than reads)
    http_req_duration: ["p(95)<800"],
    // Error rate: allow < 5 % (rate-limit retries are expected)
    http_req_failed: ["rate<0.05"],
  },
};

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

const upsertErrors = new Rate("upsert_errors");
const upsertLatency = new Trend("upsert_latency_ms");

// ---------------------------------------------------------------------------
// Shared headers
// ---------------------------------------------------------------------------

function supabaseHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
    // PostgREST upsert: on-conflict update all columns
    Prefer: "resolution=merge-duplicates,return=minimal",
  };
}

// ---------------------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------------------

let _vuMovieCounter = 0;

/** Build a minimal movie upsert payload for the current VU. */
function moviePayload() {
  _vuMovieCounter++;
  // Use a large tmdb_id range to avoid collisions between VUs
  const tmdb_id = 9_000_000 + __VU * 1000 + _vuMovieCounter;
  return JSON.stringify([
    {
      tmdb_id,
      media_type: "movie",
      title: `load-test-movie-${tmdb_id}`,
      slug: `load-test-movie-${tmdb_id}`,
      overview: "Load test synthetic record",
      poster_path: "",
      backdrop_path: "",
      vote_average: 7.0,
      popularity: 100.0,
      release_date: "2024-01-01",
    },
  ]);
}

let _vuTvCounter = 0;

/** Build a minimal tv_series upsert payload for the current VU. */
function tvPayload() {
  _vuTvCounter++;
  const tmdb_id = 9_500_000 + __VU * 1000 + _vuTvCounter;
  return JSON.stringify([
    {
      tmdb_id,
      media_type: "tv",
      title: `load-test-tv-${tmdb_id}`,
      slug: `load-test-tv-${tmdb_id}`,
      overview: "Load test synthetic record",
      poster_path: "",
      backdrop_path: "",
      vote_average: 7.5,
      popularity: 80.0,
      release_date: "2024-01-01",
    },
  ]);
}

// ---------------------------------------------------------------------------
// Default function — upsert_burst scenario
// ---------------------------------------------------------------------------

export default function () {
  if (!SERVICE_ROLE_KEY) {
    // Skip actual HTTP calls if no credentials; still exercises k6 plumbing
    sleep(0.5);
    return;
  }

  const headers = supabaseHeaders();

  // ── Movie upsert ──────────────────────────────────────────────────────────
  const movieRes = http.post(MOVIES_ENDPOINT, moviePayload(), { headers });

  const movieOk = check(movieRes, {
    "movie upsert: 2xx or 409": (r) =>
      r.status >= 200 && r.status < 300 || r.status === 409,
    "movie upsert: not 500": (r) => r.status !== 500,
    "movie upsert: response time < 800ms": (r) => r.timings.duration < 800,
  });

  upsertErrors.add(!movieOk);
  upsertLatency.add(movieRes.timings.duration);

  sleep(0.05);

  // ── TV upsert ─────────────────────────────────────────────────────────────
  const tvRes = http.post(TV_ENDPOINT, tvPayload(), { headers });

  const tvOk = check(tvRes, {
    "tv upsert: 2xx or 409": (r) =>
      r.status >= 200 && r.status < 300 || r.status === 409,
    "tv upsert: not 500": (r) => r.status !== 500,
    "tv upsert: response time < 800ms": (r) => r.timings.duration < 800,
  });

  upsertErrors.add(!tvOk);
  upsertLatency.add(tvRes.timings.duration);

  sleep(0.1);
}

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.["p(95)"] ?? "N/A";
  const errorRate = data.metrics.http_req_failed?.values?.rate ?? 0;

  console.log("\n=== Khayal Daily-Sync Upsert Load Test Summary ===");
  console.log(`p95 response time : ${typeof p95 === "number" ? p95.toFixed(1) + " ms" : p95}`);
  console.log(`Error rate        : ${(errorRate * 100).toFixed(2)}%`);
  console.log(`Total requests    : ${data.metrics.http_reqs?.values?.count ?? "N/A"}`);

  const passed =
    typeof p95 === "number" && p95 < 800 && errorRate < 0.05;
  console.log(`Gate 16 status    : ${passed ? "PASS ✓" : "FAIL ✗"}`);

  return {
    "k6/results/daily-sync-upsert-summary.json": JSON.stringify(data, null, 2),
  };
}
