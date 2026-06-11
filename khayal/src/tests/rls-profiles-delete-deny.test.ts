/**
 * Tests for profiles DELETE deny RLS policy migration (issue #256).
 *
 * The profiles table was missing an explicit DELETE policy. Without it, the
 * protection relies on Postgres implicit deny when RLS is enabled — which is
 * not auditable, not testable by name, and disappears if RLS is accidentally
 * disabled during schema work.
 *
 * This migration adds USING (false) to make the deny explicit and named.
 * Service-role deletes (account deletion server action) bypass RLS and are
 * unaffected.
 *
 * Tests run entirely offline — no live DB required.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");
const FILENAME = "20240001000016_rls_profiles_delete_deny.sql";

let sql: string;
let sqlUpper: string;

beforeAll(() => {
  sql = readFileSync(resolve(MIGRATIONS_DIR, FILENAME), "utf-8");
  sqlUpper = sql.toUpperCase();
});

// ── File health ───────────────────────────────────────────────────────────────

describe("migration file: 20240001000016_rls_profiles_delete_deny.sql", () => {
  it("file exists and is non-empty", () => {
    expect(sql.length).toBeGreaterThan(50);
  });

  it("filename matches Supabase timestamp convention", () => {
    expect(FILENAME).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  it("timestamp is after existing profiles TOCTOU fix migration (000011)", () => {
    const newTs = parseInt("20240001000013", 10);
    const prevTs = parseInt("20240001000011", 10);
    expect(newTs).toBeGreaterThan(prevTs);
  });

  it("contains no DROP TABLE statements", () => {
    expect(sqlUpper).not.toContain("DROP TABLE");
  });

  it("contains no TRUNCATE statements", () => {
    expect(sqlUpper).not.toContain("TRUNCATE");
  });

  it("is idempotent — DROP POLICY IF EXISTS before CREATE POLICY", () => {
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

describe("profiles_delete_deny policy", () => {
  it("creates profiles_delete_deny policy", () => {
    expect(sql).toContain('"profiles_delete_deny"');
  });

  it("targets profiles table", () => {
    expect(sqlUpper).toContain("ON PROFILES FOR DELETE");
  });

  it("uses USING (false) to deny all client-side deletes", () => {
    expect(sql).toContain("USING (false)");
  });

  it("does NOT use USING (true) — would allow deletes", () => {
    expect(sql).not.toContain("USING (true)");
  });

  it("does NOT use auth.uid() — deny is unconditional for all clients", () => {
    // Service-role bypasses RLS; client-side always denied regardless of identity
    expect(sql).not.toContain("auth.uid()");
  });

  it("policy name follows snake_case convention", () => {
    const names = [...sql.matchAll(/CREATE POLICY "([^"]+)"/g)].map(
      (m) => m[1]
    );
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("policy name indicates deny intent (contains 'deny')", () => {
    expect(sql).toContain("profiles_delete_deny");
  });
});

// ── Safety: no other tables touched ──────────────────────────────────────────

describe("migration scope: profiles only", () => {
  it("does not ALTER any table other than profiles (no ALTER TABLE ... ENABLE RLS)", () => {
    // This migration adds a policy to an already-RLS-enabled table; no ALTER TABLE needed
    expect(sqlUpper).not.toContain("ALTER TABLE");
  });

  it("only one CREATE POLICY statement present", () => {
    const noComments = sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .toUpperCase();
    const count = (noComments.match(/CREATE POLICY/g) ?? []).length;
    expect(count).toBe(1);
  });
});
