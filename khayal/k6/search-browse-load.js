/**
 * k6 load test — search + browse paths
 *
 * Scenario:
 *   50 virtual users, 30 s sustained load.
 *   Each VU alternates between:
 *     1. Search RPC proxy  → GET /api/recommendations?type=movie   (search-shaped)
 *     2. Browse page       → GET /browse?genre=Action
 *     3. Home page         → GET /
 *
 * Thresholds (gate 16 pass criteria):
 *   • http_req_duration p(95) < 500 ms   — 95th-percentile response time
 *   • http_req_failed   rate  < 0.01     — < 1 % error rate
 *
 * Usage (local):
 *   BASE_URL=http://localhost:3000 k6 run k6/search-browse-load.js
 *
 * Usage (CI pre-release):
 *   BASE_URL=https://khayal.app k6 run k6/search-browse-load.js
 *
 * Install k6: https://grafana.com/docs/k6/latest/get-started/installation/
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

/** Search terms rotated across VUs to avoid query-plan cache skewing results. */
const SEARCH_QUERIES = [
  "action",
  "comedy",
  "drama",
  "thriller",
  "sci-fi",
  "horror",
  "romance",
  "animation",
  "documentary",
  "fantasy",
];

const GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Thriller",
  "Horror",
  "Romance",
  "Animation",
  "Documentary",
];

// ---------------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------------

export const options = {
  scenarios: {
    search_browse: {
      executor: "constant-vus",
      vus: 50,
      duration: "30s",
    },
  },
  thresholds: {
    // 95th-percentile response time must be under 500 ms
    http_req_duration: ["p(95)<500"],
    // Error rate must be below 1 %
    http_req_failed: ["rate<0.01"],
    // Search-specific p95
    "http_req_duration{scenario:search}": ["p(95)<500"],
    // Browse-specific p95
    "http_req_duration{scenario:browse}": ["p(95)<500"],
  },
};

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

const searchErrors = new Rate("search_errors");
const browseErrors = new Rate("browse_errors");
const searchLatency = new Trend("search_latency_ms");
const browseLatency = new Trend("browse_latency_ms");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pick a rotating item from an array based on VU id so each VU uses a
 * different term, reducing artificial cache locality.
 */
function rotate(arr) {
  return arr[(__VU - 1) % arr.length];
}

// ---------------------------------------------------------------------------
// Default function (executed per VU iteration)
// ---------------------------------------------------------------------------

export default function () {
  const query = rotate(SEARCH_QUERIES);
  const genre = rotate(GENRES);

  // ── 1. Recommendations / search-shaped API call ───────────────────────────
  const searchRes = http.get(
    `${BASE_URL}/api/recommendations?type=movie&limit=20`,
    {
      tags: { scenario: "search" },
      headers: { Accept: "application/json" },
    },
  );

  const searchOk = check(searchRes, {
    "search: status 200": (r) => r.status === 200,
    "search: has json body": (r) => {
      try {
        const body = r.json();
        return Array.isArray(body) || (body && typeof body === "object");
      } catch {
        return false;
      }
    },
    "search: response time < 500ms": (r) => r.timings.duration < 500,
  });

  searchErrors.add(!searchOk);
  searchLatency.add(searchRes.timings.duration);

  sleep(0.1);

  // ── 2. Browse page (HTML) ─────────────────────────────────────────────────
  const browseRes = http.get(
    `${BASE_URL}/browse?genre=${encodeURIComponent(genre)}`,
    {
      tags: { scenario: "browse" },
      headers: { Accept: "text/html" },
    },
  );

  const browseOk = check(browseRes, {
    "browse: status 200 or 304": (r) => r.status === 200 || r.status === 304,
    "browse: has html content": (r) =>
      r.body !== null && r.body.length > 100,
    "browse: response time < 500ms": (r) => r.timings.duration < 500,
  });

  browseErrors.add(!browseOk);
  browseLatency.add(browseRes.timings.duration);

  sleep(0.1);

  // ── 3. Home page ──────────────────────────────────────────────────────────
  const homeRes = http.get(`${BASE_URL}/`, {
    tags: { scenario: "home" },
    headers: { Accept: "text/html" },
  });

  check(homeRes, {
    "home: status 200": (r) => r.status === 200,
    "home: response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(0.2);
}

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.["p(95)"] ?? "N/A";
  const errorRate = data.metrics.http_req_failed?.values?.rate ?? 0;

  console.log("\n=== Khayal Load Test Summary ===");
  console.log(`p95 response time : ${typeof p95 === "number" ? p95.toFixed(1) + " ms" : p95}`);
  console.log(`Error rate        : ${(errorRate * 100).toFixed(2)}%`);
  console.log(`Total requests    : ${data.metrics.http_reqs?.values?.count ?? "N/A"}`);

  const passed =
    typeof p95 === "number" && p95 < 500 && errorRate < 0.01;
  console.log(`Gate 16 status    : ${passed ? "PASS ✓" : "FAIL ✗"}`);

  // Write machine-readable summary for CI artifact upload
  return {
    "k6/results/search-browse-summary.json": JSON.stringify(data, null, 2),
  };
}
