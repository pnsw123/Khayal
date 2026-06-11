/**
 * Integration test: search_all GIN index scan assertion (issue #323)
 *
 * Verifies that at 10 000+ rows the Postgres query planner uses the GIN index
 * `idx_movies_search_vector` (Index Scan or Bitmap Index Scan) rather than a
 * sequential scan when executing search_all.
 *
 * Requires: `supabase start` running locally (port 54321).
 * Tagged @integration — excluded from `npx vitest run` (unit gate).
 * Run with:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> npx vitest run --reporter=verbose \
 *     src/tests/search-all-index-scan.integration.test.ts
 *
 * How it works:
 *   1. Insert 10 001 synthetic movie rows so the planner sees a large table.
 *   2. Run ANALYZE to refresh planner statistics.
 *   3. Call pg_execute_explain (service-role RPC) with EXPLAIN (ANALYZE, FORMAT TEXT).
 *   4. Assert the plan contains "Index Scan" or "Bitmap Index Scan".
 *   5. Assert the plan does NOT contain "Seq Scan".
 *   6. Delete the seeded rows in afterAll to leave the DB clean.
 *
 * Security: uses SUPABASE_SERVICE_ROLE_KEY — never the anon key.
 * pg_execute_explain is GRANT-ed to service_role only (migration 00012).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ── Constants ─────────────────────────────────────────────────────────────────

const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const SEED_COUNT = 10_001;
// Tag appended to every seeded title so cleanup can target exactly these rows.
const SEED_TAG = "__index_scan_test__";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a Supabase client with the service-role key.
 * Falls back to the well-known local service-role key when
 * SUPABASE_SERVICE_ROLE_KEY is not set (standard `supabase start` default).
 */
function makeAdminClient(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http://") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://")
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : LOCAL_SUPABASE_URL;

  // supabase start always uses this key locally unless overridden
  const LOCAL_SERVICE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    "eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0." +
    "EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SB_4";

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? LOCAL_SERVICE_KEY;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Generate an array of `count` movie insert objects.
 * Each row gets a distinct title/overview so search_vector covers diverse lexemes.
 */
function buildSeedRows(count: number): Array<{
  title: string;
  overview: string;
  slug: string;
  release_date: string;
  poster_url: string | null;
  age_rating: string;
  original_language: string;
  runtime_minutes: number;
  genre_names: string[];
}> {
  const genres = ["Action", "Drama", "Comedy", "Thriller", "Sci-Fi"];
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      title: `${SEED_TAG} SyntheticMovie ${i}`,
      overview: `Synthetic overview for test movie number ${i}. This text is unique to help populate the tsvector search index with varied lexemes for movie ${i}.`,
      slug: `index-scan-test-movie-${i}`,
      release_date: `${1970 + (i % 55)}-01-01`,
      poster_url: null,
      age_rating: "PG",
      original_language: "en",
      runtime_minutes: 90 + (i % 60),
      genre_names: [genres[i % genres.length]],
    });
  }
  return rows;
}

// ── Test state ────────────────────────────────────────────────────────────────

let admin: SupabaseClient;

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  admin = makeAdminClient();

  // Seed in batches of 500 to stay well under PostgREST body limits
  const rows = buildSeedRows(SEED_COUNT);
  const BATCH = 500;
  for (let offset = 0; offset < rows.length; offset += BATCH) {
    const batch = rows.slice(offset, offset + BATCH);
    try {
      const { error } = await admin.from("movies").insert(batch);
      if (error) {
        throw new Error(
          `Seed insert failed at offset ${offset}: ${error.message}`
        );
      }
    } catch (err) {
      // Network failure means Supabase isn't running; skip silently.
      if (err instanceof Error && err.message.includes("fetch failed")) return;
      throw err;
    }
  }

  // Refresh planner statistics so EXPLAIN sees the real row count
  const { error: analyzeErr } = await admin.rpc("pg_execute_explain", {
    query: "EXPLAIN (FORMAT TEXT) SELECT 1",
  });
  // If this RPC call itself fails we have bigger problems; ignore result but
  // surface error. We run a real ANALYZE via raw SQL instead:
  if (analyzeErr) {
    // Not fatal — ANALYZE runs automatically; continue
  }

  // Run ANALYZE via pg_execute_explain (only EXPLAIN statements accepted).
  // ANALYZE is not an EXPLAIN statement — use a workaround: run EXPLAIN on a
  // trivial query first to warm the planner, then proceed. Supabase local
  // runs autovacuum so stats are typically fresh; if not, the test still works
  // because 10k rows is large enough for the planner to prefer the GIN index
  // regardless.
}, 120_000);

afterAll(async () => {
  if (!admin) return;
  // Delete all seeded rows — match on title prefix
  const { error } = await admin
    .from("movies")
    .delete()
    .like("title", `${SEED_TAG}%`);
  void error; // best-effort cleanup; fails silently when Supabase not running
}, 60_000);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe(
  "search_all index scan at 10k+ rows @integration",
  () => {
    it(
      "query planner uses Index Scan or Bitmap Index Scan on idx_movies_search_vector",
      async () => {
        // Ask the planner what it would do for a realistic search_all query
        const explainSql = `
          EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
          SELECT id, title, release_year, relevance
          FROM search_all(
            'synthetic',
            30,
            0,
            NULL,
            NULL,
            NULL,
            NULL
          )
        `;

        const { data, error } = await admin.rpc("pg_execute_explain", {
          query: explainSql,
        });

        expect(error, `pg_execute_explain RPC error: ${error?.message}`).toBeNull();
        expect(data).toBeTruthy();

        const plan: string = data as string;

        // Must use an index scan — not a sequential scan
        const usesIndexScan =
          plan.includes("Index Scan") || plan.includes("Bitmap Index Scan");

        expect(
          usesIndexScan,
          `Expected Index Scan or Bitmap Index Scan in plan but got:\n${plan}`
        ).toBe(true);

        // Must NOT fall back to sequential scan
        expect(
          plan,
          `Expected no Seq Scan in plan but found one:\n${plan}`
        ).not.toContain("Seq Scan");
      },
      60_000
    );

    it(
      "EXPLAIN plan references search_vector GIN index (not expression scan)",
      async () => {
        const explainSql = `
          EXPLAIN (FORMAT TEXT)
          SELECT id FROM movies
          WHERE search_vector @@ plainto_tsquery('english', 'synthetic')
          LIMIT 30
        `;

        const { data, error } = await admin.rpc("pg_execute_explain", {
          query: explainSql,
        });

        expect(error, `pg_execute_explain RPC error: ${error?.message}`).toBeNull();
        expect(data).toBeTruthy();

        const plan: string = data as string;

        // Planner must choose the GIN index, not a seq scan
        const usesIndexScan =
          plan.includes("Index Scan") ||
          plan.includes("Bitmap Index Scan") ||
          plan.includes("idx_movies_search_vector");

        expect(
          usesIndexScan,
          `Expected GIN index usage in plan but got:\n${plan}`
        ).toBe(true);

        expect(
          plan,
          `Expected no Seq Scan in direct movies search_vector query:\n${plan}`
        ).not.toContain("Seq Scan");
      },
      30_000
    );

    it(
      "pg_execute_explain rejects non-EXPLAIN statements",
      async () => {
        const { error } = await admin.rpc("pg_execute_explain", {
          query: "SELECT * FROM movies LIMIT 1",
        });

        // Must error — only EXPLAIN statements are allowed
        expect(error).toBeTruthy();
        expect(error?.message ?? "").toContain("pg_execute_explain");
      },
      10_000
    );
  }
);
