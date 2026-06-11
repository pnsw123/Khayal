/**
 * Tests for GIN index migrations (issue #142).
 *
 * These tests read the migration SQL files and assert their structural
 * correctness — table name, column name, index type, safety flags.
 * They run entirely offline (no live DB required).
 *
 * Why this matters: a malformed migration (wrong table, missing CONCURRENTLY,
 * wrong column) would silently not fix the performance issue and could lock
 * a production table during deployment.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

function readMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, filename), "utf-8");
}

// ─── genre_names GIN index ───────────────────────────────────────────────────

describe("migration: idx_movies_genre_names (GIN on genre_names array)", () => {
  let sql: string;

  beforeAll(() => {
    sql = readMigration("20240001000000_gin_index_genre_names.sql").toUpperCase();
  });

  it("creates an index (CREATE INDEX statement present)", () => {
    expect(sql).toContain("CREATE INDEX");
  });

  it("uses GIN index type", () => {
    expect(sql).toContain("USING GIN");
  });

  it("targets the movies table", () => {
    expect(sql).toContain("ON MOVIES");
  });

  it("indexes the genre_names column", () => {
    expect(sql).toContain("GENRE_NAMES");
  });

  it("uses CONCURRENTLY to avoid table lock on live DB", () => {
    expect(sql).toContain("CONCURRENTLY");
  });

  it("uses IF NOT EXISTS for idempotency", () => {
    expect(sql).toContain("IF NOT EXISTS");
  });

  it("names the index idx_movies_genre_names", () => {
    expect(sql).toContain("IDX_MOVIES_GENRE_NAMES");
  });
});

// ─── FTS tsvector GIN index ──────────────────────────────────────────────────

describe("migration: idx_movies_fts (GIN on tsvector)", () => {
  let sql: string;

  beforeAll(() => {
    sql = readMigration("20240001000001_gin_index_fts.sql").toUpperCase();
  });

  it("creates an index (CREATE INDEX statement present)", () => {
    expect(sql).toContain("CREATE INDEX");
  });

  it("uses GIN index type", () => {
    expect(sql).toContain("USING GIN");
  });

  it("targets the movies table", () => {
    expect(sql).toContain("ON MOVIES");
  });

  it("uses to_tsvector function", () => {
    expect(sql).toContain("TO_TSVECTOR");
  });

  it("uses english language dictionary", () => {
    expect(sql).toContain("'ENGLISH'");
  });

  it("includes title in tsvector expression", () => {
    expect(sql).toContain("TITLE");
  });

  it("includes overview in tsvector expression", () => {
    expect(sql).toContain("OVERVIEW");
  });

  it("uses COALESCE to handle null overview safely", () => {
    expect(sql).toContain("COALESCE");
  });

  it("uses CONCURRENTLY to avoid table lock on live DB", () => {
    expect(sql).toContain("CONCURRENTLY");
  });

  it("uses IF NOT EXISTS for idempotency", () => {
    expect(sql).toContain("IF NOT EXISTS");
  });

  it("names the index idx_movies_fts", () => {
    expect(sql).toContain("IDX_MOVIES_FTS");
  });
});

// ─── Migration file naming convention ───────────────────────────────────────

describe("migration file naming", () => {
  it("genre_names migration filename starts with a timestamp", () => {
    // Supabase convention: YYYYMMDDHHMMSS_description.sql
    expect("20240001000000_gin_index_genre_names.sql").toMatch(
      /^\d{14}_[a-z0-9_]+\.sql$/
    );
  });

  it("fts migration filename starts with a timestamp", () => {
    expect("20240001000001_gin_index_fts.sql").toMatch(
      /^\d{14}_[a-z0-9_]+\.sql$/
    );
  });

  it("fts migration timestamp is after genre_names migration (applied second)", () => {
    const genreTs = parseInt("20240001000000", 10);
    const ftsTs = parseInt("20240001000001", 10);
    expect(ftsTs).toBeGreaterThan(genreTs);
  });
});

// ─── RPC param name consistency (issue #242) ─────────────────────────────────
//
// Migration 00008 previously renamed params to movie_slug/series_slug while
// call sites use { p_slug: slug }.  These tests lock the param name to p_slug
// across both migrations so a future edit cannot silently re-introduce the mismatch.

describe("migration 00009: get_movie_detail + get_tv_detail use p_slug param", () => {
  let sql: string;

  beforeAll(() => {
    sql = readMigration("20240001000009_rpc_get_movie_and_tv_detail.sql");
  });

  it("get_movie_detail param is named p_slug", () => {
    // Must contain p_slug as a parameter — not movie_slug or any other name
    expect(sql).toContain("p_slug");
  });

  it("get_tv_detail param is named p_slug", () => {
    expect(sql).toContain("p_slug");
  });

  it("does not use movie_slug param name", () => {
    expect(sql).not.toContain("movie_slug");
  });

  it("does not use series_slug param name", () => {
    expect(sql).not.toContain("series_slug");
  });
});

describe("migration 00010: search_path fix preserves p_slug param name", () => {
  let sql: string;

  beforeAll(() => {
    sql = readMigration("20240001000010_fix_search_path_security_definer.sql");
  });

  it("get_movie_detail uses p_slug (not movie_slug)", () => {
    expect(sql).toContain("p_slug");
    expect(sql).not.toContain("movie_slug");
  });

  it("get_tv_detail uses p_slug (not series_slug)", () => {
    expect(sql).toContain("p_slug");
    expect(sql).not.toContain("series_slug");
  });

  it("adds SET search_path security fix", () => {
    expect(sql).toContain("SET search_path = public, pg_catalog");
  });

  it("both function definitions are present", () => {
    expect(sql).toContain("get_movie_detail");
    expect(sql).toContain("get_tv_detail");
  });
});

// ─── stored generated column migration (issue #270) ─────────────────────────

describe("migration 000020: fts_stored_generated_columns", () => {
  let sql: string;

  beforeAll(() => {
    sql = readMigration("20240001000020_fts_stored_generated_columns.sql");
  });

  it("adds search_vector generated column to movies", () => {
    expect(sql.toUpperCase()).toContain("ALTER TABLE MOVIES");
    expect(sql).toContain("search_vector");
  });

  it("adds search_vector generated column to tv_series", () => {
    expect(sql.toUpperCase()).toContain("ALTER TABLE TV_SERIES");
    expect(sql).toContain("search_vector");
  });

  it("uses GENERATED ALWAYS AS ... STORED", () => {
    expect(sql.toUpperCase()).toContain("GENERATED ALWAYS AS");
    expect(sql.toUpperCase()).toContain("STORED");
  });

  it("drops old expression index idx_movies_fts", () => {
    expect(sql.toUpperCase()).toContain("DROP INDEX IF EXISTS IDX_MOVIES_FTS");
  });

  it("drops old expression index idx_tv_series_fts", () => {
    expect(sql.toUpperCase()).toContain("DROP INDEX IF EXISTS IDX_TV_SERIES_FTS");
  });

  it("creates new GIN index on movies.search_vector", () => {
    expect(sql).toContain("idx_movies_search_vector");
    expect(sql.toUpperCase()).toContain("USING GIN(SEARCH_VECTOR)");
  });

  it("creates new GIN index on tv_series.search_vector", () => {
    expect(sql).toContain("idx_tv_series_search_vector");
  });

  it("search_movies RPC references m.search_vector in WHERE", () => {
    expect(sql).toContain("m.search_vector @@");
  });

  it("search_movies RPC uses stored column in ts_rank", () => {
    expect(sql).toContain("ts_rank(\n      m.search_vector,");
  });

  it("search_tv_series RPC references t.search_vector in WHERE", () => {
    expect(sql).toContain("t.search_vector @@");
  });

  it("search_tv_series RPC uses stored column in ts_rank", () => {
    expect(sql).toContain("ts_rank(\n      t.search_vector,");
  });

  it("search_all RPC does not call to_tsvector at query time", () => {
    // The GENERATED column definition uses to_tsvector, but after that point
    // no RPC body should recompute it. Check that to_tsvector does not appear
    // below the ALTER TABLE statements (i.e., inside any CREATE FUNCTION body).
    const afterAlters = sql.split("CREATE OR REPLACE FUNCTION").slice(1).join("");
    expect(afterAlters).not.toContain("to_tsvector(");
  });

  it("migration file follows naming convention", () => {
    expect("20240001000020_fts_stored_generated_columns.sql").toMatch(
      /^\d{14}_[a-z0-9_]+\.sql$/
    );
  });

  it("migration timestamp is after migration 000019", () => {
    const ts19 = parseInt("20240001000019", 10);
    const ts20 = parseInt("20240001000020", 10);
    expect(ts20).toBeGreaterThan(ts19);
  });
});

// ─── release_year stored generated column migration (issue #306) ─────────────

describe("migration 000021: release_year_generated_column", () => {
  let sql: string;

  beforeAll(() => {
    sql = readMigration("20240001000021_release_year_generated_column.sql");
  });

  it("adds release_year generated column to movies", () => {
    expect(sql.toUpperCase()).toContain("ALTER TABLE MOVIES");
    expect(sql).toContain("release_year");
  });

  it("adds release_year generated column to tv_series", () => {
    expect(sql.toUpperCase()).toContain("ALTER TABLE TV_SERIES");
    expect(sql).toContain("release_year");
  });

  it("uses GENERATED ALWAYS AS ... STORED for movies", () => {
    // Verify movies gets a stored generated column (not tv_series only)
    const moviesSection = sql.split("ALTER TABLE tv_series")[0];
    expect(moviesSection.toUpperCase()).toContain("GENERATED ALWAYS AS");
    expect(moviesSection.toUpperCase()).toContain("STORED");
  });

  it("uses EXTRACT(YEAR FROM release_date) for movies", () => {
    const moviesSection = sql.split("ALTER TABLE tv_series")[0];
    expect(moviesSection).toContain("release_date");
    expect(moviesSection.toUpperCase()).toContain("EXTRACT");
  });

  it("uses EXTRACT(YEAR FROM first_air_date) for tv_series", () => {
    expect(sql).toContain("first_air_date");
  });

  it("creates B-tree index on movies.release_year (no USING GIN)", () => {
    expect(sql).toContain("idx_movies_release_year");
    // B-tree is default — should not say GIN for this index
    const btreeSection = sql.split("idx_movies_release_year")[1] ?? "";
    expect(btreeSection.toUpperCase()).not.toContain("USING GIN");
  });

  it("creates B-tree index on tv_series.release_year", () => {
    expect(sql).toContain("idx_tv_series_release_year");
  });

  it("uses IF NOT EXISTS on both indexes for idempotency", () => {
    const indexBlock = sql.split("-- ── 2.")[1] ?? "";
    const count = (indexBlock.match(/IF NOT EXISTS/gi) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("search_all WHERE does not call EXTRACT(YEAR at query time", () => {
    // EXTRACT still appears in the ALTER TABLE section (generated column def)
    // but must not appear inside any CREATE FUNCTION body
    const fnBodies = sql.split("CREATE OR REPLACE FUNCTION").slice(1).join("");
    expect(fnBodies.toUpperCase()).not.toContain("EXTRACT(YEAR");
  });

  it("search_all movies branch references m.release_year in WHERE", () => {
    expect(sql).toContain("m.release_year >= p_year_start");
    expect(sql).toContain("m.release_year <= p_year_end");
  });

  it("search_all tv branch references t.release_year in WHERE", () => {
    expect(sql).toContain("t.release_year >= p_year_start");
    expect(sql).toContain("t.release_year <= p_year_end");
  });

  it("search_all movies SELECT uses m.release_year (stored column)", () => {
    // The SELECT list should use m.release_year, not EXTRACT(...)
    const moviesBranch = sql.split("UNION ALL")[0] ?? "";
    expect(moviesBranch).toContain("m.release_year");
  });

  it("search_all tv SELECT uses t.release_year (stored column)", () => {
    const tvBranch = sql.split("UNION ALL")[1] ?? "";
    expect(tvBranch).toContain("t.release_year");
  });

  it("migration file follows naming convention", () => {
    expect("20240001000021_release_year_generated_column.sql").toMatch(
      /^\d{14}_[a-z0-9_]+\.sql$/
    );
  });

  it("migration timestamp is after migration 000020", () => {
    const ts20 = parseInt("20240001000020", 10);
    const ts21 = parseInt("20240001000021", 10);
    expect(ts21).toBeGreaterThan(ts20);
  });
});

// ─── SQL safety analysis ─────────────────────────────────────────────────────

describe("SQL safety: no destructive statements in migrations", () => {
  it("genre_names migration contains no DROP INDEX", () => {
    const sql = readMigration("20240001000000_gin_index_genre_names.sql").toUpperCase();
    expect(sql).not.toContain("DROP INDEX");
  });

  it("genre_names migration contains no DROP TABLE", () => {
    const sql = readMigration("20240001000000_gin_index_genre_names.sql").toUpperCase();
    expect(sql).not.toContain("DROP TABLE");
  });

  it("genre_names migration contains no TRUNCATE", () => {
    const sql = readMigration("20240001000000_gin_index_genre_names.sql").toUpperCase();
    expect(sql).not.toContain("TRUNCATE");
  });

  it("fts migration contains no DROP INDEX", () => {
    const sql = readMigration("20240001000001_gin_index_fts.sql").toUpperCase();
    expect(sql).not.toContain("DROP INDEX");
  });

  it("fts migration contains no DROP TABLE", () => {
    const sql = readMigration("20240001000001_gin_index_fts.sql").toUpperCase();
    expect(sql).not.toContain("DROP TABLE");
  });

  it("fts migration contains no TRUNCATE", () => {
    const sql = readMigration("20240001000001_gin_index_fts.sql").toUpperCase();
    expect(sql).not.toContain("TRUNCATE");
  });
});
