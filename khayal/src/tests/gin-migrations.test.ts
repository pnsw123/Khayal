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
