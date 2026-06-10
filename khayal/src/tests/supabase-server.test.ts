import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("supabase-server env validation", () => {
  const ORIG_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ORIG_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIG_URL !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = ORIG_URL;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (ORIG_ANON !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIG_ANON;
    else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    await expect(import("@/lib/supabase-server")).rejects.toThrow(
      "NEXT_PUBLIC_SUPABASE_URL is required"
    );
  });

  it("throws when NEXT_PUBLIC_SUPABASE_ANON_KEY missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    await expect(import("@/lib/supabase-server")).rejects.toThrow(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"
    );
  });
});
