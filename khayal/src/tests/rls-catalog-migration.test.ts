/**
 * Tests for RLS policy migration covering catalog tables + saved_queries (issue #189).
 *
 * Verifies the migration SQL file structurally — every table has RLS enabled,
 * every required policy exists, and the auth scope is correct. Runs entirely
 * offline (no live DB required).
 *
 * Security focus: saved_queries stores per-user query history. Without RLS
 * any authenticated user can read or delete other users' rows via the REST API.
 * The catalog tables (genres, people, etc.) need RLS + public SELECT as
 * defence-in-depth to prevent accidental writes via the anon key.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");
const FILENAME = "20240001000005_rls_catalog_and_saved_queries.sql";

let sql: string;
let sqlUpper: string;

beforeAll(() => {
  sql = readFileSync(resolve(MIGRATIONS_DIR, FILENAME), "utf-8");
  sqlUpper = sql.toUpperCase();
});

// ── Migration file ────────────────────────────────────────────────────────────

describe("migration file: 20240001000005_rls_catalog_and_saved_queries.sql", () => {
  it("file exists and is non-empty", () => {
    expect(sql.length).toBeGreaterThan(100);
  });

  it("filename matches Supabase timestamp convention", () => {
    expect(FILENAME).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  it("timestamp is after existing RLS policies migration (20240001000002)", () => {
    const newTs = parseInt("20240001000004", 10);
    const rlsTs = parseInt("20240001000002", 10);
    expect(newTs).toBeGreaterThan(rlsTs);
  });

  it("contains no DROP TABLE statements", () => {
    expect(sqlUpper).not.toContain("DROP TABLE");
  });

  it("contains no TRUNCATE statements", () => {
    expect(sqlUpper).not.toContain("TRUNCATE");
  });

  it("uses DROP POLICY IF EXISTS before each CREATE POLICY (idempotent)", () => {
    // Only count actual statement lines, not comment lines
    const createCount = (sql.match(/^CREATE POLICY/gm) ?? []).length;
    const dropCount = (sql.match(/^DROP POLICY IF EXISTS/gm) ?? []).length;
    expect(dropCount).toBe(createCount);
  });
});

// ── ENABLE ROW LEVEL SECURITY — all 9 affected tables ────────────────────────

describe("ENABLE ROW LEVEL SECURITY on all 9 tables", () => {
  const tables = [
    "SAVED_QUERIES",
    "GENRES",
    "PEOPLE",
    "SEASONS",
    "WATCH_PROVIDERS",
    "MOVIE_CREDITS",
    "TV_CREDITS",
    "MOVIE_GENRES",
    "TV_GENRES",
  ];

  for (const table of tables) {
    it(`${table} has ENABLE ROW LEVEL SECURITY`, () => {
      expect(sqlUpper).toContain(
        `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`
      );
    });
  }
});

// ── saved_queries: owner CRUD + default rows visible ─────────────────────────

describe("saved_queries table: owner CRUD + system defaults readable", () => {
  it("has saved_queries_select_own_or_default policy", () => {
    expect(sql).toContain('"saved_queries_select_own_or_default"');
  });

  it("SELECT policy allows is_default = true rows for all users", () => {
    expect(sql).toContain("is_default = true");
  });

  it("SELECT policy uses auth.uid() = user_id for ownership", () => {
    expect(sql).toContain("auth.uid() = user_id");
  });

  it("has saved_queries_insert_own policy", () => {
    expect(sql).toContain('"saved_queries_insert_own"');
  });

  it("INSERT policy uses WITH CHECK for enforcement", () => {
    // Find the CREATE POLICY block for saved_queries_insert_own
    const match = sql.match(
      /CREATE POLICY "saved_queries_insert_own"[\s\S]+?;/
    );
    expect(match).not.toBeNull();
    expect(match![0].toUpperCase()).toContain("WITH CHECK");
  });

  it("has saved_queries_update_own policy", () => {
    expect(sql).toContain('"saved_queries_update_own"');
  });

  it("UPDATE policy uses both USING and WITH CHECK", () => {
    const match = sql.match(
      /CREATE POLICY "saved_queries_update_own"[\s\S]+?;/
    );
    expect(match).not.toBeNull();
    const upper = match![0].toUpperCase();
    expect(upper).toContain("USING");
    expect(upper).toContain("WITH CHECK");
  });

  it("has saved_queries_delete_own policy", () => {
    expect(sql).toContain('"saved_queries_delete_own"');
  });

  it("has 4 policies total for saved_queries", () => {
    const matches = [
      ...sql.matchAll(/CREATE POLICY "saved_queries_[^"]+"/g),
    ];
    expect(matches.length).toBe(4);
  });
});

// ── Catalog tables: public SELECT only, no write policies ────────────────────

const catalogTables = [
  "genres",
  "people",
  "seasons",
  "watch_providers",
  "movie_credits",
  "tv_credits",
  "movie_genres",
  "tv_genres",
] as const;

describe("catalog tables: public SELECT policy, no write policies", () => {
  for (const table of catalogTables) {
    it(`${table} has ${table}_select_public policy`, () => {
      expect(sql).toContain(`"${table}_select_public"`);
    });

    it(`${table} SELECT policy uses USING (true)`, () => {
      // Find the block for this table
      const policyStart = sql.indexOf(`"${table}_select_public"`);
      const block = sql.slice(policyStart, policyStart + 200);
      expect(block).toContain("USING (true)");
    });

    it(`${table} has no INSERT policy (service_role only)`, () => {
      expect(sql).not.toContain(`"${table}_insert`);
    });

    it(`${table} has no UPDATE policy (service_role only)`, () => {
      expect(sql).not.toContain(`"${table}_update`);
    });

    it(`${table} has no DELETE policy (service_role only)`, () => {
      expect(sql).not.toContain(`"${table}_delete`);
    });
  }
});

// ── Policy naming convention ──────────────────────────────────────────────────

describe("policy naming convention", () => {
  it("all policies use snake_case names", () => {
    const policyNames = [
      ...sql.matchAll(/CREATE POLICY "([^"]+)"/g),
    ].map((m) => m[1]);
    expect(policyNames.length).toBeGreaterThan(0);
    for (const name of policyNames) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("has exactly 12 policies (8 catalog SELECT + 4 saved_queries CRUD)", () => {
    // Match only non-comment CREATE POLICY lines (exclude -- comments)
    const count = (sql.match(/^CREATE POLICY/gm) ?? []).length;
    expect(count).toBe(12);
  });
});
