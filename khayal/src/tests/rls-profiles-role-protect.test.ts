/**
 * Structural tests for migration 20240001000007_rls_profiles_role_protect.sql
 * (issue #201 — privilege escalation via profiles UPDATE RLS).
 *
 * Verifies offline (no live DB) that:
 *  - Migration file exists and is non-empty
 *  - Replaces profiles_update_own with column-level role restriction
 *  - Uses DROP POLICY IF EXISTS for idempotency
 *  - Does NOT drop tables or truncate
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");
const FILENAME = "20240001000007_rls_profiles_role_protect.sql";

let sql: string;
let sqlUpper: string;

beforeAll(() => {
  sql = readFileSync(resolve(MIGRATIONS_DIR, FILENAME), "utf-8");
  sqlUpper = sql.toUpperCase();
});

describe("migration: 20240001000007_rls_profiles_role_protect.sql", () => {
  it("file exists and is non-empty", () => {
    expect(sql.length).toBeGreaterThan(50);
  });

  it("filename matches Supabase timestamp convention", () => {
    expect(FILENAME).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  it("contains no DROP TABLE statements", () => {
    expect(sqlUpper).not.toContain("DROP TABLE");
  });

  it("contains no TRUNCATE statements", () => {
    expect(sqlUpper).not.toContain("TRUNCATE");
  });

  it("uses DROP POLICY IF EXISTS for idempotency", () => {
    expect(sqlUpper).toContain("DROP POLICY IF EXISTS");
  });

  it("recreates profiles_update_own policy", () => {
    expect(sql).toContain('"profiles_update_own"');
    expect(sqlUpper).toContain("CREATE POLICY");
  });

  it("policy scoped to profiles FOR UPDATE", () => {
    expect(sqlUpper).toContain("ON PROFILES FOR UPDATE");
  });

  it("USING clause checks auth.uid() = id (owner check)", () => {
    expect(sql).toContain("auth.uid() = id");
  });

  it("WITH CHECK clause includes role subquery to prevent role escalation", () => {
    // Must contain the correlated subquery that freezes the role column
    expect(sql).toContain("SELECT role FROM profiles WHERE id = auth.uid()");
  });

  it("WITH CHECK clause also includes auth.uid() = id owner check", () => {
    expect(sql).toContain("WITH CHECK");
    expect(sql).toContain("auth.uid() = id");
  });

  it("DROP POLICY count equals CREATE POLICY count (idempotency)", () => {
    const createCount = (sqlUpper.match(/CREATE POLICY/g) ?? []).length;
    const dropCount = (sqlUpper.match(/DROP POLICY IF EXISTS/g) ?? []).length;
    expect(dropCount).toBe(createCount);
    expect(createCount).toBeGreaterThan(0);
  });
});
