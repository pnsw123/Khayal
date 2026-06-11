/**
 * Tests for RLS policy migration (issue #154).
 *
 * These tests read the migration SQL file and assert its structural correctness —
 * every table has RLS enabled, every required policy exists, and the auth scope
 * is correct. They run entirely offline (no live DB required).
 *
 * Why this matters: a migration that forgets ENABLE ROW LEVEL SECURITY or uses
 * the wrong auth expression (e.g. `user_id` instead of `auth.uid() = user_id`)
 * silently leaves data exposed. Structural tests catch these before deployment.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");
const FILENAME = "20240001000002_rls_policies.sql";

let sql: string;
let sqlUpper: string;

beforeAll(() => {
  sql = readFileSync(resolve(MIGRATIONS_DIR, FILENAME), "utf-8");
  sqlUpper = sql.toUpperCase();
});

// ── Migration file ────────────────────────────────────────────────────────────

describe("migration file: 20240001000002_rls_policies.sql", () => {
  it("file exists and is non-empty", () => {
    expect(sql.length).toBeGreaterThan(100);
  });

  it("filename matches Supabase timestamp convention", () => {
    expect(FILENAME).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  it("timestamp is after existing GIN index migrations", () => {
    const rlsTs = parseInt("20240001000002", 10);
    const ftsTs = parseInt("20240001000001", 10);
    expect(rlsTs).toBeGreaterThan(ftsTs);
  });

  it("contains no DROP TABLE statements", () => {
    expect(sqlUpper).not.toContain("DROP TABLE");
  });

  it("contains no TRUNCATE statements", () => {
    expect(sqlUpper).not.toContain("TRUNCATE");
  });

  it("uses DROP POLICY IF EXISTS for idempotency before each CREATE POLICY", () => {
    expect(sqlUpper).toContain("DROP POLICY IF EXISTS");
    // Count CREATE POLICY vs DROP POLICY IF EXISTS — should be equal
    const createCount = (sqlUpper.match(/CREATE POLICY/g) ?? []).length;
    const dropCount = (sqlUpper.match(/DROP POLICY IF EXISTS/g) ?? []).length;
    expect(dropCount).toBe(createCount);
  });
});

// ── ENABLE ROW LEVEL SECURITY — all 10 tables ─────────────────────────────────

describe("ENABLE ROW LEVEL SECURITY on all user-data tables", () => {
  const tables = [
    "MOVIES",
    "TV_SERIES",
    "PROFILES",
    "MOVIE_RATINGS",
    "MOVIE_REVIEWS",
    "TV_SERIES_REVIEWS",
    "USER_LISTS",
    "USER_LIST_MOVIES",
    "USER_LIST_TV_SERIES",
    "RECOMMENDATIONS",
  ];

  for (const table of tables) {
    it(`${table} has ENABLE ROW LEVEL SECURITY`, () => {
      expect(sqlUpper).toContain(
        `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`
      );
    });
  }
});

// ── auth.uid() usage ──────────────────────────────────────────────────────────

describe("policies use auth.uid() for ownership checks", () => {
  it("migration references auth.uid()", () => {
    expect(sql).toContain("auth.uid()");
  });

  it("movie_ratings policies compare auth.uid() = user_id", () => {
    expect(sql).toContain("auth.uid() = user_id");
  });

  it("profiles update policy compares auth.uid() = id", () => {
    expect(sql).toContain("auth.uid() = id");
  });
});

// ── movies: public read-only ──────────────────────────────────────────────────

describe("movies table: public SELECT policy", () => {
  it("has movies_select_public policy", () => {
    expect(sql).toContain('"movies_select_public"');
  });

  it("uses USING (true) for unconditional public read", () => {
    // At least one USING (true) present (movies + tv_series + profiles + reviews)
    expect(sql).toContain("USING (true)");
  });

  it("no INSERT/UPDATE/DELETE policy on movies", () => {
    // movies table block should not contain INSERT/UPDATE/DELETE policies
    const moviesBlock = sql.split("-- ── tv_series")[0];
    expect(moviesBlock.toUpperCase()).not.toContain(
      'ON MOVIES FOR INSERT'
    );
    expect(moviesBlock.toUpperCase()).not.toContain(
      'ON MOVIES FOR UPDATE'
    );
    expect(moviesBlock.toUpperCase()).not.toContain(
      'ON MOVIES FOR DELETE'
    );
  });
});

// ── tv_series: public read-only ───────────────────────────────────────────────

describe("tv_series table: public SELECT policy", () => {
  it("has tv_series_select_public policy", () => {
    expect(sql).toContain('"tv_series_select_public"');
  });
});

// ── profiles ──────────────────────────────────────────────────────────────────

describe("profiles table: public SELECT + owner UPDATE", () => {
  it("has profiles_select_public policy", () => {
    expect(sql).toContain('"profiles_select_public"');
  });

  it("has profiles_update_own policy", () => {
    expect(sql).toContain('"profiles_update_own"');
  });

  it("profiles_update_own uses WITH CHECK for insert-path safety", () => {
    expect(sql).toContain("WITH CHECK (auth.uid() = id)");
  });
});

// ── movie_ratings ─────────────────────────────────────────────────────────────

describe("movie_ratings table: full owner CRUD", () => {
  it("has movie_ratings_select_own", () => {
    expect(sql).toContain('"movie_ratings_select_own"');
  });

  it("has movie_ratings_insert_own", () => {
    expect(sql).toContain('"movie_ratings_insert_own"');
  });

  it("has movie_ratings_update_own", () => {
    expect(sql).toContain('"movie_ratings_update_own"');
  });

  it("has movie_ratings_delete_own", () => {
    expect(sql).toContain('"movie_ratings_delete_own"');
  });
});

// ── movie_reviews ─────────────────────────────────────────────────────────────

describe("movie_reviews table: public SELECT + owner write", () => {
  it("has movie_reviews_select_public", () => {
    expect(sql).toContain('"movie_reviews_select_public"');
  });

  it("has movie_reviews_insert_own", () => {
    expect(sql).toContain('"movie_reviews_insert_own"');
  });

  it("has movie_reviews_update_own", () => {
    expect(sql).toContain('"movie_reviews_update_own"');
  });

  it("has movie_reviews_delete_own", () => {
    expect(sql).toContain('"movie_reviews_delete_own"');
  });
});

// ── tv_series_reviews ─────────────────────────────────────────────────────────

describe("tv_series_reviews table: public SELECT + owner write", () => {
  it("has tv_series_reviews_select_public", () => {
    expect(sql).toContain('"tv_series_reviews_select_public"');
  });

  it("has tv_series_reviews_insert_own", () => {
    expect(sql).toContain('"tv_series_reviews_insert_own"');
  });

  it("has tv_series_reviews_update_own", () => {
    expect(sql).toContain('"tv_series_reviews_update_own"');
  });

  it("has tv_series_reviews_delete_own", () => {
    expect(sql).toContain('"tv_series_reviews_delete_own"');
  });
});

// ── user_lists ────────────────────────────────────────────────────────────────

describe("user_lists table: owner CRUD + public SELECT on is_public", () => {
  it("has user_lists_select_own_or_public", () => {
    expect(sql).toContain('"user_lists_select_own_or_public"');
  });

  it("SELECT policy allows public lists with is_public = true", () => {
    expect(sql).toContain("is_public = true");
  });

  it("has user_lists_insert_own", () => {
    expect(sql).toContain('"user_lists_insert_own"');
  });

  it("has user_lists_update_own", () => {
    expect(sql).toContain('"user_lists_update_own"');
  });

  it("has user_lists_delete_own", () => {
    expect(sql).toContain('"user_lists_delete_own"');
  });
});

// ── user_list_movies ──────────────────────────────────────────────────────────

describe("user_list_movies: ownership via parent user_lists", () => {
  it("has user_list_movies_select_own_or_public", () => {
    expect(sql).toContain('"user_list_movies_select_own_or_public"');
  });

  it("has user_list_movies_insert_own", () => {
    expect(sql).toContain('"user_list_movies_insert_own"');
  });

  it("has user_list_movies_delete_own", () => {
    expect(sql).toContain('"user_list_movies_delete_own"');
  });

  it("ownership check uses sub-select on user_lists", () => {
    expect(sql).toContain("SELECT 1 FROM user_lists ul");
  });
});

// ── user_list_tv_series ───────────────────────────────────────────────────────

describe("user_list_tv_series: ownership via parent user_lists", () => {
  it("has user_list_tv_series_select_own_or_public", () => {
    expect(sql).toContain('"user_list_tv_series_select_own_or_public"');
  });

  it("has user_list_tv_series_insert_own", () => {
    expect(sql).toContain('"user_list_tv_series_insert_own"');
  });

  it("has user_list_tv_series_delete_own", () => {
    expect(sql).toContain('"user_list_tv_series_delete_own"');
  });
});

// ── recommendations ───────────────────────────────────────────────────────────

describe("recommendations table: SELECT owner only", () => {
  it("has recommendations_select_own", () => {
    expect(sql).toContain('"recommendations_select_own"');
  });

  it("no INSERT policy (service role bypasses RLS for ML writes)", () => {
    expect(sql).not.toContain('"recommendations_insert');
  });

  it("no DELETE policy on recommendations (service role only)", () => {
    expect(sql).not.toContain('"recommendations_delete');
  });
});

// ── recommendations deny migration (issue #257) ───────────────────────────────

describe("recommendations deny migration: 20240001000017_rls_recommendations_deny.sql", () => {
  const DENY_FILENAME = "20240001000017_rls_recommendations_deny.sql";
  let denySql: string;

  beforeAll(() => {
    denySql = readFileSync(resolve(MIGRATIONS_DIR, DENY_FILENAME), "utf-8");
  });

  it("file exists and is non-empty", () => {
    expect(denySql.length).toBeGreaterThan(50);
  });

  it("has recommendations_insert_deny policy", () => {
    expect(denySql).toContain('"recommendations_insert_deny"');
  });

  it("insert deny uses WITH CHECK (false)", () => {
    expect(denySql).toContain("WITH CHECK (false)");
  });

  it("has recommendations_update_deny policy", () => {
    expect(denySql).toContain('"recommendations_update_deny"');
  });

  it("update deny uses USING (false)", () => {
    expect(denySql).toContain("USING (false)");
  });

  it("has recommendations_delete_deny policy", () => {
    expect(denySql).toContain('"recommendations_delete_deny"');
  });

  it("all 3 deny policies have DROP POLICY IF EXISTS guards (idempotent)", () => {
    const dropCount = (denySql.match(/DROP POLICY IF EXISTS/g) ?? []).length;
    const createCount = (denySql.match(/CREATE POLICY/g) ?? []).length;
    expect(dropCount).toBe(createCount);
    expect(createCount).toBe(3);
  });

  it("targets recommendations table", () => {
    expect(denySql.toUpperCase()).toContain("ON RECOMMENDATIONS FOR INSERT");
    expect(denySql.toUpperCase()).toContain("ON RECOMMENDATIONS FOR UPDATE");
    expect(denySql.toUpperCase()).toContain("ON RECOMMENDATIONS FOR DELETE");
  });
});

// ── Policy naming convention ──────────────────────────────────────────────────

describe("policy naming convention", () => {
  it("all policies use snake_case names", () => {
    const policyNames = [...sql.matchAll(/CREATE POLICY "([^"]+)"/g)].map(
      (m) => m[1]
    );
    expect(policyNames.length).toBeGreaterThan(0);
    for (const name of policyNames) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("at least 20 policies defined (comprehensive coverage)", () => {
    const count = (sql.match(/CREATE POLICY/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(20);
  });
});
