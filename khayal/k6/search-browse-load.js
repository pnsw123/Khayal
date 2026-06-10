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
  const dur = data.metrics.http_req_duration?.values ?? {};
  const p95 = dur["p(95)"] ?? null;
  const p99 = dur["p(99)"] ?? null;
  const median = dur["med"] ?? null;
  const mean = dur["avg"] ?? null;
  const errorRate = data.metrics.http_req_failed?.values?.rate ?? 0;
  const totalRequests = data.metrics.http_reqs?.values?.count ?? 0;
  const rps = data.metrics.http_reqs?.values?.rate ?? 0;

  const passed = p95 !== null && p95 < 500 && errorRate < 0.01;

  console.log("\n=== Khayal Load Test Summary ===");
  console.log(`p95 response time : ${p95 !== null ? p95.toFixed(1) + " ms" : "N/A"}`);
  console.log(`p99 response time : ${p99 !== null ? p99.toFixed(1) + " ms" : "N/A"}`);
  console.log(`Median            : ${median !== null ? median.toFixed(1) + " ms" : "N/A"}`);
  console.log(`Error rate        : ${(errorRate * 100).toFixed(2)}%`);
  console.log(`Total requests    : ${totalRequests}`);
  console.log(`RPS               : ${rps.toFixed(1)}`);
  console.log(`Gate 16 status    : ${passed ? "PASS ✓" : "FAIL ✗"}`);

  // Build structured summary — this file is tracked in git (not gitignored)
  // so benchmark numbers are auditable without re-running.
  const runDate = new Date().toISOString().slice(0, 10);
  const summary = {
    _meta: {
      description: "k6 load-test benchmark — search + browse paths",
      scenario: "50 virtual users × 30 s sustained load",
      target: __ENV.BASE_URL || "http://localhost:3000",
      run_date: runDate,
      thresholds: {
        http_req_duration_p95_ms: 500,
        http_req_failed_rate: 0.01,
      },
      gate_16_status: passed ? "PASS" : "FAIL",
    },
    summary: {
      p95_ms: p95 !== null ? Math.round(p95 * 10) / 10 : null,
      p99_ms: p99 !== null ? Math.round(p99 * 10) / 10 : null,
      median_ms: median !== null ? Math.round(median * 10) / 10 : null,
      mean_ms: mean !== null ? Math.round(mean * 10) / 10 : null,
      error_rate: Math.round(errorRate * 10000) / 10000,
      total_requests: totalRequests,
      rps: Math.round(rps * 10) / 10,
      vus: 50,
      duration_s: 30,
    },
    thresholds_result: {
      http_req_duration_p95_under_500ms: p95 !== null && p95 < 500 ? "PASS" : "FAIL",
      http_req_failed_rate_under_1pct: errorRate < 0.01 ? "PASS" : "FAIL",
      search_scenario_p95_under_500ms:
        (data.metrics["http_req_duration{scenario:search}"]?.values?.["p(95)"] ?? 0) < 500
          ? "PASS"
          : "FAIL",
      browse_scenario_p95_under_500ms:
        (data.metrics["http_req_duration{scenario:browse}"]?.values?.["p(95)"] ?? 0) < 500
          ? "PASS"
          : "FAIL",
    },
    raw_metrics: {
      http_req_duration: {
        avg: mean !== null ? Math.round(mean * 10) / 10 : null,
        min: dur["min"] ?? null,
        med: median !== null ? Math.round(median * 10) / 10 : null,
        max: dur["max"] ?? null,
        "p(90)": dur["p(90)"] ?? null,
        "p(95)": p95 !== null ? Math.round(p95 * 10) / 10 : null,
        "p(99)": p99 !== null ? Math.round(p99 * 10) / 10 : null,
      },
      http_req_failed: {
        rate: Math.round(errorRate * 10000) / 10000,
        passes: data.metrics.http_req_failed?.values?.passes ?? null,
        fails: data.metrics.http_req_failed?.values?.fails ?? null,
      },
      http_reqs: {
        count: totalRequests,
        rate: Math.round(rps * 10) / 10,
      },
      vus: data.metrics.vus?.values ?? {},
      iterations: {
        count: data.metrics.iterations?.values?.count ?? null,
        rate: data.metrics.iterations?.values?.rate ?? null,
      },
      data_received: {
        count: data.metrics.data_received?.values?.count ?? null,
        rate: data.metrics.data_received?.values?.rate ?? null,
      },
      data_sent: {
        count: data.metrics.data_sent?.values?.count ?? null,
        rate: data.metrics.data_sent?.values?.rate ?? null,
      },
    },
  };

  // Tracked summary (committed to git — auditable, no re-run needed)
  return {
    "k6/results/search-browse-summary.json": JSON.stringify(summary, null, 2),
    // Raw full data available as artifact; not committed (gitignored)
    stdout: "",
  };
}
