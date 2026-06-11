/**
 * Structural tests for migration 20240001000013_rls_profiles_role_toctou_fix.sql
 * (issue #243 — TOCTOU race in profiles_update_own RLS policy)
 *
 * Verifies offline (no live DB) that:
 *  - Migration file exists and is non-empty
 *  - Adds profiles_role_valid CHECK constraint
 *  - Creates profiles_role_protect trigger function
 *  - Attaches the trigger with DROP IF EXISTS + CREATE pattern (idempotent)
 *  - Replaces profiles_update_own WITHOUT the racy subquery
 *  - WITH CHECK is owner-only (auth.uid() = id), not a self-referential subquery
 *  - Does not drop tables or truncate
 *  - DROP POLICY count equals CREATE POLICY count
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");
const FILENAME = "20240001000013_rls_profiles_role_toctou_fix.sql";

let sql: string;
let sqlUpper: string;
/** SQL with single-line comments stripped — used for content assertions that
 *  must not match quoted/illustrative code in comment blocks. */
let sqlNoComments: string;

beforeAll(() => {
  sql = readFileSync(resolve(MIGRATIONS_DIR, FILENAME), "utf-8");
  sqlUpper = sql.toUpperCase();
  // Strip single-line SQL comments (-- ...) so assertions don't false-match
  // code that is only quoted in the comment header.
  sqlNoComments = sql.replace(/--[^\n]*/g, "");
});

describe("migration: 20240001000013_rls_profiles_role_toctou_fix.sql", () => {
  it("file exists and is non-empty", () => {
    expect(sql.length).toBeGreaterThan(100);
  });

  it("filename matches Supabase timestamp convention", () => {
    expect(FILENAME).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  // ── Safety guards ───────────────────────────────────────────────────────────

  it("contains no DROP TABLE statements", () => {
    expect(sqlUpper).not.toContain("DROP TABLE");
  });

  it("contains no TRUNCATE statements", () => {
    expect(sqlUpper).not.toContain("TRUNCATE");
  });

  // ── CHECK constraint ────────────────────────────────────────────────────────

  it("drops existing profiles_role_valid constraint before re-adding (idempotent)", () => {
    expect(sqlUpper).toContain("DROP CONSTRAINT IF EXISTS");
    expect(sql).toContain("profiles_role_valid");
  });

  it("adds CHECK constraint for role enum values", () => {
    expect(sqlUpper).toContain("ADD CONSTRAINT");
    expect(sqlUpper).toContain("CHECK");
    expect(sql).toContain("'user'");
    expect(sql).toContain("'admin'");
    expect(sql).toContain("'moderator'");
  });

  // ── Trigger function ────────────────────────────────────────────────────────

  it("creates or replaces profiles_role_protect trigger function", () => {
    expect(sqlUpper).toContain("CREATE OR REPLACE FUNCTION");
    expect(sql).toContain("profiles_role_protect");
  });

  it("trigger function uses SECURITY DEFINER", () => {
    expect(sqlUpper).toContain("SECURITY DEFINER");
  });

  it("trigger function uses OLD.role and NEW.role (no subquery, TOCTOU-free)", () => {
    expect(sqlNoComments).toContain("OLD.role");
    expect(sqlNoComments).toContain("NEW.role");
    // Must NOT use the racy correlated subquery from the previous migration
    // (checked against comment-stripped SQL so the quoted example in the header
    //  does not cause a false positive)
    expect(sqlNoComments).not.toContain("SELECT role FROM profiles WHERE id = auth.uid()");
  });

  it("trigger function checks request.jwt.claims.role for service_role", () => {
    expect(sql).toContain("request.jwt.claims.role");
    expect(sql).toContain("service_role");
  });

  it("trigger function raises exception when non-service-role tries to change role", () => {
    expect(sqlUpper).toContain("RAISE EXCEPTION");
  });

  // ── Trigger attachment ──────────────────────────────────────────────────────

  it("drops existing trigger before creating (idempotent)", () => {
    expect(sqlUpper).toContain("DROP TRIGGER IF EXISTS");
    expect(sql).toContain("profiles_role_protect_trigger");
  });

  it("creates BEFORE UPDATE trigger on profiles table", () => {
    expect(sqlUpper).toContain("CREATE TRIGGER");
    expect(sqlUpper).toContain("BEFORE UPDATE ON PROFILES");
    expect(sqlUpper).toContain("FOR EACH ROW");
    expect(sql).toContain("profiles_role_protect_trigger");
  });

  // ── RLS policy ──────────────────────────────────────────────────────────────

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

  it("WITH CHECK uses auth.uid() = id (owner check only, no subquery)", () => {
    expect(sqlNoComments).toContain("WITH CHECK");
    expect(sqlNoComments).toContain("auth.uid() = id");
    // The racy subquery must be gone — role protection is now in the trigger
    // (checked against comment-stripped SQL to avoid false positive from header)
    expect(sqlNoComments).not.toContain("SELECT role FROM profiles WHERE id = auth.uid()");
  });

  it("USING clause checks auth.uid() = id (owner check)", () => {
    expect(sql).toContain("USING (auth.uid() = id)");
  });

  it("DROP POLICY count equals CREATE POLICY count (idempotency)", () => {
    const createCount = (sqlUpper.match(/CREATE POLICY/g) ?? []).length;
    const dropCount = (sqlUpper.match(/DROP POLICY IF EXISTS/g) ?? []).length;
    expect(dropCount).toBe(createCount);
    expect(createCount).toBeGreaterThan(0);
  });
});
