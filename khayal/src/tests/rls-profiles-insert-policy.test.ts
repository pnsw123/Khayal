/**
 * Tests for profiles INSERT RLS policy migration (issue #188).
 *
 * The profiles table was missing an INSERT policy. Without it (and without a
 * handle_new_user DB trigger), new signups via the anon key cannot create their
 * profile row, causing silent failures on first login.
 *
 * These tests verify the migration SQL is structurally correct — offline, no
 * live DB required.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");
const FILENAME = "20240001000005_profiles_insert_policy.sql";

let sql: string;
let sqlUpper: string;

beforeAll(() => {
  sql = readFileSync(resolve(MIGRATIONS_DIR, FILENAME), "utf-8");
  sqlUpper = sql.toUpperCase();
});

// ── File health ───────────────────────────────────────────────────────────────

describe("migration file: 20240001000005_profiles_insert_policy.sql", () => {
  it("file exists and is non-empty", () => {
    expect(sql.length).toBeGreaterThan(50);
  });

  it("filename matches Supabase timestamp convention", () => {
    expect(FILENAME).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  it("timestamp is after existing RLS migration (000002)", () => {
    const newTs = parseInt("20240001000005", 10);
    const rlsTs = parseInt("20240001000002", 10);
    expect(newTs).toBeGreaterThan(rlsTs);
  });

  it("contains no DROP TABLE statements", () => {
    expect(sqlUpper).not.toContain("DROP TABLE");
  });

  it("contains no TRUNCATE statements", () => {
    expect(sqlUpper).not.toContain("TRUNCATE");
  });

  it("is idempotent — DROP POLICY IF EXISTS before CREATE POLICY", () => {
    // Strip comment lines before counting to avoid false positives from inline docs
    const noComments = sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .toUpperCase();
    const createCount = (noComments.match(/CREATE POLICY/g) ?? []).length;
    const dropCount = (noComments.match(/DROP POLICY IF EXISTS/g) ?? []).length;
    expect(createCount).toBe(1);
    expect(dropCount).toBe(1);
    expect(dropCount).toBe(createCount);
  });
});

// ── Policy correctness ────────────────────────────────────────────────────────

describe("profiles_insert_own policy", () => {
  it("creates profiles_insert_own policy", () => {
    expect(sql).toContain('"profiles_insert_own"');
  });

  it("targets profiles table", () => {
    expect(sqlUpper).toContain("ON PROFILES FOR INSERT");
  });

  it("uses WITH CHECK (auth.uid() = id)", () => {
    expect(sql).toContain("WITH CHECK (auth.uid() = id)");
  });

  it("does not use USING clause (INSERT policies use WITH CHECK, not USING)", () => {
    // USING is for SELECT/UPDATE/DELETE; INSERT must use WITH CHECK only
    // The policy should not have a standalone USING clause for the INSERT policy
    const insertPolicyBlock = sql.split("CREATE POLICY")[1] ?? "";
    expect(insertPolicyBlock.toUpperCase()).not.toMatch(/USING\s*\(/);
  });

  it("policy name follows snake_case convention", () => {
    const names = [...sql.matchAll(/CREATE POLICY "([^"]+)"/g)].map(
      (m) => m[1]
    );
    for (const name of names) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});
